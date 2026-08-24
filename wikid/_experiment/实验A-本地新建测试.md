# 实验A-本地新建测试
---

这个文档放在本地子目录 `_experiment/` 里，用来验证：  
- 本地新建到子目录 → 跑 update → 飞书是否自动在同名容器下创建对应文档

## 测试用例

1. 本地创建此文件
2. 跑 `npm run update`
3. 看飞书根是否出现 "_experiment" 容器
4. 看飞书"_experiment"容器下是否出现此文档

## 期望

- 飞书侧应该自动创建 `_experiment` 容器节点
- 本文应被推送到 `_experiment` 容器下（不是根）
