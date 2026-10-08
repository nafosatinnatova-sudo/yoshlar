/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin (e.g. "https://api.example.com"). Empty/undefined → same origin. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
