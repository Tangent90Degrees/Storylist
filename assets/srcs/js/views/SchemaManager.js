// SchemaManager — modal for creating/editing element types and element groups.
// Types define properties every element of that type holds.
// Groups are cross-type property bundles (like interfaces).

import { t } from '../utils/i18n.js'
import { uuid, segCtrlUpdateIndicator } from '../utils/helpers.js'
import ColorPicker from './ColorPicker.js'
import IconPicker from './IconPicker.js'
import { getColorValue } from '../data/colors.js'

export default class SchemaManager {
    constructor(modal, onSave) {
        this.modal = modal
        this.onSave = onSave
    }

    open(storybook) {
        this._sb = storybook
        // Deep-clone so edits are not applied until Save
        this._types  = storybook.elementTypes.map(t => this._cloneType(t))
        this._groups = storybook.elementGroups.map(g => this._cloneGroup(g))
        this._activeTab  = 'types'
        this._selectedId = this._types[0]?.id || null

        this._renderShell()
    }

    // ── shell ─────────────────────────────────────────────────────────────
    _renderShell() {
        const html = `
        <div class="modal-inner modal-wide schema-modal">
            <header class="modal-header">
                <h2 class="modal-title">${t('manageSchema')}</h2>
                <wa-button data-modal-close variant="neutral" appearance="text" size="s">
                    <wa-icon name="xmark"></wa-icon>
                </wa-button>
            </header>
            <div class="schema-tabs">
                <button class="schema-tab active" data-tab="types">
                    <wa-icon name="layer-group" style="font-size:0.9em"></wa-icon>
                    ${t('schemaTypes')}
                </button>
                <button class="schema-tab" data-tab="groups">
                    <wa-icon name="tag" style="font-size:0.9em"></wa-icon>
                    ${t('schemaGroups')}
                </button>
            </div>
            <div class="schema-body">
                <div class="schema-list-col" id="schema-list-col"></div>
                <div class="schema-detail-col" id="schema-detail-col"></div>
            </div>
            <footer class="modal-footer">
                <div class="spacer"></div>
                <wa-button data-modal-close variant="neutral" appearance="outlined">
                    ${t('cancel')}
                </wa-button>
                <wa-button id="schema-save" variant="brand" appearance="outlined">
                    <wa-icon name="check" slot="prefix"></wa-icon>${t('save')}
                </wa-button>
            </footer>
        </div>`

        this.modal.open(html)
        this._root = this.modal.container

        this._root.querySelectorAll('[data-modal-close]').forEach(b =>
            b.addEventListener('click', () => this.modal.close()))

        this._root.querySelectorAll('.schema-tab').forEach(btn =>
            btn.addEventListener('click', () => {
                this._activeTab  = btn.dataset.tab
                this._selectedId = null
                this._root.querySelectorAll('.schema-tab')
                    .forEach(b => b.classList.toggle('active', b.dataset.tab === this._activeTab))
                this._renderList()
                this._renderDetail()
            }))

        this._root.querySelector('#schema-save')?.addEventListener('click', () => {
            this.onSave({
                types:  this._types,
                groups: this._groups
            })
            this.modal.close()
        })

        this._renderList()
        this._renderDetail()
    }

    // ── list panel ────────────────────────────────────────────────────────
    _renderList() {
        const col  = this._root.querySelector('#schema-list-col')
        const isTypes = this._activeTab === 'types'
        const items   = isTypes ? this._types : this._groups

        const addLabel = isTypes ? t('newType') : t('newGroup')
        const rows = items.map(item => {
            const c = getColorValue(item.color)
            const label = item.nameKey ? (t(item.nameKey) || item.name) : item.name
            return `
            <div class="schema-item ${item.id === this._selectedId ? 'active' : ''}"
                data-id="${item.id}">
                <div class="schema-item-icon" style="color:${c}; background:${c}22">
                    <wa-icon name="${item.icon}"></wa-icon>
                </div>
                <span class="schema-item-name">${label}</span>
                ${item.isDefault ? `<span class="default-badge">${t('defaultTypeBadge')}</span>` : ''}
            </div>`
        }).join('')

        col.innerHTML = `
            <div class="schema-list">${rows}</div>
            <wa-button id="schema-add" variant="neutral" appearance="outlined" size="s"
                class="schema-add-btn">
                <wa-icon name="plus" slot="prefix"></wa-icon>${addLabel}
            </wa-button>`

        col.querySelectorAll('.schema-item').forEach(node => {
            node.addEventListener('click', () => {
                this._selectedId = node.dataset.id
                col.querySelectorAll('.schema-item').forEach(n =>
                    n.classList.toggle('active', n.dataset.id === this._selectedId))
                this._renderDetail()
            })
        })

        col.querySelector('#schema-add')?.addEventListener('click', () => {
            const item = isTypes
                ? { id: uuid(), name: t('untitledType'),  color: 'slate', icon: 'circle', properties: [], isDefault: false }
                : { id: uuid(), name: t('untitledGroup'), color: 'slate', icon: 'circle', properties: [] }
            if (isTypes) this._types.push(item)
            else         this._groups.push(item)
            this._selectedId = item.id
            this._renderList()
            this._renderDetail()
        })
    }

    // ── detail panel ──────────────────────────────────────────────────────
    _renderDetail() {
        const col = this._root.querySelector('#schema-detail-col')
        if (!this._selectedId) {
            col.innerHTML = `<p class="schema-placeholder">${
                this._activeTab === 'types' ? t('schemaTypes') : t('schemaGroups')
            }</p>`
            return
        }

        const isTypes = this._activeTab === 'types'
        const list    = isTypes ? this._types : this._groups
        const item    = list.find(x => x.id === this._selectedId)
        if (!item) { col.innerHTML = ''; return }

        const label = item.nameKey ? (t(item.nameKey) || item.name) : item.name

        this._colorPicker = new ColorPicker(item.color, val => {
            item.color = val
        })
        this._iconPicker = new IconPicker(item.icon, val => {
            item.icon = val
            // Refresh the list row icon (wa-icon picks up name changes
            // automatically, but we re-set to be safe)
            const rowIcon = this._root.querySelector(
                `.schema-item[data-id="${item.id}"] wa-icon`)
            if (rowIcon) rowIcon.setAttribute('name', val)
        })

        const nameLabel = isTypes ? t('typeName') : t('groupName')

        col.innerHTML = `
            <div class="detail-inner">
                <div class="form-row">
                    <div style="flex:1">
                        <label class="form-label">${nameLabel}</label>
                        <input id="detail-name" type="text" class="form-control"
                            value="${this._esc(label)}">
                    </div>
                </div>
                <div>
                    <label class="form-label">${t('color')}</label>
                    ${this._colorPicker.render()}
                </div>
                <div class="editor-field">
                    <div class="desc-header">
                        <label class="form-label">${t('icon')}</label>
                        ${this._iconPicker.renderTabsOnly()}
                    </div>
                    ${this._iconPicker.renderGrid()}
                </div>
                <div class="props-section">
                    <div class="props-header">
                        <span class="form-label">${t('properties')}</span>
                        <wa-button id="detail-add-prop" variant="neutral"
                            appearance="outlined" size="s">
                            <wa-icon name="plus" slot="prefix"></wa-icon>${t('addProperty')}
                        </wa-button>
                    </div>
                    <div id="detail-props-list" class="detail-props-list"></div>
                </div>
                ${!item.isDefault ? `
                <div class="detail-danger">
                    <wa-button id="detail-remove" variant="danger" appearance="outlined" size="s">
                        <wa-icon name="trash" slot="prefix"></wa-icon>
                        ${isTypes ? t('removeType') : t('removeGroup')}
                    </wa-button>
                </div>` : `<p class="built-in-note">${t('builtInCannotRemove')}</p>`}
            </div>`

        this._colorPicker.bind(col)
        this._iconPicker.bind(col)

        col.querySelector('#detail-name')?.addEventListener('input', e => {
            item.name    = e.target.value
            item.nameKey = null
            const row = this._root.querySelector(`.schema-item[data-id="${item.id}"] .schema-item-name`)
            if (row) row.textContent = e.target.value
        })

        col.querySelector('#detail-add-prop')?.addEventListener('click', () => {
            item.properties.push({
                id:   uuid(),
                name: t('untitledProperty'),
                type: 'text',
                options: []
            })
            this._renderProps(item, col.querySelector('#detail-props-list'))
        })

        col.querySelector('#detail-remove')?.addEventListener('click', () => {
            const msg = isTypes ? t('confirmRemoveType') : t('confirmRemoveGroup')
            if (!confirm(msg)) return
            if (isTypes) this._types  = this._types.filter(x => x.id !== item.id)
            else         this._groups = this._groups.filter(x => x.id !== item.id)
            this._selectedId = (isTypes ? this._types : this._groups)[0]?.id || null
            this._renderList()
            this._renderDetail()
        })

        this._renderProps(item, col.querySelector('#detail-props-list'))
    }

    // ── property list for one type/group ─────────────────────────────────
    _renderProps(item, container) {
        if (!container) return
        if (!item.properties.length) {
            container.innerHTML = `<p class="empty-hint">${t('noProperties')}</p>`
            return
        }
        container.innerHTML = item.properties.map((pd, idx) =>
            this._propRowHtml(pd, idx, item.properties.length)).join('')

        this._bindPropRows(item, container)
    }

    _propRowHtml(pd, idx, total) {
        const typeOptions = ['text', 'number', 'enumSingle', 'enumMulti'].map(k => {
            const apiVal = k === 'enumSingle' ? 'enum' : k === 'enumMulti' ? 'multi-enum' : k
            return `<option value="${apiVal}" ${pd.type === apiVal ? 'selected' : ''}>${t(k)}</option>`
        }).join('')

        const isEnum   = pd.type === 'enum' || pd.type === 'multi-enum'
        const enumHtml = isEnum ? this._enumOptionsHtml(pd) : ''
        // Determine current cardDisplay; migrate legacy showOnCard flag
        const display = pd.cardDisplay
            || (pd.showOnCard === false ? 'none' : 'short')

        return `
        <div class="prop-row" data-prop-id="${pd.id}" draggable="true">
            <div class="prop-row-header">
                <input type="text" class="prop-name-input"
                    data-role="prop-name" value="${this._esc(pd.name)}"
                    placeholder="${t('propertyName')}">
                <select class="prop-type-select"
                    data-role="prop-type">
                    ${typeOptions}
                </select>
                <div class="prop-row-actions">
                    <button type="button" class="prop-collapse-btn" data-role="prop-collapse"
                        title="${t('collapse')}">
                        <wa-icon name="chevron-down"></wa-icon>
                    </button>
                    <button type="button" class="prop-drag-handle" data-role="prop-drag" title="Drag to reorder">
                        <wa-icon name="bars"></wa-icon>
                    </button>
                    <button type="button" class="schema-row-delete" data-role="remove-prop"
                        title="${t('removeProperty')}">
                        <wa-icon name="xmark"></wa-icon>
                    </button>
                </div>
            </div>
            <div class="prop-row-body" data-role="prop-body">
                <div class="prop-card-display-row">
                    <span class="prop-card-display-label">${t('cardDisplay')}</span>
                    <div class="seg-ctrl prop-card-display-options" data-role="card-display">
                        <button type="button" class="seg-btn prop-card-display-btn ${display === 'none' ? 'active' : ''}" data-value="none">${t('cardDisplayNone')}</button>
                        <button type="button" class="seg-btn prop-card-display-btn ${display === 'short' ? 'active' : ''}" data-value="short">${t('cardDisplayShort')}</button>
                        <button type="button" class="seg-btn prop-card-display-btn ${display === 'long' ? 'active' : ''}" data-value="long">${t('cardDisplayLong')}</button>
                        <button type="button" class="seg-btn prop-card-display-btn ${display === 'multi' ? 'active' : ''}" data-value="multi">${t('cardDisplayMulti')}</button>
                    </div>
                </div>
                <div class="prop-enum-section" ${!isEnum ? 'style="display:none"' : ''}>
                    <div class="enum-options-list" data-role="options-list">
                        ${enumHtml}
                    </div>
                    <wa-button class="add-option-btn" data-role="add-option"
                        variant="neutral" appearance="outlined" size="s">
                        <wa-icon name="plus" slot="prefix"></wa-icon>${t('addOption')}
                    </wa-button>
                </div>
            </div>
        </div>`
    }

    _enumOptionsHtml(pd) {
        return (pd.options || []).map((opt, i) => {
            const c = getColorValue(opt.color)
            const iconName = opt.icon || ''
            return `
            <div class="enum-opt-row" data-opt-id="${opt.id}" draggable="true"
                style="--opt-c:${c}; background: color-mix(in srgb, ${c} 10%, transparent);">
                <button type="button" class="opt-icon-display" data-role="opt-style-trigger"
                    data-opt="${opt.id}" title="${t('color')} / ${t('icon')}">
                    ${iconName
                        ? `<wa-icon name="${iconName}" style="color:${c}"></wa-icon>`
                        : `<span class="opt-icon-display-letter" style="color:${c}">${(opt.label || '?')[0]}</span>`}
                </button>
                <input type="text" class="opt-label-input"
                    data-role="opt-label" data-opt="${opt.id}"
                    value="${this._esc(opt.label)}" placeholder="${t('optionLabel')}">
                <button type="button" class="opt-drag-handle" title="Drag to reorder">
                    <wa-icon name="bars"></wa-icon>
                </button>
                <button type="button" class="schema-row-delete" data-role="opt-remove"
                    data-opt="${opt.id}" title="${t('removeOption')}">
                    <wa-icon name="xmark"></wa-icon>
                </button>
            </div>`
        }).join('')
    }

    _bindPropRows(item, container) {
        // Drag-and-drop for property rows
        this._bindDragSort(container, '.prop-row', (fromId, toId) => {
            const fromIdx = item.properties.findIndex(p => p.id === fromId)
            const toIdx   = item.properties.findIndex(p => p.id === toId)
            if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
            const [moved] = item.properties.splice(fromIdx, 1)
            item.properties.splice(toIdx, 0, moved)
            this._renderProps(item, container)
        }, 'data-prop-id')

        container.querySelectorAll('.prop-row').forEach(row => {
            const propId = row.dataset.propId
            const pd     = item.properties.find(p => p.id === propId)
            if (!pd) return

            row.querySelector('[data-role="prop-name"]')?.addEventListener('input', e => {
                pd.name    = e.target.value
                pd.nameKey = null
            })

            // Collapse button
            row.querySelector('[data-role="prop-collapse"]')?.addEventListener('click', () => {
                const body = row.querySelector('[data-role="prop-body"]')
                const icon = row.querySelector('[data-role="prop-collapse"] wa-icon')
                const isCollapsed = row.classList.toggle('prop-collapsed')
                if (icon) icon.setAttribute('name', isCollapsed ? 'chevron-right' : 'chevron-down')
                if (body) {
                    if (isCollapsed) {
                        body.style.height = body.scrollHeight + 'px'
                        requestAnimationFrame(() => {
                            body.style.transition = 'height 0.2s cubic-bezier(0.4,0,0.2,1), opacity 0.2s'
                            body.style.height = '0'
                            body.style.opacity = '0'
                        })
                    } else {
                        body.style.transition = 'height 0.2s cubic-bezier(0.4,0,0.2,1), opacity 0.2s'
                        body.style.height = body.scrollHeight + 'px'
                        body.style.opacity = '1'
                        body.addEventListener('transitionend', () => {
                            body.style.height = ''
                            body.style.transition = ''
                        }, { once: true })
                    }
                }
            })

            const displayCtrl = row.querySelector('[data-role="card-display"]')
            displayCtrl?.querySelectorAll('.prop-card-display-btn')
                .forEach(btn => {
                    btn.addEventListener('click', () => {
                        pd.cardDisplay = btn.dataset.value
                        displayCtrl.querySelectorAll('.prop-card-display-btn')
                            .forEach(b => b.classList.toggle('active', b.dataset.value === pd.cardDisplay))
                        segCtrlUpdateIndicator(displayCtrl)
                    })
                })
            requestAnimationFrame(() => segCtrlUpdateIndicator(displayCtrl, true))

            row.querySelector('[data-role="prop-type"]')?.addEventListener('change', e => {
                pd.type = e.target.value
                if (pd.type === 'enum' || pd.type === 'multi-enum') {
                    if (!pd.options) pd.options = []
                }
                this._renderProps(item, container)
            })

            row.querySelector('[data-role="remove-prop"]')?.addEventListener('click', () => {
                if (!confirm(t('confirmRemoveProperty'))) return
                item.properties = item.properties.filter(p => p.id !== propId)
                this._renderProps(item, container)
            })

            // Enum option events
            row.querySelector('[data-role="add-option"]')?.addEventListener('click', () => {
                if (!pd.options) pd.options = []
                pd.options.push({
                    id: uuid(),
                    label: `${t('optionN')} ${pd.options.length + 1}`,
                    color: 'slate',
                    icon: 'circle'
                })
                this._renderProps(item, container)
            })

            row.querySelectorAll('[data-role="opt-label"]').forEach(inp => {
                inp.addEventListener('input', e => {
                    const opt = pd.options?.find(o => o.id === inp.dataset.opt)
                    if (opt) { opt.label = e.target.value; opt.labelKey = null }
                })
            })

            row.querySelectorAll('[data-role="opt-style-trigger"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this._openInlineStylePicker(btn, pd, btn.dataset.opt, item, container)
                })
            })

            row.querySelectorAll('[data-role="opt-remove"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    pd.options = (pd.options || []).filter(o => o.id !== btn.dataset.opt)
                    this._renderProps(item, container)
                })
            })

            // Drag-and-drop for enum options within this property row
            const optList = row.querySelector('[data-role="options-list"]')
            if (optList && pd.options?.length > 1) {
                this._bindDragSort(optList, '.enum-opt-row', (fromId, toId) => {
                    const fromIdx = pd.options.findIndex(o => o.id === fromId)
                    const toIdx   = pd.options.findIndex(o => o.id === toId)
                    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
                    const [moved] = pd.options.splice(fromIdx, 1)
                    pd.options.splice(toIdx, 0, moved)
                    this._renderProps(item, container)
                }, 'data-opt-id')
            }
        })
    }

    // Smooth FLIP drag-sort: items animate to their new positions; no ghost follows cursor.
    // container: parent element; itemSel: child selector; onDrop(fromId, toId);
    // idAttr: data attribute holding each item's id.
    _bindDragSort(container, itemSel, onDrop, idAttr) {
        let dragEl    = null
        let dragId    = null
        let currentOverId = null

        const getItems = () => [...container.querySelectorAll(itemSel)]

        // Suppress the native drag ghost image
        const blankImg = new Image()
        blankImg.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

        // Snapshot positions of all items before a DOM move
        const snapPositions = () => {
            const snap = new Map()
            getItems().forEach(el => {
                snap.set(el, el.getBoundingClientRect().top)
            })
            return snap
        }

        // FLIP: animate items from their old positions to their new ones
        const flipItems = (before) => {
            getItems().forEach(el => {
                const oldTop = before.get(el)
                if (oldTop === undefined) return
                const newTop = el.getBoundingClientRect().top
                const delta  = oldTop - newTop
                if (Math.abs(delta) < 1) return
                // Jump to old visual position instantly, then animate to new
                el.style.transition = 'none'
                el.style.transform  = `translateY(${delta}px)`
                requestAnimationFrame(() => {
                    el.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                    el.style.transform  = ''
                })
            })
        }

        container.addEventListener('dragstart', e => {
            const el = e.target.closest(itemSel)
            if (!el) return
            dragEl = el
            dragId = el.getAttribute(idAttr)
            currentOverId = dragId
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setDragImage(blankImg, 0, 0)
            requestAnimationFrame(() => el.classList.add('dragging'))
        }, true)

        container.addEventListener('dragover', e => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            const el = e.target.closest(itemSel)
            if (!el || !dragEl || el === dragEl) return

            // Determine insertion point based on cursor position relative to
            // the hovered element's vertical midpoint — allows landing at any
            // position, not just the very top or bottom.
            const rect   = el.getBoundingClientRect()
            const midY   = rect.top + rect.height / 2
            const insertAfter = e.clientY > midY

            // Build a position key so we only re-order when the insertion
            // point actually changes (prevents jitter / redundant FLIPs).
            const overId = el.getAttribute(idAttr)
            const posKey = overId + (insertAfter ? ':after' : ':before')
            if (posKey === currentOverId) return
            currentOverId = posKey

            // Snapshot, move in DOM, FLIP animate
            const before = snapPositions()
            if (insertAfter) el.after(dragEl)
            else el.before(dragEl)
            flipItems(before)
        })

        container.addEventListener('dragend', e => {
            if (!dragEl) return
            const el = e.target.closest(itemSel)

            dragEl.classList.remove('dragging')
            dragEl.style.transform  = ''
            dragEl.style.transition = ''
            getItems().forEach(n => {
                n.classList.remove('drag-over')
                n.style.transform  = ''
                n.style.transition = ''
            })

            // Commit the new order via onDrop using final DOM order
            const items = getItems()
            const finalOrder = items.map(n => n.getAttribute(idAttr))
            const origOrder  = [...items].sort((a, b) => {
                const ai = finalOrder.indexOf(a.getAttribute(idAttr))
                const bi = finalOrder.indexOf(b.getAttribute(idAttr))
                return ai - bi
            })
            // Find what moved: compare current DOM order to original drag source
            const toId = currentOverId !== dragId ? currentOverId : null
            if (dragId && toId && dragId !== toId) onDrop(dragId, toId)

            dragEl    = null
            dragId    = null
            currentOverId = null
        })
    }

    _openInlineStylePicker(btn, pd, optId, item, container) {
        container.querySelector('.opt-style-popover')?.remove()

        const opt = pd.options?.find(o => o.id === optId)
        if (!opt) return

        // The row that owns this option
        const row = btn.closest('.enum-opt-row')

        // Helper to update the icon display + row background
        const updateVisual = () => {
            const c = getColorValue(opt.color)
            // Update row background tint
            if (row) row.style.background = `color-mix(in srgb, ${c} 10%, transparent)`
            // Update icon display
            const iconDisplay = row?.querySelector('.opt-icon-display')
            if (iconDisplay) {
                iconDisplay.innerHTML = opt.icon
                    ? `<wa-icon name="${opt.icon}" style="color:${c}"></wa-icon>`
                    : `<span class="opt-icon-display-letter" style="color:${c}">${(opt.label || '?')[0]}</span>`
            }
        }

        const popover = document.createElement('div')
        popover.className = 'opt-style-popover opt-color-popover'
        document.body.appendChild(popover)

        // Build content: color section + icon section + no-icon clear
        const colorPicker = new ColorPicker(opt.color, val => {
            opt.color = val
            updateVisual()
        })

        const iconPicker = new IconPicker(opt.icon || '', val => {
            opt.icon = val
            updateVisual()
        })

        popover.innerHTML = `
            <div class="opt-style-section">
                <div class="opt-style-section-label">${t('color')}</div>
                <div class="opt-style-colors"></div>
            </div>
            <div class="opt-style-section">
                <div class="opt-style-section-label">${t('icon')}</div>
                <div class="opt-style-icons"></div>
            </div>`

        const colorContainer = popover.querySelector('.opt-style-colors')
        const iconContainer   = popover.querySelector('.opt-style-icons')
        colorContainer.innerHTML = colorPicker.render()

        // "No icon" as a first grid item + the full icon picker
        const noIconBtn = `<button type="button" class="icon-option opt-no-icon-btn ${!opt.icon ? 'selected' : ''}"
            data-role="opt-icon-clear" title="${t('noIcon')}">
            <wa-icon name="ban"></wa-icon>
        </button>`
        iconContainer.innerHTML = iconPicker.render()
        // Prepend "no icon" into the icon grid
        const grid = iconContainer.querySelector('.icon-grid')
        if (grid) grid.insertAdjacentHTML('afterbegin', noIconBtn)

        colorPicker.bind(colorContainer)
        iconPicker.bind(iconContainer)

        iconContainer.querySelector('[data-role="opt-icon-clear"]')?.addEventListener('click', () => {
            opt.icon = ''
            updateVisual()
            // Visually mark no-icon as selected
            iconContainer.querySelectorAll('.icon-option').forEach(b => b.classList.remove('selected'))
            iconContainer.querySelector('[data-role="opt-icon-clear"]')?.classList.add('selected')
        })

        this._positionPopover(popover, btn)

        const closeOnOutside = e => {
            if (!popover.contains(e.target) && e.target !== btn) {
                popover.remove()
                document.removeEventListener('click', closeOnOutside)
            }
        }
        setTimeout(() => document.addEventListener('click', closeOnOutside), 0)
    }

    _positionPopover(popover, trigger) {
        const rect = trigger.getBoundingClientRect()
        popover.style.position = 'fixed'
        popover.style.zIndex   = '9999'
        popover.style.top      = (rect.bottom + 6) + 'px'
        popover.style.left     = rect.left + 'px'
    }

    // ── helpers ───────────────────────────────────────────────────────────
    _cloneType(t) {
        return {
            id: t.id, name: t.name, nameKey: t.nameKey,
            color: t.color, icon: t.icon, isDefault: t.isDefault,
            properties: (t.properties || []).map(p => ({
                ...p,
                options: (p.options || []).map(o => ({ ...o }))
            }))
        }
    }

    _cloneGroup(g) {
        return {
            id: g.id, name: g.name,
            color: g.color, icon: g.icon,
            properties: (g.properties || []).map(p => ({
                ...p,
                options: (p.options || []).map(o => ({ ...o }))
            }))
        }
    }

    _esc(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
    }
}
