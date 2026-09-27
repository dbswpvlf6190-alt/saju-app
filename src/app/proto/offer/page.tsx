// 시제품 캡처용 임시 페이지(proto/conversion 브랜치 전용 — main에 합치기 전에 삭제할 것).
import { ProtoOffer } from "./ProtoOffer";

export const metadata = { robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-8">
      <main className="w-full max-w-md">
        <ProtoOffer mode={mode === "single" ? "single" : "full"} />
      </main>
    </div>
  );
}
