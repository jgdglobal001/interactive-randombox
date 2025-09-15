// Cloudflare Pages Function for banner API
export async function onRequestGet(): Promise<Response> {
  try {
    // 배너 정보 반환
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
      JSON.stringify({ success: false, error: '배너 정보를 불러오는 데 실패했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}