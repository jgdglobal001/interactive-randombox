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
  // 메가커피 아메리카노 상품 코드 (환경변수 우선, 없으면 기본값 사용)
  const megaCoffeeGoodsCode = 'G00001621744'; // 메가커피 아메리카노 상품 코드 고정

  console.log('기프트쇼 API 호출 시작:', {
    phoneNumber: phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
    goodsCode: megaCoffeeGoodsCode,
    authKey: authKey.substring(0, 8) + '...'
  });

  try {
    // 기프트쇼 API 문서에 따른 HTTPS 통신
    // SSL 1.2, AES256/ECB/PKCS5Padding, Base64 Encoding 사용
    const apiUrl = 'https://bizapi.giftishow.com/bizApi/send'; // 문서의 정확한 엔드포인트

    // 고유한 TR_ID 생성 (20자 이하로 제한)
    const timestamp = Date.now().toString().slice(-8); // 마지막 8자리만 사용
    const randomStr = Math.random().toString(36).substr(2, 6); // 6자리 랜덤
    const trId = `rb_${timestamp}_${randomStr}`; // rb_12345678_abc123 (20자 이하)

    const requestData = {
      api_code: '0204', // 쿠폰발송요청 API 코드
      custom_auth_code: authKey,
      custom_auth_token: authToken,
      dev_yn: 'N', // 테스트여부 설정 값 (N 입력)
      goods_code: megaCoffeeGoodsCode, // 메가커피 아메리카노 상품코드
      mms_msg: '메가커피 교환권이 발송되었습니다.', // MMS메시지
      mms_title: '메가커피', // MMS제목 (10자 이하)
      callback_no: phoneNumber.replace(/-/g, ''), // 발신번호
      phone_no: phoneNumber.replace(/-/g, ''), // 수신번호
      tr_id: trId, // 거래아이디 (Unique한 ID)
      user_id: 'jsyglobal', // 실제 기프트쇼 비즈 회원 ID (인증키와 연결된 계정)
      gubun: 'N' // MMS발송 구분자 (N: MMS)
    };

    console.log('기프트쇼 API 요청 데이터:', {
      ...requestData,
      custom_auth_token: '[HIDDEN]',
      phone_no: phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded', // 문서 명시: application/x-www-form-urlencoded
      },
      body: new URLSearchParams(requestData).toString() // form-urlencoded 형식으로 전송
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json() as {
      code?: string;
      message?: string;
      result?: {
        code?: string;
        message?: string;
        result?: {
          orderNo?: string;
          pinNo?: string;
        };
      };
    };
    console.log('기프트쇼 API 응답:', result);

    // 기프트쇼 API 응답 형식에 따른 성공/실패 판단 (문서 기준: code "0000"이 성공)
    if (result.code === '0000') {
      return {
        success: true,
        transactionId: result.result?.result?.orderNo || trId,
        message: '메가커피 교환권이 성공적으로 발송되었습니다.',
        orderNo: result.result?.result?.orderNo,
        pinNo: result.result?.result?.pinNo
      };
    } else {
      throw new Error(`API 오류 [${result.code}]: ${result.message || 'Unknown error'}`);
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
      'G00001621744', // 메가커피 아메리카노 상품 코드 고정
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