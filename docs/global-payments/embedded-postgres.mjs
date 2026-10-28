// 해외 결제 테스트용 로컬 Postgres(임베디드). 운영 DB가 아니다. 사용법은 HANDOFF.md 참고.
//   mkdir %TEMP%\pgtool && cd %TEMP%\pgtool && npm init -y && npm i embedded-postgres@17.10.0-beta.17
//   node <이 파일 경로>   (데이터는 %TEMP%\pgtool\pgdata, 포트 54329, DB 이름 globaltest)
// 18.x beta는 Windows에서 크래시(0xC0000005)해서 17.10.0-beta.17로 고정한다. 한국어 로캘 initdb 오류 방지로 --locale=C.
import EmbeddedPostgres from "embedded-postgres";
import fs from "fs";
import os from "os";
import path from "path";

const dir = process.env.PGDATA_DIR || path.join(os.tmpdir(), "pgtool", "pgdata");
const password = process.env.PGTEST_PASSWORD || "globaltest-local";
const pg = new EmbeddedPostgres({ databaseDir: dir, user: "postgres", password, port: 54329, persistent: true, initdbFlags: ["--locale=C", "--encoding=UTF8"] });
if (!fs.existsSync(path.join(dir, "PG_VERSION"))) await pg.initialise();
await pg.start();
try { await pg.createDatabase("globaltest"); } catch (e) { console.log("db exists or error:", String(e.message).slice(0, 80)); }
console.log(`PG_READY  DATABASE_URL=postgresql://postgres:${password}@localhost:54329/globaltest`);
setInterval(() => {}, 1 << 30);
