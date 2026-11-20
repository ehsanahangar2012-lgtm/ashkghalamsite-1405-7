const { execSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const env = {
  ...process.env,
  PATH: `${process.env.HOME || '/root'}/.local/bin:${process.env.PATH || ''}`,
};

try {
  execSync('command -v graphify >/dev/null 2>&1', { cwd: rootDir, env, stdio: 'ignore' });
} catch {
  // graphify CLI not installed on this machine — skip cleanly
  process.exit(0);
}

try {
  execSync('graphify update .', { cwd: rootDir, env, stdio: 'pipe', timeout: 60000 });
  console.log('✅ Graphify knowledge graph synced (AST incremental update).');
} catch (err) {
  console.warn('⚠️ Graphify sync skipped:', err?.message || err);
}
