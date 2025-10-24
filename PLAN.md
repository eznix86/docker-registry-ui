# React to Vue Migration Plan

## Overview
Migrate from React + Material UI + Zustand to Vue 3 + Tailwind CSS + Pinia, integrating with Inertia.js for server-side props.

## Key Decisions
- ✅ Integrate directly into `resources/js/`
- ✅ Use Inertia props via `usePage()` composable
- ✅ Keep MUI temporarily (remove in separate cleanup phase)
- ✅ No custom re-rendering prevention (Vue handles this natively)
- ✅ Move old files to `resources/js-react-tmp/` instead of deleting
- ✅ Use only existing template components (no recreation of React-specific components)
- ✅ Use `bun add` and `bun add -d` for package management

## Migration Steps

### Phase 1: Setup & Dependencies

#### 1.1 Install Vue Dependencies
```bash
bun add @inertiajs/vue3 pinia @headlessui/vue @formkit/auto-animate tailwind-merge tailwind-variants vue
```

#### 1.2 Install Vue Dev Dependencies
```bash
bun add -d @vitejs/plugin-vue @tailwindcss/vite vue-tsc autoprefixer postcss
```

#### 1.3 Install ESLint Dependencies (Replace Biome)
```bash
bun add -d @antfu/eslint-config eslint eslint-plugin-vuejs-accessibility
```

**Note:** Biome doesn't work with Vue, so we're migrating to ESLint from the template.

#### 1.4 Copy ESLint Configuration
- Copy `eslint.config.js` from `template/eslint.config.js` to project root
- Features:
  - @antfu/eslint-config with Vue + a11y support
  - Tab indentation, double quotes
  - Vue block order enforcement (template, script, style)
  - Accessibility rules for labels
  - Perfectionist plugin for sorting

#### 1.5 Update package.json scripts
**Remove:**
- `"lint": "biome check --fix ./resources vite.config.ts && go fmt ./... && golangci-lint run -c .golangci.yml ./..."`

**Add (from template):**
- `"lint": "eslint && go fmt ./... && golangci-lint run -c .golangci.yml ./..."`
- `"lint:fix": "eslint --fix"`

**Update:**
- `"build": "vue-tsc -b && vite build"` (from template - includes type checking)

**Keep:**
- `"dev": "vite"`
- `"build:dev": "vite build && ./build.sh"`
- `"preview": "./bin/dev serve"`

#### 1.6 Update vite.config.ts
- Replace `@preact/preset-vite` with `@vitejs/plugin-vue`
- Add `@tailwindcss/vite` plugin
- Update input from `resources/js/app.tsx` to `resources/js/app.ts`
- Add `resources/css/app.css` to inputs
- Keep laravel-vite-plugin configuration

#### 1.7 Create Tailwind CSS setup
- Create `resources/css/app.css` with Tailwind directives
- Copy relevant styles from `template/src/style.css`

### Phase 2: Backup & Core Infrastructure

#### 2.1 Move React app to temporary directory
```bash
# Move entire resources/js/ to resources/js-react-tmp/
mv resources/js resources/js-react-tmp
mkdir resources/js
```

#### 2.2 Create new Vue app entry (`resources/js/app.ts`)
- Initialize Inertia with Vue 3
- Setup Pinia store
- Setup auto-animate plugin
- Create ripple directive registration
- Page resolver for `./Pages/**/*.vue`
- Mount to element

### Phase 3: Directory Structure Setup

#### 3.1 Create directory structure
```bash
mkdir -p resources/js/Pages
mkdir -p resources/js/components
mkdir -p resources/js/components/ui
mkdir -p resources/js/stores
mkdir -p resources/js/composables
mkdir -p resources/js/directives
mkdir -p resources/js/lib
mkdir -p resources/js/types
```

### Phase 4: Copy Template Files

#### 4.1 Copy UI components from template
Copy from `template/src/components/ui/` to `resources/js/components/ui/`:
- Button.vue
- Card.vue, CardBody.vue, CardFooter.vue, CardHeader.vue
- Checkbox.vue
- Chip.vue
- CopyCommand.vue
- Dialog.vue, DialogTitle.vue, MobileDialog.vue
- Select.vue, SelectContent.vue, SelectItem.vue, SelectTrigger.vue
- index.ts

#### 4.2 Copy page components from template
Copy from `template/src/components/` to `resources/js/components/`:
- HeaderComponent.vue
- SidebarComponent.vue
- RepositoryCard.vue
- SettingsDialog.vue
- UntaggedDialog.vue

#### 4.3 Copy composables from template
Copy from `template/src/composables/` to `resources/js/composables/`:
- useFonts.ts
- useTheme.ts
- useContainerRuntime.ts
- useRipple.ts

#### 4.4 Copy directives from template
Copy from `template/src/directives/` to `resources/js/directives/`:
- ripple.ts

#### 4.5 Copy lib utilities from template
Copy from `template/src/lib/` to `resources/js/lib/`:
- utils.ts

### Phase 5: Store Migration (Zustand → Pinia)

#### 5.1 Create Pinia stores
Based on React stores in `resources/js-react-tmp/stores/`:
- `stores/useFilterStore.ts` - Filter state (registries, architectures, search, showUntagged)
- `stores/useRepositoryStore.ts` - Repository details and tags state
- `stores/useSettingsStore.ts` - Theme/settings state (from themeStore.ts)

**Key changes:**
- No custom Inertia listeners needed
- Use `usePage()` for reactive props
- Use Pinia composition API pattern
- Remove manual synchronization logic

### Phase 6: Type Definitions

#### 6.1 Migrate types
Copy and adapt types from `resources/js-react-tmp/types.ts`:
- `types/index.ts` - Main types
- `types/repository.ts` - Repository-specific types (copy from template)
- `types/registry.ts` - Registry-specific types (copy from template)

### Phase 7: Pages Implementation

#### 7.1 Create Explore.vue
Based on:
- Template: `template/src/views/Home.vue`
- React version: `resources/js-react-tmp/Pages/Explore.tsx`

**Integration:**
- Use `usePage<ExploreProps>()` for Inertia props
- Replace mock data with props: `repositories`, `totalRepositories`, `filters`, `registries`, `architectures`
- Use filter store for client-side filter state
- Keep layout structure from template

#### 7.2 Create Repository.vue
Based on:
- Template: `template/src/views/RepositoryDetail.vue` (if exists)
- React version: `resources/js-react-tmp/Pages/Repository.tsx`

**Integration:**
- Use `usePage<RepositoryProps>()` for Inertia props
- Get `repository`, `tags`, `filters` from props
- Use repository store for client-side state
- Integrate with existing components

#### 7.3 Create NotFound.vue
Simple migration from `resources/js-react-tmp/Pages/NotFound.tsx`

### Phase 8: Component Integration

#### 8.1 Update components to use Inertia data
For each component copied from template:
- Remove mock/hardcoded data
- Use props passed from parent pages
- Use stores where appropriate
- Ensure emits are properly defined for parent communication

#### 8.2 Update HeaderComponent.vue
- Integrate with filter store for search
- Add refresh functionality
- Keep template styling

#### 8.3 Update SidebarComponent.vue
- Connect to filter store
- Use registry/architecture data from page props
- Integrate filter components

#### 8.4 Update RepositoryCard.vue
- Accept repository prop from parent
- Emit events for interactions
- Keep template styling

#### 8.5 Update SettingsDialog.vue
- Integrate with settings store
- Theme switching functionality
- Font selection

#### 8.6 Update UntaggedDialog.vue
- Accept props for repository data
- Emit close event

### Phase 9: Views Update

#### 9.1 Update app.html
- Ensure @vite points to new entry files:
  - `resources/js/app.ts`
  - `resources/css/app.css`
- Keep existing Laravel Blade structure

### Phase 10: Testing & Validation

#### 10.1 Test critical paths
- [ ] ESLint runs successfully (`bun run lint`)
- [ ] ESLint auto-fix works (`bun run lint:fix`)
- [ ] Vite builds successfully with type checking
- [ ] Pages load with Inertia
- [ ] Navigation between pages works
- [ ] Filters update and persist
- [ ] Search functionality works
- [ ] Dialogs open/close properly
- [ ] Settings persist
- [ ] Mobile responsive behavior
- [ ] Theme switching works

#### 10.2 Browser testing
- [ ] Desktop layout
- [ ] Mobile layout
- [ ] Tablet layout
- [ ] Filter drawer on mobile
- [ ] All interactive elements

### Phase 11: Cleanup Notes

**Not done in this phase (future cleanup):**
- Remove MUI packages from package.json
- Remove React packages from package.json
- Remove Preact packages from package.json
- Remove Biome package (@biomejs/biome)
- Delete `resources/js-react-tmp/` directory
- Update build scripts if needed

## Key Technical Changes

### Linting: Biome → ESLint

**Before (Biome):**
```json
{
  "devDependencies": {
    "@biomejs/biome": "^2.2.6"
  },
  "scripts": {
    "lint": "biome check --fix ./resources vite.config.ts && go fmt ./... && golangci-lint run -c .golangci.yml ./..."
  }
}
```
**Problem:** Biome doesn't support Vue files

**After (ESLint from template):**
```json
{
  "devDependencies": {
    "@antfu/eslint-config": "^6.0.0",
    "eslint": "^9.38.0",
    "eslint-plugin-vuejs-accessibility": "^2.4.1"
  },
  "scripts": {
    "lint": "eslint && go fmt ./... && golangci-lint run -c .golangci.yml ./...",
    "lint:fix": "eslint --fix",
    "build": "vue-tsc -b && vite build"
  }
}
```
**Benefits:** Full Vue support, a11y checking, type checking in build, better DX

### Inertia Integration

**Before (React):**
```tsx
// Custom listener syncs Zustand stores
setupInertiaListeners()
// Manual store updates on route changes
router.on('success', (event) => {
  syncStores(event.detail.page.props)
})
```

**After (Vue):**
```vue
<script setup lang="ts">
// Reactive props automatically update
const page = usePage<ExploreProps>()
const repositories = computed(() => page.props.repositories)
</script>
```

### Store Architecture

**Before (Zustand):**
- Global stores with manual sync from Inertia events
- Custom listeners for route changes
- Separation between "remote" and "local" state

**After (Pinia):**
- Composition API stores
- Computed values from `usePage()` for server data
- Vue's reactivity handles updates automatically
- Simpler state management

### Component Communication

**Before:**
- Zustand global state everywhere
- Custom Inertia event system

**After:**
- Props + emits for parent-child communication
- Pinia stores for shared state
- `usePage()` for Inertia data
- Native Vue reactivity

## File Structure After Migration

```
resources/
├── js/
│   ├── app.ts                    # New Vue entry point
│   ├── Pages/
│   │   ├── Explore.vue          # Main repository list page
│   │   ├── Repository.vue       # Repository detail page
│   │   └── NotFound.vue         # 404 page
│   ├── components/
│   │   ├── ui/                  # Base UI components (from template)
│   │   │   ├── Button.vue
│   │   │   ├── Card.vue
│   │   │   ├── Dialog.vue
│   │   │   ├── Select.vue
│   │   │   └── ...
│   │   ├── HeaderComponent.vue
│   │   ├── SidebarComponent.vue
│   │   ├── RepositoryCard.vue
│   │   ├── SettingsDialog.vue
│   │   └── UntaggedDialog.vue
│   ├── stores/                  # Pinia stores
│   │   ├── useFilterStore.ts
│   │   ├── useRepositoryStore.ts
│   │   └── useSettingsStore.ts
│   ├── composables/             # Vue composables
│   │   ├── useFonts.ts
│   │   ├── useTheme.ts
│   │   ├── useContainerRuntime.ts
│   │   └── useRipple.ts
│   ├── directives/              # Vue directives
│   │   └── ripple.ts
│   ├── lib/                     # Utilities
│   │   └── utils.ts
│   └── types/                   # TypeScript types
│       ├── index.ts
│       ├── repository.ts
│       └── registry.ts
├── js-react-tmp/                # Backed up React code
│   └── (entire old structure)
└── css/
    └── app.css                  # Tailwind CSS entry
```

## Risk Mitigation

- ✅ No files deleted (moved to `js-react-tmp/` directory)
- ✅ Can rollback by reverting vite.config.ts, package.json, and app.html
- ✅ MUI kept temporarily for reference
- ✅ Incremental testing after each phase
- ✅ Use proven template components (already working)
- ✅ Leverage Vue's native reactivity (simpler than custom sync)

## Success Criteria

- [ ] Application builds without errors
- [ ] All pages render correctly
- [ ] Inertia navigation works between pages
- [ ] Filters work and update data from server
- [ ] Search functionality works with debouncing
- [ ] Dialogs open and close properly
- [ ] Settings persist across sessions
- [ ] Responsive design works on all screen sizes
- [ ] No console errors in browser
- [ ] Performance is equivalent or better than React version
