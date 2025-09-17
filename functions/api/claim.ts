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

// 실제 기프트쇼 API 호출 (API 문서 규격에 맞게 수정)
async function callGiftShowAPI(phoneNumber: string, goodsCode: string, env: Env) {
  // 실제 기프트쇼 API 설정 (문서 기준)
  const authKey = env.GIFTSHOW_AUTH_KEY || 'REAL10f8dc85d32c4ff4b2594851a845c15f';
  const authToken = env.GIFTSHOW_AUTH_TOKEN || 'VUUiyDeKaWdeJYjlyGIuwQ==';
  const cardId = env.GIFTSHOW_CARD_ID || '202509120308350';

  console.log('기프트쇼 API 호출 시작:', {
    phoneNumber: phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
    cardId,
    authKey: authKey.substring(0, 8) + '...'
  });

  try {
    // 기프트쇼 API 문서에 따른 HTTPS 통신
    // SSL 1.2, AES256/ECB/PKCS5Padding, Base64 Encoding 사용
    const apiUrl = 'https://bizapi.giftishow.com/bizApi/send'; // 문서의 정확한 엔드포인트

    const requestData = {
      custom_auth_code: authKey,
      custom_auth_token: authToken,
      api_code: 'send', // 문서에 따른 API 코드
      dev_flag: 'N', // 상용환경
      // 실제 발송 데이터
      phone_number: phoneNumber.replace(/-/g, ''), // 하이픈 제거
      goods_code: cardId, // 상품 코드 (카드 ID)
      callback_no: phoneNumber.replace(/-/g, ''), // 회신번호
      send_message: '메가커피 교환권이 발송되었습니다.', // 발송 메시지
      user_template_no: '', // 사용자 템플릿 번호 (선택사항)
      supplement: '' // 부가정보 (선택사항)
    };

    console.log('기프트쇼 API 요청 데이터:', {
      ...requestData,
      custom_auth_token: '[HIDDEN]',
      phone_number: phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'RandomBox/1.0'
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json() as {
      result_code?: string | number;
      tr_id?: string;
      transaction_id?: string;
      result_message?: string;
    };
    console.log('기프트쇼 API 응답:', result);

    // 기프트쇼 API 응답 형식에 따른 성공/실패 판단
    if (result.result_code === '1' || result.result_code === 1) {
      return {
        success: true,
        transactionId: result.tr_id || result.transaction_id || `GS_${Date.now()}`,
        message: result.result_message || '메가커피 교환권이 성공적으로 발송되었습니다.'
      };
    } else {
      throw new Error(`API 오류 [${result.result_code}]: ${result.result_message || 'Unknown error'}`);
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
      phoneNumber: string;
    };

    if (!body.phoneNumber) {
      return new Response(
        JSON.stringify({ success: false, error: '휴대폰 번호가 필요합니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('메가커피 쿠폰 발송 시작:', {
      phoneNumber: body.phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    });

    // 기프트쇼 API 호출 (메가커피 교환권 발송)
    const giftShowResult = await callGiftShowAPI(
      body.phoneNumber,
      'MEGA_COFFEE_001', // 메가커피 상품 코드 고정
      context.env
    );

    if (!giftShowResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '메가커피 교환권 발송 중 오류가 발생했습니다.',
          details: giftShowResult.error
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: '메가커피 교환권이 성공적으로 발송되었습니다!',
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