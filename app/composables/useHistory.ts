export interface HistoryItem {
    id: string;
    title: string;
    thumbnail: string;
    url: string;
    platform: string;
    author?: string;
    duration?: string;
    timestamp: number;
}

export const useHistory = () => {
    const history = useCookie<HistoryItem[]>('download_history', {
        default: () => [],
        maxAge: 60 * 60 * 24 * 365, // 1 year
        watch: true
    })

    const addToHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
        // Avoid duplicates (by URL)
        const exists = history.value.find(h => h.url === item.url)
        if (exists) {
            // Update timestamp to now to move it to top if we sort by time
            exists.timestamp = Date.now()
            return
        }

        history.value.unshift({
            ...item,
            id: crypto.randomUUID(),
            timestamp: Date.now()
        })
        
        // Limit to 50 items
        if (history.value.length > 50) {
            history.value.pop()
        }
    }

    const clearHistory = () => {
        history.value = []
    }

    const removeHistoryItem = (id: string) => {
        history.value = history.value.filter(h => h.id !== id)
    }

    return {
        history,
        addToHistory,
        clearHistory,
        removeHistoryItem
    }
}
