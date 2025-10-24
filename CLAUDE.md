# ContainerHub UI - React to Vue Migration

## Project Status

**Current Phase:** Planning Complete - Ready for Migration
**Detailed Plan:** See [PLAN.md](./PLAN.md)

## Key Highlights

### Migration Overview
- **From:** React 19 + Material UI + Zustand + @inertiajs/react + Biome
- **To:** Vue 3 + Tailwind CSS v4 + Pinia + @inertiajs/vue3 + ESLint
- **Strategy:** Direct integration into `resources/js/` with Inertia.js server props
- **Safety:** All React code preserved in `resources/js-react-tmp/` (not deleted)

### Technical Benefits
✅ **Simpler State Management** - Vue's reactivity eliminates custom Inertia listeners
✅ **Native Two-Way Binding** - No more manual event synchronization
✅ **Smaller Bundle** - Tailwind CSS replaces heavy Material UI
✅ **Better DX** - Composition API + `usePage()` simplifies data flow
✅ **No Re-render Issues** - Vue handles reactivity natively (no custom prevention needed)
✅ **Better Linting** - ESLint with Vue support (Biome doesn't work with Vue)

### Architecture Changes
- **Inertia Integration:** Use `usePage<T>()` composable instead of custom event listeners
- **Store Pattern:** Pinia composition stores with computed props from Inertia
- **Component Style:** HeadlessUI + Tailwind utilities (template-based)
- **Type Safety:** Full TypeScript with proper Inertia prop types
- **Linting:** ESLint with @antfu/eslint-config + Vue accessibility rules

## Migration Checklist

### ✅ Done
- [x] Research existing React structure
- [x] Analyze template Vue implementation
- [x] Create comprehensive migration plan
- [x] Document key decisions and architecture

### 🔄 Doing
- [ ] None (awaiting plan approval)

### 📋 Todo

#### Phase 1: Setup & Dependencies
- [ ] Install Vue dependencies via `bun add`
- [ ] Install Vue dev dependencies via `bun add -d`
- [ ] Install ESLint dependencies via `bun add -d` (@antfu/eslint-config, eslint-plugin-vuejs-accessibility, oxlint)
- [ ] Update vite.config.ts (Vue plugin, Tailwind plugin)
- [ ] Copy `eslint.config.js` from template
- [ ] Update package.json scripts (remove biome, add eslint from template)
- [ ] Create `resources/css/app.css` with Tailwind directives

#### Phase 2: Backup & Core Infrastructure
- [ ] Move `resources/js/` → `resources/js-react-tmp/`
- [ ] Create new directory structure for Vue app
- [ ] Create `resources/js/app.ts` (Vue + Inertia entry point)
- [ ] Setup Pinia, auto-animate, ripple directive

#### Phase 3: Copy Template Files
- [ ] Copy UI components from `template/src/components/ui/`
- [ ] Copy page components (Header, Sidebar, RepositoryCard, etc.)
- [ ] Copy composables (useFonts, useTheme, useContainerRuntime, useRipple)
- [ ] Copy directives (ripple.ts)
- [ ] Copy lib utilities (utils.ts)

#### Phase 4: Store Migration (Zustand → Pinia)
- [ ] Create `useFilterStore.ts` (registries, architectures, search, showUntagged)
- [ ] Create `useRepositoryStore.ts` (repository details, tags)
- [ ] Create `useSettingsStore.ts` (theme/settings)
- [ ] Remove custom Inertia listener logic

#### Phase 5: Type Definitions
- [ ] Copy and adapt types from React version
- [ ] Create `types/index.ts`
- [ ] Create `types/repository.ts`
- [ ] Create `types/registry.ts`

#### Phase 6: Pages Implementation
- [ ] Create `Pages/Explore.vue` (integrate with Inertia props)
- [ ] Create `Pages/Repository.vue` (integrate with Inertia props)
- [ ] Create `Pages/NotFound.vue`

#### Phase 7: Component Integration
- [ ] Update HeaderComponent.vue (connect to stores/props)
- [ ] Update SidebarComponent.vue (connect to filters)
- [ ] Update RepositoryCard.vue (proper props/emits)
- [ ] Update SettingsDialog.vue (settings store)
- [ ] Update UntaggedDialog.vue (props/emits)

#### Phase 8: Views Update & Config
- [ ] Update `resources/views/app.html` (@vite directives)
- [ ] Ensure proper asset references

#### Phase 9: Testing & Validation
- [ ] Test ESLint runs without errors (`bun run lint`)
- [ ] Test Vite build
- [ ] Test page navigation
- [ ] Test filters and search
- [ ] Test dialogs
- [ ] Test settings persistence
- [ ] Test mobile responsive behavior
- [ ] Cross-browser testing

## Key Technical Details

### Inertia Integration Pattern

**React (OLD - Complex):**
```typescript
// Custom event listeners sync stores manually
setupInertiaListeners()
router.on("success", (event) => {
	syncStores(event.detail.page.props)
})
```

**Vue (NEW - Simple):**
```vue
<script setup lang="ts">
// Automatic reactivity via computed
const page = usePage<ExploreProps>()
const repositories = computed(() => page.props.repositories)
</script>
```

### Store Pattern

**React (Zustand):**
- Manual sync between Inertia and store
- Separate "remote" and "local" state
- Custom debouncing for filters

**Vue (Pinia):**
- Computed values from `usePage()`
- Single source of truth
- Vue's reactivity handles updates

### Component Communication

**Props Down:** Parent → Child data flow
**Emits Up:** Child → Parent event flow
**Stores:** Shared state (filters, settings, repository)
**Inertia Props:** Server data via `usePage()`

### Linting Configuration

**Old (Biome):**
- `@biomejs/biome` - doesn't support Vue
- Script: `biome check --fix ./resources`

**New (ESLint from template):**
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
├── js-react-tmp/                # Backed up React code
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

### Never Do
- Don't delete files (move to `-tmp` directory)
- Don't copy-paste original design directly
- Don't skip type definitions
- Don't create dummy/no-op tests
- Don't run unsafe commands
- Don't use Biome (doesn't work with Vue)

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

## Reference

- **Migration Plan:** [PLAN.md](./PLAN.md)
- **Template Structure:** `template/` directory
- **React Backup:** `resources/js-react-tmp/` (after Phase 2)
- **Original React:** `resources/js/` (current)
