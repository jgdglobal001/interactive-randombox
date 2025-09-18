// Cloudflare Pages Function for bulk codes upload API

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
  duplicates?: string[];
  created?: number;
}

interface ParticipationCode {
  id: string;
  code: string;
  isUsed: boolean;
  createdAt: string;
  usedAt: string | null;
}

// CUID 생성 함수 (Prisma와 동일한 방식)
function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `c${timestamp}${randomPart}`;
}

// 인증 확인 함수
function isAuthenticated(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  return authHeader === 'Bearer admin2024!';
}

// POST - 일괄 참여 코드 업로드
export const onRequestPost = async (context: Context): Promise<Response> => {
  try {
    console.log('=== POST /api/admin/codes/bulk 시작 ===');
    
    // 인증 확인
    if (!isAuthenticated(context.request)) {
      return new Response(
        JSON.stringify({ success: false, error: '인증이 필요합니다.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await context.request.json() as { codes: string[] };
    
    if (!body.codes || !Array.isArray(body.codes) || body.codes.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: '업로드할 코드가 없습니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 코드 수 제한 (최대 1000개)
    if (body.codes.length > 1000) {
      return new Response(
        JSON.stringify({ success: false, error: '한 번에 최대 1000개까지만 업로드 가능합니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 코드 유효성 검사 및 정리
    const cleanCodes = body.codes
      .map(code => code.trim())
      .filter(code => code.length > 0)
      .filter((code, index, arr) => arr.indexOf(code) === index); // 중복 제거

    if (cleanCodes.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: '유효한 코드가 없습니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`처리할 코드 수: ${cleanCodes.length}개`);

    // Neon Serverless Driver 사용
    const { neon, neonConfig } = await import('@neondatabase/serverless');
    neonConfig.webSocketConstructor = undefined;

    const sql = neon(context.env.DATABASE_URL!);

    // 기존 코드와 중복 체크
    const existingCodes = await sql`
      select code from "ParticipationCode" 
      where code = ANY(${cleanCodes})
    `;
    
    const existingCodeSet = new Set(existingCodes.map((row: any) => row.code));
    const duplicates = cleanCodes.filter(code => existingCodeSet.has(code));
    const newCodes = cleanCodes.filter(code => !existingCodeSet.has(code));

    console.log(`중복 코드: ${duplicates.length}개, 신규 코드: ${newCodes.length}개`);

    const createdCodes: ParticipationCode[] = [];

    // 신규 코드들을 DB에 삽입
    for (const code of newCodes) {
      try {
        const cuid = generateCuid();
        const rows = await sql`
          insert into "ParticipationCode" (id, code) 
          values (${cuid}, ${code}) 
          returning id, code, "isUsed", "createdAt", "usedAt"
        `;

        const row = rows[0];
        createdCodes.push({
          id: row.id,
          code: row.code,
          isUsed: row.isUsed,
          createdAt: (row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt)).toISOString(),
          usedAt: row.usedAt ? (row.usedAt instanceof Date ? row.usedAt : new Date(row.usedAt)).toISOString() : null,
        });
      } catch (error) {
        console.error(`코드 ${code} 삽입 실패:`, error);
      }
    }

    // 결과 메시지 생성
    let message = `${createdCodes.length}개의 코드가 성공적으로 업로드되었습니다.`;
    if (duplicates.length > 0) {
      message += ` (${duplicates.length}개 중복 코드 제외)`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        codes: createdCodes,
        message,
        duplicates,
        created: createdCodes.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('일괄 코드 업로드 실패:', error);
    return new Response(
      JSON.stringify({ success: false, error: '일괄 업로드에 실패했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
