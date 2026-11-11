import { uuid } from '../utils/helpers.js'
import ElementType from './ElementType.js'
import ElementGroup from './ElementGroup.js'
import DEFAULT_TYPES from '../data/defaultTypes.js'

export default class Storybook {
    constructor({
        id, name, author, category, color, icon,
        elementTypes, elementGroups, createdAt, updatedAt
    } = {}) {
        this.id = id || uuid()
        this.name = name || 'New Storybook'
        this.author = author || ''
        this.category = category || ''
        this.color = color || 'indigo'
        this.icon = icon || 'book'
        this.createdAt = createdAt || new Date().toISOString()
        this.updatedAt = updatedAt || new Date().toISOString()

        // Bootstrap with default types when none are stored yet
        const rawTypes = elementTypes?.length ? elementTypes : DEFAULT_TYPES
        this.elementTypes = rawTypes.map(t => ElementType.fromJSON(t))
        this.elementGroups = (elementGroups || []).map(g => ElementGroup.fromJSON(g))
    }

    touch() {
        this.updatedAt = new Date().toISOString()
        return this
    }

    getType(id) {
        return this.elementTypes.find(t => t.id === id) || null
    }

    getGroup(id) {
        return this.elementGroups.find(g => g.id === id) || null
    }

    addElementType(data) {
        const type = new ElementType(data)
        this.elementTypes.push(type)
        this.touch()
        return type
    }

    removeElementType(id) {
        // Built-in default types may be removed only if the user explicitly
        // chooses to do so; the isDefault flag is just advisory.
        this.elementTypes = this.elementTypes.filter(t => t.id !== id)
        this.touch()
    }

    addElementGroup(data) {
        const group = new ElementGroup(data)
        this.elementGroups.push(group)
        this.touch()
        return group
    }

    removeElementGroup(id) {
        this.elementGroups = this.elementGroups.filter(g => g.id !== id)
        this.touch()
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            author: this.author,
            category: this.category,
            color: this.color,
            icon: this.icon,
            elementTypes: this.elementTypes.map(t => t.toJSON()),
            elementGroups: this.elementGroups.map(g => g.toJSON()),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        }
    }

    static fromJSON(data) {
        return new Storybook(data)
    }
}
