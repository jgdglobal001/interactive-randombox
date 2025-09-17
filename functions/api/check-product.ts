// 기프트쇼 상품 정보 확인 API
export default {
  async fetch(request: Request, env: any): Promise<Response> {
    // CORS 헤더 설정
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    try {
      const authKey = env.GIFTSHOW_AUTH_KEY || 'REAL10f8dc85d32c4ff4b2594851a845c15f';
      const authToken = env.GIFTSHOW_AUTH_TOKEN || 'VUUiyDeKaWdeJYjlyGIuwQ==';
      const cardId = env.GIFTSHOW_CARD_ID || '202509120308350';

      console.log('상품 정보 조회 시작:', { cardId });

      // 기프트쇼 상품 상세 정보 조회 API 호출
      const requestData = {
        api_code: '0111',
        custom_auth_code: authKey,
        custom_auth_token: authToken,
        dev_yn: 'N'
      };

      const response = await fetch(`https://bizapi.giftishow.com/bizApi/goods/${cardId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(requestData).toString()
      });

      const result = await response.json() as {
        code?: string;
        message?: string;
        result?: {
          goodsDetail?: {
            goodsNo?: number;
            goodsCode?: string;
            goodsName?: string;
            brandCode?: string;
            brandName?: string;
            content?: string;
            salePrice?: number;
            discountPrice?: number;
            realPrice?: number;
            limitDay?: number;
            goodsImgS?: string;
            goodsImgB?: string;
            categoryName1?: string;
            goodsTypeCd?: string;
            goodsTypeNm?: string;
            affiliate?: string;
          };
        };
      };

      console.log('기프트쇼 상품 조회 응답:', result);

      if (result.code === '0000' && result.result?.goodsDetail) {
        const product = result.result.goodsDetail;
        
        return new Response(JSON.stringify({
          success: true,
          product: {
            goodsNo: product.goodsNo,
            goodsCode: product.goodsCode,
            goodsName: product.goodsName,
            brandName: product.brandName,
            content: product.content,
            salePrice: product.salePrice,
            discountPrice: product.discountPrice,
            realPrice: product.realPrice,
            limitDay: product.limitDay,
            goodsImgS: product.goodsImgS,
            goodsImgB: product.goodsImgB,
            categoryName1: product.categoryName1,
            goodsTypeNm: product.goodsTypeNm,
            affiliate: product.affiliate
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } else {
        return new Response(JSON.stringify({
          success: false,
          error: `상품 조회 실패 [${result.code}]: ${result.message || 'Unknown error'}`,
          cardId: cardId
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

    } catch (error) {
      console.error('상품 조회 에러:', error);
      return new Response(JSON.stringify({
        success: false,
        error: '상품 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};
