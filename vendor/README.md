# vendor —— 第三方脚本副本

模块的 `script-path` 指向本目录，而不是上游仓库。原因：钉死 commit 只能挡住上游改代码，
挡不住上游删库、改名、或删除 release。把产物固化在这里，模块的行为才真正可复现。

**这些文件逐字节复制自上游，未做任何修改。** 许可证均为 Apache-2.0，副本见各子目录 `LICENSE`。
署名见仓库根目录 `NOTICE`。

拉取日期：2026-09-02

| 文件 | 上游版本 | 来源 | SHA-256 |
| --- | --- | --- | --- |
| `maasea/youtube.response.js` | commit `bbd30c9` (2026-07-12) | Maasea/sgmodule | `eeae2957ac31f6bbe36f08b60db1a80e110e79b83bdd9b41fce3a5d871c4a504` |
| `maasea/youtube.request.js` | commit `bbd30c9` (2026-07-12) | Maasea/sgmodule | `3ecca15e06e76a31720092c581180f648ef2c45e494644941ba985c878efbb26` |
| `dualsubs/YouTube.request.bundle.js` | v1.5.11 (2024-12-11) | DualSubs/YouTube releases | `bcc3f609678e27d6e3dd4f901359b3f5359c9d4cb8d60f05e9be5e158f1d06b6` |
| `dualsubs/YouTube.response.bundle.js` | v1.5.11 (2024-12-11) | DualSubs/YouTube releases | `b970db912ca06e32c25e18ab70deaed94a308aad6d50b7a5b25cd8a88cf888e9` |
| `dualsubs/Universal.Composite.Subtitles.response.bundle.js` | v1.7.5 (2025-11-23) | DualSubs/Universal releases | `5929a9af89baf763775d642e002f91ce51f76ebe68f70e397d546e1f4cb8020d` |
| `dualsubs/Universal.Translate.response.bundle.js` | v1.7.5 (2025-11-23) | DualSubs/Universal releases | `3289e75916b05b4700a0394b3dd03f458a68e3806adc3ab3526f45d59d85ba4b` |

`v1.5.11` 与 `v1.7.5` 分别是 DualSubs/YouTube 和 DualSubs/Universal 截至拉取日的**最新 release**。

## 如何同步上游

```bash
./scripts/sync-vendor.sh          # 只下载并对比，不覆盖
./scripts/sync-vendor.sh --apply  # 确认差异后再写入
```

同步后务必实测再提交：上游改动可能与本仓库模块的参数、MITM 范围或规则冲突。
