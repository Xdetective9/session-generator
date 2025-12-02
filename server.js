import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { generateSession, getSessionStatus, deleteSession } from './routes/api.js';
import { cleanupSessions } from './utils/cleanup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Create sessions directory
if (!fs.existsSync('./sessions')) {
    fs.mkdirSync('./sessions');
}

// Routes
app.use('/api', (await import('./routes/api.js')).default);

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║      ＡＢＤＵＬＬＡＨ ＳＥＳＳＩＯＮ      ║
║         ＧＥＮＥＲＡＴＯＲ Ｖ１．０      ║
╚══════════════════════════════════════════╝
    
🌐 Server running: http://localhost:${PORT}
🔗 API Endpoint: http://localhost:${PORT}/api/generate
📱 Use: http://localhost:${PORT}/api/generate?number=923288055104
    `);
    
    // Cleanup old sessions every hour
    setInterval(cleanupSessions, 3600000);
});
