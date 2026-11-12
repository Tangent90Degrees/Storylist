/**
 * Storier custom elements: <wa-icon>, <wa-button>, <wa-button-group>
 *
 * Drop-in replacements for the Web Awesome 3.x component API — same
 * attributes, same events, same CSS targeting, fully offline.
 * Icons are served from the local Font Awesome 6 Free bundle (icon-svgs.js).
 *
 * No CDN, no Shadow DOM, no external runtime — just plain custom elements.
 */

import { ICON_SVGS } from '../data/icon-svgs.js'

// ── wa-icon ──────────────────────────────────────────────────────────────────
//
// Attributes:
//   name    — Font Awesome icon name (required)
//   variant — "solid" (default) | "regular"
//   library — ignored (kept for API compatibility with WA)
//
// Falls back to the solid variant if a regular SVG is missing.

class WaIcon extends HTMLElement {
    static get observedAttributes() {
        return ['name', 'variant', 'library']
    }

    connectedCallback() {
        this._render()
    }

    attributeChangedCallback() {
        if (this.isConnected) this._render()
    }

    _render() {
        const name    = this.getAttribute('name')    || ''
        const variant = this.getAttribute('variant') || 'solid'
        const data =
            ICON_SVGS[variant]?.[name] ??
            ICON_SVGS.solid?.[name]

        if (!data) {
            // Unknown icon: render an empty 1em box so layout is preserved
            this.innerHTML =
                '<svg viewBox="0 0 512 512" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"></svg>'
            return
        }

        this.innerHTML =
            `<svg viewBox="${data.v}" aria-hidden="true" ` +
            `xmlns="http://www.w3.org/2000/svg" fill="currentColor">${data.p}</svg>`
    }
}

// ── wa-button ────────────────────────────────────────────────────────────────
//
// Attributes:
//   variant    — "neutral" (default) | "brand" | "danger"
//   appearance — "solid" (default) | "outlined" | "text"
//   size       — "m" (default) | "s" | "l"
//   disabled   — presence disables interaction
//   type       — forwarded to inner <button>
//
// Light DOM (no Shadow DOM) so existing querySelector()/closest() calls,
// event delegation, and CSS targeting all keep working unchanged.
//
// slot="prefix" children are hoisted to the front and the slot attribute
// is stripped, so the icon visually precedes any text content.

class WaButton extends HTMLElement {
    static get observedAttributes() {
        return ['variant', 'appearance', 'size', 'disabled', 'type']
    }

    connectedCallback() {
        if (this._init) {
            this._syncAttrs()
            return
        }
        this._init = true

        // Hoist slot="prefix" children to the front, in document order.
        const prefix = []
        for (const child of [...this.childNodes]) {
            if (
                child.nodeType === Node.ELEMENT_NODE &&
                child.getAttribute &&
                child.getAttribute('slot') === 'prefix'
            ) {
                child.removeAttribute('slot')
                prefix.push(child)
            }
        }
        for (let i = prefix.length - 1; i >= 0; i--) {
            this.insertBefore(prefix[i], this.firstChild)
        }

        // Accessibility: behave like a real button for keyboard users.
        this.setAttribute('role', 'button')
        if (!this.hasAttribute('tabindex') && !this.hasAttribute('disabled')) {
            this.setAttribute('tabindex', '0')
        }

        this.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                this.click()
            }
        })

        // Reflect disabled → tabindex removal
        this._syncAttrs()
    }

    attributeChangedCallback() {
        this._syncAttrs()
    }

    _syncAttrs() {
        if (!this._init) return
        const disabled = this.hasAttribute('disabled')
        if (disabled) this.removeAttribute('tabindex')
        else if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0')
    }

    get disabled() {
        return this.hasAttribute('disabled')
    }
    set disabled(v) {
        if (v) this.setAttribute('disabled', '')
        else this.removeAttribute('disabled')
    }
}

// ── wa-button-group ───────────────────────────────────────────────────────────
//
// Purely visual wrapper; CSS handles the connected-border look.

class WaButtonGroup extends HTMLElement {
    connectedCallback() {
        this.setAttribute('role', 'group')
    }
}

// ── Register (guard against double-definition) ──────────────────────────────

if (!customElements.get('wa-icon'))         customElements.define('wa-icon', WaIcon)
if (!customElements.get('wa-button'))       customElements.define('wa-button', WaButton)
if (!customElements.get('wa-button-group')) customElements.define('wa-button-group', WaButtonGroup)
