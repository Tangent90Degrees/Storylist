// Icon picker — shows Font Awesome 6 Free icons via the local <wa-icon> element.
// grouped by category. The selected icon is highlighted; clicking fires
// onChange(iconName).

import { ICON_CATEGORIES, DEFAULT_ICON } from '../data/icons.js'
import { getLocale } from '../utils/i18n.js'
import { segCtrlUpdateIndicator } from '../utils/helpers.js'

export default class IconPicker {
    constructor(selected = DEFAULT_ICON, onChange) {
        this.selected = selected
        this.onChange = onChange
        this._activeCategory = ICON_CATEGORIES[0].name
    }

    _iconButton(name) {
        return `<button type="button"
            class="icon-option ${name === this.selected ? 'selected' : ''}"
            data-icon="${name}" title="${name}">
            <wa-icon name="${name}"></wa-icon>
        </button>`
    }

    _tabsHtml() {
        return ICON_CATEGORIES.map(cat => {
            const label = getLocale() === 'zh' ? cat.nameZh : cat.name
            return `<button type="button"
                class="seg-btn icon-picker-tab ${cat.name === this._activeCategory ? 'active' : ''}"
                data-category="${cat.name}">${label}</button>`
        }).join('')
    }

    _gridHtml() {
        const activeCat = ICON_CATEGORIES.find(c => c.name === this._activeCategory)
            || ICON_CATEGORIES[0]
        return `<div class="icon-grid">${activeCat.icons.map(n => this._iconButton(n)).join('')}</div>`
    }

    // Render the full picker (tabs + grid) in one block
    render() {
        return `
            <div class="icon-picker">
                <div class="seg-ctrl icon-picker-tabs">${this._tabsHtml()}</div>
                ${this._gridHtml()}
            </div>`
    }

    // Render only the tabs seg-ctrl (for inline header placement)
    renderTabsOnly() {
        return `<div class="seg-ctrl icon-picker-tabs">${this._tabsHtml()}</div>`
    }

    // Render only the icon grid
    renderGrid() {
        return this._gridHtml()
    }

    bind(root) {
        const tabsCtrl = root.querySelector('.icon-picker-tabs')
        root.querySelectorAll('.icon-picker-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this._activeCategory = btn.dataset.category
                const cat = ICON_CATEGORIES.find(c => c.name === this._activeCategory)
                root.querySelector('.icon-grid').innerHTML =
                    (cat?.icons || []).map(n => this._iconButton(n)).join('')
                root.querySelectorAll('.icon-picker-tab')
                    .forEach(b => b.classList.toggle('active',
                        b.dataset.category === this._activeCategory))
                segCtrlUpdateIndicator(tabsCtrl)
                this._bindIcons(root)
            })
        })
        requestAnimationFrame(() => segCtrlUpdateIndicator(tabsCtrl, true))
        this._bindIcons(root)
    }

    _bindIcons(root) {
        root.querySelectorAll('.icon-option').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selected = btn.dataset.icon
                root.querySelectorAll('.icon-option')
                    .forEach(b => b.classList.toggle('selected',
                        b.dataset.icon === this.selected))
                if (this.onChange) this.onChange(this.selected)
            })
        })
    }
}
