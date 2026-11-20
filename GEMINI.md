## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. When the answer is under a Markdown heading, `graphify section "<heading>"` prints that section's text, so the .md need not be opened. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

## Release, Versioning & Build Automation Rules

- **Automatic Graphify Sync**: `npm run build` automatically executes `node scripts/sync_graphify.cjs` to incrementally refresh `graphify-out/graph.json` after every code change. Git hooks (`post-commit` / `post-checkout`) and `npm run graphify:watch` are also available.
- **Automatic Version Bump**: After every meaningful code change, bump the unified project/cPanel version across all 13 files using `node scripts/bump_version.cjs` (or `npm run version:bump`).
- **On-Demand cPanel ZIP Only**: To save tokens and build time, **DO NOT** run `scripts/pack_release_zips.cjs` or `npm run release:cpanel` unless the user explicitly asks for the built cPanel `.zip` file. `npm run build` intentionally excludes ZIP creation.
- **Offline Design Studios**: `public/studio/photocraft/` (v0.23.1) and `public/studio/vectorcraft/` (v0.24.1) are excluded from Git (due to VectorCraft's ~100MB WASM) and can be restored anytime with `npm run studio:install`.
- **Clean Public UI Copy**: Never display developer notes, internal architecture terms (e.g., Rust, WebAssembly, iframe, cache, cookies, server hosting details), or third-party engine version/technical blurbs in public-facing user pages. Keep all user copy brief, natural, and focused solely on the user's task.
