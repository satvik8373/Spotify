# Playlist Card Fixes - Exact Figma Match

## Changes Made

### 1. Fixed Padding & Positioning
**Before:**
- Generic padding: `p-3` (12px)
- Inconsistent spacing

**After:**
- Exact Figma padding: `p-4` (16px)
- Matches 224px card width specification
- Album art properly positioned with correct margins

### 2. Fixed Title Typography
**Before:**
- Font size: `text-base` (16px)
- Generic tracking: `tracking-tight`
- Wrong line height

**After:**
- Font size: `text-[20px]` (exact Figma spec)
- Letter spacing: `tracking-[0.6px]` (exact Figma spec)
- Line height: `leading-[25.3px]` (exact Figma spec)
- Font weight: `font-bold` (700)

### 3. Fixed Description Typography
**Before:**
- Font size: `text-sm` (14px)
- Color: `#a7a7a7`
- Generic line height

**After:**
- Font size: `text-[18px]` (exact Figma spec)
- Color: `#b3b3b3` (exact Figma spec)
- Line height: `leading-[22.77px]` (exact Figma spec)
- Font weight: `font-normal` (450 Book weight)

### 4. Fixed Play Button
**Before:**
- Size: `w-12 h-12` (48px)
- Color: `#1ed760`

**After:**
- Size: `w-[62px] h-[62px]` (exact Figma spec)
- Color: `#65d36e` (exact Figma green)
- Hover: `#3be477`
- Scale on hover: `1.06`
- Proper shadow: `shadow-[0_8px_8px_rgba(0,0,0,0.3)]`

### 5. Added Horizontal Swipe
**New Feature:**
- Horizontal scrollable container
- Touch-friendly swipe on mobile
- Hidden scrollbar for clean look
- Fixed card width: `224px`
- Proper gap between cards: `24px` (ga