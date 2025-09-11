import crypto from 'crypto';

/**
 * 기프트 쇼 API 암호화 유틸리티
 * AES256/ECB/PKCS5Padding + Base64 암호화 방식 사용
 */
export class GiftShowCrypto {
  private static readonly ALGORITHM = 'aes-256-ecb';
  private static readonly ENCODING = 'base64';

  /**
   * 텍스트를 AES256으로 암호화하고 Base64로 인코딩
   * @param text 암호화할 텍스트
   * @param key 암호화 키 (32바이트)
   * @returns Base64 인코딩된 암호화된 텍스트
   */
  static encrypt(text: string, key: string): string {
    try {
      const cipher = crypto.createCipher(this.ALGORITHM, key);
      let encrypted = cipher.update(text, 'utf8', this.ENCODING);
      encrypted += cipher.final(this.ENCODING);
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt text');
    }
  }

  /**
   * Base64로 인코딩된 AES256 암호화된 텍스트를 복호화
   * @param encryptedText Base64 인코딩된 암호화된 텍스트
   * @param key 암호화 키 (32바이트)
   * @returns 복호화된 텍스트
   */
  static decrypt(encryptedText: string, key: string): string {
    try {
      const decipher = crypto.createDecipher(this.ALGORITHM, key);
      let decrypted = decipher.update(encryptedText, this.ENCODING, 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt text');
    }
  }

  /**
   * 인증 토큰 생성
   * @param authKey 인증 키
   * @param encryptionKey 암호화 키
   * @returns Base64 인코딩된 암호화된 인증 토큰
   */
  static generateAuthToken(authKey: string, encryptionKey: string): string {
    return this.encrypt(authKey, encryptionKey);
  }
}
