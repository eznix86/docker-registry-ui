# ContainerHub UI Replication Project

## Overview

Pixel-perfect replication of ContainerHub UI using Vue 3, TypeScript, and Tailwind CSS v4.

## Key Guidelines

### Development Workflow

1. **Use TailwindPlus components first** - Start with official Tailwind component library (you have access to tailwindplus MCP)
2. **Implement using Tailwind utilities** - Never copy-paste the original directly to dev
3. **Then refine to match the original** - Compare against `localhost:3000` and adjust until pixel-perfect

### Best Practices

- Always use `defineModel` in Vue components
- Never run unsafe commands
- Always inspect `localhost:3000` (target) before implementing
- Use Chrome DevTools evaluate_script to get exact computed styles
- Update this CLAUDE.md when you discover new findings
- Always use `~` alias for imports (e.g., `~/components/ui`, `~/lib/utils`) instead of relative paths
- Always use defineModel for two-way binding in child components instead of props + emits
- Always define emits with TypeScript types using defineEmits<{ eventName: [param: Type] }>()
- Always add ARIA labels to interactive elements (buttons, inputs, links)
- Always extract shared TypeScript types to separate files in src/types/
- Always emit events to parent when child component state changes that parent needs to know
- Always use a class utility (like cn() with clsx + tailwind-merge) instead of manual string concatenation
- Always order script sections as: imports → defineProps/defineEmits/defineModel → state → computed → functions → lifecycle → watchers
- Always set inheritAttrs: false explicitly when using v-bind="$attrs" for clarity
- Always add error handling for async operations (try/catch with error state)
- Always type refs explicitly when the type isn't obvious from initialization
- Always use proper semantic HTML and roles before relying on ARIA attributes
- Always test component communication - if a child has state, ask "does the parent need to know?"
- Always connect filters to filtering logic - don't create orphaned UI controls
- Always clean up unused files like template/boilerplate components

## Reference Websites

- **Original:** `http://localhost:3000` (target design)
- **Development:** `http://localhost:5173` (current implementation)

## Tech Stack

- Vue 3 (Composition API) + TypeScript
- Tailwind CSS v4 with @tailwindcss/vite plugin
- HeadlessUI for Vue (select menus)
- Vite + Bun
- Roboto font (Google Fonts)

## Design System

### Colors

- Primary Text: `#24292f`
- Secondary Text: `#57606a`
- Muted Text: `#8c959f`
- Border: `#d0d7de`
- Background: `#f6f8fa`
- Header Gradient: `from-[#1d63ed] to-[#0047c2]`

### Typography

- Font: 'Roboto', sans-serif
- Weights: 300, 400, 500, 600, 700

### Component Specs

- **Header:** 64px height, gradient background
- **Sidebar:** 320px width, 32px padding (256px content area)
- **Cards:** 12px padding, 8px border radius, 168px height
- **Tags:** 16px border radius, 18px height, 11.2px font size
- **Grid:** 3 columns, 16px gap

## Project Structure

- src/components/ui -> Components which are shared, and cannot be broken down further like shadcn ui
- src/components -> Page/Subcomponents components
- style.css -> contains tailwind and some styling

## Commands

```bash
bun install    # Install dependencies
bun run dev    # Start dev server (port 5173)
bun run build  # Build for production
```
