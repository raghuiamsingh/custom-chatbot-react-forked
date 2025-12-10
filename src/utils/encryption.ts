/**
 * Frontend RSA Encryption Utilities using Web Crypto API
 * 
 * This module handles:
 * - Fetching public key from backend
 * - Encrypting data using RSA-OAEP
 * - Automatic fallback to plain text when encryption is unavailable
 */

/**
 * Check if Web Crypto API is available
 * Web Crypto API is available in:
 * - HTTPS contexts (anywhere)
 * - HTTP on localhost, 127.0.0.1, or .localhost domains
 * 
 * Note: Modern browsers (Chrome, Firefox, Safari) treat .localhost domains
 * as secure contexts even over HTTP, so app.gethealthyscript.localhost will work!
 */
function isWebCryptoAvailable(): boolean {
    // Check if crypto.subtle exists
    // The browser automatically makes crypto.subtle available in secure contexts
    if (typeof window.crypto.subtle === 'undefined') {
        return false;
    }
    return true;
}

/**
 * Get the crypto.subtle API
 * Throws a helpful error if not available
 */
function getCryptoSubtle(): SubtleCrypto {
    if (typeof window.crypto.subtle === 'undefined') {
        const protocol = window.location?.protocol || 'unknown';
        const hostname = window.location?.hostname || '';
        const isLocalhost = hostname === 'localhost' || 
                           hostname === '127.0.0.1' || 
                           hostname === '[::1]' ||
                           hostname.endsWith('.localhost'); // .localhost domains are treated as secure
        const isSecureContext = window.isSecureContext === true;

        let errorMessage = 'Web Crypto API is not available. window.crypto.subtle is undefined. ';

        if (!isSecureContext && !isLocalhost) {
            errorMessage += `The Web Crypto API requires HTTPS, localhost, or .localhost domain. `;
            errorMessage += `Current protocol: ${protocol}, hostname: ${hostname}. `;
            errorMessage += 'Please use HTTPS, localhost, or a .localhost domain (e.g., app.gethealthyscript.localhost) to enable encryption.';
        } else {
            errorMessage += 'This browser may not support the Web Crypto API, or it may be disabled.';
        }

        throw new Error(errorMessage);
    }

    return window.crypto.subtle;
}

/**
 * Convert PEM format public key to ArrayBuffer
 * Removes PEM headers and converts base64 to ArrayBuffer
 * 
 * @param pem - Public key in PEM format
 * @returns ArrayBuffer containing the key data
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
    // Remove PEM headers and whitespace
    const pemHeader = '-----BEGIN PUBLIC KEY-----';
    const pemFooter = '-----END PUBLIC KEY-----';
    const pemContents = pem
        .replace(pemHeader, '')
        .replace(pemFooter, '')
        .replace(/\s/g, ''); // Remove all whitespace

    // Convert base64 to binary string, then to ArrayBuffer
    const binaryString = atob(pemContents);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Convert ArrayBuffer to base64 string
 * 
 * @param buffer - ArrayBuffer to convert
 * @returns Base64-encoded string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Fetch the public key from the backend
 * 
 * @param endpoint - Optional API endpoint prefix (e.g., "/api/v1" for prod, "" or "/" for local)
 * @returns Public key in PEM format
 * @throws Error if fetch fails
 */
export async function fetchPublicKey(endpoint?: string): Promise<string> {
    try {
        // Build API URL with endpoint prefix
        const url = endpoint 
            ? `${endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint}/encryption/public-key`
            : '/encryption/public-key';
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch public key: ${response.statusText} (${response.status})`);
        }

        const data = await response.json();
        if (!data.publicKey || typeof data.publicKey !== 'string') {
            throw new Error('Invalid response: publicKey not found or invalid format');
        }

        return data.publicKey;
    } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('Network error: Failed to connect to server. Please check your connection.');
        }
        throw new Error(`Error fetching public key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Encrypt data using hybrid encryption (AES-GCM + RSA-OAEP)
 * For data larger than RSA limit, uses AES-GCM to encrypt data and RSA to encrypt the AES key
 * 
 * @param data - Data to encrypt (will be JSON stringified if object)
 * @param publicKeyPem - Public key in PEM format
 * @returns Base64-encoded encrypted data (format: "hybrid:" + base64(encryptedAESKey + iv + encryptedData))
 * @throws Error if encryption fails
 */
export async function encryptData(data: any, publicKeyPem: string): Promise<string> {
    if (!publicKeyPem || typeof publicKeyPem !== 'string') {
        throw new Error('Invalid public key: must be a non-empty string');
    }

    try {
        // Convert data to string if it's an object
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        const dataBytes = new TextEncoder().encode(dataString);

        // Get crypto.subtle API
        const subtle = getCryptoSubtle();

        // Convert PEM to ArrayBuffer
        const publicKeyBuffer = pemToArrayBuffer(publicKeyPem);

        // Import the public key
        const publicKey = await subtle.importKey(
            'spki', // Standard format for public keys
            publicKeyBuffer,
            {
                name: 'RSA-OAEP',
                hash: 'SHA-256' // SHA-256 hash (matches backend)
            },
            false, // Not extractable
            ['encrypt'] // Key usage
        );

        // Check data size (RSA can only encrypt data up to key size minus padding overhead)
        // For 4096-bit RSA-OAEP with SHA-256: max ~470 bytes
        const maxRsaDataSize = 470;
        
        if (dataBytes.length <= maxRsaDataSize) {
            // Small data: use direct RSA encryption (backward compatible)
            const encrypted = await subtle.encrypt(
                {
                    name: 'RSA-OAEP'
                },
                publicKey,
                dataBytes
            );
            return arrayBufferToBase64(encrypted);
        }

        // Large data: use hybrid encryption (AES-GCM + RSA)
        // 1. Generate AES key
        const aesKey = await subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256
            },
            true, // extractable
            ['encrypt']
        );

        // 2. Generate IV (12 bytes for AES-GCM)
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        // 3. Encrypt data with AES-GCM
        const encryptedData = await subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv,
                tagLength: 128 // 128-bit authentication tag
            },
            aesKey,
            dataBytes
        );

        // 4. Export AES key
        const exportedKey = await subtle.exportKey('raw', aesKey);
        const aesKeyBytes = new Uint8Array(exportedKey);

        // 5. Encrypt AES key with RSA
        const encryptedAesKey = await subtle.encrypt(
            {
                name: 'RSA-OAEP'
            },
            publicKey,
            aesKeyBytes
        );

        // 6. Combine: encryptedAESKey (512 bytes) + iv (12 bytes) + encryptedData
        const encryptedAesKeyArray = new Uint8Array(encryptedAesKey);
        const encryptedDataArray = new Uint8Array(encryptedData);
        const combined = new Uint8Array(encryptedAesKeyArray.length + iv.length + encryptedDataArray.length);
        combined.set(encryptedAesKeyArray, 0);
        combined.set(iv, encryptedAesKeyArray.length);
        combined.set(encryptedDataArray, encryptedAesKeyArray.length + iv.length);

        // 7. Return with "hybrid:" prefix to indicate hybrid encryption
        return 'hybrid:' + arrayBufferToBase64(combined.buffer);
    } catch (error) {
        // Provide helpful error messages
        if (error instanceof Error) {
            if (error.message.includes('crypto.subtle')) {
                throw error; // Re-throw crypto availability errors as-is
            }
            throw new Error(`Encryption failed: ${error.message}`);
        }
        throw new Error('Encryption failed: Unknown error');
    }
}

/**
 * Encrypt initData with automatic public key fetching
 * Caches the public key to avoid repeated fetches
 * 
 * Falls back to plain text if Web Crypto API is not available
 * (backend supports both encrypted and plain text)
 * 
 * @param initData - The initData object containing BotDojo config and optional endpoint
 * @returns Encrypted data as base64 string or plain JSON string if encryption unavailable
 */
let cachedPublicKey: string | null = null;
let cachedEndpoint: string | undefined = undefined;
let fallbackWarningShown = false;

export async function encryptInitData(initData: any): Promise<string> {
    // Extract endpoint from initData if available
    const endpoint = initData?.BOTDOJO_API_ENDPOINT;
    
    // Check if encryption is available before attempting
    if (!isWebCryptoAvailable()) {
        // Encryption not available - fall back to plain text
        if (!fallbackWarningShown) {
            const protocol = typeof window !== 'undefined' && window.location ? window.location.protocol : 'unknown';
            const hostname = typeof window !== 'undefined' && window.location ? window.location.hostname : 'unknown';
            console.warn(
                '⚠️ Encryption is not available. ' +
                `Protocol: ${protocol}, Hostname: ${hostname}. ` +
                'Web Crypto API requires HTTPS or localhost. ' +
                'Falling back to plain text transmission (not secure). ' +
                'Please use HTTPS or localhost for secure encryption.'
            );
            fallbackWarningShown = true;
        }

        // Return plain text JSON (backend supports both encrypted and plain text)
        return JSON.stringify(initData);
    }

    try {
        // Fetch public key if not cached or endpoint changed
        if (!cachedPublicKey || cachedEndpoint !== endpoint) {
            cachedPublicKey = await fetchPublicKey(endpoint);
            cachedEndpoint = endpoint;
        }

        // Encrypt the initData
        return await encryptData(initData, cachedPublicKey);
    } catch (error) {
        // If encryption fails, clear cache and fall back to plain text
        cachedPublicKey = null;
        cachedEndpoint = undefined;

        // Check if it's a crypto.subtle availability error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('crypto.subtle') || errorMessage.includes('Web Crypto API')) {
            if (!fallbackWarningShown) {
                console.warn(
                    '⚠️ Encryption failed. Falling back to plain text transmission (not secure). ' +
                    'Please use HTTPS or localhost for secure encryption.'
                );
                fallbackWarningShown = true;
            }

            // Fall back to plain text (backend supports both)
            return JSON.stringify(initData);
        }

        // Re-throw other errors (network errors, invalid key, etc.)
        throw error;
    }
}

/**
 * Check if encryption is available
 * 
 * @returns true if Web Crypto API is available
 */
export function isEncryptionAvailable(): boolean {
    return isWebCryptoAvailable();
}

/**
 * Clear the cached public key
 * Useful for testing or key rotation
 */
export function clearPublicKeyCache(): void {
    cachedPublicKey = null;
    cachedEndpoint = undefined;
    fallbackWarningShown = false;
}

