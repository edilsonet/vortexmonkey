import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { RecoverPage } from "./pages/RecoverPage.tsx";
import { ChatPage, ComunicadosPage, EmailsPage } from "./pages/communication/CommunicationPages.tsx";
import { Shell } from "./shell/Shell.tsx";
import { DashboardPage } from "./pages/DashboardPage.tsx";
import { PessoalPage } from "./pages/PessoalPage.tsx";
import { ProfissionalPage } from "./pages/ProfissionalPage.tsx";
import { EmpresarialPage } from "./pages/EmpresarialPage.tsx";
import { ProtocoloPage } from "./pages/ProtocoloPage.tsx";
import { AssinaturasPage } from "./pages/AssinaturasPage.tsx";
import { PersonalizacaoPage } from "./pages/PersonalizacaoPage.tsx";
import { SegurancaPage } from "./pages/SegurancaPage.tsx";
import { ConfiguracoesPage } from "./pages/ConfiguracoesPage.tsx";
import { LedgerPage } from "./pages/LedgerPage.tsx";
import { EstoquePage } from "./pages/EstoquePage.tsx";
import { DocumentosPage } from "./pages/DocumentosPage.tsx";
import { AssinarPage } from "./pages/AssinarPage.tsx";
import { VerificarPage } from "./pages/VerificarPage.tsx";
import { LgpdPage } from "./pages/LgpdPage.tsx";
import { PpspPage } from "./pages/PpspPage.tsx";
import { AlertasPage } from "./pages/AlertasPage.tsx";
import { isAdminRole } from "./shell/nav.ts";
import { stubAppRoutes } from "./shell/app-routes.tsx";

function PublicVerify() {
  return (
    <div className="min-h-dvh bg-[var(--bg)] p-6 text-[var(--text)]">
      <VerificarPage />
    </div>
  );
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { roles } = useAuth();
  if (!isAdminRole(roles)) return <Navigate to="/" replace />;
  return children;
}

export function App() {
  const { token } = useAuth();
  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/recuperar" element={<RecoverPage />} />
        <Route path="/verificar" element={<PublicVerify />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/pessoal" element={<PessoalPage />} />
        <Route path="/profissional" element={<ProfissionalPage />} />
        <Route path="/empresarial" element={<EmpresarialPage />} />
        <Route path="/estoque" element={<EstoquePage />} />
        <Route path="/documentos" element={<DocumentosPage />} />
        <Route path="/assinar" element={<AssinarPage />} />
        <Route path="/verificar" element={<VerificarPage />} />
        <Route path="/lgpd" element={<LgpdPage />} />
        <Route path="/protocolos" element={<ProtocoloPage />} />
        <Route path="/ledger" element={<AdminOnly><LedgerPage /></AdminOnly>} />
        <Route path="/recrutamento" element={<Navigate to="/rh/vagas" replace />} />
        <Route path="/assinaturas" element={<AssinaturasPage />} />
        <Route path="/ppsp" element={<PpspPage />} />
        <Route path="/personalizacao" element={<PersonalizacaoPage />} />
        <Route path="/seguranca" element={<SegurancaPage />} />
        <Route path="/configuracoes" element={<AdminOnly><ConfiguracoesPage /></AdminOnly>} />
        <Route path="/comunicacao/chat" element={<ChatPage />} />
        <Route path="/comunicacao/alertas" element={<AlertasPage />} />
        <Route path="/comunicacao/emails" element={<EmailsPage />} />
        <Route path="/comunicacao/comunicados" element={<ComunicadosPage />} />
        {stubAppRoutes()}
        <Route path="/apps/catalogo" element={<Navigate to="/cc" replace />} />
        <Route path="/apps/rloja" element={<Navigate to="/rl" replace />} />
        <Route path="/apps/recrutamento" element={<Navigate to="/rh" replace />} />
        <Route path="/apps/mro" element={<Navigate to="/mr" replace />} />
        <Route path="/apps/ops" element={<Navigate to="/op" replace />} />
        <Route path="/apps/training" element={<Navigate to="/tr" replace />} />
        <Route path="/apps/airport" element={<Navigate to="/ap" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
