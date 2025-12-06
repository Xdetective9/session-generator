const express = require('express');
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '.')));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'abdullah-md-secret-key-2023',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// In-memory storage for demo (use database in production)
const sessionsStore = new Map();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API to generate session
app.post('/api/generate-session', (req, res) => {
    try {
        const { sessionName, sessionType, security } = req.body;
        
        // Generate session ID
        const sessionId = crypto.randomBytes(16).toString('hex');
        
        // Generate pair code
        const pairCode = generateFormattedPairCode();
        
        // Create session object
        const sessionData = {
            id: sessionId,
            name: sessionName || 'abdullah-md-session',
            type: sessionType || 'whatsapp',
            security: security || 'high',
            pairCode: pairCode,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            status: 'active'
        };
        
        // Store session
        sessionsStore.set(sessionId, sessionData);
        
        // Limit store size
        if (sessionsStore.size > 100) {
            const firstKey = sessionsStore.keys().next().value;
            sessionsStore.delete(firstKey);
        }
        
        res.json({
            success: true,
            session: sessionData
        });
    } catch (error) {
        console.error('Error generating session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate session'
        });
    }
});

// API to validate pair code
app.post('/api/validate-pair', (req, res) => {
    try {
        const { pairCode } = req.body;
        
        if (!pairCode) {
            return res.json({
                success: false,
                message: 'Pair code is required'
            });
        }
        
        // Find session by pair code
        let sessionData = null;
        for (const [id, session] of sessionsStore.entries()) {
            if (session.pairCode === pairCode) {
                sessionData = session;
                break;
            }
        }
        
        if (sessionData) {
            // Check if session is expired
            if (new Date(sessionData.expiresAt) < new Date()) {
                return res.json({
                    success: false,
                    message: 'Session has expired'
                });
            }
            
            return res.json({
                success: true,
                session: sessionData
            });
        } else {
            return res.json({
                success: false,
                message: 'Invalid pair code'
            });
        }
    } catch (error) {
        console.error('Error validating pair code:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate pair code'
        });
    }
});

// API to get recent sessions
app.get('/api/recent-sessions', (req, res) => {
    try {
        const sessions = Array.from(sessionsStore.values())
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10);
        
        res.json({
            success: true,
            sessions: sessions
        });
    } catch (error) {
        console.error('Error getting recent sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get recent sessions'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Helper function to generate formatted pair code
function generateFormattedPairCode() {
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part3 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part4 = crypto.randomBytes(2).toString('hex').toUpperCase();
    
    return `${part1}-${part2}-${part3}-${part4}`;
}

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});
