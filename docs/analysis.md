# 模块分析和整理记录

## DualSubs YouTube

原始地址：

```text
https://github.com/DualSubs/YouTube/releases/latest/download/DualSubs.YouTube.sgmodule
```

当前 latest 解析到：

```text
https://github.com/DualSubs/YouTube/releases/download/v1.5.11/DualSubs.YouTube.sgmodule
```

用途：

- YouTube 双语字幕
- YouTube Music 歌词翻译
- 通过 BoxJs 管理更多翻译配置

主要拦截：

- `www.youtube.com/youtubei/v1/player`
- `m.youtube.com/youtubei/v1/player`
- `tv.youtube.com/youtubei/v1/player`
- `youtubei.googleapis.com/youtubei/v1/player`
- `youtubei.googleapis.com/youtubei/v1/get_watch`
- `www.youtube.com/api/timedtext`
- `m.youtube.com/api/timedtext`
- `music.youtube.com/youtubei/v1/browse`
- `youtubei.googleapis.com/youtubei/v1/browse`

整理调整：

- 原模块使用 `DualSubs/Universal/releases/latest`，整理版固定到 `v1.7.5`
- 原模块 MITM 包含 `*.googlevideo.com`，整理版去掉，避免字幕模块解密视频 CDN
- 原模块包含 `googlevideo.com/initplayback` 阻断规则，整理版去掉，避免和去广告模块重复

## YouTubeAd Enhance

原始地址：

```text
https://yfamilys.com/sgmodule/YouTubeAd.sgmodule
```

Maasea 官方模块地址：

```text
https://github.com/Maasea/sgmodule/raw/master/YouTube.Enhance.sgmodule
```

远程脚本：

```text
https://raw.githubusercontent.com/Maasea/sgmodule/master/Script/Youtube/youtube.response.js
```

脚本构建时间：

```text
2025/7/12 20:17:26
```

用途：

- 清理广告字段：`adPlacements`、`adSlots`
- 删除广告追踪字段：`playbackTracking.pageadViewthroughconversion`
- 开启 PIP 能力：`pictureInPictureRender`
- 开启后台播放能力：`backgroundPlayerRender`
- 修改设置页，加入后台播放/下载相关能力字段
- 可选隐藏上传、选段/沉浸式入口、Shorts
- 可选翻译歌词和字幕

外部请求：

- 默认没有翻译请求
- 启用歌词翻译时会请求 `https://translate.google.com/translate_a/single`

本地持久化：

- 使用 `YouTubeAdvertiseInfo` 缓存广告字段识别结果

整理调整：

- 补齐 `#!arguments`
- 将默认脚本引擎固定为 `webview`
- 默认关闭 `LyricLang` 和 `CaptionLang`
- 增加 `BlockShorts`
- 补回 Maasea 官方 `Map Local` 的 `googlevideo.com/initplayback.+&oad` 拦截
- 使用 Maasea 官方 `youtubei` pattern，兼容带 query 的 `browse/player/next` 请求

`yfamilys.com/sgmodule/YouTubeAd.sgmodule` 与 Maasea 官方 `YouTube.Enhance.sgmodule` 的核心脚本相同，都是 `Script/Youtube/youtube.response.js`。区别主要是：

- Maasea 官方模块已经有中文 `#!arguments`
- Maasea 官方模块有 `Map Local` 拦截 `googlevideo.com/initplayback.+&oad`
- `yfamilys.com` 版本额外有 `www/s.youtube.com` 广告统计 URL Rewrite
- 本仓库整理版基于 `yfamilys.com` 版本，补齐英文参数并保留广告统计 URL Rewrite

不要同时启用 Maasea 官方 `YouTube.Enhance.sgmodule` 和本仓库 `YouTubeAd.Enhance.optimized.sgmodule`，否则同一个 YouTube protobuf 响应会被同一套脚本处理两次。

如果首页出现 Sponsored 信息流广告，优先检查：

- `youtubei.googleapis.com` 是否已经 MITM 成功
- `YouTubeAd.Enhance.response` 是否命中 `youtubei/v1/browse`
- 是否存在旧的 `YouTubeAdvertiseInfo` 本地缓存导致广告字段被误加入白名单

## 兼容风险

两个模块都处理 `youtubei.googleapis.com/youtubei/v1/player` 和 `get_watch` 的 protobuf 响应。

如果同时启用，可能出现：

- 第一个脚本改写后二进制结构变化，第二个脚本解析失败
- 字幕轨道和去广告字段互相覆盖
- 播放器配置被重复注入

实际使用建议：

- 字幕优先：只用 DualSubs 整理版
- 去广告优先：只用 YouTubeAd Enhance 整理版
- 两者都试：先单独验证，再组合启用；异常时二选一
