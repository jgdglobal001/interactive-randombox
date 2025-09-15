// Cloudflare Pages Function for claim API

interface Env {
  DATABASE_URL?: string;
  PRISMA_ACCELERATE_URL?: string;
  GIFTSHOW_BASE_URL?: string;
  GIFTSHOW_AUTH_KEY?: string;
  GIFTSHOW_AUTH_TOKEN?: string;
  GIFTSHOW_USE_MOCK_API?: string;
}

interface Context {
  request: Request;
  env: Env;
  params: Record<string, string>;
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

// 기프트쇼 API 호출 (모의 구현)
async function callGiftShowAPI(phoneNumber: string, goodsCode: string, env: Env) {
  const useMockAPI = env.GIFTSHOW_USE_MOCK_API === 'true';
  
  if (useMockAPI) {
    // 모의 API 응답
    return {
      success: true,
      transactionId: `MOCK_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      message: '상품이 성공적으로 발송되었습니다.'
    };
  }

  // 실제 기프트쇼 API 호출
  const baseUrl = env.GIFTSHOW_BASE_URL || 'https://api.giftshow.co.kr';
  const authKey = env.GIFTSHOW_AUTH_KEY;
  const authToken = env.GIFTSHOW_AUTH_TOKEN;

  try {
    const response = await fetch(`${baseUrl}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-API-Key': authKey || '',
      },
      body: JSON.stringify({
        phoneNumber,
        goodsCode,
        timestamp: Date.now()
      })
    });

    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`);
    }

    const result = await response.json() as {
      transactionId: string;
      message: string;
    };
    return {
      success: true,
      transactionId: result.transactionId,
      message: result.message
    };
  } catch (error) {
    console.error('기프트쇼 API 호출 에러:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'API 호출 실패'
    };
  }
}

export async function onRequestPost(context: Context): Promise<Response> {
  try {
    const body = await context.request.json() as { 
      winnerId: string; 
      phoneNumber: string; 
    };

    if (!body.winnerId || !body.phoneNumber) {
      return new Response(
        JSON.stringify({ success: false, error: '당첨자 ID와 휴대폰 번호가 필요합니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Prisma Accelerate 클라이언트 생성
    const { PrismaClient } = await import('@prisma/client/edge');
    const { withAccelerate } = await import('@prisma/extension-accelerate');
    
    // Prisma Accelerate URL이 있는 경우에만 사용
    const prismaOptions: any = {
      datasources: {
        db: {
          url: context.env.DATABASE_URL
        }
      }
    };
    
    if (context.env.PRISMA_ACCELERATE_URL) {
      prismaOptions.datasourceUrl = context.env.PRISMA_ACCELERATE_URL;
    }
    
    const prisma = new PrismaClient(prismaOptions).$extends(withAccelerate());

    // 당첨자 정보 확인
    const winner = await prisma.winner.findUnique({
      where: { id: body.winnerId },
      include: { prize: true }
    });

    if (!winner) {
      return new Response(
        JSON.stringify({ success: false, error: '유효하지 않은 당첨자 정보입니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (winner.userPhoneNumber && winner.giftshowTrId) {
      return new Response(
        JSON.stringify({ success: false, error: '이미 상품을 수령했습니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 기프트쇼 API 호출
    const giftShowResult = await callGiftShowAPI(
      body.phoneNumber, 
      winner.prize.giftshowGoodsCode,
      context.env
    );

    if (!giftShowResult.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '기프트쇼 API 연동 중 오류가 발생했습니다.',
          details: giftShowResult.error 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 당첨자 정보 업데이트
    await prisma.winner.update({
      where: { id: body.winnerId },
      data: {
        userPhoneNumber: body.phoneNumber,
        giftshowTrId: giftShowResult.transactionId,
      }
    });
    
    // Prisma 연결 정리
    await prisma.$disconnect();

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '상품이 성공적으로 발송되었습니다.',
        transactionId: giftShowResult.transactionId
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Claim API 에러:', error);
    return new Response(
      JSON.stringify({ success: false, error: '상품 수령 중 오류가 발생했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}