# 黑凤梨进化系统

结论：这是一个手机端 PWA（可添加到主屏幕的网页 App）项目。第一版是纯前端版本，只负责展示 AI 行业动态，不抓取你的私人数据，不需要 API Key（接口密钥），也不会读取 `.env`。

## 文件说明

1. `index.html`：页面入口，包含 iPhone 主屏幕适配和 PWA 注册。
2. `style.css`：深色手机看板样式。
3. `app.js`：读取 AI HOT 公开接口、筛选标签、计算“对我是否有用”、保存最近 7 天本地缓存。
4. `manifest.json`：PWA 配置文件，控制 App 名称、图标、启动方式。
5. `service-worker.js`：离线缓存基础页面资源，让手机离线时也能打开上一次页面。
6. `icons/`：主屏幕图标。

## 数据源和 CORS 说明

当前数据源使用 AI HOT 公开接口：

```text
https://aihot.virxact.com/api/public/items
```

我检查到接口响应头里暂时没有明确的 `Access-Control-Allow-Origin`。这意味着：在浏览器里直接请求时，可能会遇到 CORS（跨域限制）。

如果遇到 CORS，页面会显示黄色提示，并使用本地缓存或示例数据。

备用方案：

1. 用一个很小的后端代理转发 AI HOT 数据。
2. 用定时脚本把 AI HOT 数据保存成项目里的 `data.json`，PWA 只读取本地 JSON。
3. 等 AI HOT 接口开放浏览器跨域访问后，纯前端直接读取即可。

## 本地运行

Mac 操作：

```bash
cd heifengli-evolution-system
python3 -m http.server 8080
```

这条命令的作用：在本机启动一个简单网页服务器。

然后打开：

```text
http://localhost:8080
```

不要直接双击打开 `index.html`，因为 PWA 和离线缓存通常需要通过 `http://` 或 `https://` 访问。

## 部署到 GitHub Pages

1. 把 `heifengli-evolution-system/` 里的文件上传到一个 GitHub 仓库。
2. 打开仓库 `Settings`。
3. 找到 `Pages`。
4. Source 选择 `Deploy from a branch`。
5. Branch 选择 `main` 和 `/root`。
6. 保存后等待 GitHub 生成网址。

安全提醒：不要上传 `.env`、任何 API Key、邮箱密码、QQ 邮箱授权码。

## 添加到 iPhone 主屏幕

1. 用 iPhone 的 Safari 打开部署后的网页。
2. 点击底部“分享”按钮。
3. 选择“添加到主屏幕”。
4. 名称可以保留“黑凤梨”。
5. 点“添加”。

## 添加到 Android 主屏幕

1. 用 Android Chrome 打开部署后的网页。
2. 点击右上角菜单。
3. 选择“添加到主屏幕”或“安装应用”。
4. 确认添加。

## 当前筛选标签

1. AIGC
2. 视频生成
3. 图像生成
4. Codex
5. Agent
6. OpenAI
7. Claude
8. Gemini
9. 求职 / 职业趋势

## 后续可升级方向

1. 增加后端代理，彻底解决 CORS 问题。
2. 增加 `data.json` 离线数据模式。
3. 增加收藏、已读、稍后看。
4. 增加每天自动同步。
