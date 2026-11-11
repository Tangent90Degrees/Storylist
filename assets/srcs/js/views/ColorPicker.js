// Color palette picker — per ui.md we use a fixed palette, never a free
// colour picker.

import { COLORS } from '../data/colors.js'

export default class ColorPicker {
    constructor(selected = 'indigo', onChange) {
        this.selected = selected
        this.onChange = onChange
    }

    render() {
        return `
            <div class="color-palette">
                ${COLORS.map(c => `
                    <button type="button"
                        class="color-swatch ${c.id === this.selected ? 'selected' : ''}"
                        data-color="${c.id}"
                        style="--swatch: ${c.value}"
                        title="${c.label}">
                    </button>
                `).join('')}
            </div>`
    }

    // Attach click handlers inside a root element.
    bind(root) {
        root.querySelectorAll('.color-swatch').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selected = btn.dataset.color
                root.querySelectorAll('.color-swatch')
                    .forEach(b => b.classList.toggle('selected',
                        b.dataset.color === this.selected))
                if (this.onChange) this.onChange(this.selected)
            })
        })
    }
}
