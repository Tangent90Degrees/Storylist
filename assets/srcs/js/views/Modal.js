// Minimal modal controller. Renders arbitrary HTML into #modal-container,
// manages the overlay open/close, and forwards primary button actions.
// Uses <wa-button> and <wa-icon> custom elements (local, no CDN).

export default class Modal {
    constructor() {
        this.overlay = document.getElementById('modal-overlay')
        this.container = document.getElementById('modal-container')
        this.onClose = null
        this._bindOverlay()
    }

    _bindOverlay() {
        this.overlay.addEventListener('click', e => {
            if (e.target === this.overlay && this.onClose) this.close()
        })
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && !this.overlay.classList.contains('hidden'))
                this.close()
        })
    }

    open(html, onClose) {
        this.onClose = onClose || null
        this.container.innerHTML = html
        this.overlay.classList.remove('hidden')
        document.body.style.overflow = 'hidden'
        this._focusFirst()
    }

    close() {
        this.overlay.classList.add('hidden')
        this.container.innerHTML = ''
        document.body.style.overflow = ''
        if (this.onClose) this.onClose()
        this.onClose = null
    }

    isOpen() {
        return !this.overlay.classList.contains('hidden')
    }

    _focusFirst() {
        const first = this.container.querySelector(
            'input:not([type=hidden]), textarea, select, [data-focusable], wa-input, wa-textarea, wa-select')
        if (first) setTimeout(() => {
            // wa-* components expose focus() via shadow DOM host
            if (typeof first.focus === 'function') first.focus()
            else if (first.setFocus) first.setFocus()
        }, 80)
    }
}
