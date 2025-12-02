import fs from 'fs';
import path from 'path';

export function cleanupSessions() {
    const sessionsDir = './sessions';
    
    if (!fs.existsSync(sessionsDir)) return;
    
    const files = fs.readdirSync(sessionsDir);
    const now = Date.now();
    
    files.forEach(file => {
        const filePath = path.join(sessionsDir, file);
        
        try {
            if (file.endsWith('.json') && !file.includes('_creds')) {
                const stats = fs.statSync(filePath);
                const sessionAge = now - stats.mtimeMs;
                
                // Delete sessions older than 24 hours
                if (sessionAge > 24 * 60 * 60 * 1000) {
                    fs.unlinkSync(filePath);
                    
                    // Also delete credentials file
                    const credsFile = path.join(sessionsDir, file.replace('.json', '_creds.json'));
                    if (fs.existsSync(credsFile)) {
                        fs.unlinkSync(credsFile);
                    }
                    
                    console.log(`🧹 Cleaned up old session: ${file}`);
                }
            }
        } catch (error) {
            console.error(`Cleanup error for ${file}:`, error.message);
        }
    });
}
