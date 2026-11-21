import { describe, expect, it } from "vitest";
import { blogPostTag, classifyPageFrom } from "../pageFrom";

const OWN = "saju-app-three-dusky.vercel.app";

describe("공개 페이지 유입 분류", () => {
  it("네이버 블로그(PC·모바일)에서 온 손님을 블로그로 센다", () => {
    expect(classifyPageFrom("https://blog.naver.com/yoonjepil6190/2240", null, OWN)).toBe("blog");
    expect(classifyPageFrom("https://m.blog.naver.com/PostView.naver?blogId=x", null, OWN)).toBe("blog");
  });

  it("주소의 ?from=blog가 있으면 referrer가 비어도 블로그로 센다", () => {
    expect(classifyPageFrom("", "blog", OWN)).toBe("blog");
    expect(classifyPageFrom("", "아무거나", OWN)).toBe("direct");
  });

  it("검색·사이트 안 이동·바로 들어옴을 나눈다", () => {
    expect(classifyPageFrom("https://m.search.naver.com/search.naver?query=x", null, OWN)).toBe("naver_search");
    expect(classifyPageFrom("https://www.google.co.kr/", null, OWN)).toBe("google");
    expect(classifyPageFrom("https://search.daum.net/search?q=x", null, OWN)).toBe("daum");
    expect(classifyPageFrom(`https://${OWN}/2027`, null, OWN)).toBe("internal");
    expect(classifyPageFrom("", null, OWN)).toBe("direct");
    expect(classifyPageFrom("not a url", null, OWN)).toBe("other");
  });
});

describe("blogPostTag (2026-11-21 글별 기록)", () => {
  it("영문·숫자·하이픈 이름표만 받는다", () => {
    expect(blogPostTag("1123-sonnal")).toBe("1123-sonnal");
    expect(blogPostTag(" 1124-ISA ")).toBe("1124-isa");
  });
  it("이상한 값·너무 긴 값은 버린다", () => {
    expect(blogPostTag(null)).toBeUndefined();
    expect(blogPostTag("홍길동")).toBeUndefined();
    expect(blogPostTag("a@b.com")).toBeUndefined();
    expect(blogPostTag("x".repeat(25))).toBeUndefined();
  });
});
