// Small shared helpers used across models and views.

export function uuid() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
}

export function formatDate(dateStr) {
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined,
        { month: 'short', day: 'numeric', year: 'numeric' })
}

export function relativeTime(dateStr) {
    const d = new Date(dateStr)
    const diff = Date.now() - d.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return formatDate(dateStr)
}

// Strip markdown markers so we can show a short plain-text snippet on cards.
export function stripMarkdown(text) {
    if (!text) return ''
    return text
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/^\s*>\s+/gm, '')
        .replace(/\n+/g, ' ')
        .trim()
}

export function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function debounce(fn, ms = 200) {
    let timer
    return (...args) => {
        clearTimeout(timer)
        timer = setTimeout(() => fn(...args), ms)
    }
}

// Update the CSS custom properties on a .seg-ctrl container so the
// sliding indicator pseudo-element moves to the active button.
// Pass instant=true to skip the transition (used on first render).
export function segCtrlUpdateIndicator(ctrl, instant = false) {
    const active = ctrl?.querySelector('.seg-btn.active')
    if (!active) return
    const ctrlRect = ctrl.getBoundingClientRect()
    const btnRect  = active.getBoundingClientRect()
    const x = btnRect.left - ctrlRect.left - 2  // subtract container padding
    const w = btnRect.width
    if (instant) {
        // Suppress transition, set position, re-enable in next frame
        ctrl.style.setProperty('--seg-no-transition', '1')
        ctrl.style.setProperty('--seg-x', `${x}px`)
        ctrl.style.setProperty('--seg-w', `${w}px`)
        requestAnimationFrame(() => ctrl.style.removeProperty('--seg-no-transition'))
    } else {
        ctrl.style.setProperty('--seg-x', `${x}px`)
        ctrl.style.setProperty('--seg-w', `${w}px`)
    }
}

// Bind a .seg-ctrl container: on each button click, toggle .active and
// animate the indicator. Calls onSelect(value) with the clicked button's
// data-value or data-tab attribute.
export function bindSegCtrl(ctrl, onSelect) {
    if (!ctrl) return
    // Set initial indicator position (defer so layout is settled)
    requestAnimationFrame(() => segCtrlUpdateIndicator(ctrl))
    ctrl.querySelectorAll('.seg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            ctrl.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'))
            btn.classList.add('active')
            segCtrlUpdateIndicator(ctrl)
            const val = btn.dataset.value ?? btn.dataset.tab ?? btn.dataset.category
            onSelect?.(val, btn)
        })
    })
}
