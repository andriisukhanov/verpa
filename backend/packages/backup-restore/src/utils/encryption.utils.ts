import * as crypto from 'crypto';
import * as fs from 'fs';
import { pipeline } from 'stream/promises';

export class EncryptionUtils {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly SALT_LENGTH = 32;
  private static readonly TAG_LENGTH = 16;
  private static readonly ITERATIONS = 100000;

  static async generateKey(password: string, salt?: Buffer): Promise<{
    key: Buffer;
    salt: Buffer;
  }> {
    const useSalt = salt || crypto.randomBytes(this.SALT_LENGTH);
    const key = await new Promise<Buffer>((resolve, reject) => {
      crypto.pbkdf2(password, useSalt, this.ITERATIONS, 32, 'sha256', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });

    return { key, salt: useSalt };
  }

  static async encryptFile(
    inputPath: string,
    outputPath: string,
    password: string,
  ): Promise<{
    salt: string;
    iv: string;
    authTag: string;
  }> {
    const { key, salt } = await this.generateKey(password);
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);

    // Write metadata header
    output.write(salt);
    output.write(iv);
    output.write(Buffer.alloc(this.TAG_LENGTH)); // Placeholder for auth tag

    await pipeline(input, cipher, output);

    const authTag = cipher.getAuthTag();

    // Update auth tag in file
    const fd = await fs.promises.open(outputPath, 'r+');
    await fd.write(authTag, 0, this.TAG_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
    await fd.close();

    return {
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  static async decryptFile(
    inputPath: string,
    outputPath: string,
    password: string,
  ): Promise<void> {
    const fd = await fs.promises.open(inputPath, 'r');

    // Read metadata header
    const salt = Buffer.alloc(this.SALT_LENGTH);
    const iv = Buffer.alloc(this.IV_LENGTH);
    const authTag = Buffer.alloc(this.TAG_LENGTH);

    await fd.read(salt, 0, this.SALT_LENGTH, 0);
    await fd.read(iv, 0, this.IV_LENGTH, this.SALT_LENGTH);
    await fd.read(authTag, 0, this.TAG_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
    await fd.close();

    const { key } = await this.generateKey(password, salt);
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const input = fs.createReadStream(inputPath, {
      start: this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH,
    });
    const output = fs.createWriteStream(outputPath);

    await pipeline(input, decipher, output);
  }

  static async encryptData(data: Buffer, password: string): Promise<{
    encrypted: Buffer;
    salt: string;
    iv: string;
    authTag: string;
  }> {
    const { key, salt } = await this.generateKey(password);
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
      encrypted: Buffer.concat([salt, iv, authTag, encrypted]),
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  static async decryptData(encryptedData: Buffer, password: string): Promise<Buffer> {
    // Extract metadata
    const salt = encryptedData.slice(0, this.SALT_LENGTH);
    const iv = encryptedData.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
    const authTag = encryptedData.slice(
      this.SALT_LENGTH + this.IV_LENGTH,
      this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH,
    );
    const encrypted = encryptedData.slice(
      this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH,
    );

    const { key } = await this.generateKey(password, salt);
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
  }

  static generateRandomPassword(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64');
  }

  static async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16);
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
    return salt.toString('hex') + ':' + hash.toString('hex');
  }

  static async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [saltHex, hashHex] = storedHash.split(':');
    const salt = Buffer.from(saltHex, 'hex');
    const storedHashBuffer = Buffer.from(hashHex, 'hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
    return crypto.timingSafeEqual(hash, storedHashBuffer);
  }

  static async generateKeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    return new Promise((resolve, reject) => {
      crypto.generateKeyPair('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
          type: 'pkcs1',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs1',
          format: 'pem',
        },
      }, (err, publicKey, privateKey) => {
        if (err) reject(err);
        else resolve({ publicKey, privateKey });
      });
    });
  }

  static calculateChecksum(filePath: string, algorithm: string = 'sha256'): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(algorithm);
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  static async verifyChecksum(
    filePath: string,
    expectedChecksum: string,
    algorithm: string = 'sha256',
  ): Promise<boolean> {
    const actualChecksum = await this.calculateChecksum(filePath, algorithm);
    return actualChecksum === expectedChecksum;
  }
}