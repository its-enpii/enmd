import { ref } from 'vue'

export const useDownloader = () => {
    const loading = ref(false)
    const error = ref<string | null>(null)
    const data = ref<any>(null)

    const fetchVideoInfo = async (url: string) => {
        if (!url) return

        loading.value = true
        error.value = null
        data.value = null

        try {
            const response = await fetch('/api/info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    url: url
                })
            })

            const result = await response.json()

            if (result.status === 'error') {
                throw new Error(result.text || 'Failed to fetch video info')
            }

            data.value = { ...result, originalUrl: url }
        } catch (err: any) {
            error.value = err.message || 'An error occurred'
            console.error(err)
        } finally {
            loading.value = false
        }
    }

    const renderVideo = async (url: string, quality: string) => {
        try {
            const response = await fetch('/api/render', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url, quality })
            })
            
            const result = await response.json()
            if (result.status === 'success') {
                return result.filename
            } else {
                throw new Error('Render failed')
            }
        } catch (err: any) {
            console.error('Render error:', err)
            throw new Error(err.message || 'Failed to render video')
        }
    }

    return {
        loading,
        error,
        data,
        fetchVideoInfo,
        renderVideo
    }
}
