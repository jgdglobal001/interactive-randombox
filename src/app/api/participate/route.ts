import { NextRequest, NextResponse } from 'next/server';
import { giftShowClient, mockGiftShowAPI, GIFTSHOW_CONFIG } from '@/lib/giftshow-client';

export const runtime = 'edge';

interface ParticipateRequest {
  code: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ParticipateRequest;
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: '참여 코드가 필요합니다.' },
        { status: 400 }
      );
    }

    // 기프트 쇼 API를 통해 상품 정보 조회
    // 실제 구현에서는 참여 코드를 기반으로 상품 정보를 조회하는 로직이 필요합니다
    // 여기서는 임시로 카드 정보를 조회하는 예시를 사용합니다

    let cardInfo;
    try {
      // 개발 환경에서는 모의 API 사용
      if (GIFTSHOW_CONFIG.USE_MOCK_API) {
        console.log('Using mock API for development');
        cardInfo = await mockGiftShowAPI.getCardInfo();
      } else {
        cardInfo = await giftShowClient.getCardInfo();
      }
      console.log('Card info response:', cardInfo);
    } catch (apiError) {
      console.error('Gift Show API call failed:', apiError);
      // API 호출 실패 시에도 이벤트 참여는 진행하되, 디버깅 정보를 포함
      cardInfo = {
        success: false,
        error: 'API 호출 실패',
        details: apiError instanceof Error ? apiError.message : 'Unknown API error'
      };
    }

    // API 호출 실패 시에도 이벤트는 진행 (디버깅 목적)
    if (!cardInfo.success) {
      console.warn('Gift Show API failed, but continuing with mock data:', cardInfo);
    }

    // 상품 정보를 기반으로 당첨 상품 결정
    // 실제 구현에서는 랜덤 로직이나 룰렛 로직을 적용해야 합니다
    const prizes = [
      {
        id: 'galaxy-folder',
        name: '갤럭시 폴더7',
        imageUrl: '/images/GalaxyFolder7.png'
      },
      {
        id: 'cuckoo-food',
        name: '쿠쿠 음식물처리기',
        imageUrl: '/images/CuckooFood DisposalMachine.png'
      },
      {
        id: 'canon-multifunction',
        name: '캐논복합기',
        imageUrl: '/images/Canon-multifunction-device.png'
      },
      {
        id: 'shinsegae-gift',
        name: '신세계상품권 5만원권',
        imageUrl: '/images/Shinsegae-gift-certificate.png'
      },
      {
        id: 'megacoffee',
        name: '메가커피 교환권',
        imageUrl: '/images/megacoffee.png'
      }
    ];

    // 메가커피 상품 고정 선택 (테스트용)
    const randomPrize = prizes.find(prize => prize.id === 'megacoffee') || prizes[4];

    return NextResponse.json({
      success: true,
      prize: randomPrize,
      participationCodeId: `PART_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      cardInfo // 디버깅용
    });

  } catch (error) {
    console.error('Participation API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '이벤트 참여 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
