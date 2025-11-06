# Emulators Typescript Glue Code

These code are copied from <https://github.com/js-dos/emulators> for modification to run in VSCode.

Thanks to [caiiiycuk](https://github.com/caiiiycuk).

## Important

Turn OFF the autoformat setting when changing files in this folder.

## Main Changes

- [modules.ts](impl/modules.ts): change method for load wasm module file
- [emulators-impl.ts](impl/ci-impl.ts): expose API for:
  - take over [HTTPRequest](http.ts) for load wasm module
  - set path of the `wDosbox.js`