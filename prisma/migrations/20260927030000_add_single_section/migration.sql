-- 1가지 상품(single_section)과 차액 결제(section_upgrade)용 컬럼. 둘 다 nullable이라 기존 주문에 영향 없음.
ALTER TABLE "Order" ADD COLUMN "sectionKey" TEXT;
ALTER TABLE "Order" ADD COLUMN "parentPaymentId" TEXT;
