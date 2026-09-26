// Threads "무료 풀이" 답글용: 생년월일(양력/음력)로 일간과 유형 이름을 앱과 같은 방식으로 구한다.
// 사용: node scripts/threads_ilgan.mjs 1998-03-14 [lunar]
// 일간은 태어난 날 기준이라 시간이 없어도 된다(자시 경계인 23시대 출생만 하루 차이가 날 수 있음).
import { Lunar, Solar } from "lunar-typescript";

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

const [date, cal] = process.argv.slice(2);
const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(date ?? "");
if (!m) {
  console.error("사용: node scripts/threads_ilgan.mjs YYYY-MM-DD [lunar]");
  process.exit(1);
}
const [y, mo, d] = m.slice(1).map(Number);
const solar = cal === "lunar" ? Lunar.fromYmdHms(y, mo, d, 12, 0, 0).getSolar() : Solar.fromYmdHms(y, mo, d, 12, 0, 0);
const gan = solar.getLunar().getEightChar().getDayGan();
const [kor, typeName, slug] = GAN[gan];
console.log(JSON.stringify({ solar: solar.toYmd(), dayGan: `${kor}(${gan})`, typeName, slug }));
