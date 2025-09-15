// Cloudflare Pages Function for participate API

interface Env {
  DATABASE_URL?: string;
}

interface Context {
  request: Request;
  env: Env;
  params: Record<string, string>;
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

// 상품 정보 상수
const PRIZES = [
  { id: 'gift_1000', name: '기프트쇼 1,000원 상품권', probability: 40 },
  { id: 'gift_3000', name: '기프트쇼 3,000원 상품권', probability: 30 },
  { id: 'gift_5000', name: '기프트쇼 5,000원 상품권', probability: 20 },
  { id: 'mega_coffee', name: '메가커피 아메리카노', probability: 10 }
];

function selectRandomPrize() {
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (const prize of PRIZES) {
    cumulative += prize.probability;
    if (random <= cumulative) {
      return prize;
    }
  }
  
  return PRIZES[0]; // 기본값
}

export async function onRequestPost(context: Context): Promise<Response> {
  try {
    const body = await context.request.json() as { code: string };
    
    if (!body.code) {
      return new Response(
        JSON.stringify({ success: false, error: '참여 코드가 필요합니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Prisma Accelerate 클라이언트 생성
    const { PrismaClient } = await import('@prisma/client/edge');
    const { withAccelerate } = await import('@prisma/extension-accelerate');
    
    const prisma = new PrismaClient().$extends(withAccelerate());

    // 참여 코드 확인
    const participationCode = await prisma.participationCode.findUnique({
      where: { code: body.code }
    });

    if (!participationCode) {
      return new Response(
        JSON.stringify({ success: false, error: '유효하지 않은 참여 코드입니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (participationCode.isUsed) {
      return new Response(
        JSON.stringify({ success: false, error: '이미 사용된 참여 코드입니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 랜덤 상품 선택
    const selectedPrize = selectRandomPrize();

    // 트랜잭션으로 처리
    const result = await prisma.$transaction(async (tx: any) => {
      // 참여 코드 사용 처리
      await tx.participationCode.update({
        where: { id: participationCode.id },
        data: { 
          isUsed: true,
          usedAt: new Date()
        }
      });

      // 당첨자 정보 저장
      const winner = await tx.winner.create({
        data: {
          participationCodeId: participationCode.id,
          prizeId: selectedPrize.id,
          userPhoneNumber: '', // 빈 문자열로 초기화
          giftshowTrId: '', // 빈 문자열로 초기화
        }
      });

      return { winner, prize: selectedPrize };
    });
    
    // Prisma 연결 정리
    await prisma.$disconnect();

    return new Response(
      JSON.stringify({
        success: true,
        winnerId: result.winner.id,
        prize: result.prize
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Participate API 에러:', error);
    return new Response(
      JSON.stringify({ success: false, error: '참여 처리 중 오류가 발생했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}