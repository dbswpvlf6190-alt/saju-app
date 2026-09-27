// Threads "무료 풀이" 답글용: 생년월일(양력/음력)로 일간과 유형 이름을 앱과 같은 방식으로 구한다.
// 사용: node scripts/threads_ilgan.mjs 1998-03-14 [lunar]
//       node scripts/threads_ilgan.mjs --batch < [{"date":"1998-03-14","lunar":false}, ...]
//         → 각 항목에 일간·유형·ilganPages 내용(요약/연애/일/돈/관계)을 붙여 JSON으로 출력
// 일간은 태어난 날 기준이라 시간이 없어도 된다(자시 경계인 23시대 출생만 하루 차이가 날 수 있음).
// ilganPages.ts는 Node 22.6+의 타입 제거 기능으로 바로 import 한다(별도 빌드 불필요).
import { Lunar, Solar } from "lunar-typescript";
import { ILGAN_BY_SLUG } from "../src/lib/saju/ilganPages.ts";

const GAN = {
  甲: ["갑", "리더나무형", "gapmok"],
  乙: ["을", "유연풀잎형", "eulmok"],
  丙: ["병", "태양형", "byeonghwa"],
  丁: ["정", "촛불형", "jeonghwa"],
  戊: ["무", "큰산형", "mutok"],
  己: ["기", "기름진밭형", "gitok"],
  庚: ["경", "원석형", "gyeonggeum"],
  辛: ["신", "보석형", "singeum"],
  壬: ["임", "큰강형", "imsu"],
  癸: ["계", "이슬비형", "gyesu"],
};

function ilgan(date, lunar) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(date ?? "");
  if (!m) throw new Error(`날짜 형식 오류: ${date}`);
  const [y, mo, d] = m.slice(1).map(Number);
  const solar = lunar ? Lunar.fromYmdHms(y, mo, d, 12, 0, 0).getSolar() : Solar.fromYmdHms(y, mo, d, 12, 0, 0);
  const gan = solar.getLunar().getEightChar().getDayGan();
  const [kor, typeName, slug] = GAN[gan];
  return { solar: solar.toYmd(), dayGan: `${kor}(${gan})`, typeName, slug };
}

if (process.argv[2] === "--batch") {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  const out = JSON.parse(input).map((item) => {
    try {
      const r = ilgan(item.date, item.lunar);
      const p = ILGAN_BY_SLUG[r.slug];
      return {
        ...item, ...r, hangul: p.hangul, metaphor: p.metaphor, keywords: p.keywords,
        summary: p.summary, love: p.love, work: p.work, money: p.money, relations: p.relations,
      };
    } catch (e) {
      return { ...item, error: String(e.message ?? e) };
    }
  });
  process.stdout.write(JSON.stringify(out));
} else {
  const [date, cal] = process.argv.slice(2);
  try {
    console.log(JSON.stringify(ilgan(date, cal === "lunar")));
  } catch {
    console.error("사용: node scripts/threads_ilgan.mjs YYYY-MM-DD [lunar]");
    process.exit(1);
  }
}
