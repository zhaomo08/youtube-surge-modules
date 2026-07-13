# YouTube Surge Modules

整理自两个现成 Surge 模块：

- [DualSubs YouTube](https://github.com/DualSubs/YouTube)：双语字幕和 YouTube Music 歌词翻译
- [Maasea YouTube Enhance](https://github.com/Maasea/sgmodule)：YouTube 去广告、PIP、后台播放增强

本仓库只保存整理后的 `.sgmodule` 和分析说明，不复制第三方脚本源码。

## 模块选择

| 文件 | 用途 | 稳定性建议 |
| --- | --- | --- |
| `modules/DualSubs.YouTube.optimized.sgmodule` | 双语字幕、歌词翻译 | 只需要字幕时启用 |
| `modules/YouTubeAd.Enhance.optimized.sgmodule` | 去广告、PIP、后台播放 | 只需要播放增强时启用，推荐 |
| `modules/YouTube.Combined.optimized.sgmodule` | 去广告 + 双语字幕 | 实验版；异常时退回前两个模块二选一 |

不要同时启用合并版、两个独立版或 Maasea 官方 Enhance。重复命中同一 protobuf 响应会增加解析失败、字段覆盖和内存占用的概率。

## 直接导入

### 双语字幕

```text
https://raw.githubusercontent.com/zhaomo08/youtube-surge-modules/main/modules/DualSubs.YouTube.optimized.sgmodule
```

### 去广告、PIP、后台播放

```text
https://raw.githubusercontent.com/zhaomo08/youtube-surge-modules/main/modules/YouTubeAd.Enhance.optimized.sgmodule
```

### 实验合并版

```text
https://raw.githubusercontent.com/zhaomo08/youtube-surge-modules/main/modules/YouTube.Combined.optimized.sgmodule
```

## 2026-07 播放链路更新

Maasea 在 2026-07-11～12 日更新了 YouTube 新版加密 Onesie/UMP 播放链路。本仓库的 Enhance 与合并版已同步以下变化：

- 响应端增加 `config`、`log_event`，获取并维护播放密钥配置
- 请求端增加 `initplayback` 和 `log_event` 处理
- 移除旧的 `initplayback &oad` Map Local 和广告统计 URL Rewrite，避免与新版请求脚本冲突
- MITM 域名收窄到实际需要的 `*.googlevideo.com` 与 `youtubei.googleapis.com`
- Maasea 脚本固定到审查过的提交 `bbd30c9318e06e129a71abae1be3812f25f43e3f`，避免 `master` 更新后行为静默变化
- 移除已不被新版 Maasea 响应脚本使用的 `LyricLang` 参数

固定版本意味着上游修复不会自动进入本模块。YouTube 再次改版时，应先对照 Maasea 官方模块测试，再更新固定提交。

## DualSubs 优化

- YouTube 脚本固定为 `v1.5.11`
- Universal 脚本固定为 `v1.7.5`
- 字幕模块不 MITM 视频 CDN
- 默认使用 `Type=Translate`，规避 `subtype=Official` 偶发返回 HTML 后的解析错误
- 默认 `LogLevel=ERROR`，减少常规日志

BoxJs 持久化配置的优先级高于模块参数。如果曾在 BoxJs 设置 `Type=Official`，更新模块不会自动覆盖。出现 `e.timedtext.head` 相关错误时，请把 Type 改为 `Translate`，或清理 DualSubs YouTube 的 BoxJs 配置。

## 合并版为什么仍是实验性质

Maasea 和 DualSubs 都会处理：

```text
https://youtubei.googleapis.com/youtubei/v1/player
https://youtubei.googleapis.com/youtubei/v1/get_watch
```

这些响应是 protobuf 二进制数据。合并版按配置顺序放置 Maasea 与 DualSubs 响应脚本，但 Surge 官方脚本文档没有把“多个响应脚本对同一 body 的串行顺序”描述为稳定兼容契约，因此不能仅凭文件顺序保证所有 Surge 与 YouTube 客户端版本都正常。

可能表现为：

- 播放失败或长时间转圈
- PIP、后台播放突然失效
- 字幕轨道消失或重复
- 脚本解析 protobuf 失败
- Network Extension 内存占用升高

稳定优先时，只启用一个独立模块。

## 隐私与信任边界

所有模块都需要 MITM。启用后，Surge 会解密匹配域名的 HTTPS 流量，并把请求或响应交给远程脚本处理。

新版 Maasea `youtube.request.js` 在命中加密 `initplayback` 且本地密钥匹配时，会把请求重定向到：

```text
https://init-stream.maasea.workers.dev/
```

该 Worker 用于处理加密 UMP 播放流。启用前请确认你信任 Maasea、固定版本脚本及这个 Worker；这不是纯本地去广告方案。不要把翻译 API Key 写进不可信配置，也不要长期打开 Debug。

## 排障顺序

1. 确认只启用了一个本仓库模块，且没有同时启用 Maasea 官方 Enhance。
2. 确认 `youtubei.googleapis.com` 和需要的 `googlevideo.com` 子域 MITM 成功。
3. 强制退出 YouTube 后重新打开。
4. 首页 Sponsored 未清理时，删除脚本持久化缓存 `YouTubeAdvertiseInfo`。
5. 新版播放流异常时，同时删除 `YouTubeConfig`，让脚本重新获取密钥。
6. 合并版异常时，改用 `YouTubeAd.Enhance.optimized.sgmodule` 或 DualSubs 独立版。
7. 仍异常时，对照 Maasea 官方模块验证上游是否已有新修复。

## 上游

- [DualSubs YouTube](https://github.com/DualSubs/YouTube)
- [DualSubs Universal](https://github.com/DualSubs/Universal)
- [Maasea sgmodule](https://github.com/Maasea/sgmodule)
