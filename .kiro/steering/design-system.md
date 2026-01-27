---
inclusion: always
---

# Mavrixfy Design System Rules

## Project Overview
Mavrixfy is a React-based music streaming application built with TypeScript, Vite, and Tailwind CSS. The design follows Spotify's visual language with a dark-first approach and mobile-optimized experience.

## Design System Structure

### 1. Token Definitions

**Color System (CSS Variables)**
```css
/* Dark Theme (Primary) */
--background: 0 0% 7.1%;        /* #121212 - Spotify main background */
--foreground: 0 0% 100%;        /* #FFFFFF - Primary text */
--card: 0 0% 9.4%;              /* #181818 - Elevated surfaces */
--primary: 141 73% 42%;         /* #1DB954 - Spotify Green */
--secondary: 0 0% 9.4%;         /* #181818 - Secondary surfaces */
--muted-foreground: 0 0% 70%;   /* #B3B3B3 - Secondary text */
--border: 0 0% 15.7%;           /* #282828 - Borders */
```

**Typography Scale**
- Font Family: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif`
- Font Smoothing: `-webkit-font-smoothing: antialiased`
- Letter Spacing: `-0.01em` for playback controls

**Spacing System**
- Uses Tailwind's default spacing scale (0.25rem increments)
- Container padding: `2rem`
- Mobile safe areas: `env(safe-area-inset-*)`

**Border Radius**
```css
--radius: 0.5rem;
lg: var(--radius);
md: calc(var(--radius) - 2px);
sm: calc(var(--radius) - 4px);
```

### 2. Component Library

**Location**: `frontend/src/components/`

**Architecture**: 
- Radix UI primitives for accessibility
- shadcn/ui component system
- Class Variance Authority (CVA) for variant management
- Compound component patterns

**Key Components**:
```typescript
// Button variants
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      }
    }
  }
);
```

### 3. Frameworks & Libraries

**Core Stack**:
- **React 18** with TypeScript
- **Vite** for build system and development
- **Tailwind CSS** for styling
- **Radix UI** for accessible primitives
- **Zustand** for state management
- **React Router DOM** for routing

**UI Libraries**:
- shadcn/ui components
- Framer Motion for animations
- Lucide React for icons
- React Icons for additional icons

**Build Configuration**:
```typescript
// Vite config optimizations
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom', 'react-router-dom'],
        ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        utils: ['lodash', 'clsx', 'class-variance-authority']
      }
    }
  }
}
```

### 4. Asset Management

**Images**: 
- Cloudinary CDN for dynamic image optimization
- WebP/AVIF format support
- Responsive image loading with `OptimizedImage` component

**Icons**:
- Lucide React (primary icon library)
- React Icons for additional icons
- SVG icons stored in components

**Audio**:
- Howler.js for audio playback
- Network-only caching strategy for audio files
- JioSaavn CDN integration

### 5. Icon System

**Primary**: Lucide React
```typescript
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
```

**Secondary**: React Icons
```typescript
import { FaSpotify, FaHeart } from 'react-icons/fa';
```

**Usage Pattern**:
```typescript
<Button size="icon" variant="ghost">
  <Play className="h-4 w-4" />
</Button>
```

### 6. Styling Approach

**Primary**: Tailwind CSS with CSS Variables
- Utility-first approach
- Custom CSS variables for theming
- Component-specific CSS files when needed

**Custom Utilities**:
```css
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

**Animation Strategy**:
- Minimal animations for performance
- Specific animations allowed for modals, dialogs, and player
- Instant page loading with selective animations

### 7. Project Structure

```
frontend/src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui base components
│   ├── playlist/       # Feature-specific components
│   └── skeletons/      # Loading states
├── pages/              # Route components
├── hooks/              # Custom React hooks
├── stores/             # Zustand state stores
├── services/           # API and business logic
├── lib/                # Utilities and configurations
├── styles/             # Global CSS files
└── types/              # TypeScript definitions
```

## Figma Integration Guidelines

### Design Token Mapping
- Map Figma color tokens to CSS variables
- Use Tailwind utility classes over custom CSS
- Maintain 1:1 visual parity with designs

### Component Patterns
```typescript
// Preferred component structure
interface ComponentProps {
  variant?: 'default' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Component = ({ variant = 'default', size = 'md', className, ...props }: ComponentProps) => {
  return (
    <div className={cn(componentVariants({ variant, size }), className)} {...props} />
  );
};
```

### Responsive Design
- Mobile-first approach
- Breakpoints: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`
- Safe area support for mobile devices

### Performance Considerations
- Lazy load images with `OptimizedImage`
- Minimize bundle size with code splitting
- Use CSS-in-JS sparingly, prefer Tailwind utilities
- Implement skeleton loading states

### Accessibility Requirements
- Use Radix UI primitives for keyboard navigation
- Maintain proper color contrast ratios
- Include focus indicators
- Support screen readers with proper ARIA labels

## Code Generation Rules

1. **Always use existing components** from `@/components/ui/` before creating new ones
2. **Follow the established patterns** for variant management with CVA
3. **Use Tailwind utilities** instead of custom CSS when possible
4. **Implement proper TypeScript interfaces** for all component props
5. **Include responsive design** considerations for mobile devices
6. **Maintain the Spotify-like visual aesthetic** with dark theme priority
7. **Use the established color system** and avoid hardcoded colors
8. **Implement proper loading states** with skeleton components
9. **Follow the project's file structure** and naming conventions
10. **Ensure accessibility** with proper ARIA labels and keyboard navigation