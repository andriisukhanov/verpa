import { CryptoUtils } from '../crypto.utils';

describe('CryptoUtils', () => {
  describe('generateHash', () => {
    it('should generate consistent hash for same input', () => {
      const data = 'test data';
      const hash1 = CryptoUtils.generateHash(data);
      const hash2 = CryptoUtils.generateHash(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 produces 64 hex characters
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = CryptoUtils.generateHash('data1');
      const hash2 = CryptoUtils.generateHash('data2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should support different algorithms', () => {
      const data = 'test';
      const sha256 = CryptoUtils.generateHash(data, 'sha256');
      const sha512 = CryptoUtils.generateHash(data, 'sha512');
      
      expect(sha256).toHaveLength(64);
      expect(sha512).toHaveLength(128);
      expect(sha256).not.toBe(sha512);
    });
  });

  describe('generateSalt', () => {
    it('should generate salt of correct length', () => {
      const salt1 = CryptoUtils.generateSalt();
      const salt2 = CryptoUtils.generateSalt(32);
      
      expect(salt1).toHaveLength(32); // Default 16 bytes = 32 hex chars
      expect(salt2).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique salts', () => {
      const salts = new Set();
      for (let i = 0; i < 100; i++) {
        salts.add(CryptoUtils.generateSalt());
      }
      
      expect(salts.size).toBe(100);
    });
  });

  describe('hashWithSalt', () => {
    it('should generate consistent hash with same salt', () => {
      const data = 'password';
      const salt = 'fixedsalt';
      
      const hash1 = CryptoUtils.hashWithSalt(data, salt);
      const hash2 = CryptoUtils.hashWithSalt(data, salt);
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes with different salts', () => {
      const data = 'password';
      
      const hash1 = CryptoUtils.hashWithSalt(data, 'salt1');
      const hash2 = CryptoUtils.hashWithSalt(data, 'salt2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateRandomBytes', () => {
    it('should generate buffer of correct length', () => {
      const bytes = CryptoUtils.generateRandomBytes(16);
      
      expect(bytes).toBeInstanceOf(Buffer);
      expect(bytes.length).toBe(16);
    });

    it('should generate different bytes each time', () => {
      const bytes1 = CryptoUtils.generateRandomBytes(16);
      const bytes2 = CryptoUtils.generateRandomBytes(16);
      
      expect(bytes1.equals(bytes2)).toBe(false);
    });
  });

  describe('generateRandomHex', () => {
    it('should generate hex string of correct length', () => {
      expect(CryptoUtils.generateRandomHex(10)).toHaveLength(10);
      expect(CryptoUtils.generateRandomHex(20)).toHaveLength(20);
      expect(CryptoUtils.generateRandomHex(5)).toHaveLength(5);
    });

    it('should only contain hex characters', () => {
      const hex = CryptoUtils.generateRandomHex(100);
      expect(hex).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('generateUUID', () => {
    it('should generate valid UUID v4', () => {
      const uuid = CryptoUtils.generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set();
      for (let i = 0; i < 100; i++) {
        uuids.add(CryptoUtils.generateUUID());
      }
      
      expect(uuids.size).toBe(100);
    });
  });

  describe('encrypt and decrypt', () => {
    const key = CryptoUtils.generateRandomHex(64); // 32 bytes for AES-256

    it('should encrypt and decrypt text correctly', () => {
      const plaintext = 'This is a secret message';
      const encrypted = CryptoUtils.encrypt(plaintext, key);
      const decrypted = CryptoUtils.decrypt(encrypted, key);
      
      expect(decrypted).toBe(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(':'); // IV separator
    });

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'Same message';
      const encrypted1 = CryptoUtils.encrypt(plaintext, key);
      const encrypted2 = CryptoUtils.encrypt(plaintext, key);
      
      expect(encrypted1).not.toBe(encrypted2); // Different IVs
      expect(CryptoUtils.decrypt(encrypted1, key)).toBe(plaintext);
      expect(CryptoUtils.decrypt(encrypted2, key)).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const encrypted = CryptoUtils.encrypt('', key);
      const decrypted = CryptoUtils.decrypt(encrypted, key);
      
      expect(decrypted).toBe('');
    });

    it('should handle special characters', () => {
      const plaintext = '🔐 Émojis & spéçiål çhärs!';
      const encrypted = CryptoUtils.encrypt(plaintext, key);
      const decrypted = CryptoUtils.decrypt(encrypted, key);
      
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('generateKeyPair', () => {
    it('should generate valid RSA key pair', () => {
      const { publicKey, privateKey } = CryptoUtils.generateKeyPair();
      
      expect(publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(publicKey).toContain('-----END PUBLIC KEY-----');
      expect(privateKey).toContain('-----BEGIN PRIVATE KEY-----');
      expect(privateKey).toContain('-----END PRIVATE KEY-----');
    });
  });

  describe('sign and verify', () => {
    it('should sign and verify data correctly', () => {
      const { publicKey, privateKey } = CryptoUtils.generateKeyPair();
      const data = 'Data to be signed';
      
      const signature = CryptoUtils.sign(data, privateKey);
      const isValid = CryptoUtils.verify(data, signature, publicKey);
      
      expect(isValid).toBe(true);
    });

    it('should fail verification with wrong data', () => {
      const { publicKey, privateKey } = CryptoUtils.generateKeyPair();
      const data = 'Original data';
      
      const signature = CryptoUtils.sign(data, privateKey);
      const isValid = CryptoUtils.verify('Modified data', signature, publicKey);
      
      expect(isValid).toBe(false);
    });

    it('should fail verification with wrong signature', () => {
      const { publicKey, privateKey } = CryptoUtils.generateKeyPair();
      const data = 'Data to be signed';
      
      const signature = CryptoUtils.sign(data, privateKey);
      const modifiedSignature = signature.slice(0, -2) + 'ff';
      const isValid = CryptoUtils.verify(data, modifiedSignature, publicKey);
      
      expect(isValid).toBe(false);
    });
  });

  describe('generateHMAC', () => {
    it('should generate consistent HMAC for same input', () => {
      const data = 'message';
      const secret = 'secret-key';
      
      const hmac1 = CryptoUtils.generateHMAC(data, secret);
      const hmac2 = CryptoUtils.generateHMAC(data, secret);
      
      expect(hmac1).toBe(hmac2);
      expect(hmac1).toHaveLength(64); // SHA256
    });

    it('should generate different HMACs for different secrets', () => {
      const data = 'message';
      
      const hmac1 = CryptoUtils.generateHMAC(data, 'secret1');
      const hmac2 = CryptoUtils.generateHMAC(data, 'secret2');
      
      expect(hmac1).not.toBe(hmac2);
    });

    it('should support different algorithms', () => {
      const data = 'message';
      const secret = 'secret';
      
      const sha256 = CryptoUtils.generateHMAC(data, secret, 'sha256');
      const sha512 = CryptoUtils.generateHMAC(data, secret, 'sha512');
      
      expect(sha256).toHaveLength(64);
      expect(sha512).toHaveLength(128);
    });
  });

  describe('compareHashes', () => {
    it('should return true for identical hashes', () => {
      const hash = CryptoUtils.generateHash('data');
      expect(CryptoUtils.compareHashes(hash, hash)).toBe(true);
    });

    it('should return false for different hashes', () => {
      const hash1 = CryptoUtils.generateHash('data1');
      const hash2 = CryptoUtils.generateHash('data2');
      expect(CryptoUtils.compareHashes(hash1, hash2)).toBe(false);
    });

    it('should return false for different length hashes', () => {
      const hash1 = 'abcd';
      const hash2 = 'abcdef';
      expect(CryptoUtils.compareHashes(hash1, hash2)).toBe(false);
    });

    it('should use timing-safe comparison', () => {
      // This test verifies the function exists and works,
      // but cannot easily test the timing-safe aspect
      const hash = CryptoUtils.generateHash('test');
      const similar = hash.slice(0, -1) + (hash.slice(-1) === 'a' ? 'b' : 'a');
      
      expect(CryptoUtils.compareHashes(hash, similar)).toBe(false);
    });
  });
});