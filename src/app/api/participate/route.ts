import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ParticipateRequest {
  code: string;
}

export async function POST(request: NextRequest) {
  try {
    const { code }: ParticipateRequest = await request.json();

    const TEMP_TEST_CODE = 'TEST123';

    if (code !== TEMP_TEST_CODE) {
      return NextResponse.json({ error: '유효하지 않은 참여 코드입니다.' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      let participationCode = await tx.participationCode.findUnique({
        where: { code: TEMP_TEST_CODE }
      });

      if (!participationCode) {
        participationCode = await tx.participationCode.create({
          data: {
            code: TEMP_TEST_CODE,
            isUsed: true,
            usedAt: new Date(),
          },
        });
      }

      // 경품 추첨
      const prizes = await tx.prize.findMany({ where: { stock: { gt: 0 } } });
      if (prizes.length === 0) {
        return { error: '모든 경품이 소진되었습니다.' };
      }

      const prize = prizes[Math.floor(Math.random() * prizes.length)];

      await tx.prize.update({
        where: { id: prize.id },
        data: { stock: { decrement: 1 } },
      });

      await tx.winner.create({
        data: {
          participationCodeId: participationCode.id,
          prizeId: prize.id,
        },
      });

      return {
        success: true,
        prize: { id: prize.id, name: prize.name, imageUrl: prize.imageUrl },
        participationCodeId: participationCode.id,
      };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Participation error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
