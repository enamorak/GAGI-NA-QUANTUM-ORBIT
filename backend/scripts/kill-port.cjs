const { execSync } = require('child_process');

const from = Number(process.env.PORT_FROM) || 3001;
const to = Number(process.env.PORT_TO) || 3010;

function killOnPort(port) {
  if (process.platform === 'win32') {
    try {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const pids = new Set();
      out.split('\n').forEach((line) => {
        if (!line.includes('LISTENING')) return;
        const m = line.trim().match(/\s+(\d+)\s*$/);
        if (m) pids.add(m[1]);
      });
      pids.forEach((pid) => {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
          console.log(`Killed PID ${pid} on port ${port}`);
        } catch {
          /* */
        }
      });
    } catch {
      /* port free */
    }
    return;
  }
  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' });
  } catch {
    /* */
  }
}

for (let port = from; port <= to; port++) {
  killOnPort(port);
}
console.log(`Ports ${from}-${to} cleared.`);
