// Color palette used throughout Storier. Per ui.md, we provide a curated
// palette rather than a free-form color picker.
//
// value   — the base hue, used for icon containers and badge backgrounds
// darker  — slightly darker/more saturated; body text/icon color on light backgrounds
// lighter — slightly lighter/desaturated; body text/icon color on dark backgrounds

export const COLORS = [
    { id: 'lightgray', label: 'Light Gray', value: '#cbd5e1', darker: '#64748b', lighter: '#e2e8f0' },
    { id: 'slate',     label: 'Slate',      value: '#8c94a2', darker: '#475569', lighter: '#cbd5e1' },
    { id: 'darkgray',  label: 'Dark Gray',  value: '#4b5563', darker: '#1f2937', lighter: '#9ca3af' },
    { id: 'brown',     label: 'Brown',      value: '#af806b', darker: '#7c3f2a', lighter: '#d4a898' },
    { id: 'teal',      label: 'Teal',       value: '#14b8a6', darker: '#0f766e', lighter: '#5eead4' },
    { id: 'green',     label: 'Green',      value: '#22c55e', darker: '#15803d', lighter: '#86efac' },
    { id: 'lime',      label: 'Lime',       value: '#84cc16', darker: '#4d7c0f', lighter: '#bef264' },
    { id: 'yellow',    label: 'Yellow',     value: '#eab308', darker: '#a16207', lighter: '#fde047' },
    { id: 'orange',    label: 'Orange',     value: '#f97316', darker: '#c2410c', lighter: '#fdba74' },
    { id: 'red',       label: 'Red',        value: '#ef4444', darker: '#b91c1c', lighter: '#fca5a5' },
    { id: 'pink',      label: 'Pink',       value: '#ec4899', darker: '#be185d', lighter: '#f9a8d4' },
    { id: 'fuchsia',   label: 'Fuchsia',    value: '#d946ef', darker: '#a21caf', lighter: '#f0abfc' },
    { id: 'violet',    label: 'Violet',     value: '#8b5cf6', darker: '#6d28d9', lighter: '#c4b5fd' },
    { id: 'indigo',    label: 'Indigo',     value: '#6366f1', darker: '#4338ca', lighter: '#a5b4fc' },
    { id: 'blue',      label: 'Blue',       value: '#3b82f6', darker: '#1d4ed8', lighter: '#93c5fd' },
    { id: 'sky',       label: 'Sky',        value: '#0ea5e9', darker: '#0369a1', lighter: '#7dd3fc' },
    { id: 'cyan',      label: 'Cyan',       value: '#06b6d4', darker: '#0e7490', lighter: '#67e8f9' },
]

export function getColor(id) {
    return COLORS.find(c => c.id === id) || COLORS[13] // default: indigo
}

export function getColorValue(id) {
    return getColor(id).value
}

// Returns the text/icon color for use on light backgrounds
export function getColorDarker(id) {
    return getColor(id).darker
}

// Returns the text/icon color for use on dark backgrounds
export function getColorLighter(id) {
    return getColor(id).lighter
}
