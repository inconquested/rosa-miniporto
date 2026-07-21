# Rosa Miniporto

Text-to-3D floor plan generator with interactive visualization and budget estimation. Convert a natural-language description into a measured, interactive 3D floor plan complete with a construction-budget breakdown.

## Overview

Rosa Miniporto turns a user description (e.g. *"3 bedroom apartment, 120 m², 2 bathrooms, open kitchen and living room"*) into a structured JSON layout, validates it against architectural rules, and renders it as an interactive 3D model with per-room dimensions and an approximate cost estimate.

### Key Features

- **AI-Powered Layout Generation** — Claude Opus 4.8, served through **Microsoft (Azure AI) Foundry**, produces a strict JSON floor-plan schema from a grid-based "hallway spine" system prompt.
- **Validate → Correct Pipeline** — a rules engine checks the generated layout (overlaps, adjacency, hallway connectivity); if it fails, a second Opus 4.8 pass corrects it before returning.
- **Interactive 3D Visualization** — real-time rendering with Three.js + React Three Fiber + drei (orbit controls, contact shadows, infinite grid).
- **Build Animation** — staggered per-room construction animation (floors scale up, walls grow, labels & dimensions fade in).
- **Metric Dimensions** — every room is measured in meters, with total area in square meters (m²).
- **Budget Calculator** — automated approximation from per-room material, labor, and furniture costs plus a 15% contingency.
- **Voice Input** — optional Web Speech API dictation for the prompt.
- **Responsive Design** — works across desktop, tablet, and mobile.

## Tech Stack

```
Framework:       Next.js 16 (App Router) + TypeScript
3D Rendering:    Three.js + @react-three/fiber + @react-three/drei
AI Backend:      Claude Opus 4.8 via Microsoft (Azure AI) Foundry (@anthropic-ai/foundry-sdk)
Validation:      Zod (schema/coercion) + custom architectural rules engine
Styling:         Tailwind CSS v4 + shadcn/radix-ui
Icons:           Phosphor Icons
Deployment:      Vercel
```

## How It Works

### 1. Input Description
Users type (or dictate) a spatial description. Examples:
- "3 bedroom apartment, 120 m², open kitchen and living room"
- "Small office: reception, 2 private offices, conference room, 80 m²"
- "Modern loft, 1 bed, living/kitchen combo, bathroom, 60 m²"

### 2. AI Processing (`lib/generation-orch.ts`)
The description is sent to Claude Opus 4.8 on Foundry with a schema-oriented system prompt. The model returns a JSON object containing a `rooms` array (type, area, width, height, x, y), overall dimensions, and layout notes. The response is parsed defensively (`jsonrepair`) and validated with a Zod schema.

### 3. Validation & Correction (`lib/validator-engine.ts`)
The layout is checked against professional rules: no overlaps, no floating rooms, and required hallway/adjacency connections. If any **error**-level rule fails, a second Opus 4.8 "correction" pass regenerates the `rooms` array. The API reports which provider/pass produced the final result.

### 4. 3D Visualization (`components/floor-plan-viewer.tsx`)
The layout is rendered with Three.js: color-coded floors, realistic wall thickness, dimension lines with tick marks, and orbit controls.

### 5. Budget Estimation (`lib/budget-calculator.ts`)
Costs are computed per room from a material/labor/furniture model plus a 15% contingency.

## Installation

### Prerequisites
- Node.js 18+
- npm
- A Microsoft (Azure AI) Foundry resource with a Claude Opus 4.8 deployment, plus its API key

### Setup

```bash
cd rosa-miniporto
npm install

# Environment variables (.env.local — git-ignored)
cat > .env.local <<'EOF'
ANTHROPIC_FOUNDRY_RESOURCE=your-foundry-resource-name
ANTHROPIC_FOUNDRY_API_KEY=your_api_key_here
ANTHROPIC_FOUNDRY_DEPLOYMENT=claude-opus-4-8
EOF

npm run dev
# open http://localhost:3000
```

The Foundry SDK builds the endpoint from the resource name as
`https://<resource>.services.ai.azure.com/anthropic/`. Alternatively set
`ANTHROPIC_FOUNDRY_BASE_URL` to a full endpoint instead of `ANTHROPIC_FOUNDRY_RESOURCE`
(the two are mutually exclusive).

## Project Structure

```
rosa-miniporto/
├── app/
│   ├── api/generate/floor-plan/route.ts  # POST endpoint → orchestration
│   ├── layout.tsx
│   ├── page.tsx                          # main UI (prompt input + viewer)
│   └── globals.css
├── components/
│   ├── floor-plan-viewer.tsx             # 3D canvas + analytics overlay
│   ├── LineWaves.tsx                     # animated empty-state background (OGL)
│   ├── theme-provider.tsx
│   ├── ui/                               # shadcn / radix primitives
│   └── viewer/
│       ├── empty-state.tsx
│       └── geometries/                   # room-box, wall, dimension-line, total-dimensions, constants
├── lib/
│   ├── generation-orch.ts                # Foundry / Opus 4.8 orchestration + correction
│   ├── validator-engine.ts               # architectural rules engine
│   ├── prompt.ts                         # system instruction + user-prompt builder
│   ├── budget-calculator.ts              # cost estimation
│   └── utils.ts
├── config/
│   └── llm.config.ts                     # model id + generation params
├── schema/
│   └── floor-plan.ts                     # Zod schema + shared types
├── types/
│   ├── index.ts
│   └── layout-rules.ts
└── package.json
```

## API Integration

### Endpoint: `POST /api/generate/floor-plan`

**Content-Type**: application/json

#### Request
```json
{ "description": "3 bedroom apartment, 120 m², 2 bathrooms, open kitchen" }
```

#### Response
```json
{
  "rooms": [
    { "type": "bedroom", "area": 15, "width": 3, "height": 5, "x": 0, "y": 0 }
  ],
  "totalArea": 90,
  "totalWidth": 12,
  "totalHeight": 9,
  "notes": "Layout with a hallway spine connecting the private and public zones.",
  "metadata": {
    "success": true,
    "usedProvider": "claude-opus-4-8",
    "corrected": false,
    "attempts": [{ "provider": "claude-opus-4-8", "success": true }],
    "rateLimit": { "primary": 999, "correction": 999 }
  }
}
```

A `GET` on the same route returns a small status/health payload.

#### Status Codes
- `200`: valid layout
- `207`: partial success — data returned, but it did not fully pass validation (`metadata.success: false`)
- `400`: empty/invalid description
- `503`: generation failed (no data produced)
- `500`: unexpected server error

## Room Types & Sizing

### Supported Room Types
`bedroom`, `kitchen`, `bathroom`, `living_room`, `office`, `hallway`, `garage`, `carport`, `laundry`, `foyer`.

### Sizing Constraints (enforced by the prompt, all in m²)
```
Living Room: 20–42 m²   (largest public space)
Kitchen:     7–28 m²    (attaches to living room)
Bedroom:     7–23 m²    (attaches to hallway)
Bathroom:    3–9 m²     (attaches to a bedroom)
Hallway:     4–14 m²    (the structural spine)
```

Layout coordinates use 0.5 m grid increments; wall height is 2.4 m and wall thickness ~0.125 m.

## Cost Model (`lib/budget-calculator.ts`)

Per-room cost structure (materials & labor are $/m², furniture is a flat rate):

```typescript
{
  bedroom:     { materials: 35,  labor: 45,  furniture: 2500 },
  kitchen:     { materials: 150, labor: 150, furniture: 12000 },
  bathroom:    { materials: 120, labor: 130, furniture: 4500 },
  living_room: { materials: 40,  labor: 50,  furniture: 5000 },
  office:      { materials: 30,  labor: 40,  furniture: 2000 },
  hallway:     { materials: 25,  labor: 35,  furniture: 500 }
}
```

```
Room Cost = (area × materials) + (area × labor) + furniture
Total     = Σ room costs + 15% contingency
```

Room types without an explicit entry fall back to the `bedroom` rates.

## Customization

- **Colors** — `components/viewer/geometries/constants.ts` (`COLORS`)
- **Cost model** — `lib/budget-calculator.ts` (`COSTS`)
- **Animation speed** — `components/viewer/geometries/constants.ts` (`ANIMATION_DURATION`)
- **Model / generation params** — `config/llm.config.ts`
- **Architectural rules** — `lib/validator-engine.ts` (`ROOM_PLACEMENT_RULES`)
- **System prompt** — `lib/prompt.ts`

## Deployment (Vercel)

```bash
npm i -g vercel
vercel login
vercel

# Set environment variables in the Vercel dashboard (Project → Settings → Environment Variables)
#   ANTHROPIC_FOUNDRY_RESOURCE
#   ANTHROPIC_FOUNDRY_API_KEY
#   ANTHROPIC_FOUNDRY_DEPLOYMENT   (optional; defaults to "claude-opus-4-8")

vercel --prod
```

## Known Limitations

1. **Layout overlap** — the model can occasionally emit overlapping or under-connected layouts; the correction pass fixes most, but not all. Regenerate with a more specific description if a result is flagged as partial.
2. **Rectangular rooms only** — no curved or angled rooms.
3. **Single floor** — no multi-story support yet.
4. **No furniture rendering** — budgeting is an approximation; interior furniture is not drawn.
5. **Single-user** — no real-time collaborative editing.

## Roadmap

- [ ] Multi-floor support
- [ ] Custom color per room
- [ ] Furniture library + 3D placement
- [ ] PDF / image export of the layout and budget
- [ ] 2D blueprint (CAD) export
- [ ] Regional price presets for the cost model
- [ ] Model-provider decoupling (swap Foundry/Opus for other backends)

## Acknowledgments

- Anthropic Claude (Opus 4.8) via Microsoft Foundry for layout generation
- Three.js community and React Three Fiber for 3D rendering
- Vercel for deployment

---

**Rosa Miniporto** — making space planning as easy as describing your vision. Built with TypeScript, Three.js, and Claude.
