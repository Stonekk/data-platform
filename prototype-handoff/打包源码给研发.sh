#!/usr/bin/env bash
# 在项目根目录执行： ./prototype-handoff/打包源码给研发.sh
# 在上级目录生成 tar.gz，避免把正在写入的压缩包打进包里。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$(cd "$ROOT/.." && pwd)/embodied-data-platform-prototype-${STAMP}.tar.gz"

cd "$ROOT"

# macOS / BSD tar：COPYFILE_DISABLE 避免把 ._ 资源叉带进包
export COPYFILE_DISABLE=1

tar -czf "$OUT" \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=dist-ssr \
  --exclude=.git \
  .

echo "已生成: $OUT"
echo "大小: $(du -h "$OUT" | cut -f1)"
