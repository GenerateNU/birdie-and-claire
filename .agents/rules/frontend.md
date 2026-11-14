---
paths:
  - "frontend/**"
---

# Frontend conventions

React rules for `frontend/`, on top of the root `AGENTS.md`. Treat a violation
as a review finding, not a preference.

## Talking to the API

- Call the backend only through the generated client in `src/api/generated`,
  with TanStack Query: the generated `*Options` for reads, `*Mutation` for
  writes, `*InfiniteOptions` for paginated lists. No `fetch` to `/api`.
- The one raw `fetch` allowed is an upload to a presigned storage URL, because
  the Supabase token must not go to the storage provider.
- Loading, error, and saving state come from the query or mutation. Don't
  mirror them in `useState`.
- Use the generated types and query keys. Don't hand-write a response type or
  a query key for an API call.
- Everything the client throws is an `Error`. The generated types give each
  call's error as `ErrorModel`, which carries the HTTP `status`. Branch on
  `error.status`, for example a 404 that means "not found". A network failure
  has no `status`.
- To handle a status instead of throwing, call the SDK function without
  `throwOnError` and check the returned `error`.
- Read values the backend owns from the spec, not a hand-copied list: the
  generated enum constants (`RecommendationWeather`) and zod schemas
  (`zCreateUserInputBody`).
- `src/api/generated` is not committed. `bun run dev`, `build`, and
  `typecheck` regenerate it from `backend/openapi.yaml`. After changing the
  backend, run `mise run api:generate` first.

## Errors

- Show users a fixed message saying what failed and what to do, like
  "Couldn't save your preferences. Try again." Never render `error.message`
  or a status code: it can carry server detail, Supabase internals, or our
  own strings. The query client logs every failed query and mutation.
- Validation messages written for users, like a form field's zod message, are
  the exception.

## Forms

- Forms use TanStack Form, validated with zod, rendered with the design
  system's `Form`, which takes the form instance and handles submit. No raw
  `<form>`.
- Take the schema from `zod.gen.ts` when the API defines the rules, and write
  one only for input the API doesn't see, like a login email.
- Show field errors through `TextField`'s `error` prop.

## UI

- Build pages from `@/design-system`: `Page`, `Box`, `Text`, `Button`, `Link`,
  `TextField`, and the rest. Reach for a raw element only when no component
  fits, such as a semantic `<nav>`, `<header>`, or `<ul>`.
- Import `Link` from `@/design-system`, never from `@tanstack/react-router`.
  Lint enforces this. With no variant it is unstyled like the router's, for
  cards, nav rows, and images. A `variant` of `"primary"`, `"secondary"`,
  `"ghost"`, or `"destructive"` styles it like the Button of that variant, and
  only those take a `size`. For an inline text link, use `TextLink`, which has
  the same routing props.
- Use `Box`, never a raw `<div>`, including inside the design system. Its own
  components import it from `@/design-system/primitives/box`, not the index.
- A missing component goes in the design system, and only when a page uses
  it. Don't add one for later.
- Icons come from `@phosphor-icons/react`, marked `aria-hidden="true"` when a
  label sits next to them. No arrow or symbol characters as icons.
- Every font, image, and SVG lives in `src/design-system/assets`, even one only
  a single feature uses. The exception is `public/og-image.png`: link-preview
  crawlers need it at a fixed URL, and Vite renames bundled assets.
- SVGs are files, not inline `<svg>` or SVG data URIs in pages.
- `src/index.css` holds only the `@tailwind` directives. Page-wide styles,
  `@font-face`, and shared classes like `.focus-ring` go in the plugin in
  `tailwind.config.ts`, built from the tokens.
- Style with design tokens. Tailwind's default colors, spacing, type scale,
  radii, and opacity are switched off, so an off-token class compiles to
  nothing. Avoid arbitrary values like `w-[373px]`; when a Figma measurement
  has no token, keep it next to a comment saying where it comes from.

## Structure

- Routes are nested folders, never dot-separated names: `outfits/$outfitId.tsx`,
  not `outfits.$outfitId.tsx`. A folder's layout or guard is its `route.tsx`,
  not a sibling file with the folder's name. A `_name/` folder is a pathless
  layout, a guard that adds nothing to the URL. Dev-only pages go in a
  `(dev)/` group, which also adds nothing to the URL.
- `src/routes/` holds route files, kept thin. Domain code shared by routes
  goes in `src/features/<domain>/`. Code with no domain, like the Supabase
  client, goes in `src/lib/`.
- File names are kebab-case. Use named exports, not default exports.
- Import through the `@/` alias, which maps to `src/`, even inside the design
  system. Lint rejects `./` and `../` imports under `src/`.
- Write components and top-level functions as `function` declarations. Use
  arrow functions for callbacks.

## Comments

- Comments that restate the code are the most common review finding here.
  If the name or the JSX already says it, delete the comment.
- Keep a comment for what one read of the code would miss: a constraint from
  the backend or a library, a workaround, a design decision that looks wrong.
- Every type assertion needs a `// SAFETY:` comment saying why it holds. The
  lint rule enforces this.
- A comment that names something must name something that exists. Update or
  delete comments when the code they describe moves.
