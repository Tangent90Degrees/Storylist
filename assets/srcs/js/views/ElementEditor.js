// ElementEditor — full create/edit modal using Web Awesome components.

import { t } from '../utils/i18n.js'
import ColorPicker from './ColorPicker.js'
import IconPicker from './IconPicker.js'
import { uuid, segCtrlUpdateIndicator } from '../utils/helpers.js'
import { applyPanguToElement } from '../utils/pangu.js'
import { getColorValue, getColorDarker, getColorLighter } from '../data/colors.js'

export default class ElementEditor {
    constructor(modal, onSave) {
        this.modal = modal
        this.onSave = onSave
        this._descMode = 'write'
        this._tags = []
        this._relationships = []
        this._groupIds = []
    }

    // Apply current _descMode to the textarea / preview elements
    _applyDescMode(root) {
        const textarea = root.querySelector('#el-desc')
        const preview = root.querySelector('#el-desc-preview')
        if (!textarea || !preview) return
        root.querySelectorAll('.desc-tab')
            .forEach(b => b.classList.toggle('active', b.dataset.tab === this._descMode))
        if (this._descMode === 'preview') {
            textarea.style.display = 'none'
            preview.classList.remove('hidden')
            preview.innerHTML = window.marked
                ? marked.parse(textarea.value || '')
                : `<pre>${textarea.value}</pre>`
            applyPanguToElement(preview)
        } else {
            textarea.style.display = ''
            preview.classList.add('hidden')
        }
    }

    open(element = null, storybook, allElements) {
        this._storybook = storybook
        this._allElements = allElements
        const isEdit = !!element
        this._descMode = isEdit ? 'preview' : 'write'
        const el = element || {
            name: '', description: '', typeId: storybook.elementTypes[0]?.id || null,
            groupIds: [], tags: [], color: 'indigo', icon: 'circle',
            starred: false, properties: {}, relationships: []
        }

        this._tags = [...(el.tags || [])]
        this._relationships = (el.relationships || []).map(r => ({ ...r }))
        this._groupIds = [...(el.groupIds || [])]
        this._colorPicker = new ColorPicker(el.color)
        this._iconPicker = new IconPicker(el.icon)
        this._selectedTypeId = el.typeId
        this._properties = { ...(el.properties || {}) }
        this._elData = el   // stored for _applyValues

        this.modal.open(this._buildHtml(el, isEdit))
        this._bind(isEdit ? element.id : null, isEdit)
    }

    _buildHtml(el, isEdit) {
        const typeOptions = this._storybook.elementTypes.map(type => {
            const label = t(type.nameKey) || type.name
            return `<option value="${type.id}" ${type.id === el.typeId ? 'selected' : ''}>${label}</option>`
        }).join('')

        const relOptions = (this._allElements || [])
            .filter(e => e.id !== (el.id || ''))
            .map(e => `<option value="${e.id}">${e.name}</option>`)
            .join('')

        return `<div class="modal-inner modal-wide">
            <header class="modal-header">
                <h2 class="modal-title">${isEdit ? t('editElement') : t('createElement')}</h2>
                <wa-button data-modal-close variant="neutral" appearance="text" size="s">
                    <wa-icon name="xmark"></wa-icon>
                </wa-button>
            </header>
            <div class="modal-body editor-body">
                <div class="editor-col editor-col-side">
                    <div class="side-field">
                        <label class="form-label" for="el-type">${t('type')}</label>
                        <select id="el-type" class="form-control">${typeOptions}</select>
                    </div>
                    <div id="el-props-section"></div>
                    <div class="side-field">
                        <label class="form-label">${t('tags')}</label>
                        <div id="el-tags-wrap" class="editor-tags-wrap"></div>
                    </div>
                </div>
                <div class="editor-col editor-col-main">
                    <div class="editor-field">
                        <label class="form-label" for="el-name">${t('name')}</label>
                        <input id="el-name" type="text" class="form-control form-control-lg"
                            value="${this._esc(el.name)}" placeholder="${t('name')}">
                    </div>
                    <div class="editor-field">
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
                    <div class="editor-field">
                        <label class="form-label">${t('relationships')}</label>
                        <div id="el-rels-list" class="rels-list"></div>
                        <wa-button id="btn-add-rel" variant="neutral" appearance="outlined" size="s">
                            <wa-icon name="plus" slot="prefix"></wa-icon>${t('addRelationship')}
                        </wa-button>
                    </div>
                    <div class="editor-field">
                        <div class="desc-header">
                            <label class="form-label" for="el-desc">${t('description')}</label>
                            <div class="seg-ctrl desc-tabs">
                                <button class="seg-btn desc-tab ${this._descMode === 'write' ? 'active' : ''}" data-tab="write">${t('write')}</button>
                                <button class="seg-btn desc-tab ${this._descMode === 'preview' ? 'active' : ''}" data-tab="preview">${t('preview')}</button>
                            </div>
                        </div>
                        <textarea id="el-desc" class="form-control form-textarea" rows="7"
                            placeholder="Markdown supported…">${this._esc(el.description)}</textarea>
                        <div id="el-desc-preview" class="markdown-preview hidden"></div>
                    </div>
                    <div class="editor-scroll-pad"></div>
                </div>
            </div>
            <footer class="modal-footer">
                ${isEdit ? `<wa-button id="el-delete" variant="danger" appearance="outlined">
                    <wa-icon name="trash" slot="prefix"></wa-icon>${t('delete')}
                </wa-button>` : ''}
                <div class="spacer"></div>
                <wa-button data-modal-close variant="neutral" appearance="outlined">${t('cancel')}</wa-button>
                <wa-button id="el-save" variant="brand" appearance="outlined">
                    <wa-icon name="check" slot="prefix"></wa-icon>
                    ${isEdit ? t('save') : t('createElement')}
                </wa-button>
            </footer>
        </div>`
    }

    _renderPropsGroup(props) {
        return props.map(pd => {
            const val = this._properties[pd.id]
            const label = t(pd.nameKey) || pd.name
            if (pd.type === 'text') {
                return `<div class="prop-field">
                    <span class="prop-field-label">${label}</span>
                    <div class="prop-field-control">
                        <input type="text" class="form-control form-control-sm" data-prop="${pd.id}"
                            value="${this._esc(String(val ?? ''))}">
                    </div></div>`
            }
            if (pd.type === 'number') {
                return `<div class="prop-field">
                    <span class="prop-field-label">${label}</span>
                    <div class="prop-field-control">
                        <input type="number" class="form-control form-control-sm" data-prop="${pd.id}"
                            value="${val ?? ''}">
                    </div></div>`
            }
            if ((pd.type === 'enum' || pd.type === 'multi-enum') && pd.options) {
                const selected = pd.type === 'multi-enum' ? (Array.isArray(val) ? val : []) : null
                const opts = pd.options.map(o => {
                    const isSelected = pd.type === 'enum' ? val === o.id : selected.includes(o.id)
                    const c = getColorValue(o.color)
                    const iconHtml = o.icon ? `<wa-icon name="${o.icon}" class="chip-icon"></wa-icon>` : ''
                    return `<button type="button"
                        class="enum-opt ${isSelected ? 'selected' : ''}"
                        data-prop="${pd.id}" data-opt="${o.id}"
                        style="--opt-c:${c}"
                        ${pd.type === 'multi-enum' ? 'data-multi="true"' : ''}>
                        ${iconHtml}${t(o.labelKey) || o.label}</button>`
                }).join('')
                return `<div class="prop-field">
                    <span class="prop-field-label">${label}</span>
                    <div class="prop-field-control">
                        <div class="enum-opts">${opts}</div>
                    </div></div>`
            }
            return ''
        }).filter(Boolean).join('')
    }

    _renderProps() {
        const section = this.modal.container.querySelector('#el-props-section')
        if (!section) return

        const type = this._storybook.getType(this._selectedTypeId)
        const typeProps = type?.properties || []

        // Active groups in order, each with their properties
        const activeGroups = this._groupIds
            .map(gid => this._storybook.getGroup(gid))
            .filter(Boolean)

        const hasTypeProps = typeProps.length > 0
        const hasGroupProps = activeGroups.some(g => g.properties?.length > 0)

        // Available groups not yet added to this element
        const availableGroups = this._storybook.elementGroups
            .filter(g => !this._groupIds.includes(g.id))

        const blocks = []

        // Type properties block (no remove button — always present)
        if (hasTypeProps) {
            const typeName = t(type.nameKey) || type.name
            blocks.push(`
                <div class="props-group">
                    <div class="props-group-header">
                        <wa-icon name="${type.icon || 'circle'}" style="font-size:0.85em"></wa-icon>
                        <span class="props-group-name">${typeName}</span>
                    </div>
                    ${this._renderPropsGroup(typeProps)}
                </div>`)
        }

        // One block per active group (with remove button on hover)
        for (const g of activeGroups) {
            const gProps = g.properties || []
            if (!gProps.length) continue
            blocks.push(`
                <div class="props-group" data-group-block="${g.id}">
                    <div class="props-group-header">
                        <wa-icon name="${g.icon || 'circle'}" style="font-size:0.85em"></wa-icon>
                        <span class="props-group-name">${g.name}</span>
                        <button type="button" class="props-group-remove" data-remove-group="${g.id}"
                            title="${t('removeGroup')}">
                            <wa-icon name="xmark"></wa-icon>
                        </button>
                    </div>
                    ${this._renderPropsGroup(gProps)}
                </div>`)
        }

        // Add-group button at the bottom (only if there are available groups)
        if (availableGroups.length) {
            const opts = availableGroups.map(g =>
                `<button type="button" class="props-add-group-item" data-add-group="${g.id}">
                    <wa-icon name="${g.icon || 'circle'}" style="font-size:0.85em"></wa-icon>
                    ${g.name}
                </button>`).join('')
            blocks.push(`
                <div class="props-add-group-wrap">
                    <wa-button type="button" class="props-add-group-btn" id="props-add-group-toggle"
                        variant="neutral" appearance="outlined" size="s">
                        <wa-icon name="plus" slot="prefix"></wa-icon>
                        ${t('addGroupProperty')}
                    </wa-button>
                    <div class="props-add-group-menu hidden" id="props-add-group-menu">
                        ${opts}
                    </div>
                </div>`)
        }

        section.innerHTML = blocks.join('')
        this._bindProps(section)

        // Remove group buttons
        section.querySelectorAll('[data-remove-group]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation()
                const gid = btn.dataset.removeGroup
                this._groupIds = this._groupIds.filter(id => id !== gid)
                this._renderProps()
            })
        })

        // Add-group toggle + menu
        const toggle = section.querySelector('#props-add-group-toggle')
        const menu = section.querySelector('#props-add-group-menu')
        if (toggle && menu) {
            toggle.addEventListener('click', () => menu.classList.toggle('hidden'))
            menu.querySelectorAll('[data-add-group]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this._groupIds.push(btn.dataset.addGroup)
                    this._renderProps()
                })
            })
        }
    }

    _bindProps(section) {
        section.querySelectorAll('[data-prop]').forEach(el => {
            if (el.tagName === 'INPUT') {
                el.addEventListener('input', () => {
                    this._properties[el.dataset.prop] =
                        el.type === 'number' ? Number(el.value) : el.value
                })
            } else if (el.tagName === 'BUTTON') {
                el.addEventListener('click', () => {
                    const prop = el.dataset.prop
                    const opt = el.dataset.opt
                    const isMulti = el.dataset.multi === 'true'
                    if (isMulti) {
                        let arr = Array.isArray(this._properties[prop])
                            ? [...this._properties[prop]] : []
                        arr = arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt]
                        this._properties[prop] = arr
                        el.closest('.enum-opts')?.querySelectorAll(`[data-prop="${prop}"]`)
                            .forEach(b => b.classList.toggle('selected', arr.includes(b.dataset.opt)))
                    } else {
                        this._properties[prop] = opt
                        el.closest('.enum-opts')?.querySelectorAll(`[data-prop="${prop}"]`)
                            .forEach(b => b.classList.toggle('selected', b.dataset.opt === opt))
                    }
                })
            }
        })
    }

    _renderTags() {
        const wrap = this.modal.container.querySelector('#el-tags-wrap')
        if (!wrap) return
        const chips = this._tags.map(tag =>
            `<span class="editor-tag-chip">
                <span class="editor-tag-text">${tag}</span>
                <button type="button" class="editor-tag-remove" data-tag="${this._esc(tag)}">
                    <wa-icon name="xmark"></wa-icon>
                </button>
            </span>`
        ).join('')
        wrap.innerHTML = `${chips}<input id="el-tag-input" type="text" class="editor-tag-input"
            placeholder="${this._tags.length ? '' : t('addTagHint')}">`
        wrap.querySelectorAll('.editor-tag-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                this._tags = this._tags.filter(tag => tag !== btn.dataset.tag)
                this._renderTags()
            })
        })
        this._bindTagInput(wrap.querySelector('#el-tag-input'))
    }

    _bindTagInput(input) {
        if (!input) return
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                const val = input.value.trim().replace(/,/g, '')
                if (val && !this._tags.includes(val)) {
                    this._tags.push(val)
                    this._renderTags()
                }
            } else if (e.key === 'Backspace' && !input.value && this._tags.length) {
                this._tags.pop()
                this._renderTags()
            }
        })
    }

    _renderRelationships() {
        const list = this.modal.container.querySelector('#el-rels-list')
        if (!list) return

        if (!this._relationships.length) {
            list.innerHTML = `<p class="empty-hint">${t('noRelationships')}</p>`
            return
        }

        const availableElements = (this._allElements || []).filter(e => e.id !== this._elData?.id)

        list.innerHTML = this._relationships.map(rel => {
            const target = availableElements.find(e => e.id === rel.targetId)
            const tc = target ? getColorValue(target.color) : null
            const tct = target ? getColorDarker(target.color) : null
            const tctl = target ? getColorLighter(target.color) : null
            const targetBtn = target
                ? `<button type="button" class="rel-target-btn" data-role="rel-target-trigger" data-rel="${rel.id}"
                    style="--rel-target-c:${tc}; --rel-target-text:${tct}; --rel-target-text-dark:${tctl}">
                    <wa-icon name="${target.icon}" style="font-size:13px;flex-shrink:0"></wa-icon>
                    <span class="rel-target-name">${target.name}</span>
                    <wa-icon name="chevron-down" style="font-size:0.75em;opacity:0.6;flex-shrink:0;margin-left:auto"></wa-icon>
                   </button>`
                : `<button type="button" class="rel-target-btn rel-target-empty" data-role="rel-target-trigger" data-rel="${rel.id}">
                    <span class="rel-target-name">${t('selectElement')}</span>
                    <wa-icon name="chevron-down" style="font-size:0.75em;flex-shrink:0;margin-left:auto"></wa-icon>
                   </button>`
            return `
            <div class="rel-item" data-rel-id="${rel.id}" draggable="true">
                <input type="text" class="opt-label-input rel-label-input"
                    data-role="rel-label" data-rel="${rel.id}"
                    value="${this._esc(rel.label || '')}"
                    placeholder="${t('relationshipLabel')}">
                <wa-icon name="arrow-right" class="rel-arrow"></wa-icon>
                <div class="rel-target-wrap" data-rel="${rel.id}">
                    ${targetBtn}
                </div>
                <button type="button" class="rel-visibility-btn ${rel.showOnCard !== false ? 'visible' : ''}"
                    data-role="rel-visibility" data-rel="${rel.id}"
                    title="${t('showOnCard')}">
                    <wa-icon name="${rel.showOnCard !== false ? 'eye' : 'eye-slash'}"></wa-icon>
                </button>
                <button type="button" class="opt-drag-handle rel-drag-handle" title="Drag to reorder">
                    <wa-icon name="bars"></wa-icon>
                </button>
                <button type="button" class="schema-row-delete rel-delete" data-rel="${rel.id}"
                    title="${t('delete')}">
                    <wa-icon name="xmark"></wa-icon>
                </button>
            </div>`
        }).join('')

        // Label edits
        list.querySelectorAll('[data-role="rel-label"]').forEach(inp => {
            inp.addEventListener('input', () => {
                const rel = this._relationships.find(r => r.id === inp.dataset.rel)
                if (rel) rel.label = inp.value
            })
        })

        // Target picker triggers
        list.querySelectorAll('[data-role="rel-target-trigger"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this._openRelTargetPicker(btn, btn.dataset.rel)
            })
        })

        // Visibility toggle
        list.querySelectorAll('[data-role="rel-visibility"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const rel = this._relationships.find(r => r.id === btn.dataset.rel)
                if (!rel) return
                rel.showOnCard = rel.showOnCard === false ? true : false
                const icon = btn.querySelector('wa-icon')
                icon?.setAttribute('name', rel.showOnCard !== false ? 'eye' : 'eye-slash')
                btn.classList.toggle('visible', rel.showOnCard !== false)
            })
        })

        // Delete buttons
        list.querySelectorAll('.rel-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                this._relationships = this._relationships.filter(r => r.id !== btn.dataset.rel)
                this._renderRelationships()
            })
        })

        // Drag-to-reorder (FLIP, same pattern as SchemaManager)
        this._bindRelDragSort(list)
    }

    // Open an element picker panel anchored to the trigger button
    _openRelTargetPicker(btn, relId) {
        // Close any open picker
        document.querySelector('.rel-target-picker')?.remove()

        const rel = this._relationships.find(r => r.id === relId)
        if (!rel) return

        const available = (this._allElements || []).filter(e => e.id !== this._elData?.id)

        const panel = document.createElement('div')
        panel.className = 'rel-target-picker'

        const renderList = (query = '') => {
            const filtered = available.filter(e =>
                !query || e.name.toLowerCase().includes(query.toLowerCase()))
            panel.innerHTML = `
                <div class="rel-picker-search">
                    <input type="text" class="form-control form-control-sm rel-picker-input"
                        placeholder="${t('searchPlaceholder')}" value="${this._esc(query)}">
                </div>
                <div class="rel-picker-list">
                    ${filtered.length ? filtered.map(e => {
                const c = getColorValue(e.color)
                return `<button type="button" class="rel-picker-item ${rel.targetId === e.id ? 'selected' : ''}"
                            data-el-id="${e.id}">
                            <span class="rel-picker-icon" style="background:${c}">
                                <wa-icon name="${e.icon}"></wa-icon>
                            </span>
                            <span class="rel-picker-name">${e.name}</span>
                            ${rel.targetId === e.id ? '<wa-icon name="check" style="margin-left:auto;font-size:0.85em"></wa-icon>' : ''}
                        </button>`
            }).join('') : `<p class="empty-hint" style="padding:8px 12px">${t('noElements')}</p>`}
                </div>`

            panel.querySelector('.rel-picker-input')?.addEventListener('input', e => {
                renderList(e.target.value)
            })
            panel.querySelectorAll('.rel-picker-item').forEach(item => {
                item.addEventListener('click', () => {
                    rel.targetId = item.dataset.elId
                    panel.remove()
                    this._renderRelationships()
                })
            })
            // Re-focus search
            requestAnimationFrame(() => panel.querySelector('.rel-picker-input')?.focus())
        }

        renderList()
        document.body.appendChild(panel)

        // Position below the button
        const rect = btn.getBoundingClientRect()
        panel.style.position = 'fixed'
        panel.style.zIndex = '9999'
        panel.style.top = (rect.bottom + 4) + 'px'
        panel.style.left = rect.left + 'px'

        const close = e => {
            if (!panel.contains(e.target) && e.target !== btn) {
                panel.remove()
                document.removeEventListener('click', close)
            }
        }
        setTimeout(() => document.addEventListener('click', close), 0)
        requestAnimationFrame(() => panel.querySelector('.rel-picker-input')?.focus())
    }

    _bindRelDragSort(container) {
        const itemSel = '.rel-item'
        const idAttr = 'data-rel-id'
        let dragEl = null, dragId = null, currentOverId = null

        const blankImg = new Image()
        blankImg.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

        const getItems = () => [...container.querySelectorAll(itemSel)]

        const snapPositions = () => {
            const snap = new Map()
            getItems().forEach(el => snap.set(el, el.getBoundingClientRect().top))
            return snap
        }

        const flipItems = (before) => {
            getItems().forEach(el => {
                const oldTop = before.get(el)
                if (oldTop === undefined) return
                const delta = oldTop - el.getBoundingClientRect().top
                if (Math.abs(delta) < 1) return
                el.style.transition = 'none'
                el.style.transform = `translateY(${delta}px)`
                requestAnimationFrame(() => {
                    el.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                    el.style.transform = ''
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
            const el = e.target.closest(itemSel)
            if (!el || !dragEl || el === dragEl) return
            const rect = el.getBoundingClientRect()
            const insertAfter = e.clientY > rect.top + rect.height / 2
            const posKey = el.getAttribute(idAttr) + (insertAfter ? ':after' : ':before')
            if (posKey === currentOverId) return
            currentOverId = posKey
            const before = snapPositions()
            if (insertAfter) el.after(dragEl)
            else el.before(dragEl)
            flipItems(before)
        })

        container.addEventListener('dragend', () => {
            if (!dragEl) return
            dragEl.classList.remove('dragging')
            dragEl.style.transform = dragEl.style.transition = ''
            getItems().forEach(n => { n.style.transform = n.style.transition = '' })
            // Commit new order to data
            const finalIds = getItems().map(n => n.getAttribute(idAttr))
            this._relationships.sort((a, b) => finalIds.indexOf(a.id) - finalIds.indexOf(b.id))
            dragEl = null; dragId = null; currentOverId = null
        })
    }

    _val(id) {
        // Works for both native inputs and wa-* components (both expose .value)
        return this.modal.container.querySelector(id)?.value ?? ''
    }

    _bind(elementId, isEdit) {
        const root = this.modal.container
        this._colorPicker.bind(root)
        this._iconPicker.bind(root)

        root.querySelectorAll('[data-modal-close]').forEach(btn =>
            btn.addEventListener('click', () => this.modal.close()))

        // Native <select> fires 'change'
        root.querySelector('#el-type')?.addEventListener('change', e => {
            this._selectedTypeId = e.target.value
            this._renderProps()
        })

        const descCtrl = root.querySelector('.desc-tabs')
        root.querySelectorAll('.desc-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this._descMode = btn.dataset.tab
                root.querySelectorAll('.desc-tab').forEach(b =>
                    b.classList.toggle('active', b.dataset.tab === this._descMode))
                segCtrlUpdateIndicator(descCtrl)
                this._applyDescMode(root)
            })
        })
        // Initialize preview state (defaults to preview when editing)
        this._applyDescMode(root)
        requestAnimationFrame(() => segCtrlUpdateIndicator(descCtrl, true))

        // Tag input is now managed by _renderTags/_bindTagInput; no separate listener needed here

        root.querySelector('#btn-add-rel')?.addEventListener('click', () => {
            this._relationships.push({ id: uuid(), targetId: '', label: '', showOnCard: true })
            this._renderRelationships()
        })

        root.querySelector('#el-delete')?.addEventListener('click', () => {
            if (confirm(t('deleteConfirm'))) {
                this.onSave({ id: elementId, _delete: true })
                this.modal.close()
            }
        })

        root.querySelector('#el-save')?.addEventListener('click', () => {
            const name = this._val('#el-name').trim()
            if (!name) { root.querySelector('#el-name')?.focus(); return }
            this.onSave({
                ...(isEdit ? { id: elementId } : {}),
                name,
                description: this._val('#el-desc'),
                typeId: this._selectedTypeId,
                color: this._colorPicker.selected,
                icon: this._iconPicker.selected,
                starred: this._elData.starred ?? false,
                tags: this._tags,
                groupIds: this._groupIds,
                properties: this._properties,
                relationships: this._relationships
            })
            this.modal.close()
        })

        this._renderProps()
        this._renderTags()
        this._renderRelationships()
    }

    _esc(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')
            .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }
}
