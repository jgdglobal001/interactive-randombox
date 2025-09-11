import { NextRequest, NextResponse } from 'next/server';
import { giftShowClient, mockGiftShowAPI, GIFTSHOW_CONFIG } from '@/lib/giftshow-client';

interface ClaimRequest {
  participationCodeId: string;
  phoneNumber: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ClaimRequest;
    const { participationCodeId, phoneNumber } = body;

    if (!participationCodeId || !phoneNumber) {
      return NextResponse.json(
        {
          success: false,
          error: '참여 코드 ID와 휴대폰 번호가 필요합니다.'
        },
        { status: 400 }
      );
    }

    // 전화번호 형식 검증 및 정규화
    const cleanPhoneNumber = phoneNumber.replace(/[^0-9]/g, ''); // 숫자만 추출

    if (cleanPhoneNumber.length !== 11 || !cleanPhoneNumber.startsWith('010')) {
      return NextResponse.json(
        {
          success: false,
          error: '올바른 휴대폰 번호 형식을 입력해주세요. (예: 01012345678)'
        },
        { status: 400 }
      );
    }

    // 기프트 쇼 API를 통해 MMS 발송
    // 실제로는 당첨된 상품에 따라 다른 메시지를 보내야 합니다
    const message = `🎉 축하드립니다! [브랜드명] 이벤트에 당첨되셨습니다.
상품 수령을 위해 본 메시지를 확인해주세요.

참여코드: ${participationCodeId}
수령기한: 30일 이내`;

    let mmsResult;
    try {
      // 개발 환경에서는 모의 API 사용
      if (GIFTSHOW_CONFIG.USE_MOCK_API) {
        console.log('Using mock API for MMS sending');
        mmsResult = await mockGiftShowAPI.sendMMS(cleanPhoneNumber, message);
      } else {
        mmsResult = await giftShowClient.sendMMS(cleanPhoneNumber, message);
      }
      console.log('MMS send result:', mmsResult);
    } catch (mmsError) {
      console.error('MMS sending failed:', mmsError);
      // MMS 발송 실패 시에도 사용자에게는 성공으로 보이게 함 (디버깅 목적)
      mmsResult = {
        success: false,
        error: 'MMS 발송 실패',
        details: mmsError instanceof Error ? mmsError.message : 'Unknown MMS error'
      };
    }

    // MMS 발송 실패 시에도 상품 수령 성공으로 처리 (실제 운영에서는 재시도 로직 필요)
    if (!mmsResult.success) {
      console.warn('MMS sending failed, but proceeding with claim:', mmsResult);
    }

    return NextResponse.json({
      success: true,
      message: '상품이 성공적으로 발송되었습니다. 휴대폰 메시지를 확인해주세요!',
      mmsResult // 디버깅용
    });

  } catch (error) {
    console.error('Claim API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '상품 수령 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
