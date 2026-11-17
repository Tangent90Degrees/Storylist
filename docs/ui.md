# UI Design in Storier

The website's UI should support both English and Chinese, and support dark mode or additional themes.

## Architecture

The project is a vanilla JS SPA using ES modules with no build tools. All dependencies are local — no CDN is required at runtime.

### Local component system

The project ships its own lightweight custom elements that replace the Web Awesome 3.x component API:

- **`<wa-icon>`** — renders inline SVGs from a local Font Awesome 6 Free bundle (`js/data/icon-svgs.js`). Supports `name` and `variant` (solid/regular) attributes. Falls back to solid if a regular variant is missing.
- **`<wa-button>`** — styled button with `variant` (neutral/brand/danger), `appearance` (solid/outlined/text), `size` (m/s), and `disabled` attributes. Light DOM (no Shadow DOM) so existing `querySelector`/`closest`/event-delegation work unchanged. Handles `slot="prefix"` icon hoisting and keyboard activation (Enter/Space).
- **`<wa-button-group>`** — visual wrapper for connected-border button groups.

All `--wa-*` CSS custom properties (colors, spacing, radii, shadows, transitions) are defined locally in `css/tokens.css` for both light mode (`:root`) and dark mode (`.wa-dark`). Dark mode is toggled by adding `.wa-dark` to `<html>`.

### Icon system

Icons are Font Awesome 6 Free (solid + a small set of regular), downloaded to `assets/icons/{solid,regular}/` and bundled into `js/data/icon-svgs.js` via `scripts/bundle-icons.py`. The bundle is a single ES module exporting an `ICON_SVGS` object — no network fetch at runtime.

To add new icons: download the SVG to `assets/icons/solid/`, then run `python3 scripts/bundle-icons.py`.

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

- **Header**: a colored icon container (solid representative color, white icon inside) in the top-left — or, if the element has an uploaded avatar image, the image displayed with `object-fit: cover` instead of the icon; the element name and type/group label badges on the right of the icon; a star button in the top-right corner (visible on hover, or always visible when starred).
- **Description**: a short plain-text preview of the element's description (Markdown/HTML stripped).
- **Properties**: selected properties from the element's type and groups, displayed according to their card display setting (see Property card display below).
- **Relationships**: visible relationships (those with `showOnCard !== false` and a valid target), displayed as a list of rows (see Relationship display below).
- **Tags**: keyword tags on a single line, with overflow handling.
- **Footer**: connection count (link icon + number) on the left; last-edit time right-aligned.

Edit and delete buttons are **not** shown on the card. Clicking anywhere on the card opens the editor.

#### Relationship display

Each visible relationship is displayed as a row with three parts:

1. **Avatar** (left): a 28px circular container filled with the target element's color, containing a white icon — or, if the target has an uploaded avatar image, the image with `object-fit: cover` and circular clip.
2. **Stacked text** (center): the relationship label on top (small, uppercase, muted) and the target element's name below (12px, normal weight, full text color). Both lines truncate with ellipsis if they overflow.
3. **Type badge** (right): a pill tag showing the target element's type icon and name, colored from the type's own color (semi-transparent background, `darker` text in light mode, `lighter` text in dark mode). Uses the same sizing tokens as card badges (`--pill-h-sm`, `--pill-font-sm`, `--pill-pad-sm`).

The relationship section has increased spacing: 10px gap between rows, and `margin-top: var(--wa-space-s)` separating it from the property area above.

#### Avatar

Each element can optionally have an uploaded image as its avatar (stored as a data URL in the `avatar` field). The color and icon are still retained as fallbacks. On the card, if an avatar is set, it replaces the icon in the header's icon container. In relationship rows, if a target has an avatar, it replaces the colored circle's icon.

Avatars can be cropped after upload via a crop editor (see Edit panel → Avatar below).

#### Type/group badge row

The type badge and group badges appear on a single line below the element name. Overflow is handled in three steps:

1. If there is enough space, all badges are shown with icon + text.
2. When there is not enough space, badges are collapsed from last to first (keeping the first badge always full): each collapses to icon-only, or to the first letter of its name if it has no icon.
3. If there is still not enough space, the remaining badges are removed from the end and replaced by a single gray `+N` badge showing the count of omitted badges.

This is implemented in JavaScript after render, using a double `requestAnimationFrame` to let `<wa-icon>` custom elements finish rendering before measuring.

#### Property card display

Each property definition carries a `cardDisplay` setting with four options:

| Value | Label | Behaviour |
| ------- | ------- | ----------- |
| `none` | None | Not shown on the card |
| `short` | Half-line | Occupies half a line; pairs of short properties share one row in a two-column grid |
| `long` | Single-line | Occupies a full line; value is truncated with ellipsis if it overflows |
| `multi` | Multi-line | Occupies a full line; value wraps across multiple lines if needed |

Default for single-value properties is `short`; default for multi-choice enums is `multi`.

All pill-shaped tags (type/group badges, enum option chips, relationship type badges) display their icon (if set) to the left of the text at text height. If a tag has no icon, no icon is shown. Pill heights are uniform across all tag types, governed by `--pill-h-sm` and `--pill-h-md` tokens.

#### Tag overflow

Tags on the card are forced to a single line with the same three-step overflow algorithm as badges: full → icon/letter-only → `+N` merge.

## Designing styles

The UI should be carefully designed with attention to overall coherence, using a modern frosted glass style.

### Text renderings

To reflect the "storybook" theme, the website should allow users to choose between serif and sans-serif fonts. The Chinese and Western fonts should be consistent with each other.

The website's text should be well typeset, and it should implement "Pangu spacing"—that is, a quarter-width space between Chinese characters and Western text or numbers—and it should also implement Chinese punctuation compression.

## Components

### Color pickers

For color picking features, instead of providing a free-form color picker, use a palette with curated color options. Current palette: rose, pink, fuchsia, violet, indigo, blue, sky, cyan, teal, green, lime, yellow, orange, red, stone, slate, brown, dark gray, light gray.

Each color has three values: `value` (background/fill), `darker` (text color in light mode), `lighter` (text color in dark mode). Tag text uses `darker` in light mode and `lighter` in dark mode for accessibility.

### Icon pickers

Use a unified icon selector backed by Font Awesome 6 Free (solid) icons, bundled locally in `icon-svgs.js`. Icons are organised into six categories: Nature, People, Objects, Places, Events, Symbols.

Each option of an enum property can also have its own icon, chosen from the same picker. This icon is shown in front of the option label wherever the option is displayed as a pill tag.

## Edit panel layout

The element edit panel is a wide modal split into two columns:

- **Left column (narrow, ~300px)**: avatar upload; element type selector; property groups in sections (each section headed by the type or group name + icon); tags at the bottom.
- **Right column (wide, fills remaining space)**: element name; color picker; icon picker; relationships; description (rich text editor).

The two columns scroll together as a single unit.

### Avatar

The avatar upload field appears at the top of the left column, above the type selector. It shows:

- A 56×56 preview square — the element's icon if no avatar is set, or the uploaded image with `object-fit: cover`.
- An **Upload image** button (opens a file picker; reads the file via `FileReader` and stores the data URL).
- A **Crop** button (appears only when an avatar is set) — opens a crop editor overlay with a 200×200 circular canvas. The user can drag to reposition and scroll to zoom. Clicking Save commits the cropped canvas as a JPEG data URL.
- A **Remove** button (appears only when an avatar is set) — clears the avatar back to the icon preview.

### Properties in the left column

Properties are displayed as inline label–control rows:

- Property name is left-aligned with a fixed width; the input/control is right-aligned.
- Text and number fields right-align their content.
- Enum option buttons are pill-shaped, appear right-aligned, and use the option's representative color when selected (tinted background + `darker`/`lighter` text for light/dark mode).
- Multi-choice enum chips appear below the label, right-aligned.

Enum option tags in the editor use the same sizing tokens (`--pill-h-md`, `--pill-font-md`, `--pill-pad-md`) as other pills. Unselected options use a neutral gray chip background; selected options use a 16% color-mix tint from the option's color with a matching subtle border. Dark mode uses the `lighter` text variant via `.wa-dark .enum-opt.selected`.

Each property group section has a header with the source type or group's icon and name. Hovering the header reveals a remove button on the right; clicking it detaches that group from the element.

### Description rich text editor

The description field is a `contenteditable` WYSIWYG editor — text is displayed with its formatting applied (bold appears bold, headings appear large, etc.) rather than showing Markdown syntax. Content is stored as Markdown internally (converted via `_htmlToMd` on save and `_mdToHtml` on load).

#### Formatting toolbar

A toolbar sits above the editor with the following button groups, separated by dividers:

| Group | Buttons |
| ------ | --------- |
| Headings | H1, H2 (toggle: pressing an active heading button restores body text) |
| Inline | Bold, Underline, Code (all toggle) |
| Lists | Bullet list, Numbered list |
| Alignment | Left, Center, Right, Justify |

Toolbar buttons highlight (`.active` class) to reflect the current cursor/selection state — e.g., the Bold button lights up when the cursor is inside bold text, the H1 button lights up when the cursor is in an `<h1>` block, alignment buttons reflect the current justification. Updates fire on `keyup`, `mouseup`, and `selectionchange`.

The toolbar has a fully bordered rectangle with rounded top corners; the editor below has rounded bottom corners and no top border, so the two join seamlessly.

#### Cursor height

The caret height matches the text it sits in, not inflated by line spacing. This is achieved by **not** setting `line-height` on the `.rich-editor` container — instead, each block element (`p`, `h1`, `h2`, `li`, `pre`) sets its own `line-height` (1.5 for paragraphs/lists, 1.25–1.3 for headings).

#### Undo/Redo

Native contenteditable undo/redo is used:

- **Ctrl/Cmd+Z** — undo
- **Ctrl/Cmd+Shift+Z** or **Ctrl/Cmd+Y** — redo

#### Context menu

Right-clicking in the editor shows a custom context menu:

1. **Formatting icon row** (top): same icons as the toolbar (H1, H2, Bold, Underline, Code, Bullet list, Numbered list), with live active states mirroring the cursor position. Clicking applies the format and re-renders the row's active states without closing the menu. Uses `mousedown preventDefault` to preserve the selection.
2. **Separator**
3. **Clipboard items** (bottom): Cut, Copy (selection only), Paste as text buttons.

The menu flips up/left if it would overflow the viewport edge.

### Relationships

Relationships appear above the description in the right column. Each relationship is an inline editable row with:

- A label input (left)
- An arrow icon
- A target element selector button (semi-transparent background from the target's color, text in the target's `darker`/`lighter` color) — clicking opens a searchable element picker panel
- A visibility toggle button (eye/eye-slash) controlling `showOnCard`
- A drag handle for reordering
- A delete button

Relationships can be added, deleted, and reordered (FLIP drag-and-drop with midpoint Y insertion detection).

### Schema manager

The schema manager allows editing element types and element groups. For each enum property, each option has:

- a color and icon combined into a single trigger button (colored square, white icon inside); clicking it opens a combined popover with a color palette on top and an icon picker below, plus a "No icon" clear button.
- Options can be reordered by dragging. While dragging, other items animate smoothly to their new positions (FLIP technique); no ghost follows the cursor.

#### Property row actions

Each property row in the schema detail panel has the following action buttons (left to right):

1. **Copy** (copy icon) — copies the property's full configuration (name, type, cardDisplay, showOnCard, options) into an internal clipboard. Enables all paste buttons.
2. **Paste** (paste icon) — disabled (dimmed, `cursor: not-allowed`) when the clipboard is empty. When clicked, shows a confirmation dialog before replacing the current property's configuration with the clipboard contents. Pasted options get new UUIDs to avoid collisions.
3. **Collapse** (chevron-down / chevron-right) — collapses or expands the property's body. The collapse button remains visible in both states.
4. **Drag handle** (bars icon) — reorders properties via drag-and-drop.
5. **Delete** (xmark icon) — removes the property after confirmation.

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
| --- | --- | --- |
| `--ctrl-h` | 32px | Standard input/select/button height |
| `--ctrl-h-sm` | 28px | Small inputs (e.g. inside compact rows) |
| `--ctrl-h-lg` | 38px | Large inputs (e.g. element name field) |
| `--pill-h-sm` | 20px | Small pills (card badges, card tags, relationship type badges) |
| `--pill-h-md` | 26px | Medium pills (enum opts in editor, filter buttons) |
| `--pill-pad-sm` | 1px 8px | Small pill padding |
| `--pill-pad-md` | 3px 10px | Medium pill padding |
| `--pill-font-sm` | 11px | Small pill font size |
| `--pill-font-md` | 12px | Medium pill font size |
| `--radius` | `var(--wa-border-radius-m)` | Standard corner radius |
| `--radius-sm` | `var(--wa-border-radius-s)` | Small corner radius (compact rows, inline buttons) |
| `--radius-pill` | `var(--wa-border-radius-pill)` | Pill/capsule shape |
| `--radius-lg` | `var(--wa-border-radius-l)` | Modal/card corner radius |

### Nested container radius (concentric rule)

When a container holds inner elements with rounded corners and a uniform padding `P`, the container's corner radius should equal the inner element's radius plus the padding: `outer = inner + P`. This ensures the inner and outer arcs share the same center and look visually concentric. Example: enum option rows use `border-radius: calc(var(--radius-sm) + 4px)` because inner controls use `--radius-sm` and the row padding is 4px.

### Drag-to-reorder

Lists that support reordering use drag-and-drop with a grip handle (`bars` icon). The dragged item stays in place (no ghost following the cursor); surrounding items animate smoothly to their new positions using the FLIP technique (`translateY` → `transition: transform 0.2s`). The drag handle uses `.prop-drag-handle` (property rows) or `.opt-drag-handle` (enum option rows).

### Delete buttons

Inline delete buttons (remove a row item) use the `.schema-row-delete` class: a 32×32 (or 28×28 in compact rows) square with `--radius-sm`, neutral quiet color at 50% opacity, turning danger-red on hover. Do **not** use `<wa-button variant="danger" appearance="text">` for inline deletes — that style is too visually loud for a secondary action.
