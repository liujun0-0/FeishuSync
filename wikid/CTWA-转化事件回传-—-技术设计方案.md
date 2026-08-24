# CTWA 转化事件回传 — 技术设计方案
---
## 一、版本与变更记录
<table>
<tr>
<td>版本  </td>
<td>日期  </td>
<td>变更内容  </td>
<td>作者  </td>
</tr>
<tr>
<td>V1.0  </td>
<td>2026-07-15  </td>
<td>初稿  </td>
<td>AI  </td>
</tr>
</table>
## 二、术语表
<table>
<tr>
<td>术语  </td>
<td>说明  </td>
</tr>
<tr>
<td>CTWA  </td>
<td>Click-to-WhatsApp，Meta 广告的一种投放形式，用户点击广告后直接进入 WhatsApp 会话  </td>
</tr>
<tr>
<td>CAPI  </td>
<td>Meta Conversions API，用于将站外转化事件回传至 Meta 的接口  </td>
</tr>
<tr>
<td>ctwa_clid  </td>
<td>CTWA 广告点击标识符，用于关联广告点击与转化事件  </td>
</tr>
<tr>
<td>WABA  </td>
<td>WhatsApp Business Account，WhatsApp 商业账号  </td>
</tr>
<tr>
<td>归因  </td>
<td>将转化事件匹配到对应的广告点击，确定该转化的来源  </td>
</tr>
</table>
## 三、需求概述
### 3.1 当前痛点
CTWA 广告缺乏后链路转化数据（加购、支付等），Meta 算法只能优化到点击/会话率层面，无法直接优化 ROI。  
### 3.2 本期目标
1. **数据闭环**：聚合后链路转化事件，基于 ctwa_clid 进行链路匹配，通过 Meta CAPI 回传，激活广告侧深层优化能力
2. **本期范围**：转化事件回传（含自定义 API），广告看板留待下一期
### 3.3 转化事件范围
<table>
<tr>
<td>事件  </td>
<td>Shopify 来源  </td>
<td>自定义 API 来源  </td>
</tr>
<tr>
<td>加购 (AddToCart)  </td>
<td>product_added_to_cart  </td>
<td>ADD_TO_CART  </td>
</tr>
<tr>
<td>开始结算 (InitiateCheckout)  </td>
<td>checkout_started  </td>
<td>INITIATE_CHECKOUT  </td>
</tr>
<tr>
<td>支付完成 (Purchase)  </td>
<td>checkout_completed  </td>
<td>ORDER_PAID  </td>
</tr>
<tr>
<td>注册 (CompleteRegistration)  </td>
<td>无  </td>
<td>REGISTRATION_COMPLETED  </td>
</tr>
<tr>
<td>留资 (Lead)  </td>
<td>无  </td>
<td>LEAD_SUBMITTED  </td>
</tr>
</table>
### 3.4 归因规则
<table>
<tr>
<td>规则  </td>
<td>取值  </td>
</tr>
<tr>
<td>归因期  </td>
<td>72 小时，从转化发生起往前推  </td>
</tr>
<tr>
<td>归因方式  </td>
<td>末次归因  </td>
</tr>
<tr>
<td>广告范围  </td>
<td>用户发生转化的店铺绑定的 WhatsApp 发送的 CTWA 广告  </td>
</tr>
<tr>
<td>开关  </td>
<td>仅开启 CTWA 回传后，才进行归因回传  </td>
</tr>
</table>
## 四、整体架构
### 4.1 架构总览图
### 4.2 服务职责
<table>
<tr>
<td>服务  </td>
<td>职责  </td>
<td>变更类型  </td>
</tr>
<tr>
<td>meetbot-core-service  </td>
<td>事件落库、归因匹配、Meta CAPI 回传、定时重试  </td>
<td>扩展  </td>
</tr>
<tr>
<td>meetbot-channel-receive  </td>
<td>自定义 API 入口（OpenAPI 网关），请求校验 + 投递  </td>
<td>扩展  </td>
</tr>
<tr>
<td>meetbot-dialogue-engine  </td>
<td>Shopify 事件的 MQ 转发（现有模式不变）  </td>
<td>无变更  </td>
</tr>
<tr>
<td>meetbot-jservice-api  </td>
<td>页面配置查询接口（BFF）  </td>
<td>新增接口  </td>
</tr>
</table>
### 4.3 三条事件接入路径
路径 A: Shopify 转化:
Shopify Webhook → dialogue-engine → Kafka (shopify.order.subscribe.topic) → core-service CtwaConversionServiceImpl 已支持 Purchase，本次扩展 AddToCart / InitiateCheckout  
路径 B: 自定义 API 上报（含订单类事件）:
商家 POST /openapi/v1/ctwa/conversion/events → channel-receive → 验证签名 → 投递 Kafka → core-service 消费 → 归因 → 写入归因表  
路径 C: 注册留资事件:
商家 POST /openapi/v1/ctwa/conversion/events → channel-receive → 与路径 B 共用同一 OpenAPI 入口，按 eventType 分发  
## 五、数据模型变更
### 5.1 枚举扩展
扩展 `CtwaConversionAttributionType` 枚举，位于 `meetbot-core-client`：  
```
public enum CtwaConversionAttributionType {
    PURCHASE(1, "purchase"),                    // 已有
    EXTERNAL_BIZ_PURCHASE(2, "external_biz_purchase"), // 已有
    ADD_TO_CART(3, "add_to_cart"),              // 新增
    INITIATE_CHECKOUT(4, "initiate_checkout"),  // 新增
    COMPLETE_REGISTRATION(5, "complete_registration"), // 新增
    LEAD(6, "lead"),                            // 新增
    EXTERNAL_BIZ_ADD_TO_CART(7, "external_biz_add_to_cart"),
    EXTERNAL_BIZ_CHECKOUT(8, "external_biz_checkout"),
    EXTERNAL_BIZ_REGISTER(9, "external_biz_register"),
    EXTERNAL_BIZ_LEAD(10, "external_biz_lead");
}
```
### 5.2 扩展 extend_info 结构
ctwa_conversion_attribution.extend_info 字段（JSON）扩展结构：  
```
{
  "ctwaClid": "string", "waId": "string", "mobile": "string",
  "userEmail": "string", "leadId": "string", "formId": "string",
  "value": "number", "currency": "string", "wabaId": "string"
}
```
### 5.3 开关配置
复用 `rp_page_webhook_meta` 表，key 格式：  
<table>
<tr>
<td>Key  </td>
<td>Value  </td>
<td>说明  </td>
</tr>
<tr>
<td>ctwa:postback:enabled  </td>
<td>true/false  </td>
<td>CTWA 回传总开关  </td>
</tr>
<tr>
<td>ctwa:postback:event:add_to_cart  </td>
<td>true/false  </td>
<td>加购事件开关  </td>
</tr>
<tr>
<td>ctwa:postback:event:initiate_checkout  </td>
<td>true/false  </td>
<td>结算事件开关  </td>
</tr>
<tr>
<td>ctwa:postback:event:purchase  </td>
<td>true/false  </td>
<td>支付事件开关  </td>
</tr>
<tr>
<td>ctwa:postback:event:complete_registration  </td>
<td>true/false  </td>
<td>注册事件开关  </td>
</tr>
<tr>
<td>ctwa:postback:event:lead  </td>
<td>true/false  </td>
<td>留资事件开关  </td>
</tr>
</table>
### 5.4 不需要新建表
- 事件配置：复用 rp_page_webhook_meta
- 归因记录：复用 ctwa_conversion_attribution（仅扩展 type 枚举和 extend_info 结构）
- 数据集 ID：复用 channel_account_info_extend 或 rp_page_webhook_meta
## 六、模块设计
### 6.1 转化事件处理（core-service）
现有类结构（不变部分）：ICtwaConversionService、CtwaConversionServiceImpl、ICtwaConversionAttributionService、CtwaConversionAttributionServiceImpl、WhatsAppCommandService.sendCtwaConversionEvents()、CtwaConversionConstants、CtwaConversionConfig  
扩展设计：  
- 新增 CtwaMetaEventName 枚举：事件类型到 Meta event_name 映射
- 新增 CtwaConversionEventBodyBuilder：按事件类型构建 Meta CAPI 请求体
- 新增 CtwaPostbackToggleService：开关校验
核心处理流程变更：
Shopify 事件到达 handleShopifyOrderPaidMessage 扩展为通用入口 handleShopifyConversionEvent，根据 msg 中的事件类型分发到 Purchase/AddToCart/InitiateCheckout 对应的 Handler  
### 6.2 自定义 API 设计（channel-receive）
接口定义：  
POST /openapi/v1/ctwa/conversion/events  
请求体字段：  
- eventId（必填）：事件唯一标识
- eventType（必填）：ADD_TO_CART | INITIATE_CHECKOUT | ORDER_PAID | REGISTRATION_COMPLETED | LEAD_SUBMITTED
- eventTime（必填）：毫秒时间戳
- storeId（必填）：店铺ID
- mobile/userEmail（注册留资选填，二选一）
- leadId/formId（留资必填）
- amount/currency（加购结算支付可选）
处理流程：
channel-receive 收到请求 → 认证鉴权 → 参数校验 → 查询总开关（ctwa:postback:enabled） → 创建 ExternalBizEvent → 投递 Kafka → 返回 accepted=true
core-service 消费 Kafka → 根据 eventType 路由 → 归因匹配 → 写入归因表 → 定时回传 Meta CAPI  
### 6.3 Meta CAPI 回传（core-service）
回传字段映射：  
- event_name：AddToCart/InitiateCheckout/Purchase/CompleteRegistration/Lead
- action_source：固定值 business_messaging
- messaging_channel：固定值 whatsapp
- user_data.ctwa_clid：归因匹配到的 CTWA 点击 ID
- user_data.whatsapp_business_account_id：归因的 WABA ID
- custom_data.value/currency：加购结算支付传金额，注册留资不传
### 6.4 定时任务与重试（已有逻辑，需局部扩展）
已有逻辑说明：定时任务扫描（executeConversionPostbackTask）、重试策略（loadPostbackBatch/markPostbackSuccess/markPostbackFailed）均为现有代码，无需改动。新增类型自动被扫描覆盖。
需扩展部分：CtwaMetaEventName 枚举映射、CtwaConversionEventBodyBuilder 按事件类型构建请求体
任务调度：  
- 复用现有 executeConversionPostbackTask
- 触发方式：Scheduled（5 分钟/次）
- 扫描范围：need_postback=true 且 postback_status IN (PENDING, FAILED_RETRY)
- 批大小：500 条/批（游标分页）
重试策略：  
- 0 次：PENDING → 调用 → 成功 SUCCESS / 失败 FAILED_RETRY
- 1 ~ N-1 次：FAILED_RETRY → 重试 → 成功 SUCCESS / 失败 postback_times+1
-
>   = N 次：FAILED_RETRY → 重试 → 失败 FAILED_EXCEEDED（不再重试）  
- N 通过 Apollo 配置 ctwa.postback.maxRetryTimes，默认 3 次
## 七、现有代码复用分析
可直接复用：  
- WhatsAppCommandService.sendCtwaConversionEvents() - Meta CAPI HTTP 调用
- CtwaConversionAttributionServiceImpl - 归因记录 CRUD
- CtwaConversionServiceImpl.invokeExternalConversionPostback() - 单次回传上下文构建
- ExternalBizEvent / IExternalBizEventService - 外部事件管理
需要扩展：  
- CtwaConversionAttributionType - 新增 8 个枚举值
- CtwaConversionServiceImpl - 扩展事件处理逻辑
- CtwaConversionAttribution - extend_info 结构扩展
- WhatsAppController - 新增页面配置接口
需要新增：  
- CtwaMetaEventName（core-client） - Meta event_name 枚举
- CtwaConversionEventBodyBuilder（core-service） - Meta 请求体构建
- CtwaPostbackToggleService（core-service） - 事件开关校验
- CtwaConversionOpenApiController（channel-receive） - OpenAPI 入口
## 八、Apollo 配置
<table>
<tr>
<td>配置项  </td>
<td>默认值  </td>
<td>说明  </td>
</tr>
<tr>
<td>ctwa.postback.maxRetryTimes  </td>
<td>3  </td>
<td>最大重试次数  </td>
</tr>
<tr>
<td>ctwa.postback.batchSize  </td>
<td>500  </td>
<td>每批处理条数  </td>
</tr>
<tr>
<td>ctwa.postback.cron  </td>
<td>0 */5 * * * ?  </td>
<td>定时任务 cron  </td>
</tr>
<tr>
<td>ctwa.conversion.orderTimeFetchInterval  </td>
<td>259200  </td>
<td>归因窗口秒数  </td>
</tr>
</table>
## 九、变更检查清单
- 服务归属正确：事件处理归 core-service，API 入口归 channel-receive
- 存储访问合规：仅 core-service 操作数据库
- 公网入口正确：OpenAPI 走 channel-receive
- MQ 方向正确：复用现有 Kafka Topic
- Feign 方向正确：无反向依赖
- 配置外部化：通过 Apollo
- 文档同步：本次设计文档
## 十、附录
### 10.1 PRD 参考文档
CTWA行业版产品设计方案：https://my.feishu.cn/wiki/YZyqwjt3qiyllnkyM3KccLDRnBd
Meta CAPI 官方说明：https://www.facebook.com/business/help/433493041367251  
### 10.2 相关代码位置
ICtwaConversionService：meetbot-core-client/.../channel/whatsapp/application/command/
CtwaConversionServiceImpl：meetbot-core-server/.../channel/whatsapp/application/command/impl/
ICtwaConversionAttributionService：meetbot-core-server/.../channel/whatsapp/domain/service/
WhatsAppCommandService：meetbot-core-server/.../channel/whatsapp/application/command/  
