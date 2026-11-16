import { AGENT_CONFIG } from './config';
import { generateArticleViaWorker } from './content/articleEngine';
import { runTechnicalSeoAudit } from './seo/technicalAuditor';
import { buildSitemapAndRobots } from './seo/sitemapBuilder';
import { notifySearchEngines } from './search/searchNotifier';
import { logger } from './utils/logger';

async function pushToRemoteIranHost(payload: { post?: unknown; seoReport?: unknown }) {
  const remoteUrl = process.env.REMOTE_INGEST_URL;
  if (!remoteUrl) return;

  const secret = AGENT_CONFIG.online.ingestSecret;
  if (!secret) {
    throw new Error('AGENT_INGEST_SECRET is required when REMOTE_INGEST_URL is configured.');
  }

  const res = await fetch(remoteUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-agent-secret': secret,
    },
    signal: AbortSignal.timeout(25_000),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Remote ingest HTTP ${res.status}: ${await res.text()}`);
  }
  logger.info('Worker', `Successfully pushed results to remote Iran cPanel host (${remoteUrl})`);
}

async function runCli() {
  const taskArg = process.argv.find((a) => a.startsWith('--task='))?.split('=')[1] || 'audit';
  const topicArg = process.argv.find((a) => a.startsWith('--topic='))?.split('=').slice(1).join('=');
  const isRemoteCi = Boolean(process.env.REMOTE_INGEST_URL);

  logger.info('Worker', `Running one-shot SEO worker task="${taskArg}" (remotePush=${isRemoteCi})`);

  if (taskArg === 'audit') {
    const report = await runTechnicalSeoAudit({ checkLocalRoutes: !isRemoteCi });
    const { urls } = buildSitemapAndRobots();
    if (!isRemoteCi) {
      await notifySearchEngines(urls.slice(0, 25));
    } else {
      await pushToRemoteIranHost({ seoReport: report });
      await notifySearchEngines(urls.slice(0, 25));
    }
  } else if (taskArg === 'generate') {
    const post = await generateArticleViaWorker(topicArg);
    if (post.status !== 'rejected') {
      if (isRemoteCi) {
        await pushToRemoteIranHost({ post });
      }
      if (post.status === 'published') {
        buildSitemapAndRobots();
        await notifySearchEngines([
          `${AGENT_CONFIG.site.baseUrl}${post.seo.canonicalPath}`,
          `${AGENT_CONFIG.site.baseUrl}/blog`,
        ]);
      }
    }
  } else if (taskArg === 'sitemap') {
    const { urls } = buildSitemapAndRobots();
    await notifySearchEngines(urls);
  } else {
    throw new Error(`Unknown --task="${taskArg}". Use audit | generate | sitemap`);
  }
}

runCli()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Worker', 'Worker failed', { error: err instanceof Error ? err.message : String(err) });
    process.exit(1);
  });
