// cardDisplay: 'none' | 'short' (half line) | 'long' (full line, truncated) | 'multi' (full line, wraps)
// 'short' is the default for single-value properties; multi-enum defaults to 'multi'.

const DEFAULT_TYPES = [
    {
        id        : "type-character",
        name      : "Character",
        nameKey   : "character",
        color     : "blue",
        icon      : "user",
        isDefault : true,
        properties: [
            {
                id         : "prop-char-gender",
                name       : "Gender",
                nameKey    : "gender",
                type       : "enum",
                cardDisplay: "short",
                options    : [
                    { id: "opt-male", label: "Male", labelKey: "male", color: "sky", icon: "user" },
                    { id: "opt-female", label: "Female", labelKey: "female", color: "pink", icon: "user" },
                    { id: "opt-other", label: "Other", labelKey: "other", color: "violet", icon: "user" }
                ]
            },
            { id: "prop-char-age", name: "Age", nameKey: "age", type: "number", cardDisplay: "short" }
        ]
    },
    {
        id        : "type-item",
        name      : "Item",
        nameKey   : "item",
        color     : "yellow",
        icon      : "gem",
        isDefault : true,
        properties: [
            {
                id         : "prop-item-rarity",
                name       : "Rarity",
                nameKey    : "rarity",
                type       : "enum",
                cardDisplay: "short",
                options    : [
                    { id: "opt-common", label: "Common", labelKey: "common", color: "stone", icon: "circle" },
                    { id: "opt-uncommon", label: "Uncommon", labelKey: "uncommon", color: "green", icon: "circle" },
                    { id: "opt-rare", label: "Rare", labelKey: "rare", color: "blue", icon: "circle" },
                    { id: "opt-legendary", label: "Legendary", labelKey: "legendary", color: "orange", icon: "star" }
                ]
            }
        ]
    },
    {
        id        : "type-place",
        name      : "Place",
        nameKey   : "place",
        color     : "teal",
        icon      : "map",
        isDefault : true,
        properties: []
    },
    {
        id        : "type-event",
        name      : "Event",
        nameKey   : "event",
        color     : "red",
        icon      : "calendar",
        isDefault : true,
        properties: [
            { id: "prop-event-date", name: "Date", nameKey: "date", type: "text", cardDisplay: "short" }
        ]
    },
    {
        id        : "type-organization",
        name      : "Organization",
        nameKey   : "organization",
        color     : "violet",
        icon      : "users",
        isDefault : true,
        properties: []
    }
]

export default DEFAULT_TYPES
