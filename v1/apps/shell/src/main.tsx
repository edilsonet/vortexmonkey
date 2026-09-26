import React from 'react';
import { createRoot } from 'react-dom/client';
import '@vortex/ui-core/styles.css';
import { App } from './App';
const root = document.getElementById('root');
if (!root) throw new Error('Elemento raiz não encontrado.');
createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
