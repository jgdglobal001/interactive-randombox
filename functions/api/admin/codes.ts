// Cloudflare Pages Function for admin codes API
import { PrismaClient } from '@prisma/client';

// Cloudflare Pages Function 환경 타입
interface Env {
  ADMIN_SECRET_KEY?: string;
  DATABASE_URL?: string;
}

// Cloudflare Pages Function 컨텍스트
interface Context {
  request: Request;
  env: Env;
  params: Record<string, string>;
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

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

// 고유한 참여 코드 생성 함수
function generateUniqueCode(): string {
  return `EVENT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

// GET - 참여 코드 목록 조회
export const onRequestGet = async (context: Context): Promise<Response> => {
  try {
    console.log('Admin API 접근 시도...');
    
    // 환경변수 기반 인증 체크
    const authHeader = context.request.headers.get('authorization');
    const expectedAuth = context.env.ADMIN_SECRET_KEY || 'admin2024!';
    
    if (authHeader !== `Bearer ${expectedAuth}`) {
      console.log('인증 실패: auth header =', authHeader);
      return new Response(
        JSON.stringify({ success: false, error: '로그인이 필요합니다.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('데이터베이스 연결 시도...');
    
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
    
    console.log('코드 조회 성공:', codes.length, '개');

    // 날짜를 문자열로 변환
    const formattedCodes = codes.map(code => ({
      ...code,
      createdAt: code.createdAt.toISOString(),
      usedAt: code.usedAt?.toISOString() || null,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        codes: formattedCodes,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin API 에러:', error);
    return new Response(
      JSON.stringify({ success: false, error: '코드 목록을 불러오는 데 실패했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST - 새로운 참여 코드 생성
export const onRequestPost = async (context: Context): Promise<Response> => {
  try {
    const body = await context.request.json() as { count?: number };
    const count = body.count || 1;

    // 생성할 코드 수 제한 (최대 100개)
    if (count < 1 || count > 100) {
      return new Response(
        JSON.stringify({ success: false, error: '생성할 코드 수는 1개에서 100개 사이여야 합니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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

    return new Response(
      JSON.stringify({
        success: true,
        codes: newCodes,
        message: `${count}개의 참여 코드가 생성되었습니다.`,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Failed to create participation codes:', error);
    return new Response(
      JSON.stringify({ success: false, error: '코드 생성에 실패했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};