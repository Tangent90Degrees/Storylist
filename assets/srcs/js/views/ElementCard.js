// ElementCard — renders a single story element card.

import { getColorValue, getColorDarker, getColorLighter } from '../data/colors.js'
import { stripMarkdown, relativeTime } from '../utils/helpers.js'
import { t } from '../utils/i18n.js'

export default class ElementCard {
    constructor(el, storybook, incomingCount, callbacks) {
        this.el = el
        this.sb = storybook
        this.incomingCount = incomingCount
        this.callbacks = callbacks
    }

    // Build a label badge with optional icon, colored per the type/group
    _badge(label, colorId, icon) {
        const c   = getColorValue(colorId)
        const cdk = getColorDarker(colorId)
        const clt = getColorLighter(colorId)
        const iconHtml = icon ? `<wa-icon name="${icon}" class="badge-icon"></wa-icon>` : ''
        const safeLabel = label.replace(/"/g, '&quot;')
        const firstLetter = label[0] || ''
        return `<span class="card-badge" style="--badge-c:${c}; --badge-text:${cdk}; --badge-text-dark:${clt}"
            data-icon="${icon || ''}" data-first="${firstLetter}"
            >${iconHtml}<span class="badge-text">${label}</span></span>`
    }

    // Build type + group badges — all rendered; _fitBadges handles overflow
    _badgesHtml() {
        const type = this.sb.getType(this.el.typeId)
        const badges = []

        if (type) {
            const label = t(type.nameKey) || type.name
            badges.push(this._badge(label, type.color, type.icon))
        }
        for (const gid of this.el.groupIds || []) {
            const g = this.sb.getGroup(gid)
            if (g) badges.push(this._badge(g.name, g.color, g.icon))
        }
        if (!badges.length) return ''
        return `<div class="card-badges">${badges.join('')}</div>`
    }

    // Three-step overflow collapse for a single-line chips row.
    // container: the flex element holding chips; chipClass: the class of each chip.
    _fitChips(container, chipClass) {
        if (!container) return

        // Reset: remove any +N chip, restore all chips to full state
        container.querySelector(`.${chipClass}-more`)?.remove()
        container.querySelectorAll(`.${chipClass}`).forEach(c => c.classList.remove(`${chipClass}-compact`))

        if (container.scrollWidth <= container.clientWidth) return

        const chips = [...container.querySelectorAll(`.${chipClass}`)]
        if (!chips.length) return

        // Step 2: from last chip backward (including the first), collapse to icon/letter
        for (let i = chips.length - 1; i >= 0; i--) {
            chips[i].classList.add(`${chipClass}-compact`)
            if (container.scrollWidth <= container.clientWidth) return
        }

        // Step 3: still overflowing — fold compact chips from the end into +N.
        let hidden = 0
        const compacted = [...container.querySelectorAll(`.${chipClass}-compact`)]
        for (let i = compacted.length - 1; i >= 0; i--) {
            compacted[i].remove()
            hidden++

            let moreChip = container.querySelector(`.${chipClass}-more`)
            if (!moreChip) {
                moreChip = document.createElement('span')
                moreChip.className = `${chipClass} ${chipClass}-more`
                container.appendChild(moreChip)
            }
            moreChip.textContent = `+${hidden}`

            if (container.scrollWidth <= container.clientWidth) return
        }
    }

    // Convenience wrapper for the type/group badge row
    _fitBadges(node) {
        this._fitChips(node.querySelector('.card-badges'), 'card-badge')
    }

    // Fit all single-line enum chip rows on the card (both half-line and full-line)
    _fitPropChips(node) {
        node.querySelectorAll(
            '.prop-row-full:not(.prop-row-multi) .prop-row-values, .prop-row-values-short'
        ).forEach(c => this._fitChips(c, 'prop-chip-card'))
    }

    // Fit the keyword tags row using the same overflow algorithm
    _fitTags(node) {
        const container = node.querySelector('.card-tags')
        if (!container) return

        // card-tag uses .badge-text for the label text (same compact pattern as card-badge)
        // Reset
        container.querySelector('.card-tag-more')?.remove()
        container.querySelectorAll('.card-tag').forEach(c => c.classList.remove('card-tag-compact'))

        if (container.scrollWidth <= container.clientWidth) return

        const tags = [...container.querySelectorAll('.card-tag')]
        if (!tags.length) return

        // Step 2: collapse to first letter, from last to first
        for (let i = tags.length - 1; i >= 0; i--) {
            tags[i].classList.add('card-tag-compact')
            if (container.scrollWidth <= container.clientWidth) return
        }

        // Step 3: fold remaining into plain "+N" text
        let hidden = 0
        const compacted = [...container.querySelectorAll('.card-tag-compact')]
        for (let i = compacted.length - 1; i >= 0; i--) {
            compacted[i].remove()
            hidden++

            let more = container.querySelector('.card-tag-more')
            if (!more) {
                more = document.createElement('span')
                more.className = 'card-tag-more'
                container.appendChild(more)
            }
            more.textContent = `+${hidden}`

            if (container.scrollWidth <= container.clientWidth) return
        }
    }

    // Render an enum option chip with its icon if present
    _optChip(opt) {
        const c   = getColorValue(opt.color)
        const cdk = getColorDarker(opt.color)
        const clt = getColorLighter(opt.color)
        const label = t(opt.labelKey) || opt.label
        const iconHtml = opt.icon
            ? `<wa-icon name="${opt.icon}" class="chip-icon"></wa-icon>`
            : ''
        return `<span class="prop-chip-card" style="--chip-c:${c}; --chip-text:${cdk}; --chip-text-dark:${clt}"
            data-icon="${opt.icon || ''}" data-first="${label[0] || ''}"
            >${iconHtml}<span class="chip-text">${label}</span></span>`
    }

    _propSummary() {
        const type = this.sb.getType(this.el.typeId)
        const typeProps  = type?.properties || []
        const groupProps = (this.el.groupIds || [])
            .flatMap(gid => this.sb.getGroup(gid)?.properties || [])
        const allProps = [...typeProps, ...groupProps]
        if (!allProps.length) return ''

        const resolveDisplay = pd => {
            if (pd.cardDisplay) return pd.cardDisplay
            if (pd.showOnCard === false) return 'none'
            return pd.type === 'multi-enum' ? 'multi' : 'short'
        }

        const rows = []
        for (const pd of allProps) {
            const display = resolveDisplay(pd)
            if (display === 'none') continue
            const val = this.el.properties[pd.id]
            if (val === undefined || val === null || val === '') continue
            const label = t(pd.nameKey) || pd.name
            // 'short' = half-line (narrow); 'long' & 'multi' = full line (wide)
            const wide = display === 'long' || display === 'multi'
            // 'long' truncates to one line; 'multi' wraps
            const multiClass = display === 'multi' ? ' prop-row-multi' : ''

            if (pd.type === 'multi-enum' && Array.isArray(val)) {
                const chips = val
                    .map(oid => {
                        const opt = pd.options?.find(o => o.id === oid)
                        return opt ? this._optChip(opt) : ''
                    })
                    .filter(Boolean)
                    .join('')
                if (chips) {
                    if (wide) {
                        rows.push({ wide: true, html:
                            `<div class="prop-row-full${multiClass}"><span class="prop-row-label">${label}</span><span class="prop-row-values">${chips}</span></div>` })
                    } else {
                        rows.push({ wide: false, html:
                            `<span class="prop-row-label">${label}</span><span class="prop-row-values prop-row-values-short">${chips}</span>` })
                    }
                }
            } else if (pd.type === 'enum') {
                const opt = pd.options?.find(o => o.id === val)
                if (opt) {
                    const chip = this._optChip(opt)
                    const inner = `<span class="prop-row-label">${label}</span><span class="prop-row-value${multiClass}">${chip}</span>`
                    rows.push({ wide, html: wide
                        ? `<div class="prop-row-full${multiClass}">${inner}</div>`
                        : inner })
                }
            } else {
                const inner = `<span class="prop-row-label">${label}</span><span class="prop-row-value${multiClass}">${String(val)}</span>`
                rows.push({ wide, html: wide
                    ? `<div class="prop-row-full${multiClass}">${inner}</div>`
                    : inner })
            }
        }

        if (!rows.length) return ''

        const out = []
        let pending = []
        const flushPending = () => {
            while (pending.length >= 2) {
                out.push(`<div class="prop-grid-pair"><div class="prop-grid-cell">${pending[0]}</div><div class="prop-grid-cell">${pending[1]}</div></div>`)
                pending.splice(0, 2)
            }
            if (pending.length === 1) {
                out.push(`<div class="prop-grid-pair"><div class="prop-grid-cell">${pending[0]}</div><div class="prop-grid-cell"></div></div>`)
                pending = []
            }
        }
        for (const row of rows) {
            if (row.wide) {
                flushPending()
                out.push(row.html)
            } else {
                pending.push(row.html)
            }
        }
        flushPending()

        return `<div class="card-props">${out.join('')}</div>`
    }

    render() {
        const { el, sb } = this
        const colorVal  = getColorValue(el.color)
        const desc      = stripMarkdown(el.description)
        const totalConn = el.relationships.length + this.incomingCount

        // Render all tags — _fitTags handles overflow after mount
        const tagHtml = el.tags.length
            ? el.tags.map(tag =>
                `<span class="card-tag" data-icon="" data-first="${(tag[0] || '').replace(/"/g, '')}"
                    ><span class="badge-text">${tag}</span></span>`).join('')
            : ''

        return `
        <article class="element-card" data-id="${el.id}"
            style="--el-color:${colorVal}">
            <div class="card-inner">
                <div class="card-header">
                    <div class="card-icon-wrap">
                        <wa-icon name="${el.icon}"></wa-icon>
                    </div>
                    <div class="card-meta">
                        <h3 class="card-name">${el.name}</h3>
                        ${this._badgesHtml()}
                    </div>
                    <button class="card-star ${el.starred ? 'starred' : ''}"
                        data-action="star" title="${t('starred')}">
                        <wa-icon name="star"
                            variant="${el.starred ? 'solid' : 'regular'}"></wa-icon>
                    </button>
                </div>
                ${desc ? `<p class="card-desc">${desc}</p>` : ''}
                ${this._propSummary()}
                ${tagHtml ? `<div class="card-tags">${tagHtml}</div>` : ''}
                <div class="card-footer">
                    <span class="card-conn">
                        <wa-icon name="link" style="font-size:0.85em"></wa-icon>
                        ${totalConn}
                    </span>
                    <span class="card-time">${relativeTime(el.updatedAt)}</span>
                </div>
            </div>
        </article>`
    }

    bindEvents(node) {
        const { el, callbacks } = this
        node.querySelector('[data-action="star"]')?.addEventListener('click', e => {
            e.stopPropagation()
            callbacks.onToggleStar?.(el.id)
        })
        node.addEventListener('click', () => callbacks.onEdit?.(el.id))
        // Wait for wa-icon to render before measuring badge overflow
        requestAnimationFrame(() => requestAnimationFrame(() => {
            this._fitBadges(node)
            this._fitPropChips(node)
            this._fitTags(node)
        }))
    }
}
