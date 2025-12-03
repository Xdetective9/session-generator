import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate secure session ID
export function generateSessionId(credentials) {
    const data = JSON.stringify({
        ...credentials,
        timestamp: Date.now(),
        random: crypto.randomBytes(32).toString('hex')
    });
    
    // Encrypt the session data
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
        'aes-256-gcm',
        Buffer.from(process.env.SESSION_SECRET || 'abdullah-md-secret-key-32chars-1234567890'),
        iv
    );
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Combine everything
    const sessionData = {
        iv: iv.toString('hex'),
        encrypted,
        authTag,
        version: '1.0',
        algorithm: 'aes-256-gcm'
    };
    
    return Buffer.from(JSON.stringify(sessionData)).toString('base64');
}

// Decrypt session ID
export function decryptSessionId(encryptedSessionId) {
    try {
        const sessionData = JSON.parse(Buffer.from(encryptedSessionId, 'base64').toString('utf8'));
        
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            Buffer.from(process.env.SESSION_SECRET || 'abdullah-md-secret-key-32chars-1234567890'),
            Buffer.from(sessionData.iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(sessionData.authTag, 'hex'));
        
        let decrypted = decipher.update(sessionData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
    } catch (error) {
        throw new Error('Invalid session ID');
    }
}

// Validate session ID
export function validateSessionId(sessionId) {
    try {
        const data = decryptSessionId(sessionId);
        
        // Check if session is expired (30 days)
        const sessionAge = Date.now() - data.timestamp;
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        
        if (sessionAge > maxAge) {
            return { valid: false, reason: 'Session expired' };
        }
        
        return { valid: true, data };
    } catch (error) {
        return { valid: false, reason: error.message };
    }
}

// Save session to file
export function saveSessionToFile(sessionId, data) {
    const sessionsDir = path.join(__dirname, '../../storage/sessions');
    
    if (!fs.existsSync(sessionsDir)) {
        fs.mkdirSync(sessionsDir, { recursive: true });
    }
    
    const filePath = path.join(sessionsDir, `${sessionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    return filePath;
}

// Load session from file
export function loadSessionFromFile(sessionId) {
    const filePath = path.join(__dirname, '../../storage/sessions', `${sessionId}.json`);
    
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    }
    
    return null;
}
