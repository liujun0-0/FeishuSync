# ops

运维入口，与同步业务代码分开。

- `startup/`：系统登录或开机时自动启动 watchdog。
- `launcher/`：人工使用的交互式菜单。

`startup` 适合无人值守运行，`launcher` 适合开发和排障时手动操作。
