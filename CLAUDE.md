# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

`@react-hive/honey-hooks` — React 19 hooks for pointer interaction and animation (mouse and touch
dragging, synthetic scrolling with inertia, drop zones, `requestAnimationFrame` loops and timers),
DOM listeners (key up, resize) and resources that need cleaning up (object URLs). It is the hook
layer under `@react-hive/honey-layout` and the apps built on it, so a change here reaches all of
them: keep hooks small, dependency-light and safe under React StrictMode.

## Commands

```bash
pnpm test              # vitest, single run (watch is disabled in vitest.config.ts)
pnpm build             # webpack -> dist/ (ESM + CJS + dev CJS + .d.ts)
pnpm clean             # rm -rf dist coverage
```

Run a single file or test: `pnpm test src/__tests__/use-honey-drag.spec.ts` / `pnpm test -t "name"`.
Type-check the library itself with `tsc --noEmit -p tsconfig.build.json` (it leaves the specs out).

There is an `eslint.config.mjs` (`@eslint/js` recommended, typescript-eslint `strict`,
eslint-plugin-react recommended) but **no lint script** — invoke ESLint directly. There is **no
react-hooks plugin**, so dependency arrays are not checked: review every one by hand. Prettier:
`printWidth: 100`, single quotes, semicolons, `arrowParens: avoid`.

pnpm only; `pnpm-workspace.yaml` allows esbuild's build script. CI publishes with Node 22.

## Module map (`src/`)

Hooks build on each other; most of the stack rests on `useHoneyLatest` and `useHoneyRafLoop`.

| Layer | Hooks |
| --- | --- |
| Primitives | `useHoneyLatest` (ref holding the latest value, written during render), `useHoneyOnChange` (runs a callback when a value changes identity), `useHoneyForceRerender` |
| Frames & time | `useHoneyRafLoop` → `useHoneyDecay` (bounded, velocity-based inertia via `applyInertiaStep` from honey-utils), `useHoneyTimer` (high-precision timer) |
| Pointer | `useHoneyDrag` (mouse and touch) → `useHoneySyntheticScroll` → `useHoneySyntheticScrollX` / `useHoneySyntheticScrollY`; `useHoneyDragAndDrop` (document-level drag tracking, drop zone highlighting) |
| DOM listeners | `useHoneyDocumentKeyUp`, `useHoneyResize` (window resize, throttled with `lodash.throttle`; the handler may return a cleanup) |
| Resources | `useHoneyObjectUrl` (one `Blob`/`MediaSource`), `useHoneyObjectUrls` (a list, as a map from object to URL) |
| Coordination | `useHoneyPendingTargets` (targets keyed by id, assigned before a consumer is ready) |

`src/utils/` holds internal helpers (`applyScrollDelta`, `resolveAxisTranslate`,
`preventDefaultEvent`, `revokeObjectURL`); `src/types/` holds shared types (`Nullable`,
`TimeoutId`, DOM types). Neither is re-exported from `src/index.ts`.

## Rules the code relies on — do not break these

- **Handlers are read through `useHoneyLatest`**, so callers never have to memoize what they pass
  in, and callbacks a hook returns keep their identity across renders. A new hook taking handlers
  does the same; don't put a handler in an effect's dependency array.
- **Effects that own a resource survive StrictMode and `<Activity>`.** Both run an effect's cleanup
  and then the effect again without unmounting, and state survives. So the cleanup releases the
  resource *and* resets the state that exposes it (as `useHoneyObjectUrl` sets its URL to `null`
  and `useHoneyObjectUrls` empties its map), and the effect recreates what the cleanup released. An
  `<Activity>` shown again renders before its effects rerun — whatever that render reads must not
  be the released resource. Test both (`StrictMode` and `<Activity mode>` wrappers in the specs).
- **Detach, then release.** Copy what is to be released out of its ref, reset the ref, then release
  the copy - the order both object URL hooks follow.
- **Object URLs are revoked asynchronously** (`revokeObjectURL` in `utils`), so an element still
  showing one in the current frame is not broken by the revoke.
- **`useHoneyOnChange` does not run on mount**, nor when StrictMode or `<Activity>` rerun the
  effects — it compares against a ref that starts at the first value. Don't use it for work that
  must happen on mount; a plain effect with deps does.
- **A list argument is compared by contents**, as callers pass a fresh array every render
  (`files.map(...)`): keep work keyed on the elements, and keep returned objects stable while their
  contents are (`useHoneyObjectUrls` returns the same map until a URL changes).

## Conventions

- **One hook per file**, named the kebab-case of the export (`use-honey-object-urls.ts` →
  `useHoneyObjectUrls`). Every hook is re-exported from `src/index.ts`, which is the entire public
  surface.
- Exported types are named for their hook: `UseHoney<Name>Options`, `UseHoney<Name>Api`,
  `UseHoney<Name><Event>Handler` (`UseHoneyDragOnMoveHandler`); shared ones are `Honey*`
  (`HoneyRafLoopApi`, `HoneyKeyboardEventCode`).
- Arrow-function consts with explicit return types; `import type` for type-only imports.
- **JSDoc is the documentation** — `README.md` is only a title. Each hook carries a description, a
  bullet list of what it does, `@param` / `@returns`, and an `@example`; new hooks match that.
- Runtime dependencies stay minimal: `@react-hive/honey-utils`, `csstype` (types) and
  `lodash.throttle`. `react` is a peer (`^19.0.0`) and external in the bundle.

## Tests

- Location: `src/__tests__/<hook>.spec.ts(x)`, one spec per hook (`.tsx` where it renders JSX).
- Vitest in `jsdom`, globals enabled; `vitest.setup.ts` registers the jest-dom matchers and a
  `Touch` polyfill for the touch-drag specs.
- Suite naming: `describe('[useHoneyName]: what it covers', …)`, cases as `it('should …')`.
- Hooks are driven with `renderHook` from `@testing-library/react`; anything on a timer or an
  animation frame uses fake timers (`vi.useFakeTimers()`, `act(() => vi.runAllTimers())`), and
  browser APIs are stubbed with `vi.stubGlobal` (see the object URL specs).
- A hook that owns a resource gets a StrictMode case and, where a render can read it between
  cleanup and setup, an `<Activity>` case that hides and shows it.

## Build & release

- `webpack.config.mjs` emits three bundles from `src/index.ts`: `dist/index.mjs` (ESM),
  `dist/index.cjs` (CJS), `dist/index.dev.cjs` (development CJS), plus source maps. `README.md` and
  `LICENSE` are copied into `dist/`.
- Type declarations come from `tsconfig.build.json`, which extends `tsconfig.json` and excludes
  `__tests__`.
- `prepublishOnly` runs `clean && test && build` — a failing test blocks publish.
- **Publishing is triggered by pushing to the `release` branch** (`.github/workflows/publish.yml`),
  not by tags. `main` is the development branch.
- Release commits follow `<version> - <description of the change>`, with the version in
  `package.json` bumped and dependency updates folded into the same commit.
