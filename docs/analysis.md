# 模块分析和整理记录

审查日期：2026-07-13。

## 结论

- DualSubs 固定的 `YouTube v1.5.11` 与 `Universal v1.7.5` 仍是各自最新正式版本。
- 仓库原 YouTubeAd 模块使用的是 2025-07 构建的响应脚本配置，已落后于 Maasea 2026-07 的加密播放链路。
- Maasea 新版不再只改写普通 `player/get_watch` 响应，还需要处理 `config`、`log_event` 和 `googlevideo.com/initplayback`。
- 合并版存在两个脚本连续解析和重编码同一 protobuf body 的结构性风险，只能作为实验方案。

## DualSubs YouTube

上游：

```text
https://github.com/DualSubs/YouTube/releases/tag/v1.5.11
https://github.com/DualSubs/Universal/releases/tag/v1.7.5
```

主要用途：

- YouTube 双语字幕
- YouTube Music 歌词翻译
- 通过 BoxJs 管理翻译服务与显示方式

主要拦截：

- `www/m/tv.youtube.com/youtubei/v1/player`
- `youtubei.googleapis.com/youtubei/v1/player`
- `youtubei.googleapis.com/youtubei/v1/get_watch`
- `www/m.youtube.com/api/timedtext`
- `music.youtube.com/youtubei/v1/browse`
- `youtubei.googleapis.com/youtubei/v1/browse`

整理版调整：

- 固定 YouTube `v1.5.11` 与 Universal `v1.7.5`
- 去掉字幕模块不需要的 `*.googlevideo.com` MITM
- 去掉重复的 `initplayback` 广告阻断
- 默认使用 `Type=Translate`
- 默认使用 `LogLevel=ERROR`

已知问题：`subtype=Official` 的 timedtext 偶发返回 HTML，Composite 脚本随后可能出现 `e.timedtext.head` 解析错误。BoxJs 配置会覆盖模块参数，切换默认值后仍需检查持久化设置。

## YouTubeAd Enhance

上游模块：

```text
https://github.com/Maasea/sgmodule/blob/master/YouTube.Enhance.sgmodule
```

本次固定提交：

```text
bbd30c9318e06e129a71abae1be3812f25f43e3f
```

### 2026-07 上游变化

Maasea 在 2026-07-11～12 日引入新版 Onesie/UMP 处理：

- 响应脚本新增 `config` 与 `log_event` 解析，用于保存不同客户端平台的播放密钥
- 请求脚本处理 `log_event` 请求头
- 请求脚本处理 `googlevideo.com/initplayback`
- 密钥匹配时，将加密播放请求重定向到 `https://init-stream.maasea.workers.dev/`
- 密钥不匹配时返回空响应，清理缓存并促使客户端回退到 `v1/player`
- 响应参数已不再使用旧版 `lyricLang`

因此旧配置仅更新 `youtube.response.js` 的远程地址是不够的；必须同步新增请求脚本和 endpoint pattern。

### 本仓库调整

- 增加 `config`、`log_event` 响应匹配
- 增加 `initplayback`、`log_event` 请求脚本
- 删除旧 Map Local 与广告统计 URL Rewrite
- 删除失效的 `LyricLang` 参数
- 保留 UDP/QUIC 拒绝规则，确保 MITM 流量回落到 HTTPS/TCP
- MITM 收窄为 `*.googlevideo.com` 与 `youtubei.googleapis.com`
- 固定响应与请求脚本到同一个已审查提交，避免版本错配

### 取舍

固定提交提高了可重复性，但不会自动获得上游修复。新版请求脚本依赖 Maasea Cloudflare Worker，因此整个方案不是纯本地执行，也多了一个外部可用性和信任边界。

`max-size=-1` 来自 Maasea 官方配置，可避免大 protobuf 响应被 Surge 跳过；代价是 Surge 必须把完整 body 载入 Network Extension 内存。官方文档明确提示大响应存在内存风险，所以 pattern 必须保持收窄，不能扩展成泛域名或泛路径匹配。

## 合并版风险

重叠响应：

```text
youtubei.googleapis.com/youtubei/v1/player
youtubei.googleapis.com/youtubei/v1/get_watch
```

Maasea 负责删除广告字段并注入 PIP/后台播放能力，DualSubs 负责注入字幕轨道。两者都需要解析并重新编码 protobuf。Surge 官方文档说明了 body 脚本的内存与匹配行为，但没有给出可依赖的多响应脚本链式组合契约。

因此合并版即使在某个版本上可用，也可能随以下任一项变化而失效：

- YouTube iOS 客户端 protobuf schema
- Maasea 编解码实现
- DualSubs 编解码实现
- Surge 模块合并与脚本执行行为

建议把两个独立模块作为正式方案，把合并版保持为有明确回退路径的实验方案。

## 验证清单

由于无法在仓库侧模拟真实 YouTube iOS protobuf 流量，发布前应在 Surge 真机完成：

1. 冷启动 YouTube，检查首页、搜索、Shorts 和视频详情。
2. 分别测试普通视频、直播、Shorts、受限视频。
3. 测试 PIP、锁屏后台播放和切换网络。
4. 检查 `config`、`log_event`、`initplayback` 是否命中。
5. 检查脚本日志是否出现 protobuf、JSON 参数或超时错误。
6. 清理 `YouTubeConfig` 与 `YouTubeAdvertiseInfo` 后重复一次。
7. 合并版单独测试字幕轨道、双语翻译和播放增强。
