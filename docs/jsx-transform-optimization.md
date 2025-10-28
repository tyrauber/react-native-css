# JSX Transform Performance Optimization

This document describes a performance optimization implemented in the JSX transform system to avoid unnecessary transformations of components that already support `className` natively.

## The Problem

The jsx-transform system in `react-native-css` automatically transforms JSX elements to use styled versions when components are registered with `styled()`. However, components from `react-native-css/components` (like `View`, `Text`, etc.) already handle `className` props natively through `useCssElement`. 

Without optimization, the transform would:
1. Check if a component is registered in the styled registry
2. Apply transformation even if the component already supports `className`
3. Create unnecessary wrapper components and perform redundant style processing

## The Solution

A flag-based optimization system that:

1. **Marks pre-styled components**: Components created with `copyComponentProperties` (all components from `react-native-css/components`) are automatically flagged with `__REACT_NATIVE_CSS_STYLED__ = true`

2. **Skips transformation**: The JSX runtime checks for this flag and bypasses transformation for flagged components

3. **Maintains compatibility**: Normal components without the flag continue to be transformed as before

## Implementation Details

### Flag System

```typescript
// copyComponentProperties.ts
export const __REACT_NATIVE_CSS_STYLED__ = "__REACT_NATIVE_CSS_STYLED__";

export function copyComponentProperties<T extends AnyComponent>(
  BaseComponent: T,
  Component: AnyComponent,
) {
  // ... existing logic ...
  
  // Mark this component as pre-styled so jsx-runtime can skip transformation
  (Component as unknown as Record<string, unknown>)[
    __REACT_NATIVE_CSS_STYLED__
  ] = true;

  return Component as unknown as T;
}
```

### JSX Runtime Optimization

```typescript
// jsx-runtime.ts
function jsxWithGlobalStyling(
  type: React.ComponentType<any> | string,
  props: any,
  key?: React.Key,
): React.ReactElement {
  if (typeof type === "function" || (type && typeof type === "object" && (type as any).$$typeof)) {
    // Skip transformation if component is already pre-styled
    if ((type as any)[__REACT_NATIVE_CSS_STYLED__]) {
      return React.createElement(type as any, { ...props, key } as any);
    }

    // Normal transformation logic continues...
    const styledVersion = globalStyledRegistryContainer.registry.get(type);
    if (styledVersion && props && (props as any).className) {
      return React.createElement(styledVersion, { ...props, key } as any);
    }
  }

  return React.createElement(type as any, { ...props, key } as any);
}
```

## Performance Benefits

### Before Optimization
```jsx
import { View } from 'react-native-css/components';

// This would unnecessarily:
// 1. Check styled registry
// 2. Create wrapper component  
// 3. Apply redundant transformations
<View className="w-10 h-10" />
```

### After Optimization
```jsx
import { View } from 'react-native-css/components';

// This now:
// 1. Checks flag (fast)
// 2. Skips transformation entirely
// 3. Passes className directly to native component
<View className="w-10 h-10" />
```

## Impact

- **Reduced overhead**: Eliminates unnecessary registry lookups and wrapper component creation
- **Better performance**: Direct prop passing for pre-styled components
- **Maintained functionality**: All existing behavior preserved for components without the flag
- **Automatic optimization**: Works transparently without user configuration

## Component Categories

### Optimized (Skip Transform)
All components from `react-native-css/components`:
- `View`, `Text`, `Image`, `ScrollView`, etc.
- Any component created with `copyComponentProperties`

### Still Transformed (Normal Flow)
- External library components registered with `styled()`
- Custom components without the pre-styled flag
- Components that need runtime style mapping

## Testing

The optimization includes comprehensive tests in `jsx-transform-styling.test.tsx`:

```typescript
test("should skip transformation for components from react-native-css/components", () => {
  // Verifies flagged components receive raw className props
  // Verifies no transformation artifacts are present
});

test("should still transform normal components without the flag", () => {
  // Verifies non-flagged components continue to be transformed
  // Verifies transformation produces expected styled props
});
```

## Backwards Compatibility

- ✅ Existing code continues to work unchanged
- ✅ No API changes required
- ✅ Performance improvement is automatic
- ✅ All existing tests pass

## Technical Notes

- The flag is a simple boolean property on component functions
- The optimization happens at JSX element creation time
- Components must use `copyComponentProperties` to receive the flag
- The flag name is exported as a constant to avoid magic strings