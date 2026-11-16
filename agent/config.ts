import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname, '..');

export const AGENT_CONFIG = {
  site: {
    baseUrl: (process.env.SITE_BASE_URL || 'https://ashkghalam.ir').replace(/\/+$/, ''),
    localServerUrl: (process.env.LOCAL_SERVER_URL || 'http://127.0.0.1:3000').replace(/\/+$/, ''),
    brandName: 'اشک قلم',
    defaultAuthor: 'واحد فنی و تحقیق و توسعه اشک قلم',
  },
  paths: {
    postsFile: path.join(ROOT_DIR, 'posts.json'),
    catalogsFile: path.join(ROOT_DIR, 'catalogs.json'),
    settingsFile: path.join(ROOT_DIR, 'settings.json'),
    seoStateFile: path.join(ROOT_DIR, 'seo-state.json'),
    sitemapFile: path.join(ROOT_DIR, 'public', 'sitemap.xml'),
    robotsFile: path.join(ROOT_DIR, 'public', 'robots.txt'),
    logsDir: path.join(ROOT_DIR, 'logs'),
  },
  quality: {
    autoPublish: process.env.AGENT_AUTO_PUBLISH === 'true',
    minPublishScore: Number(process.env.AGENT_MIN_PUBLISH_SCORE || 82),
    minDraftScore: Number(process.env.AGENT_MIN_DRAFT_SCORE || 60),
    minWordCount: Number(process.env.AGENT_MIN_WORDS || 550),
    maxContentSimilarity: Number(process.env.AGENT_MAX_CONTENT_SIM || 0.38),
    maxTitleSimilarity: Number(process.env.AGENT_MAX_TITLE_SIM || 0.55),
  },
  online: {
    indexNowKey: process.env.INDEXNOW_KEY || '',
    gscAccessToken: process.env.GSC_ACCESS_TOKEN || '',
    gscSiteUrl: process.env.GSC_SITE_URL || 'sc-domain:ashkghalam.ir',
    ingestSecret: process.env.AGENT_INGEST_SECRET || '',
    requestDelayMs: 1200,
  },
};
