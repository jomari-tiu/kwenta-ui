/// <reference types="vite/client" />

// Ambient augmentation of Vite's own ImportMetaEnv. This is the one place
// `interface` is correct rather than `type`: declaration merging is the whole
// mechanism here, and a `type` alias would collide with vite/client instead of
// extending it. Without this, `import.meta.env.VITE_API_URL` is `any`, because
// Vite's base type carries an `[key: string]: any` index signature.
/* eslint-disable @typescript-eslint/consistent-type-definitions */
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
/* eslint-enable @typescript-eslint/consistent-type-definitions */
