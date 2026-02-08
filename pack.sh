#!/bin/bash
# 快速打包脚本

# 从 manifest.json 读取版本号
VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": *"\([^"]*\)".*/\1/')

# 输出文件名
OUTPUT="Better-Tab-Split-v${VERSION}.zip"

# 删除所有旧的 zip 文件
rm -f Better-Tab-Split-v*.zip

# 打包（排除不需要的文件）
zip -r "$OUTPUT" \
  manifest.json \
  background.js \
  content.js \
  icons/ \
  -x "*.DS_Store" \
  -x "*.git*"

echo "✅ 打包完成: $OUTPUT"
