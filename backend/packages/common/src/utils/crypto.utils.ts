import * as crypto from 'crypto';

export class CryptoUtils {
  static generateHash(data: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  static generateSalt(length: number = 16): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static hashWithSalt(data: string, salt: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data + salt).digest('hex');
  }

  static generateRandomBytes(length: number): Buffer {
    return crypto.randomBytes(length);
  }

  static generateRandomHex(length: number): string {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }

  static generateUUID(): string {
    return crypto.randomUUID();
  }

  static encrypt(text: string, key: string, iv?: string): string {
    const algorithm = 'aes-256-cbc';
    const keyBuffer = Buffer.from(key, 'hex');
    const ivBuffer = iv ? Buffer.from(iv, 'hex') : crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, keyBuffer, ivBuffer);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return ivBuffer.toString('hex') + ':' + encrypted;
  }

  static decrypt(encryptedText: string, key: string): string {
    const algorithm = 'aes-256-cbc';
    const keyBuffer = Buffer.from(key, 'hex');
    const parts = encryptedText.split(':');
    const ivBuffer = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  static generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    return { publicKey, privateKey };
  }

  static sign(data: string, privateKey: string): string {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, 'hex');
  }

  static verify(data: string, signature: string, publicKey: string): boolean {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, 'hex');
  }

  static generateHMAC(data: string, secret: string, algorithm: string = 'sha256'): string {
    return crypto.createHmac(algorithm, secret).update(data).digest('hex');
  }

  static compareHashes(hash1: string, hash2: string): boolean {
    if (hash1.length !== hash2.length) return false;
    return crypto.timingSafeEqual(Buffer.from(hash1), Buffer.from(hash2));
  }
}