import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { PrismaClient } from '@prisma/client'

// export const runtime = 'edge' // Edge Runtime 제거 (Prisma 호환성 문제)

const prisma = new PrismaClient()
const app = new Hono().basePath('/api')

// 경품 추첨 함수 - 테스트 기간 동안 메가커피만 당첨되도록 설정
async function drawPrize() {
  // 테스트 기간 동안 메가커피만 당첨되도록 하드코딩
  let megacoffeePrize = await prisma.prize.findFirst({
    where: {
      id: 'megacoffee', // 메가커피 상품 ID로 검색
      stock: { gt: 0 } // 재고가 있는 경우만
    }
  })

  // 메가커피 상품이 없으면 자동으로 생성
  if (!megacoffeePrize) {
    try {
      megacoffeePrize = await prisma.prize.create({
        data: {
          id: 'megacoffee',
          name: '메가커피 교환권',
          stock: 1000, // 충분한 재고 설정
          probability: 1.0, // 100% 확률
          giftshowGoodsCode: 'MEGACOFFEE_001',
          imageUrl: '/images/megacoffee.png'
        }
      })
      console.log('메가커피 상품이 자동으로 생성되었습니다.')
    } catch (error) {
      console.error('메가커피 상품 생성 실패:', error)
    }
  }

  if (megacoffeePrize) {
    return megacoffeePrize
  }

  // 메가커피가 없으면 기존 로직으로 폴백
  const prizes = await prisma.prize.findMany({ where: { stock: { gt: 0 } } })
  if (prizes.length === 0) {
    return null // 모든 경품 재고 소진
  }

  const totalProbability = prizes.reduce((sum, p) => sum + p.probability, 0)
  let randomPoint = Math.random() * totalProbability

  for (const prize of prizes) {
    if (randomPoint < prize.probability) {
      return prize
    }
    randomPoint -= prize.probability
  }

  return prizes[prizes.length - 1] // Fallback
}

// Route for event participation
app.post('/participate', async (c) => {
  try {
    const { code } = await c.req.json()

    // 임시 테스트 코드 설정
    const TEMP_TEST_CODE = 'TEST123';

    if (!code) {
      return c.json({ error: '참여 코드가 필요합니다.' }, 400)
    }

    // 임시 테스트 코드 검증
    if (code !== TEMP_TEST_CODE) {
      return c.json({ error: '유효하지 않은 참여 코드입니다.' }, 400)
    }

    console.log(`임시 테스트 코드 입력됨: ${code}`);

    const result = await prisma.$transaction(async (tx) => {
      // 2. 참여 코드 찾기 또는 생성 (참여 기록용)
      let participationCode = await tx.participationCode.findUnique({
        where: { code: TEMP_TEST_CODE }
      })

      if (!participationCode) {
        participationCode = await tx.participationCode.create({
          data: {
            code: TEMP_TEST_CODE,
            isUsed: true,
            usedAt: new Date(),
          },
        })
      }

      // 3. 경품 추첨
      const prize = await drawPrize()
      if (!prize) {
        return { error: '모든 경품이 소진되었습니다.' }
      }

      // 4. 경품 재고 감소
      await tx.prize.update({
        where: { id: prize.id },
        data: { stock: { decrement: 1 } },
      })

      return {
        success: true,
        prize: { id: prize.id, name: prize.name, imageUrl: prize.imageUrl },
        participationCodeId: participationCode.id,
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
async function callGiftShowAPI(phoneNumber: string, prizeCode: string) {
  console.log(`기프트쇼 API 호출: ${phoneNumber}에게 ${prizeCode} 상품 발송 시도...`)
  // 실제 API 연동 로직...
  // 성공했다고 가정하고, 모의 거래 ID 반환
  await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 딜레이
  return { success: true, transactionId: `GIFT_${Date.now()}` }
}


// Route for claiming a prize
app.post('/claim', async (c) => {
  try {
    const { participationCodeId, phoneNumber } = await c.req.json()

    if (!participationCodeId || !phoneNumber) {
      return c.json({ error: '참여 코드와 휴대폰 번호가 필요합니다.' }, 400)
    }

    const result = await prisma.$transaction(async (tx) => {
      // 참여 코드로 상품 정보 조회
      const participationCode = await tx.participationCode.findUnique({
        where: { id: participationCodeId },
        include: { prize: true },
      })

      if (!participationCode || !participationCode.prize) {
        return { error: '유효하지 않은 참여 코드입니다.' }
      }

      // 이미 winner가 있는지 확인
      const existingWinner = await tx.winner.findUnique({
        where: { participationCodeId: participationCodeId },
      })

      if (existingWinner?.giftshowTrId) {
        return { error: '이미 상품을 수령했습니다.' }
      }

      // Winner 생성 또는 업데이트
      const winner = existingWinner ? await tx.winner.update({
        where: { id: existingWinner.id },
        data: {
          userPhoneNumber: phoneNumber,
        },
        include: { prize: true },
      }) : await tx.winner.create({
        data: {
          participationCodeId: participationCodeId,
          prizeId: participationCode.prize.id,
          userPhoneNumber: phoneNumber,
        },
        include: { prize: true },
      })

      // 기프트쇼 API 호출 (모의)
      const giftShowResult = await callGiftShowAPI(phoneNumber, winner.prize.giftshowGoodsCode)

      if (!giftShowResult.success) {
        return { error: '기프트쇼 API 연동 중 오류가 발생했습니다.' }
      }

      // 당첨자 정보 업데이트 (기프트쇼 거래 ID 저장)
      await tx.winner.update({
        where: { id: winner.id },
        data: {
          giftshowTrId: giftShowResult.transactionId,
          sentAt: new Date(),
        },
      })

      return { success: true, message: '상품이 성공적으로 발송되었습니다.' }
    })

    if (result.error) {
      return c.json({ error: result.error }, 400)
    }

    return c.json(result)

  } catch (error) {
    console.error('Claiming error:', error)
    return c.json({ error: '상품 수령 중 오류가 발생했습니다.' }, 500)
  }
})

// --- 관리자 API ---
const admin = new Hono()

// 참여 코드 생성 API
admin.post('/codes', async (c) => {
  try {
    const { count = 1 } = await c.req.json<{ count?: number }>()
    const codes = []
    for (let i = 0; i < count; i++) {
      const newCode = await prisma.participationCode.create({
        data: {
          // 간단한 랜덤 코드 생성. 실제로는 더 복잡한 코드 추천.
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


export const GET = handle(app)
export const POST = handle(app)