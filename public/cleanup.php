<?php
// PHP Backend Handler for File Cleanup on Apache/cPanel Shared Hosts
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$uploadsDir = __DIR__ . '/uploads';
$deletedCount = 0;
$maxAgeSeconds = 30 * 24 * 3600; // 30 days
$now = time();

if (file_exists($uploadsDir) && is_dir($uploadsDir)) {
    $files = scandir($uploadsDir);
    foreach ($files as $f) {
        if ($f === '.' || $f === '..') continue;
        if (strpos($f, 'temp_') === 0 || strpos($f, 'tmp_') !== false) {
            $filePath = $uploadsDir . '/' . $f;
            if (is_file($filePath)) {
                if ($now - filemtime($filePath) > $maxAgeSeconds) {
                    if (@unlink($filePath)) {
                        $deletedCount++;
                    }
                }
            }
        }
    }
}

echo json_encode([
    'success' => true,
    'deletedCount' => $deletedCount,
    'message' => 'پاکسازی هاست با موفقیت انجام شد. تعداد فایل‌های پاک‌شده: ' . $deletedCount
], JSON_UNESCAPED_UNICODE);
