// App — main controller. Owns all state, persists to localStorage,
// and coordinates the Dashboard, Modal, and editor views.

import Storage from '../utils/storage.js'
import { t, setLocale, getLocale, toggleLocale } from '../utils/i18n.js'
import { debounce } from '../utils/helpers.js'
import Storybook from '../models/Storybook.js'
import Element from '../models/Element.js'
import Dashboard from './Dashboard.js'
import Modal from './Modal.js'
import StorybookModal from './StorybookModal.js'
import ElementEditor from './ElementEditor.js'
import SchemaManager from './SchemaManager.js'

export default class App {
    // ── state ──────────────────────────────────────────────────────────────
    #storybooks = []
    #elements = []           // flat list across all storybooks
    #currentId = null
    #sort = 'edit-date'  // 'edit-date' | 'a-z' | 'importance'
    #search = ''
    #filterType = null
    #theme = 'light'
    #font = 'sans'

    constructor() { }

    init() {
        this._loadState()
        this._modal = new Modal()
        this._dash = new Dashboard({
            onEdit: id => this._openElementEditor(id),
            onDelete: id => this._deleteElement(id),
            onToggleStar: id => this._toggleStar(id)
        })
        this._sbModal = new StorybookModal(this._modal, data => this._handleSbSave(data))
        this._elEditor = new ElementEditor(this._modal, data => this._handleElSave(data))
        this._schemaMgr = new SchemaManager(this._modal, data => this._handleSchemaSave(data))
        this._bindGlobalUI()
        this._render()
    }

    // ── persistence ────────────────────────────────────────────────────────
    _loadState() {
        const s = Storage.load()
        if (s) {
            this.#storybooks = (s.storybooks || []).map(Storybook.fromJSON)
            this.#elements = (s.elements || []).map(Element.fromJSON)
            this.#currentId = s.currentId || null
            this.#theme = s.theme || 'light'
            this.#font = s.font || 'sans'
            setLocale(s.locale || 'en')
        }
        // Web Awesome uses .wa-dark on <html> for dark mode
        this._applyTheme()
        document.documentElement.dataset.font = this.#font
    }

    _applyTheme() {
        document.documentElement.classList.toggle('wa-dark', this.#theme === 'dark')
    }

    _save() {
        Storage.save({
            storybooks: this.#storybooks.map(sb => sb.toJSON()),
            elements: this.#elements.map(el => el.toJSON()),
            currentId: this.#currentId,
            theme: this.#theme,
            font: this.#font,
            locale: getLocale()
        })
    }

    // ── helpers ────────────────────────────────────────────────────────────
    get _currentSb() {
        return this.#storybooks.find(sb => sb.id === this.#currentId) || null
    }

    _sbElements(sbId) {
        return this.#elements.filter(e => e.storybookId === sbId)
    }

    _sortedElements(elements) {
        const sorted = [...elements]
        // Starred always float to the top within each sort.
        if (this.#sort === 'a-z') {
            sorted.sort((a, b) => a.name.localeCompare(b.name))
        } else if (this.#sort === 'importance') {
            const incoming = {}
            for (const el of elements)
                for (const r of el.relationships)
                    incoming[r.targetId] = (incoming[r.targetId] || 0) + 1
            sorted.sort((a, b) =>
                (b.relationships.length + (incoming[b.id] || 0)) -
                (a.relationships.length + (incoming[a.id] || 0)))
        } else {
            // edit-date: newest first
            sorted.sort((a, b) =>
                new Date(b.updatedAt) - new Date(a.updatedAt))
        }
        return [...sorted.filter(e => e.starred), ...sorted.filter(e => !e.starred)]
    }

    _filteredElements() {
        let els = this._sbElements(this.#currentId)
        if (this.#filterType) els = els.filter(e => e.typeId === this.#filterType)
        if (this.#search) {
            const q = this.#search.toLowerCase()
            els = els.filter(e =>
                e.name.toLowerCase().includes(q) ||
                e.description.toLowerCase().includes(q) ||
                e.tags.some(tag => tag.toLowerCase().includes(q)))
        }
        return this._sortedElements(els)
    }

    // ── storybook CRUD ─────────────────────────────────────────────────────
    _handleSbSave(data) {
        if (data._delete) {
            this.#elements = this.#elements.filter(e => e.storybookId !== data.id)
            this.#storybooks = this.#storybooks.filter(sb => sb.id !== data.id)
            if (this.#currentId === data.id)
                this.#currentId = this.#storybooks[0]?.id || null
        } else if (data.id) {
            const sb = this.#storybooks.find(sb => sb.id === data.id)
            if (sb) Object.assign(sb, data, { updatedAt: new Date().toISOString() })
        } else {
            const sb = new Storybook(data)
            this.#storybooks.push(sb)
            this.#currentId = sb.id
        }
        this._save()
        this._render()
    }

    _handleSchemaSave({ types, groups }) {
        const sb = this._currentSb
        if (!sb) return
        // Apply updated types and groups back onto the live storybook object.
        sb.elementTypes = types.map(t => {
            const existing = sb.elementTypes.find(e => e.id === t.id)
            if (existing) { Object.assign(existing, t); return existing }
            return sb.addElementType(t)
        })
        sb.elementGroups = groups.map(g => {
            const existing = sb.elementGroups.find(e => e.id === g.id)
            if (existing) { Object.assign(existing, g); return existing }
            return sb.addElementGroup(g)
        })
        sb.touch()
        this._save()
        this._render()
    }

    _selectStorybook(id) {
        this.#currentId = id
        this.#filterType = null
        this.#search = ''
        document.getElementById('search-input').value = ''
        this._save()
        this._render()
    }

    // ── element CRUD ───────────────────────────────────────────────────────
    _openElementEditor(elementId = null) {
        const el = elementId ? this.#elements.find(e => e.id === elementId) : null
        const sb = this._currentSb
        if (!sb) return
        const others = this._sbElements(sb.id).filter(e => e.id !== elementId)
        this._elEditor.open(el, sb, others)
    }

    _handleElSave(data) {
        if (data._delete) {
            this.#elements = this.#elements.filter(e => e.id !== data.id)
        } else if (data.id) {
            const el = this.#elements.find(e => e.id === data.id)
            if (el) el.update(data)
        } else {
            const el = new Element({ ...data, storybookId: this.#currentId })
            this.#elements.push(el)
        }
        const sb = this._currentSb
        if (sb) sb.touch()
        this._save()
        this._renderDashboard()
    }

    _deleteElement(id) {
        if (!confirm(t('deleteConfirm'))) return
        this.#elements = this.#elements.filter(e => e.id !== id)
        this._save()
        this._renderDashboard()
    }

    _toggleStar(id) {
        const el = this.#elements.find(e => e.id === id)
        if (el) { el.starred = !el.starred; el.touch() }
        this._save()
        this._renderDashboard()
    }

    // ── UI wiring ──────────────────────────────────────────────────────────
    _bindGlobalUI() {
        document.getElementById('btn-new-storybook')
            ?.addEventListener('click', () => this._sbModal.open())
        document.getElementById('btn-create-first')
            ?.addEventListener('click', () => this._sbModal.open())
        document.getElementById('btn-add-element')
            ?.addEventListener('click', () => this._openElementEditor())
        document.getElementById('btn-toggle-theme')
            ?.addEventListener('click', () => {
                this.#theme = this.#theme === 'light' ? 'dark' : 'light'
                this._applyTheme()
                this._syncThemeIcon()
                this._save()
            })
        document.getElementById('btn-toggle-font')
            ?.addEventListener('click', () => {
                this.#font = this.#font === 'sans' ? 'serif' : 'sans'
                document.documentElement.dataset.font = this.#font
                this._save()
            })
        document.getElementById('btn-toggle-lang')
            ?.addEventListener('click', () => {
                const loc = toggleLocale()
                const label = document.querySelector('#btn-toggle-lang #lang-label')
                    || document.getElementById('lang-label')
                if (label) label.textContent = loc.toUpperCase()
                this._save()
                this._render()
            })
        // native input fires 'input' event
        document.getElementById('search-input')
            ?.addEventListener('input', debounce(e => {
                this.#search = e.target.value.trim()
                this._renderDashboard()
            }, 200))
            // Sort buttons — wa-button click
            ;['sort-date', 'sort-az', 'sort-imp'].forEach(id => {
                document.getElementById(id)?.addEventListener('click', () => {
                    const btn = document.getElementById(id)
                    this.#sort = btn.dataset.sort
                    this._syncSortButtons()
                    this._renderDashboard()
                })
            })
        document.getElementById('btn-manage-schema')
            ?.addEventListener('click', () => {
                const sb = this._currentSb
                if (sb) this._schemaMgr.open(sb)
            })
    }

    // ── render ─────────────────────────────────────────────────────────────
    _render() {
        this._renderSidebar()
        const sb = this._currentSb
        const emptyState = document.getElementById('empty-state')
        const storyView = document.getElementById('story-view')

        if (!sb) {
            emptyState.classList.remove('hidden')
            storyView.classList.add('hidden')
        } else {
            emptyState.classList.add('hidden')
            storyView.classList.remove('hidden')
            document.getElementById('story-title').textContent = sb.name
            document.getElementById('story-author').textContent = sb.author
                ? `by ${sb.author}` : ''
            this._renderDashboard()
        }
        // Sync lang button
        const langLabel = document.querySelector('#btn-toggle-lang #lang-label')
            || document.getElementById('lang-label')
        if (langLabel) langLabel.textContent = getLocale().toUpperCase()
        this._syncSortButtons()
        this._syncThemeIcon()
    }

    _syncSortButtons() {
        ;['sort-date', 'sort-az', 'sort-imp'].forEach(id => {
            const btn = document.getElementById(id)
            if (btn) btn.classList.toggle('sort-active', btn.dataset.sort === this.#sort)
        })
    }

    _syncThemeIcon() {
        const icon = document.getElementById('icon-theme')
        if (icon) icon.setAttribute('name', this.#theme === 'dark' ? 'moon' : 'sun')
    }

    _renderSidebar() {
        const list = document.getElementById('storybook-list')
        if (!this.#storybooks.length) {
            list.innerHTML = `<p class="sb-empty">${t('storybooks')}</p>`
            return
        }
        list.innerHTML = this.#storybooks.map(sb => `
            <div class="sb-item ${sb.id === this.#currentId ? 'active' : ''}"
                data-sb="${sb.id}">
                <div class="sb-icon" style="background:${this._colorVal(sb.color)}22; color:${this._colorVal(sb.color)}">
                    <wa-icon name="${sb.icon}"></wa-icon>
                </div>
                <span class="sb-name">${sb.name}</span>
                <wa-button class="sb-edit-btn" variant="neutral" appearance="text" size="s"
                    data-edit="${sb.id}" title="${t('editStorybook')}">
                    <wa-icon name="sliders"></wa-icon>
                </wa-button>
            </div>`).join('')

        list.querySelectorAll('.sb-item').forEach(node => {
            node.addEventListener('click', e => {
                if (e.target.closest('[data-edit]') || e.target.closest('wa-button')) return
                this._selectStorybook(node.dataset.sb)
            })
        })
        list.querySelectorAll('[data-edit]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation()
                const sbId = btn.dataset.edit || btn.closest('[data-edit]')?.dataset.edit
                const sb = this.#storybooks.find(s => s.id === sbId)
                if (sb) this._sbModal.open(sb)
            })
        })
    }

    _colorVal(colorId) {
        // Inline colour lookup to avoid async in render path
        const map = {
            rose: '#f43f5e', pink: '#ec4899', fuchsia: '#d946ef', violet: '#8b5cf6',
            indigo: '#6366f1', blue: '#3b82f6', sky: '#0ea5e9', cyan: '#06b6d4', teal: '#14b8a6',
            green: '#22c55e', lime: '#84cc16', yellow: '#eab308', orange: '#f97316', red: '#ef4444',
            stone: '#a8a29e', slate: '#94a3b8'
        }
        return map[colorId] || '#6366f1'
    }

    _renderDashboard() {
        const sb = this._currentSb
        if (!sb) return
        const elements = this._filteredElements()
        this._dash.renderFilterBar(sb.elementTypes, this.#filterType, typeId => {
            this.#filterType = typeId || null
            this._renderDashboard()
        })
        this._dash.render(elements, sb)
    }
}
