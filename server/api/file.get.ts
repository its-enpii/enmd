import { join } from 'path'
import fs from 'fs'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const filename = query.filename as string
    const downloadName = query.name as string // Optional custom name
    
    if (!filename) {
        throw createError({ statusCode: 400, statusMessage: 'Missing filename' })
    }

    // Security check: unexpected characters in filename to prevent traversal
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
         throw createError({ statusCode: 400, statusMessage: 'Invalid filename' })
    }

    const filePath = join(process.cwd(), 'downloads', filename)

    if (!fs.existsSync(filePath)) {
        throw createError({ statusCode: 404, statusMessage: 'File not found or expired' })
    }

    try {
        // Use provided name or default to system filename
        const finalName = downloadName ? downloadName : filename
        
        // Set headers for download
        setHeader(event, 'Content-Disposition', `attachment; filename="${finalName}"`)
        setHeader(event, 'Content-Type', filename.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4')
        
        // Setup cleanup after sending
        event.node.res.on('finish', () => {
             setTimeout(() => {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath)
                    console.log('Deleted temp file:', filePath)
                }
             }, 1000 * 60) // 1 minute buffer after finish
        })

        return sendStream(event, fs.createReadStream(filePath))

    } catch (error: any) {
        console.error('File serving error:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to serve file'
        })
    }
})
