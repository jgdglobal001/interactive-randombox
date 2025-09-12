import { NextRequest, NextResponse } from 'next/server';
import { giftShowClient } from '@/lib/giftshow-client';

export const runtime = 'edge';

export async function GET() {
  try {
    const bannerInfo = await giftShowClient.getBannerInfo();

    if (!bannerInfo.success) {
      return NextResponse.json(
        {
          success: false,
          error: '배너 정보를 조회할 수 없습니다.',
          details: bannerInfo
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      banner: bannerInfo.data || bannerInfo
    });

  } catch (error) {
    console.error('Banner API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '배너 정보 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
