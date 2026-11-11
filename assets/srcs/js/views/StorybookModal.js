// StorybookModal — create and edit storybooks.
// Uses native form controls (no WA input/select) to avoid async upgrade issues.

import { t } from '../utils/i18n.js'
import ColorPicker from './ColorPicker.js'
import IconPicker from './IconPicker.js'

export default class StorybookModal {
    constructor(modal, onSave) {
        this.modal = modal
        this.onSave = onSave
    }

    open(storybook = null) {
        const isEdit = !!storybook
        const sb = storybook || { name: '', author: '', category: '', color: 'indigo', icon: 'book' }

        this._colorPicker = new ColorPicker(sb.color)
        this._iconPicker  = new IconPicker(sb.icon)

        const body = `
            <div class="sb-form-field">
                <label class="form-label" for="sb-name">${t('name')}</label>
                <input id="sb-name" type="text" class="form-control form-control-lg"
                    value="${this._esc(sb.name)}" placeholder="My Fantasy Story">
            </div>
            <div class="form-row sb-form-row">
                <div>
                    <label class="form-label" for="sb-author">${t('author')}</label>
                    <input id="sb-author" type="text" class="form-control"
                        value="${this._esc(sb.author)}" placeholder="Author name">
                </div>
                <div>
                    <label class="form-label" for="sb-category">${t('category')}</label>
                    <input id="sb-category" type="text" class="form-control"
                        value="${this._esc(sb.category)}" placeholder="Fantasy, Sci-Fi…">
                </div>
            </div>
            <div class="sb-form-field">
                <label class="form-label">${t('color')}</label>
                ${this._colorPicker.render()}
            </div>
            <div class="sb-form-field">
                <label class="form-label">${t('icon')}</label>
                ${this._iconPicker.render()}
            </div>`

        const footer = `
            ${isEdit ? `<wa-button id="sb-delete" variant="danger" appearance="outlined">
                <wa-icon name="trash" slot="prefix"></wa-icon>${t('delete')}
            </wa-button>` : ''}
            <div class="spacer"></div>
            <wa-button data-modal-close variant="neutral" appearance="outlined">
                ${t('cancel')}
            </wa-button>
            <wa-button id="sb-save" variant="brand" appearance="outlined">
                <wa-icon name="check" slot="prefix"></wa-icon>
                ${isEdit ? t('save') : t('createStorybook')}
            </wa-button>`

        this.modal.open(`
            <div class="modal-inner">
                <header class="modal-header">
                    <h2 class="modal-title">${isEdit ? t('editStorybook') : t('newStorybook')}</h2>
                    <wa-button data-modal-close variant="neutral" appearance="text" size="s">
                        <wa-icon name="xmark"></wa-icon>
                    </wa-button>
                </header>
                <div class="modal-body">${body}</div>
                <footer class="modal-footer">${footer}</footer>
            </div>`)

        const root = this.modal.container
        this._colorPicker.bind(root)
        this._iconPicker.bind(root)

        root.querySelectorAll('[data-modal-close]').forEach(btn =>
            btn.addEventListener('click', () => this.modal.close()))

        root.querySelector('#sb-save')?.addEventListener('click', () => {
            const name = root.querySelector('#sb-name').value.trim()
            if (!name) { root.querySelector('#sb-name').focus(); return }
            this.onSave({
                ...(isEdit ? { id: storybook.id } : {}),
                name,
                author:   root.querySelector('#sb-author').value.trim(),
                category: root.querySelector('#sb-category').value.trim(),
                color: this._colorPicker.selected,
                icon:  this._iconPicker.selected
            })
            this.modal.close()
        })

        root.querySelector('#sb-delete')?.addEventListener('click', () => {
            if (confirm(t('deleteStorybookConfirm'))) {
                this.onSave({ id: storybook.id, _delete: true })
                this.modal.close()
            }
        })
    }

    _esc(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
    }
}
