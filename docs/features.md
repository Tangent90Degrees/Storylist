# Features of Storier

## Storybooks

A **storybook** is the basic file format for this website to record a story. It should contains its name, author, category, as well as color and icon for displaying.

User should be able to choose the storybook they are editing. The entire window should mainly focus on story edit view. The following features is specified for a certain storybook.

## Story elements

User should be able to add **story elements** to a storybook. Story elements could be characters, items, clubs/organizations, events (such as wars), places, or other custom defined types.

All elements should have its name and description, as well as color and icon for display.

## Element types

An **element type** (character, item, ...) defines what properties elements of this type should hold by default (Items of this type could contain other properties due to its groups).

For example, a character should contains gender (enum) and age (number) besides its name. These properties should be able to edit. For example, users can add "Race" property to the "Character" type, making all characters in the story have their own race.

For type properties editing, properties can be

- text,
- number, or
- custom enumeration (single-choice or multiple-choice).

For custom enumerations, user needs to specify their options, each of which has a color and an icon to display. For multiple-choice enumerations, orders are important.

Besides properies, elements could have **relationships**, which are single directional connections between elements (character A is the *father* of character B, character C *owns* item E, etc).

## Element groups

An **element group** is similar to a type, defining properties an element should hold. The difference is that an element could be in mutiple groups (works similar to interfaces).

## Tags

Elements could have multiple **tags**. Tags do not bring any features to elements, only used for organizing and searching.
