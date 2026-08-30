"""여러 컴퓨터(데스크톱/노트북)가 같은 git 저장소를 공유하며 자동 게시를 돌릴 때,
같은 항목을 동시에 처리해 중복 게시하지 않도록 돕는 공용 함수 모음.
shorts_auto/scripts/run_queue.py의 락 방식과 동일한 원리(git push의 원자성을 이용)를 쓴다.
"""

import os
import socket
import subprocess
from datetime import datetime

LOCK_STALE_HOURS = 3  # 이 시간이 지난 락은 이전 실행이 비정상 종료된 것으로 보고 무시


def git(args, cwd):
    return subprocess.run(
        ["git"] + args, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace"
    )


def git_pull(cwd):
    result = git(["pull", "--rebase", "origin", "main"], cwd)
    if result.returncode != 0:
        print(f"  git pull 실패(무시하고 로컬 상태로 계속): {result.stderr[-500:]}")


def git_commit_push(cwd, paths, message):
    """지정한 경로만 커밋해서 push. 실패해도 예외를 던지지 않는다(네트워크 문제로 전체
    실행이 멈추면 안 되므로) — 성공 여부만 반환해서 호출부가 판단하게 한다."""
    git(["add"] + paths, cwd)
    commit = git(["commit", "-m", message], cwd)
    if commit.returncode != 0:
        if "nothing to commit" in (commit.stdout + commit.stderr).lower():
            return True  # 변경사항 없음 -> 이미 최신 상태이므로 성공으로 취급
        return False
    push = git(["push", "origin", "main"], cwd)
    return push.returncode == 0


def try_acquire_lock(cwd, lock_rel_path):
    """락 파일을 커밋+push해서 선점 여부를 표시한다. push가 거부되면 다른 컴퓨터가
    먼저 선점한 것이므로 양보한다."""
    lock_path = os.path.join(cwd, lock_rel_path)
    me = f"{socket.gethostname()}|{os.getpid()}"

    if os.path.exists(lock_path):
        with open(lock_path, "r", encoding="utf-8") as f:
            content = f.read().strip()
        try:
            holder, ts = content.rsplit(" ", 1)
            age_hours = (datetime.now() - datetime.fromisoformat(ts)).total_seconds() / 3600
        except ValueError:
            holder, age_hours = content, 0
        if age_hours < LOCK_STALE_HOURS:
            return False, holder
        # 오래된 락은 이전 실행이 비정상 종료된 것으로 보고 무시하고 덮어씀

    os.makedirs(os.path.dirname(lock_path), exist_ok=True)
    with open(lock_path, "w", encoding="utf-8") as f:
        f.write(f"{me} {datetime.now().isoformat()}")

    if not git_commit_push(cwd, [lock_rel_path], f"lock: {lock_rel_path} by {me}"):
        # push 거부됨 -> 다른 컴퓨터가 먼저 뭔가를 올렸다는 뜻. 최신 상태를 받아와서 재확인.
        git_pull(cwd)
        if os.path.exists(lock_path):
            with open(lock_path, "r", encoding="utf-8") as f:
                current = f.read().strip()
            if not current.startswith(me):
                return False, current  # 다른 컴퓨터가 락을 선점함 -> 양보
        # 그 외의 이유로 push가 실패한 경우(네트워크 등)는 일단 로컬 락으로 진행

    return True, me


def release_lock(cwd, lock_rel_path):
    lock_path = os.path.join(cwd, lock_rel_path)
    if os.path.exists(lock_path):
        os.remove(lock_path)
    git_commit_push(cwd, [lock_rel_path], f"unlock: {lock_rel_path}")
