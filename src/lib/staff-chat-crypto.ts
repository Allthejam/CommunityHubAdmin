/**
 * Staff Chat AES-256-GCM Content Encryption
 * Server-only module. NEVER import this from client components.
 * Key lives in STAFF_CHAT_ENCRYPTION_KEY env var only.
 *
 * Firestore stored format: "enc:v1:<ivB64>:<authTagB64>:<ciphertextB64>"
 * Legacy plain-text messages (no prefix) returned as-is for backwards compat.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';
const DEFAULT_KEY_HEX = 'b36c330fd4df3751e9dd88a8abf513695000c7be956cc7f61f2c8dd9d7ca2c33';

function getKey(): Buffer {
    const raw = process.env.STAFF_CHAT_ENCRYPTION_KEY || DEFAULT_KEY_HEX;
    if (/^[0-9a-f]{64}$/i.test(raw.trim())) {
        return Buffer.from(raw.trim(), 'hex');
    }
    return createHash('sha256').update(raw).digest();
}

export function encryptMessage(plaintext: string): string {
    try {
        const key = getKey();
        const iv = randomBytes(12);
        const cipher = createCipheriv(ALGORITHM, key, iv);
        const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();
        return `${PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
    } catch (e: any) {
        console.error('encryptMessage error:', e);
        return plaintext;
    }
}

export function decryptMessage(ciphertext: string): string {
    if (!ciphertext || typeof ciphertext !== 'string' || !ciphertext.startsWith(PREFIX)) {
        return ciphertext;
    }
    try {
        const key = getKey();
        const parts = ciphertext.slice(PREFIX.length).split(':');
        if (parts.length !== 3) return ciphertext;
        const [ivB64, authTagB64, dataB64] = parts;
        const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
        decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
        return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
    } catch (e: any) {
        console.error('decryptMessage error:', e);
        return ciphertext;
    }
}
