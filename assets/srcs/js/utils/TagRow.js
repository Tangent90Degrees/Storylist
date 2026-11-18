/**
 * TagRow — custom element for single-line tag display with three-step overflow.
 * BadgeRow — same algorithm for board card badge rows.
 *
 * TagRow.render(tags)   → '<tag-row>…</tag-row>'
 * BadgeRow.render(innerHtmlItems[])  → '<badge-row>…</badge-row>'
 *
 * Both custom elements self-manage layout via ResizeObserver.
 *
 * Step 1: show all items (icon + text).
 * Step 2: starting from last, collapse each to icon-only (hide text span).
 * Step 3: if still overflowing, fold remaining into "+N".
 */

// ── Shared base ───────────────────────────────────────────────────────────────

class OverflowRowBase extends HTMLElement {
    // Subclasses set these:
    get _itemSel()    { return '' }   // selector for each item
    get _compactCls() { return '' }   // class added in step 2
    get _moreCls()    { return '' }   // class for the +N element

    connectedCallback() {
        requestAnimationFrame(() => requestAnimationFrame(() => this._layout()))
        this._ro = new ResizeObserver(() => this._layout())
        this._ro.observe(this)
    }

    disconnectedCallback() {
        this._ro?.disconnect()
        this._ro = null
    }

    _layout() {
        // Step 1 — reset
        this.querySelector(`.${this._moreCls}`)?.remove()
        this.querySelectorAll(this._itemSel).forEach(p => p.classList.remove(this._compactCls))

        if (this.scrollWidth <= this.clientWidth) return

        const items = [...this.querySelectorAll(this._itemSel)]
        if (!items.length) return

        // Step 2 — collapse from last to first
        for (let i = items.length - 1; i >= 0; i--) {
            items[i].classList.add(this._compactCls)
            if (this.scrollWidth <= this.clientWidth) return
        }

        // Step 3 — fold compacted items from end into +N
        let hidden = 0
        const compacted = [...this.querySelectorAll(`.${this._compactCls}`)]
        for (let i = compacted.length - 1; i >= 0; i--) {
            compacted[i].remove()
            hidden++

            let more = this.querySelector(`.${this._moreCls}`)
            if (!more) {
                more = document.createElement('span')
                more.className = this._moreCls
                this.appendChild(more)
            }
            more.textContent = `+${hidden}`

            if (this.scrollWidth <= this.clientWidth) return
        }
    }
}

// ── TagRowElement ─────────────────────────────────────────────────────────────

class TagRowElement extends OverflowRowBase {
    get _itemSel()    { return '.tag-pill' }
    get _compactCls() { return 'tag-pill-compact' }
    get _moreCls()    { return 'tag-pill-more' }

    setTags(tags) {
        this.innerHTML = this._pillsHtml(tags)
        requestAnimationFrame(() => requestAnimationFrame(() => this._layout()))
    }

    _pillsHtml(tags) {
        return (tags || []).map(tag => {
            const first = (tag[0] || '').replace(/"/g, '&quot;')
            const safe  = tag.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            return `<span class="tag-pill" data-first="${first}"><span class="tag-pill-text">${safe}</span></span>`
        }).join('')
    }
}

// ── BadgeRowElement ───────────────────────────────────────────────────────────

class BadgeRowElement extends OverflowRowBase {
    get _itemSel()    { return '.bc-badge' }
    get _compactCls() { return 'bc-badge-compact' }
    get _moreCls()    { return 'bc-badge-more' }
}

// ── Register ──────────────────────────────────────────────────────────────────

if (!customElements.get('tag-row'))   customElements.define('tag-row',   TagRowElement)
if (!customElements.get('badge-row')) customElements.define('badge-row', BadgeRowElement)

// ── Static helpers ────────────────────────────────────────────────────────────

export class TagRow {
    static render(tags) {
        if (!tags || !tags.length) return ''
        const pills = tags.map(tag => {
            const first = (tag[0] || '').replace(/"/g, '&quot;')
            const safe  = tag.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            return `<span class="tag-pill" data-first="${first}"><span class="tag-pill-text">${safe}</span></span>`
        }).join('')
        return `<tag-row>${pills}</tag-row>`
    }
}

export class BadgeRow {
    /**
     * Wraps pre-built badge HTML strings in a <badge-row> element.
     * Each item should contain a `.bc-badge-text` span for the compact step.
     * @param {string[]} innerItems — array of '<span class="bc-badge" …>…</span>' strings
     * @returns {string}
     */
    static render(innerItems) {
        if (!innerItems || !innerItems.length) return ''
        return `<badge-row>${innerItems.join('')}</badge-row>`
    }
}
