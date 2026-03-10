# REINASLEO — Premium Women's Fashion

**First draft homepage** with editorial retro-collage aesthetic. Modern monorepo with Next.js 15 (App Router) + Spring Boot 3 (Java 21).

---

## Monorepo Structure

```
/
├── apps/
│   ├── web/       Next.js 15 frontend (TypeScript + TailwindCSS)
│   └── api/       Spring Boot 3 API (Java 21 + Gradle)
└── README.md
```

---

## Quick Start

### Web (Next.js)

```bash
cd apps/web
npm install
npm run dev
# Open http://localhost:3000/en  (or /ru for Russian)
```

**Environment variables** (optional):
- `NEXT_PUBLIC_API_BASE` – API base URL (default: `http://localhost:8080`)

**TypeScript check:**
```bash
npm run build  # or npx tsc --noEmit
```

**Hero Background:**
The hero section features an animated ShaderGradient background with graceful fallbacks:
- Animated WebGL gradient (if WebGL supported and motion not reduced)
- Static CSS gradient fallback (SSR, reduced motion, or no WebGL)
- Paper texture overlay for readability

### API (Spring Boot)

```bash
cd apps/api
gradle bootRun
# Runs on http://localhost:8080
```

**Endpoints:**
- `GET /api/health` – health check
- `POST /api/contact` – contact form (validates name/email/message)
- `GET /api/lookbook` – placeholder lookbook items

---

## ✅ TypeScript Configuration Fixed

The `Cannot find type definition file for 'node'` error has been resolved:

1. **Installed dependencies** including `@types/node`
2. **Updated Next.js** to 15.5.9 (latest stable with security fixes)
3. **Updated next-intl** to 3.26.2 (Next.js 15 compatible)
4. **Fixed async cookies API** for Next.js 15
5. **Updated tsconfig.json** with proper Next.js plugin configuration

All TypeScript compilation passes with zero errors.

---

## Localization (RU / EN)

- Routes: `/en/...` and `/ru/...`
- Language toggle in header switches locale and keeps current path.
- Translations: `apps/web/messages/en.json`, `apps/web/messages/ru.json`

---

## Design System

**Colors:**
- Paper background: `#F3E9DA` to `#EFE3D2`
- Ink: `#2B1711` (dark), `#3A1F16` (soft)
- Accent: `#C89B3C` (mustard gold)

**Typography:**
- Display (headings): Bebas Neue (large, bold, poster-like)
- Body: Inter

**Texture & effects:**
- Paper grain via CSS pseudo-element (SVG noise filter)
- Crumpled shadow overlays for tactile feel
- Collage elements: tape strips, circular tags, ribbons

**Customization:**
- `apps/web/app/globals.css` – adjust `--texture-opacity` and `--crumple-opacity` (lines 7–13 in `:root`)
- `apps/web/tailwind.config.ts` – accent color and theme overrides

---

## Brand Emblem

Location: `apps/web/components/BrandEmblem.tsx`

**How to replace:**
1. Open `BrandEmblem.tsx`
2. Find the `<svg>` block (lines 15–37)
3. Replace the inline SVG with your emblem
4. Keep `viewBox="0 0 64 64"` for easy drop-in

The emblem appears:
- In the header (left)
- As a watermark in the hero background (5% opacity)

---

## Pages & Routes

| Route | Description |
|-------|-------------|
| `/[locale]` | Home (hero, manifesto, atelier, lookbook teaser, newsletter) |
| `/[locale]/about` | About page (placeholder) |
| `/[locale]/lookbook` | Lookbook grid (6 placeholder frames) |
| `/[locale]/contact` | Contact form (posts to API) |

All routes are locale-prefixed (`/en` or `/ru`).

---

## Replacing Placeholders with Real Content

### Hero & Lookbook Frames

**File:** `apps/web/app/[locale]/page.tsx`

1. **Hero editorial frame** (lines 103–116):
   - Replace the gradient `<div>` with an `<Image>` or real photo component
   - Keep the `.collage-frame` wrapper and decorative elements

2. **Lookbook grid** (lines 193–209):
   - Each card is a placeholder; replace inner `<div>` with actual images
   - Labels come from `messages/*.json` → `home.lookbook.labels`

### Product Pages (future)

When adding e-commerce:
- Create `apps/web/app/[locale]/shop/page.tsx` for product listings
- Add product detail routes: `apps/web/app/[locale]/shop/[slug]/page.tsx`
- Update API with product endpoints
- Connect to PostgreSQL (see below)

---

## Adding a Database (PostgreSQL)

The API uses in-memory stubs (no DB required). To add PostgreSQL:

1. **Add dependencies** to `apps/api/build.gradle.kts`:
   ```kotlin
   implementation("org.springframework.boot:spring-boot-starter-data-jpa")
   runtimeOnly("org.postgresql:postgresql")
   ```

2. **Update `apps/api/src/main/resources/application.yml`**:
   ```yaml
   spring:
     datasource:
       url: jdbc:postgresql://localhost:5432/reinasleo
       username: youruser
       password: yourpass
     jpa:
       hibernate:
         ddl-auto: update
       show-sql: true
   ```

3. **Convert models** (e.g., `ContactMessage`) to JPA entities:
   ```java
   @Entity
   public class ContactMessage {
     @Id @GeneratedValue
     private Long id;
     // ... fields
   }
   ```

4. **Create repositories**:
   ```java
   public interface ContactRepository extends JpaRepository<ContactMessage, Long> {}
   ```

5. **Update services** to use the repository instead of in-memory list.

---

## Performance Checklist

- ✅ Server components by default
- ✅ Self-hosted fonts (`next/font/google`)
- ✅ No external images (CSS/SVG placeholders)
- ✅ Gzip enabled in Spring Boot
- ✅ Minimal dependencies
- ✅ Next.js 15.5.9 (latest stable)

**Next steps:**
- Add `next/image` for optimized images when you have real photos
- Enable static export for home/about if content is static
- Add caching headers for API responses

---

## Deployment

### Web (Vercel / Netlify)

```bash
cd apps/web
npm run build
npm start
```

**Environment:**
- Set `NEXT_PUBLIC_API_BASE` to your production API URL

### API (Docker / VPS)

```bash
cd apps/api
gradle build
java -jar build/libs/reinasleo-api-0.0.1-SNAPSHOT.jar
```

**Environment:**
- Set `app.cors.allowed-origins` in `application.yml` to your web domain

---

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15.5+ (App Router), React 19, TypeScript 5.7 |
| Styling | TailwindCSS 3.4+ |
| i18n | next-intl 3.26+ |
| Backend | Spring Boot 3.x, Java 21 |
| Build | npm (web), Gradle 8+ (API) |
| Data | In-memory (PostgreSQL ready) |

---

## Troubleshooting

### TypeScript Errors

If you see `Cannot find type definition file for 'node'`:
```bash
cd apps/web
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use

**Web (3000):**
```bash
lsof -ti:3000 | xargs kill -9
```

**API (8080):**
```bash
lsof -ti:8080 | xargs kill -9
```

### ShaderGradient Background Issues

**Canvas is blank or not rendering:**
1. **Check WebGL support**: Open browser console and verify WebGL is enabled
   - Chrome/Edge: `chrome://flags` → Enable "WebGL 2.0"
   - Firefox: `about:config` → `webgl.enable-webgl2` = true
2. **Try different browser**: Some browsers have stricter WebGL policies
3. **Check browser console**: Look for WebGL context errors
4. **Reduce performance load**: The component automatically falls back if WebGL fails
5. **Disable grain**: If performance is poor, edit `HeroShaderBackground.tsx` and set `grain="off"`

**Background shows static fallback instead of animation:**
- This is expected if:
  - User has `prefers-reduced-motion` enabled (accessibility)
  - WebGL is not supported/available
  - During SSR (server-side rendering)
- The fallback maintains the same visual aesthetic with a static gradient

**Performance issues:**
- The shader uses `pixelDensity={1}` and optimized settings for performance
- If still slow, try reducing `uDensity` or `uStrength` values in the component
- Consider disabling grain: `grain="off"`

**Component not found errors:**
```bash
cd apps/web
npm install @shadergradient/react
# Verify installation:
npm list @shadergradient/react
```

---

## License & Credits

**Built for:** REINASLEO  
**Design aesthetic:** Editorial retro-collage, warm paper tones, mustard-gold accents, tactile typography

---

**Questions?** Check inline comments in `BrandEmblem.tsx`, `globals.css`, and `page.tsx` for customization hooks.
