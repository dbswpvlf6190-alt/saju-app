#!/bin/sh
# Vercel ignoreCommand: 종료 코드 0 = 빌드 건너뜀, 1 = 빌드. (vercel.json의 ignoreCommand는 256자 제한이라 여기로 뺐다.)
# 마지막 성공 배포(VERCEL_GIT_PREVIOUS_SHA) 대비 사이트와 무관한 경로만 바뀌었을 때만 건너뛰고,
# 이전 SHA가 없거나 비교가 실패하면(git diff 종료 코드 128 등) 항상 빌드한다.
# 주의: scripts/migrate-deploy.sh(빌드가 실행)와 이 파일은 제외하지 않는다.
[ -n "$VERCEL_GIT_PREVIOUS_SHA" ] || exit 1
git diff --quiet "$VERCEL_GIT_PREVIOUS_SHA" HEAD -- . \
  ':(exclude)scripts/posted_state' ':(exclude)scripts/performance' \
  ':(exclude)scripts/*.py' ':(exclude)scripts/*.json' ':(exclude)scripts/*.mjs' ':(exclude)scripts/*.ps1' \
  ':(exclude)cardnews' ':(exclude)reels' ':(exclude)OPS_NOTES.md' ':(exclude)docs' \
  && exit 0
exit 1
