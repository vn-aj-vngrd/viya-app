# Viya Final Submission

This folder contains the final user-facing submission artifacts for Viya.

## Files

- `Viya User Guide.pdf` - polished user guide with real iOS Simulator screenshots.
- `Viya User Guide.html` - generated source used to render the PDF.
- `assets/screenshots/` - original simulator screenshots used in the guide, including live login captures.
- `assets/guide-screens/` - optimized screenshots generated for the PDF layout.
- `readme/` - context readmes covering product, stack, architecture, AI, demo, setup, and security.
- `scripts/generate-user-guide.mjs` - local generator for rebuilding the HTML and PDF.

## Regenerate The PDF

Run from the repo root:

```bash
/Users/vanajvanguardia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node docs/final-submission/scripts/generate-user-guide.mjs
```

The script uses the bundled Codex runtime packages for Playwright and Sharp.
