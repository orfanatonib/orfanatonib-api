#!/usr/bin/env bash
set -euo pipefail

# Upload a logo PNG to the public S3 bucket and print the public URL.
#
# Usage:
#   AWS_PROFILE=clubinho-aws ./scripts/upload-email-logo.sh /abs/path/to/logo.png
#
# Optional envs:
#   AWS_REGION (default: us-east-1)
#   AWS_S3_BUCKET_NAME (default: orfanato-nib-storage)
#   S3_KEY (default: assets/email/orfanato-nib-logo.png)

FILE_PATH="${1:-}"
if [[ -z "${FILE_PATH}" ]]; then
  echo "error: missing file path"
  echo "usage: AWS_PROFILE=clubinho-aws $0 /abs/path/to/logo.png"
  exit 2
fi
if [[ ! -f "${FILE_PATH}" ]]; then
  echo "error: file not found: ${FILE_PATH}"
  exit 2
fi

PROFILE="${AWS_PROFILE:-default}"
REGION="${AWS_REGION:-us-east-1}"
BUCKET="${AWS_S3_BUCKET_NAME:-orfanato-nib-storage}"
KEY="${S3_KEY:-assets/email/orfanato-nib-logo.png}"

echo "==> uploading to s3://${BUCKET}/${KEY} (profile=${PROFILE} region=${REGION})"

# Bucket policy already allows public reads; we just need to upload the object.
aws s3 cp \
  "${FILE_PATH}" \
  "s3://${BUCKET}/${KEY}" \
  --profile "${PROFILE}" \
  --region "${REGION}" \
  --content-type "image/png" \
  --cache-control "public, max-age=31536000, immutable"

URL="https://${BUCKET}.s3.amazonaws.com/${KEY}"
echo ""
echo "public_url=${URL}"


