### State Management Architecture

**Context-Based Stores:** Organize stores by feature/domain, not technical layer

**Store Organization:**
- `useExploreFilterStore` - Explore page filters (registries, architectures, search, showUntagged, sidebarOpen)
- `useUntaggedDialogStore` - Untagged repository dialog state
- `useSettingsStore` - Settings dialog state
- `useRepositoryFilterStore` - Repository page filters (sortBy, filter)
- `useTagDeleteStore` - Single tag deletion dialog
- `useTagBulkDeleteStore` - Bulk tag deletion dialog and selection

**Pattern:**
- ✅ **Use Stores for:** Global state, dialogs, cross-component state
- ✅ **Direct Store Access:** Components call store actions directly (no emits for global state)
- ✅ **Direct Binding:** Use `@click="store.action"` instead of wrapping in component methods
- ❌ **Avoid Local State:** Don't use local `ref()` for state that could be global
- ❌ **Avoid Prop Drilling:** Don't emit events up for global actions
- ❌ **Avoid Wrapper Functions:** Don't create component methods that just call store actions

**Example:**
```vue
<!-- Good: Direct store action -->
<button @click="dialogStore.openDialog(repository)">
Open
</button>

<!-- Bad: Unnecessary wrapper function -->
<button @click="handleClick">
Open
</button>

<script>
function handleClick() {
	dialogStore.openDialog(repository) // Just wrapping, no added logic
}
</script>

<!-- Exception: Wrapper OK when adding logic -->
<button @click="handleClickWithValidation">
Open
</button>

<script>
function handleClickWithValidation() {
  if (!repository.isValid) return // Added logic
  dialogStore.openDialog(repository)
}
</script>
```
**ESLint**
- `@antfu/eslint-config` - comprehensive Vue support
- `eslint-plugin-vuejs-accessibility` - a11y checking
- `oxlint` - fast linting
- Scripts: `lint` and `lint:fix`

## File Structure

```
resources/
├── js/
│   ├── app.ts                    # Vue + Inertia entry
│   ├── Pages/
│   │   ├── Explore.vue          # Repository list
│   │   ├── Repository.vue       # Repository detail
│   │   └── NotFound.vue         # 404 page
│   ├── components/
│   │   ├── ui/                  # Base UI (from template)
│   │   └── [page components]
│   ├── stores/                  # Pinia stores
│   ├── composables/             # Vue composables
│   ├── directives/              # Vue directives
│   ├── lib/                     # Utilities
│   └── types/                   # TypeScript types
└── css/
    └── app.css                  # Tailwind entry
```

## Development Guidelines

### Always Follow
- Use `bun add` / `bun add -d` for dependencies (never manual package.json edits)
- Use template components first, then adapt (no recreation)
- Use `defineModel` for two-way binding
- Use `~` alias for imports (e.g., `~/components/ui`)
- Use Tailwind utilities (from template) instead of copying original
- Write proper TypeScript types for all props/emits
- Test incrementally after each phase
- Run ESLint before committing

## Commands

```bash
bun install              # Install dependencies
bun run dev              # Start dev server
bun run build            # Build for production (vue-tsc + vite build)
bun run build:dev        # Build + custom script
bun run preview          # Preview production build
bun run lint             # Lint code (ESLint)
bun run lint:fix         # Lint and auto-fix
```

## State Management Architecture

### Store Organization Pattern

Stores are organized by **context/domain** rather than technical layers. Each store manages related state for a specific feature area.

#### Current Stores:

**`useAppPreferencesStore`** - User preferences and settings
- Theme selection (with `useLocalStorage` from VueUse)
- Font preferences (sans, mono)
- Container runtime preference
- Settings dialog state
- **Why combined:** All user preferences share the same lifecycle (localStorage persistence, applied on init)

**`useExploreFilterStore`** - Explore page filters
- Selected registries, architectures
- Search query (with `useDebounceFn` from VueUse)
- Show untagged toggle
- **Context:** Explore page filtering

**`useRepositoryFilterStore`** - Repository page filters
- Tag sorting, filtering
- Repository metadata
- **Context:** Repository page state

**`useUntaggedDialogStore`** - Untagged repository dialog
- Dialog open/close state
- Selected repository for dialog
- **Context:** Untagged repository feature

### Pinia Best Practices Applied

✅ **Helper functions extracted** - `buildFilterParams()`, `applyTheme()`, etc. defined outside stores
✅ **VueUse integration** - `useLocalStorage`, `useDebounceFn`, `useTimeAgo`, `useClipboard`
✅ **Grouped returns** - State, Getters, Actions clearly organized
✅ **Setup stores pattern** - Using Composition API style for flexibility
✅ **Context-based naming** - `useExploreFilterStore` not `useFilterStore`

### Direct Store Action Binding

Components should call store actions **directly** without wrapper functions.

**✅ Good:**
```vue
<button @click="store.openDialog">
Open
</button>

<script setup>
const store = useUntaggedDialogStore()
</script>
```

**❌ Bad:**
```vue
<button @click="handleOpen">
Open
</button>

<script setup>
const store = useUntaggedDialogStore()

// Unnecessary wrapper
function handleOpen() {
	store.openDialog()
}
</script>
```

**Exception:** Wrappers are okay when adding logic:
```vue
<script setup>
function handleSubmit() {
	if (validate()) {
		store.submit() // Additional logic justifies wrapper
	}
}
</script>
```

### Composables vs Stores

**Composables** - Reusable logic with local state (per-component instances)
- `useRipple` - DOM manipulation utilities
- VueUse utilities - `useLocalStorage`, `useTimeAgo`, `useClipboard`, etc.

**Stores** - Global shared state (singleton across app)
- User preferences, filters, dialog state
- Cross-component coordination

**Key Rule:** If multiple unrelated components need the same state, use a store. If it's just reusable logic, use a composable.
