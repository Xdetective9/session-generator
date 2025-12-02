import { Router } from 'express';
import { generateSessionId, getQRCode, checkSessionStatus } from '../utils/sessionManager.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Generate new session
router.get('/generate', async (req, res) => {
    try {
        const { number, method = 'qr' } = req.query;
        
        if (!number) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required',
                usage: '/api/generate?number=923288055104'
            });
        }
        
        // Clean number
        const cleanNumber = number.replace(/\D/g, '');
        
        if (cleanNumber.length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number'
            });
        }
        
        // Generate session ID
        const sessionId = uuidv4().replace(/-/g, '');
        const sessionData = {
            sessionId,
            number: cleanNumber,
            method,
            status: 'pending',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        };
        
        // Save session info
        const sessionFile = path.join('./sessions', `${sessionId}.json`);
        fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
        
        // Different response based on method
        if (method === 'pairing') {
            // Generate pairing code
            const pairingCode = await generatePairingCode(cleanNumber, sessionId);
            
            return res.json({
                success: true,
                sessionId,
                method: 'pairing',
                code: pairingCode,
                instructions: [
                    '1. Open WhatsApp on your phone',
                    '2. Go to Settings → Linked Devices → Link a Device',
                    `3. Enter code: ${pairingCode}`,
                    `4. Use this Session ID in your bot: ${sessionId}`,
                    `5. Session valid for 24 hours`
                ],
                sessionUrl: `http://localhost:3000/api/session/${sessionId}`
            });
        } else {
            // QR code method
            const qrData = await getQRCode(sessionId);
            
            return res.json({
                success: true,
                sessionId,
                method: 'qr',
                qr: qrData,
                instructions: [
                    '1. Scan QR code with WhatsApp',
                    '2. Wait for connection',
                    `3. Use this Session ID: ${sessionId}`,
                    `4. Session valid for 24 hours`
                ],
                sessionUrl: `http://localhost:3000/api/session/${sessionId}`
            });
        }
        
    } catch (error) {
        console.error('Generation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate session',
            error: error.message
        });
    }
});

// Get session status
router.get('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const sessionFile = path.join('./sessions', `${sessionId}.json`);
        
        if (!fs.existsSync(sessionFile)) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }
        
        const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
        const status = await checkSessionStatus(sessionId);
        
        return res.json({
            success: true,
            sessionId,
            status: status.connected ? 'connected' : 'pending',
            connected: status.connected,
            number: sessionData.number,
            createdAt: sessionData.createdAt,
            expiresAt: sessionData.expiresAt
        });
        
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Delete session
router.delete('/session/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const sessionFile = path.join('./sessions', `${sessionId}.json`);
        const credsFile = path.join('./sessions', `${sessionId}_creds.json`);
        
        // Delete files
        if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile);
        if (fs.existsSync(credsFile)) fs.unlinkSync(credsFile);
        
        return res.json({
            success: true,
            message: 'Session deleted successfully'
        });
        
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// List all sessions
router.get('/sessions', (req, res) => {
    try {
        const sessions = [];
        
        if (fs.existsSync('./sessions')) {
            const files = fs.readdirSync('./sessions');
            
            for (const file of files) {
                if (file.endsWith('.json') && !file.includes('_creds')) {
                    const sessionData = JSON.parse(
                        fs.readFileSync(path.join('./sessions', file), 'utf8')
                    );
                    sessions.push({
                        sessionId: sessionData.sessionId,
                        number: sessionData.number,
                        status: sessionData.status,
                        createdAt: sessionData.createdAt,
                        expiresAt: sessionData.expiresAt
                    });
                }
            }
        }
        
        return res.json({
            success: true,
            count: sessions.length,
            sessions
        });
        
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export default router;
