<?php
// PHP Backend Handler for fetching Global Settings & Branding on Apache/cPanel Hosts
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$settingsFile = __DIR__ . '/global_settings.json';

if (file_exists($settingsFile)) {
    echo file_get_contents($settingsFile);
} else {
    echo json_encode(['success' => false, 'message' => 'تنظیماتی در هاست یافت نشد']);
}
