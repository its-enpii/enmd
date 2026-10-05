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

/**
 * Generate a unique ID that works even in insecure contexts (HTTP / mobile webviews).
 * `crypto.randomUUID()` is only available in secure contexts (HTTPS / localhost).
 */
const generateId = (): string => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        try {
            return crypto.randomUUID();
        } catch (e) {}
    }
    return "h_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 9);
};

export const useHistory = () => {
    const history = useCookie<HistoryItem[]>('download_history', {
        default: () => [],
        maxAge: 60 * 60 * 24 * 365, // 1 year
        watch: true
    })

    const addToHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
        // History persistence must never break the actual download flow.
        try {
            // Avoid duplicates (by URL)
            const exists = history.value.find(h => h.url === item.url)
            if (exists) {
                // Update timestamp to now to move it to top if we sort by time
                exists.timestamp = Date.now()
                return
            }

            history.value.unshift({
                ...item,
                id: generateId(),
                timestamp: Date.now()
            })

            // Limit to 50 items
            if (history.value.length > 50) {
                history.value.pop()
            }
        } catch (e) {
            console.warn("Failed to save history:", e);
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
