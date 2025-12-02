import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Store active connections
const activeSessions = new Map();

// Generate pairing code
export async function generatePairingCode(number, sessionId) {
    try {
        const sessionDir = path.join('./sessions', sessionId);
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }
        
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();
        
        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state,
            connectTimeoutMs: 60000
        });
        
        sock.ev.on('creds.update', saveCreds);
        
        // Store socket in active sessions
        activeSessions.set(sessionId, sock);
        
        // Generate pairing code
        const code = await sock.requestPairingCode(number);
        
        // Monitor connection
        sock.ev.on('connection.update', (update) => {
            const { connection } = update;
            
            if (connection === 'open') {
                // Update session status
                const sessionFile = path.join('./sessions', `${sessionId}.json`);
                if (fs.existsSync(sessionFile)) {
                    const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
                    data.status = 'connected';
                    data.connectedAt = new Date().toISOString();
                    fs.writeFileSync(sessionFile, JSON.stringify(data, null, 2));
                }
                
                // Save credentials
                const credsFile = path.join('./sessions', `${sessionId}_creds.json`);
                fs.writeFileSync(credsFile, JSON.stringify(state.creds, null, 2));
            }
        });
        
        return code;
        
    } catch (error) {
        console.error('Pairing error:', error);
        throw error;
    }
}

// Generate QR code
export async function getQRCode(sessionId) {
    return new Promise(async (resolve) => {
        try {
            const sessionDir = path.join('./sessions', sessionId);
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }
            
            const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
            const { version } = await fetchLatestBaileysVersion();
            
            const sock = makeWASocket({
                version,
                logger: pino({ level: 'silent' }),
                printQRInTerminal: false,
                auth: state,
                connectTimeoutMs: 60000
            });
            
            sock.ev.on('creds.update', saveCreds);
            activeSessions.set(sessionId, sock);
            
            sock.ev.on('connection.update', (update) => {
                const { connection, qr } = update;
                
                if (qr) {
                    // Generate QR code as data URL
                    QRCode.toDataURL(qr, (err, url) => {
                        if (!err) resolve(url);
                    });
                }
                
                if (connection === 'open') {
                    // Save credentials
                    const sessionFile = path.join('./sessions', `${sessionId}.json`);
                    if (fs.existsSync(sessionFile)) {
                        const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
                        data.status = 'connected';
                        data.connectedAt = new Date().toISOString();
                        fs.writeFileSync(sessionFile, JSON.stringify(data, null, 2));
                    }
                    
                    const credsFile = path.join('./sessions', `${sessionId}_creds.json`);
                    fs.writeFileSync(credsFile, JSON.stringify(state.creds, null, 2));
                }
            });
            
        } catch (error) {
            resolve(null);
        }
    });
}

// Check session status
export async function checkSessionStatus(sessionId) {
    const credsFile = path.join('./sessions', `${sessionId}_creds.json`);
    
    if (!fs.existsSync(credsFile)) {
        return { connected: false, message: 'No credentials found' };
    }
    
    try {
        const creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
        return {
            connected: !!creds.me,
            me: creds.me,
            registered: creds.registered
        };
    } catch (error) {
        return { connected: false, error: error.message };
    }
}
