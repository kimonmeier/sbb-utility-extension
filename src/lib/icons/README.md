# Icon System Documentation

## Overview

This extension uses [Lucide](https://lucide.dev/) icons for a consistent, high-quality icon system that works perfectly with Chrome extension CSP requirements.

## Usage

### Basic Usage (Direct Import)

```svelte
<script lang="ts">
  import { Home, Settings } from '$lib/icons';
</script>

<Home size={24} />
<Settings size={20} strokeWidth={1.5} class="text-blue-500" />
```

### Using the Icon Wrapper Component

```svelte
<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { HelpCircle } from '$lib/icons';
</script>

<Icon icon={HelpCircle} size={24} class="text-current" />
```

### Dynamic Icons

```svelte
<script lang="ts">
  import type { Component } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { Home, Settings } from '$lib/icons';
  
  let currentIcon: Component<any> = $state(Home);
</script>

<Icon icon={currentIcon} size={24} />
<button onclick={() => currentIcon = Settings}>Switch Icon</button>
```

## Adding New Icons

1. Import the icon from `@lucide/svelte` in `/src/lib/icons/index.ts`:

```typescript
export { 
  Home,
  Settings,
  YourNewIcon,  // Add here
} from '@lucide/svelte';
```

2. Use it in your components:

```svelte
<script>
  import { YourNewIcon } from '$lib/icons';
</script>

<YourNewIcon size={24} />
```

## Props

All Lucide icons accept these props:

- `size?: number | string` - Icon size (default: 24)
- `strokeWidth?: number` - Stroke width (default: 2)
- `color?: string` - Icon color (use `currentColor` for theme support)
- `class?: string` - CSS classes
- `absoluteStrokeWidth?: boolean` - Whether to use absolute stroke width

## Benefits

✅ **CSP Compliant**: No inline SVG issues with Chrome's strict CSP  
✅ **Tree-shakeable**: Only imported icons are bundled  
✅ **TypeScript Support**: Full type safety  
✅ **Theme Integration**: Uses `currentColor` by default  
✅ **Performance**: Lightweight and optimized  
✅ **Consistent Design**: Professional icon set

## Icon Registry

All icons are centralized in `/src/lib/icons/index.ts` to:
- Keep track of which icons are used
- Minimize bundle size
- Maintain consistency
- Enable easy refactoring

Browse available icons at: https://lucide.dev/icons
