import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// API 응답 타입 정의
interface ApiResponse {
  success: boolean;
  codes?: ParticipationCode[];
  message?: string;
  error?: string;
}

interface ParticipationCode {
  id: string;
  code: string;
  isUsed: boolean;
  createdAt: string;
  usedAt: string | null;
}

interface CreateCodeRequest {
  count?: number;
}

// 고유한 참여 코드 생성 함수
function generateUniqueCode(): string {
  return `EVENT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

// GET /api/admin/codes - 참여 코드 목록 조회
export async function GET(request: NextRequest) {
  try {
    const codes = await prisma.participationCode.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        isUsed: true,
        createdAt: true,
        usedAt: true,
      },
    });

    // 날짜를 문자열로 변환
    const formattedCodes = codes.map(code => ({
      ...code,
      createdAt: code.createdAt.toISOString(),
      usedAt: code.usedAt?.toISOString() || null,
    }));

    return NextResponse.json({
      success: true,
      codes: formattedCodes,
    } as ApiResponse);

  } catch (error) {
    console.error('Failed to fetch participation codes:', error);
    return NextResponse.json(
      { success: false, error: '코드 목록을 불러오는 데 실패했습니다.' } as ApiResponse,
      { status: 500 }
    );
  }
}

// POST /api/admin/codes - 새로운 참여 코드 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateCodeRequest;
    const count = body.count || 1;

    // 생성할 코드 수 제한 (최대 100개)
    if (count < 1 || count > 100) {
      return NextResponse.json(
        { success: false, error: '생성할 코드 수는 1개에서 100개 사이여야 합니다.' } as ApiResponse,
        { status: 400 }
      );
    }

    const newCodes: ParticipationCode[] = [];

    // 트랜잭션으로 여러 코드 생성
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < count; i++) {
        let attempts = 0;
        let uniqueCode = '';
        
        // 중복되지 않는 코드 생성 (최대 10번 시도)
        while (attempts < 10) {
          uniqueCode = generateUniqueCode();
          
          const existingCode = await tx.participationCode.findUnique({
            where: { code: uniqueCode },
          });
          
          if (!existingCode) {
            break;
          }
          
          attempts++;
        }

        if (attempts >= 10) {
          throw new Error('고유한 코드 생성에 실패했습니다.');
        }

        const newCode = await tx.participationCode.create({
          data: {
            code: uniqueCode,
          },
          select: {
            id: true,
            code: true,
            isUsed: true,
            createdAt: true,
            usedAt: true,
          },
        });

        newCodes.push({
          ...newCode,
          createdAt: newCode.createdAt.toISOString(),
          usedAt: newCode.usedAt?.toISOString() || null,
        });
      }
    });

    return NextResponse.json({
      success: true,
      codes: newCodes,
      message: `${count}개의 참여 코드가 생성되었습니다.`,
    } as ApiResponse);

  } catch (error) {
    console.error('Failed to create participation codes:', error);
    return NextResponse.json(
      { success: false, error: '코드 생성에 실패했습니다.' } as ApiResponse,
      { status: 500 }
    );
  }
}