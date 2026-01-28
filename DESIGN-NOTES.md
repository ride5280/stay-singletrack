# Design Research: Modern Trail/Outdoor Apps

Research notes on what makes trail apps feel polished and modern.

## Apps Analyzed
- **Strava** - Activity tracking, segments, social
- **AllTrails** - Trail discovery, reviews, offline maps
- **Komoot** - Route planning, turn-by-turn
- **OnX Backcountry** - Offroad maps, layers, conditions

---

## Key UI Patterns

### 1. **Map-First, But Not Map-Only**
- Map is central but not the whole experience
- List/card views available alongside map
- Quick toggle between views (segmented control, not buried in menu)
- **AllTrails**: Bottom sheet with trail cards that slides up over map
- **Strava**: Tab-based navigation between map/list/segments

### 2. **Progressive Disclosure**
- Show summary first, details on demand
- Trail cards show: name, condition indicator, key stat (distance/difficulty)
- Tap/click reveals full details in modal or dedicated page
- Avoid overwhelming users with all data upfront

### 3. **Visual Hierarchy with Color**
- Condition/status is primary visual cue
- Color-coded trails on map (red/yellow/green)
- Badges/pills with semantic colors
- **OnX**: Great use of condition indicators with colored dots

### 4. **Modern Filter UX**
- **AllTrails**: Chip-based filters that are easily toggled
- Filter bar that's always visible, not hidden in dropdown
- Active filters shown as pills that can be dismissed
- Quick presets: "Show rideable only" button
- Number of results updates live as filters change

### 5. **Cards, Not Just Lists**
- Trail cards with visual hierarchy
- Key info at a glance: name, distance, elevation, condition
- Mini-map preview or hero image
- Subtle shadows and rounded corners
- Hover states that feel interactive

### 6. **Header/Nav Design**
- Clean, minimal header
- Logo/branding left, key actions right
- Search prominently placed (many apps have search in header)
- Dark headers over light content (or vice versa for contrast)
- **Strava**: Orange accent color, clean iconography
- **Komoot**: Rounded avatar, simple actions

### 7. **Loading States**
- Skeleton screens instead of spinners where possible
- Subtle shimmer animations
- Progress indicators for multi-step loads
- Never show empty containers without explanation

### 8. **Micro-interactions**
- Button hover/active states
- Smooth transitions between views
- Trail line highlighting on hover
- Toast notifications for actions (report submitted, etc.)
- Pull-to-refresh patterns

### 9. **Dark Mode Done Right**
- Not just inverted colors
- Reduced contrast for less eye strain
- Elevated surfaces slightly lighter (not just #000)
- Map tiles match theme (dark map for dark mode)
- Accent colors may need adjustment for contrast

### 10. **Mobile-First Responsive**
- Bottom sheets on mobile for details
- Floating action buttons
- Swipe gestures
- Touch targets at least 44px
- Full-bleed maps on small screens

---

## Color Palette Observations

### Strava
- Primary: Orange (#FC4C02)
- Background: White/Light Gray
- Success: Green
- Clean, energetic feel

### AllTrails
- Primary: Green (#4CAF50 family)
- Earthy tones: browns, greens
- Nature-inspired palette

### Komoot
- Primary: Green (#6AAA14)
- Clean whites, subtle grays
- Outdoor/adventure feel

### OnX
- Primary: Orange/Red accents
- Dark backgrounds for pro feel
- High contrast for outdoor visibility

---

## Recommendations for Stay Singletrack

### Immediate Wins
1. **Replace header emoji with icon** - Use Bike icon from Lucide
2. **Add chip-based condition filters** - More tappable than checkboxes
3. **Trail cards need visual lift** - Add shadows, better spacing
4. **Theme toggle in header** - Sun/Moon icons

### Medium Effort
1. **Bottom sheet on mobile** - Slide up trail list over map
2. **Search bar in header** - Quick trail search
3. **Skeleton loading states** - For trail cards
4. **Hover states on trails** - Visual feedback

### Polish Items
1. **Transitions between views** - Fade/slide animations
2. **Toast notifications** - Report submitted feedback
3. **Keyboard navigation** - Accessibility
4. **Empty states** - When no trails match filters

---

## Icon Recommendations (Lucide)

| Current Emoji | Lucide Icon | Usage |
|---------------|-------------|-------|
| 🚵 | `Bike` | App logo/header |
| 🟢/🟡/🔴 | `Circle` with fill | Condition indicators |
| 🪨 | `Mountain` | Soil/terrain |
| ☀️ | `Sun` | Aspect/sun exposure |
| ⛰️ | `MountainSnow` or `TrendingUp` | Elevation |
| 🌧️ | `CloudRain` | Precipitation |
| 🔍 | `Search` | Search/not found |
| 🚧 | `Construction` | Error/unavailable |
| 🙏 | `ThumbsUp` | Thanks/success |
| 🏜️ | `Sun` | Dry condition |
| 👌 | `CheckCircle` | Tacky/perfect |
| 💧 | `Droplets` | Muddy condition |
| ❄️ | `Snowflake` | Snow condition |
| ← | `ArrowLeft` | Back navigation |
| Filter icon | `SlidersHorizontal` or `Filter` | Filters |
| List icon | `List` | List view |
| Map icon | `Map` | Map view |

---

## Typography Notes

- Headers: Bold, larger size for trail names
- Body: Regular weight, good line height
- Stats/numbers: Tabular numbers if available, or monospace
- Subtle use of gray for secondary info
- Font pairing: Geist Sans works well (already in use)

---

## Final Thoughts

The goal is to feel like a **modern outdoor app**, not a "developer made a map".

Key principles:
1. **Visual hierarchy** - Guide the eye
2. **Consistency** - Same patterns throughout
3. **Feedback** - Every action has a response
4. **Accessibility** - Works for everyone
5. **Delight** - Small touches that surprise

Current state is functional but feels utilitarian. Adding polish through:
- Better spacing and typography
- Smooth transitions
- Consistent iconography
- Light/dark mode support
- Loading states

Will transform it from "map with data" to "trail conditions app".
