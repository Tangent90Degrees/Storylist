// Dashboard — renders the masonry grid of ElementCards plus a filter bar.
// Cards are placed into the SHORTEST column (not left-to-right) so the
// waterfall layout stays balanced regardless of card height differences.

import ElementCard from './ElementCard.js'
import { t } from '../utils/i18n.js'

// Minimum column width; the browser fits as many as it can.
const MIN_COL_WIDTH = 280  // wider min → 4 cols at full screen instead of 5
const GAP = 16   // var(--wa-space-m)
const PAD = 24    // var(--wa-space-l) per side

export default class Dashboard {
    constructor(callbacks) {
        this.callbacks = callbacks
        this._dash = document.getElementById('dashboard')
        this._filterBar = document.getElementById('type-filter-bar')
        this._resizeObserver = null
        this._lastColCount = 0
    }

    static _incomingCounts(elements) {
        const counts = {}
        for (const el of elements) {
            for (const rel of el.relationships) {
                counts[rel.targetId] = (counts[rel.targetId] || 0) + 1
            }
        }
        return counts
    }

    renderFilterBar(elementTypes, activeTypeId, onFilter) {
        const allBtn = `<button class="type-filter-btn ${!activeTypeId ? 'active' : ''}" data-type="">
            <wa-icon name="layer-group"></wa-icon>
            <span>${t('allTypes')}</span>
        </button>`

        const typeBtns = elementTypes.map(type => {
            const label = t(type.nameKey) || type.name
            return `<button class="type-filter-btn ${activeTypeId === type.id ? 'active' : ''}"
                data-type="${type.id}">
                <wa-icon name="${type.icon}"></wa-icon>
                <span>${label}</span>
            </button>`
        }).join('')

        this._filterBar.innerHTML = allBtn + typeBtns
        this._filterBar.querySelectorAll('.type-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => onFilter(btn.dataset.type || null))
        })
    }

    // Compute the number of columns that fit in the dashboard's current width.
    // Capped at 4 so full-screen never shows more than 4 columns.
    _columnCount() {
        const width = this._dash.clientWidth - PAD * 2
        if (width <= 0) return 1
        const count = Math.floor((width + GAP) / (MIN_COL_WIDTH + GAP))
        return Math.max(1, Math.min(4, count))
    }

    // The actual rendered width of each column (for accurate height measurement).
    _columnWidth(colCount) {
        const inner = this._dash.clientWidth - PAD * 2
        return Math.floor((inner - GAP * (colCount - 1)) / colCount)
    }

    // Place each card into the shortest column:
    // 1. Render the card HTML off-screen at the exact column width.
    // 2. Measure its height.
    // 3. Append to the column with the smallest accumulated height.
    _layoutCards(elements, storybook, incoming) {
        const count = this._columnCount()
        const colW = this._columnWidth(count)
        this._lastColCount = count

        // Create column containers
        const cols = []
        const colHeights = []
        for (let i = 0; i < count; i++) {
            const col = document.createElement('div')
            col.className = 'dashboard-col'
            cols.push(col)
            colHeights.push(0)
        }

        // Off-screen measurer at the exact column width
        const measurer = document.createElement('div')
        measurer.style.cssText =
            `position:absolute;left:-9999px;top:0;width:${colW}px;visibility:hidden;`
        document.body.appendChild(measurer)

        for (const el of elements) {
            const card = new ElementCard(el, storybook, incoming[el.id] || 0, this.callbacks)
            measurer.innerHTML = card.render()
            const node = measurer.firstElementChild
            if (!node) continue

            const height = node.offsetHeight

            // Find shortest column
            let minIdx = 0
            for (let i = 1; i < count; i++) {
                if (colHeights[i] < colHeights[minIdx]) minIdx = i
            }

            // Move node into the shortest column
            cols[minIdx].appendChild(node)
            colHeights[minIdx] += height + GAP
        }

        measurer.remove()

        // Replace dashboard content with the columns
        this._dash.innerHTML = ''
        cols.forEach(col => this._dash.appendChild(col))

        // Bind events on the placed cards
        this._dash.querySelectorAll('.element-card').forEach(node => {
            const el = elements.find(e => e.id === node.dataset.id)
            if (el) new ElementCard(el, storybook, incoming[el.id] || 0, this.callbacks).bindEvents(node)
        })
    }

    render(elements, storybook) {
        if (!elements.length) {
            this._dash.innerHTML = `
                <div class="dashboard-empty">
                    <wa-icon name="wind"></wa-icon>
                    <p>${t('noElements')}</p>
                    <span>${t('noElementsDesc')}</span>
                </div>`
            return
        }

        const incoming = Dashboard._incomingCounts(elements)

        // Defer layout until after the browser has performed a layout pass
        // so that clientWidth returns the real value.
        const doLayout = () => this._layoutCards(elements, storybook, incoming)

        if (this._dash.clientWidth > 0) {
            doLayout()
        } else {
            // clientWidth is 0 when called before first paint — use rAF to wait
            requestAnimationFrame(() => {
                requestAnimationFrame(doLayout)
            })
        }

        this._setupResizeObserver(elements, storybook, incoming)
    }

    _setupResizeObserver(elements, storybook, incoming) {
        if (this._resizeObserver) this._resizeObserver.disconnect()

        let timer = null
        this._resizeObserver = new ResizeObserver(() => {
            clearTimeout(timer)
            timer = setTimeout(() => {
                const newCount = this._columnCount()
                if (newCount !== this._lastColCount) {
                    this._layoutCards(elements, storybook, incoming)
                }
            }, 150)
        })
        this._resizeObserver.observe(this._dash)
    }
}
