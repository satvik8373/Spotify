# CustomScrollbar Component

A Spotify-like custom scrollbar component with a floating overlay design and no visible track background.

## Features

- ✨ **Backgroundless Design**: Only the thumb is visible, no track background
- 🎯 **Hover to Show**: Scrollbar appears on hover and while scrolling
- 🖱️ **Draggable**: Click and drag the thumb for smooth scrolling
- 📱 **Responsive**: Automatically calculates thumb size based on content
- 🎨 **Customizable**: Easy to style with Tailwind classes
- ⚡ **Performant**: Uses ResizeObserver and optimized event handlers

## Usage

### Basic Example

```tsx
import { CustomScrollbar } from '@/components/ui/CustomScrollbar';

function MyComponent() {
  return (
    <CustomScrollbar className="h-96">
      <div>Your scrollable content here...</div>
    </CustomScrollbar>
  );
}
```

### With Custom Styling

```tsx
<CustomScrollbar 
  className="h-screen bg-black"
  thumbClassName="bg-green-500 hover:bg-green-400"
>
  <div>Content...</div>
</CustomScrollbar>
```

### Always Visible Scrollbar

```tsx
<CustomScrollbar showOnHover={false}>
  <div>Content with always-visible scrollbar...</div>
</CustomScrollbar>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | required | The scrollable content |
| `className` | `string` | `undefined` | Classes for the scroll container |
| `thumbClassName` | `string` | `undefined` | Classes for the scrollbar thumb |
| `showOnHover` | `boolean` | `true` | Whether to show scrollbar only on hover |

## Styling

The component uses these default styles for the thumb:
- Width: `8px` (w-2)
- Background: `rgba(255, 255, 255, 0.3)` with hover at `0.5`
- Border radius: `8px` (rounded-lg)
- Position: Absolute, right-aligned

You can override these with the `thumbClassName` prop:

```tsx
<CustomScrollbar thumbClassName="w-3 bg-blue-500/40 hover:bg-blue-500/60 rounded-full">
  {/* content */}
</CustomScrollbar>
```

## How It Works

1. **Native scrollbar is hidden** using CSS (`scrollbar-width: none`)
2. **Custom thumb is rendered** as an absolutely positioned overlay
3. **Scroll position is tracked** and thumb position is calculated proportionally
4. **Mouse events** handle dragging and track clicking
5. **ResizeObserver** updates scrollbar when content size changes

## Examples in the App

The CustomScrollbar is used in:
- **LeftSidebar**: For the playlist list
- **QueuePanel**: For the queue items
- **HomePage**: For the main content area

## Browser Support

Works in all modern browsers that support:
- ResizeObserver
- CSS `scrollbar-width` property
- Flexbox and absolute positioning
