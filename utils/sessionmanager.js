// Session Manager Utility
const crypto = require('crypto');

class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.pairCodes = new Map();
    }

    // Generate a new session
    generateSession(sessionName, sessionType = 'whatsapp', security = 'high') {
        const sessionId = this.generateSecureId(32);
        const pairCode = this.generatePairCode();
        
        const sessionData = {
            id: sessionId,
            name: sessionName,
            type: sessionType,
            security: security,
            pairCode: pairCode,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            status: 'active',
            devices: []
        };
        
        // Store session
        this.sessions.set(sessionId, sessionData);
        this.pairCodes.set(pairCode, sessionId);
        
        // Cleanup expired sessions
        this.cleanupExpiredSessions();
        
        return sessionData;
    }

    // Validate pair code
    validatePairCode(pairCode) {
        // Cleanup expired sessions first
        this.cleanupExpiredSessions();
        
        const sessionId = this.pairCodes.get(pairCode);
        
        if (!sessionId) {
            return { valid: false, message: 'Invalid pair code' };
        }
        
        const session = this.sessions.get(sessionId);
        
        if (!session) {
            return { valid: false, message: 'Session not found' };
        }
        
        // Check if session is expired
        if (new Date(session.expiresAt) < new Date()) {
            this.sessions.delete(sessionId);
            this.pairCodes.delete(pairCode);
            return { valid: false, message: 'Session has expired' };
        }
        
        return { 
            valid: true, 
            session: session 
        };
    }

    // Pair device with session
    pairDevice(pairCode, deviceInfo) {
        const validation = this.validatePairCode(pairCode);
        
        if (!validation.valid) {
            return validation;
        }
        
        const session = validation.session;
        
        // Add device to session
        const device = {
            id: this.generateSecureId(16),
            name: deviceInfo.name || 'Unknown Device',
            pairedAt: new Date().toISOString(),
            lastActive: new Date().toISOString()
        };
        
        session.devices.push(device);
        
        // Update session
        this.sessions.set(session.id, session);
        
        return {
            success: true,
            session: session,
            device: device
        };
    }

    // Get session by ID
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }

    // Get all active sessions
    getActiveSessions(limit = 10) {
        const activeSessions = Array.from(this.sessions.values())
            .filter(session => session.status === 'active')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);
        
        return activeSessions;
    }

    // Generate secure ID
    generateSecureId(length) {
        return crypto.randomBytes(Math.ceil(length / 2))
            .toString('hex')
            .slice(0, length);
    }

    // Generate pair code (formatted)
    generatePairCode() {
        const part1 = this.generateSecureId(4).toUpperCase();
        const part2 = this.generateSecureId(4).toUpperCase();
        const part3 = this.generateSecureId(4).toUpperCase();
        const part4 = this.generateSecureId(4).toUpperCase();
        
        return `${part1}-${part2}-${part3}-${part4}`;
    }

    // Cleanup expired sessions
    cleanupExpiredSessions() {
        const now = new Date();
        
        for (const [sessionId, session] of this.sessions.entries()) {
            if (new Date(session.expiresAt) < now) {
                // Remove expired session
                this.sessions.delete(sessionId);
                this.pairCodes.delete(session.pairCode);
            }
        }
    }

    // Get statistics
    getStats() {
        this.cleanupExpiredSessions();
        
        return {
            totalSessions: this.sessions.size,
            activeSessions: Array.from(this.sessions.values())
                .filter(s => s.status === 'active').length,
            expiredSessions: Array.from(this.sessions.values())
                .filter(s => new Date(s.expiresAt) < new Date()).length,
            totalDevices: Array.from(this.sessions.values())
                .reduce((sum, session) => sum + session.devices.length, 0)
        };
    }
}

module.exports = SessionManager;
