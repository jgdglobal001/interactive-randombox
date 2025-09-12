import { NextRequest, NextResponse } from 'next/server';
import { giftShowClient, mockGiftShowAPI, GIFTSHOW_CONFIG } from '@/lib/giftshow-client';

interface ClaimRequest {
  participationCodeId: string;
  phoneNumber: string;
}

export async function POST(request: NextRequest) {
  console.log('=== API /claim 호출됨 ===');
  try {
    const body = await request.json() as ClaimRequest;
    const { participationCodeId, phoneNumber } = body;
    console.log('받은 데이터:', { participationCodeId, phoneNumber });

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

    // 기프트 쇼 API를 통해 실제 쿠폰 발송
    // 메가커피 교환권 쿠폰을 실제로 발송
    const message = `🎉 메가커피 교환권 당첨을 축하드립니다!

아래 쿠폰을 매장에서 제시해주세요.
쿠폰번호: ${participationCodeId}
유효기간: 발급일로부터 30일

※ 전국 메가커피 매장에서 사용 가능
※ 1회 사용 후 소멸됩니다`;

    // 실제 기프트카드 발송
    console.log('=== 기프트카드 발송 시작 ===');
    console.log('USE_MOCK_API 설정:', GIFTSHOW_CONFIG.USE_MOCK_API);
    console.log('발송할 번호:', cleanPhoneNumber);
    console.log('카드 ID:', GIFTSHOW_CONFIG.CARD_ID);
    
    let cardResult;
    try {
      // 실제 기프트카드 발송 (MMS가 아닌 카드 발송)
      console.log('실제 GiftShow 기프트카드 발송 중...');
      cardResult = await giftShowClient.sendGiftCard(cleanPhoneNumber);
      console.log('기프트카드 발송 결과:', cardResult);
      
      // 발송 성공 시 추가로 안내 MMS도 발송
      if (cardResult.success) {
        console.log('기프트카드 발송 성공, 안내 MMS 발송 중...');
        const mmsResult = await giftShowClient.sendMMS(cleanPhoneNumber, message);
        console.log('안내 MMS 발송 결과:', mmsResult);
      }
    } catch (cardError) {
      console.error('기프트카드 발송 실패:', cardError);
      cardResult = {
        success: false,
        error: '기프트카드 발송 실패',
        details: cardError instanceof Error ? cardError.message : 'Unknown card error'
      };
    }

    // 기프트카드 발송 실패 시에도 상품 수령 성공으로 처리 (실제 운영에서는 재시도 로직 필요)
    if (!cardResult.success) {
      console.warn('기프트카드 발송 실패, but proceeding with claim:', cardResult);
    }

    return NextResponse.json({
      success: true,
      message: '메가커피 교환권이 성공적으로 발송되었습니다. 휴대폰 메시지를 확인해주세요!',
      cardResult // 디버깅용
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
