// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RemoteErrorBoundary } from './ErrorBoundary';
vi.mock('rconta/App', () => ({ default: () => <div>Rconta remoto</div> }));
function Broken(): React.JSX.Element { throw new Error('remote falhou'); }
describe('isolamento da Shell', () => {
  it('mantém fallback local quando um remote falha', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<RemoteErrorBoundary appName="ERP 43+145"><Broken/></RemoteErrorBoundary>);
    expect(screen.getByText(/temporariamente indisponível/i)).toBeInTheDocument();
    expect(screen.getByText(/demais aplicativos continuam disponíveis/i)).toBeInTheDocument();
  });
});
