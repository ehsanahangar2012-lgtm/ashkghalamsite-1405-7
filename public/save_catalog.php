<?php
// PHP Backend Handler for Iranian cPanel / DirectAdmin / Shared Apache Hosts
// Automatically saves base64 catalog images to /uploads/ folder on the host
// and persists lightweight catalog metadata in catalogs.json

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$uploadsDir = __DIR__ . '/uploads';
if (!file_exists($uploadsDir)) {
    @mkdir($uploadsDir, 0755, true);
}

$catalogsFile = __DIR__ . '/catalogs.json';

// Helper function to extract, convert to WebP, and save base64 image string to file
function saveBase64ToFile($base64Str, $prefix, $uploadsDir) {
    if (empty($base64Str) || !is_string($base64Str) || !preg_match('/^data:image\/(\w+);base64,/', $base64Str, $typeMatch)) {
        return $base64Str; // Return as-is if not base64
    }
    
    $origExtension = strtolower($typeMatch[1]);
    $data = substr($base64Str, strpos($base64Str, ',') + 1);
    $decodedData = base64_decode($data);
    if ($decodedData === false) {
        return $base64Str;
    }

    $filename = $prefix . '_' . time() . '_' . rand(100, 999) . '.webp';
    $filePath = $uploadsDir . '/' . $filename;

    // If already webp or GD webp conversion not available, write directly
    if ($origExtension === 'webp' || !function_exists('imagecreatefromstring') || !function_exists('imagewebp')) {
        if ($origExtension !== 'webp') {
            $ext = ($origExtension === 'jpeg') ? 'jpg' : $origExtension;
            $filename = $prefix . '_' . time() . '_' . rand(100, 999) . '.' . $ext;
            $filePath = $uploadsDir . '/' . $filename;
        }
        if (file_put_contents($filePath, $decodedData)) {
            return 'uploads/' . $filename;
        }
        return $base64Str;
    }

    // Try server-side GD conversion to WebP for non-webp inputs
    try {
        $im = @imagecreatefromstring($decodedData);
        if ($im !== false) {
            // Enable transparency handling for PNG/GIF
            imagealphablending($im, true);
            imagesavealpha($im, true);
            if (@imagewebp($im, $filePath, 80)) {
                imagedestroy($im);
                return 'uploads/' . $filename;
            }
            imagedestroy($im);
        }
    } catch (\Throwable $e) {}

    // Fallback: save original format if webp conversion fails
    $ext = ($origExtension === 'jpeg') ? 'jpg' : $origExtension;
    $filename = $prefix . '_' . time() . '_' . rand(100, 999) . '.' . $ext;
    $filePath = $uploadsDir . '/' . $filename;
    if (file_put_contents($filePath, $decodedData)) {
        return 'uploads/' . $filename;
    }

    return $base64Str;
}

// GET: Return saved catalogs list with automatic discovery of uploads directory
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $catalogs = [];
    if (file_exists($catalogsFile)) {
        $content = file_get_contents($catalogsFile);
        $decoded = json_decode($content, true);
        if (is_array($decoded)) $catalogs = $decoded;
    }
    
    // Check uploads/custom_catalogs.json
    $uploadsCatFile = $uploadsDir . '/custom_catalogs.json';
    if (file_exists($uploadsCatFile)) {
        $upContent = file_get_contents($uploadsCatFile);
        $upDecoded = json_decode($upContent, true);
        if (is_array($upDecoded)) {
            $catMap = [];
            foreach ($catalogs as $c) { if (isset($c['id'])) $catMap[(string)$c['id']] = $c; }
            foreach ($upDecoded as $c) { if (isset($c['id'])) $catMap[(string)$c['id']] = $c; }
            $catalogs = array_values($catMap);
        }
    }

    // Auto-discover uploaded files in /uploads/
    if (file_exists($uploadsDir) && is_dir($uploadsDir)) {
        $files = scandir($uploadsDir);
        $imageFiles = [];
        $pdfFiles = [];
        foreach ($files as $f) {
            if ($f === '.' || $f === '..' || substr($f, -5) === '.json') continue;
            $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
            if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'])) {
                $imageFiles[] = 'uploads/' . $f;
            } elseif ($ext === 'pdf') {
                $pdfFiles[] = [
                    'id' => 'pdf_' . md5($f),
                    'title' => pathinfo($f, PATHINFO_FILENAME),
                    'description' => 'کاتالوگ فایل PDF بارگذاری شده در شاخه uploads',
                    'category' => 'کاتالوگ صنعتی',
                    'coverImage' => '/uploads/' . $f,
                    'pdfUrl' => '/uploads/' . $f,
                    'pageCount' => 1,
                    'isPublished' => true,
                    'createdAt' => date('c', filemtime($uploadsDir . '/' . $f)),
                    'pages' => []
                ];
            }
        }

        if (!empty($imageFiles)) {
            $referencedUrls = [];
            foreach ($catalogs as $cat) {
                if (!empty($cat['coverImage'])) $referencedUrls[] = ltrim($cat['coverImage'], '/');
                if (isset($cat['pages']) && is_array($cat['pages'])) {
                    foreach ($cat['pages'] as $p) {
                        if (is_array($p) && !empty($p['imageUrl'])) $referencedUrls[] = ltrim($p['imageUrl'], '/');
                        elseif (is_string($p)) $referencedUrls[] = ltrim($p, '/');
                    }
                }
            }

            $unreferenced = array_values(array_diff($imageFiles, $referencedUrls));
            if (!empty($unreferenced)) {
                $imageGroups = [];
                foreach ($unreferenced as $imgPath) {
                    $filename = pathinfo($imgPath, PATHINFO_FILENAME);
                    $cleanBase = preg_replace('/[-_]?(page|p)?[-_]?\d+$/i', '', $filename);
                    $cleanBase = trim(preg_replace('/[-_]+$/', '', $cleanBase));
                    $groupKey = (mb_strlen($cleanBase) >= 3) ? $cleanBase : $filename;

                    if (!isset($imageGroups[$groupKey])) {
                        $imageGroups[$groupKey] = [];
                    }
                    $imageGroups[$groupKey][] = $imgPath;
                }

                foreach ($imageGroups as $groupKey => $groupImages) {
                    natcasesort($groupImages);
                    $groupImages = array_values($groupImages);

                    $formattedTitle = trim(str_replace(['_', '-'], ' ', $groupKey));
                    $title = (strpos(mb_strtolower($formattedTitle), 'کاتالوگ') !== false) 
                        ? $formattedTitle 
                        : 'کاتالوگ ' . $formattedTitle;

                    $catalogId = 'auto_cat_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $groupKey);

                    $pages = [];
                    foreach ($groupImages as $idx => $imgUrl) {
                        $pages[] = [
                            'pageNumber' => $idx + 1,
                            'imageUrl' => '/' . $imgUrl,
                            'thumbnailUrl' => '/' . $imgUrl,
                            'title' => 'صفحه ' . ($idx + 1)
                        ];
                    }

                    $distinctCat = [
                        'id' => $catalogId,
                        'title' => $title,
                        'description' => 'کاتالوگ اختصاصی با ' . count($groupImages) . ' صفحه موجود در پوشه uploads',
                        'category' => 'کاتالوگ صنعتی',
                        'coverImage' => '/' . $groupImages[0],
                        'thumbnailUrl' => '/' . $groupImages[0],
                        'pageCount' => count($groupImages),
                        'isPublished' => true,
                        'createdAt' => date('c'),
                        'pages' => $pages
                    ];

                    $found = false;
                    foreach ($catalogs as $idx => $cat) {
                        if (isset($cat['id']) && (string)$cat['id'] === $catalogId) {
                            $catalogs[$idx] = $distinctCat;
                            $found = true;
                            break;
                        }
                    }
                    if (!$found) {
                        array_unshift($catalogs, $distinctCat);
                    }
                }
            }
        }

        foreach ($pdfFiles as $pdfCat) {
            $found = false;
            foreach ($catalogs as $cat) {
                if (isset($cat['id']) && (string)$cat['id'] === (string)$pdfCat['id']) {
                    $found = true;
                    break;
                }
            }
            if (!$found) $catalogs[] = $pdfCat;
        }
    }

    echo json_encode($catalogs, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

// POST: Save catalog or upload image
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    // Single Image Base64 Upload
    if (isset($input['action']) && $input['action'] === 'upload_image' && !empty($input['image'])) {
        $url = saveBase64ToFile($input['image'], 'img', $uploadsDir);
        echo json_encode(['url' => $url]);
        exit();
    }

    // Full Catalog Object Save
    if (isset($input['catalog']) || isset($input['id'])) {
        $cat = isset($input['catalog']) ? $input['catalog'] : $input;
        $catId = isset($cat['id']) ? $cat['id'] : 'cat_' . time();

        // Save cover and thumbnail to disk
        if (!empty($cat['coverImage'])) {
            $cat['coverImage'] = saveBase64ToFile($cat['coverImage'], 'cover_' . $catId, $uploadsDir);
        }
        if (!empty($cat['thumbnailUrl'])) {
            $cat['thumbnailUrl'] = saveBase64ToFile($cat['thumbnailUrl'], 'thumb_' . $catId, $uploadsDir);
        }

        // Save all page images to disk
        if (isset($cat['pages']) && is_array($cat['pages'])) {
            foreach ($cat['pages'] as $idx => &$page) {
                if (!empty($page['imageUrl'])) {
                    $page['imageUrl'] = saveBase64ToFile($page['imageUrl'], 'p_' . $catId . '_' . ($idx + 1), $uploadsDir);
                }
                if (!empty($page['thumbnailUrl'])) {
                    $page['thumbnailUrl'] = saveBase64ToFile($page['thumbnailUrl'], 'pt_' . $catId . '_' . ($idx + 1), $uploadsDir);
                }
            }
        }

        // Load existing catalogs
        $catalogs = [];
        if (file_exists($catalogsFile)) {
            $existing = json_decode(file_get_contents($catalogsFile), true);
            if (is_array($existing)) $catalogs = $existing;
        }

        // Update or Insert
        $updated = false;
        foreach ($catalogs as $index => $item) {
            if ((string)$item['id'] === (string)$catId) {
                $catalogs[$index] = array_merge($item, $cat);
                $updated = true;
                break;
            }
        }

        if (!$updated) {
            array_unshift($catalogs, $cat);
        }

        // Save updated JSON file
        if (file_put_contents($catalogsFile, json_encode($catalogs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
            echo json_encode(['success' => true, 'catalog' => $cat]);
        } else {
            echo json_encode(['error' => 'نوشتن در فایل catalogs.json انجام نشد. مجوز پوشه را بررسی کنید (755 یا 777).']);
        }
        exit();
    }
}

// DELETE: Delete catalog by ID
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $id = isset($_GET['id']) ? $_GET['id'] : null;
    if ($id && file_exists($catalogsFile)) {
        $catalogs = json_decode(file_get_contents($catalogsFile), true);
        if (is_array($catalogs)) {
            $filtered = array_values(array_filter($catalogs, function($item) use ($id) {
                return (string)$item['id'] !== (string)$id;
            }));
            file_put_contents($catalogsFile, json_encode($filtered, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }
    }
    echo json_encode(['success' => true]);
    exit();
}

echo json_encode(['error' => 'درخواست نامعتبر است']);
