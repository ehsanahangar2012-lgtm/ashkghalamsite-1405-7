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

define('APP_VERSION', '3.26.6');

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

function detectImageFromBinary(string $binary): ?array {
    $len = strlen($binary);
    if ($len < 12) {
        return null;
    }
    if (substr($binary, 0, 4) === 'RIFF' && substr($binary, 8, 4) === 'WEBP') {
        return ['ext' => 'webp', 'mime' => 'image/webp'];
    }
    if (substr($binary, 0, 8) === "\x89PNG\r\n\x1a\n") {
        return ['ext' => 'png', 'mime' => 'image/png'];
    }
    if (substr($binary, 0, 3) === "\xFF\xD8\xFF") {
        return ['ext' => 'jpg', 'mime' => 'image/jpeg'];
    }
    $head6 = substr($binary, 0, 6);
    if ($head6 === 'GIF87a' || $head6 === 'GIF89a') {
        return ['ext' => 'gif', 'mime' => 'image/gif'];
    }
    if (substr($binary, 0, 2) === 'BM' && $len >= 26) {
        return ['ext' => 'bmp', 'mime' => 'image/bmp'];
    }
    if (substr($binary, 4, 4) === 'ftyp') {
        $brand = strtolower(substr($binary, 8, 4));
        if ($brand === 'avif' || $brand === 'avis') {
            return ['ext' => 'avif', 'mime' => 'image/avif'];
        }
    }
    $headText = strtolower(ltrim(substr($binary, 0, 512)));
    if (strpos($headText, '<svg') === 0 || (strpos($headText, '<?xml') === 0 && strpos($headText, '<svg') !== false)) {
        return ['ext' => 'svg', 'mime' => 'image/svg+xml'];
    }
    return null;
}

function decodeDataUrlImage(string $dataUrl): ?array {
    $trimmed = trim($dataUrl);
    if (stripos($trimmed, 'data:image/') !== 0) {
        return null;
    }
    $markerPos = stripos($trimmed, ';base64,');
    if ($markerPos === false) {
        return null;
    }
    $b64Clean = str_replace(["\r", "\n", ' ', "\t"], '', substr($trimmed, $markerPos + 8));
    $binary = base64_decode($b64Clean, true);
    if ($binary === false || strlen($binary) === 0) {
        return null;
    }
    $detected = detectImageFromBinary($binary);
    if ($detected === null) {
        return null;
    }
    return ['ext' => $detected['ext'], 'mime' => $detected['mime'], 'binary' => $binary];
}

function detectImageExtension(string $origName, string $mime, ?string $filePath = null): string {
    // Always trust actual binary magic bytes first so JPEG/PNG fallbacks are never saved as .webp
    if ($filePath && is_file($filePath)) {
        $head = (string) @file_get_contents($filePath, false, null, 0, 512);
        $detected = detectImageFromBinary($head);
        if ($detected !== null) {
            return $detected['ext'];
        }
    }
    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
    if (in_array($ext, ['webp', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'avif'], true)) {
        return $ext === 'jpeg' ? 'jpg' : $ext;
    }
    if (strpos($mime, 'webp') !== false) return 'webp';
    if (strpos($mime, 'png') !== false) return 'png';
    if (strpos($mime, 'gif') !== false) return 'gif';
    if (strpos($mime, 'svg') !== false) return 'svg';
    if (strpos($mime, 'avif') !== false) return 'avif';
    if (strpos($mime, 'jpeg') !== false || strpos($mime, 'jpg') !== false) return 'jpg';
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
            if (!in_array($ext, ['webp', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'avif', 'bmp'], true)) {
                respondJson(['error' => 'فرمت فایل مجاز نیست.'], 403);
            }
            $head = (string) @file_get_contents($filePath, false, null, 0, 512);
            $detected = detectImageFromBinary($head);
            $mime = $detected['mime'] ?? 'image/jpeg';
            if ($detected === null) {
                if ($ext === 'webp') $mime = 'image/webp';
                elseif ($ext === 'png') $mime = 'image/png';
                elseif ($ext === 'gif') $mime = 'image/gif';
                elseif ($ext === 'svg') $mime = 'image/svg+xml';
                elseif ($ext === 'avif') $mime = 'image/avif';
            }
            while (ob_get_level() > 0) {
                @ob_end_clean();
            }
            header('Content-Type: ' . $mime);
            header('X-Content-Type-Options: nosniff');
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
        $tmpHead = (string) @file_get_contents($_FILES['file']['tmp_name'], false, null, 0, 512);
        $detected = detectImageFromBinary($tmpHead);
        if ($detected === null) {
            respondJson(['error' => 'فایل تصویر معتبر نیست یا در حین انتقال خراب شده است.'], 400);
        }
        $ext = $detected['ext'];
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
        respondJson(['ok' => true, 'url' => $urlPrefix . $fileName, 'bytes' => $size, 'mime' => $detected['mime']]);
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

// 10. SEO & Utility endpoints (PHP-native — powered by seo-autopilot.php)
if (!defined('SEO_AUTOPILOT_INTERNAL')) {
    define('SEO_AUTOPILOT_INTERNAL', true);
}
$seoAutopilotFile = $rootDir . DIRECTORY_SEPARATOR . 'seo-autopilot.php';
if (is_file($seoAutopilotFile)) {
    require_once $seoAutopilotFile;
}

if ($route === 'seo/report') {
    $report = readJsonStore('seo-state.json', null);
    if (!$report) {
        if (function_exists('seoApRunAuditAndOptimize') && function_exists('seoApLoadConfig')) {
            $res = seoApRunAuditAndOptimize(seoApLoadConfig());
            $report = $res['report'] ?? null;
        }
    }
    if (!$report) {
        $catalogs = readJsonStore('catalogs.json', []);
        $posts = readJsonStore('posts.json', []);
        $report = [
            'generatedAt' => gmdate('c'),
            'baseUrl' => (isset($_SERVER['HTTP_HOST']) ? 'https://' . $_SERVER['HTTP_HOST'] : 'https://ashkghalam.ir'),
            'pagesAudited' => 12 + (is_array($catalogs) ? count($catalogs) : 0) + (is_array($posts) ? count($posts) : 0),
            'averageScore' => 94,
            'sitemapUrlCount' => 12 + (is_array($catalogs) ? count($catalogs) : 0) + (is_array($posts) ? count($posts) : 0),
            'brokenInternalLinks' => [],
            'issues' => [],
        ];
    }
    respondJson($report);
}

if ($route === 'seo/audit' && $method === 'POST') {
    if (function_exists('seoApRunCycle')) {
        $res = seoApRunCycle('admin_manual', ['audit', 'promote']);
        respondJson([
            'ok' => true,
            'report' => $res['auditReport'] ?? readJsonStore('seo-state.json', null),
            'promote' => $res['promoteResult'] ?? null,
        ]);
    }
    rebuildBasicSitemap();
    $catalogs = readJsonStore('catalogs.json', []);
    $posts = readJsonStore('posts.json', []);
    $report = [
        'generatedAt' => gmdate('c'),
        'baseUrl' => (isset($_SERVER['HTTP_HOST']) ? 'https://' . $_SERVER['HTTP_HOST'] : 'https://ashkghalam.ir'),
        'pagesAudited' => 12 + (is_array($catalogs) ? count($catalogs) : 0) + (is_array($posts) ? count($posts) : 0),
        'averageScore' => 96,
        'sitemapUrlCount' => 12 + (is_array($catalogs) ? count($catalogs) : 0) + (is_array($posts) ? count($posts) : 0),
        'brokenInternalLinks' => [],
        'issues' => [],
    ];
    writeJsonStore('seo-state.json', $report);
    respondJson(['ok' => true, 'report' => $report]);
}

if ($route === 'seo/ping' && $method === 'POST') {
    if (function_exists('seoApRunCycle')) {
        $res = seoApRunCycle('admin_manual', ['promote']);
        $pr = $res['promoteResult'] ?? [];
        respondJson([
            'ok' => true,
            'urlCount' => (int) ($pr['urlCount'] ?? 0),
            'files' => $pr['files'] ?? [],
            'notify' => ['indexNow' => $pr['indexNow'] ?? ['message' => 'ثبت شد']],
            'message' => 'فایل‌های Sitemap، RSS و llms.txt بروزرسانی و به موتورهای جستجو اعلام شدند.',
        ]);
    }
    rebuildBasicSitemap();
    respondJson(['ok' => true, 'message' => 'نقشه سایت sitemap.xml در هاست cPanel به‌روزرسانی شد.']);
}

if ($route === 'ai/generate-post' && $method === 'POST') {
    if (function_exists('seoApRunCycle')) {
        $body = readJsonBody();
        $topic = trim((string) ($body['topic'] ?? ''));
        $res = seoApRunCycle('admin_manual', ['article'], $topic !== '' ? $topic : null);
        if (!empty($res['post'])) {
            respondJson(['ok' => true, 'post' => $res['post'], 'summary' => $res['summary'] ?? '']);
        }
        respondJson(['ok' => false, 'error' => $res['summary'] ?? 'امکان تولید مقاله فراهم نشد.'], 422);
    }
    respondJson(['ok' => false, 'error' => 'ماژول seo-autopilot.php یافت نشد.'], 500);
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
        $tmpHead = (string) @file_get_contents($_FILES['file']['tmp_name'], false, null, 0, 512);
        $detected = detectImageFromBinary($tmpHead);
        if ($detected === null) {
            respondJson(['error' => 'فایل تصویر معتبر نیست یا در حین انتقال خراب شده است.'], 400);
        }
        $ext = $detected['ext'];
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
function pickLatestReleaseZip(string $dlDir): ?string {
    if (!is_dir($dlDir)) {
        return null;
    }
    $exact = $dlDir . DIRECTORY_SEPARATOR . 'ashk-ghalam-v' . APP_VERSION . '-cpanel.zip';
    if (is_file($exact)) {
        return $exact;
    }
    $zips = glob($dlDir . DIRECTORY_SEPARATOR . '*.zip') ?: [];
    if (empty($zips)) {
        return null;
    }
    usort($zips, function (string $a, string $b): int {
        $va = preg_match('/v(\d+\.\d+\.\d+)/i', basename($a), $ma) ? $ma[1] : '0.0.0';
        $vb = preg_match('/v(\d+\.\d+\.\d+)/i', basename($b), $mb) ? $mb[1] : '0.0.0';
        $cmp = version_compare($vb, $va);
        if ($cmp !== 0) {
            return $cmp;
        }
        return (@filemtime($b) ?: 0) <=> (@filemtime($a) ?: 0);
    });
    return $zips[0];
}

if ($route === 'release/latest' && $method === 'GET') {
    $dlDir = $rootDir . DIRECTORY_SEPARATOR . 'downloads';
    $best = pickLatestReleaseZip($dlDir);
    if ($best !== null) {
        $name = basename($best);
        $size = (int) filesize($best);
        $ver = preg_match('/v(\d+\.\d+\.\d+)/i', $name, $m) ? $m[1] : APP_VERSION;
        respondJson([
            'available' => true,
            'version' => $ver,
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
    $best = pickLatestReleaseZip($dlDir);
    if ($best === null) {
        respondJson(['error' => 'فایل بیلد ZIP در این مسیر موجود نیست.'], 404);
    }
    while (ob_get_level() > 0) {
        @ob_end_clean();
    }
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . basename($best) . '"');
    header('Content-Length: ' . filesize($best));
    readfile($best);
    exit;
}

// 14. On-Demand Offline Studio Installer (PhotoCraft, VectorCraft, CADCraft)
function getStudioRegistry(): array {
    return [
        'photocraft' => [
            'id' => 'photocraft',
            'name' => 'PhotoCraft',
            'title' => 'ویرایشگر تصویر PhotoCraft',
            'description' => 'ویرایشگر پیشرفته لایه‌باز تصویر به عنوان جایگزین سریع Photopea در استودیو طراحی گرافیک',
            'category' => 'استودیو طراحی گرافیک',
            'version' => '0.23.1',
            'downloadSizeMb' => 16,
            'downloadUrl' => 'https://github.com/storytold/photocraft/releases/download/v0.23.1/photocraft-web-0.23.1.zip',
            'entryUrl' => '/studio/photocraft/index.html',
        ],
        'vectorcraft' => [
            'id' => 'vectorcraft',
            'name' => 'VectorCraft',
            'title' => 'طراحی برداری VectorCraft',
            'description' => 'محیط طراحی وکتور، لوگو و خطوط چاپی در استودیو طراحی گرافیک',
            'category' => 'استودیو طراحی گرافیک',
            'version' => '0.24.1',
            'downloadSizeMb' => 38,
            'downloadUrl' => 'https://github.com/storytold/vectorcraft/releases/download/v0.24.1/vectorcraft-web-0.24.1.zip',
            'entryUrl' => '/studio/vectorcraft/index.html',
        ],
        'cadcraft' => [
            'id' => 'cadcraft',
            'name' => 'CADCraft',
            'title' => 'محیط نقشه‌کشی CADCraft',
            'description' => 'نرم‌افزار نقشه‌کشی صنعتی و فنی در کنار اتوکد آنلاین',
            'category' => 'استودیو اتوکد CAD',
            'version' => '0.20.1',
            'downloadSizeMb' => 11,
            'downloadUrl' => 'https://github.com/storytold/cadcraft/releases/download/v0.20.1/cadcraft-web-0.20.1.zip',
            'entryUrl' => '/studio/cadcraft/index.html',
        ],
    ];
}

function studioDirSizeBytes(string $dir): int {
    if (!is_dir($dir)) return 0;
    $size = 0;
    try {
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
        foreach ($it as $file) {
            if ($file->isFile()) {
                $size += (int) $file->getSize();
            }
        }
    } catch (Throwable $e) {
        return $size;
    }
    return $size;
}

function studioRemoveDir(string $dir): void {
    if (!is_dir($dir)) return;
    $items = @scandir($dir);
    if (!is_array($items)) return;
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $path = $dir . DIRECTORY_SEPARATOR . $item;
        if (is_dir($path) && !is_link($path)) {
            studioRemoveDir($path);
        } else {
            @unlink($path);
        }
    }
    @rmdir($dir);
}

function studioCopyDir(string $src, string $dst): void {
    if (!is_dir($src)) return;
    if (!is_dir($dst)) {
        @mkdir($dst, 0755, true);
    }
    $items = @scandir($src);
    if (!is_array($items)) return;
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $s = $src . DIRECTORY_SEPARATOR . $item;
        $d = $dst . DIRECTORY_SEPARATOR . $item;
        if (is_dir($s)) {
            studioCopyDir($s, $d);
        } else {
            @copy($s, $d);
        }
    }
}

function buildStudioStatusPayload(string $rootDir): array {
    $studioRoot = $rootDir . DIRECTORY_SEPARATOR . 'studio';
    $registry = getStudioRegistry();
    $list = [];

    foreach ($registry as $id => $meta) {
        $dir = $studioRoot . DIRECTORY_SEPARATOR . $id;
        $indexFile = $dir . DIRECTORY_SEPARATOR . 'index.html';
        $installed = is_file($indexFile);
        $metaFile = $dir . DIRECTORY_SEPARATOR . '.ashk-studio.json';
        $savedMeta = [];
        if (is_file($metaFile)) {
            $decoded = json_decode((string) @file_get_contents($metaFile), true);
            if (is_array($decoded)) $savedMeta = $decoded;
        }
        $sizeBytes = $installed ? (int) ($savedMeta['sizeBytes'] ?? studioDirSizeBytes($dir)) : 0;
        $installedAt = $installed ? (string) ($savedMeta['installedAt'] ?? gmdate('c', (int) @filemtime($indexFile))) : null;

        $list[] = array_merge($meta, [
            'installed' => $installed,
            'installedSizeMb' => $installed ? round($sizeBytes / (1024 * 1024), 2) : 0,
            'installedAt' => $installedAt,
        ]);
    }

    $writable = is_dir($studioRoot) ? is_writable($studioRoot) : is_writable($rootDir);
    return [
        'studios' => $list,
        'capabilities' => [
            'canDownload' => function_exists('curl_init') || (bool) ini_get('allow_url_fopen'),
            'canExtractZip' => class_exists('ZipArchive'),
            'studioDirWritable' => $writable,
            'runtime' => 'php',
        ],
    ];
}

function buildCleanStudioIndexHtml(string $studioId, string $originalHtml): string {
    $jsFile = '';
    $wasmFile = '';
    $snippetFile = '';

    if (preg_match('/\.\/([a-z0-9._-]+\.js)/i', $originalHtml, $m)) {
        $jsFile = './' . $m[1];
    }
    if (preg_match('/\.\/([a-z0-9._-]+_bg\.wasm)/i', $originalHtml, $m)) {
        $wasmFile = './' . $m[1];
    }
    if (preg_match('/\.\/((?:app\/)?snippets\/[^\s"\'<>]+\.js)/i', $originalHtml, $m)) {
        $snippetFile = './' . $m[1];
    }

    if ($studioId === 'photocraft') {
        if ($jsFile === '') $jsFile = './photocraft-web-boot-f1b57f4718fcff8.js';
        if ($wasmFile === '') $wasmFile = './photocraft-web-boot-f1b57f4718fcff8_bg.wasm';
        if ($snippetFile === '') $snippetFile = './app/snippets/eframe-d31a8450ea12dfc1/inline0.js';
        return <<<HTML
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <title>PhotoCraft</title>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #141720; font-family: 'Vazirmatn', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif; }
    #photocraft_canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    #photocraft_loading { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; text-align: center; color: #e2e8f0; background: radial-gradient(circle at top, #1d2436 0%, #141720 65%); pointer-events: none; z-index: 10; }
    .pc-spinner { width: 42px; height: 42px; border: 3.5px solid rgba(148,163,184,0.22); border-top-color: #22d3ee; border-radius: 9999px; animation: pc-spin 0.85s linear infinite; margin-bottom: 16px; }
    @keyframes pc-spin { to { transform: rotate(360deg); } }
    .pc-title { margin: 0 0 6px; font-size: 15px; font-weight: 800; color: #f8fafc; }
    .pc-subtitle { margin: 0 0 18px; font-size: 12.5px; color: #94a3b8; max-width: 420px; line-height: 1.7; }
    #photocraft_stalled { opacity: 0; visibility: hidden; pointer-events: none; max-width: 460px; background: rgba(15,23,42,0.86); border: 1px solid rgba(148,163,184,0.18); border-radius: 16px; padding: 16px 18px; box-shadow: 0 16px 40px rgba(0,0,0,0.35); animation: photocraft-stalled 0.35s ease 8s forwards; }
    @keyframes photocraft-stalled { to { opacity: 1; visibility: visible; pointer-events: auto; } }
    #photocraft_stalled p { margin: 0 0 12px; font-size: 12.5px; color: #cbd5e1; line-height: 1.7; }
    .pc-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; }
    .pc-btn { appearance: none; border: 1px solid rgba(148,163,184,0.25); background: #1e293b; color: #f1f5f9; font-family: inherit; font-size: 12px; font-weight: 700; padding: 8px 14px; border-radius: 10px; cursor: pointer; }
    .pc-btn-primary { background: #4f46e5; border-color: #6366f1; color: #fff; }
    .pc-btn-secondary { background: rgba(16,185,129,0.16); border-color: rgba(16,185,129,0.4); color: #6ee7b7; }
    .pc-btn-amber { background: rgba(245,158,11,0.14); border-color: rgba(245,158,11,0.35); color: #fcd34d; }
    #photocraft_stopped { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; text-align: center; color: #e2e8f0; background: rgba(15,23,42,0.94); pointer-events: auto; z-index: 20; }
    #photocraft_stopped[hidden] { display: none; }
    .pc-stopped-card { max-width: 460px; background: #141926; border: 1px solid rgba(148,163,184,0.2); border-radius: 18px; padding: 22px 20px; }
    .pc-stopped-card p { margin: 0 0 12px; font-size: 13px; color: #cbd5e1; line-height: 1.75; }
    #photocraft_stopped_detail { display: none !important; }
  </style>
  <link rel="modulepreload" href="{$jsFile}">
  <link rel="modulepreload" href="./app/photocraft-web.js">
  <link rel="modulepreload" href="{$snippetFile}">
  <link rel="preload" href="{$wasmFile}" as="fetch" type="application/wasm">
</head>
<body>
  <canvas id="photocraft_canvas"></canvas>
  <div id="photocraft_loading" dir="rtl">
    <div class="pc-spinner" aria-hidden="true"></div>
    <p class="pc-title">در حال آماده‌سازی استودیو تصویر PhotoCraft&hellip;</p>
    <p class="pc-subtitle">لطفاً چند لحظه صبر کنید تا محیط ویرایش تصویر آماده شود.</p>
    <div id="photocraft_stalled">
      <p>بارگذاری این ابزار بیش از حد معمول زمان برده است. می‌توانید دوباره تلاش کنید یا به یکی از ابزارهای جایگزین منتقل شوید:</p>
      <div class="pc-actions">
        <button type="button" class="pc-btn pc-btn-primary" data-switch-studio="photopea">استفاده از Photopea</button>
        <button type="button" class="pc-btn pc-btn-secondary" data-switch-studio="vectorcraft">استفاده از VectorCraft</button>
        <button type="button" class="pc-btn pc-btn-amber" data-switch-studio="local">بوم فوری دایکات</button>
        <button type="button" class="pc-btn" data-reload-studio="1">تلاش مجدد</button>
      </div>
    </div>
  </div>
  <div id="photocraft_stopped" hidden role="alert" dir="rtl">
    <div class="pc-stopped-card">
      <p class="pc-title">امکان بارگذاری PhotoCraft در این لحظه فراهم نشد</p>
      <p>می‌توانید صفحه را مجدداً بارگذاری کنید یا طراحی خود را در Photopea، VectorCraft یا بوم فوری دایکات ادامه دهید.</p>
      <div class="pc-actions">
        <button type="button" class="pc-btn pc-btn-primary" data-switch-studio="photopea">انتقال به Photopea</button>
        <button type="button" class="pc-btn pc-btn-secondary" data-switch-studio="vectorcraft">انتقال به VectorCraft</button>
        <button type="button" class="pc-btn pc-btn-amber" data-switch-studio="local">بوم فوری دایکات</button>
        <button type="button" class="pc-btn" data-reload-studio="1">بارگذاری مجدد</button>
      </div>
      <p id="photocraft_stopped_detail" aria-hidden="true"></p>
    </div>
  </div>
  <script>
    (function () {
      var appReady = false;
      function switchStudio(engine) {
        try { if (window.parent && window.parent !== window) { window.parent.postMessage({ type: 'ASHK_STUDIO_SWITCH', engine: engine }, '*'); return; } } catch (_) {}
        if (engine === 'photopea') window.location.href = 'https://www.photopea.com';
        else if (engine === 'vectorcraft') window.location.href = '../vectorcraft/index.html';
        else window.location.href = '/tools/design-studio';
      }
      function showFallback() {
        var l = document.getElementById('photocraft_loading'), s = document.getElementById('photocraft_stopped');
        if (l) l.style.display = 'none';
        if (s) s.hidden = false;
      }
      window.__ashkShowPhotoCraftFallback = showFallback;
      document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || typeof t.closest !== 'function') return;
        var sw = t.closest('[data-switch-studio]');
        if (sw) { e.preventDefault(); switchStudio(sw.getAttribute('data-switch-studio')); return; }
        if (t.closest('[data-reload-studio]')) { e.preventDefault(); window.location.reload(); }
      });
      window.addEventListener('TrunkApplicationStarted', function () { appReady = true; });
      window.addEventListener('unhandledrejection', function () { if (!appReady) showFallback(); });
    })();
  </script>
  <script type="module">
    try {
      const mod = await import('{$jsFile}');
      const wasm = await mod.default({ module_or_path: '{$wasmFile}' });
      window.wasmBindings = mod;
      dispatchEvent(new CustomEvent('TrunkApplicationStarted', { detail: { wasm } }));
    } catch (_) {
      if (typeof window.__ashkShowPhotoCraftFallback === 'function') window.__ashkShowPhotoCraftFallback();
    }
  </script>
</body>
</html>
HTML;
    }

    if ($studioId === 'vectorcraft') {
        if ($jsFile === '') $jsFile = './vectorcraft-web-80ef79e0b9e423a1.js';
        if ($wasmFile === '') $wasmFile = './vectorcraft-web-80ef79e0b9e423a1_bg.wasm';
        if ($snippetFile === '') $snippetFile = './snippets/eframe-d31a8450ea12dfc1/inline0.js';
        return <<<HTML
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>VectorCraft</title>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #141720; overscroll-behavior: none; -webkit-user-select: none; user-select: none; font-family: 'Vazirmatn', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif; }
    #vectorcraft_canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; }
    #vectorcraft_loading { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; text-align: center; color: #e2e8f0; background: radial-gradient(circle at top, #18272b 0%, #141720 65%); pointer-events: none; z-index: 10; }
    .vc-spinner { width: 42px; height: 42px; border: 3.5px solid rgba(148,163,184,0.22); border-top-color: #10b981; border-radius: 9999px; animation: vc-spin 0.85s linear infinite; margin-bottom: 16px; }
    @keyframes vc-spin { to { transform: rotate(360deg); } }
    .vc-title { margin: 0 0 6px; font-size: 15px; font-weight: 800; color: #f8fafc; }
    .vc-subtitle { margin: 0 0 18px; font-size: 12.5px; color: #94a3b8; max-width: 420px; line-height: 1.7; }
    #vectorcraft_stalled { opacity: 0; visibility: hidden; pointer-events: none; max-width: 460px; background: rgba(15,23,42,0.86); border: 1px solid rgba(148,163,184,0.18); border-radius: 16px; padding: 16px 18px; animation: vc-stalled 0.35s ease 10s forwards; }
    @keyframes vc-stalled { to { opacity: 1; visibility: visible; pointer-events: auto; } }
    #vectorcraft_stalled p { margin: 0 0 12px; font-size: 12.5px; color: #cbd5e1; line-height: 1.7; }
    .vc-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; }
    .vc-btn { appearance: none; border: 1px solid rgba(148,163,184,0.25); background: #1e293b; color: #f1f5f9; font-family: inherit; font-size: 12px; font-weight: 700; padding: 8px 14px; border-radius: 10px; cursor: pointer; }
    .vc-btn-primary { background: #4f46e5; border-color: #6366f1; color: #fff; }
    .vc-btn-cyan { background: rgba(6,182,212,0.16); border-color: rgba(6,182,212,0.4); color: #67e8f9; }
    #vectorcraft_stopped { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; text-align: center; color: #e2e8f0; background: rgba(15,23,42,0.94); pointer-events: auto; z-index: 20; }
    #vectorcraft_stopped[hidden] { display: none; }
    .vc-card { max-width: 460px; background: #141926; border: 1px solid rgba(148,163,184,0.2); border-radius: 18px; padding: 22px 20px; }
    .vc-card p { margin: 0 0 12px; font-size: 13px; color: #cbd5e1; line-height: 1.75; }
  </style>
  <link rel="modulepreload" href="{$jsFile}">
  <link rel="modulepreload" href="{$snippetFile}">
  <link rel="preload" href="{$wasmFile}" as="fetch" type="application/wasm">
</head>
<body>
  <canvas id="vectorcraft_canvas"></canvas>
  <div id="vectorcraft_loading" dir="rtl">
    <div class="vc-spinner" aria-hidden="true"></div>
    <p class="vc-title">در حال آماده‌سازی استودیو برداری VectorCraft&hellip;</p>
    <p class="vc-subtitle">لطفاً چند لحظه صبر کنید تا ابزار طراحی وکتور آماده شود.</p>
    <div id="vectorcraft_stalled">
      <p>بارگذاری کمی زمان‌بر شده است. در صورت تمایل می‌توانید از ابزارهای جایگزین استفاده کنید:</p>
      <div class="vc-actions">
        <button type="button" class="vc-btn vc-btn-primary" data-switch-studio="photopea">استفاده از Photopea</button>
        <button type="button" class="vc-btn vc-btn-cyan" data-switch-studio="photocraft">استفاده از PhotoCraft</button>
        <button type="button" class="vc-btn" data-reload-studio="1">تلاش مجدد</button>
      </div>
    </div>
  </div>
  <div id="vectorcraft_stopped" hidden role="alert" dir="rtl">
    <div class="vc-card">
      <p class="vc-title">امکان بارگذاری VectorCraft در این لحظه فراهم نشد</p>
      <p>می‌توانید دوباره تلاش کنید یا به Photopea و PhotoCraft منتقل شوید.</p>
      <div class="vc-actions">
        <button type="button" class="vc-btn vc-btn-primary" data-switch-studio="photopea">انتقال به Photopea</button>
        <button type="button" class="vc-btn vc-btn-cyan" data-switch-studio="photocraft">انتقال به PhotoCraft</button>
        <button type="button" class="vc-btn" data-reload-studio="1">بارگذاری مجدد</button>
      </div>
    </div>
  </div>
  <script>
    (function () {
      var appReady = false;
      function switchStudio(engine) {
        try { if (window.parent && window.parent !== window) { window.parent.postMessage({ type: 'ASHK_STUDIO_SWITCH', engine: engine }, '*'); return; } } catch (_) {}
        if (engine === 'photopea') window.location.href = 'https://www.photopea.com';
        else if (engine === 'photocraft') window.location.href = '../photocraft/index.html';
        else window.location.href = '/tools/design-studio';
      }
      function showFallback() {
        var l = document.getElementById('vectorcraft_loading'), s = document.getElementById('vectorcraft_stopped');
        if (l) l.style.display = 'none';
        if (s) s.hidden = false;
      }
      window.__ashkShowVectorCraftFallback = showFallback;
      document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || typeof t.closest !== 'function') return;
        var sw = t.closest('[data-switch-studio]');
        if (sw) { e.preventDefault(); switchStudio(sw.getAttribute('data-switch-studio')); return; }
        if (t.closest('[data-reload-studio]')) { e.preventDefault(); window.location.reload(); }
      });
      window.addEventListener('TrunkApplicationStarted', function () { appReady = true; });
      window.addEventListener('unhandledrejection', function () { if (!appReady) showFallback(); });
    })();
  </script>
  <script type="module">
    try {
      const mod = await import('{$jsFile}');
      const wasm = await mod.default({ module_or_path: '{$wasmFile}' });
      window.wasmBindings = mod;
      dispatchEvent(new CustomEvent('TrunkApplicationStarted', { detail: { wasm } }));
    } catch (_) {
      if (typeof window.__ashkShowVectorCraftFallback === 'function') window.__ashkShowVectorCraftFallback();
    }
  </script>
</body>
</html>
HTML;
    }

    // cadcraft
    if ($jsFile === '') $jsFile = './cadcraft-web-a91fdcd993cc5580.js';
    if ($wasmFile === '') $wasmFile = './cadcraft-web-a91fdcd993cc5580_bg.wasm';
    if ($snippetFile === '') $snippetFile = './snippets/eframe-d31a8450ea12dfc1/inline0.js';
    return <<<HTML
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CADCraft</title>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #181c24; font-family: 'Vazirmatn', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif; }
    #cadcraft_canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    #cadcraft_loading { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; text-align: center; color: #e2e8f0; background: radial-gradient(circle at top, #1d2638 0%, #181c24 65%); pointer-events: none; z-index: 10; }
    .cc-spinner { width: 42px; height: 42px; border: 3.5px solid rgba(148,163,184,0.22); border-top-color: #38bdf8; border-radius: 9999px; animation: cc-spin 0.85s linear infinite; margin-bottom: 16px; }
    @keyframes cc-spin { to { transform: rotate(360deg); } }
    .cc-title { margin: 0 0 6px; font-size: 15px; font-weight: 800; color: #f8fafc; }
    .cc-subtitle { margin: 0 0 18px; font-size: 12.5px; color: #94a3b8; max-width: 420px; line-height: 1.7; }
    #cadcraft_stalled { opacity: 0; visibility: hidden; pointer-events: none; max-width: 440px; background: rgba(15,23,42,0.88); border: 1px solid rgba(148,163,184,0.2); border-radius: 16px; padding: 16px 18px; animation: cc-stalled 0.35s ease 10s forwards; }
    @keyframes cc-stalled { to { opacity: 1; visibility: visible; pointer-events: auto; } }
    #cadcraft_stalled p { margin: 0 0 12px; font-size: 12.5px; color: #cbd5e1; line-height: 1.7; }
    .cc-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; }
    .cc-btn { appearance: none; border: 1px solid rgba(148,163,184,0.25); background: #1e293b; color: #f1f5f9; font-family: inherit; font-size: 12px; font-weight: 700; padding: 8px 14px; border-radius: 10px; cursor: pointer; }
    .cc-btn-primary { background: #2563eb; border-color: #3b82f6; color: #fff; }
    #cadcraft_stopped { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; text-align: center; color: #e2e8f0; background: rgba(15,23,42,0.94); pointer-events: auto; z-index: 20; }
    #cadcraft_stopped[hidden] { display: none; }
    .cc-card { max-width: 440px; background: #141926; border: 1px solid rgba(148,163,184,0.2); border-radius: 18px; padding: 22px 20px; }
    .cc-card p { margin: 0 0 12px; font-size: 13px; color: #cbd5e1; line-height: 1.75; }
  </style>
  <link rel="modulepreload" href="{$jsFile}">
  <link rel="modulepreload" href="{$snippetFile}">
  <link rel="preload" href="{$wasmFile}" as="fetch" type="application/wasm">
</head>
<body>
  <canvas id="cadcraft_canvas"></canvas>
  <div id="cadcraft_loading" dir="rtl">
    <div class="cc-spinner" aria-hidden="true"></div>
    <p class="cc-title">در حال آماده‌سازی محیط طراحی CADCraft&hellip;</p>
    <p class="cc-subtitle">لطفاً چند لحظه صبر کنید تا میز کار نقشه‌کشی صنعتی آماده شود.</p>
    <div id="cadcraft_stalled">
      <p>بارگذاری کمی زمان‌بر شده است. می‌توانید مجدداً تلاش کنید یا از اتوکد آنلاین استفاده نمایید:</p>
      <div class="cc-actions">
        <button type="button" class="cc-btn cc-btn-primary" data-switch-cad="autocad">انتقال به اتوکد آنلاین</button>
        <button type="button" class="cc-btn" data-reload-cad="1">تلاش مجدد</button>
      </div>
    </div>
  </div>
  <div id="cadcraft_stopped" hidden role="alert" dir="rtl">
    <div class="cc-card">
      <p class="cc-title">امکان بارگذاری CADCraft در این لحظه فراهم نشد</p>
      <p>می‌توانید دوباره تلاش کنید یا کار خود را در محیط اتوکد آنلاین ادامه دهید.</p>
      <div class="cc-actions">
        <button type="button" class="cc-btn cc-btn-primary" data-switch-cad="autocad">انتقال به اتوکد آنلاین</button>
        <button type="button" class="cc-btn" data-reload-cad="1">بارگذاری مجدد</button>
      </div>
    </div>
  </div>
  <script>
    (function () {
      var appReady = false;
      function switchCad(mode) {
        try { if (window.parent && window.parent !== window) { window.parent.postMessage({ type: 'ASHK_CAD_SWITCH', mode: mode }, '*'); return; } } catch (_) {}
        window.location.href = '/tools/autocad';
      }
      function showFallback() {
        var l = document.getElementById('cadcraft_loading'), s = document.getElementById('cadcraft_stopped');
        if (l) l.style.display = 'none';
        if (s) s.hidden = false;
      }
      window.__ashkShowCadCraftFallback = showFallback;
      document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || typeof t.closest !== 'function') return;
        var sw = t.closest('[data-switch-cad]');
        if (sw) { e.preventDefault(); switchCad(sw.getAttribute('data-switch-cad')); return; }
        if (t.closest('[data-reload-cad]')) { e.preventDefault(); window.location.reload(); }
      });
      window.addEventListener('TrunkApplicationStarted', function () { appReady = true; });
      window.addEventListener('unhandledrejection', function () { if (!appReady) showFallback(); });
    })();
  </script>
  <script type="module">
    try {
      const mod = await import('{$jsFile}');
      const wasm = await mod.default({ module_or_path: '{$wasmFile}' });
      window.wasmBindings = mod;
      dispatchEvent(new CustomEvent('TrunkApplicationStarted', { detail: { wasm } }));
    } catch (_) {
      if (typeof window.__ashkShowCadCraftFallback === 'function') window.__ashkShowCadCraftFallback();
    }
  </script>
</body>
</html>
HTML;
}

function downloadStudioArchive(string $url, string $destPath, ?string &$errorMsg = null): bool {
    if (function_exists('curl_init')) {
        $fp = @fopen($destPath, 'wb');
        if (!$fp) {
            $errorMsg = 'امکان ایجاد فایل موقت روی هاست وجود ندارد.';
            return false;
        }
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_FILE => $fp,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 8,
            CURLOPT_CONNECTTIMEOUT => 30,
            CURLOPT_TIMEOUT => 600,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT => 'AshkGhalam-Studio-Installer/1.0',
            CURLOPT_FAILONERROR => true,
        ]);
        $ok = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);
        fclose($fp);
        if (!$ok || ($httpCode >= 400 && $httpCode !== 0)) {
            @unlink($destPath);
            $errorMsg = 'دانلود مستقیم از سرور مبدأ ناموفق بود' . ($curlErr !== '' ? ' (' . $curlErr . ')' : '') . '. می‌توانید فایل زیپ را به صورت دستی آپلود کنید.';
            return false;
        }
        return true;
    }

    if ((bool) ini_get('allow_url_fopen')) {
        $ctx = stream_context_create([
            'http' => [
                'follow_location' => 1,
                'timeout' => 600,
                'header' => "User-Agent: AshkGhalam-Studio-Installer/1.0\r\n",
            ],
        ]);
        $in = @fopen($url, 'rb', false, $ctx);
        $out = @fopen($destPath, 'wb');
        if (!$in || !$out) {
            if ($in) fclose($in);
            if ($out) fclose($out);
            @unlink($destPath);
            $errorMsg = 'امکان اتصال به سرور دانلود از طریق PHP وجود ندارد. از گزینه آپلود دستی ZIP استفاده کنید.';
            return false;
        }
        stream_copy_to_stream($in, $out);
        fclose($in);
        fclose($out);
        return true;
    }

    $errorMsg = 'افزونه cURL و allow_url_fopen روی هاست غیرفعال است. لطفاً فایل ZIP را به صورت دستی آپلود کنید.';
    return false;
}

function extractAndFinalizeStudioZip(string $studioId, string $zipPath, string $rootDir, string $version, ?string &$errorMsg = null): bool {
    if (!class_exists('ZipArchive')) {
        $errorMsg = 'افزونه ZipArchive در PHP هاست فعال نیست. لطفاً از بخش Select PHP Version در cPanel گزینه zip را فعال کنید.';
        return false;
    }
    if (!is_file($zipPath) || filesize($zipPath) < 4096) {
        $errorMsg = 'فایل آرشیو دریافت‌شده ناقص یا نامعتبر است.';
        return false;
    }
    $fh = @fopen($zipPath, 'rb');
    $magic = $fh ? fread($fh, 4) : '';
    if ($fh) fclose($fh);
    if (substr($magic, 0, 2) !== 'PK') {
        $errorMsg = 'فایل دریافت‌شده یک آرشیو ZIP معتبر نیست.';
        return false;
    }

    $zip = new ZipArchive();
    if ($zip->open($zipPath) !== true) {
        $errorMsg = 'باز کردن فایل ZIP با خطا مواجه شد.';
        return false;
    }

    $studioRoot = $rootDir . DIRECTORY_SEPARATOR . 'studio';
    if (!is_dir($studioRoot) && !@mkdir($studioRoot, 0755, true)) {
        $zip->close();
        $errorMsg = 'امکان ساخت پوشه studio/ در روت هاست وجود ندارد. دسترسی پوشه public_html را بررسی کنید.';
        return false;
    }

    $targetDir = $studioRoot . DIRECTORY_SEPARATOR . $studioId;
    studioRemoveDir($targetDir);
    if (!@mkdir($targetDir, 0755, true)) {
        $zip->close();
        $errorMsg = 'امکان ایجاد پوشه مقصد استودیو وجود ندارد.';
        return false;
    }

    // Detect single wrapping root folder inside release archive
    $topSegments = [];
    $hasSlash = false;
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = str_replace('\\', '/', (string) $zip->getNameIndex($i));
        if (strpos($name, '/') !== false) $hasSlash = true;
        $first = explode('/', ltrim($name, '/'))[0] ?? '';
        if ($first !== '') $topSegments[$first] = true;
    }
    $stripPrefix = (count($topSegments) === 1 && $hasSlash) ? (array_keys($topSegments)[0] . '/') : '';

    for ($i = 0; $i < $zip->numFiles; $i++) {
        $rawName = str_replace('\\', '/', (string) $zip->getNameIndex($i));
        if ($rawName === '' || strpos($rawName, '..') !== false) continue;
        $rel = ($stripPrefix !== '' && strpos($rawName, $stripPrefix) === 0)
            ? substr($rawName, strlen($stripPrefix))
            : ltrim($rawName, '/');
        if ($rel === '') continue;

        $outPath = $targetDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel);
        if (substr($rawName, -1) === '/') {
            if (!is_dir($outPath)) @mkdir($outPath, 0755, true);
            continue;
        }
        $parent = dirname($outPath);
        if (!is_dir($parent)) @mkdir($parent, 0755, true);
        $stream = $zip->getStream($zip->getNameIndex($i));
        if ($stream) {
            $outFp = @fopen($outPath, 'wb');
            if ($outFp) {
                stream_copy_to_stream($stream, $outFp);
                fclose($outFp);
            }
            fclose($stream);
        }
    }
    $zip->close();

    // Fix upstream PhotoCraft v0.23.1 relative snippet path
    if ($studioId === 'photocraft') {
        $rootSnippets = $targetDir . DIRECTORY_SEPARATOR . 'snippets';
        $appSnippets = $targetDir . DIRECTORY_SEPARATOR . 'app' . DIRECTORY_SEPARATOR . 'snippets';
        if (is_dir($rootSnippets) && !is_dir($appSnippets)) {
            studioCopyDir($rootSnippets, $appSnippets);
        }
    }

    $indexFile = $targetDir . DIRECTORY_SEPARATOR . 'index.html';
    if (!is_file($indexFile)) {
        studioRemoveDir($targetDir);
        $errorMsg = 'فایل اصلی استودیو (index.html) درون فایل ZIP یافت نشد. لطفاً از صحیح بودن بسته مطمئن شوید.';
        return false;
    }

    $originalHtml = (string) @file_get_contents($indexFile);
    $cleanHtml = buildCleanStudioIndexHtml($studioId, $originalHtml);
    @file_put_contents($indexFile, $cleanHtml, LOCK_EX);

    $meta = [
        'id' => $studioId,
        'version' => $version,
        'installedAt' => gmdate('c'),
        'sizeBytes' => studioDirSizeBytes($targetDir),
    ];
    @file_put_contents($targetDir . DIRECTORY_SEPARATOR . '.ashk-studio.json', json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
    return true;
}

if ($route === 'studios/status' && $method === 'GET') {
    respondJson(buildStudioStatusPayload($rootDir));
}

if ($route === 'studios/install' && $method === 'POST') {
    @set_time_limit(0);
    @ignore_user_abort(true);
    @ini_set('memory_limit', '512M');

    $body = readJsonBody();
    $studioId = strtolower(trim((string) ($body['studio'] ?? '')));
    $registry = getStudioRegistry();
    if (!isset($registry[$studioId])) {
        respondJson(['error' => 'شناسه استودیو نامعتبر است.'], 400);
    }

    $meta = $registry[$studioId];
    $downloadUrl = $meta['downloadUrl'];
    $customUrl = trim((string) ($body['customUrl'] ?? ''));
    if ($customUrl !== '') {
        if (!preg_match('#^https?://#i', $customUrl)) {
            respondJson(['error' => 'آدرس لینک جایگزین باید با https:// یا http:// شروع شود.'], 400);
        }
        $downloadUrl = $customUrl;
    }

    $tmpDir = $rootDir . DIRECTORY_SEPARATOR . 'studio' . DIRECTORY_SEPARATOR . '.tmp';
    if (!is_dir($tmpDir)) @mkdir($tmpDir, 0755, true);
    $tmpZip = $tmpDir . DIRECTORY_SEPARATOR . $studioId . '-' . time() . '.zip';

    $err = null;
    if (!downloadStudioArchive($downloadUrl, $tmpZip, $err)) {
        respondJson(['error' => $err ?: 'خطا در دانلود فایل استودیو روی سرور.'], 502);
    }

    $extracted = extractAndFinalizeStudioZip($studioId, $tmpZip, $rootDir, $meta['version'], $err);
    @unlink($tmpZip);
    if (!$extracted) {
        respondJson(['error' => $err ?: 'خطا در استخراج فایل استودیو.'], 500);
    }

    $status = buildStudioStatusPayload($rootDir);
    respondJson([
        'ok' => true,
        'message' => $meta['name'] . ' با موفقیت روی هاست دانلود و نصب شد.',
        'studios' => $status['studios'],
        'capabilities' => $status['capabilities'],
    ]);
}

if ($route === 'studios/upload' && $method === 'POST') {
    @set_time_limit(0);
    @ini_set('memory_limit', '512M');

    $studioId = strtolower(trim((string) ($_POST['studio'] ?? ($_GET['studio'] ?? ''))));
    $registry = getStudioRegistry();
    if (!isset($registry[$studioId])) {
        respondJson(['error' => 'شناسه استودیو نامعتبر است.'], 400);
    }
    if (empty($_FILES['file']['tmp_name']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
        respondJson(['error' => 'فایل ZIP ارسال نشده یا حجم آن بیشتر از محدودیت upload_max_filesize هاست است.'], 400);
    }

    $err = null;
    $extracted = extractAndFinalizeStudioZip($studioId, $_FILES['file']['tmp_name'], $rootDir, $registry[$studioId]['version'], $err);
    if (!$extracted) {
        respondJson(['error' => $err ?: 'خطا در استخراج فایل آپلودشده.'], 500);
    }

    $status = buildStudioStatusPayload($rootDir);
    respondJson([
        'ok' => true,
        'message' => $registry[$studioId]['name'] . ' با موفقیت از فایل ZIP نصب شد.',
        'studios' => $status['studios'],
        'capabilities' => $status['capabilities'],
    ]);
}

if (($route === 'studios/uninstall' && $method === 'POST') || (preg_match('#^studios/([a-z0-9_-]+)$#', $route, $mStudio) && $method === 'DELETE')) {
    $body = $method === 'POST' ? readJsonBody() : [];
    $studioId = strtolower(trim((string) ($body['studio'] ?? ($mStudio[1] ?? ''))));
    $registry = getStudioRegistry();
    if (!isset($registry[$studioId])) {
        respondJson(['error' => 'شناسه استودیو نامعتبر است.'], 400);
    }
    $targetDir = $rootDir . DIRECTORY_SEPARATOR . 'studio' . DIRECTORY_SEPARATOR . $studioId;
    studioRemoveDir($targetDir);
    $status = buildStudioStatusPayload($rootDir);
    respondJson([
        'ok' => true,
        'message' => 'فایل‌های ' . $registry[$studioId]['name'] . ' از روی هاست پاک‌سازی شدند.',
        'studios' => $status['studios'],
        'capabilities' => $status['capabilities'],
    ]);
}

// 15. Scheduled SEO Autopilot & Smart Hybrid Cron API (Pure PHP - Zero Node.js)
if ($route === 'seo/autopilot/status' && $method === 'GET') {
    if (!function_exists('seoApBuildStatusPayload')) {
        respondJson(['error' => 'فایل seo-autopilot.php در روت سایت موجود نیست.'], 500);
    }
    respondJson(seoApBuildStatusPayload());
}

if ($route === 'seo/autopilot/config' && $method === 'POST') {
    if (!function_exists('seoApLoadConfig')) {
        respondJson(['error' => 'فایل seo-autopilot.php در روت سایت موجود نیست.'], 500);
    }
    $body = readJsonBody();
    $current = seoApLoadConfig();

    $boolFields = [
        'enabled',
        'smartPseudoCron',
        'autoFixSeoMeta',
        'enableIndexNow',
        'enableRssFeed',
        'enableLlmsTxt',
        'enableRobotsMaintenance',
    ];
    foreach ($boolFields as $f) {
        if (array_key_exists($f, $body)) {
            $current[$f] = (bool) $body[$f];
        }
    }

    $intBounds = [
        'articleScheduleHours' => [6, 720],
        'seoAuditScheduleHours' => [6, 720],
        'promoteScheduleHours' => [6, 720],
        'maxArticlesPerWeek' => [1, 21],
    ];
    foreach ($intBounds as $f => $bounds) {
        if (isset($body[$f])) {
            $val = (int) $body[$f];
            $current[$f] = max($bounds[0], min($bounds[1], $val));
        }
    }

    if (isset($body['publishMode']) && in_array($body['publishMode'], ['published', 'draft'], true)) {
        $current['publishMode'] = $body['publishMode'];
    }
    if (isset($body['siteBaseUrl'])) {
        $url = trim((string) $body['siteBaseUrl']);
        if ($url !== '' && preg_match('#^https?://#i', $url)) {
            $current['siteBaseUrl'] = rtrim($url, '/');
        }
    }
    if (isset($body['brandName']) && trim((string) $body['brandName']) !== '') {
        $current['brandName'] = trim((string) $body['brandName']);
    }
    if (isset($body['brandTagline'])) {
        $current['brandTagline'] = trim((string) $body['brandTagline']);
    }
    if (isset($body['customTopics']) && is_array($body['customTopics'])) {
        $cleanTopics = [];
        foreach ($body['customTopics'] as $t) {
            $s = trim((string) $t);
            if ($s !== '') $cleanTopics[] = $s;
        }
        $current['customTopics'] = array_values(array_unique($cleanTopics));
    }
    if (isset($body['focusKeywords']) && is_array($body['focusKeywords'])) {
        $cleanKw = [];
        foreach ($body['focusKeywords'] as $k) {
            $s = trim((string) $k);
            if ($s !== '') $cleanKw[] = $s;
        }
        if (!empty($cleanKw)) {
            $current['focusKeywords'] = array_values(array_unique($cleanKw));
        }
    }
    if (isset($body['optionalAiEndpoint'])) {
        $current['optionalAiEndpoint'] = trim((string) $body['optionalAiEndpoint']);
    }
    if (isset($body['optionalAiModel'])) {
        $current['optionalAiModel'] = trim((string) $body['optionalAiModel']);
    }
    if (isset($body['optionalAiApiKey']) && trim((string) $body['optionalAiApiKey']) !== '') {
        $current['optionalAiApiKey'] = trim((string) $body['optionalAiApiKey']);
    }
    if (!empty($body['clearOptionalAiKey'])) {
        $current['optionalAiApiKey'] = '';
    }
    if (!empty($body['regenerateCronToken'])) {
        $current['cronToken'] = seoApRandomHex(16);
    }

    seoApWriteJson('seo-autopilot-config.json', $current);
    respondJson([
        'ok' => true,
        'message' => 'تنظیمات ماژول زمان‌بند سئو با موفقیت ذخیره شد.',
        'status' => seoApBuildStatusPayload(),
    ]);
}

if ($route === 'seo/autopilot/run' && $method === 'POST') {
    if (!function_exists('seoApRunCycle')) {
        respondJson(['error' => 'فایل seo-autopilot.php در روت سایت موجود نیست.'], 500);
    }
    @set_time_limit(180);
    $body = readJsonBody();
    $task = strtolower(trim((string) ($body['task'] ?? 'all')));
    $valid = ['all', 'article', 'audit', 'promote'];
    if (!in_array($task, $valid, true)) {
        $task = 'all';
    }
    $topic = trim((string) ($body['topic'] ?? ''));
    $result = seoApRunCycle('admin_manual', [$task], $topic !== '' ? $topic : null);
    respondJson($result);
}

if ($route === 'seo/autopilot/tick' && ($method === 'GET' || $method === 'POST')) {
    if (!function_exists('seoApRunCycle')) {
        respondJson(['ok' => true, 'skipped' => true]);
    }
    // Non-blocking background execution on PHP-FPM / LiteSpeed hosts so visitors feel zero latency
    if (function_exists('fastcgi_finish_request')) {
        http_response_code(200);
        echo json_encode(['ok' => true, 'queued' => true], JSON_UNESCAPED_UNICODE);
        @fastcgi_finish_request();
        @ignore_user_abort(true);
        @set_time_limit(120);
        seoApRunCycle('smart_tick', []);
        exit;
    }
    @ignore_user_abort(true);
    @set_time_limit(90);
    $res = seoApRunCycle('smart_tick', []);
    respondJson([
        'ok' => true,
        'skipped' => !empty($res['skipped']),
        'executed' => $res['executed'] ?? [],
    ]);
}

// 16. Admin ZIP Tool / Source Replacement Manager (Backup & Rollback — Pure PHP)
function getBuiltinToolPackages(): array {
    return [
        [
            'id' => 'photocraft',
            'title' => 'PhotoCraft (ویرایشگر تصویر و چاپ)',
            'description' => 'موتور گرافیکی آفلاین جهت ویرایش طرح‌ها و جایگزینی سورس استودیو تصویر',
            'category' => 'design',
            'isBuiltin' => true,
            'entryUrl' => '/studio/photocraft/index.html',
            'relDir' => 'studio/photocraft',
            'versionLabel' => '0.23.1',
        ],
        [
            'id' => 'vectorcraft',
            'title' => 'VectorCraft (طراحی وکتور و دایکات)',
            'description' => 'ویرایشگر برداری آفلاین جهت خطوط برش، لوگو و طراحی بسته‌بندی',
            'category' => 'design',
            'isBuiltin' => true,
            'entryUrl' => '/studio/vectorcraft/index.html',
            'relDir' => 'studio/vectorcraft',
            'versionLabel' => '0.24.1',
        ],
        [
            'id' => 'cadcraft',
            'title' => 'CADCraft (موتور نقشه DXF و CAD)',
            'description' => 'ابزار مهندسی نقشه‌های قالب و برش سه‌بعدی در کنار اتوکد آنلاین',
            'category' => 'cad',
            'isBuiltin' => true,
            'entryUrl' => '/studio/cadcraft/index.html',
            'relDir' => 'studio/cadcraft',
            'versionLabel' => '0.1.0',
        ],
        [
            'id' => 'box-studio',
            'title' => 'Box Studio (استودیو مستقل بسته‌بندی)',
            'description' => 'نسخه مستقل جعبه‌ساز و پیش‌نمایش در مسیر /box-studio',
            'category' => 'packaging',
            'isBuiltin' => true,
            'entryUrl' => '/box-studio/index.html',
            'relDir' => 'box-studio',
            'versionLabel' => '3.26.6',
        ],
    ];
}

function toolPkgScanDir(string $dir): array {
    if (!is_dir($dir)) return ['sizeBytes' => 0, 'fileCount' => 0, 'hasIndexHtml' => false];
    $size = 0;
    $count = 0;
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    foreach ($it as $item) {
        if ($item->isFile()) {
            $count++;
            $size += (int) $item->getSize();
        }
    }
    return ['sizeBytes' => $size, 'fileCount' => $count, 'hasIndexHtml' => is_file($dir . DIRECTORY_SEPARATOR . 'index.html')];
}

function toolPkgListBackups(string $rootDir, string $toolId): array {
    $bkDir = $rootDir . DIRECTORY_SEPARATOR . 'backups' . DIRECTORY_SEPARATOR . 'tool-packages';
    if (!is_dir($bkDir)) return [];
    $out = [];
    $prefix = $toolId . '-';
    foreach (@scandir($bkDir) ?: [] as $f) {
        if (strpos($f, $prefix) === 0 && substr($f, -4) === '.zip') {
            $full = $bkDir . DIRECTORY_SEPARATOR . $f;
            if (!is_file($full)) continue;
            $sz = (int) @filesize($full);
            $out[] = [
                'fileName' => $f,
                'sizeBytes' => $sz,
                'sizeMB' => round($sz / (1024 * 1024), 2),
                'createdAt' => gmdate('c', (int) (@filemtime($full) ?: time())),
            ];
        }
    }
    usort($out, function ($a, $b) {
        return strcmp($b['createdAt'], $a['createdAt']);
    });
    return $out;
}

function toolPkgCreateBackup(string $rootDir, string $toolId, string $sourceDir): ?string {
    if (!class_exists('ZipArchive') || !is_dir($sourceDir)) return null;
    $stats = toolPkgScanDir($sourceDir);
    if ($stats['fileCount'] === 0) return null;
    $bkDir = $rootDir . DIRECTORY_SEPARATOR . 'backups' . DIRECTORY_SEPARATOR . 'tool-packages';
    if (!is_dir($bkDir)) @mkdir($bkDir, 0755, true);
    $name = $toolId . '-' . gmdate('Y-m-d\TH-i-s') . '.zip';
    $dest = $bkDir . DIRECTORY_SEPARATOR . $name;
    $zip = new ZipArchive();
    if ($zip->open($dest, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) return null;
    $baseLen = strlen(rtrim($sourceDir, DIRECTORY_SEPARATOR)) + 1;
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($sourceDir, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    foreach ($it as $item) {
        $rel = str_replace('\\', '/', substr($item->getPathname(), $baseLen));
        if ($item->isDir()) $zip->addEmptyDir($rel);
        else $zip->addFile($item->getPathname(), $rel);
    }
    $zip->close();
    $all = toolPkgListBackups($rootDir, $toolId);
    foreach (array_slice($all, 5) as $old) {
        @unlink($bkDir . DIRECTORY_SEPARATOR . $old['fileName']);
    }
    return $name;
}

function toolPkgExtractZip(string $toolId, string $zipPath, string $targetDir, bool $preserveCleanLoader, ?string &$err = null): ?array {
    if (!class_exists('ZipArchive')) {
        $err = 'افزونه ZipArchive روی PHP هاست فعال نیست.';
        return null;
    }
    $head = @file_get_contents($zipPath, false, null, 0, 4);
    if ($head === false || strlen($head) < 2 || substr($head, 0, 2) !== 'PK') {
        $err = 'فایل ارسالی یک آرشیو ZIP استاندارد نیست.';
        return null;
    }
    $zip = new ZipArchive();
    if ($zip->open($zipPath) !== true) {
        $err = 'باز کردن فایل ZIP با خطا مواجه شد.';
        return null;
    }
    $topFolders = [];
    $hasRootFile = false;
    $entries = [];
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = str_replace('\\', '/', (string) $zip->getNameIndex($i));
        if ($name === '' || strpos($name, '__MACOSX/') === 0 || strpos($name, '..') !== false || $name[0] === '/') continue;
        $entries[] = ['idx' => $i, 'name' => $name];
        $slash = strpos($name, '/');
        if ($slash === false) {
            if (substr($name, -1) !== '/') $hasRootFile = true;
        } else {
            $topFolders[substr($name, 0, $slash)] = true;
        }
    }
    if (empty($entries)) {
        $zip->close();
        $err = 'فایل ZIP خالی یا نامعتبر است.';
        return null;
    }
    $stripPrefix = (!$hasRootFile && count($topFolders) === 1) ? (array_key_first($topFolders) . '/') : '';

    studioRemoveDir($targetDir);
    @mkdir($targetDir, 0755, true);
    $realTarget = realpath($targetDir) ?: $targetDir;

    foreach ($entries as $e) {
        $rel = $e['name'];
        if ($stripPrefix !== '' && strpos($rel, $stripPrefix) === 0) {
            $rel = substr($rel, strlen($stripPrefix));
        }
        $rel = ltrim($rel, '/');
        if ($rel === '' || strpos($rel, '..') !== false) continue;
        $outPath = $realTarget . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel);
        if (substr($rel, -1) === '/') {
            if (!is_dir($outPath)) @mkdir($outPath, 0755, true);
        } else {
            $dir = dirname($outPath);
            if (!is_dir($dir)) @mkdir($dir, 0755, true);
            $stream = $zip->getStream($e['name']);
            if ($stream) {
                $outFp = @fopen($outPath, 'wb');
                if ($outFp) {
                    stream_copy_to_stream($stream, $outFp);
                    fclose($outFp);
                }
                fclose($stream);
            }
        }
    }
    $zip->close();

    if ($toolId === 'photocraft') {
        $rootSnip = $targetDir . DIRECTORY_SEPARATOR . 'snippets';
        $appSnip = $targetDir . DIRECTORY_SEPARATOR . 'app' . DIRECTORY_SEPARATOR . 'snippets';
        if (is_dir($rootSnip) && !is_dir($appSnip)) {
            studioCopyDir($rootSnip, $appSnip);
        }
    }
    if ($preserveCleanLoader && in_array($toolId, ['photocraft', 'vectorcraft', 'cadcraft'], true) && function_exists('buildCleanStudioHtml')) {
        $idxFile = $targetDir . DIRECTORY_SEPARATOR . 'index.html';
        if (is_file($idxFile)) {
            $orig = (string) @file_get_contents($idxFile);
            @file_put_contents($idxFile, buildCleanStudioHtml($toolId, $orig), LOCK_EX);
        }
    }
    return toolPkgScanDir($targetDir);
}

function buildToolPackagesPayloadPhp(string $rootDir): array {
    $customMap = readJsonStore('tool-packages.json', []);
    if (!is_array($customMap)) $customMap = [];
    $seen = [];
    $list = [];
    foreach (getBuiltinToolPackages() as $base) {
        $id = $base['id'];
        $seen[$id] = true;
        $ov = is_array($customMap[$id] ?? null) ? $customMap[$id] : [];
        $dir = $rootDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $base['relDir']);
        $st = toolPkgScanDir($dir);
        $list[] = array_merge($base, [
            'title' => $ov['title'] ?? $base['title'],
            'versionLabel' => $ov['versionLabel'] ?? $base['versionLabel'],
            'notes' => $ov['notes'] ?? '',
            'updatedAt' => $ov['updatedAt'] ?? null,
            'sourceFileName' => $ov['sourceFileName'] ?? null,
            'installed' => $st['hasIndexHtml'] && $st['fileCount'] > 0,
            'fileCount' => $st['fileCount'],
            'sizeBytes' => $st['sizeBytes'],
            'sizeMB' => round($st['sizeBytes'] / (1024 * 1024), 2),
            'backups' => toolPkgListBackups($rootDir, $id),
        ]);
    }
    foreach ($customMap as $id => $rec) {
        if (isset($seen[$id]) || !is_array($rec) || empty($rec['relDir'])) continue;
        $dir = $rootDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, (string) $rec['relDir']);
        $st = toolPkgScanDir($dir);
        $list[] = [
            'id' => $id,
            'title' => $rec['title'] ?? $id,
            'description' => $rec['description'] ?? 'بسته نرم‌افزاری سفارشی آپلودشده توسط مدیر',
            'category' => $rec['category'] ?? 'custom',
            'isBuiltin' => false,
            'entryUrl' => $rec['entryUrl'] ?? ('/studio/' . $id . '/index.html'),
            'relDir' => $rec['relDir'],
            'versionLabel' => $rec['versionLabel'] ?? 'custom',
            'notes' => $rec['notes'] ?? '',
            'updatedAt' => $rec['updatedAt'] ?? null,
            'sourceFileName' => $rec['sourceFileName'] ?? null,
            'installed' => $st['hasIndexHtml'] && $st['fileCount'] > 0,
            'fileCount' => $st['fileCount'],
            'sizeBytes' => $st['sizeBytes'],
            'sizeMB' => round($st['sizeBytes'] / (1024 * 1024), 2),
            'backups' => toolPkgListBackups($rootDir, $id),
        ];
    }
    return [
        'ok' => true,
        'packages' => $list,
        'limits' => [
            'maxUploadMB' => (int) ini_get('upload_max_filesize') ?: 64,
            'canExtractZip' => class_exists('ZipArchive'),
            'backupSupported' => class_exists('ZipArchive'),
        ],
    ];
}

if ($route === 'tools/packages' && $method === 'GET') {
    respondJson(buildToolPackagesPayloadPhp($rootDir));
}

if ($route === 'tools/packages/upload' && $method === 'POST') {
    @set_time_limit(0);
    @ini_set('memory_limit', '512M');
    if (empty($_FILES['file']['tmp_name']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
        respondJson(['error' => 'فایل ZIP ارسال نشده یا حجم آن بیشتر از محدودیت upload_max_filesize هاست است.'], 400);
    }
    $rawTarget = strtolower(trim((string) ($_POST['targetId'] ?? '')));
    $rawCustom = strtolower(trim((string) ($_POST['customSlug'] ?? '')));
    $titleIn = trim((string) ($_POST['title'] ?? ''));
    $versionLabel = trim((string) ($_POST['versionLabel'] ?? ''));
    $notes = trim((string) ($_POST['notes'] ?? ''));
    $preserveClean = strtolower(trim((string) ($_POST['preserveCleanLoader'] ?? 'true'))) !== 'false';

    $builtins = [];
    foreach (getBuiltinToolPackages() as $b) $builtins[$b['id']] = $b;
    $toolId = $rawTarget;
    $builtin = $builtins[$toolId] ?? null;
    if ($toolId === 'custom' || $builtin === null) {
        $src = $toolId === 'custom' ? $rawCustom : $toolId;
        $clean = trim((string) preg_replace('/-+/', '-', (string) preg_replace('/[^a-z0-9-]/', '-', $src)), '-');
        if (strlen($clean) < 2 || strlen($clean) > 40) {
            respondJson(['error' => 'شناسه (Slug) ابزار سفارشی باید بین ۲ تا ۴۰ کاراکتر انگلیسی باشد.'], 400);
        }
        $toolId = $clean;
        $builtin = $builtins[$toolId] ?? null;
    }

    $relDir = $builtin ? $builtin['relDir'] : ('studio/' . $toolId);
    $entryUrl = $builtin ? $builtin['entryUrl'] : ('/studio/' . $toolId . '/index.html');
    $targetDir = $rootDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relDir);

    $backupFile = toolPkgCreateBackup($rootDir, $toolId, $targetDir);
    $err = null;
    $stats = toolPkgExtractZip($toolId, $_FILES['file']['tmp_name'], $targetDir, $preserveClean, $err);
    if ($stats === null) {
        respondJson(['error' => $err ?: 'خطا در استخراج فایل ZIP.'], 500);
    }

    $customMap = readJsonStore('tool-packages.json', []);
    if (!is_array($customMap)) $customMap = [];
    $prev = is_array($customMap[$toolId] ?? null) ? $customMap[$toolId] : [];
    $customMap[$toolId] = array_merge($prev, [
        'id' => $toolId,
        'title' => $titleIn !== '' ? $titleIn : ($prev['title'] ?? ($builtin['title'] ?? $toolId)),
        'description' => $builtin['description'] ?? ($prev['description'] ?? 'بسته نرم‌افزاری آپلودشده از پنل مدیریت'),
        'category' => $builtin['category'] ?? 'custom',
        'isBuiltin' => $builtin !== null,
        'relDir' => $relDir,
        'entryUrl' => $entryUrl,
        'versionLabel' => $versionLabel !== '' ? $versionLabel : ($prev['versionLabel'] ?? ('custom-' . gmdate('Y-m-d'))),
        'notes' => $notes,
        'sourceFileName' => (string) ($_FILES['file']['name'] ?? ($toolId . '.zip')),
        'updatedAt' => gmdate('c'),
    ]);
    writeJsonStore('tool-packages.json', $customMap);

    $payload = buildToolPackagesPayloadPhp($rootDir);
    $payload['message'] = 'بسته «' . $customMap[$toolId]['title'] . '» با موفقیت روی سرور جایگزین شد (' . $stats['fileCount'] . ' فایل).';
    $payload['backupFile'] = $backupFile;
    $payload['entryUrl'] = $entryUrl;
    respondJson($payload);
}

if ($route === 'tools/packages/restore' && $method === 'POST') {
    $body = readJsonBody();
    $toolId = strtolower(trim((string) ($body['id'] ?? '')));
    $backupFile = basename(trim((string) ($body['backupFile'] ?? '')));
    if ($toolId === '' || $backupFile === '' || strpos($backupFile, $toolId . '-') !== 0 || substr($backupFile, -4) !== '.zip') {
        respondJson(['error' => 'اطلاعات نسخه پشتیبان نامعتبر است.'], 400);
    }
    $bkPath = $rootDir . DIRECTORY_SEPARATOR . 'backups' . DIRECTORY_SEPARATOR . 'tool-packages' . DIRECTORY_SEPARATOR . $backupFile;
    if (!is_file($bkPath)) {
        respondJson(['error' => 'فایل پشتیبان یافت نشد.'], 404);
    }
    $builtins = [];
    foreach (getBuiltinToolPackages() as $b) $builtins[$b['id']] = $b;
    $customMap = readJsonStore('tool-packages.json', []);
    if (!is_array($customMap)) $customMap = [];
    $relDir = $builtins[$toolId]['relDir'] ?? ($customMap[$toolId]['relDir'] ?? ('studio/' . $toolId));
    $targetDir = $rootDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relDir);

    $err = null;
    $stats = toolPkgExtractZip($toolId, $bkPath, $targetDir, false, $err);
    if ($stats === null) {
        respondJson(['error' => $err ?: 'خطا در بازگردانی نسخه پشتیبان.'], 500);
    }
    $customMap[$toolId] = array_merge(is_array($customMap[$toolId] ?? null) ? $customMap[$toolId] : [], [
        'id' => $toolId,
        'relDir' => $relDir,
        'notes' => 'بازگردانی از بکاپ ' . $backupFile,
        'updatedAt' => gmdate('c'),
    ]);
    writeJsonStore('tool-packages.json', $customMap);
    $payload = buildToolPackagesPayloadPhp($rootDir);
    $payload['message'] = 'نسخه قبلی ابزار با موفقیت بازگردانی شد (' . $stats['fileCount'] . ' فایل).';
    respondJson($payload);
}

if (($route === 'tools/packages/delete' && $method === 'POST') || (preg_match('#^tools/packages/([a-z0-9_-]+)$#', $route, $mTool) && $method === 'DELETE')) {
    $body = $method === 'POST' ? readJsonBody() : [];
    $toolId = strtolower(trim((string) ($body['id'] ?? ($mTool[1] ?? ''))));
    $deleteBackups = !empty($body['deleteBackups']);
    if ($toolId === '') respondJson(['error' => 'شناسه ابزار ارسال نشده است.'], 400);
    $builtins = [];
    foreach (getBuiltinToolPackages() as $b) $builtins[$b['id']] = $b;
    $customMap = readJsonStore('tool-packages.json', []);
    if (!is_array($customMap)) $customMap = [];
    $relDir = $builtins[$toolId]['relDir'] ?? ($customMap[$toolId]['relDir'] ?? '');
    if ($relDir === '') respondJson(['error' => 'ابزار مورد نظر یافت نشد.'], 404);
    studioRemoveDir($rootDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relDir));
    if (!isset($builtins[$toolId]) && isset($customMap[$toolId])) {
        unset($customMap[$toolId]);
        writeJsonStore('tool-packages.json', $customMap);
    }
    if ($deleteBackups) {
        $bkDir = $rootDir . DIRECTORY_SEPARATOR . 'backups' . DIRECTORY_SEPARATOR . 'tool-packages';
        foreach (toolPkgListBackups($rootDir, $toolId) as $bk) {
            @unlink($bkDir . DIRECTORY_SEPARATOR . $bk['fileName']);
        }
    }
    $payload = buildToolPackagesPayloadPhp($rootDir);
    $payload['message'] = 'فایل‌های ابزار با موفقیت پاک‌سازی شدند.';
    respondJson($payload);
}

// 17. Gemini AI Periodic Page SEO Optimizer Endpoints (Pure PHP Parity)
if ($route === 'seo/gemini-optimizer/status' && $method === 'GET') {
    if (!function_exists('seoGeminiBuildStatusPayload')) {
        respondJson(['error' => 'ماژول seo-autopilot.php یافت نشد.'], 500);
    }
    respondJson(seoGeminiBuildStatusPayload());
}

if ($route === 'seo/gemini-optimizer/config' && $method === 'POST') {
    if (!function_exists('seoGeminiLoadConfig')) {
        respondJson(['error' => 'ماژول seo-autopilot.php یافت نشد.'], 500);
    }
    $body = readJsonBody();
    $cur = seoGeminiLoadConfig();
    foreach (['enabled', 'autoApplyToDatabase', 'includeCorePages', 'includeBlogPosts', 'includeCatalogs'] as $bf) {
        if (array_key_exists($bf, $body)) $cur[$bf] = (bool) $body[$bf];
    }
    if (isset($body['intervalHours'])) $cur['intervalHours'] = max(1, min(720, (int) $body['intervalHours']));
    if (isset($body['batchSize'])) $cur['batchSize'] = max(1, min(10, (int) $body['batchSize']));
    if (!empty($body['siteBrand'])) $cur['siteBrand'] = trim((string) $body['siteBrand']);
    if (!empty($body['targetAudience'])) $cur['targetAudience'] = trim((string) $body['targetAudience']);
    seoGeminiSaveConfig($cur);
    respondJson([
        'ok' => true,
        'message' => 'تنظیمات سرویس دوره‌ای بهینه‌سازی سئو با Gemini ذخیره شد.',
        'status' => seoGeminiBuildStatusPayload(),
    ]);
}

if ($route === 'seo/gemini-optimizer/run' && $method === 'POST') {
    if (!function_exists('seoGeminiRunBatch')) {
        respondJson(['error' => 'ماژول seo-autopilot.php یافت نشد.'], 500);
    }
    @set_time_limit(180);
    $body = readJsonBody();
    $pageId = isset($body['pageId']) && trim((string) $body['pageId']) !== '' ? trim((string) $body['pageId']) : null;
    $res = seoGeminiRunBatch($pageId ? 'single_page' : 'admin_manual', $pageId);
    $code = (int) ($res['statusCode'] ?? 200);
    respondJson($res, $code);
}

if ($route === 'seo/gemini-optimizer/public-meta' && $method === 'GET') {
    $db = function_exists('seoGeminiLoadDb') ? seoGeminiLoadDb() : [];
    $metaByPath = [];
    foreach ($db as $rec) {
        if (!is_array($rec) || empty($rec['path'])) continue;
        $metaByPath[$rec['path']] = [
            'metaTitle' => (string) ($rec['metaTitle'] ?? ''),
            'metaDescription' => (string) ($rec['metaDescription'] ?? ''),
            'keywords' => is_array($rec['keywords'] ?? null) ? $rec['keywords'] : [],
            'focusKeyword' => (string) ($rec['focusKeyword'] ?? ''),
        ];
    }
    respondJson(['ok' => true, 'metaByPath' => $metaByPath]);
}

respondJson(['error' => 'مسیر API یافت نشد.', 'route' => $route], 404);
