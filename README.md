# 本地工具集

### 手动启动 HTTP 服务

```bash
./start-tools-http.sh
```

启动后在浏览器打开：`http://tools.localhost/`

### 登录自动启动

```bash
./install-tools-http-launchd.sh
```

安装后会创建用户级 launchd 服务，不需要 sudo。日志位置：`~/Library/Logs/tools-http/server.log`

卸载自动启动：

```bash
./uninstall-tools-http-launchd.sh
```
