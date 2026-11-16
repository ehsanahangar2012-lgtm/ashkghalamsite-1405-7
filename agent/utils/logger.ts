import fs from 'fs';
import path from 'path';
import { AGENT_CONFIG } from '../config';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

function writeLog(level: LogLevel, module: string, message: string, meta?: unknown) {
  const now = new Date();
  const entry = {
    timestamp: now.toISOString(),
    level,
    module,
    message,
    ...(meta !== undefined ? { meta } : {}),
  };

  console.log(`[${entry.timestamp}] [${level}] [${module}] ${message}`);

  try {
    if (!fs.existsSync(AGENT_CONFIG.paths.logsDir)) {
      fs.mkdirSync(AGENT_CONFIG.paths.logsDir, { recursive: true });
    }
    const dateStr = now.toISOString().slice(0, 10);
    const logFile = path.join(AGENT_CONFIG.paths.logsDir, `agent-${dateStr}.log`);
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf-8');
  } catch {
    // Non-fatal on read-only file systems
  }
}

export const logger = {
  info: (module: string, msg: string, meta?: unknown) => writeLog('INFO', module, msg, meta),
  warn: (module: string, msg: string, meta?: unknown) => writeLog('WARN', module, msg, meta),
  error: (module: string, msg: string, meta?: unknown) => writeLog('ERROR', module, msg, meta),
};
