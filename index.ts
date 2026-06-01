// Bun dev server entry for personal-blog. Thin wrapper over the engine's
// dev-server factory (in the `presidocs` package). The static post/landing
// HTML bundles come from the generated `.generated/postRoutes.ts` — run
// `bun run dev`, which regenerates it first.
//
// The privacy-policy footer (Proposal 13 §8 / Option E) runs at *build*
// time via the Bun.build plugin wired in `engine/generate/build-html.ts`.
// It deliberately does NOT run here: Bun's runtime plugin system rejects
// `loader: "html"` in onLoad, so a `Bun.plugin(siteFooterPlugin())` call
// before `Bun.serve` would crash the dev server when an HTMLBundle loads.
// The pages that ship a hand-authored `<footer class="site-footer">` in
// source HTML (`index.html`, `privacy.html`) cover the visible dev gap;
// posts inherit the build-time inject only.

import { resolveBlogPaths } from "presidocs/shared/blogPaths.ts";
import { createDevServer } from "presidocs/server/createDevServer.ts";
import { staticRoutes } from "./.generated/postRoutes.ts";

const paths = resolveBlogPaths();
const server = Bun.serve(await createDevServer({ paths, staticRoutes }));
console.log(`personal-blog running at ${server.url}`);
