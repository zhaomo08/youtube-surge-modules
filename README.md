# YouTube Surge Modules

整理自两个现成 Surge 模块：

- [DualSubs YouTube](https://github.com/DualSubs/YouTube)：双语字幕和 YouTube Music 歌词翻译
- [Maasea YouTube Enhance](https://github.com/Maasea/sgmodule)：YouTube 去广告、PIP、后台播放增强

本仓库保存整理后的 `.sgmodule`、分析说明，以及 [`vendor/`](./vendor) 下第三方脚本的固定副本。
模块的 `script-path` 指向本仓库的 `vendor/`，不再直连上游 —— 上游删库、改名或删除 release 都不会让模块失效。
副本均为 Apache-2.0；Maasea 保持上游原样，四个 DualSubs 脚本带可重复的最小简中补丁，署名见 [`NOTICE`](./NOTICE)，上游原始与本地校验和见 [`vendor/README.md`](./vendor/README.md)。

## 模块选择

> **热修复提示：** `2026.07.13-zm3` 曾加入额外语言请求脚本，会抢占 DualSubs 的 player/timedtext 请求并导致只显示英文。请更新到 `zm4` 或更高版本。


| 文件 | 用途 | 稳定性建议 |
| --- | --- | --- |
| `modules/DualSubs.YouTube.optimized.sgmodule` | 双语字幕、歌词翻译 | 只需要字幕时启用 |
| `modules/YouTubeAd.Enhance.optimized.sgmodule` | 去广告、PIP、后台播放 | 只需要播放增强时启用，推荐 |
| `modules/YouTube.Combined.optimized.sgmodule` | 去广告 + 双语字幕 | 实验版；异常时退回前两个模块二选一 |

不要同时启用合并版、两个独立版或 Maasea 官方 Enhance。重复命中同一 protobuf 响应会增加解析失败、字段覆盖和内存占用的概率。

## 直接导入

### 双语字幕

```text
https://raw.githubusercontent.com/zhaomo08/youtube-surge-modules/update/upstream-20261014/modules/DualSubs.YouTube.optimized.sgmodule
```

### 去广告、PIP、后台播放

```text
https://raw.githubusercontent.com/zhaomo08/youtube-surge-modules/update/upstream-20261014/modules/YouTubeAd.Enhance.optimized.sgmodule
```

### 实验合并版

```text
https://raw.githubusercontent.com/zhaomo08/youtube-surge-modules/update/upstream-20261014/modules/YouTube.Combined.optimized.sgmodule
```

## 2026-10-14 配套更新

- 字幕独立版与实验合并版升级为 `2026.10.14-zm6`，仅播放增强独立版保持 `zm5`；导入及脚本链接均指向 `update/upstream-20261014` 分支，不读取旧 main。
- DualSubs YouTube 更新至 `v1.6.0`（2026-10-11），Universal 更新至 `v1.8.1`（2026-10-13）。
- Maasea 固定至 `65075cdb388fc5e3094afd7e7314c67b243f3525`（2026-07-19，`fix ad judgment`）；请求脚本与此前固定版本逐字节一致。
- zm5 同步固定上游；zm6 仅在原有四个 DualSubs 脚本加入受模块参数启用的简中补丁，不增加规则或脚本，不改 Maasea。
- 已完成下载、SHA-256、链接和 JavaScript 语法检查；Surge 真机播放、字幕及合并版兼容性仍待验证。

## 2026-07 播放链路更新

Maasea 在 2026-07-11～12 日更新了 YouTube 新版加密 Onesie/UMP 播放链路。本仓库的 Enhance 与合并版已同步以下变化：

- 响应端增加 `config`、`log_event`，获取并维护播放密钥配置
- 请求端增加 `initplayback` 和 `log_event` 处理
- 移除旧的 `initplayback &oad` Map Local 和广告统计 URL Rewrite，避免与新版请求脚本冲突
- MITM 域名收窄到实际需要的 `*.googlevideo.com` 与 `youtubei.googleapis.com`
- Maasea 脚本固定到提交 `65075cdb388fc5e3094afd7e7314c67b243f3525`，副本存于 `vendor/maasea/`，避免 `master` 更新后行为静默变化
- 移除已不被新版 Maasea 响应脚本使用的 `LyricLang` 参数

固定版本意味着上游修复不会自动进入本模块。YouTube 再次改版时，应先对照 Maasea 官方模块测试，再更新固定提交。

检查与同步上游：

```bash
./scripts/sync-vendor.sh          # 只对比，不写入
./scripts/sync-vendor.sh --apply  # 确认差异后再更新副本
```

## DualSubs 优化

- YouTube 脚本固定为 `v1.6.0`
- Universal 脚本固定为 `v1.8.1`
- 字幕模块不 MITM 视频 CDN
- 默认使用 `Type=Translate`，规避 `subtype=Official` 偶发返回 HTML 后的解析错误
- 显式设置 `Languages[0]=AUTO`、`Languages[1]=ZH-HANS`，默认翻译为简体中文
- 默认 `LogLevel=ERROR`，减少常规日志

默认 `Storage=PersistentStore`：除目标语言修复外，BoxJs/设置面板持久化配置仍优先，其次是模块参数，最后是脚本默认配置。无需为了简中把 Storage 改为 Argument；仅换 Storage 也挡不住 URL/缓存里的旧 tlang。`ForceSimplifiedChinese=true` 从显式模块参数读取，不受 BoxJs 合并顺序影响。如果曾在 BoxJs 设置 `Type=Official`，更新模块不会自动覆盖；Official 与 Translate 均走简中修复。出现 `e.timedtext.head` 相关错误时，可把 Type 改为 `Translate`，这是官方响应格式问题而非语言缓存问题。

## 简体中文语言修复

DualSubs 原始默认值是 `Languages=[AUTO,ZH]`，其中 `ZH` 只是泛化中文；同时它会把 YouTube 上一次选择的 `tlang` 保存到：

```text
@DualSubs.YouTube.Caches.tlang
```

zm6 在两份模块原有 DualSubs script argument 中显式启用 `ForceSimplifiedChinese="true"`。四个脚本在设置合并后强制目标 `ZH-HANS`，纠正本次读取的旧 `Caches.tlang`；已有 URL tlang 纠正为 `zh-Hans`。YouTube timedtext 请求在 AutoCC 开启时补齐目标，随后仍由原脚本执行：Translate 删除 tlang 并保留 `subtype=Translate`，Official 使用 `tlang=zh-Hans` 并保留 `subtype=Official`，原有缓存写入会保存正确值。Universal 两条响应路径再强制目标，避免遗漏缓存覆盖。源语言 `Languages[0]`/URL lang 不改；强制简中时不再因源/目标同属 zh 自动打开 ShowOnly，仍尊重显式 ShowOnly 设置。

更新 Surge 模块并清理/刷新远程脚本缓存，然后重开 YouTube 视频即可；**不要求手动清 BoxJS 或旧 tlang 缓存**。未启用该参数的脚本仍执行上游原有语言选择逻辑。补丁复现和 288 个 Node mock 回归用例见 [验证记录](./docs/simplified-chinese-zm6.md)，不等于 Surge 真机与翻译 API 实测。

不要额外添加一个同样匹配 player/timedtext 的请求脚本来修改缓存；Surge 可能只执行首个命中的请求脚本，导致 DualSubs 无法添加 `subtype=Translate`，最终只显示原始英文字幕。

## 画中画字幕限制

当前模块可以解锁 YouTube 的 PiP 能力，但不能可靠地让字幕显示在系统画中画窗口中。

原因是 DualSubs 和 Maasea 修改的是 YouTube API 返回的字幕轨道与播放器能力；进入 iOS 系统 PiP 后，字幕是否作为系统可渲染的媒体字幕交给 AVPlayer，由 YouTube 客户端决定。Maasea 的相关请求 [Issue #72](https://github.com/Maasea/sgmodule/issues/72) 已以 `not planned` 关闭。

本仓库不会为此同时开启 Maasea `CaptionLang` 与 DualSubs，因为两套实现都会改写 player/get_watch protobuf，增加字幕关闭、字段覆盖和播放失败风险，却不能保证 PiP 字幕。

可尝试但不保证：

- 进入 PiP 前先手动打开 CC
- iOS“设置 → 辅助功能 → 字幕与隐藏式字幕 → 隐藏式字幕 + SDH”保持开启
- 优先选择视频自带的官方字幕；自动翻译或脚本合成字幕更依赖 YouTube 客户端渲染

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
5. 字幕仍显示繁体时，确认模块为 zm6、刷新 Surge 远程脚本缓存并重开视频；不必手动删除 BoxJS/tlang。
6. 新版播放流异常时，同时删除 `YouTubeConfig`，让脚本重新获取密钥。
7. 合并版异常时，改用 `YouTubeAd.Enhance.optimized.sgmodule` 或 DualSubs 独立版。
8. 仍异常时，对照 Maasea 官方模块验证上游是否已有新修复。

## 上游

脚本作者与版权方，本仓库仅做配置整理与副本固定：

- [DualSubs YouTube](https://github.com/DualSubs/YouTube) — VirgilClyne，Apache-2.0
- [DualSubs Universal](https://github.com/DualSubs/Universal) — VirgilClyne，Apache-2.0
- [Maasea sgmodule](https://github.com/Maasea/sgmodule) — Maasea，Apache-2.0

觉得好用请去给上游点 star。
