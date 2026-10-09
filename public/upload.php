<?php
// PHP Backend Handler for File Uploads on Iranian cPanel / DirectAdmin / Shared Apache Hosts
// Automatically saves uploaded files to the /uploads/ folder and returns the relative path.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $uploadField = isset($_FILES['image']) ? 'image' : (isset($_FILES['file']) ? 'file' : null);
    
    if ($uploadField && $_FILES[$uploadField]['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES[$uploadField];
        $fileName = time() . '_' . basename($file['name']);
        // Sanitize filename
        $fileName = preg_replace("/[^a-zA-Z0-9.\-_]/", "", $fileName);
        $targetPath = $uploadsDir . '/' . $fileName;

        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            // Check if we need to convert to WebP (optional for images)
            $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
            if (in_array($ext, ['jpg', 'jpeg', 'png'])) {
                $webpPath = $uploadsDir . '/' . pathinfo($fileName, PATHINFO_FILENAME) . '.webp';
                if ($ext === 'jpg' || $ext === 'jpeg') {
                    $img = @imagecreatefromjpeg($targetPath);
                } else if ($ext === 'png') {
                    $img = @imagecreatefrompng($targetPath);
                    if ($img) {
                        imagepalettetotruecolor($img);
                        imagealphablending($img, true);
                        imagesavealpha($img, true);
                    }
                }
                if (isset($img) && $img) {
                    imagewebp($img, $webpPath, 85);
                    imagedestroy($img);
                    if (file_exists($webpPath)) {
                        unlink($targetPath);
                        $fileName = pathinfo($fileName, PATHINFO_FILENAME) . '.webp';
                    }
                }
            }
            
            $publicUrl = './uploads/' . $fileName;
            
            echo json_encode([
                'success' => true,
                'url' => $publicUrl,
                'message' => 'فایل با موفقیت آپلود شد'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'خطا در ذخیره فایل در هاست']);
        }
    } else {
        http_response_code(400);
        $errorMsg = 'فایلی ارسال نشده یا خطایی در ارسال رخ داده است';
        if (isset($_FILES['file']['error'])) {
            $errorMsg .= ' (کد خطا: ' . $_FILES['file']['error'] . ')';
        }
        echo json_encode(['error' => $errorMsg]);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'متد غیرمجاز']);
}
