-- 해외판 결제용 통화 컬럼. 기본값 KRW라 기존 주문은 그대로 원화로 해석된다.
ALTER TABLE "Order" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'KRW';
