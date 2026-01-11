import fs from 'node:fs'
import path from 'node:path'

export default defineNitroPlugin((nitroApp) => {
    console.log('🧹 [Cleanup] File cleanup plugin initialized')

    const CLEANUP_INTERVAL = 10 * 60 * 1000 // Run every 10 minutes
    const MAX_AGE = 60 * 60 * 1000 // 1 hour in milliseconds
    const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads')

    // Ensure directory exists (optional, but good for safety)
    if (!fs.existsSync(DOWNLOADS_DIR)) {
        try {
            fs.mkdirSync(DOWNLOADS_DIR)
        } catch (err) {
            // Ignore error if it's just about creation race
        }
    }

    setInterval(() => {
        console.log('🧹 [Cleanup] Running scheduled cleanup...')
        
        fs.readdir(DOWNLOADS_DIR, (err, files) => {
            if (err) {
                console.error('❌ [Cleanup] Failed to read downloads dir:', err)
                return
            }

            const now = Date.now()
            let deletedCount = 0

            files.forEach((file) => {
                // Skip .gitkeep or similar strictly system files if any, though usually none in downloads
                if (file === '.gitkeep') return

                const filePath = path.join(DOWNLOADS_DIR, file)
                
                fs.stat(filePath, (err, stats) => {
                    if (err) return

                    const age = now - stats.mtimeMs
                    if (age > MAX_AGE) {
                        fs.unlink(filePath, (err) => {
                           if (err) {
                               console.error(`❌ [Cleanup] Failed to delete ${file}:`, err)
                           } else {
                               console.log(`🗑️ [Cleanup] Deleted old file: ${file}`)
                               deletedCount++
                           }
                        })
                    }
                })
            })
            
            // We can't log total deleted here strictly because of async fs.unlink, 
            // but the individual logs will show activity.
        })
    }, CLEANUP_INTERVAL)
})
