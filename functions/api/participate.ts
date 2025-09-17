// Cloudflare Pages Function for participate API

interface Env {
  DATABASE_URL?: string;
  PRISMA_ACCELERATE_URL?: string;
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

// CUID 생성 함수 (Prisma와 동일한 방식)
function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `c${timestamp}${randomPart}`;
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
    
    // Neon Serverless Driver 사용 (Prisma 미사용)
    const { neon, neonConfig } = await import('@neondatabase/serverless');
    neonConfig.webSocketConstructor = undefined;

    const sql = neon(context.env.DATABASE_URL!);

    // 참여 코드 확인
    const participationCodes = await sql`
      select id, code, "isUsed", "createdAt", "usedAt"
      from "ParticipationCode"
      where code = ${body.code}
    `;
    const participationCode = participationCodes[0] || null;

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

    // SQL로 트랜잭션 처리
    // 1. 참여 코드 사용 처리
    await sql`
      update "ParticipationCode"
      set "isUsed" = true, "usedAt" = now()
      where id = ${participationCode.id}
    `;

    // 2. 당첨자 정보 저장
    const winnerId = generateCuid();
    const winners = await sql`
      insert into "Winner" (id, "participationCodeId", "prizeId", "userPhoneNumber", "giftshowTrId")
      values (${winnerId}, ${participationCode.id}, ${selectedPrize.id}, '', '')
      returning id
    `;
    const winner = winners[0];

    const result = { winner, prize: selectedPrize };

    // Neon serverless 사용 - 별도 연결 정리 불필요

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