// 기프트쇼 API 연결 테스트
const authKey = 'REAL10f8dc85d32c4ff4b2594851a845c15f';
const authToken = 'VUUiyDeKaWdeJYjlyGIuwQ==';

// 상품 리스트 API 호출 (user_id 없이)
async function testProductListAPI() {
  const requestData = new URLSearchParams({
    api_code: '0101', // 상품리스트 API 코드
    custom_auth_code: authKey,
    custom_auth_token: authToken,
    dev_yn: 'N'
  });

  try {
    const response = await fetch('https://bizapi.giftishow.com/bizApi/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: requestData.toString()
    });

    const result = await response.json();
    console.log('상품 리스트 API 응답:', result);
    
    if (result.code === '0000') {
      console.log('✅ API 연결 성공!');
      console.log('첫 번째 상품:', result.result.goods_list[0]);
    } else {
      console.log('❌ API 오류:', result.code, result.message);
    }
  } catch (error) {
    console.error('네트워크 오류:', error);
  }
}

// 쿠폰 발송 API 테스트 (다양한 user_id 시도)
async function testCouponAPI(userId) {
  const requestData = new URLSearchParams({
    api_code: '0204',
    custom_auth_code: authKey,
    custom_auth_token: authToken,
    dev_yn: 'N',
    goods_code: 'G00001621744',
    mms_msg: '테스트 메시지',
    mms_title: '테스트',
    callback_no: '01012345678',
    phone_no: '01012345678',
    tr_id: `test_${Date.now()}`,
    user_id: userId,
    gubun: 'N'
  });

  try {
    const response = await fetch('https://bizapi.giftishow.com/bizApi/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: requestData.toString()
    });

    const result = await response.json();
    console.log(`user_id "${userId}" 테스트 결과:`, result);
    return result;
  } catch (error) {
    console.error('네트워크 오류:', error);
    return null;
  }
}

// 다양한 user_id 시도
async function testDifferentUserIds() {
  const userIds = [
    'jsyglobal@giftshow.com',
    'jsyglobal',
    'admin',
    'test',
    '', // 빈 문자열
  ];

  console.log('=== 다양한 user_id 테스트 ===');
  for (const userId of userIds) {
    await testCouponAPI(userId);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
  }
}

// 실행
console.log('기프트쇼 API 연결 테스트 시작...');
testProductListAPI().then(() => {
  console.log('\n상품 리스트 테스트 완료. 쿠폰 API 테스트 시작...');
  return testDifferentUserIds();
}).then(() => {
  console.log('\n모든 테스트 완료.');
});
