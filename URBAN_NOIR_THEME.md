# Urban Noir Theme - Implementation Guide

## 🎭 Theme Overview

The Paper2Proto application has been transformed with an **Urban Noir** aesthetic inspired by:
- **Film Noir** - Classic 1940s-50s detective movies with high contrast lighting
- **Jazz Clubs** - Smoky venues with warm amber lighting and dark atmospheres
- **Detective Mystery** - Evidence boards, case files, and investigative work
- **Street Style** - Long coats, fedoras, neon signs, and rain-slicked streets

## 🎨 Color Palette

### Primary Colors
- **Deep Black**: `#0a0a0a` - Main background, like dark city streets
- **Noir Darker**: `#1a1410` - Secondary background with brown undertones
- **Noir Dark**: `#28231e` - Elevated surfaces, panels
- **Amber Gold**: `#d4af37` - Primary accent, like street lamps and neon signs
- **Amber Dark**: `#b8942d` - Darker amber for gradients
- **Cigarette Smoke**: `#a49b8f` - Dimmed text
- **Aged Paper**: `#d4cfc4` - Primary text color
- **Bright Cream**: `#e8e3d8` - Highlighted text

### Accent Colors
- **Success Green**: `#4caf50` / `#81c784` - Status indicators
- **Error Red**: `#d32f2f` / `#e57373` - Errors and warnings

## 🎬 Visual Effects

### Film Grain
Subtle repeating linear gradient overlay adds vintage film texture:
```css
background-image: repeating-linear-gradient(
  0deg,
  transparent,
  transparent 2px,
  rgba(0, 0, 0, 0.05) 2px,
  rgba(0, 0, 0, 0.05) 4px
);
opacity: 0.2-0.3;
```

### Spotlight/Vignette
Radial gradients create ambient lighting effects:
```css
background: radial-gradient(
  ellipse at center,
  rgba(212, 175, 55, 0.04) 0%,
  transparent 50%
);
```

### Amber Glow
Box shadows with amber color create neon sign effects:
```css
box-shadow:
  0 0 20px rgba(212, 175, 55, 0.3),
  inset 0 0 40px rgba(212, 175, 55, 0.05);
```

### Text Shadows
Subtle glows on important text:
```css
text-shadow: 0 0 10px rgba(212, 175, 55, 0.3);
```

## 📐 Design Elements

### Typography
- **Serif Font**: Georgia, Times New Roman - Classic noir aesthetic
- **Monospace**: Courier New - For code and technical elements
- **Sans-serif**: Used sparingly for UI labels

### Borders & Shapes
- **Sharp Corners**: `border-radius: 2px` - Angular, noir style (not rounded)
- **Amber Borders**: `1px solid rgba(212, 175, 55, 0.3)` - Subtle accent lines
- **Accent Bars**: 2-3px solid amber bars on left of elements

### Buttons & Interactive Elements
- **Gradient Backgrounds**: Linear gradients from amber to darker amber
- **Border Styling**: 1px borders with amber tones
- **Hover Effects**: Increased glow, slight translation
- **Text Transform**: UPPERCASE with increased letter-spacing

### Shadows
- **Deep Shadows**: `0 4px 16px rgba(0, 0, 0, 0.8)` - Strong depth
- **Amber Glows**: `0 0 12px rgba(212, 175, 55, 0.3)` - Neon effects
- **Inset Highlights**: `inset 0 1px 0 rgba(212, 175, 55, 0.1)` - Subtle dimension

## 🎯 Component Transformations

### Main App ([App.css](frontend/src/App.css))
- **Background**: Gradient from deep black to brown-black
- **Topbar**: Film noir title card style with amber branding
- **Landing**: Vintage poster aesthetic with spotlight effects
- **Upload Area**: Speakeasy entrance feel with dashed amber borders
- **Feature Cards**: Evidence file appearance with left accent bars
- **Chat Bubbles**: Handwritten notes (user) and typed documents (assistant)
- **Chat Input**: Typewriter aesthetic with inset shadows

### Code Viewer ([CodeViewerOverlay.css](frontend/src/CodeViewerOverlay.css))
- **Panel**: Examining evidence under desk lamp
- **Header**: Case file header with amber title
- **Tabs**: File folder tabs with amber active state
- **Code Blocks**: Vintage terminal with amber glow
- **Badges**: Evidence tags with amber backgrounds
- **Copy Button**: Uppercase label with amber hover

### Diagram Overlay ([DiagramOverlay.css](frontend/src/DiagramOverlay.css))
- **Canvas**: Cork board with red string connecting clues
- **Panel**: Detective's conspiracy board aesthetic
- **Header**: Case file header with amber accents
- **Detail Panel**: Investigator's notes with amber highlights
- **Connections**: Red string connecting evidence
- **Legend**: Case file metadata styling

### PDF Panel ([PdfPanel.css](frontend/src/PdfPanel.css))
- **Background**: Old document under lamplight
- **Header**: Case file tab appearance
- **PDF Canvas**: Yellowed paper effect with vignette
- **Highlights**: Yellow marker on evidence
- **Chunk Tags**: Evidence markers with amber background
- **Resize Handle**: Sliding partition with amber indicator

### Base Styles ([index.css](frontend/src/index.css))
- **CSS Variables**: Noir color palette defined
- **Body**: Dark gradient background with serif font
- **Scrollbars**: Amber-accented with smooth gradients
- **Selection**: Amber highlight effect
- **Focus States**: Amber outline with glow

## 🎨 Theme Consistency

### All Components Follow These Patterns:

1. **Color Temperature**: Warm amber tones (never cool blues)
2. **Contrast**: High contrast between dark and light elements
3. **Shadows**: Deep, dramatic shadows with amber glows
4. **Borders**: Subtle amber lines (never bright white)
5. **Gradients**: Always subtle, warm-toned
6. **Corners**: Sharp (2px radius max) for angular noir feel
7. **Fonts**: Serif for content, monospace for code/data
8. **Spacing**: Generous padding for dramatic presentation
9. **Animations**: Smooth but not too fast (0.2-0.3s)
10. **Overlays**: Dark with subtle amber accents

## 🎭 Thematic Elements

### Visual Metaphors
- **Topbar**: Film noir opening credits
- **Landing**: Movie poster / theater marquee
- **Upload Area**: Speakeasy entrance
- **Chat**: Detective's notes and case files
- **Code Viewer**: Evidence examination under desk lamp
- **Diagram**: Conspiracy board with connecting strings
- **PDF Panel**: Examining documents under lamplight
- **Buttons**: Neon signs and brass fixtures
- **Borders**: Amber street lights glow
- **Scrollbars**: Sliding partition or elevator door

### Atmospheric Details
- **Film grain** on major panels
- **Vignette effects** on scroll areas
- **Spotlight gradients** for focus
- **Cigarette smoke** color for dimmed text
- **Aged paper** color for readable text
- **Evidence tags** for citations
- **Typewriter** aesthetic for input

## 📊 Before & After Comparison

### Before (Futuristic Blue Theme)
- Cool blue accents (#6e9fff)
- Rounded corners (6-16px)
- Modern sans-serif fonts
- Soft glows and gradients
- Tech/sci-fi aesthetic
- Bright, digital feel

### After (Urban Noir Theme)
- Warm amber accents (#d4af37)
- Sharp corners (2px)
- Classic serif fonts (Georgia)
- Dramatic shadows and amber glows
- Vintage detective aesthetic
- Dark, mysterious atmosphere

## 🎬 Design Inspiration

The theme draws from:
- **Film Noir Classics**: The Maltese Falcon, Double Indemnity, The Third Man
- **Neo-Noir**: Blade Runner's rain-soaked streets and neon signs
- **Jazz Age**: 1920s-1940s speakeasies and jazz clubs
- **Detective Fiction**: Hard-boiled detective novels and case files
- **Urban Night**: City streets under amber street lamps
- **Vintage Typography**: 1940s newspaper and poster design

## 🚀 Usage Notes

### Functionality Unchanged
- **No logic changes** - Only visual styling updated
- **All features work** exactly as before
- **Responsive design** maintained across devices
- **Accessibility** preserved with high contrast

### Build Verification
```bash
cd frontend
npm run build
# ✅ Compiled successfully
# CSS increased by ~1.11 kB (acceptable for theme richness)
```

### Browser Compatibility
- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Mobile**: Responsive design maintained

## 🎨 Customization Guide

### Adjust Amber Intensity
Change opacity values in rgba():
```css
/* Subtle */
rgba(212, 175, 55, 0.1)

/* Medium */
rgba(212, 175, 55, 0.3)

/* Strong */
rgba(212, 175, 55, 0.6)
```

### Modify Film Grain
Adjust opacity in `::before` pseudo-elements:
```css
opacity: 0.2; /* Subtle grain */
opacity: 0.4; /* More visible */
```

### Change Background Darkness
Modify gradient endpoints:
```css
/* Darker */
background: linear-gradient(180deg, #050505 0%, #0a0805 100%);

/* Lighter */
background: linear-gradient(180deg, #151515 0%, #25201b 100%);
```

## 🎭 Final Notes

The Urban Noir theme transforms Paper2Proto into a vintage detective's workspace:
- Research papers become case files
- Code implementations are evidence under examination
- Diagrams are conspiracy boards with connecting strings
- PDFs are yellowed documents under lamplight
- The interface feels like working late in a 1940s detective office

The warm amber lighting, serif typography, dramatic shadows, and film grain create an immersive noir atmosphere while maintaining excellent readability and usability.

**The mystery awaits. The case is open. The evidence is ready for examination.** 🕵️‍♂️
