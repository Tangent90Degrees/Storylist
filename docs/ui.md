# UI Design in Storier

The website's UI should support both English and Chinese, and support dark mode or additional themes.

## Features

The main part of the interface is the story editing screen.

### Dashboard

The **dashboard** is responsible for displaying the elements in the story in a waterfall/masonry layout. Each element's card shows its basic information (like a business card, with the size adapting to the content, up to a maximum length). Clicking a card opens the edit panel.

There are three options for sorting the cards: **A to Z**, **importance**, and **edit date**. Importance is measured by the number of connections an element has.

Elements can be starred, and starred elements are displayed at the top.

#### Dashboard columns

The number of columns adapts to the window width (maximum 4). Cards are placed into the shortest column in order (masonry/waterfall layout), not left-to-right by row.

#### Element cards

Each card displays:

- **Header**: a colored icon container (solid representative color, white icon inside) in the top-left; the element name and type/group label badges on the right of the icon; a star button in the top-right corner (visible on hover, or always visible when starred).
- **Description**: a short plain-text preview of the element's description (Markdown stripped).
- **Properties**: selected properties from the element's type and groups, displayed according to their card display setting (see Property card display below).
- **Tags**: up to 4 keyword tags.
- **Footer**: connection count (link icon + number) on the left; last-edit time right-aligned.

Edit and delete buttons are **not** shown on the card. Clicking anywhere on the card opens the editor.

#### Type/group badge row

The type badge and group badges appear on a single line below the element name. Overflow is handled in three steps:

1. If there is enough space, all badges are shown with icon + text.
2. When there is not enough space, badges are collapsed from last to first (keeping the first badge always full): each collapses to icon-only, or to the first letter of its name if it has no icon.
3. If there is still not enough space, the remaining badges are removed from the end and replaced by a single gray `+N` badge showing the count of omitted badges.

This is implemented in JavaScript after render, using a double `requestAnimationFrame` to let Web Awesome icon components finish upgrading before measuring.

#### Property card display

Each property definition carries a `cardDisplay` setting with four options:

| Value | Label | Behaviour |
| ------- | ------- | ----------- |
| `none` | None | Not shown on the card |
| `short` | Half-line | Occupies half a line; pairs of short properties share one row in a two-column grid |
| `long` | Single-line | Occupies a full line; value is truncated with ellipsis if it overflows |
| `multi` | Multi-line | Occupies a full line; value wraps across multiple lines if needed |

Default for single-value properties is `short`; default for multi-choice enums is `multi`.

All pill-shaped tags (type/group badges, enum option chips) display their icon (if set) to the left of the text at text height. If a tag has no icon, no icon is shown. Pill heights are uniform across all tag types.

## Designing styles

The UI should be carefully designed with attention to overall coherence, using a modern frosted glass style.

### Text renderings

To reflect the "storybook" theme, the website should allow users to choose between serif and sans-serif fonts. The Chinese and Western fonts should be consistent with each other.

The website's text should be well typeset, and it should implement "Pangu spacing"—that is, a quarter-width space between Chinese characters and Western text or numbers—and it should also implement Chinese punctuation compression.

## Components

### Color pickers

For color picking features, instead of providing a free-form color picker, use a palette with curated color options. Current palette: rose, pink, fuchsia, violet, indigo, blue, sky, cyan, teal, green, lime, yellow, orange, red, stone, slate, brown, dark gray, light gray.

### Icon pickers

Use a unified icon selector backed by Font Awesome 6 free (solid) icons via Web Awesome's bundled CDN. Icons are organised into six categories: Nature, People, Objects, Places, Events, Symbols.

Each option of an enum property can also have its own icon, chosen from the same picker. This icon is shown in front of the option label wherever the option is displayed as a pill tag.

### Markdown renderer

Markdown notes are used in element descriptions and are rendered with `marked.js`. The description field in the edit panel defaults to **preview mode** when editing an existing element, and to **edit mode** when creating a new one. The write/preview switcher uses a capsule (pill-shaped segment control) design on the same line as the "Description" label.

## Edit panel layout

The element edit panel is a wide modal split into two columns:

- **Left column (narrow, ~300px)**: element type selector; property groups in sections (each section headed by the type or group name + icon); an "Add group…" button at the bottom to attach additional element groups.
- **Right column (wide, fills remaining space)**: element name; color picker; icon picker; description (with write/preview switcher); tags; relationships.

The two columns scroll together as a single unit.

### Properties in the left column

Properties are displayed as inline label–control rows:

- Property name is left-aligned with a fixed width; the input/control is right-aligned.
- Text and number fields right-align their content.
- Enum option buttons are pill-shaped, appear right-aligned, and use the option's representative color when selected.
- Multi-choice enum chips appear below the label, right-aligned.

Each property group section has a header with the source type or group's icon and name. Hovering the header reveals a remove button on the right; clicking it detaches that group from the element.

### Schema manager

The schema manager allows editing element types and element groups. For each enum property, each option has:

- a color and icon combined into a single trigger button (colored square, white icon inside); clicking it opens a combined popover with a color palette on top and an icon picker below, plus a "No icon" clear button.
- Options can be reordered by dragging. While dragging, other items animate smoothly to their new positions (FLIP technique); no ghost follows the cursor.

## UI Style Unification Rules

These rules ensure that UI elements with the same role or meaning share the same visual treatment across the entire application.

### Add buttons

All "add an item" actions use `<wa-button variant="neutral" appearance="outlined" size="s">` with a `<wa-icon name="plus" slot="prefix">`. This applies to:
- "New Type" / "New Group" in the schema list panel
- "Add Property" in the schema detail panel
- "Add Option" below an enum property's option list
- "Add group…" at the bottom of the left column in the edit panel

Do **not** use a plain `<button>` with custom dashed-border styling for add actions.

### Body-level inline labels

Inline labels that sit on the same line as a form control (such as a property name next to its input, or "Card display" next to its option buttons) use:
- `font-size: 13px`
- `color: var(--wa-color-text-normal)`
- CSS class: `.prop-field-label` (or the same values inline)

Do **not** use `font-size: 12px` or `color: var(--wa-color-text-quiet)` for labels at this level.

### Section/field labels (above a control)

Labels that appear above a control as a section heading use `.form-label`:
- `font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px`
- `color: var(--wa-color-text-quiet)`

### Design tokens

All sizing and spacing should use the tokens defined in `:root`:

| Token | Value | Use |
|---|---|---|
| `--ctrl-h` | 32px | Standard input/select/button height |
| `--ctrl-h-sm` | 28px | Small inputs (e.g. inside compact rows) |
| `--ctrl-h-lg` | 38px | Large inputs (e.g. element name field) |
| `--pill-h-sm` | 20px | Small pills (card badges, card tags) |
| `--pill-h-md` | 26px | Medium pills (enum opts, filter buttons) |
| `--radius` | `var(--wa-border-radius-m)` | Standard corner radius |
| `--radius-sm` | `var(--wa-border-radius-s)` | Small corner radius (compact rows, inline buttons) |
| `--radius-pill` | `var(--wa-border-radius-pill)` | Pill/capsule shape |
| `--radius-lg` | `var(--wa-border-radius-l)` | Modal/card corner radius |

### Nested container radius (concentric rule)

When a container holds inner elements with rounded corners and a uniform padding `P`, the container's corner radius should equal the inner element's radius plus the padding: `outer = inner + P`. This ensures the inner and outer arcs share the same center and look visually concentric. Example: enum option rows use `border-radius: calc(var(--radius-sm) + 4px)` because inner controls use `--radius-sm` and the row padding is 4px.

### Drag-to-reorder

Lists that support reordering use drag-and-drop with a grip handle (`grip-vertical` icon). The dragged item stays in place (no ghost following the cursor); surrounding items animate smoothly to their new positions using the FLIP technique (`translateY` → `transition: transform 0.2s`). The drag handle uses `.prop-drag-handle` (property rows) or `.opt-drag-handle` (enum option rows).

### Delete buttons

Inline delete buttons (remove a row item) use the `.schema-row-delete` class: a 32×32 (or 28×28 in compact rows) square with `--radius-sm`, neutral quiet color at 50% opacity, turning danger-red on hover. Do **not** use `<wa-button variant="danger" appearance="text">` for inline deletes — that style is too visually loud for a secondary action.
