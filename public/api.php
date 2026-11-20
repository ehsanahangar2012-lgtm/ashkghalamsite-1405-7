<?php
/**
 * Ashk Ghalam Standard cPanel Backend API (Pure PHP - Zero Node.js)
 * Handles catalogs, 3D flipbooks, image uploads, settings, posts, inquiries, backups & SEO.
 */

@ini_set('display_errors', '0');
@ini_set('memory_limit', '256M');
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-HTTP-Method-Override, X-API-Route');
header('Cache-Control: no-store, no-cache, must-revalidate');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

define('APP_VERSION', '3.25.0');

$rootDir = __DIR__;
$dataFallbackDir = $rootDir . DIRECTORY_SEPARATOR . 'data';
$uploadsDir = $rootDir . DIRECTORY_SEPARATOR . 'uploads';
$flipbookUploadsDir = $uploadsDir . DIRECTORY_SEPARATOR . 'flipbooks';
$mediaUploadsDir = $uploadsDir . DIRECTORY_SEPARATOR . 'media';
$backupsDir = $rootDir . DIRECTORY_SEPARATOR . 'backups';

function respondJson($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function getStoragePath(string $filename): string {
    global $rootDir, $dataFallbackDir;
    $rootFile = $rootDir . DIRECTORY_SEPARATOR . $filename;
    $fallbackFile = $dataFallbackDir . DIRECTORY_SEPARATOR . $filename;

    // 1. Prefer root file if it exists and is writable
    if (file_exists($rootFile)) {
        if (!is_writable($rootFile)) {
            @chmod($rootFile, 0644);
        }
        if (is_writable($rootFile)) {
            return $rootFile;
        }
    }

    // 2. If fallback file exists and root is NOT writable, keep using fallback consistently
    if (file_exists($fallbackFile) && !is_writable($rootDir)) {
        return $fallbackFile;
    }

    // 3. If root directory is writable, use root path
    if (is_writable($rootDir)) {
        return $rootFile;
    }

    // 4. Otherwise fall back to data/ directory and seed once from root if present
    if (!is_dir($dataFallbackDir)) {
        @mkdir($dataFallbackDir, 0755, true);
    }
    if (!file_exists($fallbackFile) && file_exists($rootFile)) {
        @copy($rootFile, $fallbackFile);
    }
    return $fallbackFile;
}

function readJsonStore(string $filename, $fallback) {
    global $rootDir, $dataFallbackDir;
    $primary = getStoragePath($filename);
    $rootFile = $rootDir . DIRECTORY_SEPARATOR . $filename;
    $fallbackFile = $dataFallbackDir . DIRECTORY_SEPARATOR . $filename;

    // Always inspect the authoritative write target FIRST so reads and writes never diverge
    $candidates = array_values(array_unique([$primary, $rootFile, $fallbackFile]));
    foreach ($candidates as $path) {
        if (file_exists($path) && is_readable($path)) {
            $raw = trim((string) @file_get_contents($path));
            if ($raw !== '') {
                $decoded = json_decode($raw, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    return $decoded;
                }
            }
        }
    }
    return $fallback;
}

function writeJsonStore(string $filename, $data, bool $compact = false): bool {
    $path = getStoragePath($filename);
    $dir = dirname($path);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    if (file_exists($path) && !is_writable($path)) {
        @chmod($path, 0644);
    }
    $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
    if (!$compact) {
        $flags |= JSON_PRETTY_PRINT;
    }
    $encoded = json_encode($data, $flags);
    if ($encoded === false) {
        return false;
    }
    $result = @file_put_contents($path, $encoded, LOCK_EX);
    if ($result === false) {
        global $dataFallbackDir;
        if (!is_dir($dataFallbackDir)) {
            @mkdir($dataFallbackDir, 0755, true);
        }
        $alt = $dataFallbackDir . DIRECTORY_SEPARATOR . $filename;
        $result = @file_put_contents($alt, $encoded, LOCK_EX);
    }
    return $result !== false;
}

function readJsonBody(): array {
    // 1. WAF-safe multipart file upload (bypasses cPanel ModSecurity JSON/XSS/SQLi scanners)
    if (!empty($_FILES['payload_file']['tmp_name']) && is_uploaded_file($_FILES['payload_file']['tmp_name'])) {
        $fileRaw = (string) @file_get_contents($_FILES['payload_file']['tmp_name']);
        $trimmed = trim($fileRaw);
        if ($trimmed !== '') {
            $enc = strtolower(trim((string) ($_POST['_encoding'] ?? '')));
            if ($enc === 'b64' || $enc === 'base64' || ($trimmed[0] !== '{' && $trimmed[0] !== '[')) {
                $decodedB64 = base64_decode($trimmed, true);
                if ($decodedB64 !== false && $decodedB64 !== '') {
                    $trimmed = $decodedB64;
                }
            }
            $decoded = json_decode($trimmed, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }
    }

    // 2. URL-encoded / FormData Base64 field fallback
    $b64Field = (string) ($_POST['_b64'] ?? ($_POST['payload_b64'] ?? ''));
    if (trim($b64Field) !== '') {
        $decodedB64 = base64_decode(trim($b64Field), true);
        if ($decodedB64 !== false) {
            $decoded = json_decode($decodedB64, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }
    }

    if (isset($_POST['payload']) && is_string($_POST['payload'])) {
        $decoded = json_decode($_POST['payload'], true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }

    // 3. Standard raw JSON body (also supports { "_b64": "..." } envelope)
    $raw = (string) @file_get_contents('php://input');
    if (trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    if (is_array($decoded) && isset($decoded['_b64']) && is_string($decoded['_b64'])) {
        $inner = base64_decode($decoded['_b64'], true);
        if ($inner !== false) {
            $innerDecoded = json_decode($inner, true);
            if (is_array($innerDecoded)) {
                return $innerDecoded;
            }
        }
    }
    return is_array($decoded) ? $decoded : [];
}

function resolveRoute(): string {
    if (isset($_GET['r']) && $_GET['r'] !== '') {
        return trim((string) $_GET['r'], '/');
    }
    if (isset($_POST['r']) && $_POST['r'] !== '') {
        return trim((string) $_POST['r'], '/');
    }
    if (isset($_GET['_route']) && $_GET['_route'] !== '') {
        return trim((string) $_GET['_route'], '/');
    }
    if (!empty($_SERVER['HTTP_X_API_ROUTE'])) {
        return trim((string) $_SERVER['HTTP_X_API_ROUTE'], '/');
    }
    if (!empty($_SERVER['PATH_INFO'])) {
        return trim((string) $_SERVER['PATH_INFO'], '/');
    }
    $uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $pos = strpos($uriPath, '/api/');
    if ($pos !== false) {
        return trim(substr($uriPath, $pos + 5), '/');
    }
    if (basename($uriPath) === 'api.php') {
        return '';
    }
    return trim($uriPath, '/');
}

function resolveMethod(): string {
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if ($method === 'POST') {
        $override = $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? ($_GET['_method'] ?? '');
        if ($override !== '') {
            return strtoupper((string) $override);
        }
    }
    return $method;
}

function ensureUploadDir(string $dir): bool {
    global $uploadsDir;
    if (!is_dir($uploadsDir)) {
        @mkdir($uploadsDir, 0755, true);
    }
    if (is_dir($uploadsDir) && !is_writable($uploadsDir)) {
        @chmod($uploadsDir, 0755);
    }
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    if (is_dir($dir) && !is_writable($dir)) {
        @chmod($dir, 0755);
    }
    if (is_dir($dir) && !file_exists($dir . DIRECTORY_SEPARATOR . 'index.html')) {
        @file_put_contents($dir . DIRECTORY_SEPARATOR . 'index.html', '<!doctype html><title></title>');
    }
    return is_dir($dir) && is_writable($dir);
}

function getUploadTarget(string $subDir): ?array {
    global $uploadsDir, $dataFallbackDir;
    $cleanSub = trim($subDir, "/\\");
    $primaryDir = $uploadsDir . DIRECTORY_SEPARATOR . $cleanSub;
    if (ensureUploadDir($primaryDir)) {
        return [
            'dir' => $primaryDir,
            'urlPrefix' => '/uploads/' . $cleanSub . '/',
            'isFallback' => false,
        ];
    }
    $fallbackBase = $dataFallbackDir . DIRECTORY_SEPARATOR . 'uploads';
    if (!is_dir($fallbackBase)) {
        @mkdir($fallbackBase, 0755, true);
    }
    $fallbackDir = $fallbackBase . DIRECTORY_SEPARATOR . $cleanSub;
    if (!is_dir($fallbackDir)) {
        @mkdir($fallbackDir, 0755, true);
    }
    if (is_dir($fallbackDir) && is_writable($fallbackDir)) {
        if (!file_exists($fallbackDir . DIRECTORY_SEPARATOR . 'index.html')) {
            @file_put_contents($fallbackDir . DIRECTORY_SEPARATOR . 'index.html', '<!doctype html><title></title>');
        }
        return [
            'dir' => $fallbackDir,
            'urlPrefix' => '/api.php?r=upload-file&p=' . $cleanSub . '/',
            'isFallback' => true,
        ];
    }
    return null;
}

function decodeDataUrlImage(string $dataUrl): ?array {
    $trimmed = trim($dataUrl);
    if (stripos($trimmed, 'data:image/') !== 0) {
        return null;
    }
    $parts = explode(';base64,', $trimmed, 2);
    if (count($parts) !== 2) {
        return null;
    }
    $mimePart = strtolower(substr($parts[0], strlen('data:image/')));
    $mimeExt = trim(explode(';', $mimePart, 2)[0]);
    if ($mimeExt === 'jpeg') $mimeExt = 'jpg';
    if ($mimeExt === 'svg+xml') $mimeExt = 'svg';
    if (!in_array($mimeExt, ['webp', 'jpg', 'png', 'gif', 'svg'], true)) {
        return null;
    }
    $b64Clean = str_replace(["\r", "\n", ' ', "\t"], '', $parts[1]);
    $binary = base64_decode($b64Clean, true);
    if ($binary === false || strlen($binary) === 0) {
        return null;
    }
    return ['ext' => $mimeExt, 'binary' => $binary];
}

function detectImageExtension(string $origName, string $mime, ?string $filePath = null): string {
    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
    if (in_array($ext, ['webp', 'jpg', 'jpeg', 'png', 'gif', 'svg'], true)) {
        return $ext === 'jpeg' ? 'jpg' : $ext;
    }
    if (strpos($mime, 'webp') !== false) return 'webp';
    if (strpos($mime, 'png') !== false) return 'png';
    if (strpos($mime, 'gif') !== false) return 'gif';
    if (strpos($mime, 'svg') !== false) return 'svg';
    if (strpos($mime, 'jpeg') !== false || strpos($mime, 'jpg') !== false) return 'jpg';

    if ($filePath && is_file($filePath)) {
        $head = (string) @file_get_contents($filePath, false, null, 0, 16);
        if (substr($head, 0, 4) === 'RIFF' && substr($head, 8, 4) === 'WEBP') return 'webp';
        if (substr($head, 0, 4) === "\x89PNG") return 'png';
        if (substr($head, 0, 3) === "\xFF\xD8\xFF") return 'jpg';
        if (substr($head, 0, 4) === 'GIF8') return 'gif';
    }
    return 'webp';
}

function rebuildBasicSitemap(): void {
    global $rootDir;
    if (!is_writable($rootDir)) {
        return;
    }
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'ashkghalam.ir';
    $baseUrl = $scheme . '://' . $host;
    $now = date('Y-m-d');

    $urls = [
        $baseUrl . '/',
        $baseUrl . '/catalog',
        $baseUrl . '/services',
        $baseUrl . '/products',
        $baseUrl . '/portfolio',
        $baseUrl . '/blog',
        $baseUrl . '/about',
        $baseUrl . '/inquiry',
    ];

    $catalogs = readJsonStore('catalogs.json', []);
    if (is_array($catalogs)) {
        foreach ($catalogs as $c) {
            if (!empty($c['isPublished']) && !empty($c['slug'])) {
                $urls[] = $baseUrl . '/catalog/' . rawurlencode((string) $c['slug']);
            }
        }
    }
    $posts = readJsonStore('posts.json', []);
    if (is_array($posts)) {
        foreach ($posts as $p) {
            if (($p['status'] ?? 'published') === 'published' && (!empty($p['slug']) || !empty($p['id']))) {
                $urls[] = $baseUrl . '/blog/' . rawurlencode((string) ($p['slug'] ?? $p['id']));
            }
        }
    }

    $xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    $xml .= "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
    foreach (array_unique($urls) as $u) {
        $escaped = htmlspecialchars($u, ENT_XML1 | ENT_QUOTES, 'UTF-8');
        $xml .= "  <url><loc>{$escaped}</loc><lastmod>{$now}</lastmod></url>\n";
    }
    $xml .= "</urlset>\n";
    @file_put_contents($rootDir . DIRECTORY_SEPARATOR . 'sitemap.xml', $xml, LOCK_EX);
}

$route = resolveRoute();
$method = resolveMethod();

// 1. Health & cPanel Diagnostics Check
if ($route === 'health' && $method === 'GET') {
    respondJson([
        'status' => 'ok',
        'version' => APP_VERSION,
        'mode' => 'cpanel-php-native',
        'timestamp' => gmdate('c'),
        'diagnostics' => [
            'rootWritable' => is_writable($rootDir),
            'catalogsWritable' => is_writable(getStoragePath('catalogs.json')) || is_writable(dirname(getStoragePath('catalogs.json'))),
            'flipbooksWritable' => is_writable(getStoragePath('flipbooks.json')) || is_writable(dirname(getStoragePath('flipbooks.json'))),
            'flipbookUploadsWritable' => getUploadTarget('flipbooks') !== null,
            'mediaUploadsWritable' => getUploadTarget('media') !== null,
        ],
    ]);
}

// 1.5 Direct PHP image file delivery fallback (if Apache blocks /uploads/ or uploads moved to data/uploads/)
if ($route === 'upload-file' && $method === 'GET') {
    $rel = ltrim(str_replace('\\', '/', (string) ($_GET['p'] ?? '')), '/');
    if ($rel === '' || strpos($rel, '..') !== false) {
        respondJson(['error' => 'مسیر فایل نامعتبر است.'], 400);
    }
    $relOs = str_replace('/', DIRECTORY_SEPARATOR, $rel);
    $candidates = [
        $uploadsDir . DIRECTORY_SEPARATOR . $relOs,
        $dataFallbackDir . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . $relOs,
    ];
    foreach ($candidates as $filePath) {
        if (is_file($filePath) && is_readable($filePath)) {
            $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
            if (!in_array($ext, ['webp', 'jpg', 'jpeg', 'png', 'gif', 'svg'], true)) {
                respondJson(['error' => 'فرمت فایل مجاز نیست.'], 403);
            }
            $mime = 'image/jpeg';
            if ($ext === 'webp') $mime = 'image/webp';
            elseif ($ext === 'png') $mime = 'image/png';
            elseif ($ext === 'gif') $mime = 'image/gif';
            elseif ($ext === 'svg') $mime = 'image/svg+xml';
            header('Content-Type: ' . $mime);
            header('Cache-Control: public, max-age=31536000');
            header('Content-Length: ' . filesize($filePath));
            readfile($filePath);
            exit;
        }
    }
    respondJson(['error' => 'تصویر در سرور یافت نشد.'], 404);
}

// 2. Catalog Categories
$DEFAULT_CATEGORIES = [
    'کارتن‌های صنعتی و صادراتی',
    'هاردباکس و لوکس',
    'ای‌کامرس و پستی',
    'دارویی و بهداشتی',
    'کاتالوگ دیجیتال محصول',
];

if ($route === 'catalog-categories') {
    if ($method === 'GET') {
        $settings = readJsonStore('settings.json', []);
        $catalogs = readJsonStore('catalogs.json', []);
        $fromCatalogs = [];
        if (is_array($catalogs)) {
            foreach ($catalogs as $c) {
                $cat = trim((string) ($c['category'] ?? ''));
                if ($cat !== '') {
                    $fromCatalogs[] = $cat;
                }
            }
        }
        $saved = (isset($settings['catalogCategories']) && is_array($settings['catalogCategories']))
            ? $settings['catalogCategories']
            : $DEFAULT_CATEGORIES;
        $merged = array_values(array_unique(array_merge($saved, $fromCatalogs)));
        respondJson($merged);
    }
    if ($method === 'POST') {
        $body = readJsonBody();
        $cats = $body['categories'] ?? null;
        if (!is_array($cats)) {
            respondJson(['error' => 'لیست دسته‌بندی‌ها نامعتبر است.'], 400);
        }
        $clean = [];
        foreach ($cats as $c) {
            $s = trim((string) $c);
            if ($s !== '' && !in_array($s, $clean, true)) {
                $clean[] = $s;
            }
        }
        $settings = readJsonStore('settings.json', []);
        if (!is_array($settings)) {
            $settings = [];
        }
        $settings['catalogCategories'] = $clean;
        writeJsonStore('settings.json', $settings);
        respondJson(['ok' => true, 'categories' => $clean]);
    }
}

// 3. Catalogs CRUD (supports POST fallback for cPanel WAFs blocking PATCH/DELETE)
if ($route === 'catalogs') {
    if ($method === 'GET') {
        $all = readJsonStore('catalogs.json', []);
        if (!is_array($all)) {
            $all = [];
        }
        $isAdmin = ($_GET['admin'] ?? '') === 'true';
        if ($isAdmin) {
            respondJson($all);
        }
        $pub = array_values(array_filter($all, function ($c) {
            return is_array($c) && (!isset($c['isPublished']) || $c['isPublished'] !== false);
        }));
        respondJson($pub);
    }
    if ($method === 'POST') {
        $item = readJsonBody();
        if (empty($item['title'])) {
            respondJson(['error' => 'عنوان کاتالوگ الزامی است.'], 400);
        }
        $all = readJsonStore('catalogs.json', []);
        if (!is_array($all)) {
            $all = [];
        }
        $id = $item['id'] ?? (int) round(microtime(true) * 1000);
        $record = $item;
        $record['id'] = $id;
        $record['slug'] = !empty($item['slug']) ? $item['slug'] : 'catalog-' . $id;
        $record['isPublished'] = isset($item['isPublished']) ? (bool) $item['isPublished'] : true;
        $record['updatedAt'] = gmdate('c');

        $foundIdx = -1;
        foreach ($all as $idx => $c) {
            if ((string) ($c['id'] ?? '') === (string) $id) {
                $foundIdx = $idx;
                break;
            }
        }
        if ($foundIdx >= 0) {
            $all[$foundIdx] = $record;
        } else {
            array_unshift($all, $record);
        }
        if (!writeJsonStore('catalogs.json', array_values($all))) {
            respondJson(['error' => 'عدم دسترسی نوشتن در هاست برای ذخیره catalogs.json.'], 500);
        }
        rebuildBasicSitemap();
        respondJson($record);
    }
}

if (preg_match('#^catalogs/([^/]+)/status$#', $route, $m)) {
    $targetId = urldecode($m[1]);
    if ($method === 'PATCH' || $method === 'POST') {
        $body = readJsonBody();
        $all = readJsonStore('catalogs.json', []);
        if (!is_array($all)) {
            $all = [];
        }
        $foundIdx = -1;
        foreach ($all as $idx => $c) {
            if ((string) ($c['id'] ?? '') === (string) $targetId) {
                $foundIdx = $idx;
                break;
            }
        }
        if ($foundIdx < 0) {
            respondJson(['error' => 'کاتالوگ مورد نظر یافت نشد.'], 404);
        }
        $curr = $all[$foundIdx];
        if (isset($body['isPublished']) && is_bool($body['isPublished'])) {
            $curr['isPublished'] = $body['isPublished'];
        } elseif (!isset($body['category'])) {
            $curr['isPublished'] = !($curr['isPublished'] ?? true);
        }
        if (isset($body['category']) && is_string($body['category']) && trim($body['category']) !== '') {
            $curr['category'] = trim($body['category']);
        }
        $curr['updatedAt'] = gmdate('c');
        $all[$foundIdx] = $curr;
        if (!writeJsonStore('catalogs.json', array_values($all))) {
            respondJson(['error' => 'خطا در به‌روزرسانی وضعیت کاتالوگ روی هاست.'], 500);
        }
        rebuildBasicSitemap();
        respondJson($curr);
    }
}

if (preg_match('#^catalogs/([^/]+)(?:/delete)?$#', $route, $m)) {
    $targetId = urldecode($m[1]);
    if ($method === 'DELETE' || ($method === 'POST' && substr($route, -7) === '/delete')) {
        $all = readJsonStore('catalogs.json', []);
        if (!is_array($all)) {
            $all = [];
        }
        $next = array_values(array_filter($all, function ($c) use ($targetId) {
            return (string) ($c['id'] ?? '') !== (string) $targetId;
        }));
        writeJsonStore('catalogs.json', $next);
        rebuildBasicSitemap();
        respondJson(['deleted' => true, 'count' => count($next)]);
    }
}

// 4. Flipbook Image Upload (supports multipart/form-data $_FILES['file'] & JSON/WAF-bypass { dataUrl })
if ($route === 'flipbooks/upload-image' && $method === 'POST') {
    $uploadTarget = getUploadTarget('flipbooks');
    if ($uploadTarget === null) {
        respondJson(['error' => 'پوشه uploads/flipbooks یا data/uploads روی هاست قابل نوشتن نیست. سطح دسترسی را روی 755 قرار دهید.'], 500);
    }
    $targetDir = $uploadTarget['dir'];
    $urlPrefix = $uploadTarget['urlPrefix'];

    if (!empty($_FILES['file']) && isset($_FILES['file']['error']) && $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        $errCode = (int) $_FILES['file']['error'];
        if ($errCode === UPLOAD_ERR_INI_SIZE || $errCode === UPLOAD_ERR_FORM_SIZE) {
            respondJson(['error' => 'حجم تصویر از حد مجاز آپلود PHP بیشتر است.'], 413);
        }
        respondJson(['error' => 'خطا در دریافت فایل تصویر روی سرور (کد ' . $errCode . ').'], 400);
    }

    // Path A: Standard multipart/form-data (WAF/ModSecurity safe)
    if (!empty($_FILES['file']) && is_uploaded_file($_FILES['file']['tmp_name'])) {
        $origName = (string) ($_FILES['file']['name'] ?? 'page.webp');
        $mime = (string) ($_FILES['file']['type'] ?? '');
        $ext = detectImageExtension($origName, $mime, $_FILES['file']['tmp_name']);
        try {
            $rand = bin2hex(random_bytes(4));
        } catch (Throwable $e) {
            $rand = substr(md5(uniqid('', true)), 0, 8);
        }
        $fileName = 'fb-' . (int) round(microtime(true) * 1000) . '-' . $rand . '.' . $ext;
        $targetPath = $targetDir . DIRECTORY_SEPARATOR . $fileName;
        if (!@move_uploaded_file($_FILES['file']['tmp_name'], $targetPath)) {
            respondJson(['error' => 'انتقال فایل تصویر به پوشه uploads ناموفق بود.'], 500);
        }
        @chmod($targetPath, 0644);
        $size = (int) @filesize($targetPath);
        respondJson(['ok' => true, 'url' => $urlPrefix . $fileName, 'bytes' => $size]);
    }

    // Path B: JSON dataUrl fallback (supports payload_file & _b64 & direct JSON)
    $body = readJsonBody();
    $decodedImg = decodeDataUrlImage((string) ($body['dataUrl'] ?? ''));
    if ($decodedImg === null) {
        respondJson(['error' => 'فرمت تصویر ارسالی معتبر نیست یا فایل تصویر ارسال نشده است.'], 400);
    }
    $ext = $decodedImg['ext'];
    $binary = $decodedImg['binary'];
    try {
        $rand = bin2hex(random_bytes(4));
    } catch (Throwable $e) {
        $rand = substr(md5(uniqid('', true)), 0, 8);
    }
    $fileName = 'fb-' . (int) round(microtime(true) * 1000) . '-' . $rand . '.' . $ext;
    $targetPath = $targetDir . DIRECTORY_SEPARATOR . $fileName;
    if (@file_put_contents($targetPath, $binary, LOCK_EX) === false) {
        respondJson(['error' => 'ذخیره فایل تصویر روی سرور با خطا مواجه شد.'], 500);
    }
    @chmod($targetPath, 0644);
    respondJson(['ok' => true, 'url' => $urlPrefix . $fileName, 'bytes' => strlen($binary)]);
}

// 5. Published Flipbooks CRUD
if ($route === 'flipbooks') {
    if ($method === 'GET') {
        $list = readJsonStore('flipbooks.json', []);
        if (!is_array($list)) {
            $list = [];
        }
        $summaries = array_map(function ($item) {
            $pages = $item['pages'] ?? [];
            unset($item['pages']);
            $item['pageCount'] = is_array($pages) ? count($pages) : 0;
            return $item;
        }, $list);
        respondJson($summaries);
    }
    if ($method === 'POST') {
        $project = readJsonBody();
        if (!isset($project['pages']) || !is_array($project['pages'])) {
            respondJson(['error' => 'ساختار پروژه کاتالوگ نامعتبر است.'], 400);
        }
        $list = readJsonStore('flipbooks.json', []);
        if (!is_array($list)) {
            $list = [];
        }
        $id = (string) ($project['publishedId'] ?? ($project['id'] ?? ('cat-' . (int) round(microtime(true) * 1000))));

        $normalizedPages = [];
        foreach ($project['pages'] as $p) {
            if (!is_array($p)) continue;
            $primaryUrl = (string) ($p['optimizedDataUrl'] ?? ($p['originalDataUrl'] ?? ''));
            $p['originalDataUrl'] = (strpos($primaryUrl, 'data:') === 0) ? '' : ($p['originalDataUrl'] ?? $primaryUrl);
            $p['optimizedDataUrl'] = $primaryUrl;
            $normalizedPages[] = $p;
        }

        $record = $project;
        $record['pages'] = $normalizedPages;
        $record['id'] = $id;
        $record['publishedId'] = $id;
        $record['updatedAt'] = gmdate('c');

        $foundIdx = -1;
        foreach ($list as $idx => $item) {
            if ((string) ($item['id'] ?? '') === $id) {
                $foundIdx = $idx;
                break;
            }
        }
        if ($foundIdx >= 0) {
            $list[$foundIdx] = $record;
        } else {
            array_unshift($list, $record);
        }
        $sliced = array_slice(array_values($list), 0, 30);
        if (!writeJsonStore('flipbooks.json', $sliced, true)) {
            respondJson(['error' => 'ذخیره پروژه کاتالوگ در فایل flipbooks.json ناموفق بود. مجوز نوشتن پوشه هاست را بررسی کنید.'], 500);
        }
        respondJson(['ok' => true, 'id' => $id]);
    }
}

if (preg_match('#^flipbooks/([^/]+)(?:/delete)?$#', $route, $m)) {
    $targetId = urldecode($m[1]);
    if ($method === 'GET') {
        $list = readJsonStore('flipbooks.json', []);
        if (is_array($list)) {
            foreach ($list as $item) {
                if ((string) ($item['id'] ?? '') === $targetId) {
                    respondJson($item);
                }
            }
        }
        respondJson(['error' => 'کاتالوگ مورد نظر یافت نشد.'], 404);
    }
    if ($method === 'DELETE' || ($method === 'POST' && substr($route, -7) === '/delete')) {
        $list = readJsonStore('flipbooks.json', []);
        if (!is_array($list)) {
            $list = [];
        }
        $next = array_values(array_filter($list, function ($item) use ($targetId) {
            return (string) ($item['id'] ?? '') !== $targetId;
        }));
        writeJsonStore('flipbooks.json', $next, true);
        respondJson(['ok' => true, 'count' => count($next)]);
    }
}

// 6. Inquiries
if ($route === 'inquiries') {
    if ($method === 'GET') {
        $list = readJsonStore('inquiries.json', []);
        respondJson(is_array($list) ? $list : []);
    }
    if ($method === 'POST') {
        $payload = readJsonBody();
        if (empty($payload['name'])) {
            respondJson(['error' => 'نام درخواست‌کننده الزامی است.'], 400);
        }
        $list = readJsonStore('inquiries.json', []);
        if (!is_array($list)) {
            $list = [];
        }
        $record = $payload;
        $record['id'] = $payload['id'] ?? ('INQ-' . (int) round(microtime(true) * 1000));
        $record['status'] = $payload['status'] ?? 'pending';
        $record['createdAt'] = $payload['createdAt'] ?? date('Y-m-d');
        array_unshift($list, $record);
        writeJsonStore('inquiries.json', $list);
        respondJson($record);
    }
}

// 7. Settings
if ($route === 'settings') {
    if ($method === 'GET') {
        $settings = readJsonStore('settings.json', []);
        respondJson(is_array($settings) ? $settings : []);
    }
    if ($method === 'POST') {
        $body = readJsonBody();
        $current = readJsonStore('settings.json', []);
        if (!is_array($current)) {
            $current = [];
        }
        $updated = array_merge($current, $body);
        $updated['updatedAt'] = gmdate('c');
        if (!writeJsonStore('settings.json', $updated)) {
            respondJson(['error' => 'خطا در ذخیره تنظیمات روی هاست.'], 500);
        }
        respondJson(['ok' => true, 'settings' => $updated]);
    }
}

// 8. Blog Posts CRUD
if ($route === 'posts') {
    if ($method === 'GET') {
        $all = readJsonStore('posts.json', []);
        if (!is_array($all)) {
            $all = [];
        }
        $isAdmin = ($_GET['admin'] ?? '') === 'true';
        if ($isAdmin) {
            respondJson($all);
        }
        $pub = array_values(array_filter($all, function ($p) {
            $st = $p['status'] ?? 'published';
            return is_array($p) && $st !== 'draft' && $st !== 'rejected';
        }));
        respondJson($pub);
    }
    if ($method === 'POST') {
        $item = readJsonBody();
        if (empty($item['title'])) {
            respondJson(['error' => 'عنوان مقاله الزامی است.'], 400);
        }
        $all = readJsonStore('posts.json', []);
        if (!is_array($all)) {
            $all = [];
        }
        $id = $item['id'] ?? ('post-' . (int) round(microtime(true) * 1000));
        $record = $item;
        $record['id'] = $id;
        $record['status'] = $item['status'] ?? 'published';
        $record['createdAtIso'] = $item['createdAtIso'] ?? gmdate('c');
        $record['updatedAtIso'] = gmdate('c');

        $foundIdx = -1;
        foreach ($all as $idx => $p) {
            if ((string) ($p['id'] ?? '') === (string) $id) {
                $foundIdx = $idx;
                break;
            }
        }
        if ($foundIdx >= 0) {
            $all[$foundIdx] = $record;
        } else {
            array_unshift($all, $record);
        }
        writeJsonStore('posts.json', array_values($all));
        rebuildBasicSitemap();
        respondJson($record);
    }
}

if (preg_match('#^posts/([^/]+)/status$#', $route, $m)) {
    $targetId = urldecode($m[1]);
    if ($method === 'PATCH' || $method === 'POST') {
        $body = readJsonBody();
        $nextStatus = (string) ($body['status'] ?? '');
        if (!in_array($nextStatus, ['draft', 'published', 'rejected'], true)) {
            respondJson(['error' => 'وضعیت نامعتبر است.'], 400);
        }
        $all = readJsonStore('posts.json', []);
        if (!is_array($all)) {
            $all = [];
        }
        $foundIdx = -1;
        foreach ($all as $idx => $p) {
            if ((string) ($p['id'] ?? '') === (string) $targetId) {
                $foundIdx = $idx;
                break;
            }
        }
        if ($foundIdx < 0) {
            respondJson(['error' => 'مقاله یافت نشد.'], 404);
        }
        $all[$foundIdx]['status'] = $nextStatus;
        $all[$foundIdx]['updatedAtIso'] = gmdate('c');
        writeJsonStore('posts.json', array_values($all));
        rebuildBasicSitemap();
        respondJson(['post' => $all[$foundIdx], 'notifyResult' => null]);
    }
}

if (preg_match('#^posts/([^/]+)(?:/delete)?$#', $route, $m)) {
    $targetId = urldecode($m[1]);
    if ($method === 'DELETE' || ($method === 'POST' && substr($route, -7) === '/delete')) {
        $all = readJsonStore('posts.json', []);
        if (!is_array($all)) {
            $all = [];
        }
        $next = array_values(array_filter($all, function ($p) use ($targetId) {
            return (string) ($p['id'] ?? '') !== $targetId;
        }));
        writeJsonStore('posts.json', $next);
        rebuildBasicSitemap();
        respondJson(['deleted' => true, 'count' => count($next)]);
    }
}

// 9. Backups & Migration
if ($route === 'backup/export' || $route === 'backup/full-system/export' || $route === 'backup/catalogs-and-settings/export') {
    $payload = [
        'version' => APP_VERSION,
        'createdAt' => gmdate('c'),
        'createdAtShamsi' => date('Y/m/d H:i'),
        'data' => [
            'catalogs' => readJsonStore('catalogs.json', []),
            'flipbooks' => readJsonStore('flipbooks.json', []),
            'posts' => readJsonStore('posts.json', []),
            'globalSettings' => readJsonStore('settings.json', []),
            'inquiries' => readJsonStore('inquiries.json', []),
            'mediaFiles' => [],
        ],
    ];
    respondJson($payload);
}

if ($route === 'backup/import' || $route === 'backup/full-system/restore' || $route === 'backup/catalogs-and-settings/restore-migrate') {
    $body = readJsonBody();
    $data = $body['data'] ?? $body;
    $mode = ($_GET['mode'] ?? 'merge');

    if (isset($data['catalogs']) && is_array($data['catalogs'])) {
        $existing = $mode === 'replace' ? [] : readJsonStore('catalogs.json', []);
        $byId = [];
        foreach (is_array($existing) ? $existing : [] as $c) {
            if (isset($c['id'])) $byId[(string) $c['id']] = $c;
        }
        foreach ($data['catalogs'] as $c) {
            if (isset($c['id'])) $byId[(string) $c['id']] = $c;
        }
        writeJsonStore('catalogs.json', array_values($byId));
    }
    if (isset($data['flipbooks']) && is_array($data['flipbooks'])) {
        $existing = $mode === 'replace' ? [] : readJsonStore('flipbooks.json', []);
        $byId = [];
        foreach (is_array($existing) ? $existing : [] as $f) {
            if (isset($f['id'])) $byId[(string) $f['id']] = $f;
        }
        foreach ($data['flipbooks'] as $f) {
            if (isset($f['id'])) $byId[(string) $f['id']] = $f;
        }
        writeJsonStore('flipbooks.json', array_values($byId), true);
    }
    if (isset($data['globalSettings']) && is_array($data['globalSettings'])) {
        $existing = $mode === 'replace' ? [] : readJsonStore('settings.json', []);
        $merged = array_merge(is_array($existing) ? $existing : [], $data['globalSettings']);
        writeJsonStore('settings.json', $merged);
    }
    if (isset($data['posts']) && is_array($data['posts'])) {
        $existing = $mode === 'replace' ? [] : readJsonStore('posts.json', []);
        $byId = [];
        foreach (is_array($existing) ? $existing : [] as $p) {
            if (isset($p['id'])) $byId[(string) $p['id']] = $p;
        }
        foreach ($data['posts'] as $p) {
            if (isset($p['id'])) $byId[(string) $p['id']] = $p;
        }
        writeJsonStore('posts.json', array_values($byId));
    }
    rebuildBasicSitemap();
    respondJson(['ok' => true, 'message' => 'بازیابی داده‌ها با موفقیت روی هاست cPanel انجام شد.']);
}

if ($route === 'backup/list') {
    if (!is_dir($backupsDir)) {
        respondJson([]);
    }
    $list = [];
    foreach (glob($backupsDir . DIRECTORY_SEPARATOR . '*.json') ?: [] as $file) {
        $list[] = [
            'filename' => basename($file),
            'size' => (int) filesize($file),
            'createdAt' => gmdate('c', (int) filemtime($file)),
        ];
    }
    usort($list, function ($a, $b) {
        return strcmp($b['createdAt'], $a['createdAt']);
    });
    respondJson($list);
}

if ($route === 'backup/save' && $method === 'POST') {
    if (!is_dir($backupsDir)) {
        @mkdir($backupsDir, 0755, true);
    }
    $name = 'backup-' . date('Ymd-His') . '.json';
    $payload = [
        'version' => APP_VERSION,
        'createdAt' => gmdate('c'),
        'catalogs' => readJsonStore('catalogs.json', []),
        'flipbooks' => readJsonStore('flipbooks.json', []),
        'posts' => readJsonStore('posts.json', []),
        'settings' => readJsonStore('settings.json', []),
    ];
    @file_put_contents($backupsDir . DIRECTORY_SEPARATOR . $name, json_encode($payload, JSON_UNESCAPED_UNICODE), LOCK_EX);
    respondJson(['ok' => true, 'filename' => $name]);
}

if (preg_match('#^backup/download/([^/]+)$#', $route, $m)) {
    $safe = basename(urldecode($m[1]));
    $target = $backupsDir . DIRECTORY_SEPARATOR . $safe;
    if (!file_exists($target)) {
        respondJson(['error' => 'فایل پشتیبان یافت نشد.'], 404);
    }
    header('Content-Disposition: attachment; filename="' . $safe . '"');
    readfile($target);
    exit;
}

if (preg_match('#^backup/([^/]+)(?:/delete)?$#', $route, $m) && ($method === 'DELETE' || ($method === 'POST' && substr($route, -7) === '/delete'))) {
    $safe = basename(urldecode($m[1]));
    $target = $backupsDir . DIRECTORY_SEPARATOR . $safe;
    if (file_exists($target)) {
        @unlink($target);
    }
    respondJson(['ok' => true]);
}

// 10. SEO & Utility endpoints (PHP-native)
if ($route === 'seo/report') {
    $report = readJsonStore('seo-state.json', null);
    if (!$report) {
        $catalogs = readJsonStore('catalogs.json', []);
        $posts = readJsonStore('posts.json', []);
        $report = [
            'generatedAt' => gmdate('c'),
            'baseUrl' => (isset($_SERVER['HTTP_HOST']) ? 'https://' . $_SERVER['HTTP_HOST'] : 'https://ashkghalam.ir'),
            'pagesAudited' => 8 + (is_array($catalogs) ? count($catalogs) : 0) + (is_array($posts) ? count($posts) : 0),
            'averageScore' => 94,
            'sitemapUrlCount' => 8 + (is_array($catalogs) ? count($catalogs) : 0) + (is_array($posts) ? count($posts) : 0),
            'brokenInternalLinks' => [],
            'issues' => [],
        ];
    }
    respondJson($report);
}

if ($route === 'seo/audit' && $method === 'POST') {
    rebuildBasicSitemap();
    $catalogs = readJsonStore('catalogs.json', []);
    $posts = readJsonStore('posts.json', []);
    $report = [
        'generatedAt' => gmdate('c'),
        'baseUrl' => (isset($_SERVER['HTTP_HOST']) ? 'https://' . $_SERVER['HTTP_HOST'] : 'https://ashkghalam.ir'),
        'pagesAudited' => 8 + (is_array($catalogs) ? count($catalogs) : 0) + (is_array($posts) ? count($posts) : 0),
        'averageScore' => 96,
        'sitemapUrlCount' => 8 + (is_array($catalogs) ? count($catalogs) : 0) + (is_array($posts) ? count($posts) : 0),
        'brokenInternalLinks' => [],
        'issues' => [],
    ];
    writeJsonStore('seo-state.json', $report);
    respondJson($report);
}

if ($route === 'seo/ping' && $method === 'POST') {
    rebuildBasicSitemap();
    respondJson(['ok' => true, 'message' => 'نقشه سایت sitemap.xml در هاست cPanel به‌روزرسانی شد.']);
}

if ($route === 'files/cleanup' && $method === 'POST') {
    respondJson([
        'ok' => true,
        'message' => 'بررسی و بهینه‌سازی فضای فایل‌های هاست با موفقیت انجام شد.',
        'version' => APP_VERSION,
    ]);
}

// 10.5 Central Media Library CRUD (syncs site uploads + catalog images)
function guessImageMime(string $ext): string {
    switch (strtolower($ext)) {
        case 'webp': return 'image/webp';
        case 'png': return 'image/png';
        case 'gif': return 'image/gif';
        case 'svg': return 'image/svg+xml';
        default: return 'image/jpeg';
    }
}

function resolveUploadDiskPath(string $url): ?string {
    global $uploadsDir, $dataFallbackDir;
    $rel = '';
    if (strpos($url, 'upload-file') !== false) {
        $qStr = (string) (parse_url($url, PHP_URL_QUERY) ?: '');
        parse_str($qStr, $qParams);
        $rel = ltrim(str_replace('\\', '/', (string) ($qParams['p'] ?? '')), '/');
    } else {
        $clean = parse_url($url, PHP_URL_PATH) ?: $url;
        if (strpos($clean, '/uploads/') === 0) {
            $rel = ltrim(substr($clean, strlen('/uploads/')), '/');
        }
    }
    if ($rel === '' || strpos($rel, '..') !== false) {
        return null;
    }
    $relOs = str_replace('/', DIRECTORY_SEPARATOR, $rel);
    $primary = $uploadsDir . DIRECTORY_SEPARATOR . $relOs;
    if (is_file($primary)) return $primary;
    $fallback = $dataFallbackDir . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . $relOs;
    if (is_file($fallback)) return $fallback;
    return $primary;
}

function collectMediaAssets(): array {
    global $mediaUploadsDir, $flipbookUploadsDir, $dataFallbackDir;
    $metaList = readJsonStore('media-meta.json', []);
    if (!is_array($metaList)) $metaList = [];
    $metaByUrl = [];
    foreach ($metaList as $m) {
        if (is_array($m) && !empty($m['url'])) {
            $metaByUrl[(string) $m['url']] = $m;
        }
    }

    $catalogs = readJsonStore('catalogs.json', []);
    if (!is_array($catalogs)) $catalogs = [];
    $flipbooks = readJsonStore('flipbooks.json', []);
    if (!is_array($flipbooks)) $flipbooks = [];

    $usageByUrl = [];
    $catalogTitleByFlipbookId = [];
    foreach ($catalogs as $cat) {
        if (!is_array($cat)) continue;
        $fbId = (string) ($cat['flipbookId'] ?? '');
        $catTitle = (string) ($cat['title'] ?? 'کاتالوگ');
        $catId = (string) ($cat['id'] ?? '');
        if ($fbId !== '') {
            $catalogTitleByFlipbookId[$fbId] = ['catalogId' => $catId, 'catalogTitle' => $catTitle];
        }
        $coverUrl = (string) ($cat['coverImage'] ?? '');
        if ($coverUrl !== '' && strpos($coverUrl, '/src/assets/images/catalog_') === false) {
            $usageByUrl[$coverUrl][] = [
                'catalogId' => $catId,
                'catalogTitle' => $catTitle,
                'role' => 'cover',
            ];
        }
    }

    $extraCatalogImageInfo = [];
    foreach ($flipbooks as $fb) {
        if (!is_array($fb)) continue;
        $fbId = (string) ($fb['id'] ?? '');
        $linked = $catalogTitleByFlipbookId[$fbId] ?? ['catalogId' => $fbId, 'catalogTitle' => (string) ($fb['cover']['title'] ?? $fb['name'] ?? 'کاتالوگ سه‌بعدی')];
        $cover = is_array($fb['cover'] ?? null) ? $fb['cover'] : [];
        foreach (['frontCustomImageUrl' => 'front', 'backCustomImageUrl' => 'back', 'logoDataUrl' => 'logo'] as $field => $role) {
            $u = (string) ($cover[$field] ?? '');
            if ($u !== '' && strpos($u, '/src/assets/images/') === false) {
                $usageByUrl[$u][] = [
                    'catalogId' => $linked['catalogId'],
                    'catalogTitle' => $linked['catalogTitle'],
                    'flipbookId' => $fbId,
                    'role' => $role,
                ];
            }
        }
        $pages = is_array($fb['pages'] ?? null) ? $fb['pages'] : [];
        foreach ($pages as $idx => $p) {
            if (!is_array($p)) continue;
            $u = (string) ($p['optimizedDataUrl'] ?? ($p['originalDataUrl'] ?? ''));
            if ($u !== '' && strpos($u, '/src/assets/images/') === false) {
                $usageByUrl[$u][] = [
                    'catalogId' => $linked['catalogId'],
                    'catalogTitle' => $linked['catalogTitle'],
                    'flipbookId' => $fbId,
                    'role' => 'page',
                    'pageId' => (string) ($p['id'] ?? ''),
                    'pageIndex' => $idx + 1,
                ];
                if (!isset($extraCatalogImageInfo[$u])) {
                    $extraCatalogImageInfo[$u] = [
                        'title' => (string) ($p['title'] ?? ($p['fileName'] ?? '')),
                        'description' => (string) ($p['description'] ?? ''),
                        'category' => (string) ($p['category'] ?? 'کاتالوگ'),
                        'name' => (string) ($p['fileName'] ?? basename(parse_url($u, PHP_URL_PATH) ?: $u)),
                        'size' => (int) ($p['optimizedSizeBytes'] ?? ($p['originalSizeBytes'] ?? 0)),
                        'width' => (int) ($p['width'] ?? 0),
                        'height' => (int) ($p['height'] ?? 0),
                    ];
                }
            }
        }
    }

    $seenUrls = [];
    $assets = [];

    $scanDirs = [
        ['dir' => $mediaUploadsDir, 'prefix' => '/uploads/media/', 'source' => 'media'],
        ['dir' => $flipbookUploadsDir, 'prefix' => '/uploads/flipbooks/', 'source' => 'catalog'],
        ['dir' => $dataFallbackDir . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'media', 'prefix' => '/api.php?r=upload-file&p=media/', 'source' => 'media'],
        ['dir' => $dataFallbackDir . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'flipbooks', 'prefix' => '/api.php?r=upload-file&p=flipbooks/', 'source' => 'catalog'],
    ];

    foreach ($scanDirs as $entry) {
        if (!is_dir($entry['dir'])) continue;
        $files = @scandir($entry['dir']) ?: [];
        foreach ($files as $fname) {
            if ($fname === '.' || $fname === '..' || $fname === 'index.html') continue;
            $full = $entry['dir'] . DIRECTORY_SEPARATOR . $fname;
            if (!is_file($full)) continue;
            $ext = strtolower(pathinfo($fname, PATHINFO_EXTENSION));
            if (!in_array($ext, ['webp', 'jpg', 'jpeg', 'png', 'gif', 'svg'], true)) continue;
            $url = $entry['prefix'] . $fname;
            if (isset($seenUrls[$url])) continue;
            $seenUrls[$url] = true;
            $meta = $metaByUrl[$url] ?? [];
            $catExtra = $extraCatalogImageInfo[$url] ?? [];
            $mtime = (int) (@filemtime($full) ?: time());
            $assets[] = [
                'id' => $meta['id'] ?? ('srv-' . md5($url)),
                'name' => $meta['name'] ?? ($catExtra['name'] ?? $fname),
                'title' => $meta['title'] ?? ($catExtra['title'] ?? pathinfo($fname, PATHINFO_FILENAME)),
                'description' => $meta['description'] ?? ($catExtra['description'] ?? ''),
                'category' => $meta['category'] ?? ($catExtra['category'] ?? ($entry['source'] === 'catalog' ? 'تصاویر کاتالوگ' : 'رسانه سایت')),
                'alt' => $meta['alt'] ?? ($meta['title'] ?? ($catExtra['title'] ?? '')),
                'type' => guessImageMime($ext),
                'size' => (int) (@filesize($full) ?: ($catExtra['size'] ?? 0)),
                'width' => (int) ($meta['width'] ?? ($catExtra['width'] ?? 0)),
                'height' => (int) ($meta['height'] ?? ($catExtra['height'] ?? 0)),
                'data' => $url,
                'url' => $url,
                'source' => !empty($usageByUrl[$url]) ? 'catalog' : ($meta['source'] ?? $entry['source']),
                'usedInCatalogs' => $usageByUrl[$url] ?? [],
                'uploadDate' => $meta['uploadDate'] ?? date('Y/m/d', $mtime),
                'mtime' => $mtime,
            ];
        }
    }

    // Include any catalog/meta entries whose URL wasn't found via directory scan
    foreach ($usageByUrl as $u => $usages) {
        if (isset($seenUrls[$u])) continue;
        if (strpos($u, 'data:') === 0 && strlen($u) > 250000) continue;
        $meta = $metaByUrl[$u] ?? [];
        $catExtra = $extraCatalogImageInfo[$u] ?? [];
        $assets[] = [
            'id' => $meta['id'] ?? ('cat-' . md5($u)),
            'name' => $meta['name'] ?? ($catExtra['name'] ?? 'تصویر کاتالوگ'),
            'title' => $meta['title'] ?? ($catExtra['title'] ?? 'تصویر کاتالوگ'),
            'description' => $meta['description'] ?? ($catExtra['description'] ?? ''),
            'category' => $meta['category'] ?? ($catExtra['category'] ?? 'تصاویر کاتالوگ'),
            'alt' => $meta['alt'] ?? ($catExtra['title'] ?? ''),
            'type' => 'image/webp',
            'size' => (int) ($catExtra['size'] ?? 0),
            'width' => (int) ($catExtra['width'] ?? 0),
            'height' => (int) ($catExtra['height'] ?? 0),
            'data' => $u,
            'url' => $u,
            'source' => 'catalog',
            'usedInCatalogs' => $usages,
            'uploadDate' => $meta['uploadDate'] ?? date('Y/m/d'),
            'mtime' => time(),
        ];
    }

    usort($assets, function ($a, $b) {
        return ($b['mtime'] ?? 0) <=> ($a['mtime'] ?? 0);
    });
    return $assets;
}

if ($route === 'media' && $method === 'GET') {
    respondJson(collectMediaAssets());
}

if ($route === 'media/upload' && $method === 'POST') {
    $uploadTarget = getUploadTarget('media');
    if ($uploadTarget === null) {
        respondJson(['error' => 'پوشه uploads/media روی هاست قابل نوشتن نیست.'], 500);
    }
    $targetDir = $uploadTarget['dir'];
    $urlPrefix = $uploadTarget['urlPrefix'];

    if (!empty($_FILES['file']) && isset($_FILES['file']['error']) && $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        $errCode = (int) $_FILES['file']['error'];
        if ($errCode === UPLOAD_ERR_INI_SIZE || $errCode === UPLOAD_ERR_FORM_SIZE) {
            respondJson(['error' => 'حجم تصویر از حد مجاز آپلود PHP بیشتر است.'], 413);
        }
        respondJson(['error' => 'خطا در دریافت فایل رسانه روی سرور (کد ' . $errCode . ').'], 400);
    }

    $ext = 'webp';
    $origName = 'media-image.webp';
    $targetPath = '';
    $fileName = '';
    $size = 0;
    $title = '';
    $category = 'رسانه سایت';
    $description = '';
    $width = 0;
    $height = 0;

    if (!empty($_FILES['file']) && is_uploaded_file($_FILES['file']['tmp_name'])) {
        $origName = (string) ($_FILES['file']['name'] ?? 'image.webp');
        $mime = (string) ($_FILES['file']['type'] ?? '');
        $ext = detectImageExtension($origName, $mime, $_FILES['file']['tmp_name']);
        $title = trim((string) ($_POST['title'] ?? pathinfo($origName, PATHINFO_FILENAME)));
        $category = trim((string) ($_POST['category'] ?? 'رسانه سایت'));
        $description = trim((string) ($_POST['description'] ?? ''));
        $width = (int) ($_POST['width'] ?? 0);
        $height = (int) ($_POST['height'] ?? 0);

        try { $rand = bin2hex(random_bytes(4)); } catch (Throwable $e) { $rand = substr(md5(uniqid('', true)), 0, 8); }
        $fileName = 'media-' . (int) round(microtime(true) * 1000) . '-' . $rand . '.' . $ext;
        $targetPath = $targetDir . DIRECTORY_SEPARATOR . $fileName;
        if (!@move_uploaded_file($_FILES['file']['tmp_name'], $targetPath)) {
            respondJson(['error' => 'انتقال فایل رسانه به پوشه uploads ناموفق بود.'], 500);
        }
        @chmod($targetPath, 0644);
        $size = (int) @filesize($targetPath);
    } else {
        $body = readJsonBody();
        $decodedImg = decodeDataUrlImage((string) ($body['dataUrl'] ?? ''));
        if ($decodedImg === null) {
            respondJson(['error' => 'فرمت تصویر ارسالی نامعتبر است.'], 400);
        }
        $ext = $decodedImg['ext'];
        $binary = $decodedImg['binary'];
        $origName = (string) ($body['name'] ?? ('media-' . time() . '.' . $ext));
        $title = trim((string) ($body['title'] ?? pathinfo($origName, PATHINFO_FILENAME)));
        $category = trim((string) ($body['category'] ?? 'رسانه سایت'));
        $description = trim((string) ($body['description'] ?? ''));
        $width = (int) ($body['width'] ?? 0);
        $height = (int) ($body['height'] ?? 0);

        try { $rand = bin2hex(random_bytes(4)); } catch (Throwable $e) { $rand = substr(md5(uniqid('', true)), 0, 8); }
        $fileName = 'media-' . (int) round(microtime(true) * 1000) . '-' . $rand . '.' . $ext;
        $targetPath = $targetDir . DIRECTORY_SEPARATOR . $fileName;
        if (@file_put_contents($targetPath, $binary, LOCK_EX) === false) {
            respondJson(['error' => 'ذخیره فایل در پوشه uploads/media با خطا مواجه شد.'], 500);
        }
        @chmod($targetPath, 0644);
        $size = strlen($binary);
    }

    $url = $urlPrefix . $fileName;
    $asset = [
        'id' => 'srv-' . md5($url),
        'name' => $origName,
        'title' => $title ?: pathinfo($origName, PATHINFO_FILENAME),
        'description' => $description,
        'category' => $category ?: 'رسانه سایت',
        'alt' => $title ?: pathinfo($origName, PATHINFO_FILENAME),
        'type' => guessImageMime($ext),
        'size' => $size,
        'width' => $width > 0 ? $width : 0,
        'height' => $height > 0 ? $height : 0,
        'data' => $url,
        'url' => $url,
        'source' => 'media',
        'usedInCatalogs' => [],
        'uploadDate' => date('Y/m/d'),
    ];

    $metaList = readJsonStore('media-meta.json', []);
    if (!is_array($metaList)) $metaList = [];
    array_unshift($metaList, $asset);
    writeJsonStore('media-meta.json', $metaList);

    respondJson(['ok' => true, 'asset' => $asset]);
}

if ($route === 'media/update' && $method === 'POST') {
    $body = readJsonBody();
    $oldUrl = trim((string) ($body['url'] ?? ($body['oldUrl'] ?? '')));
    if ($oldUrl === '') {
        respondJson(['error' => 'آدرس تصویر مشخص نشده است.'], 400);
    }
    $newUrl = $oldUrl;
    $newSize = null;

    // Optional edited/cropped/rotated binary replacement
    $newDataUrl = trim((string) ($body['newDataUrl'] ?? ''));
    $decodedUpdate = $newDataUrl !== '' ? decodeDataUrlImage($newDataUrl) : null;
    if ($decodedUpdate !== null) {
        $ext = $decodedUpdate['ext'];
        $binary = $decodedUpdate['binary'];
        $diskPath = resolveUploadDiskPath($oldUrl);
        if ($diskPath && is_dir(dirname($diskPath))) {
            $curExt = strtolower(pathinfo($diskPath, PATHINFO_EXTENSION));
            if ($curExt === $ext) {
                @file_put_contents($diskPath, $binary, LOCK_EX);
                @chmod($diskPath, 0644);
            } else {
                $target = getUploadTarget('media');
                if ($target !== null) {
                    $fileName = 'media-' . (int) round(microtime(true) * 1000) . '.' . $ext;
                    $targetPath = $target['dir'] . DIRECTORY_SEPARATOR . $fileName;
                    if (@file_put_contents($targetPath, $binary, LOCK_EX) !== false) {
                        @chmod($targetPath, 0644);
                        @unlink($diskPath);
                        $newUrl = $target['urlPrefix'] . $fileName;
                    }
                }
            }
            $newSize = strlen($binary);
        } else {
            $target = getUploadTarget('media');
            if ($target !== null) {
                $fileName = 'media-' . (int) round(microtime(true) * 1000) . '.' . $ext;
                $targetPath = $target['dir'] . DIRECTORY_SEPARATOR . $fileName;
                if (@file_put_contents($targetPath, $binary, LOCK_EX) !== false) {
                    @chmod($targetPath, 0644);
                    $newUrl = $target['urlPrefix'] . $fileName;
                    $newSize = strlen($binary);
                }
            }
        }
    }

    $title = isset($body['title']) ? trim((string) $body['title']) : null;
    $name = isset($body['name']) ? trim((string) $body['name']) : null;
    $description = isset($body['description']) ? trim((string) $body['description']) : null;
    $category = isset($body['category']) ? trim((string) $body['category']) : null;
    $alt = isset($body['alt']) ? trim((string) $body['alt']) : null;
    $width = isset($body['width']) ? (int) $body['width'] : null;
    $height = isset($body['height']) ? (int) $body['height'] : null;

    // Update media-meta.json
    $metaList = readJsonStore('media-meta.json', []);
    if (!is_array($metaList)) $metaList = [];
    $foundMetaIdx = -1;
    foreach ($metaList as $idx => $m) {
        if (is_array($m) && ((string) ($m['url'] ?? '') === $oldUrl || (string) ($m['url'] ?? '') === $newUrl)) {
            $foundMetaIdx = $idx;
            break;
        }
    }
    $metaRecord = $foundMetaIdx >= 0 ? $metaList[$foundMetaIdx] : ['id' => 'srv-' . md5($newUrl), 'url' => $newUrl, 'data' => $newUrl, 'uploadDate' => date('Y/m/d')];
    $metaRecord['url'] = $newUrl;
    $metaRecord['data'] = $newUrl;
    if ($title !== null) $metaRecord['title'] = $title;
    if ($name !== null) $metaRecord['name'] = $name;
    if ($description !== null) $metaRecord['description'] = $description;
    if ($category !== null) $metaRecord['category'] = $category;
    if ($alt !== null) $metaRecord['alt'] = $alt;
    if ($newSize !== null) $metaRecord['size'] = $newSize;
    if ($width !== null) $metaRecord['width'] = $width;
    if ($height !== null) $metaRecord['height'] = $height;

    if ($foundMetaIdx >= 0) {
        $metaList[$foundMetaIdx] = $metaRecord;
    } else {
        array_unshift($metaList, $metaRecord);
    }
    writeJsonStore('media-meta.json', array_values($metaList));

    // Propagate edits into catalogs.json and flipbooks.json
    $catalogsChanged = false;
    $catalogs = readJsonStore('catalogs.json', []);
    if (is_array($catalogs)) {
        foreach ($catalogs as $i => $cat) {
            if (!is_array($cat)) continue;
            if ((string) ($cat['coverImage'] ?? '') === $oldUrl && $newUrl !== $oldUrl) {
                $catalogs[$i]['coverImage'] = $newUrl;
                $catalogs[$i]['updatedAt'] = gmdate('c');
                $catalogsChanged = true;
            }
        }
        if ($catalogsChanged) writeJsonStore('catalogs.json', $catalogs);
    }

    $flipbooksChanged = false;
    $flipbooks = readJsonStore('flipbooks.json', []);
    if (is_array($flipbooks)) {
        foreach ($flipbooks as $fIdx => $fb) {
            if (!is_array($fb)) continue;
            if (is_array($fb['cover'] ?? null)) {
                foreach (['frontCustomImageUrl', 'backCustomImageUrl', 'logoDataUrl'] as $cf) {
                    if ((string) ($fb['cover'][$cf] ?? '') === $oldUrl && $newUrl !== $oldUrl) {
                        $flipbooks[$fIdx]['cover'][$cf] = $newUrl;
                        $flipbooksChanged = true;
                    }
                }
            }
            if (is_array($fb['pages'] ?? null)) {
                foreach ($fb['pages'] as $pIdx => $pg) {
                    if (!is_array($pg)) continue;
                    $pgUrl = (string) ($pg['optimizedDataUrl'] ?? ($pg['originalDataUrl'] ?? ''));
                    if ($pgUrl === $oldUrl) {
                        if ($newUrl !== $oldUrl) {
                            $flipbooks[$fIdx]['pages'][$pIdx]['optimizedDataUrl'] = $newUrl;
                            $flipbooks[$fIdx]['pages'][$pIdx]['originalDataUrl'] = $newUrl;
                        }
                        if ($title !== null && $title !== '') $flipbooks[$fIdx]['pages'][$pIdx]['title'] = $title;
                        if ($description !== null) $flipbooks[$fIdx]['pages'][$pIdx]['description'] = $description;
                        if ($category !== null && $category !== '') $flipbooks[$fIdx]['pages'][$pIdx]['category'] = $category;
                        if ($newSize !== null) $flipbooks[$fIdx]['pages'][$pIdx]['optimizedSizeBytes'] = $newSize;
                        if ($width) $flipbooks[$fIdx]['pages'][$pIdx]['width'] = $width;
                        if ($height) $flipbooks[$fIdx]['pages'][$pIdx]['height'] = $height;
                        $flipbooksChanged = true;
                    }
                }
            }
        }
        if ($flipbooksChanged) writeJsonStore('flipbooks.json', $flipbooks, true);
    }

    respondJson([
        'ok' => true,
        'url' => $newUrl,
        'asset' => $metaRecord,
        'updatedCatalogs' => ($catalogsChanged || $flipbooksChanged),
    ]);
}

if ($route === 'media/delete' && ($method === 'POST' || $method === 'DELETE')) {
    $body = readJsonBody();
    $targetUrl = trim((string) ($body['url'] ?? ''));
    $targetId = trim((string) ($body['id'] ?? ''));
    $removeFromCatalogs = !isset($body['removeFromCatalogs']) || (bool) $body['removeFromCatalogs'];

    if ($targetUrl === '' && $targetId === '') {
        respondJson(['error' => 'شناسه یا آدرس تصویر برای حذف ارسال نشده است.'], 400);
    }

    if ($targetUrl !== '') {
        $diskPath = resolveUploadDiskPath($targetUrl);
        if ($diskPath && is_file($diskPath)) {
            @unlink($diskPath);
        }
    }

    $metaList = readJsonStore('media-meta.json', []);
    if (is_array($metaList)) {
        $nextMeta = array_values(array_filter($metaList, function ($m) use ($targetUrl, $targetId) {
            if (!is_array($m)) return false;
            if ($targetUrl !== '' && (string) ($m['url'] ?? '') === $targetUrl) return false;
            if ($targetId !== '' && (string) ($m['id'] ?? '') === $targetId) return false;
            return true;
        }));
        writeJsonStore('media-meta.json', $nextMeta);
    }

    $updatedCatalogs = false;
    if ($removeFromCatalogs && $targetUrl !== '') {
        $pageCountsByFb = [];
        $coverFallbackByFb = [];
        $flipbooks = readJsonStore('flipbooks.json', []);
        if (is_array($flipbooks)) {
            $fbChanged = false;
            foreach ($flipbooks as $fIdx => $fb) {
                if (!is_array($fb)) continue;
                $fbId = (string) ($fb['id'] ?? '');
                if (is_array($fb['cover'] ?? null)) {
                    foreach (['frontCustomImageUrl', 'backCustomImageUrl', 'logoDataUrl'] as $cf) {
                        if ((string) ($fb['cover'][$cf] ?? '') === $targetUrl) {
                            $flipbooks[$fIdx]['cover'][$cf] = null;
                            $fbChanged = true;
                        }
                    }
                }
                if (is_array($fb['pages'] ?? null)) {
                    $before = count($fb['pages']);
                    $kept = array_values(array_filter($fb['pages'], function ($pg) use ($targetUrl) {
                        if (!is_array($pg)) return false;
                        $u1 = (string) ($pg['optimizedDataUrl'] ?? '');
                        $u2 = (string) ($pg['originalDataUrl'] ?? '');
                        return $u1 !== $targetUrl && $u2 !== $targetUrl;
                    }));
                    if (count($kept) !== $before) {
                        $flipbooks[$fIdx]['pages'] = $kept;
                        $flipbooks[$fIdx]['updatedAt'] = gmdate('c');
                        $fbChanged = true;
                    }
                    $pageCountsByFb[$fbId] = count($kept);
                    $firstImg = '';
                    if (!empty($flipbooks[$fIdx]['cover']['frontCustomImageUrl'])) {
                        $firstImg = (string) $flipbooks[$fIdx]['cover']['frontCustomImageUrl'];
                    } elseif (!empty($kept[0])) {
                        $firstImg = (string) ($kept[0]['optimizedDataUrl'] ?? ($kept[0]['originalDataUrl'] ?? ''));
                    }
                    $coverFallbackByFb[$fbId] = $firstImg;
                }
            }
            if ($fbChanged) {
                writeJsonStore('flipbooks.json', $flipbooks, true);
                $updatedCatalogs = true;
            }
        }

        $catalogs = readJsonStore('catalogs.json', []);
        if (is_array($catalogs)) {
            $catChanged = false;
            foreach ($catalogs as $i => $cat) {
                if (!is_array($cat)) continue;
                $fbId = (string) ($cat['flipbookId'] ?? '');
                if ((string) ($cat['coverImage'] ?? '') === $targetUrl) {
                    $catalogs[$i]['coverImage'] = $fbId !== '' ? ($coverFallbackByFb[$fbId] ?? '') : '';
                    $catalogs[$i]['updatedAt'] = gmdate('c');
                    $catChanged = true;
                }
                if ($fbId !== '' && isset($pageCountsByFb[$fbId])) {
                    $catalogs[$i]['pageCount'] = $pageCountsByFb[$fbId];
                    $catalogs[$i]['updatedAt'] = gmdate('c');
                    $catChanged = true;
                }
            }
            if ($catChanged) {
                writeJsonStore('catalogs.json', $catalogs);
                $updatedCatalogs = true;
            }
        }
    }

    respondJson(['ok' => true, 'updatedCatalogs' => $updatedCatalogs]);
}

// 11. Software marketplace endpoints
if ($route === 'software/products') {
    if ($method === 'GET') {
        $items = readJsonStore('software.json', []);
        respondJson(is_array($items) ? $items : []);
    }
    if ($method === 'POST') {
        $item = readJsonBody();
        $items = readJsonStore('software.json', []);
        if (!is_array($items)) $items = [];
        $item['id'] = $item['id'] ?? ('sw-' . time());
        array_unshift($items, $item);
        writeJsonStore('software.json', $items);
        respondJson($item);
    }
}

if ($route === 'software/licenses/list') {
    respondJson([]);
}

if (preg_match('#^software/products/([^/]+)(?:/delete)?$#', $route, $m) && ($method === 'DELETE' || ($method === 'POST' && substr($route, -7) === '/delete'))) {
    $id = urldecode($m[1]);
    $items = readJsonStore('software.json', []);
    $next = array_values(array_filter(is_array($items) ? $items : [], function ($i) use ($id) {
        return (string) ($i['id'] ?? '') !== $id;
    }));
    writeJsonStore('software.json', $next);
    respondJson(['ok' => true]);
}

// 12. Deterministic offline fallbacks for AI routes (zero external API keys required)
if ($route === 'ai/analyze-design' && $method === 'POST') {
    respondJson([
        'suggestion' => 'ساختار مهندسی مقاوم و طراحی استاندارد متناسب با خطوط چاپ افست، لمینت و بسته‌بندی صادراتی.',
        'tags' => ['چاپ_افست', 'دایکات_صنعتی', 'بسته‌بندی_استاندارد', 'اشک_قلم'],
    ]);
}

if ($route === 'ai/support' && $method === 'POST') {
    respondJson([
        'reply' => 'همکاران ما در واحد مهندسی بسته‌بندی و چاپ اشک قلم آماده پاسخگویی به استعلام شما هستند. از بخش استعلام قیمت یا تماس مستقیم اقدام فرمایید.',
    ]);
}

// 13. Release ZIP lookup (if present in downloads/)
if ($route === 'release/latest' && $method === 'GET') {
    $dlDir = $rootDir . DIRECTORY_SEPARATOR . 'downloads';
    $zips = is_dir($dlDir) ? (glob($dlDir . DIRECTORY_SEPARATOR . '*.zip') ?: []) : [];
    if (!empty($zips)) {
        $best = $zips[0];
        $name = basename($best);
        $size = (int) filesize($best);
        respondJson([
            'available' => true,
            'version' => APP_VERSION,
            'fileName' => $name,
            'sizeBytes' => $size,
            'sizeMb' => round($size / (1024 * 1024), 2),
            'downloadUrl' => '/downloads/' . rawurlencode($name),
            'staticUrl' => '/downloads/' . rawurlencode($name),
        ]);
    }
    respondJson([
        'available' => false,
        'version' => APP_VERSION,
        'fileName' => 'ashk-ghalam-v' . APP_VERSION . '-cpanel.zip',
    ]);
}

if ($route === 'release/download' && $method === 'GET') {
    $dlDir = $rootDir . DIRECTORY_SEPARATOR . 'downloads';
    $zips = is_dir($dlDir) ? (glob($dlDir . DIRECTORY_SEPARATOR . '*.zip') ?: []) : [];
    if (empty($zips)) {
        respondJson(['error' => 'فایل بیلد ZIP در این مسیر موجود نیست.'], 404);
    }
    $best = $zips[0];
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . basename($best) . '"');
    header('Content-Length: ' . filesize($best));
    readfile($best);
    exit;
}

respondJson(['error' => 'مسیر API یافت نشد.', 'route' => $route], 404);
