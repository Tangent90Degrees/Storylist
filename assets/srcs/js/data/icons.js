// Curated icon set for the icon picker.
// All names are Font Awesome 6 free (solid) icons, bundled locally in
// icon-svgs.js and rendered by the local <wa-icon> custom element.
// Each category has exactly 24 icons.

export const ICON_CATEGORIES = [
    {
        name: 'Nature',
        nameZh: '自然',
        icons: [
            'leaf', 'sun', 'moon', 'cloud', 'snowflake', 'fire',
            'droplet', 'mountain', 'tree', 'wind', 'seedling', 'feather',
            'paw', 'fish', 'dove', 'horse', 'spider', 'dragon',
            'cat', 'dog', 'frog', 'otter', 'hippo', 'crow'
        ]
    },
    {
        name: 'People',
        nameZh: '人物',
        icons: [
            'user', 'users', 'baby', 'crown', 'graduation-cap', 'heart',
            'shield', 'person-walking', 'person-running', 'hand-fist',
            'user-ninja', 'user-secret', 'mask', 'eye', 'brain',
            'person-dress', 'person-praying', 'hand', 'face-smile', 'child',
            'person-hiking', 'person-skating', 'person-skiing', 'person-snowboarding'
        ]
    },
    {
        name: 'Objects',
        nameZh: '物品',
        icons: [
            'key', 'gem', 'scroll', 'book', 'map', 'compass',
            'box', 'vial', 'wand-magic', 'lightbulb', 'shield-halved', 'flask',
            'ring', 'coins', 'sack-dollar', 'lock', 'envelope', 'camera',
            'music', 'guitar', 'dumbbell', 'hammer', 'wrench', 'scissors'
        ]
    },
    {
        name: 'Places',
        nameZh: '地点',
        icons: [
            'house', 'building', 'warehouse', 'store', 'tent', 'anchor',
            'flag', 'landmark', 'tower-observation', 'bridge', 'road', 'ship',
            'train', 'plane', 'rocket', 'dungeon', 'church', 'mosque',
            'synagogue', 'tree-city', 'school', 'hospital', 'hotel', 'city'
        ]
    },
    {
        name: 'Events',
        nameZh: '事件',
        icons: [
            'bolt', 'bomb', 'trophy', 'skull', 'cloud-bolt', 'calendar',
            'clock', 'bell', 'handshake', 'file-signature', 'gavel', 'chess',
            'dice', 'question', 'exclamation', 'fire-flame-curved',
            'gift', 'cake-candles', 'champagne-glasses', 'mug-hot', 'utensils',
            'briefcase', 'clipboard'
        ]
    },
    {
        name: 'Symbols',
        nameZh: '符号',
        icons: [
            'circle', 'diamond', 'hexagon', 'triangle-exclamation', 'stop', 'infinity',
            'asterisk', 'octagon', 'star', 'bolt-lightning', 'yin-yang', 'peace',
            'cross', 'ankh', 'atom', 'dna', 'square', 'certificate',
            'ribbon', 'award', 'star-of-life', 'flag-checkered', 'bookmark', 'tag',
            'mars', 'venus', 'mars-and-venus'
        ]
    }
]

export const ALL_ICONS = ICON_CATEGORIES.flatMap(c => c.icons)
export const DEFAULT_ICON = 'circle'
