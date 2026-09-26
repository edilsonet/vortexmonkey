// Tipagem das fronteiras federadas consumidas pelo host. O Nx gera a URL em
// tempo de build a partir de `module-federation.config.ts`; aqui so declaramos
// o contrato do que cada remote expoe.
declare module 'mro-web/Routes' {
  import type { Route } from '@angular/router';
  export const mroRoutes: Route[];
}
