import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// API 응답 타입 정의
interface ApiResponse {
  success: boolean;
  codes?: ParticipationCode[];
  message?: string;
  error?: string;
  details?: string;
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
  console.log('=== GET /api/admin/codes 시작 ===');
  
  try {
    console.log('1. Admin API 접근 시도...');
    console.log('2. Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
      ADMIN_SECRET_KEY: process.env.ADMIN_SECRET_KEY ? 'SET' : 'NOT_SET'
    });
    
    // 환경변수 기반 인증 체크
    console.log('3. 인증 헤더 확인 중...');
    const authHeader = request.headers.get('authorization');
    const expectedAuth = process.env.ADMIN_SECRET_KEY || 'admin2024!';
    console.log('4. Auth header:', authHeader);
    console.log('5. Expected auth:', expectedAuth);
    
    if (authHeader !== `Bearer ${expectedAuth}`) {
      console.log('6. 인증 실패: auth header =', authHeader);
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' } as ApiResponse,
        { status: 401 }
      );
    }
    
    console.log('7. 인증 성공 - 데이터베이스 연결 시도...');
    
    // Prisma Client 연결 테스트
    console.log('8. Prisma $connect 시도...');
    await prisma.$connect();
    console.log('9. Prisma 연결 성공');
    
    console.log('10. participationCode.findMany 시도...');
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
    
    console.log('11. 코드 조회 성공:', codes.length, '개');

    // 날짜를 문자열로 변환
    console.log('12. 날짜 포맷팅 시작...');
    const formattedCodes = codes.map(code => ({
      ...code,
      createdAt: code.createdAt.toISOString(),
      usedAt: code.usedAt?.toISOString() || null,
    }));
    console.log('13. 날짜 포맷팅 완료');

    console.log('14. 응답 반환 준비...');
    const response = NextResponse.json({
      success: true,
      codes: formattedCodes,
    } as ApiResponse);
    console.log('15. 응답 반환 성공');
    return response;

  } catch (error) {
    console.error('=== ERROR in GET /api/admin/codes ===');
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : undefined);
    console.error('Error details:', error);
    
    // 더 상세한 에러 정보 로깅
    if (error instanceof Error) {
      console.error('Error constructor:', error.constructor.name);
      console.error('Error toString:', error.toString());
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: '코드 목록을 불러오는 데 실패했습니다.', 
        details: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error
      } as ApiResponse,
      { status: 500 }
    );
  } finally {
    console.log('16. Prisma disconnect 시도...');
    try {
      await prisma.$disconnect();
      console.log('17. Prisma disconnect 성공');
    } catch (disconnectError) {
      console.error('Prisma disconnect 에러:', disconnectError);
    }
    console.log('=== GET /api/admin/codes 종료 ===');
  }
}

// POST /api/admin/codes - 새로운 참여 코드 생성
export async function POST(request: NextRequest) {
  console.log('=== POST /api/admin/codes 시작 ===');
  
  try {
    console.log('1. POST API 시작...');
    
    // 환경변수 기반 인증 체크
    console.log('2. POST 인증 헤더 확인 중...');
    const authHeader = request.headers.get('authorization');
    const expectedAuth = process.env.ADMIN_SECRET_KEY || 'admin2024!';
    console.log('3. POST Auth header:', authHeader);
    console.log('4. POST Expected auth:', expectedAuth);
    
    if (authHeader !== `Bearer ${expectedAuth}`) {
      console.log('5. POST 인증 실패: auth header =', authHeader);
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' } as ApiResponse,
        { status: 401 }
      );
    }
    
    console.log('6. POST 인증 성공 - request body 파싱...');
    const body = await request.json() as CreateCodeRequest;
    console.log('7. POST body 파싱 성공:', body);
    const count = body.count || 1;
    console.log('8. 생성할 코드 수:', count);

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