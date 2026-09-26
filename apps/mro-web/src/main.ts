// Fronteira assincrona exigida pelo Module Federation: o runtime negocia os
// modulos compartilhados antes de inicializar o app.
import('./bootstrap').catch((err) => console.error(err));
