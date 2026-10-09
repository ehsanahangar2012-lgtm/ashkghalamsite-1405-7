<?php
// PHP Backend Handler for Global Settings Persistence on cPanel / DirectAdmin / Shared Apache Hosts
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$settingsFile = __DIR__ . '/global_settings.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($settingsFile)) {
        $content = file_get_contents($settingsFile);
        echo $content ? $content : json_encode(new stdClass());
    } else {
        echo json_encode(new stdClass());
    }
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    if (!$rawInput) {
        http_response_code(400);
        echo json_encode(['error' => 'No data received']);
        exit();
    }

    $data = json_decode($rawInput, true);
    if (!$data || !is_array($data)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON payload']);
        exit();
    }

    $existing = [];
    if (file_exists($settingsFile)) {
        $existingContent = file_get_contents($settingsFile);
        if ($existingContent) {
            $parsed = json_decode($existingContent, true);
            if (is_array($parsed)) {
                $existing = $parsed;
            }
        }
    }

    $merged = array_merge($existing, $data);
    $merged['updatedAt'] = date('c');

    $saved = file_put_contents($settingsFile, json_encode($merged, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

    if ($saved !== false) {
        echo json_encode(['success' => true, 'settings' => $merged, 'message' => 'تنظیمات با موفقیت در هاست ذخیره شد']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'خطا در نگارش فایل روی هاست']);
    }
    exit();
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
