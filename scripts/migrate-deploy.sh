#!/bin/sh
# 빌드 중 운영 DB에 연결해 대기 중인 마이그레이션을 적용한다. 짧은 네트워크 끊김 때문에
# 배포 전체가 실패하는 걸 막기 위해 몇 초 간격으로 최대 3번 시도한다 — 그래도 실패하면
# (예: 마이그레이션 자체가 잘못됐거나 DB가 정말 응답하지 않는 경우) 빌드를 그대로 실패시켜서
# 마이그레이션이 안 된 채로 조용히 배포되는 일이 없게 한다.
set -e

attempt=1
max_attempts=3

until npx prisma migrate deploy; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "prisma migrate deploy failed after $max_attempts attempts" >&2
    exit 1
  fi
  wait_seconds=$((attempt * 5))
  echo "prisma migrate deploy failed (attempt $attempt/$max_attempts), retrying in ${wait_seconds}s..." >&2
  sleep "$wait_seconds"
  attempt=$((attempt + 1))
done
