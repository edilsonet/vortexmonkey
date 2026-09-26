import type { RequestContext } from '@vortex/types';
declare global { namespace Express { interface Request { requestId: string; vortexContext?: RequestContext; } } }
export {};
