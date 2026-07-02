#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Step 1 of the Sydney migration: create ECR repo in
# ap-southeast-2 and push the backend image there.
# Run from anywhere:  bash backend/migrate-to-sydney.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

REGION=ap-southeast-2
ACCOUNT=884408162415
REPO=drawtoplay-backend
ECR=$ACCOUNT.dkr.ecr.$REGION.amazonaws.com

cd "$(dirname "$0")"   # backend/ folder (Dockerfile lives here)

echo "── 1/3 ECR repo in $REGION"
aws ecr describe-repositories --repository-names $REPO --region $REGION >/dev/null 2>&1 \
  || aws ecr create-repository --repository-name $REPO --region $REGION \
       --query 'repository.repositoryUri' --output text

echo "── 2/3 Build image (amd64 — M-series Macs build ARM by default)"
docker build --platform linux/amd64 -t $REPO .

echo "── 3/3 Push to $ECR"
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin $ECR
docker tag $REPO:latest $ECR/$REPO:latest
docker push $ECR/$REPO:latest

echo ""
echo "✅ Image pushed: $ECR/$REPO:latest"
echo "Next: create the ECS Express service in the $REGION console"
echo "      (steps in chat), then tell Claude the new service URL."
