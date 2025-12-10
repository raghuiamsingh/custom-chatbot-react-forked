import crypto from 'crypto';

/**
 * RSA Encryption Utilities for Backend
 * 
 * This module handles:
 * - RSA key pair generation (2048-bit)
 * - Public key exposure
 * - Data decryption using private key
 */

// RSA key pair (generated at module load)
let privateKey: string;
let publicKey: string;

/**
 * Generate RSA key pair (4096-bit)
 * Called automatically when module loads
 * 
 * Key specifications:
 * - Modulus length: 4096 bits (allows larger data encryption, ~470 bytes max)
 * - Public key format: SPKI (SubjectPublicKeyInfo) in PEM
 * - Private key format: PKCS8 in PEM
 */
function generateRSAKeyPair(): void {
  try {
    const { publicKey: pubKey, privateKey: privKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096, // 4096-bit key (allows ~470 bytes of data with RSA-OAEP)
      publicKeyEncoding: {
        type: 'spki', // Standard format for public keys
        format: 'pem' // PEM format (text-based, easy to transmit)
      },
      privateKeyEncoding: {
        type: 'pkcs8', // Standard format for private keys
        format: 'pem' // PEM format
      }
    });
    
    privateKey = privKey;
    publicKey = pubKey;
  } catch (error) {
    throw new Error(`Failed to generate RSA key pair: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate keys when module loads
generateRSAKeyPair();

/**
 * Get the public key in PEM format
 * Safe to expose publicly - it can only encrypt, never decrypt
 * 
 * @returns Public key in PEM format
 */
export function getPublicKey(): string {
  if (!publicKey) {
    throw new Error('Public key not initialized. Key generation may have failed.');
  }
  return publicKey;
}

/**
 * Decrypt data that was encrypted with the public key
 * Supports both direct RSA encryption and hybrid encryption (AES-GCM + RSA)
 * 
 * @param encryptedBase64 - Base64-encoded encrypted data (may have "hybrid:" prefix)
 * @returns Decrypted string (typically JSON)
 * @throws Error if decryption fails
 */
export function decryptData(encryptedBase64: string): string {
  if (!privateKey) {
    throw new Error('Private key not initialized. Key generation may have failed.');
  }

  if (!encryptedBase64 || typeof encryptedBase64 !== 'string') {
    throw new Error('Invalid encrypted data: must be a non-empty string');
  }

  try {
    // Check if it's hybrid encryption
    if (encryptedBase64.startsWith('hybrid:')) {
      // Hybrid encryption: AES-GCM + RSA
      const combinedBase64 = encryptedBase64.substring(7); // Remove "hybrid:" prefix
      const combinedBuffer = Buffer.from(combinedBase64, 'base64');
      
      // Extract components
      // RSA-encrypted AES key: 512 bytes (4096-bit RSA output)
      const encryptedAesKeyLength = 512;
      const encryptedAesKey = combinedBuffer.subarray(0, encryptedAesKeyLength);
      
      // IV: 12 bytes
      const ivLength = 12;
      const iv = combinedBuffer.subarray(encryptedAesKeyLength, encryptedAesKeyLength + ivLength);
      
      // Encrypted data: rest
      const encryptedData = combinedBuffer.subarray(encryptedAesKeyLength + ivLength);
      
      // 1. Decrypt AES key with RSA
      const aesKeyBuffer = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        encryptedAesKey
      );
      
      // 2. Decrypt data with AES-GCM
      const decipher = crypto.createDecipheriv('aes-256-gcm', aesKeyBuffer, iv);
      
      // Extract authentication tag (last 16 bytes of encrypted data)
      const tagLength = 16;
      const tag = encryptedData.subarray(encryptedData.length - tagLength);
      const ciphertext = encryptedData.subarray(0, encryptedData.length - tagLength);
      
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(ciphertext, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } else {
      // Direct RSA encryption (backward compatible)
      const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');
      
      // Decrypt using private key with RSA-OAEP padding
      const decrypted = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, // OAEP padding (more secure than PKCS1v1.5)
          oaepHash: 'sha256' // SHA-256 hash (matches frontend)
        },
        encryptedBuffer
      );

      // Return as UTF-8 string
      return decrypted.toString('utf8');
    }
  } catch (error) {
    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('bad decrypt')) {
        throw new Error('Decryption failed: Invalid encrypted data or wrong key');
      }
      if (error.message.includes('too large')) {
        throw new Error('Decryption failed: Encrypted data is too large for RSA key size');
      }
      throw new Error(`Decryption failed: ${error.message}`);
    }
    throw new Error('Decryption failed: Unknown error');
  }
}

/**
 * Check if a string appears to be base64-encoded encrypted data
 * Simple heuristic to distinguish encrypted data from plain JSON
 * 
 * @param data - String to check
 * @returns true if data appears to be encrypted (base64, long enough)
 */
export function isEncryptedData(data: string): boolean {
  if (!data || typeof data !== 'string') {
    return false;
  }
  
  // Check for hybrid encryption prefix
  if (data.startsWith('hybrid:')) {
    return true;
  }
  
  // Base64 strings are typically longer and match base64 pattern
  // Encrypted RSA data with 4096-bit key produces ~684 character base64 strings
  const base64Pattern = /^[A-Za-z0-9+/=]+$/;
  const minEncryptedLength = 200; // Minimum expected length for encrypted data
  
  return data.length >= minEncryptedLength && base64Pattern.test(data);
}

/**
 * Get key information (for debugging/monitoring)
 * 
 * @returns Object with key metadata
 */
export function getKeyInfo(): {
  keySize: number;
  algorithm: string;
  publicKeyAvailable: boolean;
  privateKeyAvailable: boolean;
} {
  return {
    keySize: 4096,
    algorithm: 'RSA-OAEP',
    publicKeyAvailable: !!publicKey,
    privateKeyAvailable: !!privateKey
  };
}

