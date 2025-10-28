# JSX Transform Global Styling

This feature enables automatic global styling for native components (like SVG, Expo Image, etc.) by configuring your TypeScript/Babel setup to use react-native-css's custom JSX runtime.

## The Problem

Currently, when you register a native component with `styled()`, it only works if you use the returned wrapper explicitly:

```javascript
import { Circle } from 'react-native-svg';
import { styled } from 'react-native-css/runtime';

// This creates a styled wrapper but doesn't affect global usage
const StyledCircle = styled(Circle, {
  className: {
    target: 'style',
    nativeStyleMapping: { fill: 'fill', width: 'r', height: 'r' }
  }
});

// ✅ This works (explicit wrapper)
<StyledCircle className="w-8 h-8 fill-red-500" />

// ❌ This doesn't work (original component)
<Circle className="w-8 h-8 fill-red-500" />  // Still gets raw className prop
```

## The Solution: JSX Transform

With JSX transform configuration, you can make the original component work automatically:

```javascript
// Register once
styled(Circle, {
  className: {
    target: 'style', 
    nativeStyleMapping: { fill: 'fill', width: 'r', height: 'r' }
  }
});

// ✅ Now this works automatically everywhere!
<Circle className="w-8 h-8 fill-red-500" />
```

## Setup

### Step 1: Configure TypeScript

Add this to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react-native-css"
  }
}
```

### Step 2: Configure Babel (if using)

Add this to your `babel.config.js`:

```javascript
module.exports = {
  presets: [
    [
      '@babel/preset-react',
      {
        runtime: 'automatic',
        importSource: 'react-native-css'
      }
    ]
  ]
};
```

### Step 3: Register Components

Register your native components once in your app:

```javascript
import { styled } from 'react-native-css/runtime';
import { Circle, Rect, Path, G } from 'react-native-svg';
import { Image } from 'expo-image';

// Register SVG components
[Circle, Rect, Path, G].forEach(Component => {
  styled(Component, {
    className: {
      target: 'style',
      nativeStyleMapping: {
        fill: 'fill',
        stroke: 'stroke',
        strokeWidth: 'strokeWidth',
        width: Component === Circle ? 'r' : 'width',
        height: Component === Circle ? 'r' : 'height',
      }
    }
  });
});

// Register Expo Image
styled(Image, {
  className: {
    target: 'style'
  }
});
```

### Step 4: Use Anywhere

Now you can use className on these components anywhere in your app:

```javascript
function MyComponent() {
  return (
    <View>
      {/* All of these work automatically! */}
      <Circle className="w-8 h-8 fill-blue-500" />
      <Rect className="w-10 h-6 fill-red-500" />
      <Image 
        source={{ uri: 'https://example.com/image.jpg' }}
        className="w-32 h-32 rounded-lg"
      />
    </View>
  );
}
```

## How It Works

The JSX transform configuration tells TypeScript/Babel to transform all JSX elements:

```javascript
// Your JSX:
<Circle className="fill-red-500" />

// Gets transformed to:
jsx(Circle, { className: "fill-red-500" })
```

Our custom `jsx` function checks if the component is registered with `styled()` and automatically uses the styled version if available.

## Compatibility

### ✅ Compatible with:
- React Native 0.64+
- Expo SDK 45+
- TypeScript 4.1+
- React 17+ (automatic JSX transform)
- All existing react-native-css features

### ⚠️ Considerations:
- Requires project configuration changes
- Affects all JSX in your project (not just styled components)
- Small performance overhead for JSX creation (usually negligible)

## Alternative Approaches

If you can't or don't want to configure JSX transform, you have other options:

### Manual Wrapper Usage
```javascript
const StyledCircle = styled(Circle, config);
<StyledCircle className="..." />  // Use wrapper explicitly
```

### Utility Functions
```javascript
import { jsx, getGlobalStyled } from 'react-native-css/runtime';

// Option 1: jsx utility
jsx(Circle, { className: "..." })

// Option 2: Manual lookup
const StyledCircle = getGlobalStyled(Circle);
<StyledCircle className="..." />
```

## Troubleshooting

### JSX Transform Not Working

1. **Check TypeScript config**: Ensure `jsx: "react-jsx"` and `jsxImportSource: "react-native-css"`
2. **Clear cache**: Try clearing Metro/Babel cache
3. **Check imports**: Make sure you're importing from the right packages

### Components Not Styling

1. **Register first**: Components must be registered with `styled()` before use
2. **Check mapping**: Ensure `nativeStyleMapping` is correct for your component
3. **className required**: The JSX transform only applies when `className` prop is present

### Performance Issues

1. **Registry lookup**: Each JSX element checks the registry (usually very fast)
2. **Selective registration**: Only register components you actually need to style
3. **Disable for specific components**: Use `{ global: false }` option

## Examples

### SVG Icon Library

```javascript
// icons.ts - Register all icons once
import { styled } from 'react-native-css/runtime';
import * as Icons from 'react-native-svg';

Object.values(Icons).forEach(Component => {
  styled(Component, {
    className: {
      target: 'style',
      nativeStyleMapping: {
        fill: 'fill',
        stroke: 'stroke',
        width: 'width',
        height: 'height',
      }
    }
  });
});

// MyComponent.tsx - Use anywhere
function MyComponent() {
  return (
    <View>
      <Icons.Circle className="w-6 h-6 fill-blue-500" />
      <Icons.Square className="w-8 h-8 fill-red-500 stroke-black" />
    </View>
  );
}
```

### Expo Image with Styling

```javascript
// Setup once
styled(ExpoImage, {
  className: {
    target: 'style'
  }
});

// Use anywhere
<ExpoImage 
  source={{ uri: 'https://example.com/avatar.jpg' }}
  className="w-20 h-20 rounded-full border-2 border-gray-300"
/>
```

## Migration Guide

### From Manual Wrappers

**Before:**
```javascript
const StyledCircle = styled(Circle, config);
const StyledRect = styled(Rect, config);

function MyComponent() {
  return (
    <View>
      <StyledCircle className="..." />
      <StyledRect className="..." />
    </View>
  );
}
```

**After:**
```javascript
// Setup once (probably in app root)
styled(Circle, config);
styled(Rect, config);

function MyComponent() {
  return (
    <View>
      <Circle className="..." />
      <Rect className="..." />
    </View>
  );
}
```

### From Utility Functions

**Before:**
```javascript
import { jsx } from 'react-native-css/runtime';

function MyComponent() {
  return jsx(Circle, { className: "..." });
}
```

**After:**
```javascript
// Just use normal JSX after setup
function MyComponent() {
  return <Circle className="..." />;
}
```
