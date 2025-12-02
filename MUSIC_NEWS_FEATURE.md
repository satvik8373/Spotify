# Music News & Latest Releases - Minimousel

## Overview
A clean, minimalist auto-sliding carousel showcasing latest music releases and trending songs from real music sources (JioSaavn API) with elegant dot navigation.

## Design P

- **Elegant**: Smooth transi
- **Intuitive**: Dot swiper navigation, touch-friendly
- **Content-first**: Large images with minimal text overlay

## Features

### 1. Clean Minimalist Design
- **No top text/headers**: Content speaks for itself
- **Bottom-aligned info**: Title and category at bottom
- **Gradient overlay**: Ensures text readability
- **Large aspect ratio**: 2:1 on mobile, 3:1 on desktop
- **Rounded corners**: Modern, polished look

### 2. Dot Swiper Navigation
- **Centered dots**: Clean dot indicators at bottom center
- **Active indicator**: Elongated white dot for current slide
- **Clickable**: Tap any dot to jump to that slide
- **Smooth transitions**: Animated dot changes


### 3. Real Music Data
- **New Releases**: Latest songs from JioSaavn (5 items)
- **Trending Songs**: Currently trending music (5 items)
- **Combined carousel**: 10 total slides rotatin
mation
- **Category badges*

### 4. Touch & Swipe Friendly
- **Swipe left/right**: Navigate between slides
- **Touch optimized**: Smooth touch interactions
- **Auto-play**: Changes every 4 seconds
 auto-play
- **Resume after inter seconds

### 5. Interactive
- **Click to play**: Tap carousel to play the song
esktop)
- **Smooth animatons
- **Progress bar**: Thin line showing time until next slide

nts

### Layout
```
┌───────────────────────
│                                     │
│         [Large Album Art   │
│                       
│  ┌────────────│
    │  │
│  │ Song Title     │  │

│  └───────  │
│         ● ━━━ ● ● ● ●        │
│         ▓▓▓▓░░░░░░░░░░             │
└─────────────────────────┘
```

### Color Scheme
- **Background**: Full-bleed album ork
- **Overlay**: Black gradient (95% a
- **Text**: White with high c
- **Badge**: White/10 with backdrop blur
s
- **Progress**ground

ls

### Component: MusicNewsCarousel
**Location**: `frontend/src/components/Mus

**Data Sources**:
tems)
- `indianTs)

**State Management**:
- Current slide index
- Auto-play status
- Pause state
- Touch coordinates for swipe 

**Timing**:
- Auto-advance: 4 secondsper slide
- Resume delay: 8 seconds after manual action
- Transition duration: 500ms for 
- Progress animation: 4 near


carouselm ation froaylist cres
- Plavoritemark fbooky
- Save/nalithare functio
- Stent typesconces for preferenPI
- User Spotify An with egratiofeeds
- IntSS ws from Rusic nents
- Add mmeture Enhance
## Fuly
riender feen readcreas
- St arly hiriend-fch
- Tountrast text- High cosupport
avigation ard ns
- Keyboonbuttls on dot beA lality
- ARIccessibie

## Aim at a ttionnsi image tra Single
-ted)eras (GPU acceltionimag
- CSS anent handlinch evd touOptimizeunt
- on unmorvals nup of intes
- Cleact hookReath  winderst re-reienfic
- Efge loading
- Lazy imaizationsance Optim## Perform.

c dataal musilays reispd dches anetatically f Automine.ed when onlsplay dige,d to HomePa
Addeionegrat# Int

#sktop)to-play (de auPause**:  **Hover slide
5.ificpecump to s Click**: J4. **Dotlide
Previous s*: t*gh RiSwipe. **e
3 Next slid Left**:**Swipent song
2. the currePlays lick/Tap**: 1. **Cions
teract In###view

ic ide cinemat3/1] - W**: aspect-[ktop
- **Desanced ratio] - Bal/2spect-[5 ablet**:e
- **Taal spacverticMore ] - t-[2/1 aspec*:e*bil
- **Montse Breakpoinsiv### Respo