// Cloudflare Pages Function for banner API
export async function onRequestGet({ request, env }: { request: Request; env: any }): Promise<Response> {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    console.log('Banner API 호출:', { action, url: request.url });

    // 상품 리스트 조회 기능 추가 (메가커피 상품 찾기)
    if (action === 'list-products') {
      const authKey = env.GIFTSHOW_AUTH_KEY || 'REAL10f8dc85d32c4ff4b2594851a845c15f';
      const authToken = env.GIFTSHOW_AUTH_TOKEN || 'VUUiyDeKaWdeJYjlyGIuwQ==';

      console.log('상품 리스트 조회 시작');

      const requestData = {
        api_code: '0101',
        custom_auth_code: authKey,
        custom_auth_token: authToken,
        dev_yn: 'N',
        start: '1',
        size: '100'  // 100개씩 조회
      };

      const response = await fetch('https://bizapi.giftishow.com/bizApi/goods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(requestData).toString()
      });

      const result = await response.json() as any;
      console.log('기프트쇼 상품 리스트 응답:', result);

      if (result.code === '0000' && result.result?.goodsList) {
        // 메가커피 관련 상품만 필터링
        const megaCoffeeProducts = result.result.goodsList.filter((product: any) =>
          product.goodsName?.includes('메가커피') ||
          product.brandName?.includes('메가커피') ||
          product.goodsName?.includes('MEGA') ||
          product.brandName?.includes('MEGA')
        );

        return new Response(JSON.stringify({
          success: true,
          totalProducts: result.result.listNum,
          megaCoffeeProducts: megaCoffeeProducts.map((product: any) => ({
            goodsNo: product.goodsNo,
            goodsCode: product.goodsCode,
            goodsName: product.goodsName,
            brandName: product.brandName,
            salePrice: product.salePrice,
            discountPrice: product.discountPrice,
            realPrice: product.realPrice,
            limitDay: product.limitDay,
            goodsImgS: product.goodsImgS,
            categoryName1: product.categoryName1,
            affiliate: product.affiliate
          }))
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify({
          success: false,
          error: `상품 리스트 조회 실패 [${result.code}]: ${result.message || 'Unknown error'}`
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 상품 정보 확인 기능 추가
    if (action === 'check-product') {
      const authKey = env.GIFTSHOW_AUTH_KEY || 'REAL10f8dc85d32c4ff4b2594851a845c15f';
      const authToken = env.GIFTSHOW_AUTH_TOKEN || 'VUUiyDeKaWdeJYjlyGIuwQ==';
      const cardId = env.GIFTSHOW_CARD_ID || '202509120308350';

      console.log('상품 정보 조회 시작:', { cardId });

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

      const result = await response.json() as any;
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
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify({
          success: false,
          error: `상품 조회 실패 [${result.code}]: ${result.message || 'Unknown error'}`,
          cardId: cardId
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 기본 배너 정보 반환
    const bannerData = {
      title: "Interactive Randombox Event",
      description: "참여하고 상품을 받아보세요!",
      imageUrl: "/images/banner.jpg",
      active: true
    };

    return new Response(
      JSON.stringify({ success: true, data: bannerData }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Banner API 에러:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'API 호출 실패', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}