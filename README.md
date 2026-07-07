# YouTube Surge Modules

整理自两个现成 Surge 模块：

- DualSubs YouTube: 双语字幕和 YouTube Music 歌词翻译
- Maasea YouTubeAd: YouTube 去广告、PIP、后台播放增强

本仓库只保存整理后的 `.sgmodule` 和分析说明，不复制第三方远程脚本源码。模块仍然引用原作者发布的脚本地址。

## 模块

| 文件 | 用途 | 建议 |
| --- | --- | --- |
| `modules/DualSubs.YouTube.optimized.sgmodule` | 双语字幕、歌词翻译 | 需要字幕时启用 |
| `modules/YouTubeAd.Enhance.optimized.sgmodule` | 去广告、PIP、后台播放 | 需要去广告增强时启用 |

## 直接导入

```text
https://raw.githubusercontent.com/zhaomo08/youtube-surge-modules/main/modules/DualSubs.YouTube.optimized.sgmodule
```

```text
https://raw.githubusercontent.com/zhaomo08/youtube-surge-modules/main/modules/YouTubeAd.Enhance.optimized.sgmodule
```

## 重要兼容说明

不建议两个模块在同一个 Surge 配置里同时启用。

原因是两个模块都会拦截并改写：

```text
https://youtubei.googleapis.com/youtubei/v1/player
https://youtubei.googleapis.com/youtubei/v1/get_watch
```

这类响应是 protobuf 二进制结构。两个脚本连续改写时，可能导致其中一个脚本解析失败，或者字幕轨道、去广告字段互相覆盖。

推荐用法：

- 只需要双语字幕：启用 `DualSubs.YouTube.optimized.sgmodule`
- 只需要去广告、PIP、后台播放：启用 `YouTubeAd.Enhance.optimized.sgmodule`
- 两者都想用：先启用去广告模块测试播放稳定性，再启用 DualSubs；如果字幕或播放异常，二选一

如果你已经启用了 Maasea 官方的这个模块，也不要再同时启用本仓库的 `YouTubeAd.Enhance.optimized.sgmodule`：

```text
https://github.com/Maasea/sgmodule/raw/master/YouTube.Enhance.sgmodule
```

它和本仓库的 YouTubeAd 整理版使用同一个远程脚本：

```text
https://raw.githubusercontent.com/Maasea/sgmodule/master/Script/Youtube/youtube.response.js
```

二者同时启用会让同一个 `youtubei.googleapis.com` 响应被同一套脚本处理两次，收益很小，出错概率更高。

## 我做的优化

### DualSubs YouTube

- 固定 DualSubs YouTube 脚本版本为 `v1.5.11`
- 固定 DualSubs Universal 脚本版本为 `v1.7.5`，避免 `latest` 浮动更新导致行为变化
- 移除原模块里 `googlevideo.com/initplayback` 的广告阻断规则
- 收窄 MITM hostname，去掉 `*.googlevideo.com` 和 `-redirector*.googlevideo.com`
- 默认保留 `Vendor=Google`、`LogLevel=WARN`

### YouTubeAd Enhance

- 补齐 Surge `#!arguments`，避免原模块里的中文占位符未替换导致导入后不可控
- 默认脚本引擎设置为 `webview`
- 默认关闭歌词翻译和字幕翻译，减少和 DualSubs 的功能重叠
- 暴露 `BlockShorts` 参数，默认不屏蔽 Shorts
- 保留 UDP 阻断和广告统计 URL Rewrite
- 补回 Maasea 官方 `Map Local` 的 `googlevideo.com/initplayback.+&oad` 拦截
- 使用 Maasea 官方 `youtubei` pattern，兼容带 query 的 `browse/player/next` 请求
- 修正 Surge 参数传递格式，避免 Maasea 脚本出现 `JSON Parse error: Unrecognized token '\'`

它和 Maasea 官方 `YouTube.Enhance.sgmodule` 的核心脚本相同。本整理版额外保留了 `yfamilys.com` 版本里的 YouTube 广告统计 URL Rewrite，并显式暴露英文参数。

如果首页仍然出现 Sponsored 信息流广告，优先在 Surge 里清理脚本持久化缓存 `YouTubeAdvertiseInfo`，然后强制退出 YouTube 重新打开。Maasea 脚本会缓存 protobuf 广告字段识别结果，旧缓存误判时可能放过新的广告样式。

## 风险提示

这些模块都需要 MITM YouTube 相关域名。启用后，Surge 可以解密对应域名的 HTTPS 流量并把请求/响应交给脚本处理。

使用前建议确认：

- 你信任原脚本作者和远程脚本来源
- 不在调试模式下长期使用
- 第三方翻译 API Key 不随意填入不可信脚本配置
- YouTube 播放异常时，先禁用 URL Rewrite 或只保留一个模块测试

## 来源

- DualSubs YouTube: `https://github.com/DualSubs/YouTube`
- DualSubs Universal: `https://github.com/DualSubs/Universal`
- Maasea sgmodule: `https://github.com/Maasea/sgmodule`
- 原始 YouTubeAd 模块: `https://yfamilys.com/sgmodule/YouTubeAd.sgmodule`
