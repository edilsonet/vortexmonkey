import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button, Card } from '@vortex/ui-core';
interface Props { children: ReactNode; appName: string }
interface State { failed: boolean }
export class RemoteErrorBoundary extends Component<Props, State> {
  public override state: State = { failed: false };
  public static getDerivedStateFromError(): State { return { failed: true }; }
  public override componentDidCatch(error: Error, info: ErrorInfo): void { console.error('Remote isolado indisponível', { app: this.props.appName, error, info }); }
  public override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return <Card className="mx-auto mt-12 max-w-xl text-center"><AlertTriangle className="mx-auto mb-4 text-amber-600" size={36}/><h2 className="text-xl font-bold">{this.props.appName} está temporariamente indisponível</h2><p className="my-3 text-sm text-[var(--vtx-text-muted)]">A falha foi isolada. A navegação e os demais aplicativos continuam disponíveis.</p><Button onClick={() => window.location.reload()}><RotateCcw size={16}/>Tentar novamente</Button></Card>;
  }
}
