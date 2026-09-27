"""사주랩 Threads(@sajulab_official) 공식 API 래퍼 — 글 게시, 내 글에 댓글(링크) 달기, 답글 읽기, 인사이트.

토큰 준비(최초 1회, 둘 중 하나):
  A) Meta 개발자 앱 > 사용 사례 "Threads API" > 설정의 "사용자 토큰 생성기"로 만든 토큰을
     credentials/threads_token.txt 에 붙여넣고 `python scripts/threads_api.py --import-token` 실행
  B) credentials/threads_secret.json(threads_app_id, threads_app_secret, redirect_uri) 준비 후
     `--get-auth-url` → 로그인·승인 → 받은 code로 `--exchange-code CODE`
토큰은 60일짜리 장기 토큰으로 바꿔 credentials/threads_token.json 에 저장하고, 50일이 지나면 자동 갱신한다.
credentials/ 는 git 제외 — 컴퓨터마다 같은 파일이 필요하다(인스타 토큰과 같은 방식).
"""
import argparse
import json
import os
import sys
import time
import urllib.parse

import requests

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CRED_DIR = os.path.join(BASE_DIR, "credentials")
SECRET_PATH = os.path.join(CRED_DIR, "threads_secret.json")
TOKEN_PATH = os.path.join(CRED_DIR, "threads_token.json")
TOKEN_TXT_PATH = os.path.join(CRED_DIR, "threads_token.txt")
GRAPH = "https://graph.threads.net"
API = f"{GRAPH}/v1.0"

SCOPES = "threads_basic,threads_content_publish,threads_manage_replies,threads_read_replies,threads_manage_insights"


def _load_secret():
    with open(SECRET_PATH, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def _save_token(access_token, user_id, expires_in):
    data = {"access_token": access_token, "user_id": str(user_id), "obtained_at": time.time(), "expires_in": expires_in}
    with open(TOKEN_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f)
    return data


def _check(resp):
    if resp.status_code != 200:
        raise RuntimeError(f"Threads API {resp.status_code}: {resp.text[:500]}")
    return resp.json()


def _me(access_token):
    return _check(requests.get(f"{API}/me", params={"fields": "id,username", "access_token": access_token}, timeout=30))


def _to_long_lived(access_token):
    """단기 토큰이면 장기(60일)로 교환. 앱 시크릿이 없거나 이미 장기 토큰이면 그대로 쓴다."""
    try:
        secret = _load_secret()
    except OSError:
        return access_token, 5184000
    resp = requests.get(
        f"{GRAPH}/access_token",
        params={"grant_type": "th_exchange_token", "client_secret": secret["threads_app_secret"], "access_token": access_token},
        timeout=30,
    )
    if resp.status_code != 200:
        return access_token, 5184000
    data = resp.json()
    return data["access_token"], data.get("expires_in", 5184000)


def import_token():
    with open(TOKEN_TXT_PATH, "r", encoding="utf-8-sig") as f:
        raw = f.read().strip()
    token, expires_in = _to_long_lived(raw)
    me = _me(token)
    _save_token(token, me["id"], expires_in)
    os.remove(TOKEN_TXT_PATH)  # 평문 붙여넣기 파일은 json으로 옮긴 뒤 지운다
    print(f"토큰 저장 완료: @{me.get('username')} (user_id {me['id']})")


def get_auth_url():
    secret = _load_secret()
    params = {"client_id": secret["threads_app_id"], "redirect_uri": secret["redirect_uri"], "scope": SCOPES, "response_type": "code"}
    return "https://threads.net/oauth/authorize?" + urllib.parse.urlencode(params)


def exchange_code(code):
    secret = _load_secret()
    code = code.split("#")[0].strip()
    data = _check(requests.post(
        f"{GRAPH}/oauth/access_token",
        data={
            "client_id": secret["threads_app_id"], "client_secret": secret["threads_app_secret"],
            "grant_type": "authorization_code", "redirect_uri": secret["redirect_uri"], "code": code,
        },
        timeout=30,
    ))
    token, expires_in = _to_long_lived(data["access_token"])
    saved = _save_token(token, data.get("user_id") or _me(token)["id"], expires_in)
    print(f"토큰 저장 완료 (user_id {saved['user_id']})")


def get_token():
    if not os.path.exists(TOKEN_PATH):
        raise SystemExit("Threads 토큰이 없습니다. scripts/threads_api.py 맨 위 설명대로 먼저 토큰을 준비해주세요.")
    with open(TOKEN_PATH, "r", encoding="utf-8-sig") as f:
        data = json.load(f)
    if (time.time() - data["obtained_at"]) / 86400 > 50:
        print("Threads 토큰 만료 임박, 갱신 중...")
        fresh = _check(requests.get(
            f"{GRAPH}/refresh_access_token",
            params={"grant_type": "th_refresh_token", "access_token": data["access_token"]},
            timeout=30,
        ))
        data = _save_token(fresh["access_token"], data["user_id"], fresh.get("expires_in", 5184000))
    return data


def _publish(params):
    """텍스트 컨테이너를 만들고 게시. Meta 권장대로 생성 후 잠깐 기다렸다가 publish 한다."""
    tok = get_token()
    create = _check(requests.post(f"{API}/{tok['user_id']}/threads", data={**params, "access_token": tok["access_token"]}, timeout=30))
    creation_id = create["id"]
    for _ in range(10):
        time.sleep(3)
        status = _check(requests.get(
            f"{API}/{creation_id}", params={"fields": "status,error_message", "access_token": tok["access_token"]}, timeout=15,
        ))
        if status.get("status") in ("FINISHED", "PUBLISHED"):
            break
        if status.get("status") in ("ERROR", "EXPIRED"):
            raise RuntimeError(f"컨테이너 처리 실패: {status}")
    published = _check(requests.post(
        f"{API}/{tok['user_id']}/threads_publish",
        data={"creation_id": creation_id, "access_token": tok["access_token"]},
        timeout=30,
    ))
    return published["id"]


def post_text(text, topic=None):
    params = {"media_type": "TEXT", "text": text}
    if topic:
        params["topic_tag"] = topic
    return _publish(params)


def reply(to_id, text):
    return _publish({"media_type": "TEXT", "text": text, "reply_to_id": to_id})


def get_replies(media_id):
    tok = get_token()
    data = _check(requests.get(
        f"{API}/{media_id}/replies",
        params={"fields": "id,text,username,timestamp,is_reply_owned_by_me", "access_token": tok["access_token"]},
        timeout=30,
    ))
    return data.get("data", [])


def get_insights(media_id):
    tok = get_token()
    data = _check(requests.get(
        f"{API}/{media_id}/insights",
        params={"metric": "views,likes,replies,reposts,quotes,shares", "access_token": tok["access_token"]},
        timeout=30,
    ))
    return {m["name"]: (m.get("values") or [{}])[0].get("value", m.get("total_value", {}).get("value")) for m in data.get("data", [])}


def get_account():
    tok = get_token()
    me = _check(requests.get(f"{API}/me", params={"fields": "id,username", "access_token": tok["access_token"]}, timeout=30))
    ins = _check(requests.get(
        f"{API}/{tok['user_id']}/threads_insights",
        params={"metric": "followers_count", "access_token": tok["access_token"]},
        timeout=30,
    ))
    followers = None
    for m in ins.get("data", []):
        if m["name"] == "followers_count":
            followers = m.get("total_value", {}).get("value")
    return {"username": me.get("username"), "followers": followers}


def list_my_threads(limit=25):
    tok = get_token()
    data = _check(requests.get(
        f"{API}/{tok['user_id']}/threads",
        params={"fields": "id,text,timestamp,permalink", "limit": limit, "access_token": tok["access_token"]},
        timeout=30,
    ))
    return data.get("data", [])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--import-token", action="store_true")
    ap.add_argument("--get-auth-url", action="store_true")
    ap.add_argument("--exchange-code")
    ap.add_argument("--check", action="store_true", help="토큰·계정 확인 + 최근 글 목록")
    args = ap.parse_args()
    if args.import_token:
        import_token()
    elif args.get_auth_url:
        print(get_auth_url())
    elif args.exchange_code:
        exchange_code(args.exchange_code)
    elif args.check:
        print(get_account())
        for t in list_my_threads(5):
            print(t["id"], t.get("timestamp"), (t.get("text") or "").replace("\n", " ")[:40])
    else:
        ap.print_help()


if __name__ == "__main__":
    main()
