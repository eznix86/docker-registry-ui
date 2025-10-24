# Theme Tokens Reference

Theme audits from the original ContainerHub UI (http://localhost:3000 → Settings → Theme). Values are captured from computed styles and grouped into the tokens a design system typically needs—primary brand colors, neutrals for background/surfaces/borders, typography, and semantic accents like danger states. Use these as the basis for Tailwind CSS variables (`@theme {}` or `[data-theme=...]` blocks).

---

## The Hub Light (`the-hub-light`)

| Token | Value | Usage |
| --- | --- | --- |
| `--color-primary` | `#1d63ed` | Header gradient start, focus accents |
| `--color-primary-alt` | `#0047c2` | Header gradient end, hover |
| `--color-background` | `#ffffff` | Body, sidebar base |
| `--color-surface-base` | `#ffffff` | Sidebar, inputs |
| `--color-surface-elevated` | `#f6f8fa` | Dialogs/cards (detail view) |
| `--color-surface-overlay` | `rgba(246, 248, 250, 0.9)` | Command palette / popover backdrop |
| `--color-border` | `#d0d7de` | Card and form borders |
| `--color-shadow` | `rgba(0,0,0,0.3) 0 4px 12px` | Popovers & dialogs |
| `--color-text` | `#24292f` | Primary text |
| `--color-text-muted` | `#57606a` | Secondary copy, chip labels |
| `--color-danger` | `#d32f2f` | Delete buttons |
| `--color-success` | `#2e7d32` | Copy confirmation pill |
| `--color-info` | `#1d63ed` | Architecture chips, links |
| `--color-button-secondary` | `#ffffff` | Copy button background |
| `--color-button-secondary-border` | `#e5e8eb` | Secondary button border |
| `--color-hover-row` | `rgba(36, 41, 47, 0.12)` | Repository card hover/focus overlay |
| `--color-focus-ring` | `rgba(29, 99, 237, 0.2)` | Keyboard focus highlight (theme picker) |
| `--color-shortcut-pill` | `rgba(255, 255, 255, 0.15)` | Header keyboard shortcut capsule |
| `--color-scrollbar-track` | `#ffffff` | Global scrollbar track |
| `--color-scrollbar-thumb` | `#d0d7de` | Global scrollbar thumb |
| `--color-scrollbar-thumb-hover` | `#e5e8eb` | Scrollbar thumb hover |
| `--font-family-base` | `Roboto, sans-serif` | Global font |

**Gaps:** Footer link tint & disabled text token.

---

## The Hub Dark (`the-hub-dark`)

| Token | Value | Usage |
| --- | --- | --- |
| `--color-primary` | `#1d63ed` | Header gradient start |
| `--color-primary-alt` | `#002a8c` | Header gradient end |
| `--color-background` | `#0d1117` | Body |
| `--color-surface-base` | `#0d1117` | Sidebar, inputs |
| `--color-surface-elevated` | `#161b22` | Dialogs/cards |
| `--color-surface-overlay` | `rgba(22, 27, 34, 0.9)` | Command palette / popover backdrop |
| `--color-border` | `#30363d` | Card & divider lines |
| `--color-text` | `#c9d1d9` | Primary text |
| `--color-text-muted` | `#8b949e` | Secondary copy |
| `--color-danger` | `#f85149` | Critical actions |
| `--color-info` | `#58a6ff` | Chip outlines and architecture badges |
| `--color-button-secondary` | `#1a1e23` | Copy button background |
| `--color-button-secondary-border` | `#2f3336` | Secondary button border |
| `--color-hover-row` | `rgba(255, 255, 255, 0.08)` | Repository card hover/focus overlay |
| `--color-shortcut-pill` | `rgba(255, 255, 255, 0.15)` | Header keyboard shortcut capsule |
| `--color-scrollbar-track` | `#0d1117` | Global scrollbar track |
| `--color-scrollbar-thumb` | `#30363d` | Global scrollbar thumb |
| `--color-scrollbar-thumb-hover` | `#2f3336` | Scrollbar thumb hover |
| `--color-focus-ring` | `rgba(255, 255, 255, 0.12)` | Keyboard focus highlight for menu items & chips |
| `--color-success` | `#56d364` | Copy confirmation pill |
| `--font-family-base` | `Roboto, sans-serif` | Global font |

**Gaps:** Disabled text tint still unknown.

---

## Monokai (`monokai`)

| Token | Value | Usage |
| --- | --- | --- |
| `--color-primary` | `#f92672` | Gradient start, danger |
| `--color-primary-alt` | `#ae81ff` | Gradient end |
| `--color-background` | `#272822` | Body/sidebar |
| `--color-surface-base` | `#272822` | Sidebar, inputs |
| `--color-surface-elevated` | `#2f2f2a` | Cards/dialogs |
| `--color-surface-overlay` | `rgba(47, 47, 42, 0.9)` | Command palette / popover backdrop |
| `--color-border` | `#49483e` | Card borders |
| `--color-text` | `#f8f8f2` | Primary text |
| `--color-text-muted` | `#a6a296` | Secondary copy |
| `--color-danger` | `#f92672` | Delete buttons & chip outlines |
| `--color-success` | `#a6e22e` | Copy confirmation pill |
| `--color-info` | `#f92672` | Architecture chips, links |
| `--color-button-secondary` | `#3e3d32` | Copy button background |
| `--color-button-secondary-border` | `#5a5a4e` | Secondary button border |
| `--color-hover-row` | `rgba(255, 255, 255, 0.08)` | Repository card hover/focus overlay |
| `--color-focus-ring` | `rgba(249, 38, 114, 0.16)` | Keyboard focus highlight (theme picker) |
| `--color-shortcut-pill` | `rgba(255, 255, 255, 0.15)` | Header keyboard shortcut capsule |
| `--color-scrollbar-track` | `#272822` | Global scrollbar track |
| `--color-scrollbar-thumb` | `#49483e` | Global scrollbar thumb |
| `--color-scrollbar-thumb-hover` | `#5a5a4e` | Scrollbar thumb hover |
| `--font-family-base` | `"Fira Code", "JetBrains Mono", Monaco, monospace, sans-serif` | Global font stack |

**Gaps:** Disabled text treatment & menu focus overlay still unknown.

---

## Nord Dark (`nord-dark`)

| Token | Value | Usage |
| --- | --- | --- |
| `--color-primary` | `#88c0d0` | Gradient start |
| `--color-primary-alt` | `#5e81ac` | Gradient end |
| `--color-background` | `#2e3440` | Body/sidebar |
| `--color-surface-elevated` | `#3b4252` | Cards/dialogs |
| `--color-border` | `#4c566a` | Card borders |
| `--color-text` | `#eceff4` | Primary text |
| `--color-text-muted` | `#d8dee9` | Secondary copy |
| `--color-button-secondary` | `#434c5e` | Secondary buttons |
| `--color-danger` | `#bf616a` | Delete buttons |
| `--font-family-base` | `Roboto, sans-serif` | Global font |

**Gaps:** Success/info palette, active list row background, hover/focus outlines.

---

## Nord Light (`nord-light`)

| Token | Value | Usage |
| --- | --- | --- |
| `--color-primary` | `#5e81ac` | Gradient start |
| `--color-primary-alt` | `#88c0d0` | Gradient end |
| `--color-background` | `#eceff4` | Body/sidebar |
| `--color-surface-elevated` | `#ffffff` | Cards/dialogs |
| `--color-border` | `#d8dee9` | Card borders |
| `--color-text` | `#2e3440` | Primary text |
| `--color-text-muted` | `#3b4252` | Secondary copy |
| `--color-danger` | _Need capture_ | Delete buttons (likely brand tone) |
| `--font-family-base` | `Roboto, sans-serif` | Global font |

**Gaps:** Danger color confirmation, secondary button backgrounds, focus outlines, shadows.

---

## One Dark (`one-dark`)

| Token | Value | Usage |
| --- | --- | --- |
| `--color-primary` | `#61afef` | Header gradient start, chip accent |
| `--color-primary-alt` | `#c678dd` | Header gradient end |
| `--color-background` | `#282c34` | Body/sidebar base |
| `--color-surface-elevated` | `#2c313a` | Tag cards, sidebar panels |
| `--color-surface-muted` | `#333842` | Table headers, secondary buttons |
| `--color-border` | `#3e4451` | Table dividers, card borders, scrollbars |
| `--color-text` | `#abb2bf` | Primary copy |
| `--color-text-muted` | `#828997` | Secondary metadata (timestamps, counts) |
| `--color-danger` | `#e06c75` | Delete actions & focus outline |
| `--color-success` | `#98c379` | Copy confirmation pill |
| `--color-info` | `#61afef` | Architecture chips/badge outlines |
| `--color-button-secondary` | `#333842` | Copy button background |
| `--color-hover-row` | `rgba(255, 255, 255, 0.08)` | Repository card hover state |
| `--color-focus-ring` | `rgba(97, 175, 239, 0.28)` | Menu item keyboard focus |
| `--color-input-background` | `rgba(44, 49, 58, 0.9)` | Tag filter field |
| `--color-shortcut-pill` | `rgba(255, 255, 255, 0.15)` | Header keyboard shortcut capsule |
| `--color-scrollbar-track` | `#282c34` | Global scrollbar track |
| `--color-scrollbar-thumb` | `#3e4451` | Scrollbar thumb |
| `--color-scrollbar-thumb-hover` | `#4b5363` | Scrollbar thumb hover |
| `--font-family-base` | `"Fira Code", Monaco, monospace, sans-serif` | Global font |

**Gaps:** Warning/alert palette (amber) still unknown.

---

## Tokyo Night (`tokyo-night`)

| Token | Value | Usage |
| --- | --- | --- |
| `--color-primary` | `#7aa2f7` | Header gradient start |
| `--color-primary-alt` | `#bb9af7` | Header gradient end |
| `--color-background` | `#1a1b26` | Body/sidebar base |
| `--color-surface-base` | `#1a1b26` | Inputs/sidebar |
| `--color-surface-elevated` | `#24283b` | Cards/dialogs |
| `--color-surface-overlay` | `rgba(36, 40, 59, 0.9)` | Command palette / popover backdrop |
| `--color-border` | `#2f334d` | Card borders & dividers |
| `--color-text` | `#c0caf5` | Primary text |
| `--color-text-muted` | `#a9b1d6` | Secondary copy |
| `--color-danger` | `#f7768e` | Delete actions |
| `--color-success` | `#9ece6a` | Copy confirmation pill |
| `--color-info` | `#2ac3de` | Chips & link accents |
| `--color-button-secondary` | `#2b3152` | Secondary button background |
| `--color-button-secondary-border` | `#3d4474` | Secondary button border |
| `--color-hover-row` | `rgba(192, 202, 245, 0.08)` | Repository card hover overlay |
| `--color-focus-ring` | `rgba(122, 162, 247, 0.28)` | Menu item keyboard focus |
| `--color-shortcut-pill` | `rgba(255, 255, 255, 0.12)` | Header keyboard shortcut capsule |
| `--color-scrollbar-track` | `#1a1b26` | Global scrollbar track |
| `--color-scrollbar-thumb` | `#2f334d` | Global scrollbar thumb |
| `--color-scrollbar-thumb-hover` | `#3d4474` | Scrollbar thumb hover |
| `--font-family-base` | `"Fira Code", "JetBrains Mono", Monaco, monospace, sans-serif` | Global font stack |

**Gaps:** Warning/alert amber treatment not yet confirmed.

---

## Cyberpunk (`cyberpunk`)

| Token | Value | Usage |
| --- | --- | --- |
| `--color-primary` | `#ff379b` | Header gradient start |
| `--color-primary-alt` | `#04e4ff` | Header gradient end |
| `--color-background` | `#0d0221` | Body/sidebar base |
| `--color-surface-base` | `#0d0221` | Sidebar, inputs |
| `--color-surface-elevated` | `#150533` | Cards/dialogs |
| `--color-surface-overlay` | `rgba(21, 5, 51, 0.88)` | Command palette / popover backdrop |
| `--color-border` | `#2b1459` | Card borders & dividers |
| `--color-text` | `#faffff` | Primary text |
| `--color-text-muted` | `#9ad0ff` | Secondary copy |
| `--color-danger` | `#ff3864` | Delete & critical actions |
| `--color-success` | `#72f1b8` | Copy confirmation pill |
| `--color-info` | `#04e4ff` | Chips & link accents |
| `--color-button-secondary` | `#1f0c3b` | Secondary button background |
| `--color-button-secondary-border` | `#38156f` | Secondary button border |
| `--color-hover-row` | `rgba(255, 243, 0, 0.12)` | Repository card hover |
| `--color-focus-ring` | `rgba(4, 228, 255, 0.32)` | Keyboard focus highlight |
| `--color-shortcut-pill` | `rgba(255, 255, 255, 0.16)` | Header keyboard shortcut capsule |
| `--color-scrollbar-track` | `#0d0221` | Global scrollbar track |
| `--color-scrollbar-thumb` | `#2b1459` | Global scrollbar thumb |
| `--color-scrollbar-thumb-hover` | `#38156f` | Scrollbar thumb hover |
| `--font-family-base` | `"Fira Code", Monaco, monospace, sans-serif` | Global font stack |

**Gaps:** Need explicit warning palette and disabled state tokens.

---

## GitHub Dark (`github-dark`)

| Token | Value | Usage |
| --- | --- | --- |
| `--color-primary` | `#238636` | Header gradient start |
| `--color-primary-alt` | `#2ea043` | Header gradient end |
| `--color-background` | `#0d1117` | Body |
| `--color-surface-base` | `#0d1117` | Sidebar, inputs |
| `--color-surface-elevated` | `#161b22` | Cards/dialogs |
| `--color-surface-overlay` | `rgba(22, 27, 34, 0.9)` | Command palette / popover backdrop |
| `--color-border` | `#30363d` | Card & divider lines |
| `--color-text` | `#c9d1d9` | Primary text |
| `--color-text-muted` | `#8b949e` | Secondary copy |
| `--color-danger` | `#f85149` | Critical actions |
| `--color-success` | `#3fb950` | Copy confirmation pill |
| `--color-info` | `#58a6ff` | Chip outlines & links |
| `--color-button-secondary` | `#161b22` | Secondary button background |
| `--color-button-secondary-border` | `#30363d` | Secondary button border |
| `--color-hover-row` | `rgba(240, 246, 252, 0.04)` | Repository card hover overlay |
| `--color-focus-ring` | `rgba(88, 166, 255, 0.28)` | Keyboard focus highlight |
| `--color-shortcut-pill` | `rgba(255, 255, 255, 0.15)` | Header keyboard shortcut capsule |
| `--color-scrollbar-track` | `#0d1117` | Global scrollbar track |
| `--color-scrollbar-thumb` | `#30363d` | Global scrollbar thumb |
| `--color-scrollbar-thumb-hover` | `#2f3336` | Scrollbar thumb hover |
| `--font-family-base` | `Roboto, sans-serif` | Global font |

**Gaps:** Warning/amber accents and disabled text token still open.

---

## GitHub Light (`github-light`)

| Token | Value | Usage |
| --- | --- | --- |
| `--color-primary` | `#0969da` | Header gradient start |
| `--color-primary-alt` | `#54aeff` | Header gradient end |
| `--color-background` | `#f6f8fa` | Body |
| `--color-surface-base` | `#ffffff` | Sidebar, inputs |
| `--color-surface-elevated` | `#ffffff` | Cards/dialogs |
| `--color-surface-overlay` | `rgba(255, 255, 255, 0.92)` | Command palette / popover backdrop |
| `--color-border` | `#d0d7de` | Card & divider lines |
| `--color-text` | `#24292f` | Primary text |
| `--color-text-muted` | `#57606a` | Secondary copy |
| `--color-danger` | `#cf222e` | Critical actions |
| `--color-success` | `#1a7f37` | Copy confirmation pill |
| `--color-info` | `#0969da` | Chip outlines & links |
| `--color-button-secondary` | `#ffffff` | Secondary button background |
| `--color-button-secondary-border` | `#d0d7de` | Secondary button border |
| `--color-hover-row` | `rgba(9, 105, 218, 0.08)` | Repository card hover overlay |
| `--color-focus-ring` | `rgba(9, 105, 218, 0.32)` | Keyboard focus highlight |
| `--color-shortcut-pill` | `rgba(9, 105, 218, 0.16)` | Header keyboard shortcut capsule |
| `--color-scrollbar-track` | `#f6f8fa` | Global scrollbar track |
| `--color-scrollbar-thumb` | `#d0d7de` | Global scrollbar thumb |
| `--color-scrollbar-thumb-hover` | `#afb8c1` | Scrollbar thumb hover |
| `--font-family-base` | `Roboto, sans-serif` | Global font |

**Gaps:** Need confirmation for warning amber and disabled text tokens.

---

## Catppuccin Mocha (`catppuccin-mocha`)

| Token | Value | Usage |
| --- | --- | --- |
| `--color-primary` | `#f5c2e7` | Header gradient start |
| `--color-primary-alt` | `#b4befe` | Header gradient end |
| `--color-background` | `#1e1e2e` | Body/sidebar base |
| `--color-surface-base` | `#1e1e2e` | Sidebar, inputs |
| `--color-surface-elevated` | `#313244` | Cards/dialogs |
| `--color-surface-overlay` | `rgba(49, 50, 68, 0.88)` | Command palette / popover backdrop |
| `--color-border` | `#45475a` | Card borders & dividers |
| `--color-text` | `#cdd6f4` | Primary text |
| `--color-text-muted` | `#bac2de` | Secondary copy |
| `--color-danger` | `#f38ba8` | Critical actions |
| `--color-success` | `#a6e3a1` | Copy confirmation pill |
| `--color-info` | `#89dceb` | Chips & link accents |
| `--color-button-secondary` | `#313244` | Secondary button background |
| `--color-button-secondary-border` | `#45475a` | Secondary button border |
| `--color-hover-row` | `rgba(205, 214, 244, 0.08)` | Repository card hover overlay |
| `--color-focus-ring` | `rgba(137, 220, 235, 0.3)` | Keyboard focus highlight |
| `--color-shortcut-pill` | `rgba(255, 255, 255, 0.12)` | Header keyboard shortcut capsule |
| `--color-scrollbar-track` | `#1e1e2e` | Global scrollbar track |
| `--color-scrollbar-thumb` | `#45475a` | Global scrollbar thumb |
| `--color-scrollbar-thumb-hover` | `#585b70` | Scrollbar thumb hover |
| `--font-family-base` | `"Fira Code", "JetBrains Mono", Monaco, monospace, sans-serif` | Global font stack |

**Gaps:** Need disabled text color and warning amber tokens.

---

## Catppuccin Latte (`catppuccin-latte`)

| Token | Value | Usage |
| --- | --- | --- |
| `--color-primary` | `#fe640b` | Header gradient start |
| `--color-primary-alt` | `#1e66f5` | Header gradient end |
| `--color-background` | `#eff1f5` | Body/sidebar base |
| `--color-surface-base` | `#eff1f5` | Sidebar, inputs |
| `--color-surface-elevated` | `#ffffff` | Cards/dialogs |
| `--color-surface-overlay` | `rgba(255, 255, 255, 0.9)` | Command palette / popover backdrop |
| `--color-border` | `#ccd0da` | Card borders & dividers |
| `--color-text` | `#4c4f69` | Primary text |
| `--color-text-muted` | `#6c6f85` | Secondary copy |
| `--color-danger` | `#d20f39` | Critical actions |
| `--color-success` | `#40a02b` | Copy confirmation pill |
| `--color-info` | `#1e66f5` | Chips & link accents |
| `--color-button-secondary` | `#ffffff` | Secondary button background |
| `--color-button-secondary-border` | `#ccd0da` | Secondary button border |
| `--color-hover-row` | `rgba(30, 102, 245, 0.1)` | Repository card hover overlay |
| `--color-focus-ring` | `rgba(30, 102, 245, 0.24)` | Keyboard focus highlight |
| `--color-shortcut-pill` | `rgba(255, 255, 255, 0.4)` | Header keyboard shortcut capsule |
| `--color-scrollbar-track` | `#eff1f5` | Global scrollbar track |
| `--color-scrollbar-thumb` | `#ccd0da` | Global scrollbar thumb |
| `--color-scrollbar-thumb-hover` | `#b0b5c2` | Scrollbar thumb hover |
| `--font-family-base` | `Roboto, sans-serif` | Global font |

**Gaps:** Need confirmation for warning amber and disabled text tokens.

---

## TODO / Missing Themes

The following themes still need full token capture:

- The Hub Dark (done), The Hub Light (done), One Dark (done), Tokyo Night (done), Cyberpunk (done), GitHub Dark (done), GitHub Light (done), Catppuccin Mocha (done), Catppuccin Latte (done) ✅
- **Outstanding:** Warning state tokens + disabled text variants where noted above.

For each remaining theme, grab:

1. Primary gradient start/end (header).
2. Background, surface (sidebar), elevated surface (card/dialog).
3. Border neutrals & shadows.
4. Typography (font stack overrides).
5. Secondary/muted text.
6. Semantic colors: danger, success, info, warning.
7. Key component backgrounds (buttons, chips, badges, keyboard shortcut pill, table header, focus ring).

Capture via DevTools (`getComputedStyle`) and update this file accordingly. Once all tokens exist, we can map them into Tailwind CSS variables and apply `[data-theme="..."]` selectors in dev.
