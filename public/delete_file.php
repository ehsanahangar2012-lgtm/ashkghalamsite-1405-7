<?php
// PHP Backend Handler for deleting uploaded media files on Apache/cPanel Hosts
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$uploadsDir = __DIR__ . '/uploads';

$filename = isset($_GET['file']) ? $_GET['file'] : null;
if (!$filename) {
    $raw = json_decode(file_get_contents('php://input'), true);
    if (isset($raw['file'])) {
        $filename = $raw['file'];
    }
}

if ($filename) {
    // Sanitize filename
    $filename = basename($filename);
    $filePath = $uploadsDir . '/' . $filename;
    
    if (file_exists($filePath) && is_file($filePath)) {
        if (@unlink($filePath)) {
            echo json_encode(['success' => true, 'message' => 'فایل با موفقیت حذف شد']);
            exit();
        }
    }
}

echo json_encode(['success' => false, 'message' => 'فایل یافت نشد یا قابل حذف نیست']);
