// ElementEditor — full create/edit modal.

import { t } from '../utils/i18n.js'
import ColorPicker from './ColorPicker.js'
import IconPicker from './IconPicker.js'
import { uuid } from '../utils/helpers.js'
import { getColorValue, getColorDarker, getColorLighter } from '../data/colors.js'

export default class ElementEditor {
    constructor(modal, onSave) {
        this.modal = modal
        this.onSave = onSave
        this._tags = []
        this._relationships = []
        this._groupIds = []
    }

    // Convert markdown to HTML for contenteditable display
    _mdToHtml(md) {
        if (!md) return '<p><br></p>'
        let html = md
        // Headers
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Bold
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Underline (already HTML)
        // Code blocks
        html = html.replace(/```\n?([\s\S]*?)\n?```/g, '<pre><code>$1</code></pre>')
        // Inline code
        html = html.replace(/`(.+?)`/g, '<code>$1</code>')
        // Bullet lists
        const lines = html.split('\n')
        let inList = false
        const result = []
        for (const line of lines) {
            if (line.match(/^- (.+)$/)) {
                if (!inList) {
                    result.push('<ul>')
                    inList = true
                }
                result.push('<li>' + line.replace(/^- /, '') + '</li>')
            } else {
                if (inList) {
                    result.push('</ul>')
                    inList = false
                }
                if (line.match(/^<(h[123]|pre)/)) {
                    result.push(line)
                } else if (line.trim()) {
                    result.push('<p>' + line + '</p>')
                }
            }
        }
        if (inList) result.push('</ul>')
        return result.join('') || '<p><br></p>'
    }

    // Convert contenteditable HTML back to markdown
    _htmlToMd(html) {
        if (!html) return ''
        let md = html
        // Clean up contenteditable artifacts
        md = md.replace(/<div>/g, '\n').replace(/<\/div>/g, '')
        md = md.replace(/<br\s*\/?>/g, '\n')
        // Headers
        md = md.replace(/<h1>(.*?)<\/h1>/g, '# $1\n')
        md = md.replace(/<h2>(.*?)<\/h2>/g, '## $1\n')
        md = md.replace(/<h3>(.*?)<\/h3>/g, '### $1\n')
        // Bold
        md = md.replace(/<strong>(.*?)<\/strong>/g, '**$1**')
        md = md.replace(/<b>(.*?)<\/b>/g, '**$1**')
        // Code blocks
        md = md.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, '```\n$1\n```')
        // Inline code
        md = md.replace(/<code>(.*?)<\/code>/g, '`$1`')
        // Lists
        md = md.replace(/<li>(.*?)<\/li>/g, '- $1\n')
        md = md.replace(/<\/?ul>/g, '')
        // Paragraphs
        md = md.replace(/<p>(.*?)<\/p>/g, '$1\n')
        // Clean up
        md = md.replace(/\n{3,}/g, '\n\n').trim()
        return md
    }

    // Return the tag name of the block element containing the cursor, or null
    _cursorBlockTag() {
        const sel = window.getSelection()
        if (!sel || !sel.rangeCount) return null
        let node = sel.anchorNode
        if (!node) return null
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
        const block = node.closest('h1, h2, h3, p, li, pre, div')
        return block ? block.tagName.toUpperCase() : null
    }

    // Update toolbar button active states to reflect current cursor/selection
    _updateToolbarState(root) {
        const editor = root.querySelector('#el-desc')
        if (!editor) return
        // Only update if selection is inside or editor is focused
        const sel = window.getSelection()
        if (sel && sel.rangeCount) {
            const anchor = sel.anchorNode
            if (anchor && !editor.contains(anchor) && document.activeElement !== editor) return
        }

        try {
            const isBold      = document.queryCommandState('bold')
            const isUnderline = document.queryCommandState('underline')
            const isUL        = document.queryCommandState('insertUnorderedList')
            const isOL        = document.queryCommandState('insertOrderedList')
            const alignLeft   = document.queryCommandState('justifyLeft')
            const alignCenter = document.queryCommandState('justifyCenter')
            const alignRight  = document.queryCommandState('justifyRight')
            const alignFull   = document.queryCommandState('justifyFull')
            const blockTag    = this._cursorBlockTag()
            // Detect <code> by walking the cursor node up
            let codeNode = window.getSelection()?.anchorNode
            if (codeNode?.nodeType === Node.TEXT_NODE) codeNode = codeNode.parentElement
            const isCode = !!codeNode?.closest('code')

            root.querySelector('[data-format="bold"]')
                ?.classList.toggle('active', isBold)
            root.querySelector('[data-format="underline"]')
                ?.classList.toggle('active', isUnderline)
            root.querySelector('[data-format="code"]')
                ?.classList.toggle('active', isCode)
            root.querySelector('[data-format="ul"]')
                ?.classList.toggle('active', isUL)
            root.querySelector('[data-format="ol"]')
                ?.classList.toggle('active', isOL)
            // Alignment: only one can be active at a time
            root.querySelector('[data-format="alignLeft"]')
                ?.classList.toggle('active', alignLeft && !alignFull)
            root.querySelector('[data-format="alignCenter"]')
                ?.classList.toggle('active', alignCenter)
            root.querySelector('[data-format="alignRight"]')
                ?.classList.toggle('active', alignRight)
            root.querySelector('[data-format="alignJustify"]')
                ?.classList.toggle('active', alignFull)
            root.querySelector('[data-format="h1"]')
                ?.classList.toggle('active', blockTag === 'H1')
            root.querySelector('[data-format="h2"]')
                ?.classList.toggle('active', blockTag === 'H2')
        } catch (_) { /* queryCommandState may throw in some browsers */ }
    }

    // Apply formatting via execCommand to contenteditable
    _applyFormat(editor, format) {
        editor.focus()
        switch (format) {
            case 'h1': {
                // Toggle: if already h1, restore to paragraph
                const cur = this._cursorBlockTag()
                document.execCommand('formatBlock', false, cur === 'H1' ? '<p>' : '<h1>')
                break
            }
            case 'h2': {
                const cur = this._cursorBlockTag()
                document.execCommand('formatBlock', false, cur === 'H2' ? '<p>' : '<h2>')
                break
            }
            case 'bold':
                document.execCommand('bold', false, null)
                break
            case 'underline':
                document.execCommand('underline', false, null)
                break
            case 'ul':
                document.execCommand('insertUnorderedList', false, null)
                break
            case 'ol':
                document.execCommand('insertOrderedList', false, null)
                break
            case 'alignLeft':
                document.execCommand('justifyLeft', false, null)
                break
            case 'alignCenter':
                document.execCommand('justifyCenter', false, null)
                break
            case 'alignRight':
                document.execCommand('justifyRight', false, null)
                break
            case 'alignJustify':
                document.execCommand('justifyFull', false, null)
                break
            case 'code': {
                // Toggle: if cursor is already inside a <code>, unwrap it; otherwise wrap selection
                const sel = window.getSelection()
                if (!sel || !sel.rangeCount) return
                const range = sel.getRangeAt(0)
                // Check if selection/cursor is inside a <code> element
                let node = sel.anchorNode
                if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement
                const existingCode = node?.closest('code')
                if (existingCode) {
                    // Unwrap: replace <code> with its text content
                    const parent = existingCode.parentNode
                    while (existingCode.firstChild) parent.insertBefore(existingCode.firstChild, existingCode)
                    parent.removeChild(existingCode)
                } else {
                    const code = document.createElement('code')
                    code.appendChild(range.extractContents())
                    range.insertNode(code)
                    range.setStartAfter(code)
                    range.collapse(true)
                    sel.removeAllRanges()
                    sel.addRange(range)
                }
                break
            }
        }
    }

    open(element = null, storybook, allElements) {
        this._storybook = storybook
        this._allElements = allElements
        const isEdit = !!element
        const el = element || {
            name: '', description: '', typeId: storybook.elementTypes[0]?.id || null,
            groupIds: [], tags: [], color: 'indigo', icon: 'circle',
            starred: false, properties: {}, relationships: []
        }
        this._tags = [...(el.tags || [])]
        this._relationships = (el.relationships || []).map(r => ({ ...r }))
        this._groupIds = [...(el.groupIds || [])]
        this._avatar = el.avatar || null
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
                        <label class="form-label">${t('avatar')}</label>
                        <div class="avatar-upload-wrap" id="el-avatar-wrap">
                            <div class="avatar-preview" id="el-avatar-preview">
                                ${el.avatar
                                    ? `<img src="${el.avatar}" class="avatar-preview-img" alt="">`
                                    : `<wa-icon name="${el.icon}" class="avatar-preview-icon"></wa-icon>`}
                            </div>
                            <div class="avatar-upload-actions">
                                <div class="avatar-btn-row">
                                    <label class="avatar-upload-btn" for="el-avatar-input">
                                        <wa-icon name="arrow-up-from-bracket"></wa-icon>
                                        ${t('uploadAvatar')}
                                    </label>
                                    <input id="el-avatar-input" type="file" accept="image/*" style="display:none">
                                    ${el.avatar ? `<button type="button" class="avatar-crop-btn" id="el-avatar-crop" title="${t('cropAvatar')}">
                                        <wa-icon name="crop-simple"></wa-icon>
                                        ${t('cropAvatar')}
                                    </button>` : ''}
                                </div>
                                ${el.avatar ? `<button type="button" class="avatar-remove-btn" id="el-avatar-remove">
                                    <wa-icon name="xmark"></wa-icon>${t('removeAvatar')}
                                </button>` : ''}
                            </div>
                        </div>
                    </div>
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
                        <label class="form-label">${t('description')}</label>
                        <div class="desc-toolbar">
                            <button type="button" class="desc-tool" data-format="h1" title="${t('heading')}"><wa-icon name="heading"></wa-icon><span>H1</span></button>
                            <button type="button" class="desc-tool" data-format="h2" title="${t('subheading')}"><wa-icon name="heading"></wa-icon><span>H2</span></button>
                            <div class="desc-toolbar-sep"></div>
                            <button type="button" class="desc-tool" data-format="bold" title="${t('bold')}"><wa-icon name="bold"></wa-icon></button>
                            <button type="button" class="desc-tool" data-format="underline" title="${t('underline')}"><wa-icon name="underline"></wa-icon></button>
                            <button type="button" class="desc-tool" data-format="code" title="${t('codeBlock')}"><wa-icon name="code"></wa-icon></button>
                            <div class="desc-toolbar-sep"></div>
                            <button type="button" class="desc-tool" data-format="ul" title="${t('bulletList')}"><wa-icon name="list-ul"></wa-icon></button>
                            <button type="button" class="desc-tool" data-format="ol" title="${t('numberedList')}"><wa-icon name="list-ol"></wa-icon></button>
                            <div class="desc-toolbar-sep"></div>
                            <button type="button" class="desc-tool" data-format="alignLeft" title="${t('alignLeft')}"><wa-icon name="align-left"></wa-icon></button>
                            <button type="button" class="desc-tool" data-format="alignCenter" title="${t('alignCenter')}"><wa-icon name="align-center"></wa-icon></button>
                            <button type="button" class="desc-tool" data-format="alignRight" title="${t('alignRight')}"><wa-icon name="align-right"></wa-icon></button>
                            <button type="button" class="desc-tool" data-format="alignJustify" title="${t('alignJustify')}"><wa-icon name="align-justify"></wa-icon></button>
                        </div>
                        <div id="el-desc" class="rich-editor" contenteditable="true"
                            data-placeholder="${t('descriptionPlaceholder')}"></div>
                        <div id="el-desc-ctxmenu" class="rich-ctxmenu hidden"></div>
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
                    const c   = getColorValue(o.color)
                    const cdk = getColorDarker(o.color)
                    const clt = getColorLighter(o.color)
                    const iconHtml = o.icon ? `<wa-icon name="${o.icon}" class="chip-icon"></wa-icon>` : ''
                    return `<button type="button"
                        class="enum-opt ${isSelected ? 'selected' : ''}"
                        data-prop="${pd.id}" data-opt="${o.id}"
                        style="--opt-c:${c};--opt-text:${cdk};--opt-text-dark:${clt}"
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

        // Avatar upload
        const avatarInput = root.querySelector('#el-avatar-input')
        const avatarPreview = root.querySelector('#el-avatar-preview')
        const _refreshAvatarButtons = () => {
            const actions = root.querySelector('.avatar-upload-actions')
            if (!actions) return
            // Rebuild the button row
            const existingRow = actions.querySelector('.avatar-btn-row')
            if (existingRow) existingRow.remove()
            const existingRemove = actions.querySelector('#el-avatar-remove')
            if (existingRemove) existingRemove.remove()

            const row = document.createElement('div')
            row.className = 'avatar-btn-row'

            // Upload button (always present)
            const uploadLabel = document.createElement('label')
            uploadLabel.className = 'avatar-upload-btn'
            uploadLabel.htmlFor = 'el-avatar-input'
            uploadLabel.innerHTML = `<wa-icon name="arrow-up-from-bracket"></wa-icon>${t('uploadAvatar')}`
            row.appendChild(uploadLabel)

            // Crop button (only if avatar exists)
            if (this._avatar) {
                const cropBtn = document.createElement('button')
                cropBtn.type = 'button'
                cropBtn.className = 'avatar-crop-btn'
                cropBtn.id = 'el-avatar-crop'
                cropBtn.title = t('cropAvatar')
                cropBtn.innerHTML = `<wa-icon name="crop-simple"></wa-icon>${t('cropAvatar')}`
                cropBtn.addEventListener('click', () => this._openCropEditor(root))
                row.appendChild(cropBtn)
            }
            actions.insertBefore(row, actions.firstChild)

            // Remove button (only if avatar exists)
            if (this._avatar) {
                const removeBtn = document.createElement('button')
                removeBtn.type = 'button'
                removeBtn.className = 'avatar-remove-btn'
                removeBtn.id = 'el-avatar-remove'
                removeBtn.innerHTML = `<wa-icon name="xmark"></wa-icon>${t('removeAvatar')}`
                removeBtn.addEventListener('click', () => _removeAvatar())
                actions.appendChild(removeBtn)
            }
        }
        const _removeAvatar = () => {
            this._avatar = null
            const icon = this._iconPicker?.selected || 'circle'
            avatarPreview.innerHTML = `<wa-icon name="${icon}" class="avatar-preview-icon"></wa-icon>`
            _refreshAvatarButtons()
            if (avatarInput) avatarInput.value = ''
        }
        if (avatarInput) {
            avatarInput.addEventListener('change', e => {
                const file = e.target.files[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = ev => {
                    this._avatar = ev.target.result
                    avatarPreview.innerHTML = `<img src="${this._avatar}" class="avatar-preview-img" alt="">`
                    _refreshAvatarButtons()
                }
                reader.readAsDataURL(file)
            })
        }
        // Bind crop button on initial render
        root.querySelector('#el-avatar-crop')?.addEventListener('click', () => this._openCropEditor(root))

        root.querySelectorAll('[data-modal-close]').forEach(btn =>
            btn.addEventListener('click', () => this.modal.close()))

        // Native <select> fires 'change'
        root.querySelector('#el-type')?.addEventListener('change', e => {
            this._selectedTypeId = e.target.value
            this._renderProps()
        })

        // Rich text editor (contenteditable) setup
        const editor = root.querySelector('#el-desc')
        const ctxmenu = root.querySelector('#el-desc-ctxmenu')

        // Populate with initial content as HTML
        editor.innerHTML = this._mdToHtml(this._elData.description || '')

        // Toolbar buttons — mousedown prevents blur, click applies format then updates state
        root.querySelectorAll('.desc-tool').forEach(btn => {
            btn.addEventListener('mousedown', e => e.preventDefault())
            btn.addEventListener('click', () => {
                this._applyFormat(editor, btn.dataset.format)
                this._updateToolbarState(root)
            })
        })

        // Update toolbar state on cursor movement / selection change
        editor.addEventListener('keyup',   () => this._updateToolbarState(root))
        editor.addEventListener('mouseup', () => this._updateToolbarState(root))
        // selectionchange fires on document, filter to this editor
        document.addEventListener('selectionchange', () => {
            if (document.activeElement === editor) this._updateToolbarState(root)
        })

        // Keyboard shortcuts (Ctrl/Cmd+Z for undo, Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y for redo)
        editor.addEventListener('keydown', e => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
            const mod = isMac ? e.metaKey : e.ctrlKey
            if (mod && e.key === 'z' && !e.shiftKey) {
                document.execCommand('undo')
                e.preventDefault()
            } else if ((mod && e.key === 'z' && e.shiftKey) || (mod && e.key === 'y')) {
                document.execCommand('redo')
                e.preventDefault()
            }
        })

        // Helper: build and bind the formatting icon row inside the context menu
        const renderFmtRow = () => {
            const fmts = [
                { format: 'h1',        icon: 'heading', label: 'H1' },
                { format: 'h2',        icon: 'heading', label: 'H2' },
                { type: 'sep' },
                { format: 'bold',      icon: 'bold' },
                { format: 'underline', icon: 'underline' },
                { format: 'code',      icon: 'code' },
                { type: 'sep' },
                { format: 'ul',        icon: 'list-ul' },
                { format: 'ol',        icon: 'list-ol' },
            ]

            // Detect current active states using the same logic as _updateToolbarState
            let isBold = false, isUnderline = false, isUL = false, isOL = false, isCode = false, blockTag = null
            try {
                isBold      = document.queryCommandState('bold')
                isUnderline = document.queryCommandState('underline')
                isUL        = document.queryCommandState('insertUnorderedList')
                isOL        = document.queryCommandState('insertOrderedList')
                blockTag    = this._cursorBlockTag()
                let codeCheck = window.getSelection()?.anchorNode
                if (codeCheck?.nodeType === Node.TEXT_NODE) codeCheck = codeCheck.parentElement
                isCode = !!codeCheck?.closest('code')
            } catch (_) {}

            const isActive = fmt => {
                if (fmt === 'bold')      return isBold
                if (fmt === 'underline') return isUnderline
                if (fmt === 'ul')        return isUL
                if (fmt === 'ol')        return isOL
                if (fmt === 'code')      return isCode
                if (fmt === 'h1')        return blockTag === 'H1'
                if (fmt === 'h2')        return blockTag === 'H2'
                return false
            }

            const row = document.createElement('div')
            row.className = 'rich-ctxmenu-fmt-row'

            fmts.forEach(item => {
                if (item.type === 'sep') {
                    const sep = document.createElement('div')
                    sep.className = 'desc-toolbar-sep'
                    row.appendChild(sep)
                    return
                }
                const btn = document.createElement('button')
                btn.type = 'button'
                btn.className = 'rich-ctxmenu-fmt-btn' + (isActive(item.format) ? ' active' : '')
                btn.title = item.format
                btn.innerHTML = `<wa-icon name="${item.icon}"></wa-icon>${item.label ? `<span>${item.label}</span>` : ''}`
                btn.addEventListener('mousedown', ev => ev.preventDefault())
                btn.addEventListener('click', () => {
                    this._applyFormat(editor, item.format)
                    // Refresh row active states in-place without closing menu
                    const newRow = renderFmtRow()
                    row.replaceWith(newRow)
                    this._updateToolbarState(root)
                })
                row.appendChild(btn)
            })
            return row
        }

        // Context menu on right-click
        editor.addEventListener('contextmenu', e => {
            e.preventDefault()
            const sel = window.getSelection()
            const hasSelection = sel && !sel.isCollapsed

            ctxmenu.innerHTML = ''

            // Formatting icon row (always shown)
            ctxmenu.appendChild(renderFmtRow())

            // Separator
            const sep = document.createElement('div')
            sep.className = 'rich-ctxmenu-sep'
            ctxmenu.appendChild(sep)

            // Clipboard items
            const clipItems = [
                hasSelection && { label: t('cut'),   action: () => document.execCommand('cut') },
                hasSelection && { label: t('copy'),  action: () => document.execCommand('copy') },
                { label: t('paste'), action: () => document.execCommand('paste') },
            ].filter(Boolean)

            clipItems.forEach(item => {
                const btn = document.createElement('button')
                btn.type = 'button'
                btn.className = 'rich-ctxmenu-item'
                btn.textContent = item.label
                btn.addEventListener('click', () => {
                    item.action()
                    ctxmenu.classList.add('hidden')
                })
                ctxmenu.appendChild(btn)
            })

            // Position: anchor to click point, flip up if near bottom
            ctxmenu.style.left = e.clientX + 'px'
            ctxmenu.style.top  = e.clientY + 'px'
            ctxmenu.classList.remove('hidden')

            requestAnimationFrame(() => {
                const r = ctxmenu.getBoundingClientRect()
                if (r.bottom > window.innerHeight - 8) {
                    ctxmenu.style.top = (e.clientY - ctxmenu.offsetHeight) + 'px'
                }
                if (r.right > window.innerWidth - 8) {
                    ctxmenu.style.left = (e.clientX - ctxmenu.offsetWidth) + 'px'
                }
            })
        })

        // Close context menu on outside click
        document.addEventListener('click', e => {
            if (!ctxmenu.contains(e.target) && e.target !== editor) {
                ctxmenu.classList.add('hidden')
            }
        })

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
            const descEditor = root.querySelector('#el-desc')
            this.onSave({
                ...(isEdit ? { id: elementId } : {}),
                name,
                description: descEditor ? this._htmlToMd(descEditor.innerHTML) : '',
                typeId: this._selectedTypeId,
                color: this._colorPicker.selected,
                icon: this._iconPicker.selected,
                starred: this._elData.starred ?? false,
                tags: this._tags,
                groupIds: this._groupIds,
                properties: this._properties,
                relationships: this._relationships,
                avatar: this._avatar ?? null
            })
            this.modal.close()
        })

        this._renderProps()
        this._renderTags()
        this._renderRelationships()
    }

    // Open an inline crop editor for the current avatar image.
    // Renders a drag-to-reposition + scroll-to-zoom crop UI directly in the
    // avatar upload area. Closing it commits the cropped data URL.
    _openCropEditor(root) {
        if (!this._avatar) return

        // Overlay the entire modal-body so the crop editor has room
        const overlay = document.createElement('div')
        overlay.className = 'avatar-crop-overlay'

        const SIZE = 200  // output square size in px
        // State
        let imgNaturalW = 0, imgNaturalH = 0
        let scale = 1       // zoom factor (img pixels per canvas pixel)
        let offsetX = 0     // px offset of image top-left inside crop canvas
        let offsetY = 0
        let isDragging = false
        let dragStartX = 0, dragStartY = 0
        let dragOffsetX = 0, dragOffsetY = 0

        overlay.innerHTML = `
            <div class="avatar-crop-panel">
                <div class="avatar-crop-header">
                    <span class="avatar-crop-title">${t('cropAvatar')}</span>
                </div>
                <div class="avatar-crop-workspace">
                    <canvas id="avatar-crop-canvas" width="${SIZE}" height="${SIZE}"
                        class="avatar-crop-canvas"></canvas>
                </div>
                <div class="avatar-crop-hint">${t('cropHint')}</div>
                <div class="avatar-crop-footer">
                    <button type="button" class="avatar-crop-cancel">${t('cancel')}</button>
                    <button type="button" class="avatar-crop-apply">${t('save')}</button>
                </div>
            </div>`

        document.body.appendChild(overlay)
        const canvas = overlay.querySelector('#avatar-crop-canvas')
        const ctx = canvas.getContext('2d')
        const img = new Image()

        const draw = () => {
            ctx.clearRect(0, 0, SIZE, SIZE)
            ctx.drawImage(img, offsetX, offsetY, img.naturalWidth * scale, img.naturalHeight * scale)
            // Circular clip guide
            ctx.save()
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2)
            ctx.stroke()
            ctx.restore()
        }

        const clamp = () => {
            const iw = img.naturalWidth * scale
            const ih = img.naturalHeight * scale
            // Keep at least some image visible in each direction
            offsetX = Math.min(0, Math.max(SIZE - iw, offsetX))
            offsetY = Math.min(0, Math.max(SIZE - ih, offsetY))
        }

        img.onload = () => {
            // Initial fit: cover the square
            const scaleX = SIZE / img.naturalWidth
            const scaleY = SIZE / img.naturalHeight
            scale = Math.max(scaleX, scaleY)
            // Center
            offsetX = (SIZE - img.naturalWidth * scale) / 2
            offsetY = (SIZE - img.naturalHeight * scale) / 2
            draw()
        }
        img.src = this._avatar

        // Drag to pan
        canvas.addEventListener('mousedown', e => {
            isDragging = true
            dragStartX = e.clientX
            dragStartY = e.clientY
            dragOffsetX = offsetX
            dragOffsetY = offsetY
            canvas.style.cursor = 'grabbing'
            e.preventDefault()
        })
        window.addEventListener('mousemove', e => {
            if (!isDragging) return
            offsetX = dragOffsetX + (e.clientX - dragStartX)
            offsetY = dragOffsetY + (e.clientY - dragStartY)
            clamp(); draw()
        })
        window.addEventListener('mouseup', () => {
            isDragging = false
            canvas.style.cursor = 'grab'
        })

        // Touch drag
        canvas.addEventListener('touchstart', e => {
            const t0 = e.touches[0]
            isDragging = true
            dragStartX = t0.clientX; dragStartY = t0.clientY
            dragOffsetX = offsetX;   dragOffsetY = offsetY
            e.preventDefault()
        }, { passive: false })
        canvas.addEventListener('touchmove', e => {
            if (!isDragging) return
            const t0 = e.touches[0]
            offsetX = dragOffsetX + (t0.clientX - dragStartX)
            offsetY = dragOffsetY + (t0.clientY - dragStartY)
            clamp(); draw(); e.preventDefault()
        }, { passive: false })
        canvas.addEventListener('touchend', () => { isDragging = false })

        // Scroll / pinch to zoom
        canvas.addEventListener('wheel', e => {
            e.preventDefault()
            const factor = e.deltaY < 0 ? 1.08 : 0.93
            const prevScale = scale
            scale = Math.max(SIZE / Math.max(img.naturalWidth, img.naturalHeight), scale * factor)
            // Zoom toward cursor
            const rect = canvas.getBoundingClientRect()
            const cx = e.clientX - rect.left
            const cy = e.clientY - rect.top
            offsetX = cx - (cx - offsetX) * (scale / prevScale)
            offsetY = cy - (cy - offsetY) * (scale / prevScale)
            clamp(); draw()
        }, { passive: false })

        // Buttons
        overlay.querySelector('.avatar-crop-cancel').addEventListener('click', () => overlay.remove())
        overlay.querySelector('.avatar-crop-apply').addEventListener('click', () => {
            this._avatar = canvas.toDataURL('image/jpeg', 0.92)
            root.querySelector('#el-avatar-preview').innerHTML =
                `<img src="${this._avatar}" class="avatar-preview-img" alt="">`
            overlay.remove()
        })
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })
    }

    _esc(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')
            .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }
}
