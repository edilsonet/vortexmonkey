import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const port = 9333;
const chromium = spawn('chromium', [
  '--headless', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${port}`,
  '--user-data-dir=/tmp/vortex-chromium-debug', 'about:blank',
], { stdio: 'ignore' });

try {
  await delay(1500);
  const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
  const page = pages[0];
  if (!page?.webSocketDebuggerUrl) throw new Error('Página CDP não encontrada.');
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) {
      const handler = pending.get(message.id); pending.delete(message.id); handler(message);
      return;
    }
    if (['Runtime.exceptionThrown', 'Runtime.consoleAPICalled', 'Log.entryAdded', 'Network.loadingFailed'].includes(message.method)) {
      console.log(JSON.stringify(message));
    }
  });
  const call = (method, params = {}) => new Promise((resolve) => {
    id += 1; pending.set(id, resolve); socket.send(JSON.stringify({ id, method, params }));
  });
  await call('Runtime.enable'); await call('Log.enable'); await call('Network.enable'); await call('Page.enable');
  await call('Page.navigate', { url: 'http://rconta.vortex.localhost:8080' });
  await delay(8000);
  const result = await call('Runtime.evaluate', { expression: '({url: location.href, html: document.body.innerHTML, title: document.title})', returnByValue: true });
  console.log(JSON.stringify(result));
  socket.close();
} finally {
  chromium.kill('SIGTERM');
}
