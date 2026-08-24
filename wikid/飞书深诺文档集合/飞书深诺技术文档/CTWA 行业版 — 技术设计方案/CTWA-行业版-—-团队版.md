# CTWA 行业版 — 团队版
---
## 一、需求
**项目**：  
**PRD**：[#7049754081#CTWA行业版产品设计方案](https://q6y68vu0j8.feishu.cn/wiki/FILRwjyaaio0nxkXzC6c1EjDnHc)  
**详细设计（主文档）**：https://my.feishu.cn/wiki/RzelwLZF6i80AtkUtngcuZD9nXc  
### 功能模块划分
<table>
<tr>
<td>功能模块  </td>
<td>具体功能  </td>
<td>备注  </td>
</tr>
<tr>
<td>我方归因回传  </td>
<td>Shopify 非购买（加购/结算）+ 现网购买归因扩展；回传 AddToCart / InitiateCheckout / CompleteRegistration / Lead / Purchase  </td>
<td>扩展现有归因 + CAPI；不新建 Topic  </td>
</tr>
<tr>
<td>开放 CTWA 转化 API  </td>
<td>B 端自带 `ctwa_clid` 回传 Meta；receive YAML 代理转发（**不落库**、**不扩展 Handler**）  </td>
<td>**仅转发**；不算 72h 归因；进看板回传明细  </td>
</tr>
<tr>
<td>CTWA 会话采集  </td>
<td>Meta Webhook → receive → engine → data-analysis → core，落 `ctwa_conversation_record`  </td>
<td>挂 `handleCtwaSessionOpened`  </td>
</tr>
<tr>
<td>全链路效果看板  </td>
<td>大数据 ES 广告指标 + 会话统计 + 转化趋势 + 明细 + 导出 + 回传明细  </td>
<td>新增后端接口  </td>
</tr>
<tr>
<td>广告授权状态联动  </td>
<td>未授权 / 异常 / 已授权  </td>
<td>复用现有 FacebookAuthAdInfo  </td>
</tr>
</table>
### 服务分支
<table>
<tr>
<td>服务  </td>
<td>分支  </td>
<td>版本  </td>
<td>本期角色  </td>
</tr>
<tr>
<td>meetbot-commons  </td>
<td>feature/ctwa_industry_0717  </td>
<td>4.7.17.0-SNAPSHOT  </td>
<td>枚举扩展（需发布，被 core 依赖）  </td>
</tr>
<tr>
<td>meetbot-core-service  </td>
<td>feature/ctwa_industry_0717  </td>
<td>4.7.17.0-SNAPSHOT  </td>
<td>会话落库、归因、CAPI、看板；DTO/Feign/ReferralSaveDto  </td>
</tr>
<tr>
<td>meetbot-data-analysis  </td>
<td>feature/ctwa_industry_0717  </td>
<td>4.7.17.0-SNAPSHOT  </td>
<td>Shopify 非购买；referralSave 透传  </td>
</tr>
<tr>
<td>meetbot-channel-receive  </td>
<td>feature/ctwa_industry_0717  </td>
<td>-  </td>
<td>**proxy YAML 开放转化转发**  </td>
</tr>
<tr>
<td>meetbot-jservice-api  </td>
<td>feature/ctwa_industry_0717  </td>
<td>-  </td>
<td>BFF 看板接口 / Excel 导出框架  </td>
</tr>
</table>
## 二、整体方案
### 按功能点的变更汇总
<table>
<tr>
<td>功能点  </td>
<td>变更内容  </td>
<td>涉及服务  </td>
<td>新增  </td>
<td>修改  </td>
<td>已有  </td>
</tr>
<tr>
<td>新增转化事件类型  </td>
<td>`CtwaConversionAttributionType` 新增 4 类；`ExternalBizEventTypeEnum` 按主设计扩展（若仍走自建事件归因）  </td>
<td>commons + core-client  </td>
<td>-  </td>
<td>枚举  </td>
<td>-  </td>
</tr>
<tr>
<td>Shopify 非购买接入  </td>
<td>同 topic 新 consumer group，过滤加购/结算后归因  </td>
<td>data-analysis + core  </td>
<td>consumer group  </td>
<td>Listener  </td>
<td>已有 topic  </td>
</tr>
<tr>
<td>开放 CTWA 转化 API  </td>
<td>YAML `ctwa-conversion` 规则纯转发 Meta（**不落库**、**不扩展 Handler**）  </td>
<td>**channel-receive**  </td>
<td>Handler before 校验  </td>
<td>proxy 引擎  </td>
<td>proxy 引擎  </td>
</tr>
<tr>
<td>CTWA 会话采集  </td>
<td>`ReferralSaveDto` 增传 + `handleCtwaSessionOpened` 幂等写会话表；dim 未就绪时 `date_in_account_tz` 空串  </td>
<td>data-analysis + core  </td>
<td>表/Service  </td>
<td>referralSave / handleCtwa  </td>
<td>receive/engine 入口不改  </td>
</tr>
<tr>
<td>时区日补偿定时任务  </td>
<td>周期扫描 `ctwa_conversation_record` 中 `date_in_account_tz=''` 且 `ad_id<>''` 的行；按 max id 游标分页；查 `mb_ads_fb_ad_dim` 取 account/timezone 回填；找不到跳过等下轮；详见「数据存储变更」补偿任务小节  </td>
<td>meetbot-core-service  </td>
<td>定时任务  </td>
<td>-  </td>
<td>-  </td>
</tr>
<tr>
<td>归因逻辑扩展  </td>
<td>非购买复用 72h AD_CTWA + 回传开关  </td>
<td>core  </td>
<td>-  </td>
<td>CtwaConversionServiceImpl  </td>
<td>ES 查询  </td>
</tr>
<tr>
<td>CAPI 回传映射  </td>
<td>resolveEventName + buildCustomData 扩 4 类  </td>
<td>core  </td>
<td>-  </td>
<td>映射  </td>
<td>定时任务  </td>
</tr>
<tr>
<td>看板后端接口  </td>
<td>指标块/趋势/明细/导出/回传明细；**分类统计用 ****/conversion/postback/eventStatistic****（替换原在 statistic 上扩展的方案）**  </td>
<td>core + jservice  </td>
<td>eventStatistic  </td>
<td>statistic 契约不变  </td>
<td>大数据 ES  </td>
</tr>
<tr>
<td>归因去重  </td>
<td>支付仅 type+sourceId；加购 userId:productId+时间窗；结算 token；注册 userId；留资 eventId  </td>
<td>core  </td>
<td>-  </td>
<td>CtwaConversionServiceImpl  </td>
<td>Apollo 窗长  </td>
</tr>
<tr>
<td>归因渠道字段  </td>
<td>`channel`：shopify / custom；仅落库；SQL 见归因表变更脚本  </td>
<td>core  </td>
<td>列+清洗  </td>
<td>buildAttribution  </td>
<td>-  </td>
</tr>
<tr>
<td>Facebook 授权联动  </td>
<td>复用授权态  </td>
<td>admin-api  </td>
<td>-  </td>
<td>-  </td>
<td>已有  </td>
</tr>
</table>
### 核心数据流
## 三、详细方案
以下按**功能模块**组织；每节包含功能说明、涉及服务、数据存储、接口与配置要点。  
### 3.1 CTWA 会话采集
**功能说明**：Meta Webhook → channel-receive → dialogue-engine → data-analysis → core，在 `handleCtwaSessionOpened` 幂等写入 `ctwa_conversation_record`（挂点经 `referralSave`）。Webhook 入口为 **channel-receive**`/channel/whatsapp/callback`，非 jservice。  
**涉及服务**  
<table>
<tr>
<td>服务  </td>
<td>改动  </td>
</tr>
<tr>
<td>meetbot-channel-receive / dialogue-engine  </td>
<td></td>
</tr>
<tr>
<td>meetbot-data-analysis  </td>
<td>`referralSave` 增传会话上下文  </td>
</tr>
<tr>
<td>meetbot-core-service  </td>
<td>`handleCtwaSessionOpened` 幂等写表；`CtwaConversationTzBackfillTask` 时区补偿  </td>
</tr>
</table>
**关键决策**  
<table>
<tr>
<td>决策点  </td>
<td>选择  </td>
</tr>
<tr>
<td>采集挂点  </td>
<td>`handleCtwaSessionOpened`（经 data-analysis referralSave）  </td>
</tr>
<tr>
<td>dim 未就绪  </td>
<td>允许空 `date_in_account_tz`，定时任务按 max id 分页补偿  </td>
</tr>
<tr>
<td>用户字段  </td>
<td>`user_id`（对齐 message.from），不用 customer_phone  </td>
</tr>
</table>
#### 3.1.1 数据存储
<table>
<tr>
<td>存储  </td>
<td>变更  </td>
</tr>
<tr>
<td>MySQL `ctwa_conversation_record`  </td>
<td>**新增 DDL**  </td>
</tr>
<tr>
<td>ES `mb_ads_fb_ad_dim`  </td>
<td>已有；写入/补偿时查 account + timezone  </td>
</tr>
</table>
**ctwa_conversation_record**** DDL（与主设计对齐）**：  
```
CREATE TABLE `ctwa_conversation_record` (
  `id`                 bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `store_id`           bigint unsigned NOT NULL COMMENT '店铺ID',
  `entry_id`           varchar(128)    NOT NULL DEFAULT '' COMMENT '入站消息ID，幂等',
  `wa_referral_id`     bigint unsigned NOT NULL DEFAULT '0' COMMENT '关联 wa_referral_info.id',
  `ad_id`              varchar(64)     NOT NULL DEFAULT '' COMMENT 'CTWA广告ID，来自referral.sourceId',
  `ctwa_clid`          varchar(255)    NOT NULL DEFAULT '' COMMENT 'CTWA点击ID，来自referral.ctwaClid',
  `ad_account_id`      varchar(64)     NOT NULL DEFAULT '' COMMENT 'Facebook广告账号ID，写入时回填',
  `ad_group_id`      varchar(64)     NOT NULL DEFAULT '' COMMENT 'Facebook广告组ID，写入时回填',
  `ad_campaign_id`      varchar(64)     NOT NULL DEFAULT '' COMMENT 'Facebook广告系列ID，写入时回填',
  `event_time`         datetime        NOT NULL COMMENT '消息时间UTC',
  `date_in_account_tz` varchar(10)      NOT NULL DEFAULT '' COMMENT '广告账号时区日期yyyy-MM-dd',
  `user_id`            varchar(64)     NOT NULL DEFAULT '' COMMENT '渠道用户ID，来自message.from/sender',
  `conversation_id`    varchar(128)    NOT NULL DEFAULT '' COMMENT '会话ID',
  `create_time`        datetime        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time`        datetime        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted`         tinyint(1)      NOT NULL DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_entry_id` (`entry_id`),
  KEY `idx_store_account_date` (`store_id`, `ad_account_id`, `date_in_account_tz`),
  KEY `idx_wa_referral_id` (`wa_referral_id`),
  KEY `idx_ad_id` (`ad_id`),
  KEY `idx_ctwa_clid` (`ctwa_clid`),
  KEY `idx_conversation_id` (`conversation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CTWA会话统计记录（看板用）';
```
**ReferralSaveDto 新增字段透传**：`userId`（渠道用户 ID，来自 message.from/sender）、`conversationId`（会话 ID）、`eventTime`（消息时间 UTC，由 data-analysis 从 Meta Webhook 的 messages[].timestamp 解析）。上述字段由 data-analysis 构造 `ReferralSaveDto` 时透传，core `WaReferralCommandService.saveCtwaConversationRecord()` 写入对应列。  
会话人数统计：`COUNT DISTINCT user_id`（原 `customer_phone` 已更名）。  
与主设计 §4.2 一致。会话落库时 dim 未就绪则 `ad_account_id` / `date_in_account_tz` 先空串，本任务分页补偿。  
##### 调度入口
<table>
<tr>
<td>层  </td>
<td>路径  </td>
</tr>
<tr>
<td>`GET /channel/whatsapp/inner/backfillCtwaConvTz`  </td>
<td></td>
</tr>
</table>
##### 扫描与分页
- 条件：`is_deleted=0` AND `date_in_account_tz=''` AND `ad_id<>''`
- max id 游标：`id > lastMaxId ORDER BY id LIMIT pageSize`，单次最多 `max-pages-per-run` 页
- ES `mb_ads_fb_ad_dim` 按 `ad_id` 取账号与时区 → 写 `ad_account_id`、`date_in_account_tz`（`yyyyMMdd`）
##### Apollo
`ctwa.conversation.tz-backfill.enabled` / `page-size` / `max-pages-per-run` / `cron`（见 `CtwaConversionConfig`）。  
写入 `ctwa_conversation_record` 时，若 `mb_ads_fb_ad_dim` 尚未同步到该 `ad_id`，允许先落会话行：`ad_account_id` / `date_in_account_tz` 置空（`''`），由定时任务补偿，避免丢会话统计。看板按 `store_id + ad_account_id + date_in_account_tz` 聚合，空值行暂不进日维度统计，回填后自动可见。  
**任务职责（meetbot-core-service）**  
1. 分页扫描 `ctwa_conversation_record` 中待回填行
2. 用 `ad_id` 查 ES `mb_ads_fb_ad_dim`，取 `account_id` + `account_timezone`
3. 找到则计算 `date_in_account_tz`（`event_time` 按账号时区格式化为 `yyyyMMdd`），并回写 `ad_account_id`、`date_in_account_tz`
4. 找不到则跳过，等下次调度再扫（不删行、不报失败阻断）
**扫描条件**  
<table>
<tr>
<td>条件  </td>
<td>说明  </td>
</tr>
<tr>
<td>`is_deleted = 0`  </td>
<td>未删除  </td>
</tr>
<tr>
<td>`date_in_account_tz = ''`  </td>
<td>时区日未写上  </td>
</tr>
<tr>
<td>`ad_id <> ''`  </td>
<td>有广告 ID 才可查 dim  </td>
</tr>
</table>
**分页方式：按 max id 游标**  
<table>
<tr>
<td>要点  </td>
<td>说明  </td>
</tr>
<tr>
<td>每批 SQL  </td>
<td>`WHERE id > :lastMaxId AND ... ORDER BY id ASC LIMIT :pageSize`  </td>
</tr>
<tr>
<td>游标推进  </td>
<td>本批处理完后 `lastMaxId = 本批最大 id`；本批 0 行则本轮结束  </td>
</tr>
<tr>
<td>单次上限  </td>
<td>连续翻页直到无数据或达到 `max-pages-per-run`（防拖垮）  </td>
</tr>
<tr>
<td>禁止  </td>
<td>**不要用**`OFFSET` 深分页  </td>
</tr>
</table>
**伪代码**  
```
lastMaxId = 0
pages = 0
while pages < maxPagesPerRun:
  rows = select * from ctwa_conversation_record
         where id > lastMaxId
           and is_deleted = 0
           and date_in_account_tz = ''
           and ad_id <> ''
         order by id asc
         limit pageSize
  if rows empty: break
  for row in rows:
    dim = es.get mb_ads_fb_ad_dim by ad_id
    if dim == null: continue
    update row
      set ad_account_id = dim.account_id,
          date_in_account_tz = format(event_time, dim.account_timezone, yyyyMMdd),
          update_time = now()
      where id = row.id and date_in_account_tz = ''   -- 乐观条件，避免覆盖并发写入
  lastMaxId = max(row.id for row in rows)
  pages++
```
**改动点**  
<table>
<tr>
<td>步骤  </td>
<td>服务  </td>
<td>类 / 方法  </td>
<td>改动  </td>
</tr>
<tr>
<td>1  </td>
<td>meetbot-core-service  </td>
<td>新建定时任务（如 `CtwaConversationTzBackfillTask`）  </td>
<td>按 max id 分页扫描并回填  </td>
</tr>
<tr>
<td>2  </td>
<td>meetbot-core-service  </td>
<td>`ICtwaConversationRecordService`  </td>
<td>`pageNeedTzBackfill(lastMaxId, limit)` / `updateTzIfEmpty(id, accountId, dateInAccountTz)`  </td>
</tr>
<tr>
<td>3  </td>
<td>meetbot-core-service  </td>
<td>ES 查询封装（复用看板 dim 查询）  </td>
<td>按 `ad_id` term 查 `mb_ads_fb_ad_dim`  </td>
</tr>
</table>
**配置（Apollo）**  
<table>
<tr>
<td>配置项  </td>
<td>建议默认  </td>
<td>说明  </td>
</tr>
<tr>
<td>`ctwa.conversation.tz-backfill.enabled`  </td>
<td>`true`  </td>
<td>开关  </td>
</tr>
<tr>
<td>`ctwa.conversation.tz-backfill.cron`  </td>
<td>`0 0 6,13,19 * * ?`（每天 6:00 / 13:00 / 19:00）  </td>
<td>调度周期  </td>
</tr>
<tr>
<td>`ctwa.conversation.tz-backfill.page-size`  </td>
<td>`200`  </td>
<td>每页条数  </td>
</tr>
<tr>
<td>`ctwa.conversation.tz-backfill.max-pages-per-run`  </td>
<td>`50`  </td>
<td>单次调度最多翻页数  </td>
</tr>
</table>
### 3.2 我方归因回传（Shopify 非购买 + CAPI）
#### CtwaConversionAttributionType（存库 `ctwa_conversion_attribution.type`）
接口入参/出参里的 **eventType**** / ****eventTypes[]** 均指本枚举的 **code****（整型）**。  
<table>
<tr>
<td>code  </td>
<td>枚举常量  </td>
<td>desc  </td>
<td>Meta `event_name`  </td>
<td>明细展示名 `getDetailDisplayName`  </td>
<td>Shopify 行为事件  </td>
<td>自建 OpenAPI `eventType`（字符串=枚举名）  </td>
<td>自建 `event_type` dbCode  </td>
</tr>
<tr>
<td>**1**  </td>
<td>PURCHASE  </td>
<td>purchase  </td>
<td>Purchase  </td>
<td>Purchases  </td>
<td>orders/paid（订阅落库）  </td>
<td>ORDER_PAID  </td>
<td>**3**  </td>
</tr>
<tr>
<td>**2**  </td>
<td>EXTERNAL_BIZ_PURCHASE  </td>
<td>external_biz_purchase  </td>
<td>Purchase  </td>
<td>Purchases  </td>
<td>-  </td>
<td>ORDER_PAID  </td>
<td>**3**  </td>
</tr>
<tr>
<td>**3**  </td>
<td>ADD_TO_CART  </td>
<td>add_to_cart  </td>
<td>AddToCart  </td>
<td>AddToCart  </td>
<td>`product_added_to_cart`  </td>
<td>PRODUCT_ADDED_TO_CART  </td>
<td>**2**  </td>
</tr>
<tr>
<td>**4**  </td>
<td>CHECKOUT  </td>
<td>checkout  </td>
<td>InitiateCheckout  </td>
<td>InitiateCheckout  </td>
<td>`checkout_started`  </td>
<td>CHECKOUT_STARTED  </td>
<td>**1**  </td>
</tr>
<tr>
<td>**5**  </td>
<td>REGISTER  </td>
<td>register  </td>
<td>CompleteRegistration  </td>
<td>CompleteRegistration  </td>
<td>-  </td>
<td>REGISTRATION_COMPLETED  </td>
<td>**9**  </td>
</tr>
<tr>
<td>**6**  </td>
<td>LEAD  </td>
<td>lead  </td>
<td>Lead  </td>
<td>Lead  </td>
<td>-  </td>
<td>LEAD_SUBMITTED  </td>
<td>**10**  </td>
</tr>
</table>
说明：  
- 看板/回传明细筛选 `eventTypes` 传 **1/3/4/5/6**（一般不单独筛 2；导出 Purchase 时 **1+2** 一并查出）。
- `exportTypeCodesByMetaEventName("Purchase")` → `[1, 2]`；其余 Meta 名 → 单 code。
- **勿与**`ExternalBizEventTypeEnum.dbCode` 混用：自建「加购」dbCode=**2**，归因 type 加购 code=**3**。
#### ExternalBizEventTypeEnum（自建事件 `external_biz_event.event_type` / OpenAPI 字符串）
<table>
<tr>
<td>dbCode  </td>
<td>枚举名（= OpenAPI `eventType` 字符串）  </td>
<td>说明  </td>
<td>归因后 type code  </td>
</tr>
<tr>
<td>1  </td>
<td>CHECKOUT_STARTED  </td>
<td>开始结算  </td>
<td>→ **4** CHECKOUT  </td>
</tr>
<tr>
<td>2  </td>
<td>PRODUCT_ADDED_TO_CART  </td>
<td>商品加购  </td>
<td>→ **3** ADD_TO_CART  </td>
</tr>
<tr>
<td>3  </td>
<td>ORDER_PAID  </td>
<td>订单支付完成  </td>
<td>→ **2** EXTERNAL_BIZ_PURCHASE  </td>
</tr>
<tr>
<td>4  </td>
<td>ORDER_FULFILLED  </td>
<td>订单履约（本期无关）  </td>
<td>-  </td>
</tr>
<tr>
<td>5  </td>
<td>ORDERS_CANCELLED  </td>
<td>取消（本期无关）  </td>
<td>-  </td>
</tr>
<tr>
<td>6  </td>
<td>REFUNDS_CREATE  </td>
<td>退款（本期无关）  </td>
<td>-  </td>
</tr>
<tr>
<td>7  </td>
<td>PRODUCT_DELIVERED_SUCCESS  </td>
<td>配送成功（本期无关）  </td>
<td>-  </td>
</tr>
<tr>
<td>8  </td>
<td>DELIVERED  </td>
<td>配送满 X 天（本期无关）  </td>
<td>-  </td>
</tr>
<tr>
<td>**9**  </td>
<td>REGISTRATION_COMPLETED  </td>
<td>注册完成（本期新增）  </td>
<td>→ **5** REGISTER  </td>
</tr>
<tr>
<td>**10**  </td>
<td>LEAD_SUBMITTED  </td>
<td>留资提交（本期新增）  </td>
<td>→ **6** LEAD  </td>
</tr>
</table>
commons 与 core-client 两份枚举 **name + dbCode 必须一致**；新增项以 commons 续号 9/10 为准。  
#### CtwaConversionPostbackStatus（存库 `postback_status`）
<table>
<tr>
<td>code  </td>
<td>枚举  </td>
<td>含义  </td>
</tr>
<tr>
<td>**0**  </td>
<td>PENDING  </td>
<td>未执行 / 待回传  </td>
</tr>
<tr>
<td>**1**  </td>
<td>SUCCESS  </td>
<td>回传成功  </td>
</tr>
<tr>
<td>**2**  </td>
<td>FAILED_RETRY  </td>
<td>失败，待重试  </td>
</tr>
<tr>
<td>**3**  </td>
<td>FAILED_EXCEEDED  </td>
<td>失败，已超过重试次数  </td>
</tr>
</table>
配置页汇总 / 导出只统计 **need_postback=true**** 且 status=1（SUCCESS）** 等现网条件。  
#### 去重规则（与实现一致）
<table>
<tr>
<td>type code  </td>
<td>枚举  </td>
<td>幂等（type + sourceId）  </td>
<td>业务去重（order_no）  </td>
</tr>
<tr>
<td>1 / 2  </td>
<td>购买  </td>
<td>subscribeInfo.id / external_biz_event.id  </td>
<td>存 orderId，**不做** Order ID 业务去重  </td>
</tr>
<tr>
<td>3  </td>
<td>ADD_TO_CART  </td>
<td>行为日志 / 事件 id  </td>
<td>`userId:productId`（分隔符 `:`）+ 时间窗  </td>
</tr>
<tr>
<td>4  </td>
<td>CHECKOUT  </td>
<td>同上  </td>
<td>checkout token；type+store+orderNo 一次  </td>
</tr>
<tr>
<td>5  </td>
<td>REGISTER  </td>
<td>同上  </td>
<td>Customer/userId；type+store+orderNo 一次  </td>
</tr>
<tr>
<td>6  </td>
<td>LEAD  </td>
<td>同上  </td>
<td>上游 eventId；type+store+orderNo 一次  </td>
</tr>
</table>
#### 其他魔法值 / 固定字面量（必须按此实现）
<table>
<tr>
<td>类别  </td>
<td>值  </td>
<td>说明  </td>
</tr>
<tr>
<td>归因回看窗  </td>
<td>`ctwa.order.time.fetch.interval` 默认 **259200** 秒（= **72h**）  </td>
<td>`findLatestAdCtwa` 时间窗  </td>
</tr>
<tr>
<td>加购去重窗  </td>
<td>`ctwa.conversion.add.to.cart.dedup.window.minutes` 默认 **10**  </td>
<td>分钟  </td>
</tr>
<tr>
<td>加购去重分隔符  </td>
<td>`:`  </td>
<td>`CtwaConversionConstants.ADD_TO_CART_DEDUP_KEY_SEPARATOR`  </td>
</tr>
<tr>
<td>CAPI 最大重试  </td>
<td>`ctwa.conversion.postback.max.retry.times` 默认 **3**  </td>
<td>超过 → status=3  </td>
</tr>
<tr>
<td>统计 Redis TTL  </td>
<td>**36** 小时  </td>
<td>key 前缀 `ctwa:conversion:store:summary:`  </td>
</tr>
<tr>
<td>看板日期跨度  </td>
<td>最大 **90** 天；默认 **30** 天（end=昨天，start=end-29）  </td>
<td>`CtwaDashboardConstants`  </td>
</tr>
<tr>
<td>日期格式  </td>
<td>入参常用 `yyyyMMdd`；ES/会话日 `yyyy-MM-dd`  </td>
<td></td>
</tr>
<tr>
<td>`dimensionType` / 筛选 `level`  </td>
<td>**ACCOUNT**** / ****CAMPAIGN**** / ****ADGROUP**** / ****AD**  </td>
<td>默认 AD；筛选无 AD  </td>
</tr>
<tr>
<td>趋势 `granularity`  </td>
<td>**DAY**** / ****WEEK**** / ****MONTH**  </td>
<td>默认 DAY  </td>
</tr>
<tr>
<td>趋势 `dimensions`  </td>
<td>`conversations` / `conversationUsers` / `purchases` / `purchasesValue` / `spendUsd` / `roas`  </td>
<td>最多 **6** 个  </td>
</tr>
<tr>
<td>广告导出 `exportType`  </td>
<td>**ALL**** / ****SUMMARY_ONLY**** / ****TREND_ONLY**** / ****DETAIL_ONLY**  </td>
<td>默认 ALL  </td>
</tr>
<tr>
<td>下载中心 ExportType  </td>
<td>**12** = CTWA 转化回传明细；**13** = CTWA 广告效果数据  </td>
<td>`ExportTypeEnum`  </td>
</tr>
<tr>
<td>type=12 `extendParam`  </td>
<td>`Purchase` / `AddToCart` / `InitiateCheckout` / `CompleteRegistration` / `Lead` / 空  </td>
<td>空=合集列；Purchase→type 1+2  </td>
</tr>
<tr>
<td>客户来源类型  </td>
<td>AD_CTWA（`EngagementChannelTypeEnum`）  </td>
<td>归因匹配来源  </td>
</tr>
<tr>
<td>Facebook account_id  </td>
<td>ES 存裸数字；展示常见 `act_` 前缀需剥离  </td>
<td>`ACCOUNT_ID_ACT_PREFIX=act_`  </td>
</tr>
<tr>
<td>看板指标缓存 TTL  </td>
<td>`bigdata.ad.performance.cache.ttl` 默认 **3600** 秒  </td>
<td></td>
</tr>
<tr>
<td>授权账号缓存 TTL  </td>
<td>`ctwa.dashboard.authorized.account.ids.cache.ttl` 默认 **300** 秒  </td>
<td></td>
</tr>
<tr>
<td>维度 ad_id 上限  </td>
<td>**10000**  </td>
<td>超出拒绝明细维度查询  </td>
</tr>
<tr>
<td>need_postback  </td>
<td>**true/false**（布尔）  </td>
<td>定时 CAPI / 配置页导出只扫 true  </td>
</tr>
</table>
---
**功能说明**：扩展现网 72h AD_CTWA 归因 + CAPI 回传，覆盖加购/结算/注册/留资及现网购买；复用已有 Shopify behavior Topic + **新 consumer group**，新增 **ctwa.shopify.user.behavior.trigger.topic**（默认 `ctwaShopifyUbTrigger`）用于 CTWA 加购/结算归因触发（见 Topic 变更小节）。开放 API（3.3）**仅转发 Meta，不落**`ctwa_conversion_attribution`。  
**涉及服务**  
<table>
<tr>
<td>服务  </td>
<td>改动  </td>
</tr>
<tr>
<td>meetbot-commons / core-client  </td>
<td>`CtwaConversionAttributionType` 枚举扩展 3–6；`ExternalBizEventTypeEnum` 扩展注册/留资  </td>
</tr>
<tr>
<td>meetbot-data-analysis  </td>
<td>新 consumer group 过滤加购/结算；ATC 写路径精简 `origin_data.products[].id`  </td>
</tr>
<tr>
<td>meetbot-core-service  </td>
<td>`CtwaConversionServiceImpl` 归因 + CAPI；`resolveEventName` / `buildCustomData` 映射  </td>
</tr>
</table>
**关键决策**  
<table>
<tr>
<td>决策点  </td>
<td>选择  </td>
</tr>
<tr>
<td>Shopify 接入  </td>
<td>复用 Topic + 新 consumer group  </td>
</tr>
<tr>
<td>归因窗口  </td>
<td>72h AD_CTWA + 回传开关门禁  </td>
</tr>
<tr>
<td>支付去重  </td>
<td>**仅**`type + sourceId` 幂等；**不做** Order ID 业务去重  </td>
</tr>
<tr>
<td>加购去重  </td>
<td>`order_no = userId:productId` + 时间窗（Apollo）  </td>
</tr>
</table>
#### 伪代码：自建渠道分发
```
handleExternalBizConversionEvent(eventId):
  event = load ExternalBizEvent(eventId)
  switch event.eventType:
    ORDER_PAID             -> handleExternalBizOrderPaidEvent(event)  // 保持原支付逻辑
    PRODUCT_ADDED_TO_CART  -> handleExternalBizNonPurchase(ADD_TO_CART)
    CHECKOUT_STARTED       -> handleExternalBizNonPurchase(CHECKOUT)
    REGISTRATION_COMPLETED -> handleExternalBizNonPurchase(REGISTER)
    LEAD_SUBMITTED         -> handleExternalBizNonPurchase(LEAD)
    else                   -> return
```
#### 伪代码：非购买落库与去重
```
handleExternalBizNonPurchase(event, type):
  if existsByTypeAndSourceId(type, event.id): return
  storeId / mobiles = resolve(event)
  orderNo = resolveDedupKey(type)   // 见上表
  if blank(orderNo): return
  if type == ADD_TO_CART:
    if existsAddToCartInWindow(storeId, orderNo, eventTime, windowMin): return
  else if existsByTypeAndOrderNo(type, storeId, orderNo): return
  bestSource = findLatestAdCtwa(mobiles, storeId, lookback)
  if bestSource == null: return
  save attribution(...)
```
#### 伪代码：加购去重键
```
buildAddToCartDedupKey(userId, productId):
  if blank(userId) or blank(productId): return null
  productId = stripShopifyGid(productId)
  return userId + ":" + productId
// Shopify 写路径先落精简 origin_data.products[].id 再发 Kafka
// 查询：order_time ∈ [eventTime-window, eventTime]
```
#### 3.2.1 数据存储
<table>
<tr>
<td>存储  </td>
<td>变更  </td>
</tr>
<tr>
<td>`ctwa_conversion_attribution.type`  </td>
<td>枚举扩 3/4/5/6  </td>
</tr>
<tr>
<td>`ctwa_conversion_attribution.channel`  </td>
<td>**DDL 新增**：`varchar` 默认 `shopify`；自建写 `custom`；查询暂不按渠道过滤  </td>
</tr>
<tr>
<td>`ctwa_conversion_attribution.referral_source_id`  </td>
<td>**DDL 新增**（见 3.4.2 回传明细）：Facebook ad_id，与 JSON 双写  </td>
</tr>
<tr>
<td>`external_biz_event.event_type`  </td>
<td>自建事件归因扩注册/留资  </td>
</tr>
</table>
**说明**：本表仅承载**我方归因（Shopify / 自建渠道 → 72h AD_CTWA → 定时 CAPI）。开放 API（3.3）只转发 Meta，不落本表**。  
##### `ctwa_conversion_attribution` 字段要点
<table>
<tr>
<td>字段  </td>
<td>说明  </td>
</tr>
<tr>
<td>`type`  </td>
<td>1–6，见 `CtwaConversionAttributionType`  </td>
</tr>
<tr>
<td>`channel`  </td>
<td>业务渠道字符串：`shopify`（默认）/ `自定义`；仅落库区分，查询/统计暂不按渠道过滤；枚举 `CtwaConversionChannel`  </td>
</tr>
<tr>
<td>`source_id`  </td>
<td>上游业务 Long 主键（订单订阅 id / external_biz_event.id / behavior log id 等）  </td>
</tr>
<tr>
<td>`order_no`  </td>
<td>业务幂等键：支付存 orderId（仅展示，不做 Order ID 去重）；加购存 `userId:productId`；结算存 checkout token；注册存 userId；留资存 eventId  </td>
</tr>
<tr>
<td>`order_time`  </td>
<td>业务事件时间（明细展示 `eventTime` 取此字段）  </td>
</tr>
<tr>
<td>`referral_source_id`  </td>
<td>Facebook ad_id；写入时与 `extend_info.referralSourceId` 双写  </td>
</tr>
<tr>
<td>`extend_info`  </td>
<td>手机号、referral、金额等 JSON  </td>
</tr>
<tr>
<td>`need_postback`  </td>
<td>按店铺 `ctwa_postback_config`；定时 CAPI 只扫 `need_postback=true`  </td>
</tr>
<tr>
<td>`postback_status` / `postback_times`  </td>
<td>定时任务更新  </td>
</tr>
</table>
##### extend_info 与明细展示
<table>
<tr>
<td>JSON 字段  </td>
<td>说明  </td>
</tr>
<tr>
<td>`sourceId`  </td>
<td>customer_source.ref_id；明细经 `parseReferralId` 关联 `wa_referral_info`  </td>
</tr>
<tr>
<td>`referralSourceId`  </td>
<td>Facebook ad_id；与列 `referral_source_id` 双写  </td>
</tr>
<tr>
<td>`attributionMobile` / `businessPhone`  </td>
<td>归因手机号 / B 端号  </td>
</tr>
<tr>
<td>`externalUserId` / `contactPhone` / `contactEmail`  </td>
<td>注册/留资导出专属列  </td>
</tr>
</table>
##### 读路径
<table>
<tr>
<td>读路径  </td>
<td>条件  </td>
</tr>
<tr>
<td>看板抽屉 `queryConversionDetailPage`  </td>
<td>`store_id` + 时间 + 事件 + 维度（`referral_source_id`）+ 游标 `lastTime/lastId`  </td>
</tr>
<tr>
<td>配置页汇总 / 游标导出（type=12）  </td>
<td>`need_postback=true`；近一年  </td>
</tr>
<tr>
<td>定时 CAPI  </td>
<td>`loadPostbackBatch(need_postback=true)`  </td>
</tr>
</table>
##### 回传明细字段映射（列表/导出）
<table>
<tr>
<td>展示字段  </td>
<td>取值  </td>
</tr>
<tr>
<td>CTWA 时间 `ctwaTime`  </td>
<td>referral.createTime（无则 gmtCreate）  </td>
</tr>
<tr>
<td>CTWA 点击 ID  </td>
<td>referral.ctwaClid → `matchedCtwaClid`  </td>
</tr>
<tr>
<td>客户手机号  </td>
<td>extend_info.attributionMobile  </td>
</tr>
<tr>
<td>事件类型  </td>
<td>attribution.type → eventType / eventName  </td>
</tr>
<tr>
<td>事件发生时间 `eventTime`  </td>
<td>attribution.orderTime（**不是** referral 时间）  </td>
</tr>
<tr>
<td>转化金额  </td>
<td>extend_info.totalPrice → conversionValue  </td>
</tr>
<tr>
<td>回传状态 / 回传时间  </td>
<td>postbackStatus；成功时用 updateTime  </td>
</tr>
</table>
#### 3.2.3 回传配置（props）
复用已有 props，不新增独立接口。  
<table>
<tr>
<td>接口  </td>
<td>方法  </td>
<td>说明  </td>
</tr>
<tr>
<td>`/webhooks/common/propsQuery`  </td>
<td>POST  </td>
<td>`keys=["ctwa_postback_config"]`  </td>
</tr>
<tr>
<td>`/webhooks/common/propsSet`  </td>
<td>POST  </td>
<td>`key="ctwa_postback_config"` + `value` JSON 字符串  </td>
</tr>
</table>
**ctwa_postback_config value 字段**  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>必填  </td>
<td>说明  </td>
</tr>
<tr>
<td>enabled  </td>
<td>Boolean  </td>
<td>是  </td>
<td>回传开关  </td>
</tr>
<tr>
<td>testMode  </td>
<td>Boolean  </td>
<td>否  </td>
<td>是否测试模式  </td>
</tr>
<tr>
<td>testCode  </td>
<td>String  </td>
<td>否  </td>
<td>Meta 测试事件编码  </td>
</tr>
<tr>
<td>whitelistEvents  </td>
<td>List<Integer>  </td>
<td>否  </td>
<td>白名单事件类型  </td>
</tr>
</table>
**propsQuery 请求示例**  
```
{
  "keys": ["ctwa_postback_config"]
}
```
**propsSet 请求示例**  
```
{
  "key": "ctwa_postback_config",
  "value": "{\"enabled\":true,\"testMode\":false,\"testCode\":\"\",\"whitelistEvents\":[1,3,4,5,6]}"
}
```
**value 解析示例**  
```
{
  "enabled": true,
  "testMode": false,
  "testCode": "",
  "whitelistEvents": [1, 3, 4, 5, 6]
}
```
### 3.3 开放 CTWA 转化 API（客户自回传 Meta）
**功能说明**：B 端自带 `ctwa_clid` 与 CAPI 字段；receive 鉴权后按 YAML 规则经 Gateway 转发 Meta。**只转发、不落库**（不写 `ctwa_conversion_attribution`）；**不扩展 Proxy Handler**（无 before/after、无自定义 Bean）。  
**涉及服务**：仅 `meetbot-channel-receive`（`application-proxy.yml` 增加 `ctwa-conversion` 规则）。core **无**落库接口、无 DDL。  
<table>
<tr>
<td>决策点  </td>
<td>选择  </td>
</tr>
<tr>
<td>落库  </td>
<td>**无**（开放 API 事件不进我方归因表，也不进看板回传明细）  </td>
</tr>
<tr>
<td>Handler 扩展  </td>
<td>**不需要**。复用现有 Proxy 引擎 YAML 能力即可，不新增 `ProxyRequestHandler` / `handlers` 配置  </td>
</tr>
<tr>
<td>校验  </td>
<td>走现有 Proxy 鉴权 + 账号校验（`account-type` / `wabaId`）；CAPI 字段合法性由 Meta 侧返回  </td>
</tr>
</table>
#### 3.3.1 Proxy 配置（YAML）
```
meetbot:
  proxy:
    rules:
      ctwa-conversion:
        base-path: /v1/ctwa/conversion
        target-base-url: ${gatewayUrl}/${gatewayAppId}/${fbApiVersion}
        metric-resource-key: open/ctwa
        expose-upstream-error: true
        client-body-style: auto
        apis:
          - path: /events
            method: POST
            target-method: POST
            target-path: /{dataset_id}/events
            account-type: WHATSAPP_WA
            account-source: body
            account-field: wabaId
            path-params:
              - name: dataset_id
                field: datasetId
                source: body
            body-pass-through: true
```
说明：规则中**无** `handlers` 字段；body 透传，成功/失败均透传 upstream（`expose-upstream-error: true`）。  
#### 3.3.2 接口
**接口**：`POST /v1/ctwa/conversion/events`
**服务**：meetbot-channel-receive
**说明**：鉴权 + 转发 Meta；不落库、不归因、不写回传明细。  
**请求体（外层）**：`wabaId`、`datasetId`、`param`（Meta CAPI body，含 `data[]`）。  
5. 匹配规则 → 解析入参 → 账号校验 → 构建 URL/body
6. `handlers.before`（抛 `BizException` 则**不转发**）
7. HTTP 转发 Gateway → Meta
8. 包装 `RestResponseVO` → 返回（**无 after 落库**）
9. 匹配规则 → 解析入参 → 账号校验 → 构建 URL/body
10. 按序调用 `handlers[].before`（可校验；抛业务异常则**中断转发**）
11. HTTP 转发 Gateway → Meta
12. 包装 `RestResponseVO`
13. 按序调用 `handlers[].after`（异常吞掉并打 error 日志，不影响客户端响应）
14. 返回响应 / 计量上报
- **无**（开放 API 不落库）
- 入参：`storeId`、`wabaId`、`datasetId`、`metaSuccess`、`events[]`（eventName/eventTime/ctwaClid/value/currency/eventId…）
- 出参：写入条数；失败抛错由 receive after 捕获
### 3.4 全链路效果看板
**功能说明**：大数据 ES 广告指标 + MySQL 会话统计 + 转化趋势/明细/导出 + 我方归因回传明细查询。  
**涉及服务**：meetbot-core-service（看板查询）+ meetbot-jservice-api（导出框架）。  
**关键决策**  
<table>
<tr>
<td>决策点  </td>
<td>选择  </td>
</tr>
<tr>
<td>看板数据  </td>
<td>ES 指标索引 + `ad_dim` 时区 + MySQL 会话表，按 `date_in_account_tz` 关联  </td>
</tr>
<tr>
<td>缓存  </td>
<td>Redis TTL=1h  </td>
</tr>
</table>
#### 3.4.1 数据存储
<table>
<tr>
<td>存储  </td>
<td>变更  </td>
</tr>
<tr>
<td>ES `mb_ads_fb_*_di` + `mb_ads_fb_ad_dim`  </td>
<td>已有（大数据）；完整 mapping 见下  </td>
</tr>
<tr>
<td>Redis  </td>
<td>`ctwa:dashboard:{storeId}:{dimHash}` TTL=1h  </td>
</tr>
</table>
#### Elasticsearch 索引 Mapping（完整建索引）
大数据提供，ES 6.x（`_doc` mapping type）。指标索引 `number_of_shards=3`、`number_of_replicas=1`；指标索引与维度索引均为 `number_of_shards=3`、`number_of_replicas=1`。各粒度 `*_di`**仅含本层级维度字段** + account；主键 ID 带 `fields.fuzzy`；`dw_create_time` 为 date；看板名称从 `*_di` 取；`mb_ads_fb_ad_dim` 仅 ID + 时区（**不含名称**）（`ad_id` → account/campaign/adgroup id+name + `account_timezone`）。  
##### PUT mb_ads_fb_ad_di
```
PUT mb_ads_fb_ad_di
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1
  },
  "mappings": {
    "_doc": {
      "properties": {
        "channel_name": {
          "type": "keyword"
        },
        "channel_id": {
          "type": "keyword"
        },
        "calendar_date": {
          "type": "keyword"
        },
        "account_id": {
          "type": "keyword"
        },
        "account_name": {
          "type": "keyword",
          "fields": {
            "text": {
              "type": "text"
            }
          }
        },
        "campaign_id": {
          "type": "keyword"
        },
        "campaign_name": {
          "type": "keyword",
          "fields": {
            "text": {
              "type": "text"
            }
          }
        },
        "adgroup_id": {
          "type": "keyword"
        },
        "adgroup_name": {
          "type": "keyword",
          "fields": {
            "text": {
              "type": "text"
            }
          }
        },
        "ad_id": {
          "type": "keyword"
        },
        "ad_name": {
          "type": "keyword",
          "fields": {
            "text": {
              "type": "text"
            }
          }
        },
        "spend": {
          "type": "float",
          "index": false
        },
        "spend_usd": {
          "type": "float",
          "index": false
        },
        "impressions": {
          "type": "long",
          "index": false
        },
        "clicks": {
          "type": "long",
          "index": false
        },
        "adds_to_cart": {
          "type": "long",
          "index": false
        },
        "checkouts_initiated": {
          "type": "long",
          "index": false
        },
        "purchases": {
          "type": "long",
          "index": false
        },
        "purchases_value": {
          "type": "float",
          "index": false
        },
        "registrations_completed": {
          "type": "long",
          "index": false
        },
        "leads": {
          "type": "long",
          "index": false
        },
        "dw_create_time": {
          "type": "date",
          "format": "yyyy-MM-dd HH:mm:ss||strict_date_optional_time||epoch_millis"
        }
      }
    }
  }
}
```
##### PUT mb_ads_fb_adgroup_di
```
PUT mb_ads_fb_adgroup_di
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1
  },
  "mappings": {
    "_doc": {
      "properties": {
        "channel_name": {
          "type": "keyword"
        },
        "channel_id": {
          "type": "keyword"
        },
        "calendar_date": {
          "type": "keyword"
        },
        "account_id": {
          "type": "keyword"
        },
        "account_name": {
          "type": "keyword",
          "fields": {
            "text": {
              "type": "text"
            }
          }
        },
        "adgroup_id": {
          "type": "keyword",
          "fields": {
            "fuzzy": {
              "type": "text",
              "analyzer": "standard"
            }
          }
        },
        "adgroup_name": {
          "type": "keyword",
          "fields": {
            "text": {
              "type": "text"
            }
          }
        },
        "spend": {
          "type": "float",
          "index": false
        },
        "spend_usd": {
          "type": "float",
          "index": false
        },
        "impressions": {
          "type": "long",
          "index": false
        },
        "clicks": {
          "type": "long",
          "index": false
        },
        "adds_to_cart": {
          "type": "long",
          "index": false
        },
        "checkouts_initiated": {
          "type": "long",
          "index": false
        },
        "purchases": {
          "type": "long",
          "index": false
        },
        "purchases_value": {
          "type": "float",
          "index": false
        },
        "registrations_completed": {
          "type": "long",
          "index": false
        },
        "leads": {
          "type": "long",
          "index": false
        },
        "dw_create_time": {
          "type": "date",
          "format": "yyyy-MM-dd HH:mm:ss||strict_date_optional_time||epoch_millis"
        }
      }
    }
  }
}
```
##### PUT mb_ads_fb_campaign_di
```
PUT mb_ads_fb_campaign_di
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1
  },
  "mappings": {
    "_doc": {
      "properties": {
        "channel_name": {
          "type": "keyword"
        },
        "channel_id": {
          "type": "keyword"
        },
        "calendar_date": {
          "type": "date",
          "format": "yyyy-MM-dd HH:mm:ss||strict_date_optional_time||epoch_millis"
        },
        "account_id": {
          "type": "keyword"
        },
        "account_name": {
          "type": "keyword",
          "fields": {
            "text": {
              "type": "text"
            }
          }
        },
        "campaign_id": {
          "type": "keyword",
          "fields": {
            "fuzzy": {
              "type": "text",
              "analyzer": "standard"
            }
          }
        },
        "campaign_name": {
          "type": "keyword",
          "fields": {
            "text": {
              "type": "text"
            }
          }
        },
        "spend": {
          "type": "float",
          "index": false
        },
        "spend_usd": {
          "type": "float",
          "index": false
        },
        "impressions": {
          "type": "long",
          "index": false
        },
        "clicks": {
          "type": "long",
          "index": false
        },
        "adds_to_cart": {
          "type": "long",
          "index": false
        },
        "checkouts_initiated": {
          "type": "long",
          "index": false
        },
        "purchases": {
          "type": "long",
          "index": false
        },
        "purchases_value": {
          "type": "float",
          "index": false
        },
        "registrations_completed": {
          "type": "long",
          "index": false
        },
        "leads": {
          "type": "long",
          "index": false
        },
        "dw_create_time": {
          "type": "date",
          "format": "yyyy-MM-dd HH:mm:ss||strict_date_optional_time||epoch_millis"
        }
      }
    }
  }
}
```
##### PUT mb_ads_fb_account_di
```
PUT mb_ads_fb_account_di
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1
  },
  "mappings": {
    "_doc": {
      "properties": {
        "channel_name": {
          "type": "keyword"
        },
        "channel_id": {
          "type": "keyword"
        },
        "calendar_date": {
          "type": "date",
          "format": "yyyy-MM-dd HH:mm:ss||strict_date_optional_time||epoch_millis"
        },
        "account_id": {
          "type": "keyword",
          "fields": {
            "fuzzy": {
              "type": "text",
              "analyzer": "standard"
            }
          }
        },
        "account_name": {
          "type": "keyword",
          "fields": {
            "text": {
              "type": "text"
            }
          }
        },
        "spend": {
          "type": "float",
          "index": false
        },
        "spend_usd": {
          "type": "float",
          "index": false
        },
        "impressions": {
          "type": "long",
          "index": false
        },
        "clicks": {
          "type": "long",
          "index": false
        },
        "adds_to_cart": {
          "type": "long",
          "index": false
        },
        "checkouts_initiated": {
          "type": "long",
          "index": false
        },
        "purchases": {
          "type": "long",
          "index": false
        },
        "purchases_value": {
          "type": "float",
          "index": false
        },
        "registrations_completed": {
          "type": "long",
          "index": false
        },
        "leads": {
          "type": "long",
          "index": false
        },
        "dw_create_time": {
          "type": "date",
          "format": "yyyy-MM-dd HH:mm:ss||strict_date_optional_time||epoch_millis"
        }
      }
    }
  }
}
```
##### PUT mb_ads_fb_ad_dim
会话落库与时区补偿依赖本索引：按 `ad_id` 取 `account_id`、`campaign_id`、`adgroup_id`、`account_timezone`；时区用于 `event_time` → `date_in_account_tz`（**yyyy-MM-dd**）；名称字段供 **筛选下拉**`queryCtwaFilterOptions` 与展示；店级指标/趋势/明细分页广告指标走 `*_di`，会话走 MySQL `ctwa_conversation_record`（含 **ad_campaign_id/ad_group_id**）。  
```
PUT mb_ads_fb_ad_dim
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1
  },
  "mappings": {
    "_doc": {
      "properties": {
        "account_id": {
          "type": "keyword"
        },
        "account_name": {
          "type": "keyword",
          "fields": {
            "text": {
              "type": "text"
            }
          }
        },
        "campaign_id": {
          "type": "keyword"
        },
        "campaign_name": {
          "type": "keyword",
          "fields": {
            "text": {
              "type": "text"
            }
          }
        },
        "adgroup_id": {
          "type": "keyword"
        },
        "adgroup_name": {
          "type": "keyword",
          "fields": {
            "text": {
              "type": "text"
            }
          }
        },
        "ad_id": {
          "type": "keyword"
        },
        "ad_name": {
          "type": "keyword",
          "fields": {
            "text": {
              "type": "text"
            }
          }
        },
        "account_timezone": {
          "type": "keyword"
        }
      }
    }
  }
}
```
#### 3.4.2 接口
**前端入口（meetbot-jservice-api BFF）**  
前端调用 jservice；Header 需登录态（`RpUserAccessTokenCheck`）+ 公司校验；权限 `STORE_CONVERSION_POSTBACK`。**storeId 由服务端从登录态注入**，请求体不要传 storeId（Core Feign 内部再注入）。  
<table>
<tr>
<td>BFF（前端）Core Inner（Feign）说明`POST /ctwa/analytics/exportAdData`**无 Core Inner**（jservice `ExportType=17`）异步导出广告效果**URL**：`POST /ctwa/analytics/exportAdData`说明：创建下载中心任务 `ExportType=17`，**不直调 Core 导出 Feign**。  </td>
<td>Core Inner（Feign）  </td>
<td>说明  </td>
</tr>
<tr>
<td>`POST /conversion/postback/eventStatistic`  </td>
<td>`POST /channel/whatsapp/inner/queryCtwaConversionStoreEventSummaries`  </td>
<td>**按事件分类统计（配置页主接口）**  </td>
</tr>
<tr>
<td>`POST /conversion/postback/statistic`  </td>
<td>`POST /channel/whatsapp/inner/queryCtwaConversionStoreSummary`  </td>
<td>现网总数+GMV（不含分类，契约不变）  </td>
</tr>
<tr>
<td>`POST /conversion/postback/info`  </td>
<td>已有授权/广告拉取信息  </td>
<td>授权状态等，不新增  </td>
</tr>
<tr>
<td>`POST /ctwa/analytics/queryMetricsBlock`  </td>
<td>`POST /channel/whatsapp/inner/queryCtwaMetricsBlock`  </td>
<td>指标块  </td>
</tr>
<tr>
<td>`POST /ctwa/analytics/queryTrend`  </td>
<td>`POST /channel/whatsapp/inner/queryCtwaTrend`  </td>
<td>转化趋势  </td>
</tr>
<tr>
<td>`POST /ctwa/analytics/queryAdDetailPage`  </td>
<td>`POST /channel/whatsapp/inner/queryCtwaAdDetailPage`  </td>
<td>广告明细（**lastId 游标**）  </td>
</tr>
<tr>
<td>`POST /ctwa/analytics/queryFilterOptions`  </td>
<td>`POST /channel/whatsapp/inner/queryCtwaFilterOptions`  </td>
<td>筛选下拉（**lastId 游标**）  </td>
</tr>
<tr>
<td>`POST /ctwa/analytics/queryConversionDetailPage`  </td>
<td>`POST /channel/whatsapp/inner/queryCtwaConversionDetailPage`  </td>
<td>回传明细  </td>
</tr>
<tr>
<td>`POST /ctwa/analytics/listSupportedEvents`  </td>
<td>`POST /channel/whatsapp/inner/listCtwaSupportedEvents`  </td>
<td>支持事件列表  </td>
</tr>
<tr>
<td>`POST /export/create/task`（`type=17`）  </td>
<td>**无 Core Inner**（jservice `ExportType=17`）  </td>
<td></td>
</tr>
<tr>
<td>`POST /ctwa/analytics/queryPostbackStats`  </td>
<td>`POST /channel/whatsapp/inner/queryCtwaPostbackStats`  </td>
<td>按维度+时间范围查询成功回传次数  </td>
</tr>
<tr>
<td></td>
<td></td>
<td></td>
</tr>
</table>
日期约束（指标块 / 趋势 / 明细 / 导出共用）：默认 end=昨天，start=end-29 天；跨度 ≤ 90 天；end ≤ 昨天；超出返回参数错误。  
**eventType**** / ****eventTypes**** = ****CtwaConversionAttributionType.code****（1–6）**；完整可选值与含义见下方「枚举 / 类型取值」（与 3.2 枚举表一致）。勿与自建 `ExternalBizEventTypeEnum.dbCode` 混淆。  
**枚举 / 类型取值（接口字段必读）**  
以下字段传枚举或类型码时，必须使用表内可选值；含义以本表为准。  
<table>
<tr>
<td>字段 / 场景  </td>
<td>可选值  </td>
<td>含义  </td>
</tr>
<tr>
<td>`eventType` / `eventTypes`  </td>
<td>`1`  </td>
<td>Shopify 购买；Meta `Purchase`；展示名 Purchases。统计/筛选时与 `2` 合并为 Purchases  </td>
</tr>
<tr>
<td></td>
<td>`2`  </td>
<td>自建渠道购买；Meta `Purchase`。**看板统计不下发独立项**，次数/GMV 并入 `1`  </td>
</tr>
<tr>
<td></td>
<td>`3`  </td>
<td>加购；Meta `AddToCart`；展示名 AddToCart  </td>
</tr>
<tr>
<td></td>
<td>`4`  </td>
<td>结算；Meta `InitiateCheckout`；展示名 InitiateCheckout  </td>
</tr>
<tr>
<td></td>
<td>`5`  </td>
<td>注册；Meta `CompleteRegistration`；展示名 CompleteRegistration  </td>
</tr>
<tr>
<td></td>
<td>`6`  </td>
<td>留资；Meta `Lead`；展示名 Lead  </td>
</tr>
<tr>
<td>`channel`（存库，看板查询不入参）  </td>
<td>`shopify`  </td>
<td>Shopify 渠道（默认）  </td>
</tr>
<tr>
<td></td>
<td>`custom`  </td>
<td>自建 / 自定义渠道  </td>
</tr>
<tr>
<td>`postbackStatus`（回传明细响应枚举名）  </td>
<td>`PENDING`  </td>
<td>未执行（库值 0）  </td>
</tr>
<tr>
<td></td>
<td>`SUCCESS`  </td>
<td>成功（库值 1）  </td>
</tr>
<tr>
<td></td>
<td>`FAILED_RETRY`  </td>
<td>失败，待重试（库值 2）  </td>
</tr>
<tr>
<td></td>
<td>`FAILED_EXCEEDED`  </td>
<td>失败，已超过重试次数（库值 3）  </td>
</tr>
<tr>
<td>`dimensionType`  </td>
<td>`ACCOUNT`  </td>
<td>按广告账号  </td>
</tr>
<tr>
<td></td>
<td>`CAMPAIGN`  </td>
<td>按广告系列  </td>
</tr>
<tr>
<td></td>
<td>`ADGROUP`  </td>
<td>按广告组  </td>
</tr>
<tr>
<td></td>
<td>`AD`  </td>
<td>按广告（广告明细默认）  </td>
</tr>
<tr>
<td>`level`（筛选下拉）  </td>
<td>`ACCOUNT`  </td>
<td>广告账号选项  </td>
</tr>
<tr>
<td></td>
<td>`CAMPAIGN`  </td>
<td>广告系列选项  </td>
</tr>
<tr>
<td></td>
<td>`ADGROUP`  </td>
<td>广告组选项（无 `AD`）  </td>
</tr>
<tr>
<td>`granularity`  </td>
<td>`DAY`  </td>
<td>按自然日（默认）  </td>
</tr>
<tr>
<td></td>
<td>`WEEK`  </td>
<td>按周（周一为周起点）  </td>
</tr>
<tr>
<td></td>
<td>`MONTH`  </td>
<td>按自然月  </td>
</tr>
<tr>
<td>`dimensions[]`  </td>
<td>`conversations`  </td>
<td>会话次数  </td>
</tr>
<tr>
<td></td>
<td>`conversationUsers`  </td>
<td>会话人数  </td>
</tr>
<tr>
<td></td>
<td>`purchases`  </td>
<td>购买次数  </td>
</tr>
<tr>
<td></td>
<td>`purchasesValue`  </td>
<td>转化金额  </td>
</tr>
<tr>
<td></td>
<td>`spendUsd`  </td>
<td>广告花费（USD）  </td>
</tr>
<tr>
<td></td>
<td>`roas`  </td>
<td>ROAS；1～6 个，未传默认 conversations+purchases  </td>
</tr>
<tr>
<td>`sortField`  </td>
<td>`spendUsd`  </td>
<td>广告花费（默认）；仅影响当前页，不影响 lastId  </td>
</tr>
<tr>
<td></td>
<td>`impressions` / `clicks`  </td>
<td>曝光 / 点击  </td>
</tr>
<tr>
<td></td>
<td>`conversations` / `purchases` / `purchasesValue` / `roas`  </td>
<td>会话次数 / 购买次数 / 转化金额 / ROAS  </td>
</tr>
<tr>
<td>`sortOrder`  </td>
<td>`desc`  </td>
<td>降序（默认）  </td>
</tr>
<tr>
<td></td>
<td>`asc`  </td>
<td>升序  </td>
</tr>
<tr>
<td>`exportType`  </td>
<td>`ALL`  </td>
<td>汇总+趋势+明细（默认）  </td>
</tr>
<tr>
<td></td>
<td>`SUMMARY_ONLY`  </td>
<td>仅汇总  </td>
</tr>
<tr>
<td></td>
<td>`TREND_ONLY`  </td>
<td>仅趋势  </td>
</tr>
<tr>
<td></td>
<td>`DETAIL_ONLY`  </td>
<td>仅广告明细  </td>
</tr>
<tr>
<td>异步任务 ExportType  </td>
<td>`12`  </td>
<td>CTWA 转化回传明细导出  </td>
</tr>
<tr>
<td></td>
<td>`17`  </td>
<td>CTWA 广告效果数据导出  </td>
</tr>
<tr>
<td>`needPostback`  </td>
<td>`true`  </td>
<td>仅需回传 Meta 的归因记录  </td>
</tr>
<tr>
<td></td>
<td>`false` / 不传  </td>
<td>不按是否回传过滤  </td>
</tr>
</table>
勿与 `ExternalBizEventTypeEnum.dbCode` 混用 `eventType`。  
---
#### 1）按事件分类回传统计
**URL**：`POST /conversion/postback/eventStatistic`
**Core**：`POST /channel/whatsapp/inner/queryCtwaConversionStoreEventSummaries`  
**说明**：配置页按事件类型查看近一年回传成功统计。**分类统计请调本接口**，不要用 `/conversion/postback/statistic`。  
**前端对接要点**：  
- 列表固定 5 项：`1 / 3 / 4 / 5 / 6`，**不会下发 ****eventType=2**
- `eventType=1`（Purchases）= Shopify 购买(`type=1`) **+** 自建渠道购买(`type=2`) 的合并结果
- 购买卡片/表格只绑 `eventType===1`，不要再单独处理 type=2
- `/conversion/postback/statistic` 仍为全店总数+全量 GMV（含 1+2+其它类型），契约不变
**通用约定**  
<table>
<tr>
<td>项  </td>
<td>值  </td>
</tr>
<tr>
<td>Method  </td>
<td>`POST`  </td>
</tr>
<tr>
<td>Header  </td>
<td>登录态 `RpUserAccessTokenCheck` + 公司校验  </td>
</tr>
<tr>
<td>权限  </td>
<td>`STORE_CONVERSION_POSTBACK`  </td>
</tr>
<tr>
<td>storeId  </td>
<td>**服务端从登录态注入**，请求体不要传  </td>
</tr>
<tr>
<td>口径  </td>
<td>近一年；`need_postback=true`；`postback_status=SUCCESS(1)`  </td>
</tr>
<tr>
<td>返回范围  </td>
<td>固定返回 **5 条**：`eventType` = **1 / 3 / 4 / 5 / 6**（**不返回 2**）；无数据时对应项 `lastYearCallSuccess=0`、`totalGmv=[]`  </td>
</tr>
<tr>
<td>**购买合并（前端必读）**  </td>
<td>库表 `type=1`（Shopify）与 `type=2`（自建渠道）**次数与 GMV 合并进 ****eventType=1**；响应中**剔除 ****eventType=2**。前端只需渲染 1/3/4/5/6，Purchases 以 type=1 为准  </td>
</tr>
</table>
**请求参数**  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>必填  </td>
<td>说明  </td>
</tr>
<tr>
<td>（无）  </td>
<td>-  </td>
<td>-  </td>
<td>Body 传空对象即可；storeId 由服务端注入  </td>
</tr>
</table>
**Core Feign 入参**（jservice 内部透传）  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>必填  </td>
<td>说明  </td>
</tr>
<tr>
<td>storeId  </td>
<td>long  </td>
<td>是  </td>
<td>店铺 ID  </td>
</tr>
</table>
**响应参数**  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>说明  </td>
</tr>
<tr>
<td>eventSummaries  </td>
<td>List  </td>
<td>按事件分类汇总列表（固定 **5 条**：1/3/4/5/6；**不含 2**）  </td>
</tr>
<tr>
<td>eventSummaries[].eventType  </td>
<td>Integer  </td>
<td>事件类型码。固定 5 项：`1` Purchases（Shopify type=1 + 自建 type=2 合并）；`3` AddToCart 加购；`4` InitiateCheckout 结算；`5` CompleteRegistration 注册；`6` Lead 留资。**不会出现 ****2**  </td>
</tr>
<tr>
<td>eventSummaries[].eventName  </td>
<td>String  </td>
<td>展示名（`getDetailDisplayName`）  </td>
</tr>
<tr>
<td>eventSummaries[].lastYearCallSuccess  </td>
<td>Integer  </td>
<td>该类型近一年回传成功次数  </td>
</tr>
<tr>
<td>eventSummaries[].attributedCount  </td>
<td>Integer  </td>
<td>该类型近一年需回传归因累计次数（不限回传状态；Registration/Lead「累计注册/留资」取本字段；旧缓存缺省为 0）  </td>
</tr>
<tr>
<td>eventSummaries[].totalGmv  </td>
<td>List  </td>
<td>该类型按币种 GMV  </td>
</tr>
<tr>
<td>eventSummaries[].totalGmv[].curreny  </td>
<td>String  </td>
<td>币种（字段名按现网拼写）  </td>
</tr>
<tr>
<td>eventSummaries[].totalGmv[].total  </td>
<td>BigDecimal  </td>
<td>金额合计  </td>
</tr>
</table>
**请求示例（BFF）**  
```
{}
```
**Core Feign 请求示例**  
```
{ "storeId": 10086 }
```
**响应示例**  
```
{
  "code": 0,
  "data": {
    "eventSummaries": [
      {
        "eventType": 1,
        "eventName": "Purchases",
        "lastYearCallSuccess": 108,
        "attributedCount": 120,
        "totalGmv": [{ "curreny": "USD", "total": 9800.50 }]
      },
      {
        "eventType": 3,
        "eventName": "AddToCart",
        "lastYearCallSuccess": 0,
        "totalGmv": []
      },
      {
        "eventType": 4,
        "eventName": "InitiateCheckout",
        "lastYearCallSuccess": 5,
        "totalGmv": [{ "curreny": "USD", "total": 120.00 }]
      },
      {
        "eventType": 5,
        "eventName": "CompleteRegistration",
        "lastYearCallSuccess": 3,
        "totalGmv": []
      },
      {
        "eventType": 6,
        "eventName": "Lead",
        "lastYearCallSuccess": 12,
        "totalGmv": []
      }
    ]
  }
}
```
---
#### 1.1）转化回传总数统计（现网保留，契约不变）
**URL**：`POST /conversion/postback/statistic`
**Core**：`POST /channel/whatsapp/inner/queryCtwaConversionStoreSummary`  
**说明**：仅返回全店近一年回传成功**总数与全量 GMV；不含**按事件分类。分类请用上一节 `eventStatistic`。  
**请求参数**  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>必填  </td>
<td>说明  </td>
</tr>
<tr>
<td>（无）  </td>
<td>-  </td>
<td>-  </td>
<td>Body 传空对象；storeId 服务端注入  </td>
</tr>
</table>
**响应参数**  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>说明  </td>
</tr>
<tr>
<td>lastYearCallSuccess  </td>
<td>Integer  </td>
<td>近一年回传成功总数  </td>
</tr>
<tr>
<td>totalGmv  </td>
<td>List  </td>
<td>全量按币种汇总  </td>
</tr>
<tr>
<td>totalGmv[].curreny  </td>
<td>String  </td>
<td>币种  </td>
</tr>
<tr>
<td>totalGmv[].total  </td>
<td>BigDecimal  </td>
<td>金额  </td>
</tr>
</table>
**请求示例**  
```
{}
```
**响应示例**  
```
{
  "code": 0,
  "data": {
    "lastYearCallSuccess": 128,
    "totalGmv": [
      { "curreny": "USD", "total": 9800.50 },
      { "curreny": "CNY", "total": 1200.00 }
    ]
  }
}
```
---
#### 2）转化回传页信息
**URL**：`POST /conversion/postback/info`  
**参数**：无业务 Body  
**响应字段**：authFlag、conversionPostbackFailFlag、adsPullTime、adInfoList[{adId, adName}]  
**请求示例**  
```
{}
```
**响应示例**  
```
{
  "code": 0,
  "data": {
    "authFlag": true,
    "conversionPostbackFailFlag": false,
    "adsPullTime": "2026-07-20 10:00:00",
    "adInfoList": [
      { "adId": "act_123", "adName": "123" }
    ]
  }
}
```
---
#### 3）指标块查询
**URL**：BFF `POST /ctwa/analytics/queryMetricsBlock`；Inner `POST /channel/whatsapp/inner/queryCtwaMetricsBlock`  
**请求参数**  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>必填  </td>
<td>说明  </td>
</tr>
<tr>
<td>startDate  </td>
<td>string  </td>
<td>否  </td>
<td>yyyyMMdd  </td>
</tr>
<tr>
<td>endDate  </td>
<td>string  </td>
<td>否  </td>
<td>yyyyMMdd  </td>
</tr>
</table>
**响应参数**  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>说明  </td>
<td>数据来源  </td>
</tr>
<tr>
<td>spendUsd  </td>
<td>BigDecimal  </td>
<td>广告花费  </td>
<td>ES  </td>
</tr>
<tr>
<td>impressions / clicks  </td>
<td>Long  </td>
<td>曝光 / 点击  </td>
<td>ES  </td>
</tr>
<tr>
<td>ctr / cpc  </td>
<td>BigDecimal  </td>
<td>点击率 / 单次点击成本  </td>
<td>计算  </td>
</tr>
<tr>
<td>conversations / conversationUsers  </td>
<td>Long  </td>
<td>CTWA 会话次数 / 人数  </td>
<td>MySQL 会话表  </td>
</tr>
<tr>
<td>purchases / purchasesValue  </td>
<td>Long / BigDecimal  </td>
<td>购买次数 / GMV  </td>
<td>ES  </td>
</tr>
<tr>
<td>cpaPurchase / roas  </td>
<td>BigDecimal  </td>
<td>单次购买成本 / ROAS  </td>
<td>计算  </td>
</tr>
</table>
**请求示例**  
```
{ "startDate": "20260701", "endDate": "20260722" }
```
**响应示例**  
```
{
  "code": 0,
  "data": {
    "spendUsd": 120.5,
    "impressions": 10000,
    "clicks": 300,
    "ctr": 0.03,
    "cpc": 0.4,
    "conversations": 80,
    "conversationUsers": 70,
    "purchases": 12,
    "cpaPurchase": 10.04,
    "purchasesValue": 980,
    "roas": 8.13
  }
}
```
---
#### 4）转化趋势查询
**URL**：BFF `POST /ctwa/analytics/queryTrend`；Inner `POST /channel/whatsapp/inner/queryCtwaTrend`  
**请求参数**  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>必填  </td>
<td>说明  </td>
</tr>
<tr>
<td>startDate / endDate  </td>
<td>string  </td>
<td>否  </td>
<td>日期  </td>
</tr>
<tr>
<td>granularity  </td>
<td>string  </td>
<td>否  </td>
<td>分桶粒度。可选：`DAY` 按自然日（默认）；`WEEK` 按周（周一为起点）；`MONTH` 按自然月  </td>
</tr>
<tr>
<td>dimensions  </td>
<td>string[]  </td>
<td>否  </td>
<td>趋势指标，1～6 个。可选：`conversations` 会话次数；`conversationUsers` 会话人数；`purchases` 购买次数；`purchasesValue` 转化金额；`spendUsd` 广告花费；`roas` ROAS。未传默认 `["conversations","purchases"]`  </td>
</tr>
</table>
**请求示例**  
```
{
  "startDate": "20260701",
  "endDate": "20260722",
  "granularity": "DAY",
  "dimensions": ["conversations", "purchases"]
}
```
**响应示例**  
```
{
  "code": 0,
  "data": {
    "dates": ["20260701", "20260702"],
    "series": [
      { "dimension": "conversations", "name": "会话次数", "data": [10, 12] },
      { "dimension": "purchases", "name": "购买次数", "data": [1, 2] }
    ]
  }
}
```
---
#### 5）广告明细分页
**URL**：BFF `POST /ctwa/analytics/queryAdDetailPage`；Inner `POST /channel/whatsapp/inner/queryCtwaAdDetailPage`  
分页：**lastId**** 游标（ES composite），不用 pageNum 内存分页**。  
**请求参数**  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>必填  </td>
<td>说明  </td>
</tr>
<tr>
<td>dimensionType  </td>
<td>string  </td>
<td>否  </td>
<td>聚合维度。可选：`ACCOUNT` 广告账号；`CAMPAIGN` 广告系列；`ADGROUP` 广告组；`AD` 广告（默认）  </td>
</tr>
<tr>
<td>lastId  </td>
<td>string  </td>
<td>否  </td>
<td>游标；首页不传  </td>
</tr>
<tr>
<td>pageSize  </td>
<td>int  </td>
<td>否  </td>
<td>默认 10  </td>
</tr>
<tr>
<td>startDate / endDate  </td>
<td>string  </td>
<td>否  </td>
<td>日期  </td>
</tr>
<tr>
<td>sortField / sortOrder  </td>
<td>string  </td>
<td>否  </td>
<td>`sortField` 可选：`spendUsd`（默认）花费 / `impressions` 曝光 / `clicks` 点击 / `conversations` 会话次数 / `purchases` 购买次数 / `purchasesValue` 转化金额 / `roas` ROAS；`sortOrder`：`desc` 降序（默认）/ `asc` 升序。仅影响当前页，不影响 lastId  </td>
</tr>
<tr>
<td>searchKeyword  </td>
<td>string  </td>
<td>否  </td>
<td>名称模糊  </td>
</tr>
<tr>
<td>filterAccountIds / filterCampaignIds / filterAdGroupIds  </td>
<td>list  </td>
<td>否  </td>
<td>级联过滤  </td>
</tr>
</table>
**请求示例**  
```
{
  "dimensionType": "AD",
  "lastId": null,
  "pageSize": 20,
  "startDate": "20260701",
  "endDate": "20260722",
  "sortField": "spendUsd",
  "sortOrder": "desc"
}
```
**响应示例**  
```
{
  "code": 0,
  "data": {
    "total": 150,
    "lastId": "23851234567890",
    "end": false,
    "pageSize": 20,
    "list": [{
      "accountId": "123",
      "accountName": "Acc",
      "campaignId": "c1",
      "campaignName": "Camp",
      "adGroupId": "ag1",
      "adGroupName": "AG",
      "adId": "23851234567890",
      "adName": "Ad",
      "spendUsd": 10.5,
      "impressions": 1000,
      "clicks": 40,
      "conversations": 5,
      "conversationUsers": 4,
      "purchases": 1,
      "purchasesValue": 99,
      "roas": 9.4
    }]
  }
}
```
---
#### 6）筛选下拉
**URL**：`POST /ctwa/analytics/queryFilterOptions`
**Core**：`POST /channel/whatsapp/inner/queryCtwaFilterOptions`  
**数据来源**：ES `mb_ads_fb_ad_dim`。按 level 做 **composite ****lastId**** 游标分页（与广告明细一致），不做** terms 全量 + 内存切页。  
**请求参数**  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>必填  </td>
<td>说明  </td>
</tr>
<tr>
<td>level  </td>
<td>string  </td>
<td>是  </td>
<td>下拉层级。可选：`ACCOUNT` 广告账号；`CAMPAIGN` 广告系列；`ADGROUP` 广告组（无 `AD`）  </td>
</tr>
<tr>
<td>lastId  </td>
<td>string  </td>
<td>否  </td>
<td>游标；首页不传  </td>
</tr>
<tr>
<td>pageSize  </td>
<td>int  </td>
<td>否  </td>
<td>默认 10  </td>
</tr>
<tr>
<td>filterAccountIds / filterCampaignIds  </td>
<td>list  </td>
<td>否  </td>
<td>级联  </td>
</tr>
<tr>
<td>searchKeyword  </td>
<td>string  </td>
<td>否  </td>
<td>当前 level 名称模糊  </td>
</tr>
</table>
**请求示例**  
```
{ "level": "CAMPAIGN", "filterAccountIds": [123], "lastId": null, "pageSize": 10 }
```
**响应参数**  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>说明  </td>
</tr>
<tr>
<td>total  </td>
<td>long  </td>
<td>维度总数（cardinality 近似）  </td>
</tr>
<tr>
<td>lastId  </td>
<td>string  </td>
<td>下一页游标（本页最后一条 id）  </td>
</tr>
<tr>
<td>end  </td>
<td>bool  </td>
<td>是否末页  </td>
</tr>
<tr>
<td>pageSize  </td>
<td>int  </td>
<td>页大小  </td>
</tr>
<tr>
<td>list[].id / list[].name  </td>
<td>string  </td>
<td>选项  </td>
</tr>
</table>
**响应示例**  
```
{
  "code": 0,
  "data": {
    "total": 3,
    "lastId": "c1",
    "end": false,
    "pageSize": 10,
    "list": [{ "id": "c1", "name": "Camp A" }]
  }
}
```
---
#### 7）回传明细
**URL**：BFF `POST /ctwa/analytics/queryConversionDetailPage`；Inner `POST /channel/whatsapp/inner/queryCtwaConversionDetailPage`  
##### referral_source_id DDL
```
ALTER TABLE `ctwa_conversion_attribution`
  ADD COLUMN `referral_source_id` varchar(64) NOT NULL DEFAULT ''
    COMMENT 'Facebook 广告 ID，与 extend_info.referralSourceId 双写'
    AFTER `order_time`,
  ADD KEY `idx_store_referral_order_time` (`store_id`, `referral_source_id`, `order_time`);

UPDATE `ctwa_conversion_attribution`
SET `referral_source_id` = JSON_UNQUOTE(JSON_EXTRACT(`extend_info`, '$.referralSourceId')),
    `update_time` = `update_time`
WHERE `is_deleted` = 0
  AND `referral_source_id` = ''
  AND JSON_EXTRACT(`extend_info`, '$.referralSourceId') IS NOT NULL
  AND JSON_UNQUOTE(JSON_EXTRACT(`extend_info`, '$.referralSourceId')) <> '';
```
##### 维度过滤
<table>
<tr>
<td>dimensionType  </td>
<td>MySQL 条件  </td>
</tr>
<tr>
<td>AD  </td>
<td>`referral_source_id = dimensionId`  </td>
</tr>
<tr>
<td>ACCOUNT / CAMPAIGN / ADGROUP  </td>
<td>授权 account → ES terms `ad_id` → `referral_source_id IN (...)`  </td>
</tr>
</table>
##### 分页
游标 `lastTime` + `lastId`，排序 `order_time DESC, id DESC`；仅上一页/下一页，无 OFFSET。  
**请求参数**  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>必填  </td>
<td>说明  </td>
</tr>
<tr>
<td>startTime / endTime  </td>
<td>string  </td>
<td>否  </td>
<td>yyyy-MM-dd HH:mm:ss  </td>
</tr>
<tr>
<td>pageSize  </td>
<td>int  </td>
<td>否  </td>
<td>默认 20  </td>
</tr>
<tr>
<td>lastTime / lastId  </td>
<td>string / long  </td>
<td>否  </td>
<td>游标  </td>
</tr>
<tr>
<td>eventTypes  </td>
<td>int[]  </td>
<td>否  </td>
<td>归因类型过滤，见「枚举 / 类型取值」：`1` Purchases（含 Shopify+自建）；`3` AddToCart；`4` InitiateCheckout；`5` CompleteRegistration；`6` Lead。传 `1` 时后端含 type=2  </td>
</tr>
<tr>
<td>needPostback  </td>
<td>bool  </td>
<td>否  </td>
<td>`true`=仅需回传 Meta 的记录；`false`/不传=不过滤  </td>
</tr>
<tr>
<td>dimensionType / dimensionId  </td>
<td>string  </td>
<td>否  </td>
<td>广告维过滤：`dimensionType` 为 `ACCOUNT` / `CAMPAIGN` / `ADGROUP` / `AD`，须与 `dimensionId` 同传  </td>
</tr>
</table>
**请求示例**  
```
{
  "startTime": "2026-07-01 00:00:00",
  "endTime": "2026-07-22 23:59:59",
  "pageSize": 20,
  "lastTime": null,
  "lastId": null,
  "eventTypes": [6],
  "needPostback": true
}
```
**响应示例**  
```
{
  "code": 0,
  "data": {
    "total": 10,
    "pageSize": 20,
    "end": true,
    "lastTime": "2026-07-20T12:00:00",
    "lastId": 1001,
    "list": [{
      "id": 1001,
      "eventType": 6,
      "eventName": "Lead",
      "matchedCtwaClid": "clid_xxx",
      "ctwaTime": "2026-07-19 10:00:00",
      "attributionMobile": "13800138000",
      "eventTime": "2026-07-20 12:00:00",
      "postbackStatus": "SUCCESS",
      "postbackTime": "2026-07-20 12:05:00"
    }]
  }
}
```
---
#### 8）广告效果异步导出（通用下载中心 type=17）
**已下线**`POST /ctwa/analytics/exportAdData`。前端统一走下载中心：  
**URL**：`POST /export/create/task`（`type=17`）+ `/export/list` + `/export/last/status`
说明：异步导出广告效果 Excel（汇总 / 转化趋势 / 广告明细），**不直调 Core 导出 Feign**。  
**请求参数**  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>必填  </td>
<td>说明  </td>
</tr>
<tr>
<td>type  </td>
<td>Integer  </td>
<td>是  </td>
<td>固定 `17`  </td>
</tr>
<tr>
<td>webhookId  </td>
<td>Integer  </td>
<td>是  </td>
<td>店铺 ID（storeId）  </td>
</tr>
<tr>
<td>extendParam  </td>
<td>String  </td>
<td>否  </td>
<td>广告效果导出不用，可空  </td>
</tr>
<tr>
<td>body.startDate / body.endDate  </td>
<td>string  </td>
<td>否  </td>
<td>查询日期；兼容 `yyyyMMdd` / `yyyy-MM-dd`；默认 end=昨天、start=end-29 天  </td>
</tr>
<tr>
<td>body.exportType  </td>
<td>string  </td>
<td>否  </td>
<td>导出 sheet 范围：`ALL`（汇总+趋势+明细，默认）/ `SUMMARY_ONLY` / `TREND_ONLY` / `DETAIL_ONLY`  </td>
</tr>
</table>
**请求示例**  
```
{
  "webhookId": 3435,
  "type": 17,
  "extendParam": "",
  "body": {
    "startDate": "2026-06-01",
    "endDate": "2026-07-22",
    "exportType": "ALL"
  }
}
```
**响应示例**  
```
{
  "code": 0,
  "data": { "id": 123456 }
}
```
Excel 表头：  
<table>
<tr>
<td>Sheet  </td>
<td>列  </td>
</tr>
<tr>
<td>汇总  </td>
<td>广告花费、曝光量、点击量、CTR、CTWA会话次数、CTWA会话人数、购买次数、转化金额、ROAS  </td>
</tr>
<tr>
<td>转化趋势  </td>
<td>日期、CTWA会话次数、CTWA会话人数、购买次数、CPP、转化金额、广告花费、ROAS  </td>
</tr>
<tr>
<td>广告明细  </td>
<td>日期（查询区间标签）、广告账号、广告系列、广告组、广告、广告花费、曝光量、点击量、CTWA会话次数、CTWA会话人数、购买次数、转化金额、ROAS  </td>
</tr>
</table>
完成后站内信通知；文件名：`CTWA广告效果数据_yyyyMMdd_yyyyMMdd.xlsx`；CPP = spend / purchases。  
#### 9）配置页回传导出（type=12，按事件拆分）
**URL**：`POST /export/create/task`（`type=12`）+ `/export/list` + `/export/last/status`  
**extendParam**（Meta 事件名；空=混导合集列）  
<table>
<tr>
<td>extendParam  </td>
<td>eventTypes  </td>
<td>文件名前缀  </td>
</tr>
<tr>
<td>`Purchase`  </td>
<td>1,2  </td>
<td>CTWA track purchases  </td>
</tr>
<tr>
<td>`InitiateCheckout`  </td>
<td>4  </td>
<td>CTWA track initiateCheckout  </td>
</tr>
<tr>
<td>`AddToCart`  </td>
<td>3  </td>
<td>CTWA track addToCart  </td>
</tr>
<tr>
<td>`CompleteRegistration`  </td>
<td>5  </td>
<td>CTWA track completeRegistration  </td>
</tr>
<tr>
<td>`Lead`  </td>
<td>6  </td>
<td>CTWA track lead  </td>
</tr>
<tr>
<td>（空）  </td>
<td>不过滤  </td>
<td>现网 purchases 命名；表头=合集  </td>
</tr>
</table>
数据：近 1 年、`need_postback=true`；游标 lastTime/lastId。  
**Excel 列**  
- **公共列（含 Lead）**：事件类型、广告 headline、source_id、source_url、matched_ctwa_clid、店铺 WhatsApp 号码、客户手机号、事件发生时间、回传状态、回传时间
- Purchase：订单编号、订单金额、币种(店铺)
- InitiateCheckout：结算金额、币种(店铺)
- AddToCart：加购金额、币种(店铺)
- CompleteRegistration：用户ID、注册手机号、注册邮箱
- Lead：留资手机号、留资邮箱
---
#### 10）支持事件类型列表
**URL**：BFF `POST /ctwa/analytics/listSupportedEvents`；Inner `POST /channel/whatsapp/inner/listCtwaSupportedEvents`  
**参数**：无业务 Body  
**请求示例**  
```
{}
```
**响应示例**  
```
{
  "code": 0,
  "data": [
    { "eventType": 1, "eventName": "PURCHASE", "metaEventName": "Purchase", "description": "购买" },
    { "eventType": 3, "eventName": "ADD_TO_CART", "metaEventName": "AddToCart", "description": "加购" },
    { "eventType": 4, "eventName": "CHECKOUT", "metaEventName": "InitiateCheckout", "description": "结算" },
    { "eventType": 5, "eventName": "REGISTER", "metaEventName": "CompleteRegistration", "description": "注册完成" },
    { "eventType": 6, "eventName": "LEAD", "metaEventName": "Lead", "description": "留资提交" }
  ]
}
```
#### 3.4.3 性能考量
<table>
<tr>
<td>指标  </td>
<td>预期值  </td>
<td>备注  </td>
</tr>
<tr>
<td>数据量级  </td>
<td>日均数千条/店铺  </td>
<td>非购买转化 + 会话行  </td>
</tr>
<tr>
<td>QPS/TPS  </td>
<td>低（事件触发）；开放转发随客户调用  </td>
<td>归因写入 / proxy  </td>
</tr>
<tr>
<td>响应时间  </td>
<td>看板 <3s；开放转发接近上游  </td>
<td></td>
</tr>
<tr>
<td>缓存  </td>
<td>Redis TTL=1h  </td>
<td>看板  </td>
</tr>
<tr>
<td>T+1  </td>
<td>是  </td>
<td>ES 预聚合  </td>
</tr>
</table>
### 3.5 广告授权状态联动
**功能说明**：看板展示未授权 / 异常 / 已授权状态，复用现网 `FacebookAuthAdInfo` + `CONVERSION_POSTBACK` 授权检查，本期无新增接口。  
**涉及服务**：meetbot-admin-api（复用已有授权态查询）。  
### 附：关键设计决策（汇总）
## 四、上线文档
## 菜单
### 中台DML
```
-- --店铺1_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D1' LIMIT 1), 'marketing_D1', NULL, 1, 'marketing_ctwa_analytics_D1', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D1', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D1', 'mb_main', 'marketing_ctwa_analytics_D1', 'mb_main', 'meetbot');
-- --店铺2_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D2' LIMIT 1), 'marketing_D2', NULL, 1, 'marketing_ctwa_analytics_D2', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D2', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D2', 'mb_main', 'marketing_ctwa_analytics_D2', 'mb_main', 'meetbot');
-- --店铺3_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D3' LIMIT 1), 'marketing_D3', NULL, 1, 'marketing_ctwa_analytics_D3', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D3', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D3', 'mb_main', 'marketing_ctwa_analytics_D3', 'mb_main', 'meetbot');
-- --店铺4_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D4' LIMIT 1), 'marketing_D4', NULL, 1, 'marketing_ctwa_analytics_D4', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D4', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D4', 'mb_main', 'marketing_ctwa_analytics_D4', 'mb_main', 'meetbot');
-- --店铺5_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D5' LIMIT 1), 'marketing_D5', NULL, 1, 'marketing_ctwa_analytics_D5', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D5', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D5', 'mb_main', 'marketing_ctwa_analytics_D5', 'mb_main', 'meetbot');
-- --店铺6_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D6' LIMIT 1), 'marketing_D6', NULL, 1, 'marketing_ctwa_analytics_D6', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D6', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D6', 'mb_main', 'marketing_ctwa_analytics_D6', 'mb_main', 'meetbot');
-- --店铺7_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D7' LIMIT 1), 'marketing_D7', NULL, 1, 'marketing_ctwa_analytics_D7', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D7', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D7', 'mb_main', 'marketing_ctwa_analytics_D7', 'mb_main', 'meetbot');
-- --店铺8_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D8' LIMIT 1), 'marketing_D8', NULL, 1, 'marketing_ctwa_analytics_D8', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D8', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D8', 'mb_main', 'marketing_ctwa_analytics_D8', 'mb_main', 'meetbot');
-- --店铺9_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D9' LIMIT 1), 'marketing_D9', NULL, 1, 'marketing_ctwa_analytics_D9', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D9', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D9', 'mb_main', 'marketing_ctwa_analytics_D9', 'mb_main', 'meetbot');
-- --店铺10_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D10' LIMIT 1), 'marketing_D10', NULL, 1, 'marketing_ctwa_analytics_D10', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D10', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D10', 'mb_main', 'marketing_ctwa_analytics_D10', 'mb_main', 'meetbot');
-- --店铺11_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D11' LIMIT 1), 'marketing_D11', NULL, 1, 'marketing_ctwa_analytics_D11', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D11', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D11', 'mb_main', 'marketing_ctwa_analytics_D11', 'mb_main', 'meetbot');
-- --店铺12_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D12' LIMIT 1), 'marketing_D12', NULL, 1, 'marketing_ctwa_analytics_D12', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D12', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D12', 'mb_main', 'marketing_ctwa_analytics_D12', 'mb_main', 'meetbot');
-- --店铺13_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D13' LIMIT 1), 'marketing_D13', NULL, 1, 'marketing_ctwa_analytics_D13', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D13', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D13', 'mb_main', 'marketing_ctwa_analytics_D13', 'mb_main', 'meetbot');
-- --店铺14_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D14' LIMIT 1), 'marketing_D14', NULL, 1, 'marketing_ctwa_analytics_D14', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D14', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D14', 'mb_main', 'marketing_ctwa_analytics_D14', 'mb_main', 'meetbot');
-- --店铺15_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D15' LIMIT 1), 'marketing_D15', NULL, 1, 'marketing_ctwa_analytics_D15', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D15', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D15', 'mb_main', 'marketing_ctwa_analytics_D15', 'mb_main', 'meetbot');
-- --店铺16_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D16' LIMIT 1), 'marketing_D16', NULL, 1, 'marketing_ctwa_analytics_D16', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D16', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D16', 'mb_main', 'marketing_ctwa_analytics_D16', 'mb_main', 'meetbot');
-- --店铺17_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D17' LIMIT 1), 'marketing_D17', NULL, 1, 'marketing_ctwa_analytics_D17', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D17', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D17', 'mb_main', 'marketing_ctwa_analytics_D17', 'mb_main', 'meetbot');
-- --店铺18_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D18' LIMIT 1), 'marketing_D18', NULL, 1, 'marketing_ctwa_analytics_D18', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D18', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D18', 'mb_main', 'marketing_ctwa_analytics_D18', 'mb_main', 'meetbot');
-- --店铺19_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D19' LIMIT 1), 'marketing_D19', NULL, 1, 'marketing_ctwa_analytics_D19', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D19', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D19', 'mb_main', 'marketing_ctwa_analytics_D19', 'mb_main', 'meetbot');
-- --店铺20_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D20' LIMIT 1), 'marketing_D20', NULL, 1, 'marketing_ctwa_analytics_D20', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D20', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D20', 'mb_main', 'marketing_ctwa_analytics_D20', 'mb_main', 'meetbot');
-- --店铺21_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D21' LIMIT 1), 'marketing_D21', NULL, 1, 'marketing_ctwa_analytics_D21', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D21', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D21', 'mb_main', 'marketing_ctwa_analytics_D21', 'mb_main', 'meetbot');
-- --店铺22_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D22' LIMIT 1), 'marketing_D22', NULL, 1, 'marketing_ctwa_analytics_D22', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D22', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D22', 'mb_main', 'marketing_ctwa_analytics_D22', 'mb_main', 'meetbot');
-- --店铺23_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D23' LIMIT 1), 'marketing_D23', NULL, 1, 'marketing_ctwa_analytics_D23', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D23', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D23', 'mb_main', 'marketing_ctwa_analytics_D23', 'mb_main', 'meetbot');
-- --店铺24_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D24' LIMIT 1), 'marketing_D24', NULL, 1, 'marketing_ctwa_analytics_D24', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D24', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D24', 'mb_main', 'marketing_ctwa_analytics_D24', 'mb_main', 'meetbot');
-- --店铺25_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D25' LIMIT 1), 'marketing_D25', NULL, 1, 'marketing_ctwa_analytics_D25', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D25', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D25', 'mb_main', 'marketing_ctwa_analytics_D25', 'mb_main', 'meetbot');
-- --店铺26_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D26' LIMIT 1), 'marketing_D26', NULL, 1, 'marketing_ctwa_analytics_D26', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D26', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D26', 'mb_main', 'marketing_ctwa_analytics_D26', 'mb_main', 'meetbot');
-- --店铺27_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D27' LIMIT 1), 'marketing_D27', NULL, 1, 'marketing_ctwa_analytics_D27', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D27', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D27', 'mb_main', 'marketing_ctwa_analytics_D27', 'mb_main', 'meetbot');
-- --店铺28_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D28' LIMIT 1), 'marketing_D28', NULL, 1, 'marketing_ctwa_analytics_D28', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D28', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D28', 'mb_main', 'marketing_ctwa_analytics_D28', 'mb_main', 'meetbot');
-- --店铺29_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D29' LIMIT 1), 'marketing_D29', NULL, 1, 'marketing_ctwa_analytics_D29', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D29', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D29', 'mb_main', 'marketing_ctwa_analytics_D29', 'mb_main', 'meetbot');
-- --店铺30_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D30' LIMIT 1), 'marketing_D30', NULL, 1, 'marketing_ctwa_analytics_D30', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D30', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D30', 'mb_main', 'marketing_ctwa_analytics_D30', 'mb_main', 'meetbot');
-- --店铺31_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D31' LIMIT 1), 'marketing_D31', NULL, 1, 'marketing_ctwa_analytics_D31', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D31', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D31', 'mb_main', 'marketing_ctwa_analytics_D31', 'mb_main', 'meetbot');
-- --店铺32_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D32' LIMIT 1), 'marketing_D32', NULL, 1, 'marketing_ctwa_analytics_D32', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D32', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D32', 'mb_main', 'marketing_ctwa_analytics_D32', 'mb_main', 'meetbot');
-- --店铺33_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D33' LIMIT 1), 'marketing_D33', NULL, 1, 'marketing_ctwa_analytics_D33', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D33', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D33', 'mb_main', 'marketing_ctwa_analytics_D33', 'mb_main', 'meetbot');
-- --店铺34_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D34' LIMIT 1), 'marketing_D34', NULL, 1, 'marketing_ctwa_analytics_D34', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D34', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D34', 'mb_main', 'marketing_ctwa_analytics_D34', 'mb_main', 'meetbot');
-- --店铺35_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D35' LIMIT 1), 'marketing_D35', NULL, 1, 'marketing_ctwa_analytics_D35', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D35', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D35', 'mb_main', 'marketing_ctwa_analytics_D35', 'mb_main', 'meetbot');
-- --店铺36_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D36' LIMIT 1), 'marketing_D36', NULL, 1, 'marketing_ctwa_analytics_D36', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D36', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D36', 'mb_main', 'marketing_ctwa_analytics_D36', 'mb_main', 'meetbot');
-- --店铺37_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D37' LIMIT 1), 'marketing_D37', NULL, 1, 'marketing_ctwa_analytics_D37', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D37', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D37', 'mb_main', 'marketing_ctwa_analytics_D37', 'mb_main', 'meetbot');
-- --店铺38_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D38' LIMIT 1), 'marketing_D38', NULL, 1, 'marketing_ctwa_analytics_D38', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D38', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D38', 'mb_main', 'marketing_ctwa_analytics_D38', 'mb_main', 'meetbot');
-- --店铺39_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D39' LIMIT 1), 'marketing_D39', NULL, 1, 'marketing_ctwa_analytics_D39', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D39', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D39', 'mb_main', 'marketing_ctwa_analytics_D39', 'mb_main', 'meetbot');
-- --店铺40_营销与推广_CTWA分析
INSERT INTO `sino_sso`.`menu_permission_info` ( `menu_name`, `menu_description`, `menu_url`, `menu_order`, `parent_id`, `parent_code`, `menu_icon`, `menu_status`, `menu_code`, `module`, `application` )
VALUES
        ( 'CTWA分析', '店铺-营销与推广-CTWA分析', '', 17, (SELECT t.id FROM `sino_sso`.`menu_permission_info` AS t WHERE t.application = 'meetbot' AND t.module = 'mb_main' AND t.`menu_code` = 'marketing_D40' LIMIT 1), 'marketing_D40', NULL, 1, 'marketing_ctwa_analytics_D40', 'mb_main', 'meetbot' );
INSERT INTO `sino_sso`.`permission_info` (`permission_name`, `permission_type`, `permission_description`, `module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D40', 'PAGE', '店铺-营销与推广-CTWA分析', 'mb_main', 'meetbot');
INSERT INTO `sino_sso`.`menu_page_mapping` (`menu_code`, `menu_module`, `page_code`, `page_module`, `application`)
VALUES
        ('marketing_ctwa_analytics_D40', 'mb_main', 'marketing_ctwa_analytics_D40', 'mb_main', 'meetbot');
```
### Meetbot DML
```
-- 店铺级别全量菜单
INSERT INTO `rapture_gce`.`rp_platform_full_menu_template` (`type`, `menu_name`, `menu_code`, `parent_menu_code`, `menu_order`) VALUES (2, 'CTWA分析', 'marketing_ctwa_analytics', 'marketing', 17);

-- 定制版(API)
INSERT INTO `rapture_gce`.`rp_platform_menu_template` (`business_type`, `business_id`, `menu_name`, `menu_code`, `parent_menu_code`, `menu_order`) VALUES (2, (SELECT t.id FROM `rapture_gce`.`rp_platform_sell_version` AS t WHERE t.`type` = 2 AND t.`code` = 'CUSTOMIZE_API' LIMIT 1), 'CTWA分析', 'marketing_ctwa_analytics', 'marketing', 17);

-- 企业版功能
INSERT INTO `rapture_gce`.`rp_platform_menu_template` (`business_type`, `business_id`, `menu_name`, `menu_code`, `parent_menu_code`, `menu_order`) VALUES (2, (SELECT t.id FROM `rapture_gce`.`rp_platform_sell_version` AS t WHERE t.`type` = 2 AND t.`code` = 'ENTERPRISE_EDITION' LIMIT 1), 'CTWA分析', 'marketing_ctwa_analytics', 'marketing', 17);

-- 免费版
INSERT INTO `rapture_gce`.`rp_platform_menu_template` (`business_type`, `business_id`, `menu_name`, `menu_code`, `parent_menu_code`, `menu_order`) VALUES (2, (SELECT t.id FROM `rapture_gce`.`rp_platform_sell_version` AS t WHERE t.`type` = 2 AND t.`code` = 'FREE_EDITION' LIMIT 1), 'CTWA分析', 'marketing_ctwa_analytics', 'marketing', 17);

-- 新手版
INSERT INTO `rapture_gce`.`rp_platform_menu_template` (`business_type`, `business_id`, `menu_name`, `menu_code`, `parent_menu_code`, `menu_order`) VALUES (2, (SELECT t.id FROM `rapture_gce`.`rp_platform_sell_version` AS t WHERE t.`type` = 2 AND t.`code` = 'TIRO_EDITION' LIMIT 1), 'CTWA分析', 'marketing_ctwa_analytics', 'marketing', 17);

-- 试用版
INSERT INTO `rapture_gce`.`rp_platform_menu_template` (`business_type`, `business_id`, `menu_name`, `menu_code`, `parent_menu_code`, `menu_order`) VALUES (2, (SELECT t.id FROM `rapture_gce`.`rp_platform_sell_version` AS t WHERE t.`type` = 2 AND t.`code` = 'TRIAL_EDITION' LIMIT 1), 'CTWA分析', 'marketing_ctwa_analytics', 'marketing', 17);

-- 体验版
INSERT INTO `rapture_gce`.`rp_platform_menu_template` (`business_type`, `business_id`, `menu_name`, `menu_code`, `parent_menu_code`, `menu_order`) VALUES (2, (SELECT t.id FROM `rapture_gce`.`rp_platform_sell_version` AS t WHERE t.`type` = 2 AND t.`code` = 'TRIAL_NEW_EDITION' LIMIT 1), 'CTWA分析', 'marketing_ctwa_analytics', 'marketing', 17);

-- 行业版
INSERT INTO `rapture_gce`.`rp_platform_menu_template` (`business_type`, `business_id`, `menu_name`, `menu_code`, `parent_menu_code`, `menu_order`) VALUES (2, (SELECT t.id FROM `rapture_gce`.`rp_platform_sell_version` AS t WHERE t.`type` = 2 AND t.`code` = 'INDUSTRY' LIMIT 1), 'CTWA分析', 'marketing_ctwa_analytics', 'marketing', 17);

-- 专业版
INSERT INTO `rapture_gce`.`rp_platform_menu_template` (`business_type`, `business_id`, `menu_name`, `menu_code`, `parent_menu_code`, `menu_order`) VALUES (2, (SELECT t.id FROM `rapture_gce`.`rp_platform_sell_version` AS t WHERE t.`type` = 2 AND t.`code` = 'PRO' LIMIT 1), 'CTWA分析', 'marketing_ctwa_analytics', 'marketing', 17);
```
### 数据库变更
**ctwa_conversion_attribution.referral_source_id**  
```
ALTER TABLE `ctwa_conversion_attribution`
  ADD COLUMN `referral_source_id` varchar(64) NOT NULL DEFAULT ''
    COMMENT 'Facebook 广告 ID，与 extend_info.referralSourceId 双写'
    AFTER `order_time`,
  ADD KEY `idx_store_referral_order_time` (`store_id`, `referral_source_id`, `order_time`);

UPDATE `ctwa_conversion_attribution`
SET `referral_source_id` = JSON_UNQUOTE(JSON_EXTRACT(`extend_info`, '$.referralSourceId')),
    `update_time` = `update_time`
WHERE `is_deleted` = 0
  AND `referral_source_id` = ''
  AND JSON_EXTRACT(`extend_info`, '$.referralSourceId') IS NOT NULL
  AND JSON_UNQUOTE(JSON_EXTRACT(`extend_info`, '$.referralSourceId')) <> '';
  
  
 **ALTER** **TABLE** `ctwa_conversion_attribution`
  **ADD** **COLUMN** <u>`channel`</u> **varchar**(32) **NOT** **NULL** **DEFAULT** 'shopify'
    COMMENT '业务渠道枚举码：shopify / custom，见 CtwaConversionChannel'
    **AFTER** **`type`**;

**UPDATE** `ctwa_conversion_attribution`
**SET** <u>`channel`</u> = 'custom'
**WHERE** `is_deleted` = 0
  **AND** `type` = 2;
```
**说明**：开放 CTWA 转化 API **不落库**，**不新增 ****source**** 列**。  
- **新增 DDL**：`ctwa_conversation_record`（见上，含 `ad_id` / `ctwa_clid` / `user_id` / `wa_referral_id`）
- 不涉及现有表改列；归因 type / 自建 event_type 仅 Java 枚举（按是否做自建事件归因决定）
**ctwa_conversation_record表**  
```
CREATE TABLE `ctwa_conversation_record` (
  `id`                 bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `store_id`           bigint unsigned NOT NULL COMMENT '店铺ID',
  `entry_id`           varchar(128)    NOT NULL DEFAULT '' COMMENT '入站消息ID，幂等',
  `wa_referral_id`     bigint unsigned NOT NULL DEFAULT '0' COMMENT '关联 wa_referral_info.id',
  `ad_id`              varchar(64)     NOT NULL DEFAULT '' COMMENT 'CTWA广告ID，来自referral.sourceId',
  `ctwa_clid`          varchar(255)    NOT NULL DEFAULT '' COMMENT 'CTWA点击ID，来自referral.ctwaClid',
  `ad_account_id`      varchar(64)     NOT NULL DEFAULT '' COMMENT 'Facebook广告账号ID，写入时回填',
  `ad_group_id`      varchar(64)     NOT NULL DEFAULT '' COMMENT 'Facebook广告组ID，写入时回填',
  `ad_campaign_id`      varchar(64)     NOT NULL DEFAULT '' COMMENT 'Facebook广告系列ID，写入时回填',
  `event_time`         datetime        NOT NULL COMMENT '消息时间UTC',
  `date_in_account_tz` varchar(10)      NOT NULL DEFAULT '' COMMENT '广告账号时区日期yyyy-MM-dd',
  `user_id`            varchar(64)     NOT NULL DEFAULT '' COMMENT '渠道用户ID，来自message.from/sender',
  `conversation_id`    varchar(128)    NOT NULL DEFAULT '' COMMENT '会话ID',
  `create_time`        datetime        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time`        datetime        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted`         tinyint(1)      NOT NULL DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_entry_id` (`entry_id`),
  KEY `idx_store_account_date` (`store_id`, `ad_account_id`, `date_in_account_tz`),
  KEY `idx_wa_referral_id` (`wa_referral_id`),
  KEY `idx_ad_id` (`ad_id`),
  KEY `idx_ctwa_clid` (`ctwa_clid`),
  KEY `idx_conversation_id` (`conversation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CTWA会话统计记录（看板用）';
```
### 配置变更
#### Topic 变更
<table>
<tr>
<td>Topic 名称  </td>
<td>环境  </td>
<td>说明  </td>
</tr>
<tr>
<td>`ctwa.shopify.user.behavior.trigger.topic`（Apollo 默认 `ctwaShopifyUbTrigger`）  </td>
<td>全部  </td>
<td>**新建 Topic**。运行时经 `MultipleEnvManager.getVersioningKey()` 拼接环境前缀（如 `prod_ctwaShopifyUbTrigger`）。Consumer Group: `meetbot_core_ctwa_conversion_ub`。Producer: `ShopifyUserBehaviorKafkaProducer`（meetbot-core-service）；Consumer: `CtwaConversionNonPurchasePersistListener`（meetbot-core-service）。Shopify 加购/结算用户行为触发 CTWA 归因落库。  </td>
</tr>
</table>
<table>
<tr>
<td>配置项  </td>
<td>环境  </td>
<td>说明  </td>
</tr>
<tr>
<td>`meetbot.proxy.rules.ctwa-conversion`  </td>
<td>全部  </td>
<td>开放转化转发 YAML（见上）  </td>
</tr>
<tr>
<td>`es.ctwa.ad.stats.*`  </td>
<td>全部  </td>
<td>指标索引名 + `mb_ads_fb_ad_dim` + timeout  </td>
</tr>
<tr>
<td>`es.ctwa.ad.stats.query.timeout`  </td>
<td>全部  </td>
<td>如 5000  </td>
</tr>
<tr>
<td>`shopify.ctwa.nonpurchase.consumer.enabled`  </td>
<td>全部  </td>
<td>true  </td>
</tr>
<tr>
<td>`ctwa.conversation.tz-backfill.enabled`  </td>
<td>全部  </td>
<td>true  </td>
</tr>
<tr>
<td>`ctwa.conversation.tz-backfill.cron`  </td>
<td>全部  </td>
<td>每天 6:00 / 13:00 / 19:00（`0 0 6,13,19 * * ?`）  </td>
</tr>
<tr>
<td>`ctwa.conversation.tz-backfill.page-size`  </td>
<td>全部  </td>
<td>200  </td>
</tr>
<tr>
<td>`ctwa.conversation.tz-backfill.max-pages-per-run`  </td>
<td>全部  </td>
<td>50  </td>
</tr>
</table>
### 定时任务变更
<table>
<tr>
<td>定时任务  </td>
<td>Cron  </td>
<td>触发 curl  </td>
<td>描述  </td>
</tr>
<tr>
<td>date_in_account_tz 补偿  </td>
<td>`0 0 6,13,19 * * ?`  </td>
<td>`curl -X GET http://meetbot-core-service/channel/whatsapp/inner/backfillCtwaConvTz`  </td>
<td>扫描 `ctwa_conversation_record` 中 `date_in_account_tz=''` 的行，查 ES `mb_ads_fb_ad_dim` 回填时区日与账号维度。分布式锁 `CTWA_CONVERSATION_TZ_BACKFILL_TASK_LOCK`。游标分页，单次最多 `max-pages-per-run` 页。  </td>
</tr>
</table>
### 发布顺序
15. meetbot-commons（枚举，若需要）
16. meetbot-core-service（会话落库、归因、CAPI、看板、DTO/Feign/ReferralSaveDto）
17. **执行 DDL**`ctwa_conversation_record`
18. meetbot-data-analysis（Shopify 非购买 / referralSave 透传）
19. **meetbot-channel-receive**（发布 proxy YAML / Apollo）
20. 涉及 client 依赖更新：是（commons/core-client）
21. 涉及 DB 迁移：是（会话表）
22. 涉及配置推送：是（Apollo：ES + proxy + consumer 开关 + tz-backfill）
### 回滚方案
- 代码：revert feature 分支
- 数据：`DELETE FROM ctwa_conversion_attribution WHERE type IN (3,4,5,6)`；会话表可停写后视情况 DROP/保留
- 配置：Apollo 回退 `ctwa-conversion` 规则与 ES/consumer 配置
- 前提：确认 CAPI 队列清空；开放转发下线即去掉 proxy 规则即可（无业务落库）
### 自测清单
- [ ] Shopify 加购/结算归因 + CAPI 回传
- [ ] 会话采集：CTWA 进线写 `ctwa_conversation_record`（含 `ad_id`/`ctwa_clid`/`user_id`），重复 entry 幂等
- [ ] 时区补偿：dim 缺失时先空 `date_in_account_tz`；dim 就绪后定时任务按 max id 分页回填；仍缺失则下轮再扫
- [ ] 开放 API：`POST /v1/ctwa/conversion/events` 转发 Meta 成功；错误码透传；**无**归因表新行
- [ ] 看板指标/趋势/明细/导出
- [ ] 空店铺 / 授权过期态
- [ ] 重复转化幂等去重
---
<table>
<tr>
<td>项  </td>
<td>说明  </td>
</tr>
<tr>
<td>列  </td>
<td>`referral_source_id`，与 JSON 双写  </td>
</tr>
<tr>
<td>回填  </td>
<td>一条 UPDATE  </td>
</tr>
<tr>
<td>明细维度  </td>
<td>授权账号 → ES ad_id → MySQL  </td>
</tr>
<tr>
<td>分页  </td>
<td>游标 lastTime+lastId  </td>
</tr>
</table>
- Handler 仅 before 校验，无 after 落库
- 看板回传明细仅 `source=0` 我方归因
详见 `docs/superpowers/specs/2026-07-21-ctwa-referral-source-id-and-openapi-no-persist.md`  
