// Fronteira assincrona do Module Federation: os modulos compartilhados sao
// negociados antes de inicializar a Shell.
import('./bootstrap').catch((err) => console.error(err));
