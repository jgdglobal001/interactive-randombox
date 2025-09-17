// 메가커피 아이스 아메리카노 상품 코드 찾기 API

interface Env {
  GIFTSHOW_AUTH_KEY?: string;
  GIFTSHOW_AUTH_TOKEN?: string;
}

interface Context {
  request: Request;
  env: Env;
  params: Record<string, string>;
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

interface GiftShowProduct {
  goodsCode: string;
  goodsName: string;
  brandName: string;
  discountPrice: string;
  salePrice: string;
  limitDay: number;
  goodsImgS: string;
  content: string;
}

interface GiftShowResponse {
  code: string;
  message: string | null;
  result: {
    listNum: number;
    goodsList: GiftShowProduct[];
  };
}

export async function onRequestPost(context: Context): Promise<Response> {
  try {
    const authKey = context.env.GIFTSHOW_AUTH_KEY || 'REAL10f8dc85d32c4ff4b2594851a845c15f';
    const authToken = context.env.GIFTSHOW_AUTH_TOKEN || 'VUUiyDeKaWdeJYjlyGIuwQ==';

    console.log('메가커피 상품 검색 시작...');

    // 기프트쇼 상품 리스트 API 호출
    const requestData = {
      api_code: '0101', // 상품 리스트 API 코드
      custom_auth_code: authKey,
      custom_auth_token: authToken,
      dev_yn: 'N', // 상용환경
      start: '1', // 시작 페이지
      size: '100' // 한 번에 100개씩 조회
    };

    const response = await fetch('https://bizapi.giftishow.com/bizApi/goods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(requestData).toString()
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json() as GiftShowResponse;
    console.log('기프트쇼 상품 리스트 응답:', {
      code: result.code,
      listNum: result.result?.listNum,
      totalProducts: result.result?.goodsList?.length
    });

    if (result.code !== '0000') {
      throw new Error(`API 오류 [${result.code}]: ${result.message}`);
    }

    // 메가커피 관련 상품 필터링
    const megaCoffeeProducts = result.result.goodsList.filter(product => 
      product.brandName?.includes('메가커피') || 
      product.goodsName?.includes('메가커피') ||
      product.brandName?.includes('MEGA') ||
      product.goodsName?.includes('MEGA')
    );

    console.log(`메가커피 관련 상품 ${megaCoffeeProducts.length}개 발견`);

    // 아이스 아메리카노 찾기
    const icedAmericano = megaCoffeeProducts.filter(product =>
      (product.goodsName?.includes('아이스') && product.goodsName?.includes('아메리카노')) ||
      (product.goodsName?.includes('ICE') && product.goodsName?.includes('AMERICANO')) ||
      product.goodsName?.includes('아이스아메리카노')
    );

    console.log(`아이스 아메리카노 상품 ${icedAmericano.length}개 발견`);

    // 일반 아메리카노도 포함해서 검색
    const americanoProducts = megaCoffeeProducts.filter(product =>
      product.goodsName?.includes('아메리카노') ||
      product.goodsName?.includes('AMERICANO')
    );

    return new Response(
      JSON.stringify({
        success: true,
        megaCoffeeProducts: megaCoffeeProducts.map(p => ({
          goodsCode: p.goodsCode,
          goodsName: p.goodsName,
          brandName: p.brandName,
          discountPrice: p.discountPrice,
          salePrice: p.salePrice,
          limitDay: p.limitDay
        })),
        icedAmericano: icedAmericano.map(p => ({
          goodsCode: p.goodsCode,
          goodsName: p.goodsName,
          brandName: p.brandName,
          discountPrice: p.discountPrice,
          salePrice: p.salePrice,
          limitDay: p.limitDay
        })),
        americanoProducts: americanoProducts.map(p => ({
          goodsCode: p.goodsCode,
          goodsName: p.goodsName,
          brandName: p.brandName,
          discountPrice: p.discountPrice,
          salePrice: p.salePrice,
          limitDay: p.limitDay
        })),
        totalProducts: result.result.listNum,
        searchedProducts: result.result.goodsList.length
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('메가커피 상품 검색 에러:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : '상품 검색 실패' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
