import { GiftShowCrypto } from '../lib/giftshow-crypto';

/**
 * 기프트 쇼 API 클라이언트
 */
export class GiftShowClient {
  private readonly baseUrl: string;
  private readonly authKey: string;
  private readonly authToken: string;
  private readonly encryptionKey: string;
  private readonly bannerId: string;
  private readonly cardId: string;
  private readonly isDev: boolean;

  constructor(config: {
    baseUrl: string;
    authKey: string;
    authToken: string;
    encryptionKey: string;
    bannerId: string;
    cardId: string;
    isDev?: boolean;
  }) {
    this.baseUrl = config.baseUrl;
    this.authKey = config.authKey;
    this.authToken = config.authToken;
    this.encryptionKey = config.encryptionKey;
    this.bannerId = config.bannerId;
    this.cardId = config.cardId;
    this.isDev = config.isDev ?? true;
  }

  /**
   * 공통 HTTP 헤더 생성
   * @param apiCode API 코드
   * @returns HTTP 헤더 객체
   */
  private getCommonHeaders(apiCode: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'custom_auth_code': this.authKey,
      'custom_auth_token': this.authToken,
      'api_code': apiCode,
      'dev_flag': this.isDev ? 'Y' : 'N'
    };
  }

  /**
   * API 요청 실행
   * @param endpoint 엔드포인트
   * @param method HTTP 메서드
   * @param apiCode API 코드
   * @param data 요청 데이터
   * @returns 응답 데이터
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST',
    apiCode: string,
    data?: any
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getCommonHeaders(apiCode);

    console.log(`GiftShow API Request:`, {
      url,
      method,
      headers: { ...headers, custom_auth_token: '[HIDDEN]' },
      data
    });

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(30000) // 30초 타임아웃
    };

    if (method === 'POST' && data) {
      requestOptions.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('GiftShow API Response:', responseData);

      return responseData;
    } catch (error) {
      console.error('GiftShow API Error:', error);
      throw error;
    }
  }

  /**
   * 배너 정보 조회
   * @returns 배너 정보
   */
  async getBannerInfo(): Promise<any> {
    return this.makeRequest('/banner/info', 'POST', '0001', {
      banner_id: this.bannerId
    });
  }

  /**
   * 카드 정보 조회
   * @returns 카드 정보
   */
  async getCardInfo(): Promise<any> {
    return this.makeRequest('/card/info', 'POST', '0002', {
      card_id: this.cardId
    });
  }

  /**
   * MMS 발송 (카드 발송)
   * @param phoneNumber 수신자 전화번호 (하이픈 제거)
   * @param message 발송 메시지
   * @returns 발송 결과
   */
  async sendMMS(phoneNumber: string, message: string): Promise<any> {
    // 전화번호에서 하이픈 제거
    const cleanPhoneNumber = phoneNumber.replace(/-/g, '');

    return this.makeRequest('/mms/send', 'POST', '0003', {
      phone_number: cleanPhoneNumber,
      message: message,
      card_id: this.cardId
    });
  }

  /**
   * 비즈머니 잔액 조회
   * @returns 잔액 정보
   */
  async getBalance(): Promise<any> {
    return this.makeRequest('/balance/check', 'POST', '0004');
  }

  /**
   * 상품 코드 조회
   * @param productCode 상품 코드
   * @returns 상품 정보
   */
  async getProductInfo(productCode: string): Promise<any> {
    return this.makeRequest('/product/info', 'POST', '0005', {
      product_code: productCode
    });
  }
}

// 설정 값들
export const GIFTSHOW_CONFIG = {
  BASE_URL: process.env.GIFTSHOW_BASE_URL || 'https://api.giftshow.co.kr', // 개발용 더미 URL로 변경 가능
  AUTH_KEY: process.env.GIFTSHOW_AUTH_KEY || 'DEV42c191046f9549efadb3c7beef1b30b8',
  AUTH_TOKEN: process.env.GIFTSHOW_AUTH_TOKEN || 'eai/tEM6hCfxnr8yRM1pxw==',
  ENCRYPTION_KEY: process.env.GIFTSHOW_ENCRYPTION_KEY || 'your-encryption-key-32-chars',
  BANNER_ID: process.env.GIFTSHOW_BANNER_ID || '202006010058067',
  CARD_ID: process.env.GIFTSHOW_CARD_ID || '202006010057417',
  IS_DEV: process.env.NODE_ENV !== 'production',
  // 개발 환경에서 실제 API 호출을 건너뛰고 모의 데이터를 사용할지 여부
  USE_MOCK_API: process.env.GIFTSHOW_USE_MOCK_API === 'true'
};

// 클라이언트 인스턴스 생성
export const giftShowClient = new GiftShowClient({
  baseUrl: GIFTSHOW_CONFIG.BASE_URL,
  authKey: GIFTSHOW_CONFIG.AUTH_KEY,
  authToken: GIFTSHOW_CONFIG.AUTH_TOKEN,
  encryptionKey: GIFTSHOW_CONFIG.ENCRYPTION_KEY,
  bannerId: GIFTSHOW_CONFIG.BANNER_ID,
  cardId: GIFTSHOW_CONFIG.CARD_ID,
  isDev: GIFTSHOW_CONFIG.IS_DEV
});

// 모의 데이터 함수들 (개발 환경용)
export const mockGiftShowAPI = {
  getCardInfo: async () => ({
    success: true,
    data: {
      card_id: GIFTSHOW_CONFIG.CARD_ID,
      card_name: '테스트 기프트 카드',
      balance: 10000,
      status: 'active'
    }
  }),

  sendMMS: async (phoneNumber: string, message: string) => ({
    success: true,
    message_id: `MOCK_${Date.now()}`,
    phone_number: phoneNumber,
    status: 'sent'
  }),

  getBannerInfo: async () => ({
    success: true,
    data: {
      banner_id: GIFTSHOW_CONFIG.BANNER_ID,
      banner_name: '테스트 배너',
      image_url: '/images/test-banner.png',
      status: 'active'
    }
  })
};
