// Thin wrapper around localStorage. All of Storier's state is serialised
// to a single key so it is easy to export/inspect.

const KEY = 'storier-data'

const Storage = {
    save(data) {
        try {
            localStorage.setItem(KEY, JSON.stringify(data))
            return true
        } catch (e) {
            console.error('[Storier] Failed to save data', e)
            return false
        }
    },

    load() {
        try {
            const raw = localStorage.getItem(KEY)
            return raw ? JSON.parse(raw) : null
        } catch (e) {
            console.error('[Storier] Failed to load data', e)
            return null
        }
    },

    clear() {
        localStorage.removeItem(KEY)
    }
}

export default Storage
