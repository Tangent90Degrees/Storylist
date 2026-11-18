// BoardView — infinite grid whiteboard with element cards.
// Cards snap to a 20px grid; they can be selected, moved together,
// resized by edge-drag, and box-selected. Shift+drag pans the view.

import { uuid, stripMarkdown } from '../utils/helpers.js'
import { getColorValue, getColorDarker, getColorLighter } from '../data/colors.js'
import { t } from '../utils/i18n.js'
import { ICON_SVGS } from '../data/icon-svgs.js'
import { TagRow } from '../utils/TagRow.js'
import { BadgeRow } from '../utils/TagRow.js'
import ElementCard from './ElementCard.js'

const GRID = 20
const CARD_MIN_W = 6
const CARD_MIN_H = 4
const CARD_MIN_SQ = 2   // avatar mode minimum square size (grid cells)
const EDGE_ZONE = 6

const snap = v => Math.round(v / GRID) * GRID

export default class BoardView {
    constructor(onSave) {
        this.onSave = onSave
        this._selected = new Set()
    }

    open(board, elements, storybook) {
        this._board     = board
        this._elements  = elements
        this._storybook = storybook
        this._panX = board._panX || 0
        this._panY = board._panY || 0
        this._selected.clear()

        this._host = document.getElementById('board-container')
        this._host.innerHTML = this._shellHtml()
        this._canvas  = this._host.querySelector('.board-canvas')
        this._surface = this._host.querySelector('.board-surface')
        this._svg     = this._host.querySelector('#board-lines-svg')
        this._selBox  = null

        this._renderGrid()
        this._renderLines()
        this._renderCards()
        this._bindCanvas()
        this._bindToolbar()
    }

    // ── HTML shell ────────────────────────────────────────────────────────────
    _shellHtml() {
        return `
        <div class="board-view">
            <div class="board-toolbar">
                <span class="board-toolbar-title" id="board-title-label"></span>
                <div class="board-toolbar-actions">
                    <button class="board-tool-btn" id="board-add-card" title="${t('addCard') || 'Add card'}">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                        ${t('addCard') || 'Add Card'}
                    </button>
                    <button class="board-tool-btn board-tool-secondary" id="board-connect-mode" title="Draw connection">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <circle cx="2.5" cy="11.5" r="2" stroke="currentColor" stroke-width="1.3"/>
                            <circle cx="11.5" cy="2.5" r="2" stroke="currentColor" stroke-width="1.3"/>
                            <line x1="4.1" y1="9.9" x2="9.9" y2="4.1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="board-canvas" tabindex="0">
                <div class="board-surface">
                    <svg class="board-lines-svg" id="board-lines-svg"></svg>
                    <div class="board-grid-bg"></div>
                </div>
            </div>
            <div id="board-element-picker" class="board-element-picker hidden"></div>
            <div id="board-ctxmenu" class="board-ctxmenu hidden"></div>
            <div id="board-line-editor" class="board-line-editor hidden"></div>
        </div>`
    }

    // ── Grid / transform ──────────────────────────────────────────────────────
    _renderGrid() {
        this._applyTransform()
        this._host.querySelector('#board-title-label').textContent = this._board.name
    }

    _applyTransform() {
        this._surface.style.transform = `translate(${this._panX}px, ${this._panY}px)`
    }

    // ── Lines ─────────────────────────────────────────────────────────────────
    _renderLines() {
        this._svg.innerHTML = ''
        for (const line of (this._board.lines || [])) this._mountLine(line)
    }

    _mountLine(line) {
        const NS = 'http://www.w3.org/2000/svg'
        const g = document.createElementNS(NS, 'g')
        g.classList.add('board-line-group')
        g.dataset.lineId = line.id

        const hit = document.createElementNS(NS, 'path')
        hit.classList.add('board-line-hit')

        const vis = document.createElementNS(NS, 'path')
        vis.classList.add('board-line-visual')

        const ep1 = document.createElementNS(NS, 'circle')
        ep1.classList.add('board-line-endpoint')
        ep1.setAttribute('r', '6')

        const ep2 = document.createElementNS(NS, 'circle')
        ep2.classList.add('board-line-endpoint')
        ep2.setAttribute('r', '6')

        g.append(hit, vis, ep1, ep2)
        this._svg.appendChild(g)
        this._updateLineGroup(line)

        // Events
        g.addEventListener('dblclick', e => { e.stopPropagation(); this._openLineEditor(line) })
        hit.addEventListener('mousedown', e => {
            if (e.button !== 0) return
            e.stopPropagation(); e.preventDefault()
            this._startLineDrag(e, line)
        })
        ep1.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); this._startEndpointDrag(e, line, 1) })
        ep2.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); this._startEndpointDrag(e, line, 2) })
        g.addEventListener('contextmenu', e => {
            e.preventDefault(); e.stopPropagation()
            this._showLineCtxMenu(e.clientX, e.clientY, line, g)
        })
    }

    _updateLineGroup(line) {
        const g = this._svg.querySelector(`[data-line-id="${line.id}"]`)
        if (!g) return
        const color = line.color || 'var(--wa-color-brand-50)'

        // Cubic Bézier: control points perpendicular to the connection direction
        const d = this._curvePath(line.x1, line.y1, line.x2, line.y2)
        const mx = (line.x1 + line.x2) / 2
        const my = (line.y1 + line.y2) / 2

        const hit = g.querySelector('.board-line-hit')
        const vis = g.querySelector('.board-line-visual')
        const eps = g.querySelectorAll('.board-line-endpoint')

        hit.setAttribute('d', d)
        vis.setAttribute('d', d)
        vis.setAttribute('stroke', color)
        vis.setAttribute('stroke-width', '2')
        eps[0]?.setAttribute('cx', line.x1); eps[0]?.setAttribute('cy', line.y1)
        eps[1]?.setAttribute('cx', line.x2); eps[1]?.setAttribute('cy', line.y2)
        for (const ep of eps) ep.setAttribute('stroke', color)

        // Label — remove old, add new
        g.querySelectorAll('.board-line-label, .board-line-label-bg').forEach(n => n.remove())
        if (line.label) {
            const NS = 'http://www.w3.org/2000/svg'
            const bg = document.createElementNS(NS, 'rect')
            const txt = document.createElementNS(NS, 'text')
            txt.classList.add('board-line-label')
            txt.setAttribute('x', mx); txt.setAttribute('y', my)
            txt.textContent = line.label
            g.append(bg, txt)
            // Position background after render
            requestAnimationFrame(() => {
                try {
                    const bb = txt.getBBox()
                    bg.setAttribute('x', bb.x - 3); bg.setAttribute('y', bb.y - 2)
                    bg.setAttribute('width', bb.width + 6); bg.setAttribute('height', bb.height + 4)
                    bg.setAttribute('rx', '3')
                    bg.setAttribute('fill', 'var(--wa-color-surface-raised)')
                    bg.setAttribute('opacity', '0.85')
                    g.insertBefore(bg, txt)
                } catch {}
            })
        }
    }

    _nearestEdgePoint(clientX, clientY, card) {
        const canvasRect = this._canvas.getBoundingClientRect()
        const mx = snap(clientX - canvasRect.left - this._panX)
        const my = snap(clientY - canvasRect.top  - this._panY)
        const cx = Math.max(card.x, Math.min(card.x + card.w, mx))
        const cy = Math.max(card.y, Math.min(card.y + card.h, my))
        const distL = Math.abs(cx - card.x)
        const distR = Math.abs(cx - (card.x + card.w))
        const distT = Math.abs(cy - card.y)
        const distB = Math.abs(cy - (card.y + card.h))
        const min = Math.min(distL, distR, distT, distB)
        if (min === distL) return { x: card.x, y: cy }
        if (min === distR) return { x: card.x + card.w, y: cy }
        if (min === distT) return { x: cx, y: card.y }
        return { x: cx, y: card.y + card.h }
    }

    _snapToCardEdge(x, y, card, threshold) {
        const ex = Math.max(card.x, Math.min(card.x + card.w, x))
        const ey = Math.max(card.y, Math.min(card.y + card.h, y))
        const distL = Math.abs(x - card.x)
        const distR = Math.abs(x - (card.x + card.w))
        const distT = Math.abs(y - card.y)
        const distB = Math.abs(y - (card.y + card.h))
        const min = Math.min(distL, distR, distT, distB)
        let pt
        if (min === distL) pt = { x: card.x, y: ey }
        else if (min === distR) pt = { x: card.x + card.w, y: ey }
        else if (min === distT) pt = { x: ex, y: card.y }
        else pt = { x: ex, y: card.y + card.h }
        const dist = Math.hypot(pt.x - x, pt.y - y)
        return dist <= threshold ? pt : null
    }

    _startDrawLine(e, fromCard) {
        const pt1 = this._nearestEdgePoint(e.clientX, e.clientY, fromCard)
        const NS = 'http://www.w3.org/2000/svg'
        const preview = document.createElementNS(NS, 'line')
        preview.classList.add('board-line-preview')
        preview.setAttribute('x1', pt1.x); preview.setAttribute('y1', pt1.y)
        preview.setAttribute('x2', pt1.x); preview.setAttribute('y2', pt1.y)
        this._svg.appendChild(preview)

        const canvasRect = this._canvas.getBoundingClientRect()
        const onMove = mv => {
            const x2 = snap(mv.clientX - canvasRect.left - this._panX)
            const y2 = snap(mv.clientY - canvasRect.top  - this._panY)
            preview.setAttribute('x2', x2); preview.setAttribute('y2', y2)
        }
        const onUp = mv => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
            preview.remove()
            // Find card under cursor
            const target = document.elementFromPoint(mv.clientX, mv.clientY)?.closest('.board-card')
            if (!target || target.dataset.cardId === fromCard.id) return
            const toCard = this._board.cards.find(c => c.id === target.dataset.cardId)
            if (!toCard) return
            const pt2 = this._nearestEdgePoint(mv.clientX, mv.clientY, toCard)
            const line = { id: uuid(), x1: pt1.x, y1: pt1.y, x2: pt2.x, y2: pt2.y, color: '', label: '',
                card1Id: fromCard.id, card2Id: toCard.id }
            if (!this._board.lines) this._board.lines = []
            this._board.lines.push(line)
            this._mountLine(line)
            this._saveBoard()
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }

    _startEndpointDrag(e, line, which) {
        const canvasRect = this._canvas.getBoundingClientRect()
        const onMove = mv => {
            const x = snap(mv.clientX - canvasRect.left - this._panX)
            const y = snap(mv.clientY - canvasRect.top  - this._panY)
            if (which === 1) { line.x1 = x; line.y1 = y }
            else             { line.x2 = x; line.y2 = y }
            this._updateLineGroup(line)
        }
        const onUp = () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
            const x = which === 1 ? line.x1 : line.x2
            const y = which === 1 ? line.y1 : line.y2
            // Snap to nearest card edge; update stored card ID
            for (const card of this._board.cards) {
                const pt = this._snapToCardEdge(x, y, card, 30)
                if (pt) {
                    if (which === 1) { line.x1 = pt.x; line.y1 = pt.y; line.card1Id = card.id }
                    else             { line.x2 = pt.x; line.y2 = pt.y; line.card2Id = card.id }
                    this._updateLineGroup(line)
                    break
                }
            }
            this._saveBoard()
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }

    _startLineDrag(e, line) {
        const canvasRect = this._canvas.getBoundingClientRect()
        let lastX = snap(e.clientX - canvasRect.left - this._panX)
        let lastY = snap(e.clientY - canvasRect.top  - this._panY)
        const onMove = mv => {
            const x = snap(mv.clientX - canvasRect.left - this._panX)
            const y = snap(mv.clientY - canvasRect.top  - this._panY)
            const dx = x - lastX; const dy = y - lastY
            lastX = x; lastY = y
            line.x1 += dx; line.y1 += dy; line.x2 += dx; line.y2 += dy
            this._updateLineGroup(line)
        }
        const onUp = () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
            this._saveBoard()
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }

    _openLineEditor(line) {
        const editor = this._host.querySelector('#board-line-editor')
        if (!editor) return
        editor.classList.remove('hidden')
        editor.innerHTML = `<div class="board-line-editor-inner">
            <input type="color" class="ble-color" value="${line.color || '#6366f1'}">
            <input type="text" class="ble-label form-control form-control-sm" placeholder="Label…" value="${this._esc(line.label || '')}">
            <button class="ble-close">×</button>
        </div>`

        // Position at line midpoint in viewport
        const mx = this._panX + (line.x1 + line.x2) / 2
        const my = this._panY + (line.y1 + line.y2) / 2
        const cr = this._canvas.getBoundingClientRect()
        editor.style.left = (cr.left + mx) + 'px'
        editor.style.top  = (cr.top  + my + 16) + 'px'

        const colorInput = editor.querySelector('.ble-color')
        const labelInput = editor.querySelector('.ble-label')

        colorInput.addEventListener('input', () => {
            line.color = colorInput.value
            this._updateLineGroup(line)
            this._saveBoard()
        })
        const commitLabel = () => {
            line.label = labelInput.value.trim()
            this._updateLineGroup(line)
            this._saveBoard()
        }
        labelInput.addEventListener('blur', commitLabel)
        labelInput.addEventListener('keydown', e => { if (e.key === 'Enter') { commitLabel(); editor.classList.add('hidden') } })
        editor.querySelector('.ble-close').addEventListener('click', () => editor.classList.add('hidden'))
        setTimeout(() => labelInput.focus(), 50)
    }

    _showLineCtxMenu(x, y, line, g) {
        const menu = this._host.querySelector('#board-ctxmenu')
        if (!menu) return
        menu.classList.remove('hidden')
        menu.innerHTML = `<button class="bc-ctx-item bc-ctx-danger" data-action="del-line">
            <svg viewBox="0 0 512 512" fill="currentColor" width="13" height="13"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/></svg>
            Delete connection
        </button>`
        menu.style.left = x + 'px'; menu.style.top = y + 'px'
        requestAnimationFrame(() => {
            const r = menu.getBoundingClientRect()
            if (r.bottom > window.innerHeight - 8) menu.style.top = (y - menu.offsetHeight) + 'px'
            if (r.right > window.innerWidth - 8) menu.style.left = (x - menu.offsetWidth) + 'px'
        })
        menu.querySelector('[data-action="del-line"]').addEventListener('click', () => {
            this._board.lines = (this._board.lines || []).filter(l => l.id !== line.id)
            g.remove()
            this._hideCtxMenu()
            this._saveBoard()
        })
    }

    // ── Cards ─────────────────────────────────────────────────────────────────
    _renderCards() {
        this._surface.querySelectorAll('.board-card').forEach(n => n.remove())
        for (const card of this._board.cards) this._mountCard(card)
    }

    _mountCard(card) {
        const el = this._elements.find(e => e.id === card.elementId)
        const mode = card.mode || 'normal'

        // Enforce mode size constraints before mounting
        if (mode === 'compact') card.h = CARD_MIN_H * GRID
        if (mode === 'avatar') {
            const sq = Math.max(CARD_MIN_SQ * GRID, Math.max(card.w, card.h))
            card.w = snap(sq); card.h = card.w
        }
        if (mode === 'detailed') card.w = Math.max(12 * GRID, card.w)

        const node = document.createElement('div')
        node.className = 'board-card' + (mode !== 'normal' ? ` bc-mode-${mode}` : '')
        node.dataset.cardId = card.id
        node.style.left   = card.x + 'px'
        node.style.top    = card.y + 'px'
        node.style.width  = card.w + 'px'
        node.style.height = card.h + 'px'

        const color = el ? getColorValue(el.color) : '#94a3b8'
        node.style.setProperty('--card-color', color)
        node.innerHTML = this._cardInnerHtml(card, el)
        this._surface.appendChild(node)

        if (this._selected.has(card.id)) node.classList.add('selected')
        this._bindCardMouseEvents(node, card)

        // For detailed mode: fit prop chips on mount, then re-fit on resize
        if (mode === 'detailed') {
            const fitPropsOnNode = () => {
                node.querySelectorAll(
                    '.prop-row-full:not(.prop-row-multi) .prop-row-values, .prop-row-values-short'
                ).forEach(c => this._fitChips(c, 'prop-chip-card'))
            }
            requestAnimationFrame(() => requestAnimationFrame(fitPropsOnNode))
            // ResizeObserver re-runs the algorithm whenever the card width changes
            const ro = new ResizeObserver(() => fitPropsOnNode())
            ro.observe(node)
            // Clean up when the node is removed
            node._boardResizeObserver = ro
        }
    }

    _remountCard(card) {
        const old = this._surface.querySelector(`[data-card-id="${card.id}"]`)
        if (old) old.remove()
        this._mountCard(card)
    }

    _cardInnerHtml(card, el) {
        if (!el) return `<div class="bc-empty">Element removed</div>`

        const mode = card.mode || 'normal'
        const colorVal = getColorValue(el.color)

        // ── Avatar mode — fill the entire card ───────────────────────────────
        if (mode === 'avatar') {
            const fill = el.avatar
                ? `<img src="${el.avatar}" class="bc-avatar-fill-img" alt="">`
                : `<div class="bc-avatar-fill-icon" style="background:${colorVal}">
                     <svg viewBox="0 0 512 512" fill="white" xmlns="http://www.w3.org/2000/svg">${this._iconSvgPath(el.icon)}</svg>
                   </div>`
            return `<div class="bc-avatar-fill">${fill}</div>`
        }

        const type = this._storybook.getType(el.typeId)
        const typeName = type ? (t(type.nameKey) || type.name) : ''
        const iconContent = el.avatar
            ? `<img src="${el.avatar}" class="bc-avatar-img" alt="">`
            : `<div class="bc-icon-wrap" style="background:${colorVal}">
                 <svg viewBox="0 0 512 512" fill="white" xmlns="http://www.w3.org/2000/svg">${this._iconSvgPath(el.icon)}</svg>
               </div>`

        // Badges — type badge uses type's own color; group badges use group color
        const badges = []
        if (type) {
            const tc = getColorValue(type.color)
            badges.push(
                `<span class="bc-badge" style="--badge-c:${tc};--badge-text:${getColorDarker(type.color)};--badge-text-dark:${getColorLighter(type.color)}">
                    ${type.icon ? `<svg viewBox="0 0 512 512" fill="currentColor">${this._iconSvgPath(type.icon)}</svg>` : ''}
                    <span class="bc-badge-text">${this._esc(typeName)}</span>
                 </span>`)
        }
        for (const gid of el.groupIds || []) {
            const g = this._storybook.getGroup(gid)
            if (!g) continue
            const gc = getColorValue(g.color)
            badges.push(
                `<span class="bc-badge" style="--badge-c:${gc};--badge-text:${getColorDarker(g.color)};--badge-text-dark:${getColorLighter(g.color)}">
                    ${g.icon ? `<svg viewBox="0 0 512 512" fill="currentColor">${this._iconSvgPath(g.icon)}</svg>` : ''}
                    <span class="bc-badge-text">${this._esc(g.name)}</span>
                 </span>`)
        }

        // Plain-text description (Markdown stripped)
        const desc = el.description ? stripMarkdown(this._stripHtml(el.description)) : ''
        const tagRowHtml = el.tags?.length ? TagRow.render(el.tags) : ''

        const header = `
            <div class="bc-header">
                ${iconContent}
                <div class="bc-meta">
                    <h3 class="bc-name">${this._esc(el.name)}</h3>
                    ${badges.length ? BadgeRow.render(badges) : ''}
                </div>
            </div>`

        // ── Compact — header + tags, no description ───────────────────────────
        if (mode === 'compact') {
            return `<div class="bc-inner">${header}${tagRowHtml ? `<div class="bc-tags tag-row-wrap">${tagRowHtml}</div>` : ''}</div>`
        }

        // ── Detailed — full ElementCard-style content ────────────────────────
        if (mode === 'detailed') {
            const dummyCard = new ElementCard(el, this._storybook, 0, {}, this._elements)
            const propsHtml = dummyCard._propSummary()
            return `<div class="bc-inner bc-inner-detailed">
                ${header}
                ${desc ? `<p class="bc-desc bc-desc-detailed">${this._esc(desc)}</p>` : ''}
                ${propsHtml}
                ${tagRowHtml ? `<div class="bc-tags tag-row-wrap">${tagRowHtml}</div>` : ''}
            </div>`
        }

        // ── Normal (default) ───────────────────────────────────────────────────
        return `<div class="bc-inner">
            ${header}
            ${desc ? `<p class="bc-desc">${this._esc(desc)}</p>` : ''}
            ${tagRowHtml ? `<div class="bc-tags tag-row-wrap">${tagRowHtml}</div>` : ''}
        </div>`
    }

    // ── Shared chip-fitting algorithm (mirrors ElementCard._fitChips) ─────────
    _fitChips(container, chipClass) {
        if (!container) return
        container.querySelector(`.${chipClass}-more`)?.remove()
        container.querySelectorAll(`.${chipClass}`).forEach(c => c.classList.remove(`${chipClass}-compact`))
        if (container.scrollWidth <= container.clientWidth) return
        const chips = [...container.querySelectorAll(`.${chipClass}`)]
        for (let i = chips.length - 1; i >= 0; i--) {
            chips[i].classList.add(`${chipClass}-compact`)
            if (container.scrollWidth <= container.clientWidth) return
        }
        let hidden = 0
        const compacted = [...container.querySelectorAll(`.${chipClass}-compact`)]
        for (let i = compacted.length - 1; i >= 0; i--) {
            compacted[i].remove()
            hidden++
            let more = container.querySelector(`.${chipClass}-more`)
            if (!more) {
                more = document.createElement('span')
                more.className = `${chipClass} ${chipClass}-more`
                container.appendChild(more)
            }
            more.textContent = `+${hidden}`
            if (container.scrollWidth <= container.clientWidth) return
        }
    }

    // Render visible properties for Detailed mode (simple label+value rows)
    _detailedPropsHtml(el) {
        const type = this._storybook.getType(el.typeId)
        const typeProps = type?.properties || []
        const groupProps = (el.groupIds || [])
            .flatMap(gid => this._storybook.getGroup(gid)?.properties || [])
        const allProps = [...typeProps, ...groupProps]
        if (!allProps.length) return ''

        const rows = allProps.map(pd => {
            const display = pd.cardDisplay || (pd.showOnCard === false ? 'none' : 'short')
            if (display === 'none') return ''
            const val = el.properties?.[pd.id]
            if (val === undefined || val === null || val === '') return ''
            const label = t(pd.nameKey) || pd.name

            let displayVal = ''
            if ((pd.type === 'enum') && pd.options) {
                const opt = pd.options.find(o => o.id === val)
                displayVal = opt ? (t(opt.labelKey) || opt.label) : String(val)
            } else if (pd.type === 'multi-enum' && Array.isArray(val) && pd.options) {
                displayVal = val.map(id => {
                    const opt = pd.options.find(o => o.id === id)
                    return opt ? (t(opt.labelKey) || opt.label) : id
                }).join(', ')
            } else {
                displayVal = String(val)
            }

            return `<div class="bc-prop-row">
                <span class="bc-prop-label">${this._esc(label)}</span>
                <span class="bc-prop-value">${this._esc(displayVal)}</span>
            </div>`
        }).filter(Boolean).join('')

        return rows ? `<div class="bc-props">${rows}</div>` : ''
    }

    _iconSvgPath(name) {
        const d = ICON_SVGS?.solid?.[name]
        return d ? d.p : ''
    }

    // ── Edge detection for resize ──────────────────────────────────────────────
    _detectEdge(e, node) {
        const rect = node.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const w = rect.width, h = rect.height
        const left = x < EDGE_ZONE
        const right = x > w - EDGE_ZONE
        const top = y < EDGE_ZONE
        const bottom = y > h - EDGE_ZONE

        if (left && top) return 'nw'
        if (right && top) return 'ne'
        if (left && bottom) return 'sw'
        if (right && bottom) return 'se'
        if (left) return 'w'
        if (right) return 'e'
        if (top) return 'n'
        if (bottom) return 's'
        return null
    }

    // ── Card mouse events ──────────────────────────────────────────────────────
    _bindCardMouseEvents(node, card) {
        // Right-click context menu
        node.addEventListener('contextmenu', e => {
            e.preventDefault()
            e.stopPropagation()
            // Select the card if not already
            if (!this._selected.has(card.id)) {
                this._selected.clear()
                this._selectCard(card.id)
            }
            this._showCtxMenu(e.clientX, e.clientY, card)
        })

        // Mousemove: update cursor for edge detection
        node.addEventListener('mousemove', e => {
            if (this._dragging) return
            const edge = this._detectEdge(e, node)
            const cursors = {
                nw: 'nwse-resize', se: 'nwse-resize',
                ne: 'nesw-resize', sw: 'nesw-resize',
                n: 'ns-resize', s: 'ns-resize',
                w: 'ew-resize', e: 'ew-resize'
            }
            node.style.cursor = edge ? (cursors[edge] || 'default') : 'move'
        })

        // Mousedown: decide connect / select / move / resize
        node.addEventListener('mousedown', e => {
            if (e.button === 2) return  // right-click handled by contextmenu

            // Connect mode: start drawing a line from this card
            if (this._connectMode && e.button === 0) {
                e.preventDefault(); e.stopPropagation()
                this._startDrawLine(e, card)
                return
            }

            e.preventDefault()
            e.stopPropagation()

            const edge = this._detectEdge(e, node)

            if (edge) {
                // ── Resize this card ──
                this._startResize(e, node, card, edge)
            } else {
                // ── Select / move ──
                if (e.shiftKey) {
                    if (this._selected.has(card.id)) this._deselectCard(card.id)
                    else this._selectCard(card.id)
                } else if (!this._selected.has(card.id)) {
                    this._clearSelection()
                    this._selectCard(card.id)
                }
                this._startMove(e)
            }
        })
    }

    // ── Selection ──────────────────────────────────────────────────────────────
    _selectCard(id) {
        this._selected.add(id)
        const node = this._surface.querySelector(`[data-card-id="${id}"]`)
        node?.classList.add('selected')
    }

    _deselectCard(id) {
        this._selected.delete(id)
        const node = this._surface.querySelector(`[data-card-id="${id}"]`)
        node?.classList.remove('selected')
    }

    _clearSelection() {
        this._selected.forEach(id => {
            this._surface.querySelector(`[data-card-id="${id}"]`)?.classList.remove('selected')
        })
        this._selected.clear()
    }

    // ── Move selected cards ────────────────────────────────────────────────────
    _startMove(e) {
        const cards = this._board.cards.filter(c => this._selected.has(c.id))
        if (!cards.length) return
        const startX = e.clientX
        const startY = e.clientY
        const origins = cards.map(c => ({ id: c.id, x: c.x, y: c.y }))
        this._dragging = true

        const onMove = mv => {
            const dx = snap(mv.clientX - startX)
            const dy = snap(mv.clientY - startY)
            const movedIds = new Set()
            for (const o of origins) {
                const card = this._board.cards.find(c => c.id === o.id)
                if (!card) continue
                card.x = o.x + dx
                card.y = o.y + dy
                const node = this._surface.querySelector(`[data-card-id="${o.id}"]`)
                if (node) { node.style.left = card.x + 'px'; node.style.top = card.y + 'px' }
                movedIds.add(card.id)
            }
            this._updateLinesForCards(movedIds)
        }
        const onUp = () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
            this._dragging = false
            this._saveBoard()
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }

    // ── Resize a single card by dragging an edge/corner ──────────────────────
    _startResize(e, node, card, edge) {
        if (!this._selected.has(card.id)) {
            this._clearSelection()
            this._selectCard(card.id)
        }
        const startX = e.clientX
        const startY = e.clientY
        const orig = { x: card.x, y: card.y, w: card.w, h: card.h }
        this._dragging = true

        const onMove = mv => {
            const dx = mv.clientX - startX
            const dy = mv.clientY - startY

            if (edge.includes('e')) card.w = Math.max(CARD_MIN_W * GRID, snap(orig.w + dx))
            if (edge.includes('s')) card.h = Math.max(CARD_MIN_H * GRID, snap(orig.h + dy))
            if (edge.includes('w')) {
                const newW = Math.max(CARD_MIN_W * GRID, snap(orig.w - dx))
                card.x = orig.x + (orig.w - newW)
                card.w = newW
            }
            if (edge.includes('n')) {
                const newH = Math.max(CARD_MIN_H * GRID, snap(orig.h - dy))
                card.y = orig.y + (orig.h - newH)
                card.h = newH
            }
            node.style.left = card.x + 'px'
            node.style.top = card.y + 'px'
            node.style.width = card.w + 'px'
            node.style.height = card.h + 'px'

            // Enforce mode constraints during resize
            const mode = card.mode || 'normal'
            if (mode === 'compact') {
                card.h = CARD_MIN_H * GRID
                node.style.height = card.h + 'px'
            } else if (mode === 'avatar') {
                if (edge.includes('e') || edge.includes('w')) card.h = card.w
                else card.w = card.h
                card.w = Math.max(CARD_MIN_SQ * GRID, snap(card.w))
                card.h = card.w
                node.style.width = card.w + 'px'
                node.style.height = card.h + 'px'
            } else if (mode === 'detailed') {
                card.w = Math.max(12 * GRID, card.w)
                node.style.width = card.w + 'px'
            }
            // Update lines connected to this card
            this._updateLinesForCards(new Set([card.id]))
        }
        const onUp = () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
            this._dragging = false
            this._saveBoard()
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }

    // ── Canvas events: pan, box-select ──────────────────────────────────────────
    _bindCanvas() {
        const canvas = this._canvas

        canvas.addEventListener('mousedown', e => {
            // Only start on blank canvas / grid background
            if (e.target !== canvas && !e.target.classList.contains('board-grid-bg') &&
                !e.target.classList.contains('board-surface')) return
            e.preventDefault()

            // Close any open context menu
            this._hideCtxMenu()

            if (e.shiftKey || e.button === 1) {
                // ── Pan ──
                this._startPan(e)
            } else if (e.button === 0) {
                // ── Box select ──
                this._clearSelection()
                this._startBoxSelect(e)
            }
        })

        // Keyboard: delete selected cards
        canvas.addEventListener('keydown', e => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && this._selected.size > 0) {
                e.preventDefault()
                this._deleteSelected()
            }
        })
    }

    _startPan(e) {
        let lastX = e.clientX, lastY = e.clientY
        this._canvas.style.cursor = 'grabbing'

        const onMove = mv => {
            this._panX += mv.clientX - lastX
            this._panY += mv.clientY - lastY
            lastX = mv.clientX
            lastY = mv.clientY
            this._applyTransform()
        }
        const onUp = () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
            this._canvas.style.cursor = ''
            this._board._panX = this._panX
            this._board._panY = this._panY
            this._saveBoard()
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }

    _startBoxSelect(e) {
        // Coordinates in surface space (account for pan)
        const startX = e.clientX - this._panX - this._canvas.getBoundingClientRect().left
        const startY = e.clientY - this._panY - this._canvas.getBoundingClientRect().top

        // Create selection box element
        this._selBox = document.createElement('div')
        this._selBox.className = 'board-sel-box'
        this._surface.appendChild(this._selBox)

        const onMove = mv => {
            const curX = mv.clientX - this._panX - this._canvas.getBoundingClientRect().left
            const curY = mv.clientY - this._panY - this._canvas.getBoundingClientRect().top
            const left = Math.min(startX, curX)
            const top = Math.min(startY, curY)
            const w = Math.abs(curX - startX)
            const h = Math.abs(curY - startY)
            this._selBox.style.left = left + 'px'
            this._selBox.style.top = top + 'px'
            this._selBox.style.width = w + 'px'
            this._selBox.style.height = h + 'px'

            // Select cards intersecting the box
            this._clearSelection()
            for (const card of this._board.cards) {
                if (card.x < left + w && card.x + card.w > left &&
                    card.y < top + h && card.y + card.h > top) {
                    this._selectCard(card.id)
                }
            }
        }
        const onUp = () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
            this._selBox?.remove()
            this._selBox = null
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }

    // ── Context menu ───────────────────────────────────────────────────────────
    _showCtxMenu(x, y, card) {
        const menu = this._host.querySelector('#board-ctxmenu')
        if (!menu) return
        menu.classList.remove('hidden')

        const active = card.mode || 'normal'
        // SVG icons for each mode
        const modeIcons = {
            normal:   `<svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="4" width="8" height="2" rx="0.5"/><rect x="4" y="8" width="6" height="1.5" rx="0.5"/><rect x="4" y="11" width="4" height="1.5" rx="0.5"/></svg>`,
            compact:  `<svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="4" width="14" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="7" width="8" height="2" rx="0.5"/></svg>`,
            avatar:   `<svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="6.5" r="2.5"/><path d="M3.5 13c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4"/></svg>`,
            detailed: `<svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="4" width="8" height="2" rx="0.5"/><rect x="4" y="7" width="8" height="1.5" rx="0.5"/><rect x="4" y="10" width="8" height="1.5" rx="0.5"/><rect x="4" y="12.5" width="5" height="1.5" rx="0.5"/></svg>`
        }
        const modeLabels = { normal: 'Normal', compact: 'Compact', avatar: 'Avatar', detailed: 'Detailed' }

        const modeButtons = Object.keys(modeIcons).map(m =>
            `<button class="bc-ctx-mode-btn${active === m ? ' bc-ctx-mode-active' : ''}" data-mode="${m}" title="${modeLabels[m]}">
                ${modeIcons[m]}
                <span>${modeLabels[m]}</span>
            </button>`
        ).join('')

        menu.innerHTML = `
            <div class="bc-ctx-modes">${modeButtons}</div>
            <div class="bc-ctx-sep"></div>
            <button class="bc-ctx-item" data-action="copy">
                <svg viewBox="0 0 448 512" fill="currentColor" width="13" height="13"><path d="M208 0L97.6 0C78.4 0 64 14.4 64 32L64 48l-16 0C21.5 48 0 69.5 0 96L0 416c0 26.5 21.5 48 48 48l208 0c26.5 0 48-21.5 48-48l0-16 16 0c17.6 0 32-14.4 32-32l0-256L208 0zM160 224c0-17.7 14.3-32 32-32l64 0c17.7 0 32 14.3 32 32l0 64c0 17.7-14.3 32-32 32l-64 0c-17.7 0-32-14.3-32-32l0-64zM288 362.7l0-26.7 74.7 74.7-26.7 0c-26.5 0-48-21.5-48-48z"/></svg>
                ${t('copyProperty') || 'Copy'}
            </button>
            <button class="bc-ctx-item bc-ctx-danger" data-action="delete">
                <svg viewBox="0 0 512 512" fill="currentColor" width="13" height="13"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/></svg>
                ${t('delete') || 'Delete'}
            </button>`

        menu.style.left = x + 'px'
        menu.style.top = y + 'px'

        requestAnimationFrame(() => {
            const r = menu.getBoundingClientRect()
            if (r.bottom > window.innerHeight - 8)
                menu.style.top = (y - menu.offsetHeight) + 'px'
            if (r.right > window.innerWidth - 8)
                menu.style.left = (x - menu.offsetWidth) + 'px'
        })

        // Mode buttons
        menu.querySelectorAll('.bc-ctx-mode-btn').forEach(btn => {
            btn.addEventListener('mousedown', e => e.preventDefault())
            btn.addEventListener('click', () => {
                const newMode = btn.dataset.mode
                card.mode = newMode
                // Enforce size constraints
                if (newMode === 'compact') card.h = CARD_MIN_H * GRID
                if (newMode === 'avatar') {
                    const sq = Math.max(CARD_MIN_SQ * GRID, Math.max(card.w, card.h))
                    card.w = snap(sq); card.h = card.w
                }
                if (newMode === 'detailed') card.w = Math.max(12 * GRID, card.w)
                this._hideCtxMenu()
                this._remountCard(card)
                this._saveBoard()
            })
        })

        menu.querySelectorAll('.bc-ctx-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action
                this._hideCtxMenu()
                if (action === 'delete') this._deleteSelected()
                if (action === 'copy') this._copyCard(card)
            })
        })
    }

    _hideCtxMenu() {
        this._host.querySelector('#board-ctxmenu')?.classList.add('hidden')
    }

    _copyCard(card) {
        // Duplicate the card with a slight offset
        const copy = {
            id: uuid(),
            elementId: card.elementId,
            x: snap(card.x + GRID),
            y: snap(card.y + GRID),
            w: card.w,
            h: card.h
        }
        this._board.cards.push(copy)
        this._mountCard(copy)
        this._clearSelection()
        this._selectCard(copy.id)
        this._saveBoard()
    }

    _deleteSelected() {
        for (const id of this._selected) {
            this._surface.querySelector(`[data-card-id="${id}"]`)?.remove()
        }
        this._board.cards = this._board.cards.filter(c => !this._selected.has(c.id))
        this._selected.clear()
        this._saveBoard()
    }

    // ── Toolbar ─────────────────────────────────────────────────────────────────
    _bindToolbar() {
        this._host.querySelector('#board-add-card')?.addEventListener('click', () => {
            this._openElementPicker()
        })
        // Connect mode toggle
        this._connectMode = false
        this._host.querySelector('#board-connect-mode')?.addEventListener('click', () => {
            this._connectMode = !this._connectMode
            this._host.querySelector('#board-connect-mode').classList.toggle('active', this._connectMode)
            this._canvas.style.cursor = this._connectMode ? 'crosshair' : ''
        })
        // Close context menu and line editor on canvas click
        document.addEventListener('click', () => {
            this._hideCtxMenu()
            this._host?.querySelector('#board-line-editor')?.classList.add('hidden')
        })
    }

    _openElementPicker() {
        const panel = this._host.querySelector('#board-element-picker')
        if (!panel) return
        panel.classList.remove('hidden')

        const render = (q = '') => {
            const filtered = this._elements.filter(e =>
                !q || e.name.toLowerCase().includes(q.toLowerCase()))
            panel.innerHTML = `
                <div class="bep-header">
                    <input class="bep-search form-control form-control-sm"
                        placeholder="${t('searchPlaceholder') || 'Search…'}" value="${this._esc(q)}">
                    <button class="bep-close">×</button>
                </div>
                <div class="bep-list">
                    ${filtered.length ? filtered.map(e => {
                        const c = getColorValue(e.color)
                        return `<button class="bep-item" data-el="${e.id}">
                            <span class="bep-icon" style="background:${c}">
                                <svg viewBox="0 0 512 512" fill="white">${this._iconSvgPath(e.icon)}</svg>
                            </span>
                            <span class="bep-name">${this._esc(e.name)}</span>
                        </button>`
                    }).join('') : `<p class="bep-empty">${t('noElements') || 'No elements'}</p>`}
                </div>`

            panel.querySelector('.bep-search')?.addEventListener('input', ev => render(ev.target.value))
            panel.querySelector('.bep-search')?.focus()
            panel.querySelector('.bep-close')?.addEventListener('click', () => panel.classList.add('hidden'))
            panel.querySelectorAll('.bep-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    this._addCard(btn.dataset.el)
                    panel.classList.add('hidden')
                })
            })
        }
        render()
    }

    _addCard(elementId) {
        const cx = snap(-this._panX + this._canvas.clientWidth  / 2 - CARD_MIN_W * GRID / 2)
        const cy = snap(-this._panY + this._canvas.clientHeight / 2 - CARD_MIN_H * GRID / 2)
        const card = { id: uuid(), elementId, x: cx, y: cy, w: CARD_MIN_W * GRID, h: CARD_MIN_H * GRID }
        this._board.cards.push(card)
        this._mountCard(card)
        this._saveBoard()
    }

    _saveBoard() {
        this.onSave(this._board)
    }

    // ── helpers ─────────────────────────────────────────────────────────────────
    _stripHtml(html) {
        const div = document.createElement('div')
        div.innerHTML = html
        return (div.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200)
    }

    _esc(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }

    // ── Cubic Bézier path between two points ─────────────────────────────────
    // Control points curve outward based on the dominant direction between endpoints.
    _curvePath(x1, y1, x2, y2) {
        const dx = x2 - x1
        const dy = y2 - y1
        const dist = Math.hypot(dx, dy)
        const bend = Math.min(120, dist * 0.45)

        // Determine which edge each endpoint is on by proximity — use the
        // delta direction as a heuristic: dominant axis → perpendicular control.
        let c1x, c1y, c2x, c2y
        if (Math.abs(dx) >= Math.abs(dy)) {
            // Horizontal-ish: curve along X
            c1x = x1 + bend * Math.sign(dx)
            c1y = y1
            c2x = x2 - bend * Math.sign(dx)
            c2y = y2
        } else {
            // Vertical-ish: curve along Y
            c1x = x1
            c1y = y1 + bend * Math.sign(dy)
            c2x = x2
            c2y = y2 - bend * Math.sign(dy)
        }
        return `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`
    }

    // Update all lines whose endpoints are attached to any of the given card IDs
    _updateLinesForCards(cardIds) {
        for (const line of (this._board.lines || [])) {
            let changed = false
            if (cardIds.has(line.card1Id)) {
                const card = this._board.cards.find(c => c.id === line.card1Id)
                if (card) {
                    const pt = this._projectOntoCardEdge(line.x1, line.y1, card)
                    line.x1 = pt.x; line.y1 = pt.y
                    changed = true
                }
            }
            if (cardIds.has(line.card2Id)) {
                const card = this._board.cards.find(c => c.id === line.card2Id)
                if (card) {
                    const pt = this._projectOntoCardEdge(line.x2, line.y2, card)
                    line.x2 = pt.x; line.y2 = pt.y
                    changed = true
                }
            }
            if (changed) this._updateLineGroup(line)
        }
    }

    // Project a point (px, py) that was on a card's edge back onto the new edge
    // position, maintaining the same relative offset along the edge it was on.
    _projectOntoCardEdge(px, py, card) {
        // Determine which edge the point is currently closest to
        const distL = Math.abs(px - card.x)
        const distR = Math.abs(px - (card.x + card.w))
        const distT = Math.abs(py - card.y)
        const distB = Math.abs(py - (card.y + card.h))
        const min = Math.min(distL, distR, distT, distB)
        const ey = snap(Math.max(card.y, Math.min(card.y + card.h, py)))
        const ex = snap(Math.max(card.x, Math.min(card.x + card.w, px)))
        if (min === distL) return { x: card.x, y: ey }
        if (min === distR) return { x: card.x + card.w, y: ey }
        if (min === distT) return { x: ex, y: card.y }
        return { x: ex, y: card.y + card.h }
    }
}
