"""여러 컴퓨터(데스크톱/노트북)가 같은 git 저장소를 공유하며 자동 게시를 돌릴 때,
같은 항목을 동시에 처리해 중복 게시하지 않도록 돕는 공용 함수 모음.
shorts_auto/scripts/run_queue.py의 락 방식과 동일한 원리(git push의 원자성을 이용)를 쓴다.
"""

import os
import socket
import subprocess
from datetime import datetime

import node_bin  # noqa: F401  (스케줄러 PATH에 node·ffmpeg를 넣는다)

LOCK_STALE_HOURS = 3  # 이 시간이 지난 락은 이전 실행이 비정상 종료된 것으로 보고 무시


def git(args, cwd):
    # shorts_auto 쪽에서 GCM(Git Credential Manager)이 데스크톱 세션 없이 응답 없는
    # 인증창을 띄우려다 몇 시간씩 멈추는 문제를 실제로 겪음(2026-09-16/17) — 여기도
    # URL에 토큰을 내장한 동일 방식이라 같은 위험이 있어 예방적으로 방어.
    # timeout이 나도 기존 호출부가 기대하는 "returncode 있는 결과 객체" 계약은 유지.
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0", "GCM_INTERACTIVE": "Never"}
    try:
        return subprocess.run(
            ["git"] + args, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace",
            env=env, timeout=120,
        )
    except subprocess.TimeoutExpired:
        return subprocess.CompletedProcess(args, returncode=124, stdout="", stderr="git 명령이 120초 내에 끝나지 않아 중단함 (인증 프롬프트 등에서 멈췄을 가능성)")


def _rebase_in_progress(cwd):
    git_dir = os.path.join(cwd, ".git")
    return os.path.isdir(os.path.join(git_dir, "rebase-merge")) or os.path.isdir(os.path.join(git_dir, "rebase-apply"))


def recover_stuck_rebase(cwd):
    """pull --rebase가 충돌로 멈추면 저장소가 브랜치 없는(detached) 상태로 남아, 그 뒤 모든 push가 조용히 실패한다
    (2026-10-29~11-02 노트북이 4일간 아무것도 못 올림). 자동화끼리 부딪히는 건 락 파일뿐이라, 락 충돌이면 이쪽의
    오래된 락 커밋을 건너뛰고(원격이 최신), 그 밖의 충돌이면 rebase를 되돌리고 알린다. 처리했으면 True."""
    if not _rebase_in_progress(cwd):
        return False
    for _ in range(100):
        if not _rebase_in_progress(cwd):
            return True
        conflicted = [p for p in git(["diff", "--name-only", "--diff-filter=U"], cwd).stdout.splitlines() if p.strip()]
        if conflicted and all(p.endswith(".lock") for p in conflicted):
            git(["rebase", "--skip"], cwd)
            continue
        git(["rebase", "--abort"], cwd)
        import notify  # 순환 import 방지로 여기서

        notify.notify("⚠️ git 동기화 충돌(자동화 저장소)", f"{os.path.basename(cwd)}: 락 파일이 아닌 충돌이라 되돌림 — "
                      f"{', '.join(conflicted[:3]) or '원인 불명'}. 사람 확인 필요", priority=4, tags=["warning"])
        return True
    git(["rebase", "--abort"], cwd)
    return True


def git_pull(cwd):
    recover_stuck_rebase(cwd)  # 지난 실행이 남긴 멈춘 rebase부터 정리
    result = git(["pull", "--rebase", "origin", "main"], cwd)
    if result.returncode != 0:
        print(f"  git pull 실패(무시하고 로컬 상태로 계속): {result.stderr[-500:]}")
        if recover_stuck_rebase(cwd):
            print("  멈춘 rebase 정리함")


def git_commit_push(cwd, paths, message):
    """지정한 경로만 커밋해서 push. 실패해도 예외를 던지지 않는다(네트워크 문제로 전체
    실행이 멈추면 안 되므로) — 성공 여부만 반환해서 호출부가 판단하게 한다."""
    git(["add"] + paths, cwd)
    commit = git(["commit", "-m", message, "--"] + paths, cwd)
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
