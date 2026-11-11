# Storier

A story design tool — build and organise the world of your story with characters,
items, places, events, and organisations.

## Features

- **Storybooks** — create multiple independent story worlds, each with its own name, author, category, color, and icon
- **Story elements** — add characters, items, places, events, organisations, or any custom type
- **Schema Manager** — create and edit element types, define their properties (text, number, single-choice enum, multi-choice enum with ordered options), and manage element groups
- **Element groups** — cross-type property bundles that any element can opt into (like interfaces)
- **Relationships** — directional connections between elements ("father of", "owns", etc.)
- **Tags** — lightweight labelling and search
- **Masonry dashboard** — waterfall card layout sorted by edit date, A–Z, or connection count
- **Starring** — pin important elements to the top
- **Type filter bar** — filter the dashboard to show only one element type
- **Markdown descriptions** — write and preview rich text on every element
- **Pangu spacing** — automatic CJK–Latin whitespace in previewed markdown
- **Chinese punctuation compression** — fullwidth punctuation pairs get a zero-width space to allow the browser's kern table to tighten the gap
- **Frosted-glass UI** — modern light/dark theme, seamlessly switchable
- **Font toggle** — switch between serif and sans-serif across the whole app
- **English / Chinese UI** — toggle with the EN/ZH button in the sidebar footer
- **LocalStorage persistence** — everything is saved automatically in your browser

## Getting started

Because the source uses ES modules, you must serve the project over HTTP
(not open `index.html` directly via a `file://` URL).

### Using Python (no installation required)

```sh
cd assets/srcs
python3 -m http.server 8080
# open http://localhost:8080
```

### Using Node / npx

```sh
npx serve assets/srcs
```

### Using VS Code

Install the **Live Server** extension, right-click `assets/srcs/index.html`,
and choose *Open with Live Server*.

## Project layout

```txt
assets/
  images/           static image assets
  srcs/
    index.html      entry point
    css/
      main.css      all styles (frosted-glass, themes, components)
    js/
      main.js       bootstrap
      data/
        colors.js       colour palette
        icons.js        icon catalogue (Lucide)
        defaultTypes.js built-in element types
      utils/
        helpers.js      uuid, date formatting, markdown strip, …
        i18n.js         EN/ZH translations
        storage.js      localStorage wrapper
        pangu.js        CJK–Latin spacing + punctuation compression
      models/
        Storybook.js
        Element.js
        ElementType.js
        ElementGroup.js
      views/
        App.js          main controller
        Dashboard.js    masonry grid
        ElementCard.js  card component
        ElementEditor.js  create/edit element modal
        StorybookModal.js create/edit storybook modal
        SchemaManager.js create/edit element types + groups
        Modal.js        modal primitives
        ColorPicker.js  palette picker
        IconPicker.js   icon picker
docs/
  project.md
  features.md
  ui.md
```

## Code style

- JavaScript: 4-space indentation, no semicolons, modern ES2022+ (classes, private
  fields, optional chaining, nullish coalescing)
- CSS: custom properties for all design tokens, BEM-inspired class names
- HTML: 4-space indentation, semantic elements where possible
