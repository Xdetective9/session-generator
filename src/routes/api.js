import express from 'express';
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } from '@whiskeysockets/baileys';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSessionId } from '../utils/sessionManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Store active pairing sessions
const activeSessions = new Map();

// 📱 Generate pairing code
router.post('/generate-code', async (req, res) => {
    try {
        const { number } = req.body;
        
        if (!number || number.length < 10) {
            return res.status(400).json({ 
                success: false, 
                error: 'Valid phone number required' 
            });
        }

        const cleanNumber = number.replace(/\D/g, '');
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create new session directory
        const sessionDir = path.join(__dirname, '../../sessions', sessionId);
        
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'error' }),
            printQRInTerminal: false,
            auth: state,
            browser: Browsers.ubuntu('Chrome'),
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000
        });

        // Generate real pairing code
        const pairingCode = await sock.requestPairingCode(cleanNumber);
        
        // Store session info
        activeSessions.set(sessionId, {
            sock,
            number: cleanNumber,
            pairingCode,
            createdAt: Date.now(),
            status: 'pending'
        });

        // Clean up after 5 minutes
        setTimeout(() => {
            if (activeSessions.has(sessionId)) {
                activeSessions.delete(sessionId);
            }
        }, 5 * 60 * 1000);

        res.json({
            success: true,
            sessionId,
            pairingCode,
            message: 'Enter this code in WhatsApp → Settings → Linked Devices'
        });

    } catch (error) {
        console.error('Pairing error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 🔍 Check session status
router.get('/session/:sessionId/status', (req, res) => {
    const { sessionId } = req.params;
    const session = activeSessions.get(sessionId);
    
    if (!session) {
        return res.status(404).json({ 
            success: false, 
            error: 'Session not found' 
        });
    }

    res.json({
        success: true,
        status: session.status,
        number: session.number,
        pairingCode: session.pairingCode,
        createdAt: session.createdAt
    });
});

// 📥 Get session credentials
router.get('/session/:sessionId/credentials', async (req, res) => {
    const { sessionId } = req.params;
    const session = activeSessions.get(sessionId);
    
    if (!session) {
        return res.status(404).json({ 
            success: false, 
            error: 'Session not found' 
        });
    }

    try {
        const sessionDir = path.join(__dirname, '../../sessions', sessionId);
        const credsPath = path.join(sessionDir, 'creds.json');
        
        // Read credentials
        const fs = await import('fs');
        if (fs.existsSync(credsPath)) {
            const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
            
            // Generate final session ID for bot
            const finalSessionId = generateSessionId(creds);
            
            // Clean up session
            activeSessions.delete(sessionId);
            
            res.json({
                success: true,
                sessionId: finalSessionId,
                credentials: creds,
                message: 'Session generated successfully'
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'Credentials not found' 
            });
        }
    } catch (error) {
        console.error('Credential error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 🗑️ Delete session
router.delete('/session/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    
    if (activeSessions.has(sessionId)) {
        const session = activeSessions.get(sessionId);
        if (session.sock) {
            session.sock.end();
        }
        activeSessions.delete(sessionId);
    }

    res.json({ 
        success: true, 
        message: 'Session deleted' 
    });
});

// 📊 Get stats
router.get('/stats', (req, res) => {
    res.json({
        success: true,
        activeSessions: activeSessions.size,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: Date.now()
    });
});

export default router;
