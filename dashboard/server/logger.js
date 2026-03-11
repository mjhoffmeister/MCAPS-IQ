// Server-side file logger for MSX Dashboard
// Writes structured logs to dashboard/logs/ directory

import { writeFile, readFile, mkdir, unlink, readdir, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_DIR = path.join(__dirname, '..', 'logs');
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB per log file

let loggingEnabled = false;
let currentLogFile = null;

function timestamp() {
  return new Date().toISOString();
}

function logFileName() {
  const d = new Date();
  return `dashboard-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.log`;
}

async function ensureLogDir() {
  try {
    await mkdir(LOG_DIR, { recursive: true });
  } catch { /* exists */ }
}

async function getLogPath() {
  await ensureLogDir();
  currentLogFile = path.join(LOG_DIR, logFileName());
  return currentLogFile;
}

export function createLogger() {
  const buffer = [];
  let flushTimer = null;

  async function flush() {
    if (buffer.length === 0) return;
    const logPath = await getLogPath();
    const lines = buffer.splice(0, buffer.length).join('\n') + '\n';
    try {
      await writeFile(logPath, lines, { flag: 'a' });
    } catch (err) {
      console.error('[Logger] Write failed:', err.message);
    }
  }

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      await flush();
    }, 1000);
  }

  function log(level, category, message, data) {
    if (!loggingEnabled) return;
    const entry = {
      t: timestamp(),
      level,
      cat: category,
      msg: message
    };
    if (data !== undefined) {
      // Truncate large data
      const str = typeof data === 'string' ? data : JSON.stringify(data);
      entry.data = str.length > 2000 ? str.substring(0, 2000) + '...[truncated]' : str;
    }
    buffer.push(JSON.stringify(entry));
    scheduleFlush();
  }

  function info(category, message, data) { log('INFO', category, message, data); }
  function warn(category, message, data) { log('WARN', category, message, data); }
  function error(category, message, data) { log('ERROR', category, message, data); }

  async function getLogs() {
    await ensureLogDir();
    try {
      const files = await readdir(LOG_DIR);
      const logFiles = files.filter(f => f.endsWith('.log')).sort().reverse();
      const result = [];
      for (const f of logFiles.slice(0, 5)) {
        const fp = path.join(LOG_DIR, f);
        const st = await stat(fp);
        let content = '';
        try {
          content = await readFile(fp, 'utf-8');
        } catch { /* empty */ }
        result.push({
          name: f,
          path: fp,
          size: st.size,
          modified: st.mtime.toISOString(),
          lines: content.split('\n').filter(Boolean).length,
          content
        });
      }
      return { ok: true, logDir: LOG_DIR, files: result };
    } catch (err) {
      return { ok: false, error: err.message, logDir: LOG_DIR, files: [] };
    }
  }

  async function clearLogs() {
    await ensureLogDir();
    try {
      const files = await readdir(LOG_DIR);
      for (const f of files.filter(f => f.endsWith('.log'))) {
        await unlink(path.join(LOG_DIR, f));
      }
      return { ok: true, cleared: files.length };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  function setEnabled(enabled) {
    loggingEnabled = !!enabled;
    return { ok: true, logging: loggingEnabled };
  }

  function isEnabled() {
    return loggingEnabled;
  }

  return { info, warn, error, log, getLogs, clearLogs, setEnabled, isEnabled, flush };
}
