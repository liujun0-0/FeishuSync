# Meta API 文档
---
# 文档
> **来源需求文档**: 代理API封装需求说明书.md  
## 需求概述
**版本**: V1.0 &nbsp;|&nbsp; **产品经理**: 费俊文 &nbsp;|&nbsp; **最近修改**: 2026-06-24 &nbsp;|&nbsp; **需求级别**: S  
**业务背景**: 2026 年 Meetbot 升级战略定位，商业化目标重点转向消耗量考核。结合竞品调研，需丰富提升消耗的内容形态；Catalog 和 Flow 属于客户高频使用场景。  
**业务价值**:  
- **Catalog 代理 API**: 支持游戏、大型电商客户调用后实现商品展示 → 支付闭环
- **Flow 代理 API**: 支持金融 KYC 场景
**需求范围**: Catalog + Flow（代理 API 支持客户业务场景闭环）  
## 名词解释
<table>
<tr>
<td>术语  </td>
<td>说明  </td>
</tr>
<tr>
<td>Catalog  </td>
<td>来源于 Meta 定义，可类比微信小店概念  </td>
</tr>
<tr>
<td>Flow  </td>
<td>Meta 提供的前端展示组件  </td>
</tr>
</table>
## API 能力清单（对照需求说明书）
<table>
<tr>
<td>模块  </td>
<td>序号  </td>
<td>API 功能  </td>
<td>接入计划  </td>
<td>本文档章节  </td>
</tr>
<tr>
<td>Catalog  </td>
<td>1  </td>
<td>单个目录增、删、读取  </td>
<td>7 月  </td>
<td>§1  </td>
</tr>
<tr>
<td>Catalog  </td>
<td>2  </td>
<td>批量管理目录  </td>
<td>7 月  </td>
<td>§2  </td>
</tr>
<tr>
<td>Catalog  </td>
<td>3  </td>
<td>目录商品审核状态查询（申诉）  </td>
<td>7 月  </td>
<td>§3  </td>
</tr>
<tr>
<td>Catalog  </td>
<td>4  </td>
<td>商品信息库（批量管理商品）  </td>
<td>7 月  </td>
<td>§4  </td>
</tr>
<tr>
<td>Catalog  </td>
<td>5  </td>
<td>商品（单个管理商品）  </td>
<td>7 月  </td>
<td>§5  </td>
</tr>
<tr>
<td>Catalog  </td>
<td>6  </td>
<td>多件商品消息  </td>
<td>7 月  </td>
<td>§6  </td>
</tr>
<tr>
<td>Catalog  </td>
<td>7  </td>
<td>MPM 模板消息  </td>
<td>7 月  </td>
<td>§7  </td>
</tr>
<tr>
<td>Catalog  </td>
<td>8  </td>
<td>商品轮播消息  </td>
<td>7 月  </td>
<td>§8  </td>
</tr>
<tr>
<td>Catalog  </td>
<td>9  </td>
<td>商品卡片轮播模板消息  </td>
<td>7 月  </td>
<td>§9  </td>
</tr>
<tr>
<td>Catalog  </td>
<td>10  </td>
<td>单件商品消息  </td>
<td>7 月  </td>
<td>§10  </td>
</tr>
<tr>
<td>Catalog  </td>
<td>11  </td>
<td>SPM 模板消息  </td>
<td>7 月  </td>
<td>§11  </td>
</tr>
<tr>
<td>Flow  </td>
<td>1  </td>
<td>创建 Flow  </td>
<td>0702  </td>
<td>§1  </td>
</tr>
<tr>
<td>Flow  </td>
<td>2  </td>
<td>更新 Flow 基础信息  </td>
<td>0702  </td>
<td>§2  </td>
</tr>
<tr>
<td>Flow  </td>
<td>3  </td>
<td>更新 Flows JSON  </td>
<td>0702  </td>
<td>§3  </td>
</tr>
<tr>
<td>Flow  </td>
<td>4  </td>
<td>网页预览可视化 Flow  </td>
<td>0702  </td>
<td>§4  </td>
</tr>
<tr>
<td>Flow  </td>
<td>5  </td>
<td>发布 Flow  </td>
<td>0702  </td>
<td>§5  </td>
</tr>
<tr>
<td>Flow  </td>
<td>6  </td>
<td>停用 Flow  </td>
<td>0702  </td>
<td>§6  </td>
</tr>
<tr>
<td>Flow  </td>
<td>7  </td>
<td>WABA 之间迁移 Flow  </td>
<td>0702  </td>
<td>§7  </td>
</tr>
<tr>
<td>Flow  </td>
<td>8  </td>
<td>删除 Flow（DRAFT 状态可删）  </td>
<td>0702  </td>
<td>§8  </td>
</tr>
<tr>
<td>Flow  </td>
<td>9  </td>
<td>检索 WABA 下的 Flow 清单  </td>
<td>0702  </td>
<td>§9  </td>
</tr>
<tr>
<td>Flow  </td>
<td>10  </td>
<td>检索 Flow 详情  </td>
<td>0702  </td>
<td>§10  </td>
</tr>
<tr>
<td>Flow  </td>
<td>11  </td>
<td>检索 Flow 附加的所有资产  </td>
<td>0702  </td>
<td>§11  </td>
</tr>
</table>
---
# 一、Catalog 模块
**接入计划**: 7 月份接入  
**说明**: 商品目录为 Meta 无界媒体渠道电商公用资产；WhatsApp 私域电商以单/多商品发送场景为主，本文档覆盖需求说明书所列 11 项 Catalog API。  
---
## 1. 单个目录增、删、读取
**参考文档**: [https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog](https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog)  
**功能**: 代表可用于投放带有动态广告的广告的企业目录，支持创建、读取、更新、删除。  
### 创建目录
**端点**: POST `/{business_id}/product_catalogs`  
**请求示例**:  
```
curl -X POST \
  -F 'name=My Product Catalog' \
  -F 'vertical=commerce' \
  -F 'additional_vertical_option=LOCAL_DA_CATALOG' \
  -F 'business_metadata={"partner_id":"123","partner_name":"Shopify"}' \
  -F 'catalog_segment_filter={"product_type":{"i_contains":"shirt"}}' \
  -F 'da_display_settings={"catalog_segment_use_case":"GENERAL","crop_and_scale_center_crop":{"height":500,"width":500}}' \
  -F 'destination_catalog_settings={"allow_search_listing":true,"booking_window":{"min":1,"max":365}}' \
  -F 'flight_catalog_settings={"departure_airport":"JFK","destination_airport":"LAX","cabin_class":"ECONOMY"}' \
  -F 'parent_catalog_id=PARENT_CATALOG_ID' \
  -F 'partner_integration={"partner":"Shopify","version":"2.0","store_id":"store_123"}' \
  -F 'store_catalog_settings={"store_ids":["STORE_1","STORE_2"],"store_address":{"street":"123 Main St","city":"New York","state":"NY","country":"US","postal_code":"10001"}}' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/<API_VERSION>/<BUSINESS_ID>/product_catalogs
```
**参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>必填  </td>
<td>默认值  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>name  </td>
<td>string  </td>
<td>**是**  </td>
<td>-  </td>
<td>目录名称  </td>
<td>"My Product Catalog"  </td>
</tr>
<tr>
<td>vertical  </td>
<td>enum  </td>
<td>否  </td>
<td>commerce  </td>
<td>目录行业  </td>
<td>"commerce"  </td>
</tr>
<tr>
<td>additional_vertical_option  </td>
<td>enum  </td>
<td>否  </td>
<td>-  </td>
<td>LOCAL_DA_CATALOG / LOCAL_PRODUCTS  </td>
<td>"LOCAL_DA_CATALOG"  </td>
</tr>
<tr>
<td>business_metadata  </td>
<td>JSON  </td>
<td>否  </td>
<td>-  </td>
<td>商家元数据  </td>
<td>{"partner_id":"123","partner_name":"Shopify"}  </td>
</tr>
<tr>
<td>catalog_segment_filter  </td>
<td>JSON  </td>
<td>否  </td>
<td>-  </td>
<td>细分目录筛选（WCA 规则）  </td>
<td>{"product_type":{"i_contains":"shirt"}}  </td>
</tr>
<tr>
<td>da_display_settings  </td>
<td>object  </td>
<td>否  </td>
<td>-  </td>
<td>动态广告展示设置  </td>
<td>{"catalog_segment_use_case":"GENERAL"}  </td>
</tr>
<tr>
<td>destination_catalog_settings  </td>
<td>JSON  </td>
<td>否  </td>
<td>-  </td>
<td>目的地目录设置  </td>
<td>{"allow_search_listing":true}  </td>
</tr>
<tr>
<td>flight_catalog_settings  </td>
<td>JSON  </td>
<td>否  </td>
<td>-  </td>
<td>航班目录设置  </td>
<td>{"departure_airport":"JFK"}  </td>
</tr>
<tr>
<td>parent_catalog_id  </td>
<td>numeric string  </td>
<td>否  </td>
<td>-  </td>
<td>父目录编号  </td>
<td>"123456789"  </td>
</tr>
<tr>
<td>partner_integration  </td>
<td>JSON  </td>
<td>否  </td>
<td>-  </td>
<td>合作伙伴集成  </td>
<td>{"partner":"Shopify","version":"2.0"}  </td>
</tr>
<tr>
<td>store_catalog_settings  </td>
<td>JSON  </td>
<td>否  </td>
<td>-  </td>
<td>商店目录设置  </td>
<td>{"store_ids":["STORE_1"]}  </td>
</tr>
</table>
**响应示例**:  
```
{
  "id": "1234567890123456"
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>id  </td>
<td>string  </td>
<td>新创建的目录 ID  </td>
<td>"1234567890123456"  </td>
</tr>
</table>
### 读取目录
**端点**: GET `/{business_id}/owned_product_catalogs`  
**请求示例**:  
```
curl -G \
  -d 'segment_use_cases=["GENERAL","COMMERCE"]' \
  -d 'fields=["id","name","business","vertical","product_count","feed_count","default_image_url","fallback_image_url","da_display_settings","is_catalog_segment","is_local_catalog"]' \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/<API_VERSION>/<BUSINESS_ID>/owned_product_catalogs
```
**参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>segment_use_cases  </td>
<td>array<enum>  </td>
<td>细分用例：GENERAL, COMMERCE, COLLAB_ADS, IG_SHOPPING 等  </td>
<td>["GENERAL","COMMERCE"]  </td>
</tr>
<tr>
<td>fields  </td>
<td>array<string>  </td>
<td>返回字段列表  </td>
<td>["id","name","product_count"]  </td>
</tr>
</table>
**返回字段**: id, name, business, vertical, product_count, feed_count, default_image_url, fallback_image_url, da_display_settings, is_catalog_segment, is_local_catalog  
**响应示例**:  
```
{
  "data": [
    {
      "id": "123456789",
      "name": "My Catalog",
      "business": "987654321",
      "vertical": "commerce",
      "product_count": 1500,
      "feed_count": 3,
      "default_image_url": "https://example.com/default.jpg",
      "fallback_image_url": "https://example.com/fallback.jpg",
      "is_catalog_segment": false,
      "is_local_catalog": false
    }
  ],
  "paging": {
    "cursors": {
      "before": "MAZDZD",
      "after": "NEXTZDZD"
    }
  }
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>data  </td>
<td>array  </td>
<td>目录列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>data[].id  </td>
<td>string  </td>
<td>目录 ID  </td>
<td>"123456789"  </td>
</tr>
<tr>
<td>data[].name  </td>
<td>string  </td>
<td>目录名称  </td>
<td>"My Catalog"  </td>
</tr>
<tr>
<td>data[].business  </td>
<td>string  </td>
<td>所属 Business ID  </td>
<td>"987654321"  </td>
</tr>
<tr>
<td>data[].vertical  </td>
<td>string  </td>
<td>目录行业 vertical  </td>
<td>"commerce"  </td>
</tr>
<tr>
<td>data[].product_count  </td>
<td>integer  </td>
<td>目录内商品数量  </td>
<td>1500  </td>
</tr>
<tr>
<td>data[].feed_count  </td>
<td>integer  </td>
<td>关联信息库数量  </td>
<td>3  </td>
</tr>
<tr>
<td>data[].default_image_url  </td>
<td>string  </td>
<td>默认图片 URL  </td>
<td>"https://example.com/default.jpg"  </td>
</tr>
<tr>
<td>data[].fallback_image_url  </td>
<td>string  </td>
<td>后备图片 URL  </td>
<td>"https://example.com/fallback.jpg"  </td>
</tr>
<tr>
<td>data[].da_display_settings  </td>
<td>object  </td>
<td>动态广告展示设置  </td>
<td>{"catalog_segment_use_case":"GENERAL"}  </td>
</tr>
<tr>
<td>data[].is_catalog_segment  </td>
<td>boolean  </td>
<td>是否为细分目录  </td>
<td>false  </td>
</tr>
<tr>
<td>data[].is_local_catalog  </td>
<td>boolean  </td>
<td>是否为本地目录  </td>
<td>false  </td>
</tr>
<tr>
<td>paging  </td>
<td>object  </td>
<td>分页信息  </td>
<td>{...}  </td>
</tr>
<tr>
<td>paging.cursors.before  </td>
<td>string  </td>
<td>上一页游标  </td>
<td>"MAZDZD"  </td>
</tr>
<tr>
<td>paging.cursors.after  </td>
<td>string  </td>
<td>下一页游标  </td>
<td>"NEXTZDZD"  </td>
</tr>
</table>
### 更新目录
**端点**: POST `/{product_catalog_id}`  
**请求示例**:  
```
curl -X POST \
  -F 'name=Updated Catalog Name' \
  -F 'default_image_url=https://example.com/new_default.jpg' \
  -F 'fallback_image_url=https://example.com/new_fallback.jpg' \
  -F 'da_display_settings={"catalog_segment_use_case":"GENERAL","crop_and_scale_center_crop":{"height":600,"width":600}}' \
  -F 'additional_vertical_option=LOCAL_PRODUCTS' \
  -F 'destination_catalog_settings={"allow_search_listing":false,"booking_window":{"min":7,"max":180}}' \
  -F 'flight_catalog_settings={"departure_airport":"LAX","destination_airport":"SFO","cabin_class":"BUSINESS"}' \
  -F 'store_catalog_settings={"store_ids":["STORE_3"],"store_address":{"street":"456 Oak Ave","city":"Los Angeles","state":"CA","country":"US","postal_code":"90001"}}' \
  -F 'partner_integration={"partner":"WooCommerce","version":"3.0","store_id":"store_456"}' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/<API_VERSION>/<PRODUCT_CATALOG_ID>
```
**参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>name  </td>
<td>string  </td>
<td>目录名称  </td>
<td>"Updated Catalog Name"  </td>
</tr>
<tr>
<td>default_image_url  </td>
<td>URI  </td>
<td>默认图片网址  </td>
<td>https://example.com/new_default.jpg  </td>
</tr>
<tr>
<td>fallback_image_url  </td>
<td>URI  </td>
<td>后备图片网址  </td>
<td>https://example.com/new_fallback.jpg  </td>
</tr>
<tr>
<td>da_display_settings  </td>
<td>object  </td>
<td>图片显示设置  </td>
<td>{"catalog_segment_use_case":"GENERAL"}  </td>
</tr>
<tr>
<td>additional_vertical_option  </td>
<td>enum  </td>
<td>LOCAL_DA_CATALOG / LOCAL_PRODUCTS  </td>
<td>"LOCAL_PRODUCTS"  </td>
</tr>
<tr>
<td>destination_catalog_settings  </td>
<td>JSON  </td>
<td>目的地目录设置  </td>
<td>{"allow_search_listing":false}  </td>
</tr>
<tr>
<td>flight_catalog_settings  </td>
<td>JSON  </td>
<td>航班目录设置  </td>
<td>{"departure_airport":"LAX"}  </td>
</tr>
<tr>
<td>store_catalog_settings  </td>
<td>JSON  </td>
<td>商店目录设置  </td>
<td>{"store_ids":["STORE_3"]}  </td>
</tr>
<tr>
<td>partner_integration  </td>
<td>JSON  </td>
<td>合作伙伴集成  </td>
<td>{"partner":"WooCommerce"}  </td>
</tr>
</table>
**响应示例**:  
```
{
  "success": true
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>success  </td>
<td>boolean  </td>
<td>是否成功更新目录  </td>
<td>true  </td>
</tr>
</table>
### 删除目录
**端点**: DELETE `/{product_catalog_id}`  
```
curl -X DELETE \
  -F 'allow_delete_catalog_with_live_product_set=true' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/<API_VERSION>/<PRODUCT_CATALOG_ID>
```
**参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>默认值  </td>
<td>描述  </td>
</tr>
<tr>
<td>allow_delete_catalog_with_live_product_set  </td>
<td>boolean  </td>
<td>false  </td>
<td>设为 true 时即使有已发布的商品系列也执行删除  </td>
</tr>
</table>
**响应示例**:  
```
{
  "success": true
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>success  </td>
<td>boolean  </td>
<td>是否成功更新目录  </td>
<td>true  </td>
</tr>
</table>
### 关联/解除关联外部事件源
**关联事件源**:  
**关联参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>external_event_sources  </td>
<td>array  </td>
<td>Pixel ID 或 App ID 列表  </td>
<td>["123456789","987654321"]  </td>
</tr>
</table>
```
curl -F 'external_event_sources=[<PIXEL_ID>,<APP_ID>]' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/<VERSION>/<PRODUCT_CATALOG_ID>/external_event_sources
```
**响应示例**:  
```
{
  "success": true
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>success  </td>
<td>boolean  </td>
<td>关联/解除关联是否成功  </td>
<td>true  </td>
</tr>
</table>
**查看关联事件源**:  
```
curl -G -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/<API_VERSION>/<PRODUCT_CATALOG_ID>/external_event_sources
```
**响应示例**:  
```
{
  "data": [
    {
      "id": "123456789",
      "type": "PIXEL",
      "name": "My Pixel"
    }
  ]
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>data  </td>
<td>array  </td>
<td>已关联的外部事件源列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>data[].id  </td>
<td>string  </td>
<td>Pixel ID 或 App ID  </td>
<td>"123456789"  </td>
</tr>
<tr>
<td>data[].type  </td>
<td>string  </td>
<td>事件源类型：PIXEL / APP 等  </td>
<td>"PIXEL"  </td>
</tr>
<tr>
<td>data[].name  </td>
<td>string  </td>
<td>事件源名称  </td>
<td>"My Pixel"  </td>
</tr>
</table>
---
## 2. 批量管理目录
**参考文档**:  
**需求说明书参考**: [product-catalog/batch](https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog/batch)（旧版 batch 已弃用，推荐使用下方 items_batch 等新端点）  
- [https://developers.facebook.com/documentation/ads-commerce/catalog/guides/manage-catalog-items/catalog-batch-api](https://developers.facebook.com/documentation/ads-commerce/catalog/guides/manage-catalog-items/catalog-batch-api)（指南）
- [https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog/items_batch](https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog/items_batch)（API 参考）
- [https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog/localized_items_batch](https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog/localized_items_batch)（本地化批处理）
- [https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog/check_batch_request_status](https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog/check_batch_request_status)（状态查询）
### 目录批处理 API 端点
<table>
<tr>
<td>端点  </td>
<td>描述  </td>
</tr>
<tr>
<td>POST `/{catalog_id}/items_batch`  </td>
<td>发送批处理请求（创建、更新、删除）  </td>
</tr>
<tr>
<td>POST `/{catalog_id}/localized_items_batch`  </td>
<td>对现有商品发送本地化批处理请求  </td>
</tr>
<tr>
<td>GET `/{catalog_id}/check_batch_request_status`  </td>
<td>检查批处理请求状态  </td>
</tr>
<tr>
<td>POST `/{product_catalog_id}/batch`  </td>
<td>（已弃用）旧版批量 API  </td>
</tr>
</table>
### POST /{catalog_id}/items_batch
**限制**: 最多 5,000 条记录（建议 3,000），Payload ≤ 28 MB  
**请求示例**:  
```
curl -i -X POST \
  'https://graph.facebook.com/<API_VERSION>/<catalog-id>/items_batch' \
  -F 'item_type=PRODUCT_ITEM' \
  -F 'requests=[
    {
      "method":"CREATE",
      "data": {
        "name":"Classic T-Shirt",
        "description":"Soft cotton t-shirt",
        "retailer_id":"sku_001",
        "image_url":"https://example.com/tshirt.jpg",
        "price":1999,
        "currency":"USD",
        "availability":"in stock",
        "brand":"MyBrand"
      }
    },
    {
      "method":"UPDATE",
      "data": {
        "retailer_id":"sku_001",
        "price":1799,
        "availability":"in stock"
      }
    },
    {
      "method":"DELETE",
      "data": {
        "retailer_id":"sku_002"
      }
    }
  ]' \
  -F 'access_token=<ACCESS_TOKEN>'
```
**参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>必填  </td>
<td>默认值  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>item_type  </td>
<td>string  </td>
<td>**是**  </td>
<td>-  </td>
<td>商品类型  </td>
<td>"PRODUCT_ITEM"  </td>
</tr>
<tr>
<td>requests  </td>
<td>JSON  </td>
<td>**是**  </td>
<td>-  </td>
<td>method: CREATE/UPDATE/DELETE + data  </td>
<td>[{"method":"CREATE","data":{"retailer_id":"sku_001","name":"T-Shirt"}}]  </td>
</tr>
<tr>
<td>allow_upsert  </td>
<td>boolean  </td>
<td>否  </td>
<td>true  </td>
<td>UPDATE 时不存在则创建  </td>
<td>true  </td>
</tr>
<tr>
<td>item_sub_type  </td>
<td>enum  </td>
<td>否  </td>
<td>EMPTY  </td>
<td>APPLIANCES, CLOTHING, ELECTRONICS 等  </td>
<td>"CLOTHING"  </td>
</tr>
</table>
**响应示例**:  
```
{
  "handles": ["batch-handle-12345"],
  "validation_status": [
    {
      "errors": [],
      "retailer_id": "sku_001",
      "warnings": []
    }
  ]
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>handles  </td>
<td>array  </td>
<td>批处理任务 handle，用于查询处理状态  </td>
<td>["batch-handle-12345"]  </td>
</tr>
<tr>
<td>validation_status  </td>
<td>array  </td>
<td>同步校验结果列表（异步处理时可能为空）  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>validation_status[].retailer_id  </td>
<td>string  </td>
<td>对应商品的 retailer_id  </td>
<td>"sku_001"  </td>
</tr>
<tr>
<td>validation_status[].errors  </td>
<td>array  </td>
<td>校验错误列表  </td>
<td>[]  </td>
</tr>
<tr>
<td>validation_status[].warnings  </td>
<td>array  </td>
<td>校验警告列表  </td>
<td>[]  </td>
</tr>
<tr>
<td>validation_status[].errors[].message  </td>
<td>string  </td>
<td>错误描述  </td>
<td>"Missing required field: price"  </td>
</tr>
</table>
### POST /{catalog_id}/localized_items_batch
**限制**: 仅操作已有商品，最多 5,000 条记录  
**请求示例**:  
```
curl -i -X POST \
  'https://graph.facebook.com/<API_VERSION>/<catalog-id>/localized_items_batch' \
  -F 'item_type=PRODUCT_ITEM' \
  -F 'requests=[
    {
      "method":"UPDATE",
      "data": {
        "retailer_id":"sku_001",
        "name":"Camiseta Clásica",
        "description":"Camiseta de algodón suave"
      },
      "localization": {
        "type":"LANGUAGE",
        "value":"es"
      }
    }
  ]' \
  -F 'access_token=<ACCESS_TOKEN>'
```
**参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>必填  </td>
<td>描述  </td>
</tr>
<tr>
<td>item_type  </td>
<td>string  </td>
<td>**是**  </td>
<td>商品类型（如 PRODUCT_ITEM）  </td>
</tr>
<tr>
<td>requests  </td>
<td>JSON  </td>
<td>**是**  </td>
<td>JSON 数组，每条含 method、data、localization  </td>
</tr>
</table>
**localization 格式**:  
```
{ "type": "LANGUAGE" | "COUNTRY" | "LANGUAGE_AND_COUNTRY", "value": "<代码>" }
```
**响应示例**:  
```
{
  "handles": ["localized-batch-handle-67890"],
  "validation_status": [
    {
      "errors": [],
      "retailer_id": "sku_001",
      "warnings": []
    }
  ]
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>handles  </td>
<td>array  </td>
<td>批处理任务 handle，用于查询处理状态  </td>
<td>["batch-handle-12345"]  </td>
</tr>
<tr>
<td>validation_status  </td>
<td>array  </td>
<td>同步校验结果列表（异步处理时可能为空）  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>validation_status[].retailer_id  </td>
<td>string  </td>
<td>对应商品的 retailer_id  </td>
<td>"sku_001"  </td>
</tr>
<tr>
<td>validation_status[].errors  </td>
<td>array  </td>
<td>校验错误列表  </td>
<td>[]  </td>
</tr>
<tr>
<td>validation_status[].warnings  </td>
<td>array  </td>
<td>校验警告列表  </td>
<td>[]  </td>
</tr>
<tr>
<td>validation_status[].errors[].message  </td>
<td>string  </td>
<td>错误描述  </td>
<td>"Missing required field: price"  </td>
</tr>
</table>
### GET /{catalog_id}/check_batch_request_status
**请求示例**:  
```
curl -G \
  -d 'handle=batch-handle-12345' \
  -d 'load_ids_of_invalid_requests=true' \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/<API_VERSION>/<catalog-id>/check_batch_request_status
```
**参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>必填  </td>
<td>默认值  </td>
<td>描述  </td>
</tr>
<tr>
<td>handle  </td>
<td>string  </td>
<td>**是**  </td>
<td>-  </td>
<td>items_batch 响应中的 handle  </td>
</tr>
<tr>
<td>load_ids_of_invalid_requests  </td>
<td>boolean  </td>
<td>否  </td>
<td>false  </td>
<td>是否填充 ids_of_invalid_requests  </td>
</tr>
</table>
**响应示例**:  
```
{
  "batch_status": "finished",
  "errors": [],
  "ids_of_invalid_requests": []
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>batch_status  </td>
<td>string  </td>
<td>批处理状态：in_progress / finished  </td>
<td>"finished"  </td>
</tr>
<tr>
<td>errors  </td>
<td>array  </td>
<td>批处理级别错误列表  </td>
<td>[]  </td>
</tr>
<tr>
<td>ids_of_invalid_requests  </td>
<td>array  </td>
<td>无效请求的 retailer_id 列表（需 load_ids_of_invalid_requests=true）  </td>
<td>[]  </td>
</tr>
</table>
### POST /{product_catalog_id}/batch（已弃用）
**请求示例**:  
```
curl -X POST \
  -F 'requests=[
    {
      "retailer_id":"sku_001",
      "method":"UPDATE",
      "data": {
        "price":1599,
        "availability":"in stock"
      }
    }
  ]' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/<API_VERSION>/<PRODUCT_CATALOG_ID>/batch
```
**参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>描述  </td>
</tr>
<tr>
<td>requests  </td>
<td>list<JSON>  </td>
<td>批量请求数组  </td>
</tr>
<tr>
<td>allow_upsert  </td>
<td>boolean  </td>
<td>默认 true  </td>
</tr>
</table>
**响应示例**:  
```
{
  "batch_id": "batch-12345"
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>batch_id  </td>
<td>string  </td>
<td>批处理任务 ID（已弃用，请改用 items_batch）  </td>
<td>"batch-12345"  </td>
</tr>
</table>
---
## 3. 目录商品审核状态查询（申诉）
**参考文档**: [https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog/additional_reviews](https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog/additional_reviews)  
**端点**: POST `/{product_catalog_id}/additional_reviews`  
**限制**: 每天 10 次/目录，每次最多 100 个商品，每件商品仅能申诉一次  
**请求示例**:  
```
curl -X POST \
  -F 'retailer_ids=["sku_001","sku_003"]' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/<API_VERSION>/<PRODUCT_CATALOG_ID>/additional_reviews
```
**参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>必填  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>retailer_ids  </td>
<td>array<string>  </td>
<td>**是**  </td>
<td>要申诉的商品 retailer_id 列表，最多 100 个  </td>
<td>["sku_001","sku_003"]  </td>
</tr>
</table>
**响应示例**:  
```
{
  "success": true
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>success  </td>
<td>boolean  </td>
<td>关联/解除关联是否成功  </td>
<td>true  </td>
</tr>
</table>
---
## 4. 商品信息库（批量管理商品）
**参考文档**: [https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog/product_feeds](https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog/product_feeds)  
### 读取信息库
**端点**: GET `/{product_catalog_id}/product_feeds`  
**请求示例**:  
```
curl -G -d 'access_token=<ACCESS_TOKEN>' https://graph.facebook.com/<API_VERSION>/<PRODUCT_CATALOG_ID>/product_feeds
```
**读取参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>fields  </td>
<td>array<string>  </td>
<td>返回字段：id, name, feed_type, schedule, country, default_currency 等  </td>
<td>["id","name","schedule"]  </td>
</tr>
</table>
**响应示例**:  
```
{
  "data": [
    {
      "id": "feed_id_123",
      "name": "Main Product Feed",
      "feed_type": "PRODUCTS",
      "schedule": {
        "interval": "DAILY",
        "url": "http://www.example.com/sample_feed.tsv",
        "hour": 22
      },
      "country": "US",
      "default_currency": "USD",
      "delimiter": "TAB",
      "encoding": "UTF8",
      "deletion_enabled": true
    }
  ],
  "paging": {}
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>data  </td>
<td>array  </td>
<td>信息库列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>data[].id  </td>
<td>string  </td>
<td>信息库 ID  </td>
<td>"feed_id_123"  </td>
</tr>
<tr>
<td>data[].name  </td>
<td>string  </td>
<td>信息库名称  </td>
<td>"Main Product Feed"  </td>
</tr>
<tr>
<td>data[].feed_type  </td>
<td>string  </td>
<td>信息库类型，如 PRODUCTS  </td>
<td>"PRODUCTS"  </td>
</tr>
<tr>
<td>data[].schedule  </td>
<td>object  </td>
<td>定时抓取计划  </td>
<td>{...}  </td>
</tr>
<tr>
<td>data[].schedule.interval  </td>
<td>string  </td>
<td>抓取频率：DAILY / HOURLY 等  </td>
<td>"DAILY"  </td>
</tr>
<tr>
<td>data[].schedule.url  </td>
<td>string  </td>
<td>数据源 URL  </td>
<td>"http://www.example.com/sample_feed.tsv"  </td>
</tr>
<tr>
<td>data[].schedule.hour  </td>
<td>integer  </td>
<td>每日抓取小时（0-23）  </td>
<td>22  </td>
</tr>
<tr>
<td>data[].country  </td>
<td>string  </td>
<td>默认国家代码  </td>
<td>"US"  </td>
</tr>
<tr>
<td>data[].default_currency  </td>
<td>string  </td>
<td>默认货币  </td>
<td>"USD"  </td>
</tr>
<tr>
<td>data[].delimiter  </td>
<td>string  </td>
<td>字段分隔符  </td>
<td>"TAB"  </td>
</tr>
<tr>
<td>data[].encoding  </td>
<td>string  </td>
<td>文件编码  </td>
<td>"UTF8"  </td>
</tr>
<tr>
<td>data[].deletion_enabled  </td>
<td>boolean  </td>
<td>是否允许通过 feed 删除商品  </td>
<td>true  </td>
</tr>
<tr>
<td>paging  </td>
<td>object  </td>
<td>分页信息  </td>
<td>{...}  </td>
</tr>
</table>
### 创建信息库
**端点**: POST `/{product_catalog_id}/product_feeds`  
**请求示例**:  
```
curl -X POST \
  -F 'name=Test Feed' \
  -F 'schedule={"interval":"DAILY","url":"http://www.example.com/sample_feed.tsv","hour":"22"}' \
  -F 'feed_type=PRODUCTS' \
  -F 'country=US' \
  -F 'default_currency=USD' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/<API_VERSION>/<PRODUCT_CATALOG_ID>/product_feeds
```
**使用 migrated_from_feed_id 分割信息库**:  
```
curl -X POST \
  -F 'name="New Feed"' \
  -F 'schedule={"interval":"DAILY","url":"http://www.example.com/new_feed_file.csv","hour":"22"}' \
  -F 'migrated_from_feed_id=<OLD_FEED_ID>' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/<API_VERSION>/<PRODUCT_CATALOG_ID>/product_feeds
```
**参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>默认值  </td>
<td>描述  </td>
</tr>
<tr>
<td>name  </td>
<td>string  </td>
<td>**必填**  </td>
<td>信息库名称  </td>
</tr>
<tr>
<td>schedule  </td>
<td>JSON  </td>
<td>-  </td>
<td>**必填**。定期计划：`{"interval":"DAILY","url":"...","hour":"22"}`  </td>
</tr>
<tr>
<td>feed_type  </td>
<td>enum  </td>
<td>-  </td>
<td>信息库类型：ACTIVITY, APP_AND_SOFTWARE, ARTICLE_AND_PUBLICATION, AUTOMOTIVE_MODEL, COLLECTION, DESTINATION, FLIGHT, HOME_LISTING, HOTEL, HOTEL_ROOM, LOCAL_INVENTORY, MEDIA_TITLE, OFFER, PRODUCT_RATINGS_AND_REVIEWS, PRODUCTS, SERVICE, TRANSACTABLE_ITEMS, VEHICLE_OFFER, VEHICLES  </td>
</tr>
<tr>
<td>file_name  </td>
<td>string  </td>
<td>-  </td>
<td>文件名（.tsv/.xml/zip/gzip/bz2）  </td>
</tr>
<tr>
<td>delimiter  </td>
<td>enum  </td>
<td>AUTODETECT  </td>
<td>分隔符：AUTODETECT, BAR, COMMA, TAB, TILDE, SEMICOLON  </td>
</tr>
<tr>
<td>encoding  </td>
<td>enum  </td>
<td>AUTODETECT  </td>
<td>编码：AUTODETECT, LATIN1, UTF8, UTF16LE, UTF16BE, UTF32LE, UTF32BE  </td>
</tr>
<tr>
<td>country  </td>
<td>string  </td>
<td>US  </td>
<td>双字母国家/地区代码  </td>
</tr>
<tr>
<td>default_currency  </td>
<td>string  </td>
<td>USD  </td>
<td>默认货币  </td>
</tr>
<tr>
<td>deletion_enabled  </td>
<td>boolean  </td>
<td>true  </td>
<td>自动移除不再出现的商品  </td>
</tr>
<tr>
<td>ingestion_source_type  </td>
<td>enum  </td>
<td>-  </td>
<td>PRIMARY_FEED / SUPPLEMENTARY_FEED  </td>
</tr>
<tr>
<td>item_sub_type  </td>
<td>enum  </td>
<td>-  </td>
<td>商品子类型（同 items_batch）  </td>
</tr>
<tr>
<td>migrated_from_feed_id  </td>
<td>numeric string  </td>
<td>-  </td>
<td>分割信息库时的原始信息库 ID  </td>
</tr>
<tr>
<td>override_type  </td>
<td>enum  </td>
<td>-  </td>
<td>次级信息库覆盖类型：LANGUAGE, COUNTRY, VERSION 等  </td>
</tr>
<tr>
<td>override_value  </td>
<td>string  </td>
<td>-  </td>
<td>覆盖值（取决于 override_type）  </td>
</tr>
<tr>
<td>primary_feed_ids  </td>
<td>array<numeric>  </td>
<td>-  </td>
<td>补充信息库关联的主信息库 ID  </td>
</tr>
<tr>
<td>quoted_fields_mode  </td>
<td>enum  </td>
<td>autodetect  </td>
<td>TSV 引号模式：autodetect, on, off  </td>
</tr>
<tr>
<td>rules  </td>
<td>list<JSON>  </td>
<td>-  </td>
<td>应用于信息库上传的规则列表  </td>
</tr>
<tr>
<td>selected_override_fields  </td>
<td>array<string>  </td>
<td>-  </td>
<td>选定覆盖字段  </td>
</tr>
<tr>
<td>update_schedule  </td>
<td>JSON  </td>
<td>-  </td>
<td>增量更新计划（仅更新 price/availability）  </td>
</tr>
<tr>
<td>use_case  </td>
<td>enum  </td>
<td>-  </td>
<td>CREATOR_ASSET  </td>
</tr>
</table>
**响应示例**:  
```
{
  "id": "1234567890123456",
  "errors": []
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>id  </td>
<td>string  </td>
<td>新创建的信息库 ID  </td>
<td>"1234567890123456"  </td>
</tr>
<tr>
<td>errors  </td>
<td>array  </td>
<td>创建时的校验错误列表；无错误时为空数组  </td>
<td>[]  </td>
</tr>
</table>
---
## 5. 商品（单个管理商品）
**参考文档**: [https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog/products](https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog/products)  
### 读取商品
**端点**: GET `/{product_catalog_id}/products`  
**请求示例**:  
```
curl -G \
  -d 'fields=["category","name","errors"]' \
  -d 'filter={"name":{"i_contains":"shoe"}}' \
  -d 'summary=true' \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/<API_VERSION>/<PRODUCT_CATALOG_ID>/products
```
**参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>默认值  </td>
<td>描述  </td>
</tr>
<tr>
<td>filter  </td>
<td>JSON  </td>
<td>-  </td>
<td>WCA 规则表达式筛选条件  </td>
</tr>
<tr>
<td>error_priority  </td>
<td>enum  </td>
<td>-  </td>
<td>错误优先级：HIGH, LOW, MEDIUM  </td>
</tr>
<tr>
<td>error_type  </td>
<td>enum  </td>
<td>-  </td>
<td>问题类型筛选  </td>
</tr>
<tr>
<td>return_only_approved_products  </td>
<td>boolean  </td>
<td>false  </td>
<td>仅返回已获批商品（WhatsApp）  </td>
</tr>
<tr>
<td>bulk_pagination  </td>
<td>boolean  </td>
<td>-  </td>
<td>大块迭代  </td>
</tr>
</table>
**响应示例**:  
```
{
  "data": [
    {
      "category": "mens_shoes",
      "name": "Awesome Mens Shoes in Black",
      "id": "1234",
      "errors": [
        {
          "error_type": "IMAGE_RESOLUTION_LOW",
          "error_priority": "HIGH",
          "title": "Missing or invalid images",
          "description": "The main image of this item cannot be displayed.",
          "call_to_action": "After you've made changes, save the image under a different link (URL) and provide the new link."
        }
      ]
    }
  ],
  "summary": { "total_count": 316 }
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>data  </td>
<td>array  </td>
<td>商品列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>data[].id  </td>
<td>string  </td>
<td>商品 ID  </td>
<td>"1234"  </td>
</tr>
<tr>
<td>data[].name  </td>
<td>string  </td>
<td>商品名称  </td>
<td>"Awesome Mens Shoes in Black"  </td>
</tr>
<tr>
<td>data[].category  </td>
<td>string  </td>
<td>商品类别  </td>
<td>"mens_shoes"  </td>
</tr>
<tr>
<td>data[].errors  </td>
<td>array  </td>
<td>商品审核/质量错误列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>data[].errors[].error_type  </td>
<td>string  </td>
<td>错误类型，如 IMAGE_RESOLUTION_LOW  </td>
<td>"IMAGE_RESOLUTION_LOW"  </td>
</tr>
<tr>
<td>data[].errors[].error_priority  </td>
<td>string  </td>
<td>错误优先级：HIGH / MEDIUM / LOW  </td>
<td>"HIGH"  </td>
</tr>
<tr>
<td>data[].errors[].title  </td>
<td>string  </td>
<td>错误标题  </td>
<td>"Missing or invalid images"  </td>
</tr>
<tr>
<td>data[].errors[].description  </td>
<td>string  </td>
<td>错误详细描述  </td>
<td>"The main image of this item cannot be displayed."  </td>
</tr>
<tr>
<td>data[].errors[].call_to_action  </td>
<td>string  </td>
<td>修复建议  </td>
<td>"After you've made changes, save the image under a different link..."  </td>
</tr>
<tr>
<td>summary  </td>
<td>object  </td>
<td>汇总信息（summary=true 时返回）  </td>
<td>{...}  </td>
</tr>
<tr>
<td>summary.total_count  </td>
<td>integer  </td>
<td>匹配筛选条件的商品总数  </td>
<td>316  </td>
</tr>
<tr>
<td>paging  </td>
<td>object  </td>
<td>分页信息  </td>
<td>{...}  </td>
</tr>
</table>
### 创建商品
**端点**: POST `/{product_catalog_id}/products`  
**请求示例**:  
```
curl -X POST \
  -F 'name=Classic Sneakers' \
  -F 'image_url=https://example.com/sneakers.jpg' \
  -F 'price=4999' \
  -F 'currency=USD' \
  -F 'retailer_id=sneaker_001' \
  -F 'brand=MyBrand' \
  -F 'availability=in stock' \
  -F 'condition=new' \
  -F 'category=Apparel %26 Accessories %3E Shoes' \
  -F 'description=Comfortable classic sneakers for everyday wear' \
  -F 'url=https://example.com/products/sneaker_001' \
  -F 'additional_image_urls=["https://example.com/sneakers2.jpg"]' \
  -F 'additional_variant_attributes={"Color":"Black","Size":"10"}' \
  -F 'age_group=adult' \
  -F 'allow_upsert=true' \
  -F 'android_app_name=MyShop' \
  -F 'android_class=com.myshop.MainActivity' \
  -F 'android_package=com.myshop' \
  -F 'android_url=myshop://product/001' \
  -F 'checkout_url=https://example.com/checkout/001' \
  -F 'color=Black' \
  -F 'commerce_tax_category=FB_APRL' \
  -F 'custom_data={"material":"leather","style":"casual"}' \
  -F 'custom_label_0=premium' \
  -F 'custom_label_1=bestseller' \
  -F 'custom_label_2=summer' \
  -F 'custom_label_3=sale' \
  -F 'custom_label_4=new_arrival' \
  -F 'custom_number_0=100' \
  -F 'custom_number_1=200' \
  -F 'custom_number_2=300' \
  -F 'custom_number_3=400' \
  -F 'custom_number_4=500' \
  -F 'expiration_date=2026-12-31' \
  -F 'fb_product_category=Shoes' \
  -F 'gender=male' \
  -F 'gtin=1234567890123' \
  -F 'importer_address={"street":"123 Main St","city":"New York","state":"NY","country":"US","postal_code":"10001"}' \
  -F 'importer_name=My Importer Inc' \
  -F 'inventory=500' \
  -F 'ios_app_name=MyShop' \
  -F 'ios_app_store_id=123456789' \
  -F 'ios_url=myshop://product/001' \
  -F 'ipad_app_name=MyShop' \
  -F 'ipad_app_store_id=987654321' \
  -F 'ipad_url=myshop://product/001' \
  -F 'iphone_app_name=MyShop' \
  -F 'iphone_app_store_id=111222333' \
  -F 'iphone_url=myshop://product/001' \
  -F 'manufacturer_info=Made in USA' \
  -F 'manufacturer_part_number=MPN-001' \
  -F 'marked_for_product_launch=marked' \
  -F 'material=100%25 Cotton' \
  -F 'mobile_link=https://m.example.com/products/001' \
  -F 'ordering_index=1' \
  -F 'origin_country=US' \
  -F 'pattern=Solid' \
  -F 'product_priority_1=1.0' \
  -F 'product_priority_2=0.8' \
  -F 'product_priority_3=0.6' \
  -F 'product_priority_4=0.4' \
  -F 'product_type=Shoes %3E Sneakers' \
  -F 'retailer_product_group_id=group_001' \
  -F 'return_policy_days=30' \
  -F 'sale_price=3999' \
  -F 'sale_price_end_date=2026-07-31' \
  -F 'sale_price_start_date=2026-06-01' \
  -F 'short_description=Classic black sneakers' \
  -F 'size=10' \
  -F 'start_date=2026-01-01' \
  -F 'visibility=published' \
  -F 'wa_compliance_category=DEFAULT' \
  -F 'windows_phone_app_id={GUID}' \
  -F 'windows_phone_app_name=MyShop' \
  -F 'windows_phone_url=myshop://product/001' \
  -F 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/<API_VERSION>/<PRODUCT_CATALOG_ID>/products
```
**必填参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>name  </td>
<td>string  </td>
<td>商品名称/标题  </td>
<td>"Classic Sneakers"  </td>
</tr>
<tr>
<td>image_url  </td>
<td>URI  </td>
<td>商品图片网址  </td>
<td>https://example.com/sneakers.jpg  </td>
</tr>
<tr>
<td>price  </td>
<td>int64  </td>
<td>价格（美分，1999=$19.99）  </td>
<td>4999  </td>
</tr>
<tr>
<td>currency  </td>
<td>ISO 4217  </td>
<td>货币代码  </td>
<td>"USD"  </td>
</tr>
<tr>
<td>retailer_id  </td>
<td>string  </td>
<td>商品唯一编号  </td>
<td>"sneaker_001"  </td>
</tr>
</table>
**可选参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>默认值  </td>
<td>描述  </td>
</tr>
<tr>
<td>additional_image_urls  </td>
<td>list<URL>  </td>
<td>-  </td>
<td>附加图片网址  </td>
</tr>
<tr>
<td>additional_variant_attributes  </td>
<td>JSON  </td>
<td>-  </td>
<td>款式区分属性，如 {"Scent":"Fruity"}  </td>
</tr>
<tr>
<td>age_group  </td>
<td>enum  </td>
<td>-  </td>
<td>年龄段：adult, all ages, infant, kids, newborn, teen, toddler  </td>
</tr>
<tr>
<td>allow_upsert  </td>
<td>boolean  </td>
<td>true  </td>
<td>允许 retailer_id 已存在时更新  </td>
</tr>
<tr>
<td>android_app_name  </td>
<td>string  </td>
<td>-  </td>
<td>Android 应用名称  </td>
</tr>
<tr>
<td>android_class  </td>
<td>string  </td>
<td>-  </td>
<td>Android Activity 类名  </td>
</tr>
<tr>
<td>android_package  </td>
<td>string  </td>
<td>-  </td>
<td>Android 包名  </td>
</tr>
<tr>
<td>android_url  </td>
<td>string  </td>
<td>-  </td>
<td>Android 自定义 scheme  </td>
</tr>
<tr>
<td>availability  </td>
<td>enum  </td>
<td>in stock  </td>
<td>库存：in stock, out of stock, preorder, available for order, discontinued, pending, mark_as_sold, mark_as_expired  </td>
</tr>
<tr>
<td>brand  </td>
<td>string  </td>
<td>-  </td>
<td>品牌  </td>
</tr>
<tr>
<td>category  </td>
<td>string  </td>
<td>-  </td>
<td>Google 商品类别  </td>
</tr>
<tr>
<td>category_specific_fields  </td>
<td>JSON  </td>
<td>-  </td>
<td>类别特定字段  </td>
</tr>
<tr>
<td>checkout_url  </td>
<td>URL  </td>
<td>-  </td>
<td>直接结账网址  </td>
</tr>
<tr>
<td>color  </td>
<td>string  </td>
<td>-  </td>
<td>颜色  </td>
</tr>
<tr>
<td>commerce_tax_category  </td>
<td>enum  </td>
<td>-  </td>
<td>商业税类别：FB_APRL, FB_ELEC, FB_FURN, FB_HLTH, FB_FOOD, FB_TOYS, FB_SPOR, FB_MDIA, FB_VEHI 等  </td>
</tr>
<tr>
<td>condition  </td>
<td>enum  </td>
<td>new  </td>
<td>状况：new, refurbished, used, used_like_new, used_good, used_fair, cpo, open_box_new  </td>
</tr>
<tr>
<td>custom_data  </td>
<td>dictionary  </td>
<td>-  </td>
<td>自定义款式：{"color":"red","size":"L"}  </td>
</tr>
<tr>
<td>custom_label_0~4  </td>
<td>string  </td>
<td>-  </td>
<td>自定义标签，最多 100 字符  </td>
</tr>
<tr>
<td>custom_number_0~4  </td>
<td>int64  </td>
<td>-  </td>
<td>自定义数字  </td>
</tr>
<tr>
<td>description  </td>
<td>string  </td>
<td>-  </td>
<td>描述，最多 5000 字符，支持表情  </td>
</tr>
<tr>
<td>expiration_date  </td>
<td>string  </td>
<td>-  </td>
<td>到期日期 (YYYY-MM-DD)  </td>
</tr>
<tr>
<td>fb_product_category  </td>
<td>string  </td>
<td>-  </td>
<td>Facebook 商品类别  </td>
</tr>
<tr>
<td>gender  </td>
<td>enum  </td>
<td>-  </td>
<td>目标性别：female, male, unisex  </td>
</tr>
<tr>
<td>gtin  </td>
<td>string  </td>
<td>-  </td>
<td>全球贸易编号  </td>
</tr>
<tr>
<td>importer_address  </td>
<td>JSON  </td>
<td>-  </td>
<td>进口商地址  </td>
</tr>
<tr>
<td>importer_name  </td>
<td>string  </td>
<td>-  </td>
<td>进口商名称  </td>
</tr>
<tr>
<td>inventory  </td>
<td>int64  </td>
<td>-  </td>
<td>库存数量  </td>
</tr>
<tr>
<td>ios_app_name  </td>
<td>string  </td>
<td>-  </td>
<td>iOS 应用名称  </td>
</tr>
<tr>
<td>ios_app_store_id  </td>
<td>int64  </td>
<td>-  </td>
<td>iOS App Store ID  </td>
</tr>
<tr>
<td>ios_url  </td>
<td>string  </td>
<td>-  </td>
<td>iOS 自定义 scheme  </td>
</tr>
<tr>
<td>ipad_app_name  </td>
<td>string  </td>
<td>-  </td>
<td>iPad 应用名称  </td>
</tr>
<tr>
<td>ipad_app_store_id  </td>
<td>int64  </td>
<td>-  </td>
<td>iPad App Store ID  </td>
</tr>
<tr>
<td>ipad_url  </td>
<td>string  </td>
<td>-  </td>
<td>iPad 自定义 scheme  </td>
</tr>
<tr>
<td>iphone_app_name  </td>
<td>string  </td>
<td>-  </td>
<td>iPhone 应用名称  </td>
</tr>
<tr>
<td>iphone_app_store_id  </td>
<td>int64  </td>
<td>-  </td>
<td>iPhone App Store ID  </td>
</tr>
<tr>
<td>iphone_url  </td>
<td>string  </td>
<td>-  </td>
<td>iPhone 自定义 scheme  </td>
</tr>
<tr>
<td>manufacturer_info  </td>
<td>string  </td>
<td>-  </td>
<td>制造商信息  </td>
</tr>
<tr>
<td>manufacturer_part_number  </td>
<td>string  </td>
<td>-  </td>
<td>制造商编号  </td>
</tr>
<tr>
<td>marked_for_product_launch  </td>
<td>enum  </td>
<td>-  </td>
<td>商品发布标记：default, marked, not_marked  </td>
</tr>
<tr>
<td>material  </td>
<td>string  </td>
<td>-  </td>
<td>材料，最多 200 字符  </td>
</tr>
<tr>
<td>mobile_link  </td>
<td>URI  </td>
<td>-  </td>
<td>移动端优化链接  </td>
</tr>
<tr>
<td>ordering_index  </td>
<td>int64  </td>
<td>-  </td>
<td>组内排序索引  </td>
</tr>
<tr>
<td>origin_country  </td>
<td>enum  </td>
<td>-  </td>
<td>原产地（ISO 3166-1 alpha-2 国家代码）  </td>
</tr>
<tr>
<td>pattern  </td>
<td>string  </td>
<td>-  </td>
<td>图案/花纹  </td>
</tr>
<tr>
<td>product_priority_1~4  </td>
<td>float  </td>
<td>-  </td>
<td>商品优先级  </td>
</tr>
<tr>
<td>product_type  </td>
<td>string  </td>
<td>-  </td>
<td>零售商自定义类别，最多 750 字符  </td>
</tr>
<tr>
<td>retailer_product_group_id  </td>
<td>string  </td>
<td>-  </td>
<td>商品组编号（变体用）  </td>
</tr>
<tr>
<td>return_policy_days  </td>
<td>int64  </td>
<td>-  </td>
<td>退货政策天数  </td>
</tr>
<tr>
<td>sale_price  </td>
<td>int64  </td>
<td>-  </td>
<td>优惠价（格式同 price）  </td>
</tr>
<tr>
<td>sale_price_end_date  </td>
<td>datetime  </td>
<td>-  </td>
<td>优惠结束日期  </td>
</tr>
<tr>
<td>sale_price_start_date  </td>
<td>datetime  </td>
<td>-  </td>
<td>优惠开始日期  </td>
</tr>
<tr>
<td>short_description  </td>
<td>string  </td>
<td>-  </td>
<td>简要描述  </td>
</tr>
<tr>
<td>size  </td>
<td>string  </td>
<td>-  </td>
<td>尺码  </td>
</tr>
<tr>
<td>start_date  </td>
<td>string  </td>
<td>-  </td>
<td>商品上架日期  </td>
</tr>
<tr>
<td>url  </td>
<td>URI  </td>
<td>-  </td>
<td>商品网址  </td>
</tr>
<tr>
<td>visibility  </td>
<td>enum  </td>
<td>published  </td>
<td>可见性：staging, published  </td>
</tr>
<tr>
<td>wa_compliance_category  </td>
<td>enum  </td>
<td>-  </td>
<td>WA 合规类别：DEFAULT, COUNTRY_ORIGIN_EXEMPT  </td>
</tr>
<tr>
<td>windows_phone_app_id  </td>
<td>string  </td>
<td>-  </td>
<td>Windows Phone 应用 ID (GUID)  </td>
</tr>
<tr>
<td>windows_phone_app_name  </td>
<td>string  </td>
<td>-  </td>
<td>Windows Phone 应用名称  </td>
</tr>
<tr>
<td>windows_phone_url  </td>
<td>string  </td>
<td>-  </td>
<td>Windows Phone 自定义 scheme  </td>
</tr>
</table>
**响应示例**:  
```
{
  "id": "9876543210987654"
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>id  </td>
<td>string  </td>
<td>新创建的商品 ID  </td>
<td>"9876543210987654"  </td>
</tr>
</table>
---
## 6. 多件商品消息
**参考文档**: [https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/multi-product-messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/multi-product-messages)  
**端点**: POST `/{FROM_PHONE_NUMBER}/messages`  
**请求示例**:  
```
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "PHONE_NUMBER",
  "type": "interactive",
  "interactive": {
    "type": "product_list",
    "header": { "type": "text", "text": "HEADER_CONTENT" },
    "body": { "text": "BODY_CONTENT" },
    "footer": { "text": "FOOTER_CONTENT" },
    "action": {
      "catalog_id": "CATALOG_ID",
      "sections": [
        {
          "title": "SECTION_TITLE",
          "product_items": [
            { "product_retailer_id": "PRODUCT-SKU" }
          ]
        }
      ]
    }
  }
}
```
**参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>必填  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>messaging_product  </td>
<td>string  </td>
<td>**是**  </td>
<td>固定为 whatsapp  </td>
<td>"whatsapp"  </td>
</tr>
<tr>
<td>recipient_type  </td>
<td>string  </td>
<td>**是**  </td>
<td>接收者类型  </td>
<td>"individual"  </td>
</tr>
<tr>
<td>to  </td>
<td>string  </td>
<td>**是**  </td>
<td>收件人 WhatsApp 号码  </td>
<td>"16505551234"  </td>
</tr>
<tr>
<td>type  </td>
<td>string  </td>
<td>**是**  </td>
<td>消息类型  </td>
<td>"interactive"  </td>
</tr>
<tr>
<td>interactive.type  </td>
<td>string  </td>
<td>**是**  </td>
<td>互动消息类型  </td>
<td>"product_list"  </td>
</tr>
<tr>
<td>interactive.header.type  </td>
<td>string  </td>
<td>否  </td>
<td>标题类型，仅支持 text  </td>
<td>"text"  </td>
</tr>
<tr>
<td>interactive.header.text  </td>
<td>string  </td>
<td>否  </td>
<td>标题文本，最多 60 字符  </td>
<td>"Our Products"  </td>
</tr>
<tr>
<td>interactive.body.text  </td>
<td>string  </td>
<td>**是**  </td>
<td>正文，最多 1024 字符  </td>
<td>"Browse our catalog"  </td>
</tr>
<tr>
<td>interactive.footer.text  </td>
<td>string  </td>
<td>否  </td>
<td>页脚，最多 60 字符  </td>
<td>"Powered by Meetbot"  </td>
</tr>
<tr>
<td>interactive.action.catalog_id  </td>
<td>string  </td>
<td>**是**  </td>
<td>Meta 商品目录 ID  </td>
<td>"123456789012345"  </td>
</tr>
<tr>
<td>interactive.action.sections  </td>
<td>array  </td>
<td>**是**  </td>
<td>商品分区，最多 10 个 section，每 section 最多 30 个商品  </td>
<td>[{"title":"Shoes","product_items":[{"product_retailer_id":"sku_001"}]}]  </td>
</tr>
<tr>
<td>sections[].title  </td>
<td>string  </td>
<td>**是**  </td>
<td>分区标题  </td>
<td>"Popular Items"  </td>
</tr>
<tr>
<td>sections[].product_items[].product_retailer_id  </td>
<td>string  </td>
<td>**是**  </td>
<td>目录中商品的 retailer_id  </td>
<td>"PRODUCT-SKU"  </td>
</tr>
</table>
**响应示例**:  
```
{
  "messaging_product": "whatsapp",
  "contacts": [{ "input": "PHONE_NUMBER", "wa_id": "WHATSAPP_ID" }],
  "messages": [{ "id": "wamid.ID" }]
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>messaging_product  </td>
<td>string  </td>
<td>消息产品，固定 whatsapp  </td>
<td>"whatsapp"  </td>
</tr>
<tr>
<td>contacts  </td>
<td>array  </td>
<td>收件人联系信息  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>contacts[].input  </td>
<td>string  </td>
<td>请求中传入的 to 号码  </td>
<td>"16505551234"  </td>
</tr>
<tr>
<td>contacts[].wa_id  </td>
<td>string  </td>
<td>WhatsApp 用户 ID（规范化后的号码）  </td>
<td>"16505551234"  </td>
</tr>
<tr>
<td>messages  </td>
<td>array  </td>
<td>已发送消息列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>messages[].id  </td>
<td>string  </td>
<td>WhatsApp 消息 ID（wamid），用于追踪投递状态  </td>
<td>"wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDOEI3ODgxNzQzMjJBQTdEQTcA"  </td>
</tr>
</table>
---
## 7. MPM 模板消息
**参考文档**: [https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/mpm-template-messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/mpm-template-messages)  
### 创建模板
**端点**: POST `/{WABA_ID}/message_templates`  
**组件**: HEADER（TEXT）+ BODY + 可选 FOOTER + BUTTONS（MPM）  
**请求示例**:  
```
curl -X POST 'https://graph.facebook.com/v25.0/{WABA_ID}/message_templates' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -d '{
    "name": "abandoned_cart",
    "language": "en_US",
    "category": "MARKETING",
    "components": [
      { "type": "HEADER", "format": "TEXT", "text": "Forget something, {{1}}?",
        "example": { "header_text": ["Pablo"] } },
      { "type": "BODY", "text": "Looks like you left these items in your cart...",
        "example": { "body_text": [["10OFF"]] } },
      { "type": "BUTTONS", "buttons": [{ "type": "MPM", "text": "View items" }] }
    ]
  }'
```
**创建模板参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>必填  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>name  </td>
<td>string  </td>
<td>**是**  </td>
<td>模板名称  </td>
<td>"abandoned_cart"  </td>
</tr>
<tr>
<td>language  </td>
<td>string  </td>
<td>**是**  </td>
<td>语言  </td>
<td>"en_US"  </td>
</tr>
<tr>
<td>category  </td>
<td>enum  </td>
<td>**是**  </td>
<td>模板类别  </td>
<td>"MARKETING"  </td>
</tr>
<tr>
<td>components  </td>
<td>array  </td>
<td>**是**  </td>
<td>HEADER(TEXT) + BODY + BUTTONS(MPM)  </td>
<td>见请求示例  </td>
</tr>
<tr>
<td>buttons[].type  </td>
<td>string  </td>
<td>**是**  </td>
<td>MPM 按钮类型  </td>
<td>"MPM"  </td>
</tr>
</table>
**发送模板参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>必填  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>template.name  </td>
<td>string  </td>
<td>**是**  </td>
<td>模板名  </td>
<td>"abandoned_cart"  </td>
</tr>
<tr>
<td>components[].type=button  </td>
<td>string  </td>
<td>**是**  </td>
<td>MPM 按钮  </td>
<td>"button"  </td>
</tr>
<tr>
<td>sub_type  </td>
<td>string  </td>
<td>**是**  </td>
<td>固定 mpm  </td>
<td>"mpm"  </td>
</tr>
<tr>
<td>action.sections  </td>
<td>array  </td>
<td>**是**  </td>
<td>最多 10 个 section，每 section 最多 30 商品  </td>
<td>[{"title":"Popular","product_items":[{"product_retailer_id":"2lc20305pt"}]}]  </td>
</tr>
<tr>
<td>thumbnail_product_retailer_id  </td>
<td>string  </td>
<td>否  </td>
<td>缩略图商品 ID  </td>
<td>"2lc20305pt"  </td>
</tr>
</table>
**响应示例**:  
```
{
  "id": "546151681022936",
  "status": "PENDING",
  "category": "MARKETING"
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>id  </td>
<td>string  </td>
<td>新创建的模板 ID  </td>
<td>"546151681022936"  </td>
</tr>
<tr>
<td>status  </td>
<td>string  </td>
<td>审核状态：PENDING / APPROVED / REJECTED  </td>
<td>"PENDING"  </td>
</tr>
<tr>
<td>category  </td>
<td>string  </td>
<td>模板类别：MARKETING / UTILITY / AUTHENTICATION  </td>
<td>"MARKETING"  </td>
</tr>
</table>
### 发送模板
**端点**: POST `/{BUSINESS_PHONE_NUMBER_ID}/messages`  
**参数**: thumbnail_product_retailer_id, sections（title + product_items，最多 30 商品/10 版块）  
**请求示例**:  
```
curl -X POST 'https://graph.facebook.com/v25.0/{PHONE_ID}/messages' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -d '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "USER_PHONE",
    "type": "template",
    "template": {
      "name": "abandoned_cart",
      "language": { "code": "en_US" },
      "components": [
        {
          "type": "header",
          "parameters": [
            { "type": "text", "text": "Pablo" }
          ]
        },
        {
          "type": "body",
          "parameters": [
            { "type": "text", "text": "10OFF" }
          ]
        },
        {
          "type": "button",
          "sub_type": "mpm",
          "index": 0,
          "parameters": [
            {
              "type": "action",
              "action": {
                "sections": [
                  {
                    "title": "Popular Bundles",
                    "product_items": [
                      { "product_retailer_id": "2lc20305pt" },
                      { "product_retailer_id": "nseiw1x3ch" }
                    ]
                  },
                  {
                    "title": "Premium Packages",
                    "product_items": [
                      { "product_retailer_id": "n6k6x0y7oe" }
                    ]
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  }'
```
**响应示例**:  
```
{
  "messaging_product": "whatsapp",
  "contacts": [{ "input": "16505551234", "wa_id": "16505551234" }],
  "messages": [{ "id": "wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDOEI3ODgxNzQzMjJBQTdEQTcA" }]
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>messaging_product  </td>
<td>string  </td>
<td>消息产品，固定 whatsapp  </td>
<td>"whatsapp"  </td>
</tr>
<tr>
<td>contacts  </td>
<td>array  </td>
<td>收件人联系信息  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>contacts[].input  </td>
<td>string  </td>
<td>请求中传入的 to 号码  </td>
<td>"16505551234"  </td>
</tr>
<tr>
<td>contacts[].wa_id  </td>
<td>string  </td>
<td>WhatsApp 用户 ID（规范化后的号码）  </td>
<td>"16505551234"  </td>
</tr>
<tr>
<td>messages  </td>
<td>array  </td>
<td>已发送消息列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>messages[].id  </td>
<td>string  </td>
<td>WhatsApp 消息 ID（wamid），用于追踪投递状态  </td>
<td>"wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDOEI3ODgxNzQzMjJBQTdEQTcA"  </td>
</tr>
</table>
**Webhook**: 订单提交时触发 `order` 类型 Webhook  
```
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "ENTRY_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "type": "order",
        "order": {
          "catalog_id": "CATALOG_ID",
          "product_items": [{ "product_retailer_id": "2lc20305pt", "quantity": 1 }]
        }
      }
    }]
  }]
}
```
**Webhook 负载字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>object  </td>
<td>string  </td>
<td>固定 whatsapp_business_account  </td>
<td>"whatsapp_business_account"  </td>
</tr>
<tr>
<td>entry  </td>
<td>array  </td>
<td>Webhook 事件条目  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>entry[].id  </td>
<td>string  </td>
<td>WABA ID  </td>
<td>"ENTRY_ID"  </td>
</tr>
<tr>
<td>entry[].changes  </td>
<td>array  </td>
<td>变更事件列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>changes[].value.messaging_product  </td>
<td>string  </td>
<td>消息产品，固定 whatsapp  </td>
<td>"whatsapp"  </td>
</tr>
<tr>
<td>changes[].value.type  </td>
<td>string  </td>
<td>事件类型，MPM 订单提交为 order  </td>
<td>"order"  </td>
</tr>
<tr>
<td>changes[].value.order  </td>
<td>object  </td>
<td>订单详情  </td>
<td>{...}  </td>
</tr>
<tr>
<td>order.catalog_id  </td>
<td>string  </td>
<td>商品目录 ID  </td>
<td>"CATALOG_ID"  </td>
</tr>
<tr>
<td>order.product_items  </td>
<td>array  </td>
<td>用户选购的商品列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>product_items[].product_retailer_id  </td>
<td>string  </td>
<td>商品 retailer ID（与目录中一致）  </td>
<td>"2lc20305pt"  </td>
</tr>
<tr>
<td>product_items[].quantity  </td>
<td>integer  </td>
<td>选购数量  </td>
<td>1  </td>
</tr>
</table>
---
## 8. 商品轮播消息
**参考文档**: [https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/interactive-product-carousel-messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/interactive-product-carousel-messages)  
**端点**: POST `/{BUSINESS_PHONE_NUMBER_ID}/messages`  
**请求示例**:  
```
curl -X POST 'https://graph.facebook.com/v25.0/{PHONE_ID}/messages' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -d '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "USER_PHONE",
    "type": "interactive",
    "interactive": {
      "type": "carousel",
      "body": { "text": "Check out our featured products!" },
      "action": {
        "cards": [
          { "card_index": 0, "type": "product",
            "action": { "product_retailer_id": "abc123xyz", "catalog_id": "123456789" } },
          { "card_index": 1, "type": "product",
            "action": { "product_retailer_id": "def456uvw", "catalog_id": "123456789" } }
        ]
      }
    }
  }'
```
**参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>必填  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>messaging_product  </td>
<td>string  </td>
<td>**是**  </td>
<td>固定 whatsapp  </td>
<td>"whatsapp"  </td>
</tr>
<tr>
<td>to  </td>
<td>string  </td>
<td>**是**  </td>
<td>收件人号码  </td>
<td>"16505551234"  </td>
</tr>
<tr>
<td>type  </td>
<td>string  </td>
<td>**是**  </td>
<td>消息类型  </td>
<td>"interactive"  </td>
</tr>
<tr>
<td>interactive.type  </td>
<td>string  </td>
<td>**是**  </td>
<td>轮播类型  </td>
<td>"carousel"  </td>
</tr>
<tr>
<td>interactive.body.text  </td>
<td>string  </td>
<td>**是**  </td>
<td>轮播正文  </td>
<td>"Check out our featured products!"  </td>
</tr>
<tr>
<td>interactive.action.cards  </td>
<td>array  </td>
<td>**是**  </td>
<td>商品卡片列表，2~10 张  </td>
<td>见请求示例  </td>
</tr>
<tr>
<td>cards[].card_index  </td>
<td>int  </td>
<td>**是**  </td>
<td>卡片序号，从 0 开始  </td>
<td>0  </td>
</tr>
<tr>
<td>cards[].type  </td>
<td>string  </td>
<td>**是**  </td>
<td>卡片类型  </td>
<td>"product"  </td>
</tr>
<tr>
<td>cards[].action.catalog_id  </td>
<td>string  </td>
<td>**是**  </td>
<td>目录 ID  </td>
<td>"123456789"  </td>
</tr>
<tr>
<td>cards[].action.product_retailer_id  </td>
<td>string  </td>
<td>**是**  </td>
<td>商品 SKU  </td>
<td>"abc123xyz"  </td>
</tr>
</table>
**响应示例**:  
```
{
  "messaging_product": "whatsapp",
  "contacts": [{ "input": "USER_PHONE", "wa_id": "USER_WHATSAPP_ID" }],
  "messages": [{ "id": "wamid.ID" }]
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>messaging_product  </td>
<td>string  </td>
<td>消息产品，固定 whatsapp  </td>
<td>"whatsapp"  </td>
</tr>
<tr>
<td>contacts  </td>
<td>array  </td>
<td>收件人联系信息  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>contacts[].input  </td>
<td>string  </td>
<td>请求中传入的 to 号码  </td>
<td>"16505551234"  </td>
</tr>
<tr>
<td>contacts[].wa_id  </td>
<td>string  </td>
<td>WhatsApp 用户 ID（规范化后的号码）  </td>
<td>"16505551234"  </td>
</tr>
<tr>
<td>messages  </td>
<td>array  </td>
<td>已发送消息列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>messages[].id  </td>
<td>string  </td>
<td>WhatsApp 消息 ID（wamid），用于追踪投递状态  </td>
<td>"wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDOEI3ODgxNzQzMjJBQTdEQTcA"  </td>
</tr>
</table>
---
## 9. 商品卡片轮播模板消息
**参考文档**: [https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/product-card-carousel-template-messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/product-card-carousel-template-messages)  
**创建模板**: POST `/{WABA_ID}/message_templates`  
**请求示例**:  
```
curl -X POST 'https://graph.facebook.com/v25.0/{WABA_ID}/message_templates' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -d '{
    "name": "product_carousel_v1",
    "language": "en_US",
    "category": "MARKETING",
    "components": [
      {
        "type": "body",
        "text": "Check out our featured products {{1}}!",
        "example": { "body_text": [["Shop now"]] }
      },
      {
        "type": "carousel",
        "cards": [
          {
            "components": [
              { "type": "header", "format": "PRODUCT" },
              { "type": "body", "text": "Product description here" }
            ]
          },
          {
            "components": [
              { "type": "header", "format": "PRODUCT" },
              { "type": "body", "text": "Another product description" }
            ]
          }
        ]
      }
    ]
  }'
```
**创建模板参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>必填  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>name  </td>
<td>string  </td>
<td>**是**  </td>
<td>模板名称（小写+下划线）  </td>
<td>"product_carousel_v1"  </td>
</tr>
<tr>
<td>language  </td>
<td>string  </td>
<td>**是**  </td>
<td>语言代码  </td>
<td>"en_US"  </td>
</tr>
<tr>
<td>category  </td>
<td>enum  </td>
<td>**是**  </td>
<td>MARKETING / UTILITY / AUTHENTICATION  </td>
<td>"MARKETING"  </td>
</tr>
<tr>
<td>components[].type  </td>
<td>string  </td>
<td>**是**  </td>
<td>body / carousel  </td>
<td>"carousel"  </td>
</tr>
<tr>
<td>carousel.cards[].components  </td>
<td>array  </td>
<td>**是**  </td>
<td>每张卡片含 header(format=PRODUCT) + body  </td>
<td>见请求示例  </td>
</tr>
</table>
**发送模板参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>必填  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>template.name  </td>
<td>string  </td>
<td>**是**  </td>
<td>已审核模板名  </td>
<td>"product_carousel_v1"  </td>
</tr>
<tr>
<td>template.language.code  </td>
<td>string  </td>
<td>**是**  </td>
<td>模板语言  </td>
<td>"en_US"  </td>
</tr>
<tr>
<td>components[].type=button  </td>
<td>string  </td>
<td>**是**  </td>
<td>catalog 按钮  </td>
<td>"button"  </td>
</tr>
<tr>
<td>sub_type  </td>
<td>string  </td>
<td>**是**  </td>
<td>固定 catalog  </td>
<td>"catalog"  </td>
</tr>
<tr>
<td>action.sections  </td>
<td>array  </td>
<td>**是**  </td>
<td>商品分区及 product_items（含 catalog_id）  </td>
<td>见请求示例  </td>
</tr>
</table>
**响应示例**:  
```
{
  "id": "template_id_123",
  "status": "PENDING",
  "category": "MARKETING"
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>id  </td>
<td>string  </td>
<td>新创建的模板 ID  </td>
<td>"546151681022936"  </td>
</tr>
<tr>
<td>status  </td>
<td>string  </td>
<td>审核状态：PENDING / APPROVED / REJECTED  </td>
<td>"PENDING"  </td>
</tr>
<tr>
<td>category  </td>
<td>string  </td>
<td>模板类别：MARKETING / UTILITY / AUTHENTICATION  </td>
<td>"MARKETING"  </td>
</tr>
</table>
**发送模板**: POST `/{BUSINESS_PHONE_NUMBER_ID}/messages`  
```
{
  "messaging_product": "whatsapp",
  "to": "USER_PHONE",
  "type": "template",
  "template": {
    "name": "product_carousel_v1",
    "language": { "code": "en_US" },
    "components": [
      {
        "type": "body",
        "parameters": [{ "type": "text", "text": "Great deals!" }]
      },
      {
        "type": "button",
        "sub_type": "catalog",
        "index": 0,
        "parameters": [
          {
            "type": "action",
            "action": {
              "sections": [
                {
                  "title": "Featured Products",
                  "product_items": [
                    { "product_retailer_id": "item_001", "catalog_id": "cat_001" },
                    { "product_retailer_id": "item_002", "catalog_id": "cat_001" }
                  ]
                }
              ]
            }
          }
        ]
      }
    ]
  }
}
```
**发送响应示例**:  
```
{
  "messaging_product": "whatsapp",
  "contacts": [{ "input": "16505551234", "wa_id": "16505551234" }],
  "messages": [{ "id": "wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDOEI3ODgxNzQzMjJBQTdEQTcA" }]
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>messaging_product  </td>
<td>string  </td>
<td>消息产品，固定 whatsapp  </td>
<td>"whatsapp"  </td>
</tr>
<tr>
<td>contacts  </td>
<td>array  </td>
<td>收件人联系信息  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>contacts[].input  </td>
<td>string  </td>
<td>请求中传入的 to 号码  </td>
<td>"16505551234"  </td>
</tr>
<tr>
<td>contacts[].wa_id  </td>
<td>string  </td>
<td>WhatsApp 用户 ID  </td>
<td>"16505551234"  </td>
</tr>
<tr>
<td>messages  </td>
<td>array  </td>
<td>已发送消息列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>messages[].id  </td>
<td>string  </td>
<td>WhatsApp 消息 ID（wamid）  </td>
<td>"wamid.HBgL..."  </td>
</tr>
</table>
---
## 10. 单件商品消息
**参考文档**: [https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/single-product-messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/single-product-messages)  
**端点**: POST `/{FROM_PHONE_NUMBER}/messages`  
**请求示例**:  
```
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "PHONE_NUMBER",
  "type": "interactive",
  "interactive": {
    "type": "product",
    "body": { "text": "BODY_TEXT" },
    "footer": { "text": "FOOTER_TEXT" },
    "action": {
      "catalog_id": "CATALOG_ID",
      "product_retailer_id": "ID_TEST_ITEM_1"
    }
  }
}
```
**参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>必填  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>messaging_product  </td>
<td>string  </td>
<td>**是**  </td>
<td>固定 whatsapp  </td>
<td>"whatsapp"  </td>
</tr>
<tr>
<td>recipient_type  </td>
<td>string  </td>
<td>**是**  </td>
<td>接收者类型  </td>
<td>"individual"  </td>
</tr>
<tr>
<td>to  </td>
<td>string  </td>
<td>**是**  </td>
<td>收件人 WhatsApp 号码  </td>
<td>"16505551234"  </td>
</tr>
<tr>
<td>type  </td>
<td>string  </td>
<td>**是**  </td>
<td>消息类型  </td>
<td>"interactive"  </td>
</tr>
<tr>
<td>interactive.type  </td>
<td>string  </td>
<td>**是**  </td>
<td>单商品消息  </td>
<td>"product"  </td>
</tr>
<tr>
<td>interactive.body.text  </td>
<td>string  </td>
<td>**是**  </td>
<td>正文，最多 1024 字符  </td>
<td>"Check out this item!"  </td>
</tr>
<tr>
<td>interactive.footer.text  </td>
<td>string  </td>
<td>否  </td>
<td>页脚，最多 60 字符  </td>
<td>"Best price guaranteed"  </td>
</tr>
<tr>
<td>interactive.action.catalog_id  </td>
<td>string  </td>
<td>**是**  </td>
<td>Meta 商品目录 ID  </td>
<td>"123456789012345"  </td>
</tr>
<tr>
<td>interactive.action.product_retailer_id  </td>
<td>string  </td>
<td>**是**  </td>
<td>目录中商品 retailer_id  </td>
<td>"ID_TEST_ITEM_1"  </td>
</tr>
</table>
**响应示例**:  
```
{
  "messaging_product": "whatsapp",
  "contacts": [{ "input": "PHONE_NUMBER", "wa_id": "WHATSAPP_ID" }],
  "messages": [{ "id": "wamid.ID" }]
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>messaging_product  </td>
<td>string  </td>
<td>消息产品，固定 whatsapp  </td>
<td>"whatsapp"  </td>
</tr>
<tr>
<td>contacts  </td>
<td>array  </td>
<td>收件人联系信息  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>contacts[].input  </td>
<td>string  </td>
<td>请求中传入的 to 号码  </td>
<td>"16505551234"  </td>
</tr>
<tr>
<td>contacts[].wa_id  </td>
<td>string  </td>
<td>WhatsApp 用户 ID（规范化后的号码）  </td>
<td>"16505551234"  </td>
</tr>
<tr>
<td>messages  </td>
<td>array  </td>
<td>已发送消息列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>messages[].id  </td>
<td>string  </td>
<td>WhatsApp 消息 ID（wamid），用于追踪投递状态  </td>
<td>"wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDOEI3ODgxNzQzMjJBQTdEQTcA"  </td>
</tr>
</table>
---
## 11. SPM 模板消息
**参考文档**: [https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/spm-template-messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/catalogs/spm-template-messages)  
**创建模板**: POST `/{WABA_ID}/message_templates`  
**请求示例**:  
```
curl -X POST 'https://graph.facebook.com/v25.0/{WABA_ID}/message_templates' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer ACCESS_TOKEN' \
  -d '{
    "name": "single_product_promo",
    "language": "en_US",
    "category": "MARKETING",
    "components": [
      { "type": "HEADER", "format": "PRODUCT" },
      { "type": "BODY", "text": "Check out this amazing product, {{1}}!",
        "example": { "body_text": [["limited offer"]] } },
      { "type": "FOOTER", "text": "T&C apply" },
      { "type": "BUTTONS",
        "buttons": [
          { "type": "SPM", "text": "View Product" }
        ] }
    ]
  }'
```
**创建模板参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>必填  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>name  </td>
<td>string  </td>
<td>**是**  </td>
<td>模板名称  </td>
<td>"single_product_promo"  </td>
</tr>
<tr>
<td>language  </td>
<td>string  </td>
<td>**是**  </td>
<td>语言  </td>
<td>"en_US"  </td>
</tr>
<tr>
<td>category  </td>
<td>enum  </td>
<td>**是**  </td>
<td>MARKETING / UTILITY  </td>
<td>"MARKETING"  </td>
</tr>
<tr>
<td>components  </td>
<td>array  </td>
<td>**是**  </td>
<td>HEADER(PRODUCT) + BODY + FOOTER + BUTTONS(SPM)  </td>
<td>见请求示例  </td>
</tr>
<tr>
<td>buttons[].type  </td>
<td>string  </td>
<td>**是**  </td>
<td>SPM 按钮  </td>
<td>"SPM"  </td>
</tr>
</table>
**发送模板参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>必填  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>template.name  </td>
<td>string  </td>
<td>**是**  </td>
<td>模板名  </td>
<td>"single_product_promo"  </td>
</tr>
<tr>
<td>components[].type=header  </td>
<td>string  </td>
<td>**是**  </td>
<td>商品头图  </td>
<td>"header"  </td>
</tr>
<tr>
<td>parameters[].type=product  </td>
<td>string  </td>
<td>**是**  </td>
<td>指定 catalog_id + product_retailer_id  </td>
<td>{"catalog_id":"CATALOG_ID","product_retailer_id":"ID_TEST_ITEM_1"}  </td>
</tr>
<tr>
<td>components[].type=body  </td>
<td>string  </td>
<td>否  </td>
<td>正文变量  </td>
<td>{"type":"text","text":"limited offer"}  </td>
</tr>
</table>
**响应示例**:  
```
{
  "id": "spm_template_id_456",
  "status": "PENDING",
  "category": "MARKETING"
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>id  </td>
<td>string  </td>
<td>新创建的模板 ID  </td>
<td>"546151681022936"  </td>
</tr>
<tr>
<td>status  </td>
<td>string  </td>
<td>审核状态：PENDING / APPROVED / REJECTED  </td>
<td>"PENDING"  </td>
</tr>
<tr>
<td>category  </td>
<td>string  </td>
<td>模板类别：MARKETING / UTILITY / AUTHENTICATION  </td>
<td>"MARKETING"  </td>
</tr>
</table>
**发送模板**: POST `/{BUSINESS_PHONE_NUMBER_ID}/messages`  
```
{
  "messaging_product": "whatsapp",
  "to": "USER_PHONE",
  "type": "template",
  "template": {
    "name": "single_product_promo",
    "language": { "code": "en_US" },
    "components": [
      {
        "type": "header",
        "parameters": [
          { "type": "product", "catalog_id": "CATALOG_ID", "product_retailer_id": "ID_TEST_ITEM_1" }
        ]
      },
      {
        "type": "body",
        "parameters": [{ "type": "text", "text": "limited offer" }]
      }
    ]
  }
}
```
**响应示例**:  
```
{
  "messaging_product": "whatsapp",
  "contacts": [{ "input": "16505551234", "wa_id": "16505551234" }],
  "messages": [{ "id": "wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDOEI3ODgxNzQzMjJBQTdEQTcA" }]
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>messaging_product  </td>
<td>string  </td>
<td>消息产品，固定 whatsapp  </td>
<td>"whatsapp"  </td>
</tr>
<tr>
<td>contacts  </td>
<td>array  </td>
<td>收件人联系信息  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>contacts[].input  </td>
<td>string  </td>
<td>请求中传入的 to 号码  </td>
<td>"16505551234"  </td>
</tr>
<tr>
<td>contacts[].wa_id  </td>
<td>string  </td>
<td>WhatsApp 用户 ID（规范化后的号码）  </td>
<td>"16505551234"  </td>
</tr>
<tr>
<td>messages  </td>
<td>array  </td>
<td>已发送消息列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>messages[].id  </td>
<td>string  </td>
<td>WhatsApp 消息 ID（wamid），用于追踪投递状态  </td>
<td>"wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDOEI3ODgxNzQzMjJBQTdEQTcA"  </td>
</tr>
</table>
---
**注意事项（Catalog，来源需求说明书）**  
1. 发送商品消息/商品模板消息仍走已有消息发送 API，是否涉及传参调整需技术侧 Check
2. 商品目录是 Meta 无界媒体渠道电商公用资产，WhatsApp 渠道私域电商以单/多商品发送为主，暂不考虑货架式电商展示，因此暂不用分类、系列等能力
3. 不入 MB 系统功能层面的展示
4. 账单需要同步
# 二、Flow 模块
**参考文档（Flows API 总览）**: [https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi)  
**接入计划**: 0702  
### API 调用所需变量
<table>
<tr>
<td>变量  </td>
<td>说明  </td>
<td>示例  </td>
</tr>
<tr>
<td>BASE-URL  </td>
<td>Facebook 图谱 API 基本网址  </td>
<td>https://graph.facebook.com/v18.0  </td>
</tr>
<tr>
<td>ACCESS-TOKEN  </td>
<td>用户访问口令，需 whatsapp_business_management、whatsapp_business_messaging 权限  </td>
<td>EAAG...  </td>
</tr>
<tr>
<td>WABA-ID  </td>
<td>WhatsApp Business 业务账户编号  </td>
<td>104996122399160  </td>
</tr>
<tr>
<td>FLOW-ID  </td>
<td>创建 Flow 后返回的 Flow 编号  </td>
<td>1234567890  </td>
</tr>
</table>
**Flow 状态说明**: DRAFT（草稿，可编辑/删除）→ PUBLISHED（已发布，可发送）→ DEPRECATED（已停用）/ BLOCKED（端点异常）/ THROTTLED（限流，每小时 10 条）  
---
## 1. 创建 Flow
**参考文档**: [https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#create](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#create)  
**端点**: POST `/{WABA-ID}/flows`  
**请求示例**:  
```
curl -X POST '{BASE-URL}/{WABA-ID}/flows' \
  --header 'Authorization: Bearer {ACCESS-TOKEN}' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "My first flow",
    "categories": ["OTHER"],
    "flow_json": "{\"version\":\"5.0\",\"screens\":[{\"id\":\"WELCOME_SCREEN\",\"layout\":{\"type\":\"SingleColumnLayout\",\"children\":[{\"type\":\"TextHeading\",\"text\":\"Hello World\"},{\"type\":\"Footer\",\"label\":\"Complete\",\"on-click-action\":{\"name\":\"complete\",\"payload\":{}}}]},\"title\":\"Welcome\",\"terminal\":true,\"success\":true,\"data\":{}}]}",
    "publish": true
  }'
```
**参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>必填  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>name  </td>
<td>string  </td>
<td>**是**  </td>
<td>流程名称  </td>
<td>"My first flow"  </td>
</tr>
<tr>
<td>categories  </td>
<td>array  </td>
<td>**是**  </td>
<td>SIGN_UP, SIGN_IN, APPOINTMENT_BOOKING, LEAD_GENERATION, CONTACT_US, CUSTOMER_SUPPORT, SURVEY, OTHER  </td>
<td>["OTHER"]  </td>
</tr>
<tr>
<td>flow_json  </td>
<td>string  </td>
<td>否  </td>
<td>JSON 字符串编码的 Flow JSON  </td>
<td>"{\"version\":\"5.0\",\"screens\":[...]}"  </td>
</tr>
<tr>
<td>publish  </td>
<td>boolean  </td>
<td>否  </td>
<td>是否同时发布（需有效 flow_json）  </td>
<td>true  </td>
</tr>
<tr>
<td>clone_flow_id  </td>
<td>string  </td>
<td>否  </td>
<td>要克隆的源 Flow ID  </td>
<td>"1234567890"  </td>
</tr>
<tr>
<td>endpoint_uri  </td>
<td>string  </td>
<td>否  </td>
<td>WA Flow 端点 URL（Flow JSON v3.0+）  </td>
<td>"https://example.com/flow-endpoint"  </td>
</tr>
</table>
**响应示例**:  
```
{
  "id": "1234567890123456",
  "success": true,
  "validation_errors": [
    {
      "error": "INVALID_PROPERTY_VALUE",
      "error_type": "FLOW_JSON_ERROR",
      "message": "Invalid value found for property 'type'.",
      "line_start": 10,
      "line_end": 10,
      "column_start": 21,
      "column_end": 34,
      "pointers": [
        {
          "line_start": 10,
          "line_end": 10,
          "column_start": 21,
          "column_end": 34,
          "path": "screens[0].layout.children[0].type"
        }
      ]
    }
  ]
}
```
若同时提供 flow_json，响应中会包含 validation_errors；无错误时为空数组。  
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>id  </td>
<td>string  </td>
<td>新创建的 Flow ID  </td>
<td>"1234567890123456"  </td>
</tr>
<tr>
<td>success  </td>
<td>boolean  </td>
<td>是否成功创建  </td>
<td>true  </td>
</tr>
<tr>
<td>validation_errors  </td>
<td>array  </td>
<td>Flow JSON 验证错误列表（仅当请求含 flow_json 时返回）  </td>
<td>[]  </td>
</tr>
<tr>
<td>validation_errors[].error  </td>
<td>string  </td>
<td>错误码  </td>
<td>"INVALID_PROPERTY_VALUE"  </td>
</tr>
<tr>
<td>validation_errors[].error_type  </td>
<td>string  </td>
<td>错误类型  </td>
<td>"FLOW_JSON_ERROR"  </td>
</tr>
<tr>
<td>validation_errors[].message  </td>
<td>string  </td>
<td>错误描述  </td>
<td>"Invalid value found for property 'type'."  </td>
</tr>
<tr>
<td>validation_errors[].line_start  </td>
<td>integer  </td>
<td>错误起始行号  </td>
<td>10  </td>
</tr>
<tr>
<td>validation_errors[].line_end  </td>
<td>integer  </td>
<td>错误结束行号  </td>
<td>10  </td>
</tr>
<tr>
<td>validation_errors[].column_start  </td>
<td>integer  </td>
<td>错误起始列号  </td>
<td>21  </td>
</tr>
<tr>
<td>validation_errors[].column_end  </td>
<td>integer  </td>
<td>错误结束列号  </td>
<td>34  </td>
</tr>
<tr>
<td>validation_errors[].pointers  </td>
<td>array  </td>
<td>JSON 路径指针列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>validation_errors[].pointers[].path  </td>
<td>string  </td>
<td>错误字段路径  </td>
<td>"screens[0].layout.children[0].type"  </td>
</tr>
</table>
---
## 2. 更新 Flow 基础信息
**参考文档**: [https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#update](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#update)  
**端点**: POST `/{FLOW-ID}`  
**请求示例**:  
```
curl -X POST '{BASE-URL}/{FLOW-ID}' \
  --header 'Authorization: Bearer {ACCESS-TOKEN}' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "Updated Flow Name",
    "categories": ["LEAD_GENERATION", "CONTACT_US"],
    "endpoint_uri": "https://example.com/my-endpoint"
  }'
```
**参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>必填  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>name  </td>
<td>string  </td>
<td>否  </td>
<td>新流程名称  </td>
<td>"Updated Flow Name"  </td>
</tr>
<tr>
<td>categories  </td>
<td>array  </td>
<td>否  </td>
<td>新类别（不提供则保留现有）  </td>
<td>["LEAD_GENERATION","CONTACT_US"]  </td>
</tr>
<tr>
<td>endpoint_uri  </td>
<td>string  </td>
<td>否  </td>
<td>WA Flow 端点 URL（v3.0+）  </td>
<td>"https://example.com/my-endpoint"  </td>
</tr>
<tr>
<td>application_id  </td>
<td>string  </td>
<td>否  </td>
<td>绑定的 Meta 应用 ID  </td>
<td>"987654321"  </td>
</tr>
</table>
**响应示例**:  
```
{
  "success": true
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>success  </td>
<td>boolean  </td>
<td>是否成功更新元数据  </td>
<td>true  </td>
</tr>
</table>
---
## 3. 更新 Flows JSON
**参考文档**: [https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#update-json](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#update-json)  
**端点**: POST `/{FLOW_ID}/assets`  
**请求示例**:  
```
curl -X POST '{BASE-URL}/{FLOW_ID}/assets' \
  --header 'Authorization: Bearer {ACCESS-TOKEN}' \
  -F 'name=flow.json' \
  -F 'asset_type=FLOW_JSON' \
  -F 'file=@path/to/flow.json'
```
**参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>必填  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>name  </td>
<td>string  </td>
<td>**是**  </td>
<td>必须为 flow.json  </td>
<td>"flow.json"  </td>
</tr>
<tr>
<td>asset_type  </td>
<td>string  </td>
<td>**是**  </td>
<td>必须为 FLOW_JSON  </td>
<td>"FLOW_JSON"  </td>
</tr>
<tr>
<td>file  </td>
<td>file  </td>
<td>**是**  </td>
<td>JSON 文件，≤10 MB，form-data 上传  </td>
<td>@/path/to/flow.json  </td>
</tr>
</table>
**响应示例**:  
```
{
  "success": true,
  "validation_errors": [
    {
      "error": "INVALID_PROPERTY_VALUE",
      "error_type": "FLOW_JSON_ERROR",
      "message": "Invalid value found for property 'type'.",
      "line_start": 10,
      "line_end": 10,
      "column_start": 21,
      "column_end": 34,
      "pointers": [
        {
          "line_start": 10,
          "line_end": 10,
          "column_start": 21,
          "column_end": 34,
          "path": "screens[0].layout.children[0].type"
        }
      ]
    }
  ]
}
```
每个更新请求都会返回 Flow JSON 中的验证错误（如有）。  
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>success  </td>
<td>boolean  </td>
<td>是否成功接收并处理 JSON 文件  </td>
<td>true  </td>
</tr>
<tr>
<td>validation_errors  </td>
<td>array  </td>
<td>Flow JSON 验证错误列表；无错误时为空数组  </td>
<td>[]  </td>
</tr>
<tr>
<td>validation_errors[].error  </td>
<td>string  </td>
<td>错误码  </td>
<td>"INVALID_PROPERTY_VALUE"  </td>
</tr>
<tr>
<td>validation_errors[].error_type  </td>
<td>string  </td>
<td>错误类型  </td>
<td>"FLOW_JSON_ERROR"  </td>
</tr>
<tr>
<td>validation_errors[].message  </td>
<td>string  </td>
<td>人类可读的错误描述  </td>
<td>"Invalid value found for property 'type'."  </td>
</tr>
<tr>
<td>validation_errors[].line_start  </td>
<td>integer  </td>
<td>错误起始行号（从 1 开始）  </td>
<td>10  </td>
</tr>
<tr>
<td>validation_errors[].line_end  </td>
<td>integer  </td>
<td>错误结束行号  </td>
<td>10  </td>
</tr>
<tr>
<td>validation_errors[].column_start  </td>
<td>integer  </td>
<td>错误起始列号  </td>
<td>21  </td>
</tr>
<tr>
<td>validation_errors[].column_end  </td>
<td>integer  </td>
<td>错误结束列号  </td>
<td>34  </td>
</tr>
<tr>
<td>validation_errors[].pointers  </td>
<td>array  </td>
<td>JSON 路径指针列表，用于精确定位错误字段  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>validation_errors[].pointers[].path  </td>
<td>string  </td>
<td>错误字段在 Flow JSON 中的路径  </td>
<td>"screens[0].layout.children[0].type"  </td>
</tr>
<tr>
<td>validation_errors[].pointers[].line_start  </td>
<td>integer  </td>
<td>指针起始行号  </td>
<td>10  </td>
</tr>
<tr>
<td>validation_errors[].pointers[].line_end  </td>
<td>integer  </td>
<td>指针结束行号  </td>
<td>10  </td>
</tr>
<tr>
<td>validation_errors[].pointers[].column_start  </td>
<td>integer  </td>
<td>指针起始列号  </td>
<td>21  </td>
</tr>
<tr>
<td>validation_errors[].pointers[].column_end  </td>
<td>integer  </td>
<td>指针结束列号  </td>
<td>34  </td>
</tr>
</table>
---
## 4. 网页预览可视化 Flow
**参考文档**: [https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#preview](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#preview)  
**端点**: GET `/{FLOW-ID}?fields=preview.invalidate(false)`  
**请求示例**:  
```
curl '{BASE-URL}/{FLOW-ID}?fields=preview.invalidate(false)' \
  --header 'Authorization: Bearer {ACCESS-TOKEN}'
```
**响应示例**:  
```
{
  "preview": {
    "preview_url": "https://business.facebook.com/wa/manage/flows/55000..../preview/?token=b9d6.....",
    "expires_at": "2025-01-01T00:00:00+0000"
  },
  "id": "flow-1"
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>id  </td>
<td>string  </td>
<td>Flow ID  </td>
<td>"flow-1"  </td>
</tr>
<tr>
<td>preview  </td>
<td>object  </td>
<td>预览信息对象  </td>
<td>{...}  </td>
</tr>
<tr>
<td>preview.preview_url  </td>
<td>string  </td>
<td>预览页面链接，无需登录，30 天后过期  </td>
<td>"https://business.facebook.com/wa/manage/flows/.../preview/?token=..."  </td>
</tr>
<tr>
<td>preview.expires_at  </td>
<td>string  </td>
<td>预览链接过期时间（ISO 8601）  </td>
<td>"2023-05-21T11:18:09+0000"  </td>
</tr>
</table>
**预览 URL 参数**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>描述  </td>
</tr>
<tr>
<td>interactive  </td>
<td>boolean  </td>
<td>启用互动模式  </td>
</tr>
<tr>
<td>flow_token  </td>
<td>string  </td>
<td>验证令牌  </td>
</tr>
<tr>
<td>flow_action  </td>
<td>enum  </td>
<td>navigate / data_exchange  </td>
</tr>
<tr>
<td>flow_action_payload  </td>
<td>string  </td>
<td>JSON 初始数据（需 encodeURIComponent）  </td>
</tr>
<tr>
<td>phone_number  </td>
<td>string  </td>
<td>发送 Flow 的电话号码  </td>
</tr>
<tr>
<td>debug  </td>
<td>string  </td>
<td>调试面板  </td>
</tr>
</table>
**示例互动预览 URL**:  
```
https://business.facebook.com/wa/manage/flows/550.../preview/?token=b9d6...&interactive=true&flow_action=navigate&flow_action_payload=%7B%22screen%22%3A%22FIRST_SCREEN%22%2C%22data%22%3A%7B%22screen_heading%22%3A%22hello%20world%22%7D%7D&debug=true
```
---
## 5. 发布 Flow
**参考文档**: [https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#publish](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#publish)  
**端点**: POST `/{FLOW-ID}/publish`  
**请求示例**:  
```
curl -X POST '{BASE-URL}/{FLOW-ID}/publish' \
  --header 'Authorization: Bearer {ACCESS-TOKEN}'
```
**响应示例**:  
```
{
  "success": true
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>success  </td>
<td>boolean  </td>
<td>操作是否成功  </td>
<td>true  </td>
</tr>
</table>
---
## 6. 停用 Flow
**参考文档**: [https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#deprecate](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#deprecate)  
**端点**: POST `/{FLOW-ID}/deprecate`  
**请求示例**:  
```
curl -X POST '{BASE-URL}/{FLOW-ID}/deprecate' \
  --header 'Authorization: Bearer {ACCESS-TOKEN}'
```
**响应示例**:  
```
{
  "success": true
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>success  </td>
<td>boolean  </td>
<td>操作是否成功  </td>
<td>true  </td>
</tr>
</table>
---
## 7. WABA 之间迁移 Flow
**参考文档**: [https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#migrate](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#migrate)  
**端点**: POST `/{DESTINATION_WABA_ID}/migrate_flows?source_waba_id=<SOURCE>&source_flow_names=<NAMES>`  
**请求示例**:  
```
curl -X POST '{BASE-URL}/{DESTINATION_WABA_ID}/migrate_flows?source_waba_id=104996122399160&source_flow_names=flow1,flow2' \
  --header 'Authorization: Bearer {ACCESS-TOKEN}'
```
**参数**:  
<table>
<tr>
<td>参数  </td>
<td>位置  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>DESTINATION_WABA_ID  </td>
<td>path  </td>
<td>**必填**。目标 WABA ID  </td>
<td>"104996122399160"  </td>
</tr>
<tr>
<td>source_waba_id  </td>
<td>query  </td>
<td>**必填**。源 WABA ID  </td>
<td>"102290129340398"  </td>
</tr>
<tr>
<td>source_flow_names  <br/></td>
<td>query  </td>
<td>可选。Flow 名称 数组，最多 100 个  </td>
<td>["appointment-booking","lead-gen"]  </td>
</tr>
</table>
**响应示例**:  
```
{
  "migrated_flows": [
    {"source_name": "flow1", "source_id": "123", "migrated_id": "456"},
    {"source_name": "flow2", "source_id": "789", "migrated_id": "012"}
  ],
  "failed_flows": [
    {"source_name": "flow3", "error_code": "FLOW_EXISTS", "error_message": "A flow with this name already exists in the destination WABA"}
  ]
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>migrated_flows  </td>
<td>array  </td>
<td>成功迁移的 Flow 列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>migrated_flows[].source_name  </td>
<td>string  </td>
<td>源 WABA 中的 Flow 名称  </td>
<td>"appointment-booking"  </td>
</tr>
<tr>
<td>migrated_flows[].source_id  </td>
<td>string  </td>
<td>源 WABA 中的 Flow ID  </td>
<td>"1234"  </td>
</tr>
<tr>
<td>migrated_flows[].migrated_id  </td>
<td>string  </td>
<td>目标 WABA 中新创建的 Flow ID  </td>
<td>"5678"  </td>
</tr>
<tr>
<td>failed_flows  </td>
<td>array  </td>
<td>迁移失败的 Flow 列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>failed_flows[].source_name  </td>
<td>string  </td>
<td>失败的 Flow 名称  </td>
<td>"lead-gen"  </td>
</tr>
<tr>
<td>failed_flows[].error_code  </td>
<td>string  </td>
<td>错误码  </td>
<td>"4233041"  </td>
</tr>
<tr>
<td>failed_flows[].error_message  </td>
<td>string  </td>
<td>错误描述  </td>
<td>"Flows Migration Error: Flow with the same name exists in destination WABA."  </td>
</tr>
</table>
---
## 8. 删除 Flow
**参考文档**: [https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#delete](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#delete)  
**端点**: DELETE `/{FLOW-ID}`（仅 DRAFT 状态）  
**请求示例**:  
```
curl -X DELETE '{BASE-URL}/{FLOW-ID}' \
  --header 'Authorization: Bearer {ACCESS-TOKEN}'
```
**响应示例**:  
```
{
  "success": true
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>success  </td>
<td>boolean  </td>
<td>操作是否成功  </td>
<td>true  </td>
</tr>
</table>
---
## 9. 检索 WABA 下的 Flow 清单
**参考文档**: [https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#list](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#list)  
**端点**: GET `/{WABA-ID}/flows`  
**请求示例**:  
```
curl '{BASE-URL}/{WABA-ID}/flows' \
  --header 'Authorization: Bearer {ACCESS-TOKEN}'
```
**响应示例**:  
```
{
  "data": [
    {
      "id": "flow-1",
      "name": "My first flow",
      "status": "PUBLISHED",
      "categories": ["LEAD_GENERATION"],
      "validation_errors": []
    },
    {
      "id": "flow-2",
      "name": "Support flow",
      "status": "DRAFT",
      "categories": ["CONTACT_US"],
      "validation_errors": []
    }
  ],
  "paging": {
    "cursors": { "before": "MAZDZD", "after": "NEXTZDZD" }
  }
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>data  </td>
<td>array  </td>
<td>Flow 列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>data[].id  </td>
<td>string  </td>
<td>Flow ID  </td>
<td>"flow-1"  </td>
</tr>
<tr>
<td>data[].name  </td>
<td>string  </td>
<td>Flow 名称  </td>
<td>"My first flow"  </td>
</tr>
<tr>
<td>data[].status  </td>
<td>string  </td>
<td>DRAFT / PUBLISHED / DEPRECATED / BLOCKED / THROTTLED  </td>
<td>"PUBLISHED"  </td>
</tr>
<tr>
<td>data[].categories  </td>
<td>array  </td>
<td>Flow 类别列表  </td>
<td>["LEAD_GENERATION"]  </td>
</tr>
<tr>
<td>data[].validation_errors  </td>
<td>array  </td>
<td>验证错误列表  </td>
<td>[]  </td>
</tr>
<tr>
<td>paging  </td>
<td>object  </td>
<td>分页信息  </td>
<td>{...}  </td>
</tr>
<tr>
<td>paging.cursors.before  </td>
<td>string  </td>
<td>上一页游标  </td>
<td>"MAZDZD"  </td>
</tr>
<tr>
<td>paging.cursors.after  </td>
<td>string  </td>
<td>下一页游标  </td>
<td>"NEXTZDZD"  </td>
</tr>
</table>
---
## 10. 检索 Flow 详情
**参考文档**: [https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#details](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#details)  
**端点**: GET `/{FLOW-ID}?fields=id,name,categories,preview,status,validation_errors,json_version,data_api_version,endpoint_uri,whatsapp_business_account,application,health_status`  
**请求示例**:  
```
curl '{BASE-URL}/{FLOW-ID}?fields=id,name,categories,preview,status,validation_errors,json_version,data_api_version,endpoint_uri,whatsapp_business_account,application,health_status' \
  --header 'Authorization: Bearer {ACCESS-TOKEN}'
```
**返回字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>默认返回  </td>
<td>描述  </td>
</tr>
<tr>
<td>id  </td>
<td>string  </td>
<td>✓  </td>
<td>Flow 唯一编号  </td>
</tr>
<tr>
<td>name  </td>
<td>string  </td>
<td>✓  </td>
<td>用户定义的 Flow 名称  </td>
</tr>
<tr>
<td>status  </td>
<td>string  </td>
<td>✓  </td>
<td>DRAFT / PUBLISHED / DEPRECATED / BLOCKED / THROTTLED  </td>
</tr>
<tr>
<td>categories  </td>
<td>array  </td>
<td>✓  </td>
<td>类别列表  </td>
</tr>
<tr>
<td>validation_errors  </td>
<td>array  </td>
<td>✓  </td>
<td>验证错误列表  </td>
</tr>
<tr>
<td>json_version  </td>
<td>string  </td>
<td>-  </td>
<td>Flow JSON 版本  </td>
</tr>
<tr>
<td>data_api_version  </td>
<td>string  </td>
<td>-  </td>
<td>数据 API 版本  </td>
</tr>
<tr>
<td>data_channel_uri  </td>
<td>string  </td>
<td>-  </td>
<td>[已弃用] 改用 endpoint_uri  </td>
</tr>
<tr>
<td>endpoint_uri  </td>
<td>string  </td>
<td>-  </td>
<td>WA Flow 端点 URL  </td>
</tr>
<tr>
<td>preview  </td>
<td>object  </td>
<td>-  </td>
<td>预览 URL 和过期时间  </td>
</tr>
<tr>
<td>whatsapp_business_account  </td>
<td>object  </td>
<td>-  </td>
<td>拥有 Flow 的 WABA  </td>
</tr>
<tr>
<td>application  </td>
<td>object  </td>
<td>-  </td>
<td>创建 Flow 的 Meta 应用  </td>
</tr>
<tr>
<td>health_status  </td>
<td>object  </td>
<td>-  </td>
<td>健康状态摘要  </td>
</tr>
</table>
**health_status.can_send_message**: AVAILABLE / LIMITED / BLOCKED  
**响应示例**:  
```
{
  "id": "1234567890123456",
  "name": "My Lead Gen Flow",
  "status": "DRAFT",
  "categories": ["LEAD_GENERATION"],
  "validation_errors": [],
  "json_version": "3.0",
  "data_api_version": "3.0",
  "endpoint_uri": "https://example.com/flow-endpoint",
  "preview": {
    "preview_url": "https://business.facebook.com/wa/manage/flows/55000..../preview/?token=b9d6.....",
    "expires_at": "2023-05-21T11:18:09+0000"
  },
  "whatsapp_business_account": {
    "id": "104996122399160"
  },
  "application": {
    "id": "987654321"
  },
  "health_status": {
    "can_send_message": "BLOCKED",
    "entities": [
      {
        "entity_type": "FLOW",
        "id": "1234567890123456",
        "can_send_message": "BLOCKED",
        "errors": [
          {
            "error_code": 131000,
            "error_description": "endpoint_uri: You need to set the endpoint URI before you can send or publish a flow.",
            "possible_solution": "/documentation/business-messaging/whatsapp/flows/guides/flowjson#top-level-flow-json-properties"
          },
          {
            "error_code": 131000,
            "error_description": "app_check: You need to connect a Meta app to the flow before you can send or publish it.",
            "possible_solution": "/docs/development/create-an-app"
          }
        ]
      },
      {
        "entity_type": "WABA",
        "id": "104996122399160",
        "can_send_message": "AVAILABLE"
      },
      {
        "entity_type": "BUSINESS",
        "id": "112233445566778",
        "can_send_message": "AVAILABLE"
      },
      {
        "entity_type": "APP",
        "id": "987654321",
        "can_send_message": "LIMITED",
        "additional_info": [
          "Your app is not subscribed to the message webhook. This means you will not receive any messages sent to your phone number."
        ]
      }
    ]
  }
}
```
**health_status 嵌套字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>health_status.can_send_message  </td>
<td>string  </td>
<td>整体可发送状态：AVAILABLE / LIMITED / BLOCKED  </td>
<td>"BLOCKED"  </td>
</tr>
<tr>
<td>health_status.entities  </td>
<td>array  </td>
<td>各节点（FLOW / WABA / BUSINESS / APP）健康状态  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>entities[].entity_type  </td>
<td>string  </td>
<td>节点类型  </td>
<td>"FLOW"  </td>
</tr>
<tr>
<td>entities[].id  </td>
<td>string  </td>
<td>节点 ID  </td>
<td>"1234567890123456"  </td>
</tr>
<tr>
<td>entities[].can_send_message  </td>
<td>string  </td>
<td>该节点可发送状态  </td>
<td>"BLOCKED"  </td>
</tr>
<tr>
<td>entities[].errors  </td>
<td>array  </td>
<td>BLOCKED 时的错误列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>entities[].errors[].error_code  </td>
<td>integer  </td>
<td>错误码  </td>
<td>131000  </td>
</tr>
<tr>
<td>entities[].errors[].error_description  </td>
<td>string  </td>
<td>错误描述  </td>
<td>"endpoint_uri: You need to set..."  </td>
</tr>
<tr>
<td>entities[].errors[].possible_solution  </td>
<td>string  </td>
<td>可能的解决方案文档路径  </td>
<td>"/documentation/..."  </td>
</tr>
<tr>
<td>entities[].additional_info  </td>
<td>array  </td>
<td>LIMITED 时的附加说明  </td>
<td>["Your app is not subscribed..."]  </td>
</tr>
</table>
---
## 11. 检索 Flow 附加的所有资产
**参考文档**: [https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#asset-list](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowsapi#asset-list)  
**端点**: GET `/{FLOW-ID}/assets`  
**请求示例**:  
```
curl '{BASE-URL}/{FLOW-ID}/assets' \
  --header 'Authorization: Bearer {ACCESS-TOKEN}'
```
**响应示例**:  
```
{
  "data": [
    {
      "name": "flow.json",
      "asset_type": "FLOW_JSON",
      "download_url": "https://scontent.xx.fbcdn.net/m1/v/t0.57323-24/An_Hq0jnfJ..."
    }
  ],
  "paging": {
    "cursors": {
      "before": "QVFIU...",
      "after": "QVFIU..."
    }
  }
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>data  </td>
<td>array  </td>
<td>Flow 附加资产列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>data[].name  </td>
<td>string  </td>
<td>资产文件名  </td>
<td>"flow.json"  </td>
</tr>
<tr>
<td>data[].asset_type  </td>
<td>string  </td>
<td>资产类型，Flow JSON 为 FLOW_JSON  </td>
<td>"FLOW_JSON"  </td>
</tr>
<tr>
<td>data[].download_url  </td>
<td>string  </td>
<td>资产下载 URL（有时效）  </td>
<td>"https://scontent.xx.fbcdn.net/..."  </td>
</tr>
<tr>
<td>paging  </td>
<td>object  </td>
<td>分页信息  </td>
<td>{...}  </td>
</tr>
<tr>
<td>paging.cursors.before  </td>
<td>string  </td>
<td>上一页游标  </td>
<td>"QVFIU..."  </td>
</tr>
<tr>
<td>paging.cursors.after  </td>
<td>string  </td>
<td>下一页游标  </td>
<td>"QVFIU..."  </td>
</tr>
</table>
---
**注意事项（Flow，来源需求说明书）**  
1. Flow 的发送仍走消息发送 API；目前已支持单节点 Flow 消息，多节点 Flow 是否涉及传参调整需技术侧 Check
2. 账单需要同步
3. 数据本期不用入库
# 三、补充 API
**说明**: 以下 API 不在需求说明书范围内，为 Meta Product Catalog / Flow 的补充能力，供技术调研参考。  
---
## 12. 目录权限管理（assigned_users）
**参考文档**: [https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog/assigned_users](https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog/assigned_users)  
<table>
<tr>
<td>操作  </td>
<td>端点  </td>
<td>必填参数  </td>
<td>请求示例  </td>
</tr>
<tr>
<td>读取  </td>
<td>GET `/{id}/assigned_users?business=<ID>`  </td>
<td>business  </td>
<td>`curl -G -d 'access_token=<TOKEN>' 'https://graph.facebook.com/<VER>/{catalog_id}/assigned_users?business=<BUSINESS_ID>'`  </td>
</tr>
<tr>
<td>分配  </td>
<td>POST `/{id}/assigned_users`  </td>
<td>user (UID), tasks (MANAGE/ADVERTISE/MANAGE_AR/AA_ANALYZE)  </td>
<td>`curl -X POST -F 'user=<USER_ID>' -F 'tasks=["MANAGE","ADVERTISE"]' -F 'access_token=<TOKEN>' 'https://graph.facebook.com/<VER>/{catalog_id}/assigned_users'`  </td>
</tr>
<tr>
<td>移除  </td>
<td>DELETE `/{id}/assigned_users`  </td>
<td>user (UID)  </td>
<td>`curl -X DELETE -F 'user=<USER_ID>' -F 'access_token=<TOKEN>' 'https://graph.facebook.com/<VER>/{catalog_id}/assigned_users'`  </td>
</tr>
</table>
**读取响应示例**:  
```
{
  "data": [
    {
      "user": { "id": "12345", "name": "John Doe" },
      "tasks": ["MANAGE", "ADVERTISE"]
    }
  ]
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>data  </td>
<td>array  </td>
<td>已分配用户列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>data[].user  </td>
<td>object  </td>
<td>用户信息  </td>
<td>{...}  </td>
</tr>
<tr>
<td>data[].user.id  </td>
<td>string  </td>
<td>用户 ID  </td>
<td>"12345"  </td>
</tr>
<tr>
<td>data[].user.name  </td>
<td>string  </td>
<td>用户名称  </td>
<td>"John Doe"  </td>
</tr>
<tr>
<td>data[].tasks  </td>
<td>array  </td>
<td>权限任务列表：MANAGE / ADVERTISE / MANAGE_AR / AA_ANALYZE  </td>
<td>["MANAGE","ADVERTISE"]  </td>
</tr>
</table>
---
## 13. 外部事件源管理（external_event_sources）
**参考文档**: <a href=" https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog/external_event_sources\>https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog/external_event_sources  
<table>
<tr>
<td>操作  </td>
<td>端点  </td>
<td>请求示例  </td>
</tr>
<tr>
<td>查看  </td>
<td>GET `/{id}/external_event_sources`  </td>
<td>`curl -G -d 'access_token=<TOKEN>' 'https://graph.facebook.com/<VER>/{catalog_id}/external_event_sources'`  </td>
</tr>
<tr>
<td>关联  </td>
<td>POST `/{id}/external_event_sources`  </td>
<td>`curl -X POST -F 'external_event_sources=[<PIXEL_ID>,<APP_ID>]' -F 'access_token=<TOKEN>' 'https://graph.facebook.com/<VER>/{catalog_id}/external_event_sources'`  </td>
</tr>
</table>
**响应示例**:  
```
{
  "data": [
    { "id": "123456789", "type": "PIXEL", "name": "My Pixel" }
  ]
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>data  </td>
<td>array  </td>
<td>已关联的外部事件源列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>data[].id  </td>
<td>string  </td>
<td>Pixel ID 或 App ID  </td>
<td>"123456789"  </td>
</tr>
<tr>
<td>data[].type  </td>
<td>string  </td>
<td>事件源类型：PIXEL / APP 等  </td>
<td>"PIXEL"  </td>
</tr>
<tr>
<td>data[].name  </td>
<td>string  </td>
<td>事件源名称  </td>
<td>"My Pixel"  </td>
</tr>
</table>
---
## 14. 数据源查询（data_sources）
**参考文档**: [product-catalog/data_sources](https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog/data_sources)  
**端点**: GET `/{product_catalog_id}/data_sources?ingestion_source_type=ALL`  
**请求示例**:  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>ingestion_source_type  </td>
<td>enum  </td>
<td>ALL / PRIMARY_FEED / SUPPLEMENTARY_FEED 等  </td>
<td>"ALL"  </td>
</tr>
</table>
```
curl -G \
  -d 'ingestion_source_type=ALL' \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/<API_VERSION>/<PRODUCT_CATALOG_ID>/data_sources
```
**响应示例**:  
```
{
  "data": [
    {
      "id": "ds_123",
      "name": "Main Feed",
      "ingestion_source_type": "PRIMARY_FEED",
      "creation_time": "2025-01-01T00:00:00+0000"
    }
  ]
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>data  </td>
<td>array  </td>
<td>数据源列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>data[].id  </td>
<td>string  </td>
<td>数据源 ID  </td>
<td>"ds_123"  </td>
</tr>
<tr>
<td>data[].name  </td>
<td>string  </td>
<td>数据源名称  </td>
<td>"Main Feed"  </td>
</tr>
<tr>
<td>data[].ingestion_source_type  </td>
<td>string  </td>
<td>来源类型：PRIMARY_FEED / SUPPLEMENTARY_FEED 等  </td>
<td>"PRIMARY_FEED"  </td>
</tr>
<tr>
<td>data[].creation_time  </td>
<td>string  </td>
<td>创建时间（ISO 8601）  </td>
<td>"2025-01-01T00:00:00+0000"  </td>
</tr>
</table>
---
## 15. 目录诊断（diagnostics）
**参考文档**: [product-catalog/diagnostics](https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog/diagnostics)  
**端点**: GET `/{product_catalog_id}/diagnostics`  
**参数**: affected_channels, affected_entities, severities, types  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>severities  </td>
<td>array  </td>
<td>严重程度：HIGH, MEDIUM, LOW  </td>
<td>["HIGH"]  </td>
</tr>
<tr>
<td>types  </td>
<td>array  </td>
<td>问题类型，如 IMAGE_RESOLUTION_LOW  </td>
<td>["IMAGE_RESOLUTION_LOW"]  </td>
</tr>
<tr>
<td>affected_channels  </td>
<td>array  </td>
<td>受影响渠道  </td>
<td>["WHATSAPP"]  </td>
</tr>
<tr>
<td>affected_entities  </td>
<td>array  </td>
<td>受影响实体  </td>
<td>["PRODUCT_ITEM"]  </td>
</tr>
</table>
**请求示例**:  
```
curl -G \
  -d 'severities=HIGH' \
  -d 'types=IMAGE_RESOLUTION_LOW' \
  -d 'access_token=<ACCESS_TOKEN>' \
  https://graph.facebook.com/<API_VERSION>/<PRODUCT_CATALOG_ID>/diagnostics
```
**响应示例**:  
```
{
  "data": [
    {
      "severity": "HIGH",
      "error_type": "IMAGE_RESOLUTION_LOW",
      "total_items_affected": 12,
      "title": "Missing or invalid images",
      "description": "The main image resolution is too low."
    }
  ]
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>data  </td>
<td>array  </td>
<td>诊断问题列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>data[].severity  </td>
<td>string  </td>
<td>严重程度：HIGH / MEDIUM / LOW  </td>
<td>"HIGH"  </td>
</tr>
<tr>
<td>data[].error_type  </td>
<td>string  </td>
<td>问题类型，如 IMAGE_RESOLUTION_LOW  </td>
<td>"IMAGE_RESOLUTION_LOW"  </td>
</tr>
<tr>
<td>data[].total_items_affected  </td>
<td>integer  </td>
<td>受影响商品数量  </td>
<td>12  </td>
</tr>
<tr>
<td>data[].title  </td>
<td>string  </td>
<td>问题标题  </td>
<td>"Missing or invalid images"  </td>
</tr>
<tr>
<td>data[].description  </td>
<td>string  </td>
<td>问题描述  </td>
<td>"The main image resolution is too low."  </td>
</tr>
</table>
---
## 16. Flow 指标查询（Metrics API）→ 2026-04-30 停用
**端点**: GET `/{Flow-ID}?fields=metric.name(<NAME>).granularity(<G>).since(<D>).until(<D>)`  
**指标**: ENDPOINT_REQUEST_COUNT, ENDPOINT_REQUEST_ERROR, ENDPOINT_REQUEST_ERROR_RATE, ENDPOINT_REQUEST_LATENCY_SECONDS_CEIL, ENDPOINT_AVAILABILITY  
**请求示例**:  
```
curl '{BASE-URL}/{FLOW-ID}?fields=metric.name(ENDPOINT_REQUEST_COUNT).granularity(DAILY).since(2025-01-01).until(2025-01-31)' \
  --header 'Authorization: Bearer {ACCESS-TOKEN}'
```
**响应示例**:  
```
{
  "id": "flow-1",
  "metric": {
    "granularity": "DAY",
    "name": "ENDPOINT_REQUEST_COUNT",
    "data_points": [
      {
        "timestamp": "2024-01-28T08:00:00+0000",
        "data": [{ "key": "value", "value": 138 }]
      },
      {
        "timestamp": "2024-01-29T08:00:00+0000",
        "data": [{ "key": "value", "value": 361 }]
      }
    ]
  }
}
```
**响应字段**:  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
<td>示例值  </td>
</tr>
<tr>
<td>id  </td>
<td>string  </td>
<td>Flow ID  </td>
<td>"flow-1"  </td>
</tr>
<tr>
<td>metric  </td>
<td>object  </td>
<td>指标数据对象  </td>
<td>{...}  </td>
</tr>
<tr>
<td>metric.name  </td>
<td>string  </td>
<td>指标名称：ENDPOINT_REQUEST_COUNT / ENDPOINT_REQUEST_ERROR / ENDPOINT_REQUEST_ERROR_RATE / ENDPOINT_REQUEST_LATENCY_SECONDS_CEIL / ENDPOINT_AVAILABILITY  </td>
<td>"ENDPOINT_REQUEST_COUNT"  </td>
</tr>
<tr>
<td>metric.granularity  </td>
<td>string  </td>
<td>时间粒度：DAY / HOUR / LIFETIME  </td>
<td>"DAY"  </td>
</tr>
<tr>
<td>metric.data_points  </td>
<td>array  </td>
<td>指标数据点列表  </td>
<td>[{...}]  </td>
</tr>
<tr>
<td>data_points[].timestamp  </td>
<td>string  </td>
<td>数据点时间戳（ISO 8601）  </td>
<td>"2024-01-28T08:00:00+0000"  </td>
</tr>
<tr>
<td>data_points[].data  </td>
<td>array  </td>
<td>键值对数据；COUNT 类指标 key 固定为 value，ERROR 类为错误类型，LATENCY 类为分位数  </td>
<td>[{"key":"value","value":138}]  </td>
</tr>
<tr>
<td>data_points[].data[].key  </td>
<td>string  </td>
<td>指标键：COUNT 为 "value"；ERROR 为 timeout_error 等；LATENCY 为分位数 "1"/"2" 等  </td>
<td>"value"  </td>
</tr>
<tr>
<td>data_points[].data[].value  </td>
<td>number  </td>
<td>指标数值（请求数、错误数、错误率或延迟毫秒数）  </td>
<td>138  </td>
</tr>
</table>
---
## 17. Flow Webhooks
**参考文档**: [Flows Webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowswebhooks)（Meta 官方，更新于 2026-06-16）  
本指南描述 WhatsApp Flows 可用的 Webhooks，包括应订阅哪些 Webhook 以及如何监控。主要类型包括：**Flow response message**（用户完成 Flow 后的响应消息）、**Flows status changes**（状态变更）及 endpoint 性能监控类 Webhook。  
### Flow response message webhook（Flow 响应消息）
当用户**完成 Flow**后，会在 WhatsApp 聊天中收到一条响应消息。该消息通过处理**所有用户消息**的同一 Webhook 接收（与 `flows` field 的状态类 Webhook 不同，走 `messages` 消息 Webhook）。  
`response_json` 字段包含 Flow 相关数据，其结构由 Flow JSON 定义；对于 endpoint 驱动的 Flow，则由 endpoint 的最终响应 payload 控制。  
**注意**：Flow 响应消息不包含 Flow ID。可在 Flow payload 中自定义字段，或在 `flow_token` 字段中携带标识符，以关联对应的 Flow。  
**Webhook 负载示例**：  
```
{
  "messages": [{
    "context": {
      "from": "16315558151",
      "id": "gBGGEiRVVgBPAgm7FUgc73noXjo"
    },
    "from": "USER_ACCOUNT_NUMBER",
    "id": "MESSAGE_ID",
    "type": "interactive",
    "interactive": {
      "type": "nfm_reply",
      "nfm_reply": {
        "name": "flow",
        "body": "Sent",
        "response_json": "{\"flow_token\": \"FLOW_TOKEN\", \"optional_param1\": \"value1\"}"
      }
    },
    "timestamp": "MESSAGE_SEND_TIMESTAMP"
  }]
}
```
**字段说明**：  
<table>
<tr>
<td>参数  </td>
<td>类型  </td>
<td>描述  </td>
</tr>
<tr>
<td>context  </td>
<td>object  </td>
<td>用户回复的消息上下文，包含 Flow 请求消息的 message_id 和发送方号码  </td>
</tr>
<tr>
<td>context.from  </td>
<td>string  </td>
<td>用户的 WhatsApp 账号号码  </td>
</tr>
<tr>
<td>context.id  </td>
<td>string  </td>
<td>消息 ID  </td>
</tr>
<tr>
<td>type  </td>
<td>string  </td>
<td>固定为 interactive  </td>
</tr>
<tr>
<td>interactive.type  </td>
<td>string  </td>
<td>固定为 nfm_reply  </td>
</tr>
<tr>
<td>interactive.nfm_reply.name  </td>
<td>string  </td>
<td>固定为 flow  </td>
</tr>
<tr>
<td>interactive.nfm_reply.body  </td>
<td>string  </td>
<td>固定为 Sent  </td>
</tr>
<tr>
<td>interactive.nfm_reply.response_json  </td>
<td>string  </td>
<td>Flow 相关数据（JSON 字符串）。结构由 Flow JSON 的 Complete action 定义；若 Flow 使用 endpoint，则由 Data Exchange Request 的 Final Response Payload 控制  </td>
</tr>
<tr>
<td>timestamp  </td>
<td>string  </td>
<td>Flow 响应消息的发送时间  </td>
</tr>
</table>
### Webhook 通知对象
由嵌套的 JSON 数组和对象组成，包含变更信息。  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>描述  </td>
</tr>
<tr>
<td>object  </td>
<td>string  </td>
<td>业务已订阅的 Webhook 对象，固定为 `whatsapp_business_account`  </td>
</tr>
<tr>
<td>entry  </td>
<td>array  </td>
<td>Entry 对象数组  </td>
</tr>
<tr>
<td>entry[].id  </td>
<td>string  </td>
<td>已订阅该 Webhook 的 WhatsApp Business Account（WABA）ID  </td>
</tr>
<tr>
<td>entry[].time  </td>
<td>integer  </td>
<td>事件时间戳（Unix）  </td>
</tr>
<tr>
<td>entry[].changes  </td>
<td>array  </td>
<td>Change 对象数组  </td>
</tr>
<tr>
<td>changes[].value  </td>
<td>object  </td>
<td>Value 对象，见下表  </td>
</tr>
<tr>
<td>changes[].field  </td>
<td>string  </td>
<td>通知类型，固定为 `flows`  </td>
</tr>
</table>
### Value 对象
包含触发 Webhook 的变更详情，嵌套在 `entry[].changes[].value` 中。不同 `event` 类型携带的字段不同，下表列出全部可能字段。  
<table>
<tr>
<td>字段  </td>
<td>类型  </td>
<td>适用 event  </td>
<td>描述  </td>
</tr>
<tr>
<td>flow_id  </td>
<td>string  </td>
<td>全部  </td>
<td>Flow ID  </td>
</tr>
<tr>
<td>event  </td>
<td>string  </td>
<td>全部  </td>
<td>通知类型：FLOW_STATUS_CHANGE / CLIENT_ERROR_RATE / ENDPOINT_ERROR_RATE / ENDPOINT_LATENCY / ENDPOINT_AVAILABILITY / FLOW_VERSION_EXPIRY_WARNING  </td>
</tr>
<tr>
<td>message  </td>
<td>string  </td>
<td>多数类型  </td>
<td>描述 Webhook 的详细消息  </td>
</tr>
<tr>
<td>old_status  </td>
<td>string  </td>
<td>FLOW_STATUS_CHANGE  </td>
<td>变更前状态：DRAFT / PUBLISHED / DEPRECATED / BLOCKED / THROTTLED（Flow 创建时不设置）  </td>
</tr>
<tr>
<td>new_status  </td>
<td>string  </td>
<td>FLOW_STATUS_CHANGE  </td>
<td>变更后状态：DRAFT / PUBLISHED / DEPRECATED / BLOCKED / THROTTLED  </td>
</tr>
<tr>
<td>threshold  </td>
<td>number  </td>
<td>错误率 / 延迟 / 可用性  </td>
<td>达到或恢复的告警阈值  </td>
</tr>
<tr>
<td>alert_state  </td>
<td>string  </td>
<td>性能监控类  </td>
<td>告警状态：ACTIVATED（触发）/ DEACTIVATED（恢复）  </td>
</tr>
<tr>
<td>error_rate  </td>
<td>number  </td>
<td>CLIENT_ERROR_RATE / ENDPOINT_ERROR_RATE  </td>
<td>整体错误率  </td>
</tr>
<tr>
<td>errors  </td>
<td>array  </td>
<td>CLIENT_ERROR_RATE / ENDPOINT_ERROR_RATE  </td>
<td>错误明细数组，每项含 error_type、error_rate、error_count  </td>
</tr>
<tr>
<td>errors[].error_type  </td>
<td>string  </td>
<td>同上  </td>
<td>错误类型名称，详见 Error Codes 文档 Webhook Alerts 章节  </td>
</tr>
<tr>
<td>errors[].error_rate  </td>
<td>number  </td>
<td>同上  </td>
<td>该错误类型的错误率  </td>
</tr>
<tr>
<td>errors[].error_count  </td>
<td>integer  </td>
<td>同上  </td>
<td>该错误类型的出现次数  </td>
</tr>
<tr>
<td>p50_latency  </td>
<td>integer  </td>
<td>ENDPOINT_LATENCY  </td>
<td>Endpoint 请求的 P50 延迟（毫秒）  </td>
</tr>
<tr>
<td>p90_latency  </td>
<td>integer  </td>
<td>ENDPOINT_LATENCY  </td>
<td>Endpoint 请求的 P90 延迟（毫秒）  </td>
</tr>
<tr>
<td>requests_count  </td>
<td>integer  </td>
<td>ENDPOINT_LATENCY  </td>
<td>用于计算指标的请求数量  </td>
</tr>
<tr>
<td>availability  </td>
<td>number  </td>
<td>ENDPOINT_AVAILABILITY  </td>
<td>Endpoint 可用性百分比  </td>
</tr>
<tr>
<td>warning  </td>
<td>string  </td>
<td>FLOW_STATUS_CHANGE / FLOW_VERSION_EXPIRY_WARNING  </td>
<td>Flow 版本即将冻结/过期的警告信息  </td>
</tr>
</table>
### Status change webhook（状态变更）
当 Flow 状态发生变更时发送通知，具体在 Flow 变为 `PUBLISHED`、`THROTTLED`、`BLOCKED` 或 `DEPRECATED` 时触发。  
**状态变更示例**：  
```
{
  "entry": [
    {
      "id": "644600416743275",
      "time": 1684969340,
      "changes": [
        {
          "value": {
            "event": "FLOW_STATUS_CHANGE",
            "message": "Flow Webhook 3 changed status from DRAFT to PUBLISHED",
            "flow_id": "6627390910605886",
            "old_status": "DRAFT",
            "new_status": "PUBLISHED"
          },
          "field": "flows"
        }
      ]
    }
  ],
  "object": "whatsapp_business_account"
}
```
**Flow 创建事件**：创建 Flow 时也会发送通知。此时 `old_status` 不会设置，`new_status` 默认为 `DRAFT`。  
```
{
  "entry": [
    {
      "id": "644600416743275",
      "time": 1684969340,
      "changes": [
        {
          "value": {
            "event": "FLOW_STATUS_CHANGE",
            "message": "Flow Webhook 3 has been created with DRAFT status",
            "flow_id": "6627390910605886",
            "new_status": "DRAFT"
          },
          "field": "flows"
        }
      ]
    }
  ],
  "object": "whatsapp_business_account"
}
```
### Client error rate webhook（客户端错误率）
客户端错误率为近似值，并非所有客户端设备和地区都可用。当客户端屏幕导航的错误率超过阈值（5% / 10% / 50%）时会发送通知，降至阈值以下时再次通知。检测周期为 **60 分钟**。  
**建议处理**：检查告警中的 errors 列表，参考 Error Codes 文档排查。  
```
{
  "entry": [{
    "id": "106181168862417",
    "time": 1674160476,
    "changes": [{
      "value": {
        "event": "CLIENT_ERROR_RATE",
        "message": "The flow client request error rate has reached the 5% threshold in the last 60 minutes...",
        "flow_id": "691244242662581",
        "error_rate": 14.28,
        "threshold": 10,
        "alert_state": "ACTIVATED",
        "errors": [
          {"error_type": "INVALID_SCREEN_TRANSITION", "error_rate": 66.66, "error_count": 2},
          {"error_type": "PUBLIC_KEY_MISSING", "error_rate": 33.33, "error_count": 1}
        ]
      },
      "field": "flows"
    }]
  }],
  "object": "whatsapp_business_account"
}
```
### Endpoint error rate webhook（Endpoint 错误率）
当 Endpoint 请求错误率超过阈值（5% / 10% / 50%）时发送通知，降至阈值以下时再次通知。检测周期为 **30 分钟**。  
**建议处理**：检查告警中的 errors 列表，参考 Error Codes 文档排查。  
```
{
  "entry": [{
    "id": "106181168862417",
    "time": 1674160476,
    "changes": [{
      "value": {
        "event": "ENDPOINT_ERROR_RATE",
        "message": "The flow endpoint request error rate has reached the 10% threshold in the last 30 minutes...",
        "flow_id": "691244242662581",
        "error_rate": 14.28,
        "threshold": 10,
        "alert_state": "ACTIVATED",
        "errors": [
          {"error_type": "CAPABILITY_ERROR", "error_rate": 66.66, "error_count": 2},
          {"error_type": "TIMEOUT", "error_rate": 33.33, "error_count": 1}
        ]
      },
      "field": "flows"
    }]
  }],
  "object": "whatsapp_business_account"
}
```
### Endpoint latency webhook（Endpoint 延迟）
当 Endpoint 请求的 P90 延迟超过阈值（1s / 5s / 7s）时发送通知，降至阈值以下时再次通知。检测周期为 **30 分钟**。  
**建议处理**：提升 Endpoint 响应速度，目标在 1 秒内返回。  
```
{
  "entry": [{
    "id": "106181168862417",
    "time": 1674160476,
    "changes": [{
      "value": {
        "event": "ENDPOINT_LATENCY",
        "message": "Flow endpoint latency has reached the p90 threshold in the last 30 minutes...",
        "flow_id": "691244242662581",
        "p90_latency": 8000,
        "p50_latency": 500,
        "requests_count": 34,
        "threshold": 7000,
        "alert_state": "ACTIVATED"
      },
      "field": "flows"
    }]
  }],
  "object": "whatsapp_business_account"
}
```
### Endpoint availability webhook（Endpoint 可用性）
当 Endpoint 可用性低于 **90%** 阈值时发送通知，恢复至阈值以上时再次通知。检测周期为 **10 分钟**。  
**建议处理**：确保 Endpoint 持续可从公网访问，并能正确响应 health check 请求。  
```
{
  "entry": [{
    "id": "106181168862417",
    "time": 1674160476,
    "changes": [{
      "value": {
        "event": "ENDPOINT_AVAILABILITY",
        "message": "The flow endpoint availability has breached the 90% threshold in the last 10 minutes...",
        "flow_id": "12345678",
        "alert_state": "ACTIVATED",
        "availability": 75,
        "threshold": 90
      },
      "field": "flows"
    }]
  }],
  "object": "whatsapp_business_account"
}
```
> 文档整理时间: 2026-06-25 | 本次更新: 2026-06-30（对照 Meta Flows Webhooks 官方文档，含 Value 对象全字段及性能监控 Webhook 示例）  
