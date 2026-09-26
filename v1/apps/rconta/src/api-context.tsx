import { Button, Card, Field, Input } from '@vortex/ui-core';
import { useMemo, useState } from 'react';
import { VortexClient } from '@vortex/sdk';

const read = (key: string): string => localStorage.getItem(key) ?? '';

export const useVortexClient = () => {
  const [token, setToken] = useState(() => read('vortex.access_token'));
  const [tenantId, setTenantId] = useState(() => read('vortex.tenant_id'));
  const [companyId, setCompanyId] = useState(() => read('vortex.company_id'));
  const client = useMemo(() => new VortexClient({
    baseUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000',
    accessToken: () => token || undefined,
    tenantId: () => tenantId || undefined,
    companyId: () => companyId || undefined,
  }), [token, tenantId, companyId]);
  const save = () => {
    localStorage.setItem('vortex.access_token', token);
    localStorage.setItem('vortex.tenant_id', tenantId);
    localStorage.setItem('vortex.company_id', companyId);
  };
  return { client, token, setToken, tenantId, setTenantId, companyId, setCompanyId, save };
};

export const ApiContextCard = ({ context }: { context: ReturnType<typeof useVortexClient> }) => <Card>
  <div className="mb-4">
    <h2 className="font-bold">Contexto seguro da API</h2>
    <p className="mt-1 text-sm text-[var(--vtx-text-muted)]">Use o access token temporário. O navegador mantém os valores somente neste ambiente.</p>
  </div>
  <div className="grid gap-3 xl:grid-cols-3">
    <Field label="Access token"><Input type="password" value={context.token} onChange={(event) => context.setToken(event.target.value)} /></Field>
    <Field label="Tenant ID"><Input value={context.tenantId} onChange={(event) => context.setTenantId(event.target.value)} /></Field>
    <Field label="Empresa ID"><Input value={context.companyId} onChange={(event) => context.setCompanyId(event.target.value)} /></Field>
  </div>
  <Button className="mt-4" variant="secondary" onClick={context.save}>Salvar contexto local</Button>
</Card>;
