# WhatsApp Direct Send API 功能使用与接入调研 副本
---
> 版本：v1.1（调研稿 + 实测补充）
> 调研日期：2026-08-03（实测补充：2026-08-17，WABA 111681701943055）
> 依据：Meta 官方 Direct Send 文档（developers.facebook.com/documentation/business-messaging/whatsapp/direct-send/…，页面更新于 2026-07-29~07-31）+ meetbot 现有 WhatsApp 发送链路代码分析。
> 置信度说明见文末「信息来源与置信度」。  
## 1. 概述
Meta 推出的 **Direct Send（直接发送）**：发送 **utility（实用工具）/ authentication（身份验证）** 两类商家主动消息时，**无需预先创建、提交审核、管理模板**，直接调用现有 `POST /{WHATSAPP_BUSINESS_PHONE_NUMBER_ID}/messages` 端点，在请求体里加一个 `category` 字段即可。Meta 后台自动做模板匹配，并**异步自动生成新模板**。  
- 目前处于 **Beta 分阶段开放**，需 Meta 侧开通账户资质（Eligibility）。
- 复用现有 Cloud API 机制：收件模型（`to` 手机号 / `recipient` BSUID）、鉴权（Access Token）、限流（标准 Cloud API 吞吐量）。
- 定位：**加速 utility/authentication 类业务消息上线**，消除模板管理/审核步骤。
## 2. 资格要求（接入门槛）
<table>
<tr>
<td>类别  </td>
<td>要求  </td>
<td>开通方式  </td>
</tr>
<tr>
<td>utility  </td>
<td>WABA 需被 Meta 开启 Direct Send  </td>
<td>WhatsApp Manager（消息模板页）横幅提示是否符合；不符合可提交官方 Google Form 表达兴趣  </td>
</tr>
<tr>
<td>authentication  </td>
<td>Beta、**访问受限**  </td>
<td>需表达兴趣 / 联系客户经理，不可自助开通  </td>
</tr>
</table>
> **不符合资质的账户调用**：同步返回错误 `100`，`error_data.details` = `Parameter Invalid: The 'category' value requires Direct Send, which isn't enabled for this account. Use an approved message template instead.`  
> **重要**：现有接入方式**不能直接使用** Direct Send——必须逐 WABA 确认资质并获 Meta 侧开通。未开通账户请继续走旧模板路径。  
### 2.1 前提条件（Prerequisites）
启用/使用 Direct Send 需满足（Meta 官方）：  
<table>
<tr>
<td>前提  </td>
<td>说明  </td>
</tr>
<tr>
<td>WhatsApp Business 账户（WABA）  </td>
<td>已开通的 WABA，能发起消息（对齐现有接入即可）  </td>
</tr>
<tr>
<td>符合类别要求  </td>
<td>发送内容必须符合 **utility / authentication** 的 Meta 类别指南（营销内容不支持）  </td>
</tr>
<tr>
<td>Meta 侧授权  </td>
<td>Direct Send 处于 **Beta 分阶段开放**，需 Meta 为相应 WABA 开启该能力  </td>
</tr>
<tr>
<td>企业范围用户编号可用性  </td>
<td>收件人模型沿用 Cloud API（`to` 手机号或 `recipient` BSUID）；**authentication 类**受限制只能用**手机号**，不能用 BSUID  </td>
</tr>
<tr>
<td>authentication 额外  </td>
<td>Beta 访问受限，需**联系合作伙伴（BSP）/ 客户经理**申请，不可自助开通  </td>
</tr>
</table>
> 作为 BSP：你可以代管名下客户 WABA，但每个 WABA 是否开通仍由 Meta 判定，需逐 WABA 验证。  
### 2.2 如何验证是否已有权限
**方式一：WhatsApp Manager 查看（官方推荐、最直接）**  
- 进入 WhatsApp Manager 的 **消息模板**页，页面横幅会明确提示该 WABA 是否符合 Direct Send 资格。
- **官方访问地址**：`https://business.facebook.com/latest/whatsapp_manager/message_templates?nav_ref=developer_docs_direct_send_cta`（WhatsApp Manager → 消息模板页；横幅会显示账户是否符合资格）。
![](ZcIVbUlwpo8flnxhZ8Wce8JQnUe)
- 若账户不符合资格，页面上可「**表达兴趣**」入口（跳转官方 Google Form）；authentication 需联系合作伙伴 / 客户经理。
**方式二：API 探测（无需登录管理页，适合代码/自动化判定）**  
- 对目标 WABA 调用一次带 `category` 字段的发送（用 `"category":"service"` 或 `"utility"` 均可作为探测，推荐低成本文本）：
  - **有权限**：请求被 **受理**，不返回 100 资质错误（`category` 值非法会返回 100，但错误文案不同，需区分）。
  - **无权限**：返回同步错误 `100`，`error_data.details` 含 `Direct Send ... isn't enabled for this account` 字样。
```
// 探测请求（规范化示例）
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "<PHONE>",
  "type": "text",
  "text": {
    "body": "Direct Send capability probe"
  },
  "category": "service"
}
```
> 注意：`service` 若已无打开的服务窗口会返回 `131047`（但 131047 ≠ 无 DS 权限），故判权时**以是否报 100 且文案含 "isn't enabled / requires Direct Send" 为准**。  
**方式三：断言存在直接发送生成的模板（辅助信号）**  
- 已开通 WABA 上存在 `GET /{WABA_ID}/message_templates?source=AUTO_GENERATED` 返回的自动生成模板，可作为"已启用"的辅助佐证（但仅为辅助，非充分条件，最好叠加方式二探测）。
**开通/申请路径（表达兴趣入口）**：  
- **Google Form（官方表达兴趣入口）**：`https://docs.google.com/forms/d/e/1FAIpQLSczh1F7ZZZ2ZW45ozm63dxXN6h-IOT0IV-LcOZz5Jpz82ynEg/viewform`（utility 不符合资格或 authentication 想参与 Beta，均可提交此表单）
- **官方 prerequisites 帮助页**：`https://www.facebook.com/business/help/595597942906808`
- 若账户不符合资格：WhatsApp Manager 消息模板页横幅下方有「表达兴趣」入口（跳转上述 Google Form）；authentication 则联系 BSP / 客户经理申请。
## 3. 能力边界与限制
### 3.1 支持的消息类型（Beta）
**utility（支持）：**  
- 文本消息（无 URL 预览）
- 交互式 CTA 网址按钮
- 交互式回复按钮
- 混合 CTA + 回复按钮（总按钮 ≤10，CTA ≤2）
- 自定义 TTL
- image / video / document（含 text）消息头
- **Call on WhatsApp（在 WhatsApp 上通话）按钮**——独立 interactive 类型，用户点按即给商家号码发起语音通话（详见 §5.3）
**authentication（Beta、受限）：**  
- 文本
- 复制代码按钮（**仅英文**）
**marketing：❌ 不支持**（营销内容请走 Marketing Messages 或旧模板路径；含 PSTN 电话按钮）  
**其他明确不支持**：所有其他按钮格式、地址 / 音频 / 联系人 / 位置 / 贴纸 / 心情消息、其他媒体格式。官方标注为"...currently does not support any other message formats or features"。  
### 3.2 长度与数量限制
<table>
<tr>
<td>项目  </td>
<td>上限  </td>
</tr>
<tr>
<td>正文 body  </td>
<td>1024 字符  </td>
</tr>
<tr>
<td>标题 header  </td>
<td>60 字符  </td>
</tr>
<tr>
<td>页脚 footer  </td>
<td>60 字符  </td>
</tr>
<tr>
<td>按钮文本  </td>
<td>20 字符  </td>
</tr>
<tr>
<td>快速回复按钮  </td>
<td>≤10  </td>
</tr>
<tr>
<td>CTA 按钮  </td>
<td>≤2（且排在回复按钮之前）  </td>
</tr>
<tr>
<td>通话按钮  </td>
<td>**≤1**（单独发送，不可与 CTA/回复按钮混用）  </td>
</tr>
<tr>
<td>通话按钮 label  </td>
<td>20 字符（`display_text`）  </td>
</tr>
<tr>
<td>通话按钮有效期  </td>
<td>`ttl_minutes` 1~43200（默认 7 天）  </td>
</tr>
</table>
### 3.3 语言
支持全部 WhatsApp Cloud API 语言。  
### 3.4 吞吐量
支持标准 Cloud API throughput（与普通消息一致）。  
### 3.5 TTL（自定义消息有效期）
> **口径**：TTL 分两层——**模板级 TTL**（`message_send_ttl_seconds`，创建/更新模板时设置，Cloud API 对 authentication/utility 模板均支持，**非 Direct Send 专属**）；**发送级 TTL 覆盖**（每次发消息在请求体传 `ttl_seconds`，**仅 Direct Send 消息支持**）。本节指发送级。  
请求体新增 `ttl_seconds` 字段（置于 `category` 之后）：  
```
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "<PHONE>",
  "type": "text",
  "text": {
    "body": "<BODY_TEXT>"
  },
  "category": "utility",
  "ttl_seconds": 600
}
```
<table>
<tr>
<td>类别  </td>
<td>默认  </td>
<td>最小  </td>
<td>最大  </td>
</tr>
<tr>
<td>utility  </td>
<td>30 天  </td>
<td>30 秒  </td>
<td>43200 秒（12 小时）  </td>
</tr>
<tr>
<td>authentication  </td>
<td>600 秒（10 分钟）  </td>
<td>30 秒  </td>
<td>900 秒（15 分钟）  </td>
</tr>
</table>
- 超时未送达 → **静默丢弃，无错误/通知，队列中彻底移除**
- TTL 用在非 Direct Send 消息上 / 越界 → 同步错误 `100`
## 4. 核心机制
### 4.1 模板匹配与兜底
- **Onboarding**：WABA 开通时，Meta 注入少量 fallback（onboarding）模板。
- **每条发送消息的处理**：
  1. 检查消息是否匹配**现有模板** → 匹配则用该模板发送
  2. 匹配不到 → **回退 onboarding 模板**，消息**仍会发送**
  3. 无匹配时**异步触发生成新模板**：内容先做 **PII 脱敏**、**语言检测**，供后续匹配消息复用
> **fallback 时用户收到的内容样式**：官方只说"回退到 onboarding 模板，消息仍会发送"，**没有说明回退模板的具体文案/样式**（这类模板由 Meta 注入，非商家可见定义）。即：字段层面统一为 `template_id` 指向该 fallback 模板；而**用户实际看到的样式中不可控**（可能是通用的类"消息已送达"占位文案，而非你传入的原文），这点官方未披露——接入前需实测验证，是待确认项。  
> ✅ **实测补充（§5.7）**：fallback 模板实例已确认——`auto_generated_80634f52_02d1_4a75_b9a2_2f4b20678032`（id=`2157766311750751`）正文为泛化 `{{1}}`，文本/TTL/image/video/document/混合1CTA 等不同内容消息均命中它；且手机**实际收到的仍是发送的原文**（各用例均确认送达/已读），即回退时用户看到的仍是商家传入的内容。  
### 4.2 Business-named templates（商家命名模板）
需要**可预测的模板归属**时，在请求体加 `direct_send_config.template_name`，Direct Send 创建/复用该确切名称的模板，所有同名消息都归因到它。**仅 utility 支持**（authentication 暂不支持）。  
```
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "<PHONE>",
  "type": "text",
  "text": {
    "body": "Hi Jane, your order #12345 has been shipped..."
  },
  "category": "utility",
  "direct_send_config": {
    "template_name": "order_shipment_update"
  }
}
```
**命名与唯一性约束**：指定模版时不同内容会不会导致模版变化  
<table>
<tr>
<td>约束  </td>
<td>规则  </td>
</tr>
<tr>
<td>格式  </td>
<td>`^[a-z0-9_]+$`（仅小写字母、数字、下划线）；非法 → 同步错误 `100`  </td>
</tr>
<tr>
<td>最大长度  </td>
<td>512 字符  </td>
</tr>
<tr>
<td>**WABA 内唯一**  </td>
<td>同 WABA 内不得与已有模板重名；与**非 Direct Send 创建**的模板重名 → **异步错误 132021**（error webhook），需换名  </td>
</tr>
<tr>
<td>**跨 WABA 可复用**  </td>
<td>唯一性为 **per-WABA**，不同 WABA 可安全使用相同 `template_name`  </td>
</tr>
<tr>
<td>复用限制  </td>
<td>已存在的同名模板**不能被复用**为 DS 模板（非 DS 模板不能用于发 DS 消息），必须换名或改内容  <br/>**双向隔离（含 2026-08-18 实测）**：DS 生成的模板（自动生成 `auto_generated_*` 与商家命名 `template_name`）**不能**被用于标准 Cloud API 模板消息发送（`type=template` 按 name+language 引用）——同步报错 **132018**（`Direct send template can't be used for template message`，官方错误码表未收录）。即 DS 模板与普通模板**互斥**：非 DS 模板不能发 DS 消息（官方 FAQ），DS 模板也不能发普通模板消息（实测）。模板消息统一走 DS 的 `category` 机制。  </td>
</tr>
</table>
**（命名模板）无兜底**：区别于标准 DS 流程，命名模板**不兜底** onboarding。创建失败重试 ≤3 次，仍失败 → 异步错误 `131000`（"Something went wrong"）。  
### 4.3 自动生成模板的清理策略
自动生成模板分**两阶段清理**：  
<table>
<tr>
<td>阶段  </td>
<td>触发条件  </td>
<td>结果  </td>
</tr>
<tr>
<td>1  </td>
<td>**创建后从未用于发送**消息的模板  </td>
<td>**24 小时后删除**  </td>
</tr>
<tr>
<td>2  </td>
<td>**曾使用但长期不活跃**（基于 Meta 可配置阈值）的模板  </td>
<td>**定期归档**（archived）  </td>
</tr>
</table>
**含义与处理**：不能依赖 `auto_generated_*` 模板长期存在；报表/审计需**及时同步**（`GET message_templates?source=AUTO_GENERATED`）。需要稳定归属的用 §4.2 named 模板。官方未明确 named 模板是否豁免清理（待确认）。  
## 5. 功能使用（API）
### 5.1 文本消息
```
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "<PHONE>",
  "type": "text",
  "text": {
    "body": "<BODY_TEXT>"
  },
  "category": "utility"
}
```
- `category` 支持值：`utility`、`authentication`（受限）、`service` 或省略（**走原有服务消息流程，不属于 Direct Send**；无已开服务窗口时同步错误 `131047`）
- 非法 category（如 `marketing`）→ 同步错误 `100`
- **不支持 ****preview_url**——不渲染网址预览
- `recipient_type` 恒为 `individual`
### 5.2 按钮与媒体类（interactive）
统一在请求体末尾加 `"category": "utility"`。  
**CTA 网址按钮（type=cta_url，独立 interactive 消息）**：  
```
{
  "type": "interactive",
  "interactive": {
    "type": "cta_url",
    "header": {
      "type": "text",
      "text": "<HEADER_TEXT>"
    },
    "body": {
      "text": "<BODY_TEXT>"
    },
    "footer": {
      "text": "<FOOTER_TEXT>"
    },
    "action": {
      "name": "cta_url",
      "parameters": {
        "display_text": "<BTN_TEXT>",
        "url": "<URL>"
      }
    }
  },
  "category": "utility"
}
```
- URL 映射到按钮，**正文不放裸 URL**；header 支持 text / image / video / document 等 media 头
- `display_text` ≤20 字符；`url` 需为合法 HTTPS 地址
- ⚠️ **不要**使用 `interactive.type="button"` + `action.buttons[].cta_url`（字符串 URL）的旧写法：Meta v24.0 会返回错误 `100`——`interactive.action.buttons.0.cta_url` 期望 `[object, null]`（对象或 null），且 `title` 为按钮对象上的非法字段
- 官方建议优先使用**混合按钮（CTA+回复）**格式发送，见下；独立 CTA 格式亦可（v24.0 本环境实测通过）
**回复按钮（type=reply）**：  
```
{
  "type": "interactive",
  "interactive": {
    "type": "button",
    "header": {
      "type": "text",
      "text": "<HEADER_TEXT>"
    },
    "body": {
      "text": "<BODY_TEXT>"
    },
    "action": {
      "buttons": [
        {
          "type": "reply",
          "reply": {
            "id": "<BTN_ID>",
            "title": "<BTN_TEXT>"
          }
        }
      ]
    }
  },
  "category": "utility"
}
```
- 最多 3 个回复；用户点击触发**消息 webhook**（type=button，携带选中 id/text）
**混合按钮（CTA+回复）⭐ 官方推荐**：同一 `buttons` 数组混用 `cta_url` 与 `reply`；总 ≤10，CTA ≤2，**CTA 在回复之前**（官方 `supported-message-types` 明示此为推荐方式）。`cta_url` 按钮的 URL 必须是**对象**形式（v24.0 本环境实测通过）：  
```
{
  "type": "cta_url",
  "cta_url": {
    "url": "<URL>",
    "display_text": "<BTN_TEXT>"
  }
}
```
- `display_text` ≤20 字符；`url` 需为合法 HTTPS 地址
- ⚠️ **不要**写成 `{"type":"cta_url","title":"<BTN_TEXT>","cta_url":"<URL字符串>"}`：v24.0 会返回错误 `100`——`interactive.action.buttons.N.cta_url` 期望 `[object, null]`，且 `title` 为按钮对象上的非法字段
> ✅ 独立 CTA / 纯回复 / 混合（对象）三种按钮格式均已在本环境 v24.0 实测发送成功。  
**媒体头**：  
```
"header": {
  "type": "image",
  "image": {
    "link": "<IMAGE_URL>"
  }
}
"header": {
  "type": "video",
  "video": {
    "link": "<VIDEO_URL>"
  }
}
"header": {
  "type": "document",
  "document": {
    "link": "<DOC_URL>",
    "filename": "<FILENAME>"
  }
}
```
- 每种至少给 `link`（公网 URL）或 `id`（已上传 MEDIA_ID）；document 可选 `filename`
> ✅ 媒体头 image / video / document 均已在本环境 v24.0 实测通过（媒体头 Beta 受限未触发，本 WABA 可直接用 link）。  
> ✅ 完整覆盖：文本（纯文本 / +TTL / +商家命名模板 / authentication）与 独立 CTA / 纯回复（≤3）/ 混合（1CTA+1回复、2CTA+1回复）均已实测发送成功；voice_call 受 calling 能力限制（见 §5.3）；仅 authentication 复制代码按钮因 Beta 未开通未测。  
### 5.3 Call on WhatsApp（在 WhatsApp 上通话）按钮
独立 interactive 消息类型：给用户一个「通话」按钮，**用户点按后主动向商家号码发起 WhatsApp 语音通话**（user-initiated，非商家呼出）。请求体带 `"category": "utility"` 即走 Direct Send。  
```
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "<WHATSAPP_USER_PHONE_NUMBER>",
  "type": "interactive",
  "category": "utility",
  "interactive": {
    "type": "voice_call",
    "body": {
      "text": "Call our support team for help with your order."
    },
    "action": {
      "name": "voice_call",
      "parameters": {
        "display_text": "Call Support",
        "ttl_minutes": 1440
      }
    }
  }
}
```
**参数**：  
<table>
<tr>
<td>参数  </td>
<td>必填  </td>
<td>说明  </td>
</tr>
<tr>
<td>`interactive.type`  </td>
<td>是  </td>
<td>必须为 `voice_call`  </td>
</tr>
<tr>
<td>`interactive.body.text`  </td>
<td>是  </td>
<td>正文，≤1024 字符  </td>
</tr>
<tr>
<td>`interactive.header`  </td>
<td>否  </td>
<td>仅支持 text 头，≤60 字符；**不支持 footer**  </td>
</tr>
<tr>
<td>`action.name`  </td>
<td>是  </td>
<td>必须为 `voice_call`  </td>
</tr>
<tr>
<td>`action.parameters.display_text`  </td>
<td>否  </td>
<td>按钮文案，≤20 字符，缺省 `Call on WhatsApp`  </td>
</tr>
<tr>
<td>`action.parameters.ttl_minutes`  </td>
<td>否  </td>
<td>按钮有效时长 1~~43200 分钟（1 分钟~~30 天），默认 7 天；过期按钮置灰  </td>
</tr>
</table>
**前置要求（calling 能力）**：  
1. 订阅 WABA 的 `calls` webhook 字段。
2. 启用 calling：`POST /{WABA_ID}/settings`，body `{"calling": {"status": "ENABLED"}}`。
3. 未启用 → 发送失败错误 `138000`（Calling API not enabled）；缺 webhook 订阅 → `138018`（technical prerequisites not met）。
> ✅ v24.0 实测（§5.7 用例 12）：本环境未启用 calling，`POST /messages` 直接同步返回 `138000 Calling API not enabled`（OAuthException，error_data.details="WhatsApp Cloud API Calling not enabled for this phone number."），**无 webhook 回调**——与前置要求 3 一致。启用 calling（`POST /{WABA_ID}/settings` 置 ENABLED）+ 订阅 `calls` 后需复测。  
**限制与行为**：  
- 每条消息**只能 1 个通话按钮，单独发送**，不可与 CTA/回复按钮混用。
- 不支持 footer；`ttl_minutes` 越界 → 同步错误 `100`。
- 属用户发起，**不适用商家主动呼叫的地区限制**；可用地区以 WhatsApp Business Calling 文档为准。
### 5.4 authentication（Beta、受限）
文本 + 复制代码按钮（仅英文）。付款按认证费率。需客户经理/合作方开通；**不可发 BSUID，必须用手机号**（官方 Direct Send 文档 Note：_"Authentication-category messages can't be sent to a business-scoped user ID — use __to__ with a phone number."_）。  
**实测结论（v24.0，两个 WABA 均复现）**：`category=authentication`**同步受理并返回 wamid**，但**异步回调 ****131047****（Re-engagement message）失败**——距客户上次回复超 24 小时。**authentication DS 消息同样受 24h re-engagement 窗口约束，无需额外开通功能；账户已开通 DS（请求被受理）**。发送需在会话窗口内，或联系 Meta 确认 authentication DS 资质后复测。  
> 📌 样本 1（本环境，phone_number_id=`111681701943055`，sender=`8615736742277`，WABA=`111918461725990`）：同步 wamid `wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjg3RTI4MjgwMjA2MEExQzk5MQA=`；回调 `status=4`，`error_data.details`="Message failed to send because more than 24 hours have passed since the customer last replied to this number."（详见 §5.7 用例 3）。
> 📌 样本 2（用户提供，accountId/phone_number_id=`103900502708739`，sender=`8618321330993`，同 WABA=`111918461725990`，收件 `8618516505516`/BSUID=`CN.1765719894460979`）：同步 wamid `wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjEyMjU1OTIzNkVDNjUwRDM0OAA=`；回调 `status=4`，`errorCode=131047`，`error_data.details` 同上（24h re-engagement）。  
复制代码按钮 payload 待开通后再核（官方 `supported-message-types` 未给 Direct Send 的完整样例）。  
### 5.5 查看自动生成的模板
```
GET /{WABA_ID}/message_templates?source=AUTO_GENERATED
# 可叠加 name / correct_category 过滤，如：
GET /{WABA_ID}/message_templates?source=AUTO_GENERATED&name=auto_generated_123456
GET /{WABA_ID}/message_templates?source=AUTO_GENERATED&correct_category=MARKETING
```
自动模板名：`auto_generated_*`（基于内容）或指定 `template_name`。  
**只发纯文本时，Meta 自动生成的模板长这样（官方响应示例）**：  
```
{
  "data": [
    {
      "name": "auto_generated_text_e22a3ec4_7c4a_4097_ae40_56ed1e89941c",
      "parameter_format": "POSITIONAL",
      "components": [
        {
          "type": "BODY",
          "text": "Hi 1, Your order is delivered.",
          "example": {
            "body_text": [
              ["sample 1"]
            ]
          }
        }
      ],
      "language": "en_US",
      "status": "APPROVED",
      "category": "UTILITY",
      "correct_category": "UTILITY",
      "source": "AUTO_GENERATED",
      "id": "1951933648908188"
    }
  ],
  "paging": {
    "cursors": {
      "before": "MAZDZD",
      "after": "MjQZD"
    }
  }
}
```
- **"变量"（参数占位符）**：你发送的是**具体内容，不是带 ****{{1}}**** 占位的变量值**（无 POSITIONAL 形参入参）。Meta 生成模板时把内容里可变部分以 `parameter_format=POSITIONAL` 记录并在 `example.body_text` 给出示例值（如上面 `Hi {{1}},...` + sample）。**这与现有模板"填变量发模板"的用法不同**——DS 是你传成文内容，Meta 反推参数化。
- **不可编辑 / 删除**直接发送生成的模板（自动生成与 named 均不可），错误 `2388318` / `2388330`
- 用 `source=AUTO_GENERATED` 识别
### 5.6 状态 Webhook 与普通消息的差异
**Direct Send 状态回调结构（官方原文）**：  
```
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "<ID>",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "statuses": [
              {
                "id": "<ID>",
                "status": "<read/delivered/sent>",
                "timestamp": "<EPOCH_TIME>",
                "recipient_id": "<RECIPIENT_PHONE_NUMBER>",
                "template_id": "<TEMPLATE_ID>",
                "conversation": {},
                "pricing": {}
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```
**与普通消息状态 Webhook 的对比**：  
<table>
<tr>
<td>维度  </td>
<td>普通消息（无 category）  </td>
<td>Direct Send 消息  </td>
</tr>
<tr>
<td>整体结构  </td>
<td>id / status / timestamp / recipient_id / conversation / pricing  </td>
<td>**完全相同**  </td>
</tr>
<tr>
<td>定价  </td>
<td>statuses + pricing 结构  </td>
<td>相同（按对应会话费率）  </td>
</tr>
<tr>
<td>**新增字段**  </td>
<td>无  </td>
<td>**template_id** —— 本次实际命中的模板 ID（归属/对账）  </td>
</tr>
<tr>
<td>失败回调  </td>
<td>status=failed + errors 数组  </td>
<td>结构相同；errors.code 会含 **DS 特有错误码**（132015/131064/139200/132021/131000 等）  </td>
</tr>
<tr>
<td>recipient_id  </td>
<td>手机号或 BSUID  </td>
<td>同左  </td>
</tr>
</table>
要点：  
- 仅带 `category`（utility/authentication）的 DS 消息才有 `template_id`；服务消息（`category=service`/省略）没有。
- `template_id` 只反映"命中哪个模板"，**内容需另调 §5.5** 关联。
- failed 状态**必须扩展错误码映射**（§6），否则现有错误落库会漏。
- 实测补充（§5.7）：回调 `statuses` 内含 `recipient_user_id`（BSUID）；named 模板回调外层含 `conversationExpirationTime`；网关外层包装字段及 status 映射（1=sent/2=delivered/3=read/4=failed）见 §5.7。
### 5.7 实测记录（2026-08-17，完整 API / 响应 / Meta 回调）
> **测试环境**：网关端点 `.../sino_channel_facebook/ZRY8eB2neSyLx/v24.0/111681701943055/messages`；phone_number_id=`111681701943055`；回调 `entry.id`（WABA）=`111918461725990`；商家显示号码 sender=`8615736742277`；收件手机号 `8618516505516`（BSUID=`CN.1765719894460979`）。APIKEY 见 §5 汇总 curl。所有消息 `category` 均带 `utility` / `authentication`。
> 以下 `meta返回` 为**网关外层包装**，`messageData` 内是 Meta 原始 webhook JSON（statuses）。  
![](GB6KbIybYoK3s6xPoSocp99GnCh)
**网关回调外层字段说明**：  
<table>
<tr>
<td>字段  </td>
<td>含义/取值  </td>
</tr>
<tr>
<td>accountId  </td>
<td>111681701943055（phone_number_id）  </td>
</tr>
<tr>
<td>bsuid  </td>
<td>收件人 BSUID（`CN.1765719894460979`）  </td>
</tr>
<tr>
<td>channel  </td>
<td>whatsapp  </td>
</tr>
<tr>
<td>conversationBillable  </td>
<td>是否计费（true）  </td>
</tr>
<tr>
<td>conversationId  </td>
<td>会话 id  </td>
</tr>
<tr>
<td>conversationPricingCategory / Model / Type  </td>
<td>utility / PMP / regular  </td>
</tr>
<tr>
<td>conversationType  </td>
<td>6  </td>
</tr>
<tr>
<td>conversationExpirationTime  </td>
<td>**仅 named 模板回调出现**（epoch ms）  </td>
</tr>
<tr>
<td>errorCode / errorDesc  </td>
<td>**失败时出现**（如 131047 / Re-engagement message）  </td>
</tr>
<tr>
<td>messageData  </td>
<td>Meta 原始 statuses webhook（JSON 字符串）  </td>
</tr>
<tr>
<td>messageId  </td>
<td>wamid  </td>
</tr>
<tr>
<td>phoneNumber / receiver  </td>
<td>8618516505516  </td>
</tr>
<tr>
<td>sender  </td>
<td>8615736742277  </td>
</tr>
<tr>
<td>sendTime  </td>
<td>epoch ms  </td>
</tr>
<tr>
<td>status  </td>
<td>**1=sent 2=delivered 3=read 4=failed**  </td>
</tr>
<tr>
<td>type  </td>
<td>2  </td>
</tr>
</table>
**用例 1｜文本 utility（中文）** — ✅ 送达并已读  
```
curl --location 'https://o-test-sino-channel-api-gateway.meetsocial.cn/sino_channel_facebook/ZRY8eB2neSyLx/v24.0/111681701943055/messages' \
--header 'Content-Type: application/json' \
--header 'APIKEY: sz0rk7PMKtHsMkI2M4LhgfahbdmkPoZ3zvEPykDegub1IqCM7wLXdMoVSIsa1pkP' \
--data '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "8618516505516",
    "type": "text",
    "text": {
        "body": "你好！这是一条测试消息1004"
    },
    "category": "utility"
}'
```
**同步响应**：  
```
{"messaging_product":"whatsapp","contacts":[{"input":"8618516505516","wa_id":"8618516505516"}],"messages":[{"id":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjk2NDlDRjM5NENCRkIxMjBBMAA="}]}
```
**Meta 回调**（要点：status=read；recipient_user_id=BSUID；自动模板 `template_id=2157766311750751`）：  
```
{"accountId":"111681701943055","bsuid":"CN.1765719894460979","channel":"whatsapp","conversationBillable":true,"conversationId":"f971386a3a75f50ecaee274c416eff32","conversationPricingCategory":"utility","conversationPricingModel":"PMP","conversationPricingType":"regular","conversationType":6,"messageData":"{\"object\":\"whatsapp_business_account\",\"entry\":[{\"id\":\"111918461725990\",\"changes\":[{\"value\":{\"messaging_product\":\"whatsapp\",\"metadata\":{\"display_phone_number\":\"8615736742277\",\"phone_number_id\":\"111681701943055\"},\"contacts\":[{\"wa_id\":\"8618516505516\",\"user_id\":\"CN.1765719894460979\"}],\"statuses\":[{\"id\":\"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjk2NDlDRjM5NENCRkIxMjBBMAA=\",\"status\":\"read\",\"timestamp\":\"1786966502\",\"recipient_id\":\"8618516505516\",\"recipient_user_id\":\"CN.1765719894460979\",\"template_id\":\"2157766311750751\",\"conversation\":{\"id\":\"f971386a3a75f50ecaee274c416eff32\",\"origin\":{\"type\":\"utility\"}},\"pricing\":{\"billable\":true,\"pricing_model\":\"PMP\",\"category\":\"utility\",\"type\":\"regular\"}}]},\"field\":\"messages\"}]}]}","messageId":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjk2NDlDRjM5NENCRkIxMjBBMAA=","phoneNumber":"8618516505516","receiver":"8618516505516","sendTime":1786966502000,"sender":"8615736742277","status":3,"type":2}
```
要点：文本 utility 送达并已读；自动匹配模板 `template_id=2157766311750751`。  
**用例 2｜文本 + TTL（ttl_seconds=30）** — ✅ 送达并已读  
```
curl --location 'https://o-test-sino-channel-api-gateway.meetsocial.cn/sino_channel_facebook/ZRY8eB2neSyLx/v24.0/111681701943055/messages' \
--header 'Content-Type: application/json' \
--header 'APIKEY: sz0rk7PMKtHsMkI2M4LhgfahbdmkPoZ3zvEPykDegub1IqCM7wLXdMoVSIsa1pkP' \
--data '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "8618516505516",
    "type": "text",
    "text": {
        "body": "Hello with TTL1"
    },
    "category": "utility",
    "ttl_seconds": 30
}'
```
**同步响应**：  
```
{"messaging_product":"whatsapp","contacts":[{"input":"8618516505516","wa_id":"8618516505516"}],"messages":[{"id":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjM0Q0Q2QTNDMzdCMjc3NkQ0NQA="}]}
```
要点：`ttl_seconds=30` 生效且送达已读；**相同内容复用同一自动模板**（`template_id=2157766311750751`，同用例 1）。  
**用例 3｜文本 authentication** — ⚠️ 同步受理（wamid）但**异步回调失败 ****131047**  
```
curl --location 'https://o-test-sino-channel-api-gateway.meetsocial.cn/sino_channel_facebook/ZRY8eB2neSyLx/v24.0/111681701943055/messages' \
--header 'Content-Type: application/json' \
--header 'APIKEY: sz0rk7PMKtHsMkI2M4LhgfahbdmkPoZ3zvEPykDegub1IqCM7wLXdMoVSIsa1pkP' \
--data '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "8618516505516",
    "type": "text",
    "text": {
        "body": "验证码是： 12345. 有效期 10 分钟."
    },
    "category": "authentication"
}'
```
**同步响应**（已受理，返回 wamid）：  
```
{"messaging_product":"whatsapp","contacts":[{"input":"8618516505516","wa_id":"8618516505516"}],"messages":[{"id":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjg3RTI4MjgwMjA2MEExQzk5MQA="}]}
```
**Meta 回调**（失败，status=4）：  
```
{"accountId":"111681701943055","bsuid":"CN.1765719894460979","channel":"whatsapp","errorCode":"131047","errorDesc":"Re-engagement message","messageData":"{\"object\":\"whatsapp_business_account\",\"entry\":[{\"id\":\"111918461725990\",\"changes\":[{\"value\":{\"messaging_product\":\"whatsapp\",\"metadata\":{\"display_phone_number\":\"8615736742277\",\"phone_number_id\":\"111681701943055\"},\"contacts\":[{\"wa_id\":\"8618516505516\",\"user_id\":\"CN.1765719894460979\"}],\"statuses\":[{\"id\":\"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjg3RTI4MjgwMjA2MEExQzk5MQA=\",\"status\":\"failed\",\"timestamp\":\"1786967834\",\"recipient_id\":\"8618516505516\",\"recipient_user_id\":\"CN.1765719894460979\",\"errors\":[{\"code\":131047,\"title\":\"Re-engagement message\",\"message\":\"Re-engagement message\",\"error_data\":{\"details\":\"Message failed to send because more than 24 hours have passed since the customer last replied to this number.\"},\"href\":\"https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes/\"}]}]},\"field\":\"messages\"}]}]}","messageId":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjg3RTI4MjgwMjA2MEExQzk5MQA=","phoneNumber":"8618516505516","receiver":"8618516505516","sendTime":1786967834000,"sender":"8615736742277","status":4,"type":2}
```
要点：**131047**** 实测为异步错误**——同步返回 wamid，随后 statuses webhook 报 `failed`（原因：超过 24 小时客户未回复本号码，需 re-engagement）。§6.4 原标注"131047 同步"需按此修正。authentication DS 消息在本场景同样受 24h 窗口约束；需会话内发送或确认账户 DS authentication 资质后再测。  
**用例 4｜独立 CTA 网址按钮（中文物流）** — ✅ 送达  
```
curl --location 'https://o-test-sino-channel-api-gateway.meetsocial.cn/sino_channel_facebook/ZRY8eB2neSyLx/v24.0/111681701943055/messages' \
--header 'Content-Type: application/json' \
--header 'APIKEY: sz0rk7PMKtHsMkI2M4LhgfahbdmkPoZ3zvEPykDegub1IqCM7wLXdMoVSIsa1pkP' \
--data '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "8618516505516",
    "type": "interactive",
    "category": "utility",
    "interactive": {
        "type": "cta_url",
        "header": {
            "type": "text",
            "text": "物流通知"
        },
        "body": {
            "text": "您的订单 #12345 已发货，预计 1-6 个工作日送达。点击下方按钮查看物流详情。"
        },
        "footer": {
            "text": "ABC 商店"
        },
        "action": {
            "name": "cta_url",
            "parameters": {
                "display_text": "查看物流",
                "url": "https://example.com/track/12345"
            }
        }
    }
}'
```
**同步响应**：  
```
{"messaging_product":"whatsapp","contacts":[{"input":"8618516505516","wa_id":"8618516505516"}],"messages":[{"id":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEkVFQTNCNDY3NDM1ODcwRUUzMQA="}]}
```
**Meta 回调**（status=delivered；独立模板 `template_id=1602428478079454`）：  
```
{"accountId":"111681701943055","bsuid":"CN.1765719894460979","channel":"whatsapp","conversationBillable":true,"conversationId":"bad046b463073bf4eb99d932cc7243e8","conversationPricingCategory":"utility","conversationPricingModel":"PMP","conversationPricingType":"regular","conversationType":6,"messageData":"{\"object\":\"whatsapp_business_account\",\"entry\":[{\"id\":\"111918461725990\",\"changes\":[{\"value\":{\"messaging_product\":\"whatsapp\",\"metadata\":{\"display_phone_number\":\"8615736742277\",\"phone_number_id\":\"111681701943055\"},\"contacts\":[{\"wa_id\":\"8618516505516\",\"user_id\":\"CN.1765719894460979\"}],\"statuses\":[{\"id\":\"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEkVFQTNCNDY3NDM1ODcwRUUzMQA=\",\"status\":\"delivered\",\"timestamp\":\"1786967940\",\"recipient_id\":\"8618516505516\",\"recipient_user_id\":\"CN.1765719894460979\",\"template_id\":\"1602428478079454\",\"conversation\":{\"id\":\"bad046b463073bf4eb99d932cc7243e8\",\"origin\":{\"type\":\"utility\"}},\"pricing\":{\"billable\":true,\"pricing_model\":\"PMP\",\"category\":\"utility\",\"type\":\"regular\"}}]},\"field\":\"messages\"}]}]}","messageId":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEkVFQTNCNDY3NDM1ODcwRUUzMQA=","phoneNumber":"8618516505516","receiver":"8618516505516","sendTime":1786967940000,"sender":"8615736742277","status":2,"type":2}
```
要点：独立 CTA 送达（delivered）；命中独立自动模板 `template_id=1602428478079454`。  
**用例 5｜纯回复按钮 ×2** — ✅ 送达  
```
curl --location 'https://o-test-sino-channel-api-gateway.meetsocial.cn/sino_channel_facebook/ZRY8eB2neSyLx/v24.0/111681701943055/messages' \
--header 'Content-Type: application/json' \
--header 'APIKEY: sz0rk7PMKtHsMkI2M4LhgfahbdmkPoZ3zvEPykDegub1IqCM7wLXdMoVSIsa1pkP' \
--data '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "8618516505516",
    "type": "interactive",
    "category": "utility",
    "interactive": {
        "type": "button",
        "header": {
            "type": "text",
            "text": "Delivery"
        },
        "body": {
            "text": "Your package is out for delivery. Please confirm."
        },
        "footer": {
            "text": "Reply within 24 hours"
        },
        "action": {
            "buttons": [
                {
                    "type": "reply",
                    "reply": {
                        "id": "btn_received",
                        "title": "Received"
                    }
                },
                {
                    "type": "reply",
                    "reply": {
                        "id": "btn_unavailable",
                        "title": "Not Available"
                    }
                }
            ]
        }
    }
}'
```
**同步响应**：  
```
{"messaging_product":"whatsapp","contacts":[{"input":"8618516505516","wa_id":"8618516505516"}],"messages":[{"id":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEkU4M0JDRkQ5NDY0REMwRDBFNAA="}]}
```
**Meta 回调**（status=delivered；独立模板 `template_id=2275044686663590`）：  
```
{"accountId":"111681701943055","bsuid":"CN.1765719894460979","channel":"whatsapp","conversationBillable":true,"conversationId":"af5f6b5dd6d2670fc0f2231551386943","conversationPricingCategory":"utility","conversationPricingModel":"PMP","conversationPricingType":"regular","conversationType":6,"messageData":"{\"object\":\"whatsapp_business_account\",\"entry\":[{\"id\":\"111918461725990\",\"changes\":[{\"value\":{\"messaging_product\":\"whatsapp\",\"metadata\":{\"display_phone_number\":\"8615736742277\",\"phone_number_id\":\"111681701943055\"},\"contacts\":[{\"wa_id\":\"8618516505516\",\"user_id\":\"CN.1765719894460979\"}],\"statuses\":[{\"id\":\"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEkU4M0JDRkQ5NDY0REMwRDBFNAA=\",\"status\":\"delivered\",\"timestamp\":\"1786968017\",\"recipient_id\":\"8618516505516\",\"recipient_user_id\":\"CN.1765719894460979\",\"template_id\":\"2275044686663590\",\"conversation\":{\"id\":\"af5f6b5dd6d2670fc0f2231551386943\",\"origin\":{\"type\":\"utility\"}},\"pricing\":{\"billable\":true,\"pricing_model\":\"PMP\",\"category\":\"utility\",\"type\":\"regular\"}}]},\"field\":\"messages\"}]}]}","messageId":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEkU4M0JDRkQ5NDY0REMwRDBFNAA=","phoneNumber":"8618516505516","receiver":"8618516505516","sendTime":1786968017000,"sender":"8615736742277","status":2,"type":2}
```
要点：回复按钮送达；独立模板 `template_id=2275044686663590`。  
**用例 6｜混合 1CTA + 1回复（官方推荐）** — ✅ 送达  
```
curl --location 'https://o-test-sino-channel-api-gateway.meetsocial.cn/sino_channel_facebook/ZRY8eB2neSyLx/v24.0/111681701943055/messages' \
--header 'Content-Type: application/json' \
--header 'APIKEY: sz0rk7PMKtHsMkI2M4LhgfahbdmkPoZ3zvEPykDegub1IqCM7wLXdMoVSIsa1pkP' \
--data '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "8618516505516",
    "type": "interactive",
    "category": "utility",
    "interactive": {
        "type": "button",
        "header": {
            "type": "text",
            "text": "Delivery"
        },
        "body": {
            "text": "Your package is out for delivery."
        },
        "action": {
            "buttons": [
                {
                    "type": "cta_url",
                    "cta_url": {
                        "url": "https://example.com/track",
                        "display_text": "Track"
                    }
                },
                {
                    "type": "reply",
                    "reply": {
                        "id": "btn_received",
                        "title": "Received"
                    }
                }
            ]
        }
    }
}'
```
**同步响应**：  
```
{"messaging_product":"whatsapp","contacts":[{"input":"8618516505516","wa_id":"8618516505516"}],"messages":[{"id":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjhCOTcxNkNDMkRFRUU0QUY5MwA="}]}
```
**Meta 回调**（status=delivered；命中自动模板 `template_id=2157766311750751`）：  
```
{"accountId":"111681701943055","bsuid":"CN.1765719894460979","channel":"whatsapp","conversationBillable":true,"conversationId":"62762ccff338e2ec61e51db692677f2f","conversationPricingCategory":"utility","conversationPricingModel":"PMP","conversationPricingType":"regular","conversationType":6,"messageData":"{\"object\":\"whatsapp_business_account\",\"entry\":[{\"id\":\"111918461725990\",\"changes\":[{\"value\":{\"messaging_product\":\"whatsapp\",\"metadata\":{\"display_phone_number\":\"8615736742277\",\"phone_number_id\":\"111681701943055\"},\"contacts\":[{\"wa_id\":\"8618516505516\",\"user_id\":\"CN.1765719894460979\"}],\"statuses\":[{\"id\":\"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjhCOTcxNkNDMkRFRUU0QUY5MwA=\",\"status\":\"delivered\",\"timestamp\":\"1786968085\",\"recipient_id\":\"8618516505516\",\"recipient_user_id\":\"CN.1765719894460979\",\"template_id\":\"2157766311750751\",\"conversation\":{\"id\":\"62762ccff338e2ec61e51db692677f2f\",\"origin\":{\"type\":\"utility\"}},\"pricing\":{\"billable\":true,\"pricing_model\":\"PMP\",\"category\":\"utility\",\"type\":\"regular\"}}]},\"field\":\"messages\"}]}]}","messageId":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjhCOTcxNkNDMkRFRUU0QUY5MwA=","phoneNumber":"8618516505516","receiver":"8618516505516","sendTime":1786968085000,"sender":"8615736742277","status":2,"type":2}
```
要点：混合（1CTA+1回复）送达；`cta_url` 用**对象格式**`{"url","display_text"}` 有效；命中自动模板 `template_id=2157766311750751`（与用例 1/2 相同）。  
**用例 7｜混合 2CTA + 1回复（达 CTA 上限）** — ✅ 送达并已读  
```
curl --location 'https://o-test-sino-channel-api-gateway.meetsocial.cn/sino_channel_facebook/ZRY8eB2neSyLx/v24.0/111681701943055/messages' \
--header 'Content-Type: application/json' \
--header 'APIKEY: sz0rk7PMKtHsMkI2M4LhgfahbdmkPoZ3zvEPykDegub1IqCM7wLXdMoVSIsa1pkP' \
--data '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "8618516505516",
    "type": "interactive",
    "category": "utility",
    "interactive": {
        "type": "button",
        "header": {
            "type": "text",
            "text": "Delivery Options"
        },
        "body": {
            "text": "Your package is out for delivery. Choose an option."
        },
        "action": {
            "buttons": [
                {
                    "type": "cta_url",
                    "cta_url": {
                        "url": "https://example.com/track",
                        "display_text": "Track"
                    }
                },
                {
                    "type": "cta_url",
                    "cta_url": {
                        "url": "https://example.com/reorder",
                        "display_text": "Reorder"
                    }
                },
                {
                    "type": "reply",
                    "reply": {
                        "id": "btn_received",
                        "title": "Received"
                    }
                }
            ]
        }
    }
}'
```
**同步响应**：  
```
{"messaging_product":"whatsapp","contacts":[{"input":"8618516505516","wa_id":"8618516505516"}],"messages":[{"id":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjUyQUY0QUFDRTI5NjkyRDBFQQA="}]}
```
**Meta 回调**（status=read；独立模板 `template_id=1042160128611758`）：  
```
{"accountId":"111681701943055","bsuid":"CN.1765719894460979","channel":"whatsapp","conversationBillable":true,"conversationId":"c4a961c17f386e8c739cb3e648bcd8e3","conversationPricingCategory":"utility","conversationPricingModel":"PMP","conversationPricingType":"regular","conversationType":6,"messageData":"{\"object\":\"whatsapp_business_account\",\"entry\":[{\"id\":\"111918461725990\",\"changes\":[{\"value\":{\"messaging_product\":\"whatsapp\",\"metadata\":{\"display_phone_number\":\"8615736742277\",\"phone_number_id\":\"111681701943055\"},\"contacts\":[{\"wa_id\":\"8618516505516\",\"user_id\":\"CN.1765719894460979\"}],\"statuses\":[{\"id\":\"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjUyQUY0QUFDRTI5NjkyRDBFQQA=\",\"status\":\"read\",\"timestamp\":\"1786968231\",\"recipient_id\":\"8618516505516\",\"recipient_user_id\":\"CN.1765719894460979\",\"template_id\":\"1042160128611758\",\"conversation\":{\"id\":\"c4a961c17f386e8c739cb3e648bcd8e3\",\"origin\":{\"type\":\"utility\"}},\"pricing\":{\"billable\":true,\"pricing_model\":\"PMP\",\"category\":\"utility\",\"type\":\"regular\"}}]},\"field\":\"messages\"}]}]}","messageId":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjUyQUY0QUFDRTI5NjkyRDBFQQA=","phoneNumber":"8618516505516","receiver":"8618516505516","sendTime":1786968231000,"sender":"8615736742277","status":3,"type":2}
```
要点：2CTA+1回复（CTA 达上限、在前）送达已读；独立模板 `template_id=1042160128611758`。  
**用例 8｜独立 CTA + image 媒体头（合规版）** — ✅ 送达并已读（未被营销拦截）  
```
curl --location 'https://o-test-sino-channel-api-gateway.meetsocial.cn/sino_channel_facebook/ZRY8eB2neSyLx/v24.0/111681701943055/messages' \
--header 'Content-Type: application/json' \
--header 'APIKEY: sz0rk7PMKtHsMkI2M4LhgfahbdmkPoZ3zvEPykDegub1IqCM7wLXdMoVSIsa1pkP' \
--data '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "8618516505516",
    "type": "interactive",
    "category": "utility",
    "interactive": {
        "type": "cta_url",
        "header": {
            "type": "image",
            "image": {
                "link": "https://www.gstatic.com/webp/gallery/1.jpg"
            }
        },
        "body": {
            "text": "您的包裹已到达本地配送站，预计今日送达。点击下方按钮查看配送详情。"
        },
        "action": {
            "name": "cta_url",
            "parameters": {
                "display_text": "查看配送详情",
                "url": "https://example.com/track/12345"
            }
        }
    }
}'
```
**同步响应**：  
```
{"messaging_product":"whatsapp","contacts":[{"input":"8618516505516","wa_id":"8618516505516"}],"messages":[{"id":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEkVDODIzNkNDNTc2MzJEOUYxNAA="}]}
```
**Meta 回调**（status=read；命中自动模板 `template_id=2157766311750751`）：  
```
{"accountId":"111681701943055","bsuid":"CN.1765719894460979","channel":"whatsapp","conversationBillable":true,"conversationId":"c02a7ebcac474db6e82be5fdb71d7470","conversationPricingCategory":"utility","conversationPricingModel":"PMP","conversationPricingType":"regular","conversationType":6,"messageData":"{\"object\":\"whatsapp_business_account\",\"entry\":[{\"id\":\"111918461725990\",\"changes\":[{\"value\":{\"messaging_product\":\"whatsapp\",\"metadata\":{\"display_phone_number\":\"8615736742277\",\"phone_number_id\":\"111681701943055\"},\"contacts\":[{\"wa_id\":\"8618516505516\",\"user_id\":\"CN.1765719894460979\"}],\"statuses\":[{\"id\":\"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEkVDODIzNkNDNTc2MzJEOUYxNAA=\",\"status\":\"read\",\"timestamp\":\"1786968305\",\"recipient_id\":\"8618516505516\",\"recipient_user_id\":\"CN.1765719894460979\",\"template_id\":\"2157766311750751\",\"conversation\":{\"id\":\"c02a7ebcac474db6e82be5fdb71d7470\",\"origin\":{\"type\":\"utility\"}},\"pricing\":{\"billable\":true,\"pricing_model\":\"PMP\",\"category\":\"utility\",\"type\":\"regular\"}}]},\"field\":\"messages\"}]}]}","messageId":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEkVDODIzNkNDNTc2MzJEOUYxNAA=","phoneNumber":"8618516505516","receiver":"8618516505516","sendTime":1786968305000,"sender":"8615736742277","status":3,"type":2}
```
要点：**合规内容图片头实测通过（read）**，未触发营销拦截——对比此前 promo 图（lucky-shrub 横幅 + "See Dates" + clickID 链接）被 `correct_category=MARKETING` 拦截，**内容合规是过检关键**。  
**用例 9｜独立 CTA + video 媒体头** — ✅ 送达  
```
curl --location 'https://o-test-sino-channel-api-gateway.meetsocial.cn/sino_channel_facebook/ZRY8eB2neSyLx/v24.0/111681701943055/messages' \
--header 'Content-Type: application/json' \
--header 'APIKEY: sz0rk7PMKtHsMkI2M4LhgfahbdmkPoZ3zvEPykDegub1IqCM7wLXdMoVSIsa1pkP' \
--data '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "8618516505516",
    "type": "interactive",
    "category": "utility",
    "interactive": {
        "type": "cta_url",
        "header": {
            "type": "video",
            "video": {
                "link": "https://www.w3schools.com/html/mov_bbb.mp4"
            }
        },
        "body": {
            "text": "Watch our latest promo video:xxxx ."
        },
        "action": {
            "name": "cta_url",
            "parameters": {
                "display_text": "Watch Now",
                "url": "https://example.com/video"
            }
        }
    }
}'
```
**同步响应**：  
```
{"messaging_product":"whatsapp","contacts":[{"input":"8618516505516","wa_id":"8618516505516"}],"messages":[{"id":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjg5QkREQUE1MDE3QzkzNDcwMAA="}]}
```
**Meta 回调**（status=delivered；命中自动模板 `template_id=2157766311750751`）：  
```
{"accountId":"111681701943055","bsuid":"CN.1765719894460979","channel":"whatsapp","conversationBillable":true,"conversationId":"1dac0a3936030b89c6902f019d5700e0","conversationPricingCategory":"utility","conversationPricingModel":"PMP","conversationPricingType":"regular","conversationType":6,"messageData":"{\"object\":\"whatsapp_business_account\",\"entry\":[{\"id\":\"111918461725990\",\"changes\":[{\"value\":{\"messaging_product\":\"whatsapp\",\"metadata\":{\"display_phone_number\":\"8615736742277\",\"phone_number_id\":\"111681701943055\"},\"contacts\":[{\"wa_id\":\"8618516505516\",\"user_id\":\"CN.1765719894460979\"}],\"statuses\":[{\"id\":\"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjg5QkREQUE1MDE3QzkzNDcwMAA=\",\"status\":\"delivered\",\"timestamp\":\"1786968372\",\"recipient_id\":\"8618516505516\",\"recipient_user_id\":\"CN.1765719894460979\",\"template_id\":\"2157766311750751\",\"conversation\":{\"id\":\"1dac0a3936030b89c6902f019d5700e0\",\"origin\":{\"type\":\"utility\"}},\"pricing\":{\"billable\":true,\"pricing_model\":\"PMP\",\"category\":\"utility\",\"type\":\"regular\"}}]},\"field\":\"messages\"}]}]}","messageId":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjg5QkREQUE1MDE3QzkzNDcwMAA=","phoneNumber":"8618516505516","receiver":"8618516505516","sendTime":1786968372000,"sender":"8615736742277","status":2,"type":2}
```
要点：video 头送达（delivered）。正文含 `promo video` 字样本次**未触发拦截——营销检测存在不确定性/抽样，不能依赖，仍需保持内容合规**。  
**用例 10｜独立 CTA + document 媒体头** — ✅ 送达  
```
curl --location 'https://o-test-sino-channel-api-gateway.meetsocial.cn/sino_channel_facebook/ZRY8eB2neSyLx/v24.0/111681701943055/messages' \
--header 'Content-Type: application/json' \
--header 'APIKEY: sz0rk7PMKtHsMkI2M4LhgfahbdmkPoZ3zvEPykDegub1IqCM7wLXdMoVSIsa1pkP' \
--data '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "8618516505516",
    "type": "interactive",
    "category": "utility",
    "interactive": {
        "type": "cta_url",
        "header": {
            "type": "document",
            "document": {
                "link": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                "filename": "shipping-guide.pdf"
            }
        },
        "body": {
            "text": "See our shipping guide below."
        },
        "action": {
            "name": "cta_url",
            "parameters": {
                "display_text": "Open Guide",
                "url": "https://example.com/guide"
            }
        }
    }
}'
```
**同步响应**：  
```
{"messaging_product":"whatsapp","contacts":[{"input":"8618516505516","wa_id":"8618516505516"}],"messages":[{"id":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEkFBNTdERUEzREY0Q0ZCMjkzRgA="}]}
```
**Meta 回调**（status=delivered；命中自动模板 `template_id=2157766311750751`）：  
```
{"accountId":"111681701943055","bsuid":"CN.1765719894460979","channel":"whatsapp","conversationBillable":true,"conversationId":"60c3dad1311adf7f610a0955f54f6021","conversationPricingCategory":"utility","conversationPricingModel":"PMP","conversationPricingType":"regular","conversationType":6,"messageData":"{\"object\":\"whatsapp_business_account\",\"entry\":[{\"id\":\"111918461725990\",\"changes\":[{\"value\":{\"messaging_product\":\"whatsapp\",\"metadata\":{\"display_phone_number\":\"8615736742277\",\"phone_number_id\":\"111681701943055\"},\"contacts\":[{\"wa_id\":\"8618516505516\",\"user_id\":\"CN.1765719894460979\"}],\"statuses\":[{\"id\":\"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEkFBNTdERUEzREY0Q0ZCMjkzRgA=\",\"status\":\"delivered\",\"timestamp\":\"1786968431\",\"recipient_id\":\"8618516505516\",\"recipient_user_id\":\"CN.1765719894460979\",\"template_id\":\"2157766311750751\",\"conversation\":{\"id\":\"60c3dad1311adf7f610a0955f54f6021\",\"origin\":{\"type\":\"utility\"}},\"pricing\":{\"billable\":true,\"pricing_model\":\"PMP\",\"category\":\"utility\",\"type\":\"regular\"}}]},\"field\":\"messages\"}]}]}","messageId":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEkFBNTdERUEzREY0Q0ZCMjkzRgA=","phoneNumber":"8618516505516","receiver":"8618516505516","sendTime":1786968431000,"sender":"8615736742277","status":2,"type":2}
```
要点：document 头送达；`filename` 生效；命中自动模板 `template_id=2157766311750751`。  
**用例 11｜文本 + 商家命名模板（template_name）** — ⚠️ 同步受理，回调仅 `sent`  
```
curl --location 'https://o-test-sino-channel-api-gateway.meetsocial.cn/sino_channel_facebook/ZRY8eB2neSyLx/v24.0/111681701943055/messages' \
--header 'Content-Type: application/json' \
--header 'APIKEY: sz0rk7PMKtHsMkI2M4LhgfahbdmkPoZ3zvEPykDegub1IqCM7wLXdMoVSIsa1pkP' \
--data '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "8618516505516",
    "type": "text",
    "text": {
        "body": "Hi Jane, your order: #3333 has been shipped."
    },
    "category": "utility",
    "direct_send_config": {
        "template_name": "order_shipment_update"
    }
}'
```
**同步响应**：  
```
{"messaging_product":"whatsapp","contacts":[{"input":"8618516505516","wa_id":"8618516505516"}],"messages":[{"id":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjc4QzUyRTgyMUVDQTI1MjYzNQA="}]}
```
**Meta 回调**（status=sent；外层出现 `conversationExpirationTime`；named 模板 `template_id=3489704777856131`）：  
```
{"accountId":"111681701943055","bsuid":"CN.1765719894460979","channel":"whatsapp","conversationBillable":true,"conversationExpirationTime":1786968665000,"conversationId":"420b5bb9955b44c847ea17d96f200853","conversationPricingCategory":"utility","conversationPricingModel":"PMP","conversationPricingType":"regular","conversationType":6,"messageData":"{\"object\":\"whatsapp_business_account\",\"entry\":[{\"id\":\"111918461725990\",\"changes\":[{\"value\":{\"messaging_product\":\"whatsapp\",\"metadata\":{\"display_phone_number\":\"8615736742277\",\"phone_number_id\":\"111681701943055\"},\"contacts\":[{\"wa_id\":\"8618516505516\",\"user_id\":\"CN.1765719894460979\"}],\"statuses\":[{\"id\":\"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjc4QzUyRTgyMUVDQTI1MjYzNQA=\",\"status\":\"sent\",\"timestamp\":\"1786968665\",\"recipient_id\":\"8618516505516\",\"recipient_user_id\":\"CN.1765719894460979\",\"template_id\":\"3489704777856131\",\"conversation\":{\"id\":\"420b5bb9955b44c847ea17d96f200853\",\"expiration_timestamp\":\"1786968665\",\"origin\":{\"type\":\"utility\"}},\"pricing\":{\"billable\":true,\"pricing_model\":\"PMP\",\"category\":\"utility\",\"type\":\"regular\"}}]},\"field\":\"messages\"}]}]}","messageId":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjc4QzUyRTgyMUVDQTI1MjYzNQA=","phoneNumber":"8618516505516","receiver":"8618516505516","sendTime":1786968665000,"sender":"8615736742277","status":1,"type":2}
```
要点：named 模板命中**独立模板**`template_id=3489704777856131`；回调外层**出现 ****conversationExpirationTime**** 字段**；本次回调仅到 `sent`（未观察到 delivered/read，可能未达或回调时序）。§4.2 named 模板无兜底、异步错误（132021/131000）仍需专项测试。  
**用例 11 复测（2026-08-17）** — ✅ 确认 named 模板可正常投递  
重发同一 payload（wamid `wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjAzMzhGNTFGN0VDRTNBRDU4MAA=`），回调：  
```
{"accountId":"111681701943055","bsuid":"CN.1765719894460979","channel":"whatsapp","conversationBillable":false,"conversationId":"a32fb24d885d40e6ce2136c21de9a86c","conversationPricingCategory":"utility","conversationPricingModel":"PMP","conversationPricingType":"free_customer_service","conversationType":6,"messageData":"{\"object\":\"whatsapp_business_account\",\"entry\":[{\"id\":\"111918461725990\",\"changes\":[{\"value\":{\"messaging_product\":\"whatsapp\",\"metadata\":{\"display_phone_number\":\"8615736742277\",\"phone_number_id\":\"111681701943055\"},\"contacts\":[{\"wa_id\":\"8618516505516\",\"user_id\":\"CN.1765719894460979\"}],\"statuses\":[{\"id\":\"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjAzMzhGNTFGN0VDRTNBRDU4MAA=\",\"status\":\"read\",\"timestamp\":\"1786970639\",\"recipient_id\":\"8618516505516\",\"recipient_user_id\":\"CN.1765719894460979\",\"template_id\":\"3489704777856131\",\"conversation\":{\"id\":\"a32fb24d885d40e6ce2136c21de9a86c\",\"origin\":{\"type\":\"utility\"}},\"pricing\":{\"billable\":false,\"pricing_model\":\"PMP\",\"category\":\"utility\",\"type\":\"free_customer_service\"}}]},\"field\":\"messages\"}]}]}","messageId":"wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjAzMzhGNTFGN0VDRTNBRDU4MAA=","phoneNumber":"8618516505516","receiver":"8618516505516","sendTime":1786970639000,"sender":"8615736742277","status":3,"type":2}
```
要点：  
- named 模板 **read** 达成，**投递正常**——初测仅 `sent` 为时序/未达，非 named 能力问题。`GET message_templates?name=order_shipment_update` 确认其 `status=APPROVED`、正文被参数化为 `Hi {{variable}}, your order #12345 has been shipped.`。
- 计费字段变化：本次 `conversationBillable=false`、`conversationPricingType=free_customer_service`——用户此前点击过回复按钮（用例 5-7）已建立用户主动会话，本消息落在**免费客服会话**内；此前用例均为 `regular/billable=true`。**DS 消息也会落入 customer-initiated 免费会话（§7 会话计费逻辑在实测中体现）**。
**用例 12｜Call on WhatsApp（voice_call）** — ❌ 同步 `138000`，无回调  
```
curl --location 'https://o-test-sino-channel-api-gateway.meetsocial.cn/sino_channel_facebook/ZRY8eB2neSyLx/v24.0/111681701943055/messages' \
--header 'Content-Type: application/json' \
--header 'APIKEY: sz0rk7PMKtHsMkI2M4LhgfahbdmkPoZ3zvEPykDegub1IqCM7wLXdMoVSIsa1pkP' \
--data '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "8618516505516",
    "type": "interactive",
    "category": "utility",
    "interactive": {
        "type": "voice_call",
        "body": {
            "text": "Call our support team for help with your order."
        },
        "action": {
            "name": "voice_call",
            "parameters": {
                "display_text": "Call Support",
                "ttl_minutes": 1440
            }
        }
    }
}'
```
**同步响应**（失败）：  
```
{"error":{"message":"(#138000) Calling API not enabled","code":138000,"type":"OAuthException","error_data":{"messaging_product":"whatsapp","details":"WhatsApp Cloud API Calling not enabled for this phone number."},"fbtrace_id":"A7kNIgCbnDTYQcIS6uzwMfP"}}
```
**回调**：无（该商家号码未开通 calling，不产生回调）。
要点：与 §6.1.7 一致——`138000` 同步报错，无 webhook；需先启用 calling 并订阅 `calls` 后再测。  
**用例 13｜BSUID 收件人（recipient=CN.1765719894460979）** — ⚠️ 同步受理（wamid）但**无回调、手机未收到**  
```
curl --location 'https://o-test-sino-channel-api-gateway.meetsocial.cn/sino_channel_facebook/ZRY8eB2neSyLx/v24.0/111681701943055/messages' \
--header 'Content-Type: application/json' \
--header 'APIKEY: sz0rk7PMKtHsMkI2M4LhgfahbdmkPoZ3zvEPykDegub1IqCM7wLXdMoVSIsa1pkP' \
--data '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "recipient": "CN.1765719894460979",
    "type": "text",
    "text": {
        "body": "Hello via BSUID100101"
    },
    "category": "utility"
}'
```
**同步响应**（已受理，contacts 返回 `user_id` 而非 `wa_id`）：  
```
{"messaging_product":"whatsapp","contacts":[{"input":"CN.1765719894460979","user_id":"CN.1765719894460979"}],"messages":[{"id":"wamid.HBgTQ04uMTc2NTcxOTg5NDQ2MDk3ORUUABEYEkMzMjZFRTMxNEZEMUY1NzQzNQA="}]}
```
**回调**：无，手机未收到。
要点：  
- BSUID 路径**同步受理成功**，返回 wamid 前缀为 **HBgTQ04uMTc2NTcxOTg5NDQ2MDk3O...****（BSUID base64 编码）**，与手机号路径 `HBgNODYxODUxNjUwNTUxN...`（手机号 base64）不同，可用于识别收件模型。
- 但**无任何回调（sent/delivered/read 均无），手机未收到**——投递链中断，待进一步核实（可能需该 BSUID 用户曾与商家互动/存在 user_id 映射，或需在会话窗口内）。
- 对比：手机号路径（用例 1-11）均有 sent/delivered/read 回调。⚠️ **接入前必须专项确认 BSUID 可用性**（§2.1「企业范围用户编号可用性」）。
**用例 13 复测（2026-08-17）** — 定位为「**Meta 受理但不可投递**」  
重发新文案（`recipient=CN.1765719894460979`，body `Hello via BSUID-NEW-CONTENT-20260817-777`），同步受理（wamid `wamid.HBgTQ04uMTc2NTcxOTg5NDQ2MDk3ORUUABEYEjY4OEZDM0JEMjdGMEE1REZBOQA=`），随后 `GET message_templates?source=AUTO_GENERATED` 查询到**已自动生成独立 APPROVED 模板**：  
```
{"name":"auto_generated_e7dc64a7_2519_4ab9_b0d8_a0dfc89e6e74","parameter_format":"POSITIONAL","components":[{"type":"BODY","text":"Hello via BSUID-NEW-CONTENT-20260817-777"}],"language":"en_US","status":"APPROVED","category":"UTILITY","source":"AUTO_GENERATED","id":"1373634684183343"}
```
要点：  
- **BSUID 发送被 Meta Direct Send 引擎受理**（同步返回 BSUID 前缀 wamid + 自动生成 APPROVED 模板），问题**不在发送受理**，而在**投递/回调环节**：手机仍未收到、无任何 statuses 回调。
- 待办：与 Meta/网关侧确认 BSUID 投递条件（是否要求该 BSUID 用户曾**主动**发起会话 / 需 BWA 绑定 / 账户 BSUID 路由配置），或换真实业务 BSUID 样本再测。
**用例 14｜named 模板重名冲突（template_name=morning）** — ⚠️ 同步受理但**异步回调失败 ****132021**（2026-08-18 专项验证）  
```
curl --location 'https://o-test-sino-channel-api-gateway.meetsocial.cn/sino_channel_facebook/ZRY8eB2neSyLx/v24.0/111681701943055/messages' \
--header 'Content-Type: application/json' \
--header 'APIKEY: sz0rk7PMKtHsMkI2M4LhgfahbdmkPoZ3zvEPykDegub1IqCM7wLXdMoVSIsa1pkP' \
--data '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "8618516505516",
    "type": "text",
    "text": {
        "body": "Hi Jane, your order: 88888 has been shipped."
    },
    "category": "utility",
    "direct_send_config": {
        "template_name": "morning"
    }
}'
```
**同步响应**（受理成功，`contacts[0]` 仅含 `wa_id`，无 `user_id`）：  
```
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "8618516505516",
      "wa_id": "8618516505516"
    }
  ],
  "messages": [
    {
      "id": "wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjZENjYxOEY2NDE3MTVFQzAzRQA="
    }
  ]
}
```
**Meta 回调**（`status=failed`，`errors[].code=132021`）：  
```
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "111918461725990",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "8615736742277",
              "phone_number_id": "111681701943055"
            },
            "contacts": [
              {
                "wa_id": "8618516505516"
              }
            ],
            "statuses": [
              {
                "id": "wamid.HBgNODYxODUxNjUwNTUxNhUCABEYEjZENjYxOEY2NDE3MTVFQzAzRQA=",
                "status": "failed",
                "timestamp": "1787023240",
                "recipient_id": "8618516505516",
                "errors": [
                  {
                    "code": 132021,
                    "title": "A template with the same name already exists. Choose a different template name",
                    "message": "A template with the same name already exists. Choose a different template name",
                    "error_data": {
                      "details": "A template with the same name already exists. Choose a different template name"
                    }
                  }
                ]
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```
要点：  
- **132021 为异步错误**：`direct_send_config.template_name` 与 WABA 内**非 Direct Send 创建**的已有模板重名（此处 `morning` 为既有 MARKETING 模板）时，同步仍受理返回 wamid，随后 statuses webhook 报 `failed`。
- **字段结构同 ****statuses[].errors**：`code`/`title`/`message`/`error_data.details`，**无 ****href**；`title`/`message`/`details` 三处文案一致。
- ⚠️ 失败回调中 `contacts[0]`**可能不含 ****user_id**（本例仅 `wa_id`），与成功回调不同——解析时勿强依赖。
- 处理建议：换用未冲突的 `template_name`（WABA 内唯一，见 §4.2）；DS 侧命中该错误码时回退旧模板路径或改命名。
**用例 14 补｜131000 无法用参数构造** — 说明  
```
# 尝试 1：非法字符名
--data '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "8618516505516",
    "type": "text",
    "text": { "body": "test" },
    "category": "utility",
    "direct_send_config": { "template_name": "invalid-template-name-!!!" }
}'
# → 同步报错 100（模板名校验直接拒绝，不进入创建重试）
```
```
{
  "error": {
    "message": "template_name",
    "code": 100,
    "type": "OAuthException",
    "fbtrace_id": "AMEp4efF_3ZSc2rKliGZMjK"
  }
}
```
```
# 尝试 2：超长名（520 字符）
# → 同样同步报错 100 "template_name"
```
- `131000`（Generic infrastructure failure）是 **Meta 内部创建模板重试后仍失败的场景**，调用侧无法构造（参数类错误均被同步 100 拦截），故**结构仍为推断**（同 `statuses[].errors`）。
**§5.7 汇总结论**：  
- 手机号路径全部消息类型均能送达并产生回调（sent→delivered→read），除 authentication 因 24h re-engagement 异步失败（用例 3）。
- **131047 实测为异步错误**（statuses webhook failed），§6.4 需修正。
- 内容合规决定营销拦截：合规图片头通过（用例 8），promo 图被拦（此前 lucky-shrub 用例，其模板带 `correct_category=MARKETING`，id=`1046327357802490`）；"promo video" 文案未被拦（用例 9）说明检测存在不确定性，**接入必须按 §8 合规要求执行**。
- named 模板命中独立 template_id，回调出现 `conversationExpirationTime`（用例 11）；**复测确认 named 可正常投递（read）**，并观察到 DS 消息落入 customer-initiated 免费会话（`free_customer_service`，billable=false）。
- **fallback（onboarding）模板实测坐实**：`auto_generated_80634f52_02d1_4a75_b9a2_2f4b20678032`（id=`2157766311750751`）正文为泛化 `{{1}}`，多条不同内容消息（文本/TTL/image/video/document/混合1CTA）均命中它——对应 §4.1「回退 onboarding 模板」。
- BSUID（用例 13）：**Meta 受理（自动生成 APPROVED 模板）但不可投递**——无回调、手机未收到，待 Meta/网关侧专项确认。
## 6. 模板异常处理
异常分三类：同步错误（调用立即返回）、异步 Webhook（发送已受理后 Meta 通知）、发送失败回调。  
### 6.1 同步错误（POST /messages 直接返回）
**6.1.1 账户未开启 Direct Send（error_data 原文）**  
```
{
  "error": {
    "message": "(#100) Invalid parameter",
    "type": "OAuthException",
    "code": 100,
    "error_data": {
      "messaging_product": "whatsapp",
      "details": "Parameter Invalid: The 'category' value requires Direct Send, which isn't enabled for this account. Use an approved message template instead."
    },
    "fbtrace_id": "<FBTRACE_ID>"
  }
}
```
→ 对该 WABA 停止 DS，**回退旧模板路径**；标记账户未开通。  
**6.1.2 category 值非法**  
```
{
  "error": {
    "message": "(#100) Param category must be one of {AUTHENTICATION, SERVICE, UTILITY} - got \"marketing\".",
    "type": "OAuthException",
    "code": 100,
    "fbtrace_id": "<FBTRACE_ID>"
  }
}
```
→ 发送前做 category 白名单校验，营销类不走 DS。  
**6.1.3 TTL 越界**：`100`，"The time to live value must be lower than or equal to 43200"（utility）/ "higher than or equal to 30"。  
**6.1.4 访问被阻断（限制期，原文）**：  
```
{
  "error": {
    "message": "(#139200) Direct Send Utility access is blocked",
    "type": "OAuthException",
    "code": 139200,
    "error_data": {
      "messaging_product": "whatsapp",
      "details": "Direct Send Access is restricted: Direct send messaging capability is not available for this WABA right now due to misclassification based enforcements."
    },
    "fbtrace_id": "<FBTRACE_ID>"
  }
}
```
→ 停止该 WABA 的 DS，切旧模板；告警运营处理账户限制。  
**6.1.5 分类滥用限流 ****131064**：WABA 当前 24h 窗口被限流，后续 utility 被拒，下一窗口自动恢复。→ 退避重试 / 转死信队列，同时检查内容合规。  
**6.1.6 ****131047**：官方语义为 `service`/省略 category 时无已开服务窗口（旧模板路径语义）。⚠️ **实测（§5.7 用例 3 / 样本 2）****131047****（Re-engagement message）在 DS 下为异步错误**——同步受理返回 wamid，随后 statuses webhook 报 `failed`（距客户上次回复超 24h），**不能按同步错误处理**（详见 §6.4）。判权时仍以是否报 `100` 且文案含 "isn't enabled / requires Direct Send" 为准。  
**6.1.7 Call on WhatsApp 通话按钮（calling 前置未满足）**：  
- `138000`：Calling API not enabled（商家号码未启用 calling）。
- `138018`：technical prerequisites not met（未订阅 `calls` webhook）。
→ 发送前先校验 calling 能力开关与 `calls` 订阅，未满足则不使用通话按钮。
**6.1.8 收件人类型不支持 ****131062****（authentication 消息发到 BSUID）**：  
`131062`：`Business-scoped User ID (BSUID) recipients are not supported for this message`（官方 BSUID 文档「消息 → 错误代码」更新原文）。对应 §5.4 限制——**官方 Direct Send 文档「Send utility and authentication messages」明确：authentication 类别消息不能发 BSUID，必须用 ****to**** 传手机号**（原文 _"Authentication-category messages can't be sent to a business-scoped user ID — use __to__ with a phone number."_）。来源：Direct Send 文档 Note + BSUID 文档。  
- → 发送前校验收件人为手机号；仅持有 BSUID 时先换取手机号（contact info request）再发 authentication。
**6.1.9 DS 模板不能用于标准模板消息 ****132018****（2026-08-18 实测）**：  
- `132018`：`There's an issue with the parameters in your template`，`error_data.details`=`Direct send template can't be used for template message`——用**标准 Cloud API 模板发送**（`type=template` 按 name+language 引用）引用 DS 生成的模板（自动生成 / 商家命名）时**同步**报错。官方错误码表**未收录**该码。
- 已实测（自动模板 `auto_generated_ec191ec2...` 与商家命名模板 `order_shipment_update` 均复现）。同 §4.2「双向隔离」——DS 模板与普通模板互斥，模板消息统一走 DS `category` 机制。
### 6.2 异步 Webhook
**6.2.1 模板被暂停（字段 ****message_template_status_update****，原文）**  
```
{
  "entry": [
    {
      "id": "102290129340398",
      "time": 1751247548,
      "changes": [
        {
          "value": {
            "event": "PAUSED",
            "message_template_id": 1689556908129832,
            "message_template_name": "auto_generated_123456",
            "message_template_language": "en-US"
          },
          "field": "message_template_status_update"
        }
      ]
    }
  ],
  "object": "whatsapp_business_account"
}
```
→ 记录模板状态并**暂停发送匹配该模板的消息**；DS 模板**不可人工重启**，需改发送内容让 Meta 重新生成；告警运营。  
**6.2.2 类别滥用标记（****template_correct_category_detection****，原文）**  
```
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "<ID>",
      "time": 1751247548,
      "changes": [
        {
          "field": "template_correct_category_detection",
          "value": {
            "message_template_id": "<ID>",
            "message_template_name": "<NAME>",
            "message_template_language": "<LANG>",
            "category": "UTILITY",
            "correct_category": "MARKETING"
          }
        }
      ]
    }
  ]
}
```
→ 告警运营；可对标记模板申请复审（见 §8）；误判→复审，确为营销→改用 Marketing 通道。  
**6.2.3 账户限制升级（****account_update****，event=****ACCOUNT_RESTRICTION****）**  
```
{
  "value": {
    "event": "ACCOUNT_RESTRICTION",
    "violation_info": {
      "violation_type": "DIRECT_SEND_UTILITY_CATEGORY_ABUSE_WARN"
    }
  },
  "field": "account_update"
}
```
含限制时（带 restriction_info + expiration）：  
```
{
  "value": {
    "event": "ACCOUNT_RESTRICTION",
    "violation_info": {
      "violation_type": "DIRECT_SEND_UTILITY_CATEGORY_ABUSE_RATE_LIMIT"
    },
    "restriction_info": [
      {
        "restriction_type": "RESTRICTED_DIRECT_SEND_UTILITY_TEMPLATES",
        "expiration": "<expiration_timestamp>"
      }
    ]
  },
  "field": "account_update"
}
```
解除：`violation_type` = `DIRECT_SEND_UTILITY_CATEGORY_ABUSE_UNBAN` / `_RATE_LIMIT_RECOVERY`，无 `restriction_info`。
升级路径：WARN → RATE_LIMIT → STRIKE_1（7 天）→ STRIKE_2（30 天）→ OFFBOARD（永久）。
→ 记录 `violation_type` + `expiration`；限制期暂停该 WABA 的 DS（对应同步错 131064/139200）；到期自动恢复；降级告警。订阅 `account_update` / `template_correct_category_detection` / `message_template_status_update` 三个 field。  
### 6.3 状态失败回调（statuses webhook）
**命中已暂停模板**（原文）：  
```
{
  "statuses": [
    {
      "id": "wamid.xxxxx",
      "status": "failed",
      "errors": [
        {
          "code": 132015,
          "title": "Template is temporarily unavailable to use because it was paused due to low quality."
        }
      ]
    }
  ]
}
```
→ 落库失败 + 错误码，按暂停模板处理（§6.2.1）。  
### 6.4 口径说明
- **132021 / 131000（官方 api-reference 已确认）**：
  - `132021`：`A template with the same name already exists. The template_name in direct_send_config conflicts with an existing template not created by Direct Send. Choose a different name. Delivered asynchronously via the error webhook.`
  - `131000`：`Generic infrastructure failure ("Something went wrong"). Returned when a template_name template can't be created after retries — see Business-named templates.`
  **132021 / 131000 均为异步入 webhook**；官方未给这两个的示例报文。✅ **132021 已实测（2026-08-18，完整请求/同步响应/Meta 回调见 §5.7 用例 14）**：用 `template_name=morning`（WABA 内已存在的非 DS 模板）制造重名冲突——同步受理返回 wamid，随后 Meta statuses webhook 报 `failed`，字段结构同 `statuses[].errors`：`code=132021` + `title/message`="A template with the same name already exists. Choose a different template name" + `error_data.details`（无 `href`）。⚠️ 失败回调中 contacts 可能不含 `user_id`（§5.7 已见）。**131000 无法用参数构造**（非法/超长 `template_name` 均同步报 100，见用例 14 补），属 Meta 内部创建重试失败场景，结构推断同 `statuses[].errors`。  
  `131062`：`Business-scoped User ID (BSUID) recipients are not supported for this message`（官方 BSUID 文档「消息 → 错误代码」更新原文；authentication 类别消息发到 BSUID 时**同步**返回；同 §5.4「不可发 BSUID」——官方 Direct Send 文档 Note 明确 authentication 不能用 BSUID，须用 `to` 传手机号）。  
同步 vs 异步：**100 / 131064 / 139200 / 138000 / 138018 / 131062 同步**；**131047 实测为异步**（§5.7 用例 3/样本 2：同步受理返回 wamid，随后 statuses webhook 报 `failed` 且 `error_data.details`="超过 24 小时客户未回复"）；PAUSED / correct_category / account_update / 132015 走 webhook；132021/131000 异步错误回调。⚠️ 依据 §5.7 实测，131047 不应再按同步处理。  
## 7. 计费与会话
**计费规则（官方明确）**：  
- `category=utility` → 按 **utility 费率**（"按 utility 类别费率收费"）
- `category=authentication` → 按 **认证费率**
- 单价明细随 §5.6 statuses webhook 的 `pricing` 对象返回（per-message pricing）
**会话计费逻辑（官方 faq）**：发送 DS utility 消息与会话类同发送 utility 模板消息——  
- 若已存在一个**打开的 utility 会话** → 不新开会话，消息在该会话内送达
- 若无打开的 utility 会话 → **新开 utility 会话，从首条起持续 24 小时**
- **utility 会话与 service 会话相互独立、分别计费**
> ✅ **实测佐证（§5.7 用例 11 复测）**：用户点击过回复按钮建立用户主动会话后，DS 消息回调 `conversationPricingType=free_customer_service`、`conversationBillable=false`——即 **DS utility 消息也会落入 customer-initiated 免费会话**，计费随会话状态走。  
**对现有计费的含义**：  
- 计费按"会话"而非按模板审批状态定价；DS 生成模板也按模板消息会话计费
- 覆盖多种 DS 消息共享同一 24h utility 会话（同一客户 24h 内多次 DS 消息只算 1 个会话，若连续发送）
- 落库需兼容 statuses 中 `template_id` + `conversation` + `pricing`，用于对账
## 8. 合规与风控（重点注意事项）
- **模板暂停**：命中低质量暂停模板 → 错误 `132015`。通知：邮件 + `message_template_status_update`（PAUSED）。DS 模板**不能人工重启/编辑/删除**，只能改发送内容重新生成。
- **类别滥用监控**：Meta 监控 utility 中混入营销内容。通知：邮件 + `template_correct_category_detection`（`correct_category=MARKETING`）。可在 **Business Support Home → WhatsApp 账户 → Direct Send 模板更新** 申请复审：**60 天内、每模板仅一次、复审期间不中断发送**。
- **账户限制升级**：WARN → 流量限制（错 131064）→ 消息限制（7 天）→ 延长（30 天）→ **永久撤销**。通知：邮件 + `account_update`（`restriction_info`）。
- 促销/营销内容请走 **Marketing Messages** 或旧模板路径，勿用 DS。
## 9. 接入 meetbot 的步骤与改动范围
### 9.1 现状（基于代码）
- 发送链路：`dialogue-engine` → Kafka(`sendMessageTopic`) → `channel-send` → `WhatsAppChannelClient.sendMessage()`（`WhatsAppChannelClient.java:56`）→ channel-gateway → Meta。
- 模板消息：`WhatsAppTemplateChannelMessageHandler`（`channel-send/.../whatsapp/WhatsAppTemplateChannelMessageHandler.java:22`）把 `MessageDto` 转成 `WhatsAppTemplateDto`（含 `template{name,language,components}`）。
- OpenAPI：`OpenApiOpenMessageSendService.execute()` 按 template.name+language 反 `Category`（`core-client/.../template/enums/Category.java`：AUTHENTICATION/MARKETING/UTILITY/UNKNOWN）。
- 发送体基类 `WhatsAppMessageIsvDto`：已带 `messaging_product=whatsapp / recipient_type=individual / to / type`。
- 营销类：`marketing_messages` 后缀（`WhatsAppChannelClient.java:48`），与 DS 无关。
### 9.2 接入步骤（改动集中在 channel-send）
4. **消息模型**：为 WhatsApp 新增 Direct Send 消息类型（或给文本消息扩展 `category` 标记），DTO 增加 `category`、`ttl_seconds`、`direct_send_config.template_name`（可复用 `WhatsAppMessageIsvDto` 派生）。
5. **转换 Handler**：新增/扩展 Direct Send handler（仿 `WhatsAppTemplateChannelMessageHandler.channelMessageCovert`），组 `type:"text"` + `category`；按钮/媒体类复用现有 interactive 结构。
6. **发送**：`WhatsAppChannelClient` 无需改动（channel-gateway 原样透传 JSON 到 Meta）；注意 URL 走 `messages`**不** 走 `marketing_messages`。
7. **回调**：statuses 解析兼容新增 `template_id`；错误码映射表增加 §6 新码（131064/139200/132015/131047/132021/131000/138000/138018/131062）。
8. **资质/配置**：按 WABA 维护"已开启 DS"开关（Apollo/DB），未开启账户回退旧模板路径，避免填增错误 100。
9. **审计/对账**（可选）：定时 `GET message_templates?source=AUTO_GENERATED` 关联，仅展示不编辑。
### 9.3 影响面
- 既有「模板创建 + 审核 + 选择 + 创建内容」流程**继续保留**（营销/无资质账户仍走原路）；DS 是**并行新路径**，非替换。
- 营销类（Marketing Messages / `marketing_messages`）不受影响。
- 改动面：channel-send（DTO + Handler + 错误映射）为主；dialogue-engine 透传；core-service 可能需存 `template_id`。
## 10. 风险与建议
- **Beta 稳定性**：功能分阶段、页面更新频繁，上线需逐 WABA 验证资质。
- **合规风险高**：误分类 → 限流 → 账户撤销，建议先行低流量账户灰度。
- utility 文本无 URL 预览；按钮注意 CTA/回复数量与排序约束。
- **自动模板不可控**（名字/语言由 Meta 生成）：如需要做归因，务必用 `direct_send_config.template_name` 固定归属。
- **自动模板会被清理**（24h 未用删除 / 长期不用归档）：审计报表要构时同步。
- 建议接入前确认豁免：named 模板是否受清理策略影响；132021 / 131000 的回调字段结构。
## 11. 信息来源与置信度
<table>
<tr>
<td>章节  </td>
<td>来源  </td>
<td>置信度  </td>
</tr>
<tr>
<td>§1-§2、§4.1、§6.1  </td>
<td>`direct-send` 主页面  </td>
<td>官方原文；**fallback 模板实测坐实（id=2157766311750751，回退时用户仍收到原文），见 §5.7**  </td>
</tr>
<tr>
<td>§3.1-3.4  </td>
<td>`support-features-and-limits`  </td>
<td>官方原文  </td>
</tr>
<tr>
<td>§3.5  </td>
<td>`configure-message-ttl`  </td>
<td>官方原文  </td>
</tr>
<tr>
<td>§5.1  </td>
<td>`send-utility-and-authentication-messages`  </td>
<td>官方原文；**纯文本 / +TTL / +商家命名模板 均已实测通过（§5.7 用例 1/2/11）**  </td>
</tr>
<tr>
<td>§5.2  </td>
<td>`supported-message-types` + `media-headers`（结构）+ 标准 interactive 格式整理  </td>
<td>结构官方；**独立 CTA / 纯回复 / 混合（1CTA+1回复、2CTA+1回复）/ 媒体头 image·video·document 均已实测通过（§5.7 用例 4-10）**；完整 JSON 仍建议以 `send-sample-payloads` 为准  </td>
</tr>
<tr>
<td>§5.4  </td>
<td>`direct-send` 主页面（authentication）  </td>
<td>官方原文；**category=authentication**** 纯文本同步受理但异步 ****131047**** 失败（§5.7 用例 3）**；复制代码按钮细节待开通后核实  </td>
</tr>
<tr>
<td>§5.5  </td>
<td>`view-generated-templates`  </td>
<td>官方原文  </td>
</tr>
<tr>
<td>§5.6  </td>
<td>`supported-message-types`  </td>
<td>官方原文；**真实回调结构（含 ****recipient_user_id****、named 模板 ****conversationExpirationTime****）见 §5.7**  </td>
</tr>
<tr>
<td>§5.7  </td>
<td>实测（2026-08-17，WABA 111681701943055）  </td>
<td>**13 组完整 API/响应/回调实测 + 复测**：手机号路径全部类型可送达；named 模板复测 read、落 customer-initiated 免费会话；**131047 异步**；合规内容图片头过检；**BSUID 被 Meta 受理（生成 APPROVED 模板）但不可投递（无回调，待确认）；DS 模板不可用于标准模板消息已实测（132018，2026-08-18）**  </td>
</tr>
<tr>
<td>§5.3  </td>
<td>`supported-message-types` + `supported-features-and-limits`  </td>
<td>官方原文；**138000****（未启用 calling）已在本环境实测复现**  </td>
</tr>
<tr>
<td>§6.2.1  </td>
<td>`integrity-and-content-guidelines`  </td>
<td>官方原文  </td>
</tr>
<tr>
<td>§6.2.2  </td>
<td>`integrity-and-content-guidelines` / `faq`  </td>
<td>官方原文  </td>
</tr>
<tr>
<td>§6.2.3、§6.4  </td>
<td>`integrity-and-content-guidelines`  </td>
<td>官方原文；**132021 已实测（字段结构同 ****statuses[].errors****，2026-08-18，重名 ****morning**** 触发）；131000 无法参数构造（同步 100），结构仍为推断**；**131062 描述经官方 BSUID 文档确认（原文 ****Business-scoped User ID (BSUID) recipients are not supported for this message****），authentication 不可发 BSUID 见官方 Direct Send 文档 Note**；**131047 异步口径为实测（§5.7 用例 3）；132018（DS 模板不可用于标准模板消息）为实测新增（2026-08-18），官方错误码表未收录**  </td>
</tr>
<tr>
<td>§7  </td>
<td>`send-utility-and-authentication-messages` + `faq`  </td>
<td>官方原文；**DS 消息落入 customer-initiated 免费会话有实测佐证（§5.7 用例 11 复测）**  </td>
</tr>
<tr>
<td>§8  </td>
<td>`integrity-and-content-guidelines`  </td>
<td>官方原文  </td>
</tr>
<tr>
<td>§9  </td>
<td>meetbot 代码 + `02-architecture.md`  </td>
<td>源码 + 架构；**channel-gateway 透传为架构推断（非本项目代码）**  </td>
</tr>
<tr>
<td>§10  </td>
<td>综合  </td>
<td>建议性内容  </td>
</tr>
</table>
> 未能抓取原文的两页：`get-started`、`send-sample-payloads`（渲染为空 / 404）。接入前请以官方这两页为准。  
## 12. 参考链接
Base: `https://developers.facebook.com/documentation/business-messaging/whatsapp/direct-send/`  
- 概述：`direct-send`
- 入门：`get-started`
- 支持的功能和限制：`supported-features-and-limits`
- 发送消息：`send-utility-and-authentication-messages`
- 支持的消息类型：`supported-message-types`
- 媒体头：`media-headers`
- 商家命名模板：`business-named-templates`
- 查看生成的模板：`view-generated-templates`
- 配置消息 TTL：`configure-message-ttl`
- Direct Send API 参考（错误码）：`api-reference`
- 完整性与内容准则：`integrity-and-content-guidelines`
- FAQ：`faq`
- 发送示例 Payload：`send-sample-payloads`
