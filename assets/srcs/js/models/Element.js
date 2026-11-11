import { uuid } from '../utils/helpers.js'

export default class Element {
    constructor({
        id, storybookId, name, description, typeId, groupIds,
        tags, color, icon, starred, properties, relationships,
        createdAt, updatedAt
    } = {}) {
        this.id = id || uuid()
        this.storybookId = storybookId || null
        this.name = name || 'Unnamed'
        this.description = description || ''
        this.typeId = typeId || null
        this.groupIds = groupIds ? [...groupIds] : []
        this.tags = tags ? [...tags] : []
        this.color = color || 'indigo'
        this.icon = icon || 'circle'
        this.starred = starred || false
        this.properties = properties ? { ...properties } : {}
        this.relationships = relationships ? relationships.map(r => ({ ...r })) : []
        this.createdAt = createdAt || new Date().toISOString()
        this.updatedAt = updatedAt || new Date().toISOString()
    }

    touch() {
        this.updatedAt = new Date().toISOString()
        return this
    }

    // Importance = number of outgoing relationships (others pointing to this
    // element are counted by the App when sorting).
    get importanceSelf() {
        return this.relationships.length
    }

    addRelationship(targetId, label) {
        this.relationships.push({ id: uuid(), targetId, label })
        this.touch()
        return this
    }

    removeRelationship(relId) {
        this.relationships = this.relationships.filter(r => r.id !== relId)
        this.touch()
        return this
    }

    update(data) {
        const allow = [
            'name', 'description', 'typeId', 'groupIds', 'tags',
            'color', 'icon', 'starred', 'properties', 'relationships'
        ]
        for (const key of allow) {
            if (key in data) this[key] = data[key]
        }
        this.touch()
        return this
    }

    toJSON() {
        return {
            id: this.id,
            storybookId: this.storybookId,
            name: this.name,
            description: this.description,
            typeId: this.typeId,
            groupIds: this.groupIds,
            tags: this.tags,
            color: this.color,
            icon: this.icon,
            starred: this.starred,
            properties: this.properties,
            relationships: this.relationships,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        }
    }

    static fromJSON(data) {
        return new Element(data)
    }
}
