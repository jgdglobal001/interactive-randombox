import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { giftShowClient } from '@/lib/giftshow-client';

const prisma = new PrismaClient();

interface ClaimRequest {
  participationCodeId: string;
  phoneNumber: string;
}

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { participationCodeId, phoneNumber }: ClaimRequest = await request.json();

    if (!participationCodeId || !phoneNumber) {
      return NextResponse.json({ error: '참여 코드와 휴대폰 번호가 필요합니다.' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const participationCode = await tx.participationCode.findUnique({
        where: { id: participationCodeId },
        include: { winner: { include: { prize: true } } },
      });

      if (!participationCode || !participationCode.winner?.prize) {
        return { error: '유효하지 않은 참여 코드입니다.' };
      }

      const existingWinner = participationCode.winner;

      if (existingWinner.giftshowTrId) {
        return { error: '이미 상품을 수령했습니다.' };
      }

      const winner = existingWinner.id ? await tx.winner.update({
        where: { id: existingWinner.id },
        data: { userPhoneNumber: phoneNumber },
        include: { prize: true },
      }) : await tx.winner.create({
        data: {
          participationCodeId: participationCodeId,
          prizeId: participationCode.winner.prize.id,
          userPhoneNumber: phoneNumber,
        },
        include: { prize: true },
      });

      // 기프트쇼 API 호출
      const giftShowResult = await giftShowClient.sendGiftCard(phoneNumber);

      if (!giftShowResult.success) {
        return { error: '기프트카드 발송에 실패했습니다.' };
      }

      await tx.winner.update({
        where: { id: winner.id },
        data: {
          giftshowTrId: giftShowResult.transactionId || 'MOCK_TR_ID',
          sentAt: new Date(),
        },
      });

      return { success: true, message: '상품이 성공적으로 발송되었습니다.' };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Claim error:', error);
    return NextResponse.json({ error: '상품 수령 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
