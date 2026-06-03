import { test, expect } from "bun:test";

// Dev-side guard for engine HTML-head parity (methodology → Cascade-layer
// architecture). The engine plugin injects the canonical `@layer` order and the
// site footer into every page at bundle time; in dev that only happens if this
// repo's bunfig.toml registers the plugin under [serve.static].plugins. If that
// line is dropped, dev silently reverts to the inverted-layer bug and loses the
// footer — so assert it's present. (Prod is guarded separately by build-html.ts's
// built-HTML assertion.)
test("bunfig registers the engine HTML-head plugin for the dev server", async () => {
  const bunfig = await Bun.file("bunfig.toml").text();
  expect(bunfig).toContain("[serve.static]");
  expect(bunfig).toMatch(/plugins\s*=\s*\[[^\]]*bunHtmlHeadPlugin\.ts/);
});
