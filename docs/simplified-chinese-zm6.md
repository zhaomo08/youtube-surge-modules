# zm6 强制简体中文验证记录（2026-10-14）

## 原因与修复范围

四个 DualSubs release bundle 的目标语言优先级原为 URL `tlang` → `Caches.tlang` → 合并后的 `Settings.Languages[1]`。`Storage=PersistentStore` 还允许旧 BoxJS Settings 覆盖模块 Languages。仅声明默认 ZH-HANS 或把 Storage 改成 Argument，均不能可靠挡住旧 URL/缓存。

字幕独立版和实验合并版升级 `2026.10.14-zm6`，在每条现有 DualSubs script argument 中加入固定 `ForceSimplifiedChinese="true"`。请求规则数量、pattern、脚本路径和 Maasea 参数均不变；播放增强独立模块不改，main 不改。

本地最小补丁修改：

1. `vendor/dualsubs/YouTube.request.bundle.js`：设置合并后，从原始模块 `$argument` 读取强制标志；把目标设为 ZH-HANS、本次缓存目标设为 zh-Hans，纠正现有 URL tlang。AutoCC 开启的 timedtext 补齐目标，然后继续原有分支：Translate 删除 tlang、添加 subtype=Translate；Official 保留 tlang=zh-Hans、添加 subtype=Official；原有持久化逻辑写回正确缓存值。启用强制时禁止因同属 zh 自动打开 ShowOnly，保留显式 ShowOnly 选择。URL lang 和 Languages[0] 不变。
2. `vendor/dualsubs/YouTube.response.bundle.js`：同样纠正目标、读取缓存及现有 URL tlang，确保 player/get_watch 轨道使用强制目标。
3. `vendor/dualsubs/Universal.Translate.response.bundle.js`：强制目标语言表达式，避免旧 URL/缓存/Settings 覆盖翻译器和歌词目标。
4. `vendor/dualsubs/Universal.Composite.Subtitles.response.bundle.js`：相同语言修复用于 Official 合成路径，仍执行上游官方/源字幕合成逻辑。

四文件仅在显式参数 true（字符串或布尔值）启用时改变上述行为。不启用时原有语言优先路径保留。其他 BoxJS 设置仍按原 Storage 选择生效，不清空用户配置。

## 可重复验证

```sh
python3 scripts/patch-dualsubs.py
python3 scripts/test-simplified-chinese.py
node scripts/test-request-surge-mock.js
bash scripts/sync-vendor.sh
# 或 --apply：所有下载先暂存、补丁和语法检查成功后才能写入

git diff --check
```

结果：

- 288 个 Node mock 用例通过：直接从实际四个 bundle 提取补丁及原语言选择表达式，覆盖 Translate/Official、标志 true/false/字符串 true、旧 URL ZH-HANT/zh-TW/en/缺失、旧缓存 zh-TW、合并设置目标 ZH-HANT、源 en/ja/zh-TW。请求用例执行实际 timedtext 分支，核验 subtype、目标 URL、缓存持久化写入及源 lang 不变。
- 24 个完整 YouTube request bundle 的 VM/Surge mock 用例通过：真实 $argument 解析、PersistentStore 设置合并与缓存读写；旧 BoxJS 目标 ZH-HANT、旧缓存 zh-TW、旧 URL 各语言均不再盖过简中。Translate 和 Official 都验证完整 $done 请求结果，不调用网络。
- 六个 vendor JS 均 `node --check` 通过，记录如下：
  - `vendor/dualsubs/YouTube.request.bundle.js`
  - `vendor/dualsubs/YouTube.response.bundle.js`
  - `vendor/dualsubs/Universal.Translate.response.bundle.js`
  - `vendor/dualsubs/Universal.Composite.Subtitles.response.bundle.js`
  - `vendor/maasea/youtube.request.js`
  - `vendor/maasea/youtube.response.js`
- 上游固定 release 下载后重复打补丁，与当前四文件完全一致；两个 Maasea 文件仍与固定上游逐字节一致。
- 补丁重复运行会逆向还原验证上游 SHA 后跳过；未知上游 SHA 与被改动的已补丁文件都会拒绝。
- `git diff --check` 通过；上游原始与本地 SHA-256 完整保存在 `vendor/README.md`。

## 验证边界与用户更新

上述是本地 JS 语言/请求链路验证，不是 Surge 真机播放/渲染测试。未调用翻译 API，未完整执行 Universal 响应体合成、播放器 JSON/protobuf 序列化与真实 YouTube 自动字幕。不能把本地测试等同于端到端字幕保证；Official 的 HTML 响应解析上游问题仍存在，合并版保持实验属性。

用户应更新当前分支对应模块、清理/刷新 Surge 远程脚本缓存，并重开 YouTube 视频。无需手动清 BoxJS 或旧 tlang。不要额外加一个命中 player/timedtext 的语言请求脚本，以免抢占原 DualSubs 请求。
