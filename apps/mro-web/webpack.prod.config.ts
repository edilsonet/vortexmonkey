import { withModuleFederation } from '@nx/module-federation/angular';
import config from './module-federation.config';

/**
 * Override de producao: o remote e publicado no proprio subdominio.
 *   remotes: [['mroWeb', 'https://mro.vortex.com']]
 */
export default withModuleFederation({ ...config }, { dts: false });
