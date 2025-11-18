/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TWITTER_PROGRAM_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

