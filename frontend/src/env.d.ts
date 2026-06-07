/// <reference types="vite/client" />

declare global {
  interface Window {
    AMap?: any;
    _AMapSecurityConfig?: {
      securityJsCode?: string;
    };
  }
}

export {};
