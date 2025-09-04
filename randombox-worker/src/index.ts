import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'

// Prize 타입 정의
interface Prize {
  id: string;
  name: string;
  stock: number;
  probability: number;
  giftshowGoodsCode: string;
  imageUrl: string;
}

// Hono 앱 인스턴스 생성
const app = new Hono()

// PrismaClient 인스턴스 생성 (Cloudflare Workers 환경용)
// D1 또는 Neon DB 바인딩은 wrangler.toml에서 설정해야 합니다.
// 여기서는 `withAccelerate`를 사용하여 Prisma Data Proxy를 통해 연결합니다.
// .env 파일의 DATABASE_URL이 Prisma Data Proxy URL이어야 합니다.
const prisma = new PrismaClient().$extends(withAccelerate())

// 경품 추첨 함수
async function drawPrize() {
  const prizes = await prisma.prize.findMany({ where: { stock: { gt: 0 } } })
  if (prizes.length === 0) {
    return null // 모든 경품 재고 소진
  }

  const totalProbability = prizes.reduce((sum: number, p: Prize) => sum + p.probability, 0)
  let randomPoint = Math.random() * totalProbability

  for (const prize of prizes) {
    if (randomPoint < prize.probability) {
      return prize
    }
    randomPoint -= prize.probability
  }

  return prizes[prizes.length - 1] // Fallback
}

// 이벤트 참여 API
app.post('/participate', async (c) => {
  try {
    const { code } = await c.req.json()

    if (!code) {
      return c.json({ error: '참여 코드가 필요합니다.' }, 400)
    }

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. 참여 코드 조회 및 유효성 검사
      const participationCode = await tx.participationCode.findUnique({
        where: { code },
      })

      if (!participationCode) {
        return { error: '유효하지 않은 참여 코드입니다.' }
      }
      if (participationCode.isUsed) {
        return { error: '이미 사용된 참여 코드입니다.' }
      }

      // 2. 경품 추첨
      const prize = await drawPrize()
      if (!prize) {
        return { error: '모든 경품이 소진되었습니다.' }
      }

      // 3. 당첨자 정보 생성 및 참여 코드 사용 처리
      const winner = await tx.winner.create({
        data: {
          prizeId: prize.id,
          participationCodeId: participationCode.id,
          userPhoneNumber: "", // 초기값 설정 - claim 시 업데이트
          giftshowTrId: "" // 초기값 설정 - claim 시 업데이트
        },
      })

      await tx.participationCode.update({
        where: { id: participationCode.id },
        data: { isUsed: true, usedAt: new Date() },
      })
      
      // 4. 경품 재고 감소
      await tx.prize.update({
        where: { id: prize.id },
        data: { stock: { decrement: 1 } },
      })

      return {
        success: true,
        prize: { id: prize.id, name: prize.name, imageUrl: prize.imageUrl },
        winnerId: winner.id,
      }
    })

    if (result.error) {
      return c.json({ error: result.error }, 400)
    }
    
    return c.json(result)

  } catch (error) {
    console.error('Participation error:', error)
    return c.json({ error: '서버 오류가 발생했습니다.' }, 500)
  }
})

// 기프트쇼 API 연동 모의 함수
// 실제 API 키와 엔드포인트는 환경 변수 또는 Workers Secrets으로 관리해야 합니다.
async function callGiftShowAPI(phoneNumber: string, prizeCode: string) {
  console.log(`기프트쇼 API 호출: ${phoneNumber}에게 ${prizeCode} 상품 발송 시도...`)
  // 실제 API 연동 로직...
  // 성공했다고 가정하고, 모의 거래 ID 반환
  await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 딜레이
  return { success: true, transactionId: `GIFT_${Date.now()}` }
}

// 당첨 상품 수령 API
app.post('/claim', async (c) => {
  try {
    const { winnerId, phoneNumber } = await c.req.json()

    if (!winnerId || !phoneNumber) {
      return c.json({ error: '당첨자 ID와 휴대폰 번호가 필요합니다.' }, 400)
    }

    const winner = await prisma.winner.findUnique({
      where: { id: winnerId },
      include: { prize: true },
    })

    if (!winner) {
      return c.json({ error: '유효하지 않은 당첨자 정보입니다.' }, 404)
    }
    if (winner.giftshowTrId) {
      return c.json({ error: '이미 상품을 수령했습니다.' }, 400)
    }

    // 기프트쇼 API 호출 (모의)
    const giftShowResult = await callGiftShowAPI(phoneNumber, winner.prize.giftshowGoodsCode)

    if (!giftShowResult.success) {
      return c.json({ error: '기프트쇼 API 연동 중 오류가 발생했습니다.' }, 500)
    }

    // 당첨자 정보 업데이트
    await prisma.winner.update({
      where: { id: winnerId },
      data: {
        userPhoneNumber: phoneNumber,
        giftshowTrId: giftShowResult.transactionId,
        sentAt: new Date(),
      },
    })
    
    return c.json({ success: true, message: '상품이 성공적으로 발송되었습니다.' })

  } catch (error) {
    console.error('Claiming error:', error)
    return c.json({ error: '상품 수령 중 오류가 발생했습니다.' }, 500)
  }
})

// --- 관리자 API ---
// Cloudflare Workers에서는 별도의 라우팅 설정을 통해 /admin 경로를 처리할 수 있습니다.
// 여기서는 Hono 앱 내에서 /admin 라우트를 정의합니다.
const admin = new Hono()

// 참여 코드 생성 API
admin.post('/codes', async (c) => {
  try {
    const { count = 1 } = await c.req.json<{ count?: number }>()
    const codes = []
    for (let i = 0; i < count; i++) {
      const newCode = await prisma.participationCode.create({
        data: {
          code: `EVENT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
        }
      })
      codes.push(newCode)
    }
    return c.json({ success: true, codes })
  } catch (error) {
    console.error('Code creation error:', error)
    return c.json({ error: '코드 생성 중 오류 발생' }, 500)
  }
})

// 참여 코드 목록 조회 API
admin.get('/codes', async (c) => {
  try {
    const codes = await prisma.participationCode.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return c.json({ success: true, codes })
  } catch (error) {
    console.error('Code fetching error:', error)
    return c.json({ error: '코드 조회 중 오류 발생' }, 500)
  }
})

app.route('/admin', admin)

// Cloudflare Workers의 fetch 핸들러
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // request.url을 기반으로 Hono 앱에 요청을 전달합니다.
    // Cloudflare Workers에서는 라우팅을 직접 처리하거나 Hono의 미들웨어를 활용할 수 있습니다.
    // 여기서는 Hono의 기본 라우팅을 사용합니다.
    return app.fetch(request, env, ctx);
  },
};

// Env 타입 정의 (wrangler.toml에서 D1/Neon DB 바인딩 설정 시 필요)
interface Env {
  DATABASE_URL: string; // Prisma Data Proxy URL
}
