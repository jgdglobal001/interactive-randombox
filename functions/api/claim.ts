// Cloudflare Pages Function for claim API

interface Env {
  DATABASE_URL?: string;
  PRISMA_ACCELERATE_URL?: string;
  GIFTSHOW_BASE_URL?: string;
  GIFTSHOW_AUTH_KEY?: string;
  GIFTSHOW_AUTH_TOKEN?: string;
  GIFTSHOW_BANNER_ID?: string;
  GIFTSHOW_CARD_ID?: string;
}

interface Context {
  request: Request;
  env: Env;
  params: Record<string, string>;
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

// 실제 기프트쇼 API 호출 (상용환경)
async function callGiftShowAPI(phoneNumber: string, goodsCode: string, env: Env) {
  // 실제 기프트쇼 API 설정
  const baseUrl = env.GIFTSHOW_BASE_URL || 'https://api.giftshow.co.kr';
  const authKey = env.GIFTSHOW_AUTH_KEY || 'REAL10f8dc85d32c4ff4b2594851a845c15f';
  const authToken = env.GIFTSHOW_AUTH_TOKEN || 'VUUiyDeKaWdeJYjlyGIuwQ==';
  const cardId = env.GIFTSHOW_CARD_ID || '202509120308350';

  console.log('기프트쇼 API 호출 시작:', {
    phoneNumber: phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
    cardId,
    authKey: authKey.substring(0, 8) + '...'
  });

  try {
    // 실제 기프트쇼 API 엔드포인트 및 헤더 구조
    const response = await fetch(`${baseUrl}/card/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'custom_auth_code': authKey,
        'custom_auth_token': authToken,
        'api_code': '0006', // 카드 발송 API 코드
        'dev_flag': 'N' // 상용환경
      },
      body: JSON.stringify({
        phone_number: phoneNumber.replace(/-/g, ''), // 하이픈 제거
        card_id: cardId,
        amount: 0,
        message: '메가커피 교환권이 발송되었습니다.'
      })
    });

    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('기프트쇼 API 응답:', result);

    if (result.success || result.result === 'success') {
      return {
        success: true,
        transactionId: result.transactionId || result.transaction_id || `GS_${Date.now()}`,
        message: result.message || '메가커피 교환권이 성공적으로 발송되었습니다.'
      };
    } else {
      throw new Error(result.message || result.error || 'API 응답 오류');
    }
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