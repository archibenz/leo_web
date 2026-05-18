# Type Strictness — `noUncheckedIndexedAccess`

Status: **disabled** (deliberately, as of 2026-05-18).

## Why not enabled

`tsconfig.json` already runs in `strict: true`. Adding
`noUncheckedIndexedAccess: true` was evaluated and rolled back.

Blast radius scan over `apps/web/{components,app,lib}` (excluding
Tailwind arbitrary-value brackets `z-[1]`, `inset-0`, hook dep arrays,
`console.tag` style strings, JSX className expressions):

| Pattern | Approx. real sites |
|---|---|
| Numeric index `xs[0]`, `xs[i]` | ~32 |
| Alpha key `map[key]` | ~20 |
| **Total** | **~52 spots across ~35 files** |

A meaningful share already guards with `||` / `??`, but every site has
to be inspected because the option turns silently-`T` into `T \| undefined`,
which fans out through downstream call sites and JSX expressions. Mass
mechanical fixes (`const x = xs[0]!`) are not acceptable — they re-introduce
the bug shape we are trying to catch.

## Plan

1. Land the option in a dedicated branch.
2. Walk files top-down (components first, then app routes, then lib).
3. For each site: prefer narrowing (`if (!x) return null;`) over `!` assertion.
4. Add tests for the guard branches we introduce.
5. Re-run `npm run build` per file batch.

Tracked separately from the current refactor round to avoid bundling
type-driven changes with feature work.

## How to re-enable when ready

```jsonc
// apps/web/tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

Then `npm run build` from `apps/web/` and resolve diagnostics file by file.
