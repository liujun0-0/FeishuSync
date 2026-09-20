# ops/startup

系统开机自启入口，不包含同步业务逻辑。

- `_autostart_watchdog.cmd`：Windows 启动项。
- `_autostart_watchdog.vbs`：Windows 隐藏窗口包装器。
- `_autostart_watchdog.sh`：Linux/macOS 启动脚本。
- `feishu-sync-watchdog.service`：Linux systemd 服务。

这些入口最终都会启动项目根目录下的 `scripts/watchdog.js`。
