// Ponte de carregamento tardio da tela de acesso. O reexport mantem o import de
// `@vortex/shell` estatico no projeto: sem ele, a lib seria importada de forma
// estatica (chrome) e tardia (login) ao mesmo tempo, o que
// `@nx/enforce-module-boundaries` proibe.
export { LoginPage } from '@vortex/shell';
