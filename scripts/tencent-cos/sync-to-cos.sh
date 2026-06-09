#!/usr/bin/env bash
# 将 npm run build 产物同步到腾讯云 COS 存储桶根目录。
# 使用前请先在控制台开启「静态网站」并设置错误文档为 index.html（见同目录 部署说明.md）。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT"

if ! command -v coscli >/dev/null 2>&1; then
  echo "未找到 coscli。请安装：https://cloud.tencent.com/document/product/436/63144"
  echo "macOS 可下载 release 后将 coscli 放到 PATH，或：brew install coscli（若已配置 tap）"
  exit 1
fi

: "${COS_BUCKET:?请设置环境变量 COS_BUCKET，例如 mysite-1250000000}"
: "${COS_REGION:?请设置环境变量 COS_REGION，例如 ap-guangzhou}"

ENDPOINT="cos.${COS_REGION}.myqcloud.com"
COS_URL="cos://${COS_BUCKET}/"

echo "==> npm run build"
npm run build

echo "==> coscli sync dist/ -> ${COS_URL} (endpoint: ${ENDPOINT})"
cd dist
sync_args=(coscli sync . "$COS_URL" -r -e "$ENDPOINT")
if [[ -n "${COS_SECRET_ID:-}" && -n "${COS_SECRET_KEY:-}" ]]; then
  sync_args+=(-i "$COS_SECRET_ID" -k "$COS_SECRET_KEY")
fi
"${sync_args[@]}"

echo
echo "上传完成。请在浏览器打开控制台「静态网站」中给出的访问节点（或已绑定的自定义域名）。"
echo "若刷新子路由 404，请确认错误文档已设为 index.html。"
