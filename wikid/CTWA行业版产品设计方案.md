# CTWA行业版产品设计方案
---
## 业务背景：
**当前痛点**：目前 CTWA（Click-to-WhatsApp）广告缺乏后链路转化数据（如：加入购物车、完成支付等），导致 Meta 广告算法只能停留在“点击/会话率（CTR/Conversational Rate）”层面的浅层优化，无法直接优化投资回报率（ROI）。  
**本期目标：**  
1. **数据闭环**：聚合后链路的转化事件（Shopify&API上报），基于 `ctwa_clid`（WhatsApp 广告点击标识）进行链路匹配，利用 Meta Conversion API (CAPI) 将转化事件回传至 Meta，激活广告侧对深层转化的优化能力。
2. **全链路看板**：拉取 CTWA 广告展现、点击及花费等广告侧数据。拉取广告及转化数据，提供全链路效果看板。在 MB 系统中落地 “全链路效果看板”，实现从“广告消耗 $\rightarrow$ 消息会话 $\rightarrow$ 后链路转化（加购/支付）” 的全链路数据可视化。

## 功能说明：
### 自定义事件回传
#### 1.1 整体流程
```
mermaid
graph TD
subgraph "会话阶段"
direction LR
U1[点击广告进入WhatsApp] --> U2[发送首条消息/互动]
M1[收到webhook(携带来源信息)] --> M2[记录广告信息&ctwa_clid&用户信息]
U2 -->|触发| M1
end
subgraph "转化阶段"
    direction LR
    U3[发生转化事件]
    M3[shopify埋点] & M4[自定义API回调] --> M5[转化归因] --> M6[回传Meta]
    U3 -.->|追踪| M3
    U3 -.->|追踪| M4
end

subgraph "统计阶段"
    direction TB
    M7[定时调API获取广告数据] --> M8[看板展示] --> M9[导出CTWA分析数据]
end

style U1 fill:#e1f5fe,stroke:#0288d1
style U2 fill:#e1f5fe,stroke:#0288d1
style U3 fill:#e1f5fe,stroke:#0288d1
style M1 fill:#eceff1,stroke:#455a64
style M2 fill:#eceff1,stroke:#455a64
style M3 fill:#eceff1,stroke:#455a64
style M4 fill:#eceff1,stroke:#455a64
style M5 fill:#eceff1,stroke:#455a64
style M6 fill:#eceff1,stroke:#455a64
style M7 fill:#eceff1,stroke:#455a64
style M8 fill:#eceff1,stroke:#455a64
style M9 fill:#eceff1,stroke:#455a64
```
#### 1.2 记录广告&用户信息
- **广告**：ctwa_clid、ctwa_click_time
- **用户**：wa_id、user_id

#### 1.3 转化事件范围
**1.3.1 转化事件**  
<table>
<tr>
<td>事件  </td>
<td>Shopify转化 (Pixel事件)  </td>
<td>自定义API转化  </td>
<td>去重逻辑  </td>
</tr>
<tr>
<td>加购  <br/></td>
<td>product_added_to_cart  </td>
<td>API 上报 PRODUCT_ADDED_TO_CART 事件  </td>
<td>以 用户标识 + 时间 去重。  <br/>同一用户在 10 分钟内多次加购/加购多个商品，均记为一次。  </td>
</tr>
<tr>
<td>开始结算  </td>
<td>checkout_started  </td>
<td>API 上报 CHECKOUT_STARTED 事件  </td>
<td>以 checkout 的 token 记一次事件。  </td>
</tr>
<tr>
<td>支付完成  </td>
<td>checkout_completed  </td>
<td>API 上报 ORDER_PAID 事件  </td>
<td>以 Order ID 记一次事件。  </td>
</tr>
<tr>
<td>注册  </td>
<td>/  </td>
<td>（新增）API 上报 REGISTER 事件  </td>
<td>以 Customer ID 记一次事件。  </td>
</tr>
<tr>
<td>留资  </td>
<td>/  </td>
<td>（新增）API 上报 LEAD_GENERATION 事件  </td>
<td>每次上报均记为一次留资。  </td>
</tr>
</table>

**1.3.2 用户标识**  
- **Shopify**：与当前自动化营销逻辑保持一致，
- **自定义API**：与当前逻辑保持一致。
  - 注册事件API，字段参考：
<table>
<tr>
<td>字段  </td>
<td>字段名  </td>
<td>数据类型  </td>
<td>是否必填  </td>
<td>说明  </td>
</tr>
<tr>
<td>事件ID  </td>
<td>eventId  </td>
<td>string  </td>
<td>必填  </td>
<td>事件唯一标识ID。  </td>
</tr>
<tr>
<td>事件类型  </td>
<td>eventType  </td>
<td>string  </td>
<td>必填  </td>
<td>固定为 “REGISTRATION_COMPLETED” 注册完成。  </td>
</tr>
<tr>
<td>事件发生时间  </td>
<td>eventTime  </td>
<td>int64  </td>
<td>必填  </td>
<td>注册完成时间，单位：毫秒。  </td>
</tr>
<tr>
<td>用户ID  </td>
<td>userId  </td>
<td>string  </td>
<td>必填  </td>
<td>注册完成后，生成的用户ID。  </td>
</tr>
<tr>
<td>用户手机号  </td>
<td>mobile  </td>
<td>string  </td>
<td>非必填  </td>
<td>用户注册手机号。手机号和邮箱 二选一必填。  </td>
</tr>
<tr>
<td>用户电子邮箱  </td>
<td>userEmail  </td>
<td>string  </td>
<td>非必填  </td>
<td>用户注册邮箱。手机号和邮箱 二选一必填。  </td>
</tr>
<tr>
<td>用户名字  </td>
<td>userFirstName  </td>
<td>string  </td>
<td>非必填  </td>
<td>用户注册时填写的名字。  </td>
</tr>
<tr>
<td>用户姓氏  </td>
<td>userLastName  </td>
<td>string  </td>
<td>非必填  </td>
<td>用户注册时填写的姓氏。  </td>
</tr>
</table>
  - 留资事件API，字段参考：
<table>
<tr>
<td>字段  </td>
<td>字段名  </td>
<td>数据类型  </td>
<td>是否必填  </td>
<td>说明  </td>
</tr>
<tr>
<td>事件ID  </td>
<td>eventId  </td>
<td>string  </td>
<td>必填  </td>
<td>事件唯一标识ID。  </td>
</tr>
<tr>
<td>事件类型  </td>
<td>eventType  </td>
<td>string  </td>
<td>必填  </td>
<td>固定为 “LEAD_SUBMITTED” 线索提交。  </td>
</tr>
<tr>
<td>事件发生时间  </td>
<td>eventTime  </td>
<td>int64  </td>
<td>必填  </td>
<td>留资时间，单位：毫秒。  </td>
</tr>
<tr>
<td>留资ID  </td>
<td>leadId  </td>
<td>string  </td>
<td>必填  </td>
<td>表单提交后生成的留资记录ID。  </td>
</tr>
<tr>
<td>表单标识  </td>
<td>formId  </td>
<td>string  </td>
<td>必填  </td>
<td>区分不同的留资表单。  </td>
</tr>
<tr>
<td>用户ID  </td>
<td>userId  </td>
<td>string  </td>
<td>非必填  </td>
<td>若留资用户已注册，回传用户ID。  </td>
</tr>
<tr>
<td>用户手机号  </td>
<td>mobile  </td>
<td>string  </td>
<td>非必填  </td>
<td>留资手机号。手机号和邮箱 二选一必填。  </td>
</tr>
<tr>
<td>用户电子邮箱  </td>
<td>userEmail  </td>
<td>string  </td>
<td>非必填  </td>
<td>留资邮箱。手机号和邮箱 二选一必填。  </td>
</tr>
<tr>
<td>用户名字  </td>
<td>userFirstName  </td>
<td>string  </td>
<td>非必填  </td>
<td></td>
</tr>
<tr>
<td>用户姓氏  </td>
<td>userLastName  </td>
<td>string  </td>
<td>非必填  </td>
<td></td>
</tr>
</table>

#### 1.4 归因逻辑
- **归因期**：72小时，从转化事件发生起，往前推72小时。
- **归因方式**：末次归因，归因到该用户在72小时内最近一次的CTWA广告点击。
- **广告范围**：该用户发生转化的店铺，绑定的WhatsApp发送的CTWA广告。
- **开关配置**：仅开启CTWA回传后，才进行归因回传。
- **多次归因**：多个转化可以归到同一个CLID。

#### 1.5 回传Meta
**1.5.1 页面配置：**  
![](APJRbHIB0osLAKxD1mpcE7j4nPb)
按照以下顺序展示各事件说明：  
<table>
<tr>
<td>顺序  </td>
<td>事件  </td>
<td>文案  </td>
<td>看板指标  </td>
<td>下载明细  </td>
<td>备注  </td>
</tr>
<tr>
<td>1  </td>
<td>Track Purchases  <br/></td>
<td>已有  </td>
<td>近1年成功回传次数、近1年成交金额  <br/></td>
<td>新增 事件类型、matched_ctwa_clid、事件发生时间、回传时间  <br/>公共类：事件类型、广告 headline、source_id、source_url、matched_ctwa_clid、店铺 WhatsApp 号码、客户手机号、事件发生时间、回传状态、回传时间。  <br/>事件专属：订单编号、订单金额、币种(店铺)。  </td>
<td></td>
</tr>
<tr>
<td>2  </td>
<td>Track InitiateCheckout  <br/></td>
<td>客户通过CTWA互动后，在72小时内进入结算流程。  </td>
<td>近1年成功回传次数、近1年潜在结算金额  </td>
<td>公共类：同上  <br/>事件专属：结算金额、币种(店铺)。  </td>
<td></td>
</tr>
<tr>
<td>3  </td>
<td>Track AddToCart  <br/></td>
<td>客户通过CTWA互动后，在72小时内将商品加入购物车。  </td>
<td>近1年成功回传次数、加购金额  </td>
<td>公共类：同上  <br/>事件专属：加购金额、币种(店铺)。  </td>
<td></td>
</tr>
<tr>
<td>4  </td>
<td>Track CompleteRegistration  </td>
<td>客户通过CTWA互动后，在72小时内成功完成注册，留下客户线索。  </td>
<td>近1年成功回传次数、近1年累计注册  </td>
<td>公共类：同上  <br/>事件专属：用户ID、注册手机号、注册邮箱。  </td>
<td></td>
</tr>
<tr>
<td>6  </td>
<td>Track Lead  <br/></td>
<td>客户通过CTWA互动后，在72小时内成功留下客户线索。  </td>
<td>近1年成功回传次数、近1年累计留资  <br/></td>
<td>公共类：同上  <br/>事件专属：留资手机号、留资邮箱。  </td>
<td></td>
</tr>
</table>
以下逻辑不变：  

- **回传字段说明：**
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>赋值-加购  </td>
<td>赋值-开始结账  </td>
<td>赋值-支付完成  </td>
<td>赋值-注册  </td>
<td>赋值-提交表单  </td>
</tr>
<tr>
<td>event_name  </td>
<td>string  </td>
<td> `"AddToCart"`  </td>
<td> `"InitiateCheckout"`  </td>
<td> `"Purchase"`  </td>
<td>`"CompleteRegistration"`  </td>
<td> `"Lead"`  </td>
</tr>
<tr>
<td>event_time  </td>
<td>int  </td>
<td>归因确认时间，时间戳（秒）  </td>
<td>归因确认时间，时间戳（秒）  </td>
<td>归因确认时间，时间戳（秒）  </td>
<td>归因确认时间，时间戳（秒）  </td>
<td>归因确认时间，时间戳（秒）  </td>
</tr>
<tr>
<td>action_source  </td>
<td>string  </td>
<td>固定值 `"business_messaging"`  </td>
<td>固定值 `"business_messaging"`  </td>
<td>固定值 `"business_messaging"`  </td>
<td>固定值 `"business_messaging"`  </td>
<td>固定值 `"business_messaging"`  </td>
</tr>
<tr>
<td>messaging_channel  </td>
<td>string  </td>
<td>固定值 `"whatsapp"`  </td>
<td>固定值 `"whatsapp"`  </td>
<td>固定值 `"whatsapp"`  </td>
<td>固定值 `"whatsapp"`  </td>
<td>固定值 `"whatsapp"`  </td>
</tr>
<tr>
<td>user_data.ctwa_clid  </td>
<td>string  </td>
<td>CTWA点击ID  </td>
<td>CTWA点击ID  </td>
<td>CTWA点击ID  </td>
<td>CTWA点击ID  </td>
<td>CTWA点击ID  </td>
</tr>
<tr>
<td>user_data.whatsapp_business_account_id  </td>
<td>string  </td>
<td>WABA ID  <br/>归因的CTWA回调的WABA id  </td>
<td>WABA ID  <br/>归因的CTWA回调的WABA id  </td>
<td>WABA ID  <br/>归因的CTWA回调的WABA id  </td>
<td>WABA ID  <br/>归因的CTWA回调的WABA id  </td>
<td>WABA ID  <br/>归因的CTWA回调的WABA id  </td>
</tr>
<tr>
<td>custom_data.value  </td>
<td>float  </td>
<td>/  </td>
<td>进入结账流程后的待支付金额  </td>
<td>订单金额GMV（不含退款金额）  </td>
<td>/  </td>
<td>/  </td>
</tr>
<tr>
<td>custom_data.currency  </td>
<td>string  </td>
<td>/  </td>
<td>商店币种的货币代码  </td>
<td>商店币种的货币代码，如 CNY/USD  </td>
<td>/  </td>
<td>/  </td>
</tr>
</table>
#### 1.6 自定义API
当前的OpenAPI中，需要开放CTWA转化API，支持B端客户自己回传转化事件给Meta。支持的范围包含本次5个事件。  
### 广告效果统计
#### **2.1 报告数据**
- 广告数据：通过大数据-广告成效数据融合API获取，T+1更新。筛选出 Meta CTWA 广告。
- CTWA会话数据：MB根据会话记录统计，T+1更新。
维度说明如下：  
<table>
<tr>
<td>维度  </td>
<td>示例  </td>
<td>涉及接口字段参考  </td>
<td>备注  </td>
</tr>
<tr>
<td>日期  </td>
<td>2026-06-30  </td>
<td>startTime、endTime、timeType  </td>
<td>数据日期  </td>
</tr>
<tr>
<td>渠道  </td>
<td>1：Facebook  </td>
<td>channelId、channelName  </td>
<td></td>
</tr>
<tr>
<td>广告账号  </td>
<td>1067798457914513  </td>
<td>accountId、accountName  </td>
<td></td>
</tr>
<tr>
<td>广告系列  </td>
<td>1202054321098701  </td>
<td>campaignId、campaignName  </td>
<td></td>
</tr>
<tr>
<td>广告组  </td>
<td>1202054321098702  </td>
<td>adgroupId、adgroupName  </td>
<td></td>
</tr>
<tr>
<td>广告  </td>
<td>1202054321098703  </td>
<td>adId、adName  </td>
<td></td>
</tr>
</table>
指标说明如下：  
<table>
<tr>
<td>指标  </td>
<td>指标说明  </td>
<td>接口字段参考  </td>
<td>页面展示示例  </td>
<td>格式说明  </td>
</tr>
<tr>
<td>广告花费  </td>
<td>广告消耗金额，单位：美元  </td>
<td>spendUsd  </td>
<td>$1,250.50  </td>
<td>货币格式，前缀$，千分位分隔，保留两位小数  </td>
</tr>
<tr>
<td>曝光量  </td>
<td>广告曝光次数  </td>
<td>impressions  </td>
<td>105,420  </td>
<td>整数格式，千分位分隔  </td>
</tr>
<tr>
<td>点击量  </td>
<td>广告点击次数  </td>
<td>clicks  </td>
<td>2,108  </td>
<td>整数格式，千分位分隔  </td>
</tr>
<tr>
<td>点击率  </td>
<td>CTR，计算：点击量 ÷ 曝光量  </td>
<td>ctr  </td>
<td>2.00%  </td>
<td>百分比格式，后缀%，保留两位小数  </td>
</tr>
<tr>
<td>单次点击成本  </td>
<td>CPC，计算：广告花费 ÷ 点击量  </td>
<td>cpc  </td>
<td>$0.59  </td>
<td>货币格式，前缀$，保留两位小数  </td>
</tr>
<tr>
<td>CTWA会话次数  </td>
<td>通过CTWA进入的会话次数  </td>
<td>/  </td>
<td>450  </td>
<td>整数格式，千分位分隔  </td>
</tr>
<tr>
<td>CTWA会话人数  </td>
<td>通过CTWA进入的会话人数  </td>
<td>/  </td>
<td>380  </td>
<td>整数格式，千分位分隔  </td>
</tr>
<tr>
<td>购买次数  </td>
<td>广告带来的购买次数  </td>
<td>purchases  </td>
<td>85  </td>
<td>整数格式，千分位分隔  </td>
</tr>
<tr>
<td>单次购买成本  </td>
<td>CPP，计算：广告花费 ÷ 购买次数  </td>
<td>cpaPurchase  </td>
<td>$14.71  </td>
<td>货币格式，前缀$，保留两位小数  </td>
</tr>
<tr>
<td>转化金额  </td>
<td>GMV，广告带来的购买金额  </td>
<td>purchasesValue  </td>
<td>$3,740.00  </td>
<td>货币格式，前缀$，千分位分隔，保留两位小数  </td>
</tr>
<tr>
<td>投资回报率  </td>
<td>ROAS，计算：转化金额 ÷ 广告花费  </td>
<td>roas  </td>
<td>2.99  </td>
<td>纯数字，保留两位小数  </td>
</tr>
<tr>
<td>加购次数  </td>
<td>广告带来的加购次数  </td>
<td>addsToCart  </td>
<td>310  </td>
<td>整数格式，千分位分隔  </td>
</tr>
<tr>
<td>结账次数  </td>
<td>发起结账的次数  </td>
<td>checkoutsInitiated  </td>
<td>155  </td>
<td>整数格式，千分位分隔  </td>
</tr>
<tr>
<td>注册次数  </td>
<td>完成注册的次数  </td>
<td>registrationsCompleted  </td>
<td>45  </td>
<td>整数格式，千分位分隔  </td>
</tr>
<tr>
<td>留资次数  </td>
<td>留下潜客信息次数  </td>
<td>leads  </td>
<td>12  </td>
<td>整数格式，千分位分隔  </td>
</tr>
</table>

#### 2.2 页面功能
<table>
<tr>
<td>页面  </td>
<td>说明  </td>
</tr>
<tr>
<td>![](Q6WQb7Tf1olTAwxEMDGc761xnxc)<br/></td>
<td>- 新增入口：CTWA 分析<br/>- 账号授权状态：分为三种状态 未授权、授权异常、已授权，UI与 “转化回传” 一致。</td>
</tr>
<tr>
<td>![](NblbbjNjFoRHyGx35KRctro9nNb)<br/></td>
<td>- 日期筛选：可选日期范围：昨日 至 最近1年。时间间隔最多 90天。默认最近30天。<br/>- 指标块：鼠标hover 指标info icon，显示当前指标说明文案。<br/>- 转化趋势：支持选择最多2个指标，左右Y轴分别对应两个指标，X轴单位为天。<br/>- 广告明细表：  - tab：支持切换 广告账号、广告系列、广告组、广告。主维度同时显示 名称与ID。  - 搜索：支持模糊搜索当前列表的主维度名称与ID，例如 在广告组列表中，支持模糊搜索 广告组名称和ID。  - 筛选：无论在哪个列表中，都可筛选 广告账号、广告系列、广告组，下拉显示名称，支持多选。  - 排序：默认按照广告花费倒序，支持按照各指标排序。  - 翻页：默认展示10条数据，支持翻页查看更多数据。<br/>- 下载明细：  - 文件名：CTWA广告效果数据_yyyymmdd_yyyymmdd，如 CTWA广告效果数据_20260101_20260710.xlsx。  - 文件内容：分为三个sheet：汇总、转化趋势、广告明细，详见文档</td>
</tr>
<tr>
<td>![](KTpzbxef6oLugPxE5oHcMuIcnLf)<br/></td>
<td>- 查看回传明细（抽屉）：  - 信息：展示主维度名称和ID，例如 从广告组列表中进入，展示该广告组名称和ID。  - 指标：展示该维度的 广告花费、曝光量、点击量、会话次数、成功回传。  - 回传明细：展示回传的CTWA时间、CTWA点击ID、客户手机号、事件类型、事件发生事件、转化金额、回传状态。  - 事件筛选：默认全部，可筛选指定事件，查看回传明细。</td>
</tr>
<tr>
<td>![](I69RbBxr1oLnpGxfBAicDUNdn8d)<br/></td>
<td>授权后，还无数据，UI参考图  </td>
</tr>
<tr>
<td>![](DPwZbZVcUo1kD4xHPM0cAE82nqd)<br/></td>
<td>未授权，UI参考图  </td>
</tr>
</table>
页面详情：  
### 参考文档：
#### 3.1 官方概览介绍
- 转化效果回传概览介绍：https://www.facebookblueprint.com/student/path/219644/activity/214975#/page/695d6a7d8a50ee7527fca985
- 转化API官方说明：https://www.facebook.com/business/help/433493041367251?id=818859032317965
- WhatsApp广告说明：https://developers.facebook.com/documentation/ads-commerce/marketing-api/ad-creative/messaging-ads/click-to-whatsapp
#### 3.2 集成技术说明
- 管理工具设置转化API集成：https://www.facebookblueprint.com/student/path/219644/activity/214974#/page/695d69ff8a50ee7527fa0e25
- 标准事件清单：https://developers.facebook.com/docs/meta-pixel/reference#standard-events
- 测试方案：https://developers.facebook.com/docs/marketing-api/conversions-api/using-the-api#testEvents
- 回传后，Meta后台的追踪：https://developers.facebook.com/docs/meta-pixel/implementation/conversion-tracking#standard-events
- MB技术调研：[新增CTWA广告来源-技术方案](https://q6y68vu0j8.feishu.cn/wiki/DtPfw0DfviD2Y2kwLPrcYWAsnjg) → [CTWA转化效果回传调研](https://q6y68vu0j8.feishu.cn/wiki/V185ws0H2ig6U2kd9XKcKoOXn2g)
- CTWA转化回传prd：[#6921991799#CTWA转化回传](https://q6y68vu0j8.feishu.cn/docx/JzhHdcUHpojSTCxonu7c8RA3n5c)
- 自动化营销策略prd：[自动化营销策略-营销](https://q6y68vu0j8.feishu.cn/docx/J6hLdfoEQoq1O6xIWbscQYklnyf)
- 大数据广告成效数据融合接口说明：[跨渠道-广告成效数据融合接口](https://q6y68vu0j8.feishu.cn/docx/NbuodYXiaot3AexXcwlcrKBgnwf)
#### 3.3 竞品对客方案参考
- https://support.wati.io/en/articles/11865448-ctwa-conversion-tracking-best-practices-and-example-templates
- https://help.nxlink.ai/docs/ru-he-shi-yong-CTWA-Click-to-WhatsApp?search=1#ad911eccc14bde6dbfc2a7f166d45773
- https://helpdocs.ycloud.com/help-center/ctwa-click-to-whatsapp-ad/facebook-ads/conversion-api-capi
