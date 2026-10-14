#!/usr/bin/env bash
# 拉取上游脚本并与 vendor/ 对比。默认只报告差异，--apply 才写入。
# 上游版本在这里改：改完记得同步 vendor/README.md 的版本列和 SHA。
set -euo pipefail
cd "$(dirname "$0")/.."

MAASEA_REF=65075cdb388fc5e3094afd7e7314c67b243f3525
DUALSUBS_YT=v1.6.0
DUALSUBS_UNI=v1.8.1

M="https://raw.githubusercontent.com/Maasea/sgmodule/$MAASEA_REF/Script/Youtube"
DY="https://github.com/DualSubs/YouTube/releases/download/$DUALSUBS_YT"
DU="https://github.com/DualSubs/Universal/releases/download/$DUALSUBS_UNI"

# vendor 路径|上游 URL
FILES=(
  "vendor/maasea/youtube.response.js|$M/youtube.response.js"
  "vendor/maasea/youtube.request.js|$M/youtube.request.js"
  "vendor/dualsubs/YouTube.request.bundle.js|$DY/request.bundle.js"
  "vendor/dualsubs/YouTube.response.bundle.js|$DY/response.bundle.js"
  "vendor/dualsubs/Universal.Composite.Subtitles.response.bundle.js|$DU/Composite.Subtitles.response.bundle.js"
  "vendor/dualsubs/Universal.Translate.response.bundle.js|$DU/Translate.response.bundle.js"
)

apply=0; [[ "${1:-}" == "--apply" ]] && apply=1
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
changed=0

# Stage every asset and validate/reapply local patches BEFORE writing any file.
for entry in "${FILES[@]}"; do
  dest="${entry%%|*}"; url="${entry##*|}"
  mkdir -p "$tmp/$(dirname "$dest")"
  curl -sfL "$url" -o "$tmp/$dest" || { echo "✗ 下载失败: $url"; exit 1; }
  python3 scripts/patch-dualsubs.py "$tmp/$dest"
  node --check "$tmp/$dest"
done

for entry in "${FILES[@]}"; do
  dest="${entry%%|*}"
  if cmp -s "$tmp/$dest" "$dest"; then
    echo "= $dest"
  else
    changed=1
    echo "≠ $dest  ($(wc -c <"$dest") B -> $(wc -c <"$tmp/$dest") B)"
    if (( apply )); then
      cp "$tmp/$dest" "$dest"
      echo "  已更新，新 SHA: $(shasum -a 256 "$dest" | cut -d' ' -f1)"
    fi
  fi
done

if (( changed == 0 )); then
  echo "vendor/ 与固定上游 + 本地简中补丁一致。"
elif (( apply )); then
  echo
  echo "已写入。接下来必须做："
  echo "  1. 更新 vendor/README.md 的版本列与 SHA-256"
  echo "  2. 在 Surge 里实测播放/字幕/去广告，再提交"
else
  echo
  echo "以上有差异。确认要采用请跑：$0 --apply"
fi
