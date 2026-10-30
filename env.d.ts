interface ImportMetaEnv {
  readonly VITE_POCKETBASE_URL: string;
  readonly QUASAR_DEV: boolean;
  readonly QUASAR_PROD: boolean;
  readonly QUASAR_MODE: string;
  readonly QUASAR_CLIENT: boolean;
  readonly QUASAR_SERVER: boolean;
  readonly QUASAR_VUE_ROUTER_MODE: "hash" | "history";
  readonly QUASAR_VUE_ROUTER_BASE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
