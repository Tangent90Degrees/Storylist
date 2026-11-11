import { uuid } from '../utils/helpers.js'

export default class ElementType {
    constructor({ id, name, nameKey, color, icon, properties, isDefault } = {}) {
        this.id = id || uuid()
        this.name = name || 'New Type'
        this.nameKey = nameKey || null
        this.color = color || 'slate'
        this.icon = icon || 'circle'
        this.properties = (properties || []).map(p => ({ ...p }))
        this.isDefault = isDefault || false
    }

    addProperty(propDef) {
        this.properties.push({ id: uuid(), ...propDef })
        return this
    }

    removeProperty(propId) {
        this.properties = this.properties.filter(p => p.id !== propId)
        return this
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            nameKey: this.nameKey,
            color: this.color,
            icon: this.icon,
            properties: this.properties,
            isDefault: this.isDefault
        }
    }

    static fromJSON(data) {
        return new ElementType(data)
    }
}
