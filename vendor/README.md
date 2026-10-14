# vendor —— 第三方脚本副本

模块的 `script-path` 指向本目录，而不是上游仓库。原因：钉死 commit 只能挡住上游改代码，
挡不住上游删库、改名、或删除 release。把产物固化在这里，模块的行为才真正可复现。

**Maasea 两个文件保持逐字节上游原样；四个 DualSubs 文件包含本地 zm6 简中补丁，不再与上游逐字节一致。** 许可证均为 Apache-2.0，副本见各子目录 `LICENSE`。
署名见仓库根目录 `NOTICE`。

拉取日期：2026-10-14

| 文件 | 上游版本 | 来源 | 上游原始 SHA-256 |
| --- | --- | --- | --- |
| `maasea/youtube.response.js` | commit `65075cd` (2026-07-19) | Maasea/sgmodule | `f98483d5f5017514f82502253c0db5ce2d4ffb7839887aa2cadc22666f5a7f12` |
| `maasea/youtube.request.js` | commit `65075cd` (2026-07-19) | Maasea/sgmodule | `3ecca15e06e76a31720092c581180f648ef2c45e494644941ba985c878efbb26` |
| `dualsubs/YouTube.request.bundle.js` | v1.6.0 (2026-10-11) | DualSubs/YouTube releases | `128dd4ff56a718965018cef2ce404bcedf337b473099b529d92bbe4df1c0e6c6` |
| `dualsubs/YouTube.response.bundle.js` | v1.6.0 (2026-10-11) | DualSubs/YouTube releases | `a6f387776255bc8510efebc4bb9e580e85a171ff8b332bb0d5707c82f0f2ab07` |
| `dualsubs/Universal.Composite.Subtitles.response.bundle.js` | v1.8.1 (2026-10-13) | DualSubs/Universal releases | `c42404fc4bff7dd10cb27ebfcf7d92c89f6584f5067ea37752d36750767c17df` |
| `dualsubs/Universal.Translate.response.bundle.js` | v1.8.1 (2026-10-13) | DualSubs/Universal releases | `a9d9efc80854641886073985827de269503849c4d6c5f9d02f4e7627097ed8da` |

`v1.6.0` 与 `v1.8.1` 分别是 DualSubs/YouTube 和 DualSubs/Universal 截至拉取日的**最新 release**。

Maasea 完整固定提交为 `65075cdb388fc5e3094afd7e7314c67b243f3525`（`fix ad judgment`）；请求脚本与旧固定提交 `bbd30c9318e06e129a71abae1be3812f25f43e3f` 一致。四个 DualSubs 文件已核对 GitHub release asset 的 SHA-256 digest；以下表格保留上游原始 SHA；仅 Maasea 本地文件仍与固定来源逐字节一致。

## 如何同步上游

```bash
./scripts/sync-vendor.sh          # 只下载并对比，不覆盖
./scripts/sync-vendor.sh --apply  # 确认差异后再写入
```

同步后务必实测再提交：上游改动可能与本仓库模块的参数、MITM 范围或规则冲突。

## 本地 zm6 简中补丁与校验和

`../scripts/patch-dualsubs.py` 保存逐文件上游原始 SHA 和唯一替换锚点。仅显式参数 `ForceSimplifiedChinese=true` 启用时纠正目标语言、tlang 与本次缓存，不改变源语言；不添加请求脚本，不绕过 DualSubs。Translate 与 Official 分支仍由原脚本处理。详见 [验证记录](../docs/simplified-chinese-zm6.md)。

| 本地文件 | 本地 SHA-256（包含补丁） |
| --- | --- |
| `dualsubs/Universal.Composite.Subtitles.response.bundle.js` | `1807eb420daf26276ac64a91aa8583e83f3c64777dcf8dd1f00b723732903978` |
| `dualsubs/Universal.Translate.response.bundle.js` | `ac5ea795a3608dfb5bcddefb62a5d856a5cbe368131d5d93c844401f1105f21f` |
| `dualsubs/YouTube.request.bundle.js` | `8bb727fd92df77d3aa4b770db43d8e999e4a35d73a59074a35ed944840a2109f` |
| `dualsubs/YouTube.response.bundle.js` | `b1c180b5b8e309d524f2dc8e19ecc60272f575efe4d20e09600c5fb1d3128082` |
| `maasea/youtube.request.js` | `3ecca15e06e76a31720092c581180f648ef2c45e494644941ba985c878efbb26` |
| `maasea/youtube.response.js` | `f98483d5f5017514f82502253c0db5ce2d4ffb7839887aa2cadc22666f5a7f12` |

同步脚本先暂存全部下载，核对 DualSubs 原始 SHA、重新应用补丁并对六文件运行 node --check，再允许 --apply 写入。未知上游版本或锚点变化会失败退出，不会悄悄恢复未打补丁的脚本。升级上游前必须人工审查并更新补丁规格、SHA 和测试；不能只改版本号。
