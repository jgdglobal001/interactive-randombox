import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ParticipateRequest {
  code: string;
}

interface ParticipateResponse {
  success: boolean;
  prize?: { name: string; imageUrl: string };
  participationCodeId?: string;
  error?: string;
}

// 메가커피 교환권 정보 (하드코딩)
const MEGA_COFFEE_PRIZE = {
  name: "메가커피 교환권",
  imageUrl: "/images/megacoffee.png"
};

// 가상의 메가커피 Prize ID (실제 DB에는 없지만 스키마 관계를 위해 필요)
const MEGA_COFFEE_PRIZE_ID = 'mega-coffee-virtual-id';

export async function POST(request: NextRequest) {
  try {
    const { code }: ParticipateRequest = await request.json();

    if (!code || code.trim() === '') {
      return NextResponse.json(
        { success: false, error: '참여 코드를 입력해주세요.' } as ParticipateResponse,
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. 참여 코드 조회 및 유효성 검사
      const participationCode = await tx.participationCode.findUnique({
        where: { code: code.trim() }
      });

      if (!participationCode) {
        return { error: '유효하지 않은 참여 코드입니다.' };
      }

      if (participationCode.isUsed) {
        return { error: '이미 사용된 참여 코드입니다.' };
      }

      // 2. 메가커피 Prize 생성 또는 조회
      let megaCoffeePrize = await tx.prize.findFirst({
        where: { name: MEGA_COFFEE_PRIZE.name }
      });

      if (!megaCoffeePrize) {
        // 메가커피 Prize가 없으면 생성
        megaCoffeePrize = await tx.prize.create({
          data: {
            name: MEGA_COFFEE_PRIZE.name,
            stock: 999999, // 무제한 수량
            probability: 1.0, // 100% 당첨
            giftshowGoodsCode: 'MEGA_COFFEE', // 기프트쇼 상품 코드
            imageUrl: MEGA_COFFEE_PRIZE.imageUrl
          }
        });
      }

      // 3. 참여 코드 사용 처리
      await tx.participationCode.update({
        where: { id: participationCode.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      });

      // 4. 당첨자 기록 생성 (메가커피 고정 당첨)
      await tx.winner.create({
        data: {
          participationCodeId: participationCode.id,
          prizeId: megaCoffeePrize.id,
          userPhoneNumber: '', // 나중에 claim 시 업데이트
          giftshowTrId: '', // 나중에 claim 시 업데이트
        },
      });

      return {
        success: true,
        prize: MEGA_COFFEE_PRIZE,
        participationCodeId: participationCode.id,
      };
    });

    if ('error' in result) {
      return NextResponse.json(
        { success: false, error: result.error } as ParticipateResponse,
        { status: 400 }
      );
    }
    
    return NextResponse.json(result as ParticipateResponse);

  } catch (error) {
    console.error('Participation error:', error);
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' } as ParticipateResponse,
      { status: 500 }
    );
  }
}
