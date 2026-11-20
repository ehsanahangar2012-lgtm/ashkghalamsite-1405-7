<?php
/**
 * Ashk Ghalam Smart Cron Job Entrypoint (100% Pure PHP — Zero Node.js)
 *
 * Supports BOTH:
 *  1) cPanel CLI Cron Job (Recommended):
 *       php -q /home/USER/public_html/cron-seo.php >/dev/null 2>&1
 *  2) External / cPanel HTTP Cron Webhook:
 *       curl -s "https://yourdomain.com/cron-seo.php?token=YOUR_CRON_TOKEN" >/dev/null 2>&1
 *
 * Smart behavior:
 *  Even if invoked hourly (0 * * * *), it checks seo-autopilot-state.json and only runs
 *  tasks whose configured schedule interval has elapsed.
 */

@ini_set('display_errors', '0');
@ini_set('memory_limit', '256M');
@set_time_limit(180);
error_reporting(0);

define('SEO_AUTOPILOT_INTERNAL', true);
$rootDir = __DIR__;
$dataFallbackDir = $rootDir . DIRECTORY_SEPARATOR . 'data';

require_once __DIR__ . DIRECTORY_SEPARATOR . 'seo-autopilot.php';

$isCli = (PHP_SAPI === 'cli' || PHP_SAPI === 'phpdbg');
$config = seoApLoadConfig();

if (!$isCli) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');

    $provided = trim((string) ($_GET['token'] ?? ($_POST['token'] ?? '')));
    if ($provided === '' && isset($_SERVER['HTTP_X_CRON_TOKEN'])) {
        $provided = trim((string) $_SERVER['HTTP_X_CRON_TOKEN']);
    }
    $expected = (string) ($config['cronToken'] ?? '');
    if ($expected === '' || !hash_equals($expected, $provided)) {
        http_response_code(403);
        echo json_encode([
            'ok' => false,
            'error' => 'توکن امنیتی کرون جاب نامعتبر است.',
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}

$forceParam = trim((string) ($_GET['force'] ?? ''));
if ($isCli && !empty($argv[1]) && strpos((string) $argv[1], '--force=') === 0) {
    $forceParam = trim(substr((string) $argv[1], 8));
}

$forceTasks = [];
if ($forceParam !== '') {
    foreach (explode(',', $forceParam) as $t) {
        $t = strtolower(trim($t));
        if (in_array($t, ['all', 'article', 'audit', 'promote'], true)) {
            $forceTasks[] = $t;
        }
    }
}

$result = seoApRunCycle($isCli ? 'cron_cli' : 'cron_http', $forceTasks);
$geminiResult = function_exists('seoGeminiRunIfDue') ? seoGeminiRunIfDue() : null;

// Keep output compact for cron mail / HTTP webhook logs
$compact = [
    'ok' => !empty($result['ok']),
    'skipped' => !empty($result['skipped']),
    'source' => $isCli ? 'cron_cli' : 'cron_http',
    'executed' => $result['executed'] ?? [],
    'summary' => $result['summary'] ?? ($result['reason'] ?? ''),
    'geminiSeo' => $geminiResult ? [
        'ok' => !empty($geminiResult['ok']),
        'summary' => $geminiResult['summary'] ?? ($geminiResult['error'] ?? ''),
    ] : null,
    'timestamp' => gmdate('c'),
];

echo json_encode($compact, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ($isCli ? "\n" : '');
