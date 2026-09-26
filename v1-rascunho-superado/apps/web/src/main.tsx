import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App.tsx";
import { AuthProvider } from "./lib/auth.tsx";
import "./styles.css";
import { applyTheme } from "./pages/PersonalizacaoPage.tsx";

applyTheme(localStorage.getItem("vortex.theme") ?? "dark");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
