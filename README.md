# Rosa Miniporto

Text-to-3D floor plan generator with interactive visualization and budget estimation. Convert natural language descriptions into measured, interactive 3D floor plans.

## Overview

Rosa Miniporto is a web-based application that transforms user descriptions into a JSON layout, which is then rendered into an interactive 3D model. Users only need to provide a description as input (e.g., "3 bedroom, 1 bathroom, 1 kitchen, 1200 sqft total area"), and the system will respond with an accurate interactive model complete with a detailed construction budget breakdown.

### Key Features

- **AI-Powered Layout Generation**: Leverages Google Gemini 3 to output a custom schema (future development will explore model decoupling).
- **Interactive 3D Visualization**: Real-time visualization powered by Three.js and React Three Fiber.
- **Construction Animation**: Simple animated sequences for building construction.
- **Dimension Rendering**: Each space features its respective metric system (meters and sqft).
- **Budget Calculator**: Automated budget approximation based on material, labor, and furniture costs.
- **PDF Export**: Ability to export data and layouts to PDF.
- **Responsive Design**: Works flawlessly on desktops, tablets, and smartphones.

## Tech Stack

```
Frontend:        Next 16.2.4 + TypeScript
3D Rendering:    Three.js + @react-three/fiber + @react-three/drei
AI Backend:      Google Gemini 3 Flash Preview API
Styling:         Tailwind CSS
PDF Export:      jsPDF + html2canvas
Icons:           Phosphor Icons
Deployment:      Vercel
```

## How It Works

### 1. Input Description
Users input a spatial description in natural language. Valid examples include:
- "3 bedroom apartment, 1200 sqft, open kitchen and living room"
- "Small office: reception, 2 private offices, conference room, 800 sqft"
- "Modern loft, 1 bed, living area, kitchen combo, 600 sqft"

### 2. AI Processing
The description is sent to the Google Gemini API with a schema-based structured output. The model generates a JSON containing:
- Room array (type, area, dimensions, coordinates)
- Total area
- Overall layout dimensions
- Layout notes

### 3. 3D Visualization
The layout is rendered using Three.js with:
- Floor meshes color-coded by room type
- Wall rendering with realistic thickness
- Dimension lines with tick marks
- Orthographic-style labeling
- Interactive orbit controls

### 4. Budget Estimation
The system calculates costs based on a specific model:
- **Material**: $/sqft per room type
- **Labor**: $/sqft per room type
- **Furniture**: Flat rate per room type
- **Contingency**: 15% of the total

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Google Gemini API key (free tier available)

### Setup

```bash
# Clone or setup project
cd rosa-miniporto

# Install dependencies
npm install

# Setup environment variables
echo "NEXT_PUBLIC_GOOGLE_API_KEY=your_api_key_here" > .env.local

# Run development server
npm run dev

# Open browser
# Navigate to http://localhost:3000
```

Get a free API key at: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)

## Project Structure

```
rosa-miniporto/
├── pages/
│   ├── api/
│   │   └── generate/
│   │           floor-plan/       # Target for further development
│   │               └──route.ts           # Gemini API integration
│   ├── index.tsx                         
│   └── _app.tsx
├── components/
│   ├── FloorPlanViewer.tsx       # 3D canvas + visualization
│   ├── BudgetBreakdown.tsx       # Cost table + PDF export
│   └── TextInput.tsx             # Prompt input + examples
├── utils/
│   ├── budgetCalculator.ts       # Cost calculations
│   └── roomColors.ts             # Color scheme
├── types/
│   └── index.ts                  # TypeScript interfaces
├── public/
├── styles/
│   └── globals.css
└── package.json
```

## API Integration

### Endpoint: `/api/generateFloorPlan`

**Method**: POST  
**Content-Type**: application/json

#### Request
```json
{
  "description": "3 bedroom apartment, 1200 sqft, 2 bathrooms, open kitchen"
}
```

#### Response
```json
{
  "rooms": [
    {
      "type": "bedroom",
      "area": 120,
      "width": 3.5,
      "height": 3.2,
      "x": 0,
      "y": 0
    }
  ],
  "totalArea": 1200,
  "totalWidth": 12.5,
  "totalHeight": 10.8,
  "notes": "Layout with separate bedrooms and open living area"
}
```

#### Errors
- `400`: Empty or invalid description
- `500`: Gemini API error or invalid response format

## Room Types & Specifications

### Supported Room Types
- **bedroom**: Standard sleeping room (100-150 sqft typical)
- **kitchen**: Cooking area (100-250 sqft)
- **bathroom**: Restroom (40-80 sqft)
- **living_room**: Main living space (150-400 sqft)
- **office**: Work/study space (100-150 sqft)
- **hallway**: Circulation space (variable)
- **garage**: Vehicle storage (200-400 sqft)
- **carport**: Covered parking (100-200 sqft)
- **laundry**: Utility space (40-80 sqft)

### Dimension Constraints (enforced by Gemini)
```
Bedroom:    3-4m wide × 3-4m deep (min 9-12 sqm)
Kitchen:    3-4m wide × 3-5m deep (min 10-20 sqm)
Bathroom:   1.5-2.5m wide × 2-3m deep (min 4-7 sqm)
Living:     4-7m wide × 5-8m deep (min 20-50 sqm)
```

## Cost Model

Default cost structure per room type:

```typescript
{
  bedroom: { materials: 80, labor: 40, furniture: 800 },      // $/sqft + fixed
  kitchen: { materials: 150, labor: 100, furniture: 2500 },
  bathroom: { materials: 120, labor: 80, furniture: 1200 },
  living_room: { materials: 60, labor: 30, furniture: 1500 },
  office: { materials: 70, labor: 35, furniture: 1000 },
  hallway: { materials: 40, labor: 20, furniture: 0 }
}
```

Calculation:
```
Room Cost = (Area × Material Rate) + (Area × Labor Rate) + Furniture Rate
Total = Sum of all rooms + 15% contingency
```

## 3D Visualization Details

### Camera
- Isometric-style perspective (30° FOV)
- Auto-positioned based on layout bounds
- Orbit controls (left-click pan, right-click rotate)
- Smooth damping factor (0.05)

### Rendering
- Ambient + directional + hemisphere lighting
- Contact shadows for depth perception
- Grid floor with infinite pattern
- Wall thickness: 15cm (realistic)
- Wall height: 2.4m (8 feet standard)

### Performance
- 60 FPS target
- Optimized geometry updates
- Suspense boundary for lazy loading
- Responsive shadow mapping

## Animation

### Building Animation
When the floor plan is first rendered:
1. **Floors** scale up from the center point (0.8s per room)
2. **Walls** grow from the bottom up (parallel with the floor)
3. **Labels** fade in with a 30% delay
4. **Dimensions** appear last (60% delay)
5. **Stagger**: Each room offset by `(i / totalRooms) × duration`

Total animation time: `0.4s × number_of_rooms`

Controls are disabled during animation for a better UX.

### Empty State
When no layout is present:
- Gradient background (slate → blue → slate)
- Centered icon + helpful message
- Feature badges (3D, Measured, Animated)
- Prompt examples for guidance

## Usage Examples

### Example 1: Standard Apartment
```
Input: "3 bedroom, 2 bathroom apartment, 1200 sqft, open kitchen"

Output:
- 3 bedrooms (~120 sqft each)
- 2 bathrooms (~50 sqft each)
- 1 kitchen (~180 sqft)
- 1 living room (~300 sqft)
- 1 hallway (~80 sqft)

Total: 1200 sqft
Budget: ~$45,000 (with contingency)
```

### Example 2: Office Space
```
Input: "Small office, 800 sqft: reception area, 2 private offices, conference room"

Output:
- Reception: 100 sqft
- 2 offices: 120 sqft each
- Conference: 200 sqft
- Hallway: 160 sqft

Total: 800 sqft
Budget: ~$28,000 (with contingency)
```

### Example 3: Modern Loft
```
Input: "Modern loft, 600 sqft, 1 bed, kitchen living combo, bathroom"

Output:
- Bedroom: 120 sqft
- Kitchen/Living: 350 sqft
- Bathroom: 60 sqft
- Hallway: 70 sqft

Total: 600 sqft
Budget: ~$20,000 (with contingency)
```

## Customization

### Changing the Color Scheme
Edit `utils/roomColors.ts`:
```typescript
const ROOM_COLORS = {
    bedroom: '#your_hex_color',
    kitchen: '#your_hex_color',
    // ... room types
};
```

### Changing the Cost Model
Edit `utils/budgetCalculator.ts`:
```typescript
const COST_MODEL = {
    bedroom: { materials: YOUR_VALUE, labor: YOUR_VALUE, furniture: YOUR_VALUE },
    // ...
};
```

### Changing Animation Speed
Edit `components/FloorPlanViewer.tsx`:
```typescript
const ANIMATION_DURATION = 0.8;  // seconds per room (change value)
```

### Changing the Empty State
Edit the `EmptyState()` section in `FloorPlanViewer.tsx` to customize the text, icon, or styling.

## Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variable
vercel env add NEXT_PUBLIC_GOOGLE_API_KEY
# Paste API key when prompted

# Deploy to production
vercel --prod
```

Environment variables will be auto-loaded from the Vercel dashboard.

## Browser Support

| Browser | Support | Status |
|---------|---------|--------|
| Chrome | ✅ | Full (tested) |
| Edge | ✅ | Full |
| Firefox | ✅ | Full (tested) |
| Safari | ❌ | N/A (untested) |
| Mobile (iOS) | ❌ | N/A(untested) |
| Mobile (Android) | ✅ | Full |

WebGL 2.0 required. Most modern devices are supported.

## Troubleshooting

### Floor plan not rendering
**Solution**:
1. Open browser console (F12)
2. Check for error messages
3. Verify rooms data with `console.table(floorPlan.rooms)`
4. Ensure all numerical values are > 0

### Animation not starting
**Solution**:
1. Check `isFirstLoad` state
2. Verify `requestAnimationFrame` support in the browser
3. Try clearing cache and reloading

### Gemini API error
**Solution**:
1. Verify the API key in `.env.local`
2. Check quota usage at console.cloud.google.com
3. Ensure the description is detailed enough (min 3-5 words)

### Overlapping layout
**Solution**:
- This is a limitation of Gemini generation
- Try regenerating with a more specific description
- Example: "3 separate bedrooms, not combined" works better than "3 bedrooms"

## Performance Metrics

- **Load Time**: ~800ms (including Gemini API)
- **First Paint**: <400ms
- **3D Render**: 60 FPS
- **Animation**: 60 FPS (smooth)
- **Bundle Size**: ~2.3MB gzipped

## API Limits

**Google Gemini Free Tier**:
- 5 RPM (Requests Per Minute)
- 20 RPD (Requests Per Day T_T)
- Unlimited monthly usage (free)
- Response time: <5s average

For higher production volume, upgrade to the paid tier.

## Known Limitations

1. **Layout overlap**: Gemini occasionally generates overlapping layouts that are blocked by the validator. Solution: regenerate with finer description details.
2. **Irregular shapes**: Rectangular rooms only (no curved/angled rooms) due to naive JSON layout generation.
3. **Vertical levels**: Single floor only (no multi-story support for now T_T).
4. **Furniture placement**: Interior furniture is not rendered (Budgeting works by approximation only).
5. **Real-time collab**: Single-user only (no shared editing).

## Roadmap

- [ ] Multi-floor support (vertical levels)
- [ ] Custom color per room
- [ ] Furniture library + 3D placement
- [ ] Real-time collaborative editing
- [ ] Cost estimation refinement (regional prices)
- [ ] 2D blueprint export (CAD format)
- [ ] AR preview (view in physical space)
- [ ] Mobile app version

## Contributing

Contributions are welcome. Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Contact & Support

- **Issues**: GitHub Issues page
- **Discussions**: GitHub Discussions

## Acknowledgments

- Google Gemini API for AI generation
- Three.js community for 3D rendering
- React Three Fiber for React integration
- Vercel for seamless deployment

---

**Rosa Miniporto** — Making space planning as easy as describing your vision.

Made with ❤️ using TypeScript, Three.js, and Google AI.