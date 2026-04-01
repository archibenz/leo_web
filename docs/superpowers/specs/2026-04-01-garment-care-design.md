# Garment Care Page — Design Spec

## Overview

Two-level garment care system: a standalone `/care` page with fabric-type cards managed from admin, plus per-product care instructions (symbols + text) on product detail pages.

## Backend

### New Entity: CareGuide

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| title | VARCHAR(255) | Fabric name (e.g. "Шёлк") |
| description | TEXT | General fabric description |
| tips | TEXT | Care tips/recommendations |
| image | VARCHAR(512) | Optional image URL |
| careSymbols | JSONB | Array of symbol keys |
| sortOrder | INT | Display order |
| active | BOOLEAN | Visibility toggle |
| createdAt | INSTANT | Auto |
| updatedAt | INSTANT | Auto |

### API Endpoints

- `GET /api/care-guides` — public, returns active guides sorted by sortOrder
- `GET /api/admin/care-guides` — admin, returns all
- `POST /api/admin/care-guides` — create
- `PUT /api/admin/care-guides/{id}` — update
- `DELETE /api/admin/care-guides/{id}` — delete

### Product Extension

New field `care_instructions` (JSONB, nullable):
```json
{
  "symbols": ["wash_30", "no_bleach", "iron_low"],
  "text": "Hand wash at 30°. Do not bleach."
}
```

## Frontend

### Page `/care`

- Hero section: title + subtitle (from translations)
- Grid of CareGuide cards fetched from API
- Each card: fabric name, care symbols as SVG icons, description, tips
- BlurReveal scroll animations (existing component)
- Bottom CTA linking to shop

### Product Detail — Care Section

- Below product description
- Row of care symbol icons + text explanation
- Compact layout, consistent with product page style

## Admin

### New Section: `/admin/care`

- List page with all CareGuide entries
- Create/edit form: title, description, tips, symbol picker (checkboxes), image upload, sortOrder, active toggle
- Follows existing admin form patterns (useState, Field wrapper)

### ProductForm Extension

- New "Care" section with:
  - Symbol checkboxes (same set as CareGuide)
  - Textarea for care text

## Care Symbols Set

15 standard laundry symbols, SVG icons hardcoded:

`wash_30`, `wash_40`, `hand_wash`, `no_wash`, `no_bleach`, `iron_low`, `iron_medium`, `no_iron`, `tumble_dry`, `no_tumble_dry`, `dry_flat`, `dry_shade`, `dry_clean`, `no_dry_clean`, `gentle_cycle`

## Animations

- BlurReveal for section entrance on scroll
- Framer-motion fade transitions on card mount
- Minimal, consistent with site aesthetic

## Migrations

- `V{N}__care_guides.sql` — create care_guides table
- `V{N+1}__product_care_instructions.sql` — add care_instructions column to products
