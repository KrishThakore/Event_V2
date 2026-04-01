# Light Theme Gradient Options for Dashboard Backgrounds

## Current Gradient (Option 1)
```css
bg-gradient-to-br from-purple-50 via-violet-50 to-orange-50
```
- Purple → Violet → Orange transition
- Warm and inviting
- Excellent contrast with white cards

---

## Option 2: Sky to Mint
```css
bg-gradient-to-br from-blue-50 via-cyan-50 to-emerald-50
```
- Blue → Cyan → Emerald transition  
- Cool and refreshing
- Professional and modern
- Great contrast with purple accents

---

## Option 3: Lavender to Rose
```css
bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50
```
- Purple → Pink → Rose transition
- Soft and elegant
- Complements purple branding
- Warm and sophisticated

---

## Option 4: Sage to Seafoam
```css
bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50
```
- Green → Teal → Cyan transition
- Natural and calming
- Professional appearance
- Excellent readability

---

## Option 5: Peach to Coral
```css
bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50
```
- Orange → Amber → Yellow transition
- Warm and energetic
- Bright and optimistic
- Good contrast with dark text

---

## Option 6: Indigo to Purple
```css
bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50
```
- Indigo → Purple → Pink transition
- Deep and professional
- Matches purple branding perfectly
- Sophisticated appearance

---

## Option 7: Pearl to Lavender
```css
bg-gradient-to-br from-gray-50 via-slate-50 to-purple-50
```
- Gray → Slate → Purple transition
- Neutral and elegant
- Subtle and professional
- Excellent for accessibility

---

## Option 8: Sky to Lavender
```css
bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50
```
- Blue → Indigo → Purple transition
- Cool and professional
- Harmonious with purple branding
- Modern tech aesthetic

---

## Usage Instructions

To use any of these gradients, update the background class in:
- `app/(dashboard)/admin-dashboard/layout.tsx` (line 36)
- `app/(dashboard)/organizer-dashboard/layout.tsx` (line 37)

Replace:
```css
bg-gradient-to-br from-purple-50 via-violet-50 to-orange-50
```

With your chosen option.

## Compatibility Notes

All gradients are:
- ✅ **Light theme** - Uses only light color variants (50)
- ✅ **High contrast** - Works well with white cards and dark text
- ✅ **Navbar compatible** - Complements existing purple/indigo sidebar
- ✅ **Professional** - Suitable for business application
- ✅ **Accessible** - Meets contrast requirements

## Recommended Options

**For Purple Branding:** Options 1, 3, 6, 8
**For Professional Look:** Options 2, 4, 7  
**For Warm Feel:** Options 1, 3, 5
**For Cool Feel:** Options 2, 4, 8
