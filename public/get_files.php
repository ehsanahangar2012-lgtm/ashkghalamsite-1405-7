<?php
// PHP Backend Handler for Listing Uploaded Files on cPanel / DirectAdmin / Shared Apache Hosts
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$uploadsDir = __DIR__ . '/uploads';
$mediaDir = __DIR__ . '/media';

$filesList = [];

function scanDirForImages($dirPath, $urlPrefix) {
    $result = [];
    if (file_exists($dirPath) && is_dir($dirPath)) {
        $items = scandir($dirPath);
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;
            $fullPath = $dirPath . '/' . $item;
            if (is_file($fullPath)) {
                $ext = strtolower(pathinfo($item, PATHINFO_EXTENSION));
                if (in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'])) {
                    $mtime = filemtime($fullPath);
                    $result[] = [
                        'id' => md5($item . $mtime),
                        'filename' => $item,
                        'url' => $urlPrefix . '/' . $item,
                        'size' => filesize($fullPath),
                        'mtime' => $mtime
                    ];
                }
            }
        }
    }
    return $result;
}

$uploadFiles = scanDirForImages($uploadsDir, './uploads');
$mediaFiles = scanDirForImages($mediaDir, './media');

$filesList = array_merge($uploadFiles, $mediaFiles);

usort($filesList, function($a, $b) {
    return $b['mtime'] - $a['mtime'];
});

echo json_encode($filesList, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
