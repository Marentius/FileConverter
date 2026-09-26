# FileConverter GUI

Desktop GUI for the FileConverter CLI. Select files and an output folder with native dialogs, then convert and inspect the result for each file.

## Development

From the repository root:

```bash
npm install
npm run core:build
npm run gui:dev
```

Tauri also requires Rust and the platform's [system dependencies](https://v2.tauri.app/start/prerequisites/).
The GUI uses `packages/core/dist/cli.js` during development. Set `FILECONVERTER_CLI` to an executable CLI path to override it.

Packaged GUI builds currently require `converter` and Node.js to be installed on the user's machine. Bundling the engine as a sidecar is still needed for a standalone desktop release.
