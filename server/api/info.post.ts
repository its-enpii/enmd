import ytDlp from 'yt-dlp-exec'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
    const { url } = await readBody(event)

    if (!url) {
        throw createError({ statusCode: 400, statusMessage: 'URL is required' })
    }

    try {
        console.log('Fetching info for:', url)
        
        // --dump-single-json gives us everything we need without downloading
        const output = await ytDlp(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true,
            // You might want to pass cookies or user agent here if strict
        })

        // Simplify formats for the UI
        // We want to find "best video + best audio" combos or pre-merged formats
        // For UI simplicity, let's just offer a few standard resolutions
        
        const formats = []  
        const availableFormats = output.formats || []

        // Helper to check if a format has audio
        const hasAudio = (f: any) => f.acodec !== 'none'
        const hasVideo = (f: any) => f.vcodec !== 'none'

        // 1080p
        if (availableFormats.some((f: any) => f.height >= 1080)) {
            formats.push({ label: '1080p (HD)', id: '1080', ext: 'mp4', hasAudio: true })
        }
        // 720p
        if (availableFormats.some((f: any) => f.height >= 720)) {
            formats.push({ label: '720p (HD)', id: '720', ext: 'mp4', hasAudio: true })
        }
        // 480p
        if (availableFormats.some((f: any) => f.height >= 480)) {
            formats.push({ label: '480p', id: '480', ext: 'mp4', hasAudio: true })
        }
        // 360p
        formats.push({ label: '360p', id: '360', ext: 'mp4', hasAudio: true })
        
        // Audio Only
        formats.push({ label: 'Audio Only', id: 'audio', ext: 'mp3', hasAudio: true })

        return {
            title: output.title,
            thumbnail: output.thumbnail,
            author: output.uploader,
            duration: output.duration_string,
            formats: formats
        }

    } catch (error: any) {
        console.error('yt-dlp info error:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch video info'
        })
    }
})
