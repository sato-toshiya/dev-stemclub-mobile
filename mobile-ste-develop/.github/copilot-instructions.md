# Copilot Instructions for mobile-ste

This is a React Native mobile app built with Expo (SDK 54), Expo Router, and the Ignite boilerplate. The app is designed for **landscape orientation only** and supports iOS and Android platforms.

## Build, Test, and Lint Commands

### Development
```bash
# Start dev server (requires dev client build first)
yarn start

# Build dev client
yarn build:ios:sim          # iOS simulator
yarn build:ios:device       # iOS device
yarn build:android:sim      # Android simulator
yarn build:android:device   # Android device

# Run on device/simulator (requires dev client)
yarn ios
yarn android
```

### Testing
```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run Maestro E2E tests
yarn test:maestro

# Setup Android reverse proxy for testing
yarn adb
```

### Linting and Type Checking
```bash
# Lint and auto-fix
yarn lint

# Lint without fixing
yarn lint:check

# Type check (no emit)
yarn compile

# Check dependency rules
yarn depcruise
```

### Building for Production
```bash
# Production builds
yarn build:ios:prod
yarn build:android:prod

# APK/AAB for Android
yarn build:apk
yarn build:aab
```

### API Code Generation
```bash
# Generate API client from OpenAPI spec (backend/swagger.json)
yarn openapi
```

## High-Level Architecture

### File-Based Routing (Expo Router)
- Routes are defined in `src/app/` directory
- `_layout.tsx` files define layout hierarchies
- Route groups use `(groupName)` convention (e.g., `(app)`, `(auth)`)
- Main entry: `src/app/_layout.tsx` with providers (QueryClient, SafeArea, Keyboard, Theme, i18n)

### State Management (Zustand)
- Store files: `src/stores/{feature}/{feature}.store.ts`
- Each store has separate files:
  - `{feature}.store.ts` - Zustand store with actions
  - `{feature}.type.ts` - TypeScript types
  - `{feature}.selectors.ts` - Reusable selectors
- MMKV used for persistence (encrypted via react-native-keychain)
- Example: `useAuthStore` in `src/stores/auth/`

### API Layer
- Generated API client in `src/client/` from OpenAPI spec
- TanStack Query (React Query) for data fetching
- Custom API utilities in `src/services/api/`
- API configuration in `src/config/`

### Component Architecture
- Custom wrapper components in `src/components/`:
  - `Text`, `Button`, `TextField` (never import from react-native directly)
  - `Screen` - base screen wrapper with safe areas
  - `Icon`, `AutoImage` - asset components
- Theming via `src/theme/` with dark mode support

### Storage Strategy
- **MMKV** (`src/utils/storage/`): Fast, encrypted key-value storage
  - Used for auth tokens, user data, app state
  - Encryption key stored in Keychain (iOS) / Keystore (Android)
- **Keychain/Keystore**: Secure credential storage via `react-native-keychain`

### Internationalization
- i18next with `react-i18next`
- Translation files: `src/i18n/{locale}.ts` (en, ja)
- Use `translate()` helper from `src/i18n/translate`
- Date formatting with `date-fns` locales

## Key Conventions

### Import Order (ESLint enforced)
1. `react` (always first)
2. `react-native` 
3. `expo` and expo packages
4. External packages (alphabetical)
5. Internal imports with `@/` alias
6. Relative imports

### Path Aliases
- `@/*` → `src/*`
- `@assets/*` → `assets/*`

### Restricted Imports (ESLint will error)
- ❌ `import React from 'react'` → Use named exports instead
- ❌ `import { SafeAreaView } from 'react-native'` → Use `react-native-safe-area-context`
- ❌ `import { Text, Button, TextInput } from 'react-native'` → Use custom components from `@/components`

### Component Patterns
- Use `StyleSheet.create()` for styles
- Prefix style objects with `$` (e.g., `$container`, `$text`)
- Use `moderateScale()` from `@/theme/spacing` for responsive sizing
- Always use `useSafeAreaInsets()` for safe area handling

### State Management Patterns
- Zustand stores use plain functions (not methods)
- Selectors defined separately for reusability
- Persist to MMKV for critical data (auth, user preferences)
- Use TanStack Query for server state

### Screen Orientation
- App locked to **LANDSCAPE** mode
- Orientation lock is enforced in `src/app/_layout.tsx`
- Important for iPad compatibility

### Naming Conventions
- Components: PascalCase (e.g., `UserProfile.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useAuthStore`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Constants: UPPER_SNAKE_CASE

### Testing
- Jest with `jest-expo` preset
- Setup file: `test/setup.ts`
- React Native Testing Library for components
- Maestro for E2E tests (`.maestro/flows/`)

### TypeScript Configuration
- Strict mode enabled
- No implicit any, returns, or this
- Type definitions in `types/` directory
- Use type-safe i18n keys

### Development Tools
- Reactotron for debugging (dev only, enforced by ESLint)
- Husky for git hooks (pre-commit linting)
- Lint-staged for staged file linting

### Backend Integration
- Backend spec expected at `../backend/swagger.json`
- API client auto-generated with `@hey-api/openapi-ts`
- Configured for Axios with TanStack Query hooks

## Common Patterns

### Creating a New Screen
1. Add route file in `src/app/` (e.g., `src/app/profile.tsx`)
2. Use `Screen` component wrapper
3. Implement with proper safe areas and theme colors

### Adding a New Store
1. Create folder in `src/stores/{feature}/`
2. Create `{feature}.type.ts` with types
3. Create `{feature}.store.ts` with Zustand store
4. Optionally add `{feature}.selectors.ts` for reusable selectors

### Working with Translations
1. Add keys to `src/i18n/en.ts` and `src/i18n/ja.ts`
2. Use `translate('namespace:key')` in components
3. Use `t()` from `useTranslation()` hook for dynamic translations

### Using Custom Fonts
- Google Fonts loaded via `@expo-google-fonts/*` packages
- Font configuration in `src/theme/typography.ts`
- Apply via `fontFamily` style property
