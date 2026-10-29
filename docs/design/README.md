# Design

How Wagba looks and what it says.

| File                                 | Read it for                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| [design-system.md](design-system.md) | Color, type, spacing, components, iconography, elevation, motion, right-to-left rules |
| [ui-copy.md](ui-copy.md)             | The message catalog: every key in Arabic and English, with dialects reserved          |
| [mockups.md](mockups.md)             | Which mockup covers which screen, what was adopted, and what to ignore                |

The mockups themselves live in `../../mockups/`, outside this tree, because they are binary assets rather than documentation.

**Boundaries.** Screen behavior and content belong to [../product/screens.md](../product/screens.md). This directory owns appearance and wording. A component's _look_ is here; what it _shows and does_ is not. The one deliberate overlap: [mockups.md](mockups.md) records product decisions (adopted and rejected elements) because those decisions only make sense next to the pictures that contain them.
