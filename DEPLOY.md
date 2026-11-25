# 部署：拿到一个固定的 https 网址

为什么必须做：**你录的数据存在浏览器 localStorage 里，是按网址分开存的**。隧道网址每次重启都变，一换就等于数据清零。所以要真正开始喂数据，先有一个不动的网址。

部署后你会得到一个 `https://xxx.netlify.app` 这类地址；iOS 上定位、读取剪贴板都要求 https，这一步顺便把「定位不好使」的根也解决一半。

---

## 方案 A：Netlify Drop（最快，不用装东西，3 分钟）

1. 浏览器打开 https://app.netlify.com/drop
2. 把工作目录里的 **`taste-map-deploy.zip`** 直接拖进页面（或先解压，把 `taste-map` 文件夹拖进去）
3. 等几秒，页面顶部出现 `https://随机名.netlify.app` ——**这就是你的固定网址**
4. 想改名：Site settings → Change site name
5. 想留住它：Free 计划用邮箱/GitHub 登录一次就归你名下了

然后手机上打开这个地址，Safari → 分享 → 「添加到主屏幕」。以后点图标就是 App。

## 方案 B：Cloudflare Pages（国内访问相对稳，需账号）

1. https://dash.cloudflare.com/ → Workers & Pages → Create → Pages → Upload assets
2. 拖入 `taste-map-deploy.zip`
3. 得到 `https://xxx.pages.dev`

优点：Cloudflare 的域名在国内被墙的概率比 netlify 低一些。

## 方案 C：GitHub Pages（你有 GitHub 账号就用这个）

```powershell
cd C:\Users\90691\Documents\deepseek-harness\default-workspace\taste-map
git init
git add .
git commit -m "taste map v2"
git branch -M main
git remote add origin https://github.com/<你的用户名>/taste-map.git
git push -u origin main
```

然后在仓库 Settings → Pages → Source 选 `main` / `root`，等 1 分钟，地址是
`https://<你的用户名>.github.io/taste-map/`。

注意：GitHub Pages 是子路径部署，本项目所有资源都用相对路径（`./app.js`），所以能直接用，不用改代码。

---

## 部署完之后

1. 手机打开新地址，**第一件事是允许定位**（这次是全新域名，一定会弹）。
2. 加进主屏（Safari 分享 → 添加到主屏幕）。
3. 在「我的 → 导出」存一份 JSON。以后换设备/换网址靠它搬家。
4. **确认网址能用之后，再开始喂数据**。顺序反了，数据白喂。

## 上线前检查（我这边已经验过的）

- `node --check app.js` 通过
- 8 个文件全部走相对路径，放子目录也能跑
- `sw.js` 是 network-first，改完代码刷新即生效，不会被缓存卡住旧版
- 没有外部依赖（不用 CDN、不加载 Leaflet），离线也能开
- `manifest.json` + `icon.svg` 已配好，可「添加到主屏幕」
