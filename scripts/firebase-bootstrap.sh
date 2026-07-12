#!/usr/bin/env bash
# One-time Firebase bootstrap after `npx firebase-tools@latest login`
set -euo pipefail
PROJECT_ID="${1:-trisync-app}"
DISPLAY_NAME="${2:-TriSync}"

npx -y firebase-tools@latest projects:create "$PROJECT_ID" --display-name "$DISPLAY_NAME" || true
npx -y firebase-tools@latest use "$PROJECT_ID"
npx -y firebase-tools@latest apps:create IOS --bundle-id com.trisync.app --display-name "TriSync iOS" --project "$PROJECT_ID" || true

echo "Enable Auth providers (Apple + Anonymous) in Console, then:"
echo "  npx -y firebase-tools@latest apps:sdkconfig IOS --project $PROJECT_ID"
echo "  npx -y firebase-tools@latest deploy --only firestore:rules,functions --project $PROJECT_ID"
