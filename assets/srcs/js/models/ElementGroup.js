import { uuid } from '../utils/helpers.js'

// An ElementGroup works like an interface: it defines additional properties
// that any element can opt into, regardless of its type.
export default class ElementGroup {
    constructor({ id, name, color, icon, properties } = {}) {
        this.id = id || uuid()
        this.name = name || 'New Group'
        this.color = color || 'slate'
        this.icon = icon || 'circle'
        this.properties = (properties || []).map(p => ({ ...p }))
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
            color: this.color,
            icon: this.icon,
            properties: this.properties
        }
    }

    static fromJSON(data) {
        return new ElementGroup(data)
    }
}
