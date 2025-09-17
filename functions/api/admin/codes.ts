// Cloudflare Pages Function for admin codes API

// Cloudflare Pages Function 환경 타입
interface Env {
  ADMIN_SECRET_KEY?: string;
  DATABASE_URL?: string;
  PRISMA_ACCELERATE_URL?: string;
}

// Cloudflare Pages Function 컨텍스트
interface Context {
  request: Request;
  env: Env;
  params: Record<string, string>;
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

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
    console.log('=== Cloudflare Pages Function 시작 ===');
    console.log('1. Admin API 접근 시도...');
    console.log('2. 환경변수 확인:', {
      DATABASE_URL: context.env.DATABASE_URL ? 'SET' : 'NOT_SET',
      ADMIN_SECRET_KEY: context.env.ADMIN_SECRET_KEY ? 'SET' : 'NOT_SET',
      PRISMA_ACCELERATE_URL: context.env.PRISMA_ACCELERATE_URL ? 'SET' : 'NOT_SET'
    });
    
    // 환경변수 기반 인증 체크
    console.log('3. 인증 헤더 확인 중...');
    const authHeader = context.request.headers.get('authorization');
    const expectedAuth = context.env.ADMIN_SECRET_KEY || 'admin2024!';
    console.log('4. Auth header:', authHeader ? 'EXISTS' : 'MISSING');
    console.log('5. Expected auth:', expectedAuth ? 'EXISTS' : 'MISSING');
    
    if (authHeader !== `Bearer ${expectedAuth}`) {
      console.log('6. 인증 실패: auth header =', authHeader);
      return new Response(
        JSON.stringify({ success: false, error: '로그인이 필요합니다.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('7. 인증 성공 - Prisma 클라이언트 초기화...');
    
    // DATABASE_URL 확인
    if (!context.env.DATABASE_URL) {
      console.error('8. DATABASE_URL이 설정되지 않았습니다!');
      return new Response(
        JSON.stringify({ success: false, error: 'DATABASE_URL이 설정되지 않았습니다.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('9. DATABASE_URL 확인됨, Prisma 클라이언트 생성...');

    // Cloudflare Pages Edge Runtime에서 Neon Serverless Driver 사용
    const { PrismaClient } = await import('@prisma/client/edge');
    const { PrismaNeon } = await import('@prisma/adapter-neon');
    const { neonConfig } = await import('@neondatabase/serverless');

    // WebSocket 비활성화 (Cloudflare Pages에서 필요)
    neonConfig.webSocketConstructor = undefined;

    const adapter = new PrismaNeon({ connectionString: context.env.DATABASE_URL });
    const prisma = new PrismaClient({ adapter });
    
    console.log('10. Prisma 클라이언트 생성 완료, 데이터베이스 연결 시도...');
    
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
    const formattedCodes = codes.map((code: any) => ({
      ...code,
      createdAt: code.createdAt.toISOString(),
      usedAt: code.usedAt?.toISOString() || null,
    }));
    console.log('13. 날짜 포맷팅 완료');

    console.log('14. 응답 반환 준비...');
    const response = new Response(
      JSON.stringify({
        success: true,
        codes: formattedCodes,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log('15. 응답 반환 성공');
    
    // Prisma 연결 정리
    await prisma.$disconnect();
    console.log('16. Prisma 연결 해제 완료');
    
    return response;

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
    console.log('=== POST /api/admin/codes 시작 ===');
    
    const body = await context.request.json() as { count?: number };
    const count = body.count || 1;

    // 생성할 코드 수 제한 (최대 100개)
    if (count < 1 || count > 100) {
      return new Response(
        JSON.stringify({ success: false, error: '생성할 코드 수는 1개에서 100개 사이여야 합니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Prisma 클라이언트 동적 생성
    const { PrismaClient } = await import('@prisma/client/edge');
    const { PrismaNeon } = await import('@prisma/adapter-neon');
    const { neonConfig } = await import('@neondatabase/serverless');

    // WebSocket 비활성화 (Cloudflare Pages에서 필요)
    neonConfig.webSocketConstructor = undefined;

    const adapter = new PrismaNeon({ connectionString: context.env.DATABASE_URL });
    const prisma = new PrismaClient({ adapter });

    const newCodes: ParticipationCode[] = [];

    // 트랜잭션으로 여러 코드 생성
    await prisma.$transaction(async (tx: any) => {
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

    // Prisma 연결 정리
    await prisma.$disconnect();

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