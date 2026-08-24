# WhatsApp 入站事件类型扩展设计方案（以 Flow Webhook 为例）
---
本文将「新增 Meta Webhook 入站事件类型」的改造逻辑抽象为可复用设计方案，并以 **field=flows（FLOW_WEBHOOK）** 为参考实现。适用于：账号/模板类变更、Flow 状态与性能 Webhook、未来其他 WABA 级或手机号级 field 扩展。  
## 1. 背景与目标
### 1.1 背景
Meta WhatsApp Business Webhook 按 `changes[].field` 区分事件类型。部分 field（如 `flows`）在 WABA 维度推送，**不含** `metadata.phone_number_id`；部分 field（如 `messages`、`message_template_status_update`）在手机号或模板维度推送。  
Meetbot 入站链路统一为：  
**Meta Webhook → channel-receive（校验/转换）→ Kafka messageTopic → dialogue-engine（按 MessageType 路由）→ core（领域处理 / 客户回调编排）→ channel-send（HTTP POST 客户 URL）**  
### 1.2 设计目标
- 新增事件类型时，各层职责清晰、改造点可 checklist 化
- 与存量事件（模板变更、账号变更、内容消息等）模式对齐，降低回归风险
- 需客户回传时，统一经 `OpenApiNotifyManager.openApiCallbackNotify` 投递 `openApiNotifyRetryTopic`
- 区分路径 A（存量直推）与路径 B（Kafka 主链路），新事件默认走路径 B
## 2. 事件分类与路由决策
<table>
<tr>
<td>分类  </td>
<td>典型 field  </td>
<td>accountId 来源  </td>
<td>是否需要 phoneNumberId  </td>
</tr>
<tr>
<td>WABA 级账号/模板/Flow  </td>
<td>`flows`、`account_update`、`message_template_*`  </td>
<td>`entry[0].id`（WABA ID）  </td>
<td>否；`configEnv` 应跳过 metadata 校验  </td>
</tr>
<tr>
<td>手机号级消息/状态  </td>
<td>`messages`、`statuses`  </td>
<td>`metadata.phone_number_id`  </td>
<td>是  </td>
</tr>
<tr>
<td>用户交互（表单回复）  </td>
<td>`messages` + `type=nfm_reply`  </td>
<td>`metadata.phone_number_id`  </td>
<td>是；**不**单独新增 MessageType，仍走 `CONTENT`  </td>
</tr>
</table>
**决策原则**  
- **仅转发原始 Webhook、无会话编排**：receive → engine → core → 客户回调（如 FLOW_WEBHOOK、TEMPLATE_CHANGE 的 Open 转发半段）
- **需落库 / 触发业务流程**：在 core 增加 CommandService 逻辑（如模板 sync、Flow 表单 `recordFlowCallBack`）
- **与已有类型语义重复**：复用既有 MessageType，不新增枚举（如 nfm_reply 不复用 FLOW_WEBHOOK）
## 3. 端到端架构
```
Meta POST (field=<新 field>)
  ↓
channel-receive
  ├─ WhatsappMsgValidateService   校验必填字段
  ├─ WhatsappMsgConvertService    分支 convert + 设置 MessageType
  └─ configEnv                    WABA 级 field 跳过 phoneNumberId
  ↓ Kafka messageTopic
dialogue-engine
  └─ XxxMsgHandlerServiceImpl     extends BaseMsgHandlerService，getMsgType() 注册
  ↓ Feign
meetbot-core-service
  ├─ 领域处理（可选：落库、同步 Meta 资源等）
  └─ OpenApiNotifyManager.openApiCallbackNotify（定制/行业店铺客户回传）
  ↓ Kafka openApiNotifyRetryTopic
meetbot-channel-send
  └─ 消费并 POST 客户 webhook URL
```
## 4. 分层改造清单（通用）
### 4.1 meetbot-commons
<table>
<tr>
<td>项  </td>
<td>说明  </td>
</tr>
<tr>
<td>`MessageTypeEnum`  </td>
<td>新增枚举值（code 递增），绑定 VO Class  </td>
</tr>
<tr>
<td>消息 VO  </td>
<td>如 `FlowWebhookChangeVo`，承载 Kafka 反序列化字段  </td>
</tr>
<tr>
<td>常量 / DTO 字段  </td>
<td>如 `WhatsAppFlowWebhookConstants.FLOWS_FIELD`；回调 DTO 补 `flow_id` 等 Meta 字段  </td>
</tr>
<tr>
<td>版本发布  </td>
<td>下游工程（receive / engine / core）须升级 commons 依赖后联调  </td>
</tr>
</table>
### 4.2 meetbot-channel-receive
<table>
<tr>
<td>项  </td>
<td>说明  </td>
</tr>
<tr>
<td>`WhatsappMsgValidateService`  </td>
<td>在 field 分支校验 Meta 文档要求的必填字段；WABA 级 field 不走 `metadata.phone_number_id` 通用校验  </td>
</tr>
<tr>
<td>`WhatsappMsgConvertService`  </td>
<td>`else if (FIELD.equals(msgField))` 分支：`convertXxxMsg`、设置 `type`、`accountId = entry.id`  </td>
</tr>
<tr>
<td>`configEnv`  </td>
<td>WABA 级 field 与账号更新类 field 一并 early return，避免读 null metadata  </td>
</tr>
<tr>
<td>路径 A 短路（可选）  </td>
<td>存量试点店铺 `commonCallback` 直推；**新事件默认不实现**，统一走路径 B  </td>
</tr>
</table>
### 4.3 meetbot-dialogue-engine
<table>
<tr>
<td>项  </td>
<td>说明  </td>
</tr>
<tr>
<td>`XxxMsgHandlerServiceImpl`  </td>
<td>继承 `BaseMsgHandlerService<Vo>`，`@Service` 自动注册到 `MsgHandlerFactory`  </td>
</tr>
<tr>
<td>`msgHandle`  </td>
<td>将 `msg.getMessageData()` 作为 `rawData` 调 core Feign；**透传原始 JSON**，避免引擎层丢字段  </td>
</tr>
<tr>
<td>`getMsgType()`  </td>
<td>返回新 `MessageTypeEnum` code  </td>
</tr>
</table>
### 4.4 meetbot-core-service
<table>
<tr>
<td>项  </td>
<td>说明  </td>
</tr>
<tr>
<td>Feign 契约（client）  </td>
<td>新增 `IWhatsappXxxController#recordXxx` + DTO（如 `FlowWebhookDto { rawData }`）  </td>
</tr>
<tr>
<td>Controller 实现（server）  </td>
<td>解析 WABA：`ChangeDto.waId()` → `waCoreConfigService.queryByWaId` → storeId 列表  </td>
</tr>
<tr>
<td>客户回传  </td>
<td>`OpenApiNotifyManager.openApiCallbackNotify(rawData, OpenApiNotifyTypeEnum.XXX, storeIdList)`  </td>
</tr>
<tr>
<td>`OpenApiNotifyTypeEnum`  </td>
<td>新增枚举；`shouldPublishNotify` 增加 case 返回 true  </td>
</tr>
<tr>
<td>领域逻辑（按需）  </td>
<td>仅转发则无需落库；需 sync/记录则参考 `recordTemplateChange` 异步段  </td>
</tr>
</table>
### 4.5 开放 API 客户回传
定制版 / 行业版店铺需将入站事件转发至客户 URL 时，在 core 侧调用 `openApiCallbackNotify`，由 `OpenApiNotifyManager` 组装 `OpenApiNotifyRetryMessageDto`（`url`、`headers`、`request`）并投递 `openApiNotifyRetryTopic`，由 channel-send 消费后 HTTP POST。  
WABA 级入站事件（如 `flows`）解析店铺时以 `entry[0].id` 为 WABA ID，**不依赖** `phone_number_id`。  
## 5. 参考实现：FLOW_WEBHOOK（field=flows）
### 5.1 Meta 侧特征
- `object`：`whatsapp_business_account`
- `changes[].field`：`flows`
- `value.event`：如 `FLOW_STATUS_CHANGE`、`CLIENT_ERROR_RATE` 等
- `value.flow_id`：必填（校验用）
- 无 `metadata.phone_number_id`
### 5.2 各层落地对照
<table>
<tr>
<td>模块  </td>
<td>实现要点  </td>
</tr>
<tr>
<td>commons  </td>
<td>`FLOW_WEBHOOK(23)`、`FlowWebhookChangeVo`、`FLOWS_FIELD`、Value DTO `flowId`  </td>
</tr>
<tr>
<td>receive  </td>
<td>validate：`event` + `flow_id`；convert：accountId=WABA；configEnv 跳过 phoneNumberId  </td>
</tr>
<tr>
<td>engine  </td>
<td>`FlowWebhookMsgHandlerServiceImpl` → `recordFlowWebhook(rawData)`  </td>
</tr>
<tr>
<td>core  </td>
<td>`WhatsappFlowController#recordFlowWebhook` 对齐 `recordTemplateChange` 转发半段；`OpenApiNotifyTypeEnum.FLOW_WEBHOOK`  </td>
</tr>
</table>
### 5.3 明确不做
- `nfm_reply`（Flow 表单用户回复）仍走 `CONTENT` + `recordFlowCallBack`，不新增 `FLOW_RESPONSE` 类型
- Phase 1 不做 Flow Webhook 内部 DB 持久化，仅转发客户 URL
- 不走路径 A `commonCallback` 存量短路
### 5.4 客户收到的回调 body 结构
经 `openApiCallbackNotify` 组装后，`request` 内 `OpenApiNotifyContent` 示例：  
```
{
  "type": "FLOW_WEBHOOK",
  "msg": { /* Meta 原始 Webhook JSON 对象 */ }
}
```
## 6. 新增事件类型自检清单
- [ ] commons：`MessageTypeEnum` + VO + 必要常量/DTO 字段
- [ ] receive：validate 分支 + convert 分支 + configEnv 是否跳过 phoneNumberId
- [ ] receive：是否需路径 A 短路（默认否）
- [ ] engine：`*MsgHandlerServiceImpl` 注册 + Feign 调用
- [ ] core-client：Feign 接口 + DTO 校验注解
- [ ] core-server：Controller + 店铺解析 + 领域逻辑（如有）
- [ ] core：`OpenApiNotifyTypeEnum` + `shouldPublishNotify`（若需客户回传）
- [ ] 下游依赖：engine/receive 升级 commons；send 侧 `openApiNotifyRetryTopic` 消费者已部署
- [ ] 回归：存量 messages / template / nfm_reply 不受影响
## 7. 测试建议
### 7.1 分层验证
<table>
<tr>
<td>层级  </td>
<td>方式  </td>
<td>预期  </td>
</tr>
<tr>
<td>L1  </td>
<td>curl Meta Webhook 样例到 receive  </td>
<td>校验通过、Kafka 产出 type=新枚举  </td>
</tr>
<tr>
<td>L2  </td>
<td>直调 core Feign `recordXxx`  </td>
<td>`openApiNotifyRetryTopic` 有消息；storeId/url 正确  </td>
</tr>
<tr>
<td>L3  </td>
<td>全链路 + send 消费  </td>
<td>客户 URL 收到 POST，body.type 正确  </td>
</tr>
</table>
### 7.2 FLOW_WEBHOOK 样例 payload（节选）
```
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "<WABA_ID>",
    "changes": [{
      "field": "flows",
      "value": {
        "event": "FLOW_STATUS_CHANGE",
        "flow_id": "<FLOW_ID>",
        "message": "Flow <FLOW_ID> has been published"
      }
    }]
  }]
}
```
## 8. 相关文档与代码索引
- Meta Flow Webhooks 字段说明：飞书 Wiki「Flow Webhooks」章节
- 开放 API 入站分流：meetbot-channel-receive `docs/开放API/[核心文档]开放API.md` §1.5
- 客户回调 Kafka：meetbot-commons `docs/开放API/[迭代1]回调监控限流与大盘统计.md` §2
- 模板变更参考实现：`TemplateStatusChangeMsgHandlerServiceImpl` + `WhatsappTemplateController#recordTemplateChange`
