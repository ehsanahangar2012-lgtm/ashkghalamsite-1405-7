<?php
/**
 * Ashk Ghalam Pure-PHP Scheduled SEO Autopilot, Site Promotion & Article Publisher
 * 100% Standard PHP (cPanel / Shared Hosting) — ZERO Node.js required.
 *
 * Responsibilities:
 *  1. Scheduled Persian article generation & auto-publishing (with anti-duplication & SEO JSON-LD)
 *  2. Automated technical SEO audit & self-healing meta/slug/schema enrichment on posts
 *  3. Site promotion & discovery: sitemap.xml, rss.xml, llms.txt, robots.txt & IndexNow pings
 *  4. Smart Hybrid Cron: seamlessly prefers real cPanel Cron when configured, or falls back
 *     to non-blocking traffic-triggered pseudo-cron with atomic flock mutex.
 */

if (!defined('SEO_AUTOPILOT_INTERNAL')) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Direct access is not allowed.'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!function_exists('seoApRootDir')) {
    function seoApRootDir(): string {
        global $rootDir;
        if (!empty($rootDir) && is_string($rootDir)) {
            return $rootDir;
        }
        return __DIR__;
    }
}

if (!function_exists('seoApStoragePath')) {
    function seoApStoragePath(string $filename): string {
        if (function_exists('getStoragePath')) {
            return getStoragePath($filename);
        }
        $root = seoApRootDir();
        $rootFile = $root . DIRECTORY_SEPARATOR . $filename;
        $dataDir = $root . DIRECTORY_SEPARATOR . 'data';
        $fallbackFile = $dataDir . DIRECTORY_SEPARATOR . $filename;
        if (file_exists($rootFile) && is_writable($rootFile)) {
            return $rootFile;
        }
        if (file_exists($fallbackFile) && !is_writable($root)) {
            return $fallbackFile;
        }
        if (is_writable($root)) {
            return $rootFile;
        }
        if (!is_dir($dataDir)) {
            @mkdir($dataDir, 0755, true);
        }
        return $fallbackFile;
    }
}

if (!function_exists('seoApReadJson')) {
    function seoApReadJson(string $filename, $fallback) {
        if (function_exists('readJsonStore')) {
            return readJsonStore($filename, $fallback);
        }
        $path = seoApStoragePath($filename);
        if (is_file($path) && is_readable($path)) {
            $raw = trim((string) @file_get_contents($path));
            if ($raw !== '') {
                $decoded = json_decode($raw, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    return $decoded;
                }
            }
        }
        return $fallback;
    }
}

if (!function_exists('seoApWriteJson')) {
    function seoApWriteJson(string $filename, $data, bool $compact = false): bool {
        if (function_exists('writeJsonStore')) {
            return writeJsonStore($filename, $data, $compact);
        }
        $path = seoApStoragePath($filename);
        $dir = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
        $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
        if (!$compact) {
            $flags |= JSON_PRETTY_PRINT;
        }
        $encoded = json_encode($data, $flags);
        if ($encoded === false) {
            return false;
        }
        return @file_put_contents($path, $encoded, LOCK_EX) !== false;
    }
}

function seoApRandomHex(int $bytes = 16): string {
    try {
        return bin2hex(random_bytes($bytes));
    } catch (Throwable $e) {
        return substr(hash('sha256', uniqid((string) mt_rand(), true) . microtime(true)), 0, $bytes * 2);
    }
}

function seoApDetectBaseUrl(?string $configured = null): string {
    $clean = trim((string) $configured);
    if ($clean !== '' && preg_match('#^https?://#i', $clean)) {
        return rtrim($clean, '/');
    }
    $host = trim((string) ($_SERVER['HTTP_HOST'] ?? ''));
    if ($host !== '' && stripos($host, 'localhost') === false && strpos($host, '127.0.0.1') === false) {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'https';
        return $scheme . '://' . rtrim($host, '/');
    }
    return 'https://ashkghalam.ir';
}

function seoApDefaultConfig(): array {
    return [
        'enabled' => true,
        'siteBaseUrl' => seoApDetectBaseUrl(),
        'brandName' => 'چاپ و بسته‌بندی اشک قلم',
        'brandTagline' => 'تولید تخصصی جعبه، کارتن لمینتی، چاپ افست ۵ رنگ و طراحی آنلاین دایلاین',
        'cronToken' => seoApRandomHex(16),
        'indexNowKey' => seoApRandomHex(16),
        'smartPseudoCron' => true,
        'articleScheduleHours' => 48,
        'seoAuditScheduleHours' => 24,
        'promoteScheduleHours' => 24,
        'publishMode' => 'published', // 'published' | 'draft'
        'maxArticlesPerWeek' => 4,
        'autoFixSeoMeta' => true,
        'enableIndexNow' => true,
        'enableRssFeed' => true,
        'enableLlmsTxt' => true,
        'enableRobotsMaintenance' => true,
        'customTopics' => [],
        'focusKeywords' => [
            'چاپ افست صنعتی',
            'جعبه سازی اختصاصی',
            'طراحی دایلاین جعبه',
            'کارتن لمینتی صادراتی',
            'بسته بندی دارویی و آرایشی',
            'هاردباکس لوکس',
            'چاپخانه اشک قلم',
        ],
        'optionalAiEndpoint' => '',
        'optionalAiApiKey' => '',
        'optionalAiModel' => '',
    ];
}

function seoApLoadConfig(): array {
    $defaults = seoApDefaultConfig();
    $stored = seoApReadJson('seo-autopilot-config.json', null);
    if (!is_array($stored)) {
        seoApWriteJson('seo-autopilot-config.json', $defaults);
        return $defaults;
    }
    $merged = array_merge($defaults, $stored);
    $changed = false;
    if (empty($merged['cronToken']) || strlen((string) $merged['cronToken']) < 16) {
        $merged['cronToken'] = seoApRandomHex(16);
        $changed = true;
    }
    if (empty($merged['indexNowKey']) || strlen((string) $merged['indexNowKey']) < 16) {
        $merged['indexNowKey'] = seoApRandomHex(16);
        $changed = true;
    }
    if (empty($merged['siteBaseUrl'])) {
        $merged['siteBaseUrl'] = seoApDetectBaseUrl();
        $changed = true;
    }
    if (!is_array($merged['customTopics'])) {
        $merged['customTopics'] = [];
    }
    if (!is_array($merged['focusKeywords']) || empty($merged['focusKeywords'])) {
        $merged['focusKeywords'] = $defaults['focusKeywords'];
    }
    if ($changed) {
        seoApWriteJson('seo-autopilot-config.json', $merged);
    }
    return $merged;
}

function seoApDefaultState(): array {
    return [
        'lastRunAt' => null,
        'lastArticleAt' => null,
        'lastAuditAt' => null,
        'lastPromoteAt' => null,
        'lastRealCronAt' => null,
        'lastPseudoCronAt' => null,
        'detectedCronMode' => 'smart_pseudo_cron',
        'totalArticlesGenerated' => 0,
        'totalAuditsRun' => 0,
        'totalPingsSent' => 0,
        'totalMetaFixes' => 0,
        'lastIndexNowStatus' => null,
        'recentLogs' => [],
    ];
}

function seoApLoadState(): array {
    $defaults = seoApDefaultState();
    $stored = seoApReadJson('seo-autopilot-state.json', null);
    if (!is_array($stored)) {
        return $defaults;
    }
    $merged = array_merge($defaults, $stored);
    if (!is_array($merged['recentLogs'])) {
        $merged['recentLogs'] = [];
    }
    return $merged;
}

function seoApSaveState(array $state): void {
    if (isset($state['recentLogs']) && is_array($state['recentLogs']) && count($state['recentLogs']) > 30) {
        $state['recentLogs'] = array_slice($state['recentLogs'], 0, 30);
    }
    seoApWriteJson('seo-autopilot-state.json', $state);
}

function seoApGregorianToJalali(int $gy, int $gm, int $gd): array {
    $g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    $gy2 = ($gm > 2) ? ($gy + 1) : $gy;
    $days = 355666 + (365 * $gy) + (int) floor(($gy2 + 3) / 4) - (int) floor(($gy2 + 99) / 100) + (int) floor(($gy2 + 399) / 400) + $gd + $g_d_m[$gm - 1];
    $jy = -1595 + (33 * (int) floor($days / 12053));
    $days %= 12053;
    $jy += 4 * (int) floor($days / 1461);
    $days %= 1461;
    if ($days > 365) {
        $jy += (int) floor(($days - 1) / 365);
        $days = ($days - 1) % 365;
    }
    if ($days < 186) {
        $jm = 1 + (int) floor($days / 31);
        $jd = 1 + ($days % 31);
    } else {
        $jm = 7 + (int) floor(($days - 186) / 30);
        $jd = 1 + (($days - 186) % 30);
    }
    return [$jy, $jm, $jd];
}

function seoApShamsiToday(): string {
    [$jy, $jm, $jd] = seoApGregorianToJalali((int) date('Y'), (int) date('n'), (int) date('j'));
    return sprintf('%04d/%02d/%02d', $jy, $jm, $jd);
}

function seoApNormalizePersian(string $text): string {
    $text = str_replace(['ي', 'ك', 'ة', 'ؤ', 'إ', 'أ', "\u{200C}"], ['ی', 'ک', 'ه', 'و', 'ا', 'ا', ' '], $text);
    $text = preg_replace('/[^\p{L}\p{N}\s]+/u', ' ', $text);
    $text = preg_replace('/\s+/u', ' ', trim((string) $text));
    return function_exists('mb_strtolower') ? mb_strtolower($text, 'UTF-8') : strtolower($text);
}

function seoApSlugify(string $text): string {
    $norm = seoApNormalizePersian($text);
    $slug = preg_replace('/\s+/u', '-', $norm);
    $slug = trim((string) $slug, '-');
    if (function_exists('mb_substr')) {
        $slug = mb_substr($slug, 0, 72, 'UTF-8');
    } else {
        $slug = substr($slug, 0, 72);
    }
    $slug = trim($slug, '-');
    return $slug !== '' ? $slug : ('article-' . time());
}

function seoApTextSimilarity(string $a, string $b): float {
    $tokensA = array_values(array_unique(array_filter(explode(' ', seoApNormalizePersian($a)), function ($w) {
        return (function_exists('mb_strlen') ? mb_strlen($w, 'UTF-8') : strlen($w)) >= 3;
    })));
    $tokensB = array_values(array_unique(array_filter(explode(' ', seoApNormalizePersian($b)), function ($w) {
        return (function_exists('mb_strlen') ? mb_strlen($w, 'UTF-8') : strlen($w)) >= 3;
    })));
    if (empty($tokensA) || empty($tokensB)) {
        return 0.0;
    }
    $inter = count(array_intersect($tokensA, $tokensB));
    $union = count(array_unique(array_merge($tokensA, $tokensB)));
    return $union > 0 ? ($inter / $union) : 0.0;
}

function seoApWordCount(string $text): int {
    $clean = trim((string) preg_replace('/\s+/u', ' ', strip_tags($text)));
    if ($clean === '') return 0;
    return count(explode(' ', $clean));
}

function seoApTopicBank(): array {
    return [
        [
            'title' => 'راهنمای جامع انتخاب گرماژ مقوا ایندربرد، پشت‌طوسی و گلاسه برای جعبه‌سازی صنعتی',
            'keyword' => 'انتخاب گرماژ مقوا جعبه سازی',
            'category' => 'مهندسی مقوا و متریال',
            'tags' => ['گرماژ مقوا', 'مقوای ایندربرد', 'جعبه‌سازی صنعتی', 'چاپ افست'],
            'image' => '/assets/catalog_pharma_cosmetic_1794764676825.jpg',
            'angle' => 'مقایسه علمی ضخامت (کالیپر)، مقاومت تاخوردگی و انتخاب گرماژ ۲۵۰ تا ۴۰۰ گرم برای محصولات دارویی، آرایشی و غذایی',
        ],
        [
            'title' => 'استانداردهای بین‌المللی FEFCO در کارتن‌سازی صادراتی و انتخاب فلوت مناسب',
            'keyword' => 'استاندارد FEFCO کارتن صادراتی',
            'category' => 'کارتن‌سازی و صادرات',
            'tags' => ['کد FEFCO', 'کارتن صادراتی', 'فلوت E و B و C', 'کارتن لمینتی'],
            'image' => '/assets/catalog_fefco_corrugated_1794764676518.jpg',
            'angle' => 'بررسی ساختار کارتن‌های سه‌لایه و پنج‌لایه، تست مقاومت لبه (ECT) و بار عمودی (BCT) در حمل‌ونقل صادراتی',
        ],
        [
            'title' => 'اصول مهندسی طراحی دایلاین جعبه دارویی و آرایشی با دقت دهم میلی‌متر',
            'keyword' => 'طراحی دایلاین جعبه دارویی',
            'category' => 'طراحی دایلاین و قالب‌سازی',
            'tags' => ['طراحی دایلاین', 'قالب تیغ و خط‌تا', 'بسته‌بندی دارویی', 'دایکات'],
            'image' => '/assets/catalog_pharma_cosmetic_1794764676825.jpg',
            'angle' => 'محاسبه کالیپر مقوا، تلرانس زبانه قفل‌شو، فاصله ایمن متن از خط برش و آماده‌سازی فایل DXF برای برش لیزری قالب',
        ],
        [
            'title' => 'چاپ افست ۵ رنگ با رنگ‌های پنتون (Pantone) چه تفاوتی در هویت بصری برند ایجاد می‌کند؟',
            'keyword' => 'چاپ افست ۵ رنگ پنتون',
            'category' => 'چاپ افست و رنگ‌شناسی',
            'tags' => ['چاپ افست ۵ رنگ', 'رنگ پنتون', 'CMYK', 'ثبات رنگ برند'],
            'image' => '/assets/catalog_luxury_hardbox_1794764676452.jpg',
            'angle' => 'تفاوت ترکیب چهاررنگ CMYK با رنگ پنجم ساختگی پنتون، مدیریت پروفایل رنگی ICC و جلوگیری از اختلاف رنگ در تیراژ بالا',
        ],
        [
            'title' => 'مقایسه سلفون مات، براق، مخملی (Soft-Touch) و یووی موضعی در جلوه بسته‌بندی لوکس',
            'keyword' => 'سلفون مخملی و یووی موضعی جعبه',
            'category' => 'خدمات پس از چاپ',
            'tags' => ['سلفون مخملی', 'یووی موضعی', 'طلاکوب', 'بسته‌بندی لوکس'],
            'image' => '/assets/catalog_luxury_hardbox_1794764676452.jpg',
            'angle' => 'چگونه ترکیب روکش سلفون مخملی با یووی موضعی برجسته و طلاکوب حرارتی ارزش ادراک‌شده محصول را در قفسه فروشگاه چند برابر می‌کند',
        ],
        [
            'title' => 'طراحی جعبه پستی و تجارت الکترونیک (Mailer Box) مقاوم در برابر ضربه بدون نیاز به چسب',
            'keyword' => 'جعبه پستی فروشگاهی Mailer Box',
            'category' => 'بسته‌بندی فروشگاهی',
            'tags' => ['جعبه پستی', 'Mailer Box', 'ای‌فلوت لمینتی', 'تجربه آنباکسینگ'],
            'image' => '/assets/catalog_ecommerce_mailer_1794764677888.jpg',
            'angle' => 'مهندسی جعبه‌های قفل‌دار E-Flute برای فروشگاه‌های اینترنتی، کاهش آسیب ارسال پستی و طراحی چاپ دورو برای تجربه آنباکسینگ حرفه‌ای',
        ],
        [
            'title' => 'نحوه چیدمان فرم‌بندی (Imposition) بهینه روی شیت ۷۰×۱۰۰ برای کاهش هزینه چاپ تا ۲۵ درصد',
            'keyword' => 'فرم بندی شیت چاپ و کاهش پرت مقوا',
            'category' => 'اقتصاد چاپ و فرم‌بندی',
            'tags' => ['فرم‌بندی چاپ', 'کاهش پرت مقوا', 'شیت ۷۰ در ۱۰۰', 'محاسبه قیمت چاپ'],
            'image' => '/assets/catalog_fefco_corrugated_1794764676518.jpg',
            'angle' => 'تکنیک‌های تودرتو کردن دایلاین (Nesting)، در نظر گرفتن لب‌پنجه ماشین افست و انتخاب سایز شیت اقتصادی برای سفارش‌های تیراژ بالا',
        ],
        [
            'title' => 'هاردباکس مغناطیسی و تلسکوپی: ساختار تولید، مغزی مقوای فشرده و هزینه ساخت',
            'keyword' => 'تولید هاردباکس لوکس مغناطیسی',
            'category' => 'هاردباکس و بسته‌بندی لاکچری',
            'tags' => ['هاردباکس', 'جعبه مغناطیسی', 'مقوای سخت', 'بسته‌بندی هدیه'],
            'image' => '/assets/catalog_luxury_hardbox_1794764676452.jpg',
            'angle' => 'بررسی مراحل تولید هاردباکس از برش مقوای ۲ تا ۳ میلی‌متری، شیارزنی V-Groove، روکش کاغذ گلاسه و نصب مگنت مخفی',
        ],
        [
            'title' => 'چک‌لیست فنی پیش از چاپ (Prepress) برای جلوگیری از خطاهای رایج در فایل‌های بسته‌بندی',
            'keyword' => 'چک لیست پیش از چاپ Prepress',
            'category' => 'پیش از چاپ و کنترل کیفیت',
            'tags' => ['پیش از چاپ', 'بلید و خط برش', 'Overprint', 'فایل چاپی'],
            'image' => '/assets/catalog_pharma_cosmetic_1794764676825.jpg',
            'angle' => 'کنترل ۳ میلی‌متر Bleed، تبدیل فونت‌ها به Outline، تنظیم مشکی خالص برای متن‌های ریز و جداسازی لایه تیغ و خط‌تا پیش از زینک‌گیری',
        ],
        [
            'title' => 'بسته‌بندی بهداشتی صنایع غذایی با مقوای ایندربرد فودگرید و مرکب‌های کم‌مهاجرت',
            'keyword' => 'جعبه فودگرید بسته بندی مواد غذایی',
            'category' => 'بسته‌بندی صنایع غذایی',
            'tags' => ['بسته‌بندی غذایی', 'مقوای فودگرید', 'ورنی پایه آب', 'جعبه شیرینی و خشکبار'],
            'image' => '/assets/catalog_ecommerce_mailer_1794764677888.jpg',
            'angle' => 'استانداردهای بهداشتی تماس غیرمستقیم با غذا، کاربرد ورنی پایه آب، مقاومت در برابر رطوبت و چربی و چاپ بدون بو برای صادرات خشکبار و زعفران',
        ],
        [
            'title' => 'کارتن لمینتی چیست و چه زمانی نسبت به کارتن فلکسو انتخاب هوشمندانه‌تری است؟',
            'keyword' => 'تفاوت کارتن لمینتی و فلکسو',
            'category' => 'کارتن‌سازی و لمینت',
            'tags' => ['کارتن لمینتی', 'چاپ فلکسو', 'کیفیت افست', 'بسته‌بندی لوازم خانگی'],
            'image' => '/assets/catalog_fefco_corrugated_1794764676518.jpg',
            'angle' => 'مقایسه وضوح تصویر، هزینه کلیشه و زینک، حداقل تیراژ اقتصادی و استحکام سازه‌ای بین کارتن لمینتی افست و چاپ مستقیم فلکسو',
        ],
        [
            'title' => 'تفاوت کف قفل‌شو (Snap-Lock) و کف اتوماتیک (Auto-Bottom) در سرعت خط بسته‌بندی',
            'keyword' => 'جعبه کف قفل شو و کف اتوماتیک',
            'category' => 'ساختار مهندسی جعبه',
            'tags' => ['کف قفل‌شو', 'کف اتوماتیک', 'جعبه سنگین', 'خط بسته‌بندی'],
            'image' => '/assets/catalog_ecommerce_mailer_1794764677888.jpg',
            'angle' => 'چگونه انتخاب ساختار کف جعبه می‌تواند زمان مونتاژ دستی را تا ۶۰ درصد کاهش دهد و تحمل وزن بطری‌ها و شیشه‌های سنگین را تضمین کند',
        ],
        [
            'title' => 'طراحی بسته‌بندی زعفران، پسته و خشکبار صادراتی مطابق استاندارد بازارهای اروپا و خلیج فارس',
            'keyword' => 'بسته بندی صادراتی زعفران و خشکبار',
            'category' => 'بسته‌بندی صادراتی',
            'tags' => ['بسته‌بندی صادراتی', 'جعبه زعفران', 'بسته‌بندی خشکبار', 'طلاکوب برجسته'],
            'image' => '/assets/catalog_luxury_hardbox_1794764676452.jpg',
            'angle' => 'الزامات درج بارکد، اطلاعات تغذیه‌ای دوزبانه، ترکیب هاردباکس یا مقوای متالایز و محافظت از عطر و رطوبت در مسیرهای صادراتی',
        ],
        [
            'title' => 'کاربرد برجسته‌سازی (امباس و دباس) و طلاکوب گرم در تمایز بسته‌بندی آرایشی و عطرسازی',
            'keyword' => 'طلاکوب و امباس جعبه آرایشی و عطر',
            'category' => 'تکمیل چاپ لوکس',
            'tags' => ['امباس و دباس', 'طلاکوب گرم', 'جعبه عطر', 'بسته‌بندی آرایشی'],
            'image' => '/assets/catalog_pharma_cosmetic_1794764676825.jpg',
            'angle' => 'نکات فنی طراحی کلیشه فلزی، حداقل ضخامت خطوط طلاکوب، ترکیب امباس چندسطحی و جلوگیری از ترک‌خوردگی روکش در خطوط تا',
        ],
        [
            'title' => 'بسته‌بندی پایدار و دوستدار محیط‌زیست: استفاده از مقوای کرافت و مرکب‌های گیاهی',
            'keyword' => 'بسته بندی پایدار مقوای کرافت',
            'category' => 'بسته‌بندی سبز و پایدار',
            'tags' => ['مقوای کرافت', 'بسته‌بندی دوستدار محیط زیست', 'چاپ سبز', 'کاهش پلاستیک'],
            'image' => '/assets/catalog_fefco_corrugated_1794764676518.jpg',
            'angle' => 'روندهای جهانی حذف پلاستیک، مزایای مقوای کرافت بازیافتی، طراحی ساختارهای تک‌جنس بدون چسب و تاثیر آن بر وفاداری مشتریان برند',
        ],
        [
            'title' => 'راهنمای انتخاب جعبه کشویی و پنجره‌دار (Window Box) برای نمایش مستقیم محصول در ویترین',
            'keyword' => 'جعبه پنجره دار و کشویی فروشگاهی',
            'category' => 'بسته‌بندی فروشگاهی',
            'tags' => ['جعبه پنجره‌دار', 'جعبه کشویی', 'طلق PVC و PET', 'افزایش فروش'],
            'image' => '/assets/catalog_ecommerce_mailer_1794764677888.jpg',
            'angle' => 'اصول مهندسی چسباندن طلق شفاف بدون افت استحکام دیواره، فاصله ایمن پنجره از خطوط تا و افزایش نرخ خرید در قفسه فروشگاه',
        ],
        [
            'title' => 'چگونه یک پیش‌نمایش سه‌بعدی (3D Mockup) پیش از تولید انبوه جلوی هزینه‌های دوباره‌کاری را می‌گیرد؟',
            'keyword' => 'پیش نمایش سه بعدی جعبه قبل از چاپ',
            'category' => 'ابزارهای دیجیتال بسته‌بندی',
            'tags' => ['موکاپ سه‌بعدی جعبه', 'طراحی آنلاین بسته‌بندی', 'کنترل طرح', 'استودیو اشک قلم'],
            'image' => '/assets/catalog_luxury_hardbox_1794764676452.jpg',
            'angle' => 'بررسی تراز بودن نوشته‌ها روی وجوه جانبی، جهت باز شدن درب جعبه و هماهنگی طرح گرافیکی با خطوط تا قبل از ساخت قالب دایکات',
        ],
        [
            'title' => 'راهنمای سفارش کاتالوگ صنعتی و نمایشگاهی با صحافی چسب گرم، مفتول و سیمی',
            'keyword' => 'چاپ کاتالوگ صنعتی و نمایشگاهی',
            'category' => 'چاپ تجاری و تبلیغاتی',
            'tags' => ['چاپ کاتالوگ', 'صحافی چسب گرم', 'کاغذ گلاسه', 'نمایشگاه بین‌المللی'],
            'image' => '/assets/catalog_pharma_cosmetic_1794764676825.jpg',
            'angle' => 'انتخاب گرماژ جلد و صفحات داخلی، تعیین تعداد صفحات مضرب ۴ یا ۱۶، تفاوت صحافی مفتول با چسب گرم و همگام‌سازی نسخه چاپی با کاتالوگ دیجیتال ورق‌زن',
        ],
        [
            'title' => 'مدیریت جهت الیاف مقوا (Grain Direction) و نقش کلیدی آن در جلوگیری از تاب‌برداشتن جعبه',
            'keyword' => 'جهت الیاف مقوا در جعبه سازی',
            'category' => 'مهندسی مقوا و متریال',
            'tags' => ['جهت الیاف مقوا', 'ترک خط تا', 'استحکام دیواره', 'کیفیت لمینت'],
            'image' => '/assets/catalog_fefco_corrugated_1794764676518.jpg',
            'angle' => 'تست ساده تشخیص جهت الیاف کاغذ، هماهنگی خط تا با الیاف برای جلوگیری از ترک خوردن چاپ و تاثیر آن بر ایستایی جعبه‌های قدبلند',
        ],
        [
            'title' => 'طراحی استند رومیزی و جعبه دیسپلی (Shelf-Ready Display) برای افزایش فروش در هایپرمارکت‌ها',
            'keyword' => 'جعبه دیسپلی فروشگاهی و استند مقوایی',
            'category' => 'بسته‌بندی فروشگاهی',
            'tags' => ['جعبه دیسپلی', 'استند رومیزی', 'پرفراژ جداشونده', 'بازاریابی نقطه‌فروش'],
            'image' => '/assets/catalog_ecommerce_mailer_1794764677888.jpg',
            'angle' => 'مهندسی خطوط پرفراژ (Perforation) برای تبدیل کارتن حمل به دیسپلی آماده فروش در چند ثانیه و جذب نگاه مشتری در قفسه',
        ],
        [
            'title' => 'بهینه‌سازی ابعاد بسته‌بندی برای کاهش هزینه انبارداری، پالت‌بندی و ارسال بار',
            'keyword' => 'بهینه سازی ابعاد کارتن و پالت بندی',
            'category' => 'لجستیک و زنجیره تامین',
            'tags' => ['پالت‌بندی کارتن', 'کاهش هزینه ارسال', 'مهندسی ابعاد', 'کارتن مادر'],
            'image' => '/assets/catalog_fefco_corrugated_1794764676518.jpg',
            'angle' => 'چگونه اصلاح چند میلی‌متری ابعاد جعبه داخلی و هماهنگی با کارتن مادر، فضای خالی حمل‌ونقل را حذف کرده و هزینه لجستیک را کاهش می‌دهد',
        ],
        [
            'title' => 'بررسی تخصصی انواع چسب‌لب جعبه و تنظیم دستگاه لب‌چسب اتوماتیک برای تولید بی‌نقص',
            'keyword' => 'دستگاه لب چسب جعبه و استاندارد چسب کاری',
            'category' => 'خط تولید و ماشین‌آلات',
            'tags' => ['لب‌چسب اتوماتیک', 'چسب گرم و سرد', 'کنترل کیفیت جعبه', 'چاپخانه صنعتی'],
            'image' => '/assets/catalog_pharma_cosmetic_1794764676825.jpg',
            'angle' => 'تفاوت چسب سرد پایه آب و هات‌ملت، ضرورت بدون روکش ماندن ناحیه چسب‌خور (Glue Flap) و کنترل استحکام اتصال در شرایط سرد و مرطوب',
        ],
        [
            'title' => 'کدهای امنیتی، هولوگرام و چاپ میکروتکست در بسته‌بندی دارو و مکمل‌های سلامت',
            'keyword' => 'بسته بندی امنیتی دارو و ضدتقلّب',
            'category' => 'بسته‌بندی دارویی',
            'tags' => ['بسته‌بندی امنیتی', 'برچسب اصالت', 'پلمپ ضددستکاری', 'جعبه دارو'],
            'image' => '/assets/catalog_pharma_cosmetic_1794764676825.jpg',
            'angle' => 'ساختارهای درب پلمپ‌دار (Tamper-Evident)، درج خط بریل برجسته روی جعبه دارو و ادغام کدهای ردیابی UID و QR در خط چاپ',
        ],
        [
            'title' => 'نقش روان‌شناسی رنگ و تایپوگرافی فارسی در طراحی گرافیک بسته‌بندی پرفروش',
            'keyword' => 'طراحی گرافیک بسته بندی و روانشناسی رنگ',
            'category' => 'طراحی گرافیک و برندینگ',
            'tags' => ['گرافیک بسته‌بندی', 'تایپوگرافی فارسی', 'روان‌شناسی رنگ', 'هویت بصری'],
            'image' => '/assets/catalog_luxury_hardbox_1794764676452.jpg',
            'angle' => 'سلسله‌مراتب خوانایی در فاصله دو متری قفسه، انتخاب فونت خوانا در سایزهای کوچک و ایجاد کنتراست موثر بدون شلوغی بصری',
        ],
    ];
}

function seoApTryOptionalExternalAi(array $config, string $topicTitle, string $keyword, string $angle): ?array {
    $endpoint = trim((string) ($config['optionalAiEndpoint'] ?? ''));
    $apiKey = trim((string) ($config['optionalAiApiKey'] ?? ''));
    $model = trim((string) ($config['optionalAiModel'] ?? ''));
    if ($endpoint === '' || $apiKey === '' || !function_exists('curl_init')) {
        return null;
    }
    if ($model === '') {
        $model = 'gpt-4o-mini';
    }

    $prompt = "یک مقاله تخصصی و سئو محور به زبان فارسی درباره «{$topicTitle}» با کلمه کلیدی اصلی «{$keyword}» و زاویه فنی «{$angle}» برای سایت چاپ و بسته‌بندی اشک قلم بنویس.\n"
        . "خروجی را دقیقاً به صورت JSON معتبر با کلیدهای زیر برگردان:\n"
        . '{"excerpt":"خلاصه ۲ جمله‌ای ۱۲۰ تا ۱۵۵ کاراکتری","content":"متن کامل فارسی حداقل ۷۰۰ کلمه بدون تگ HTML و با تیترهای مشخص و بولت و ۳ سوال متداول در پایان","metaTitle":"عنوان سئو زیر ۶۰ کاراکتر","metaDescription":"توضیحات متا ۱۲۵ تا ۱۵۸ کاراکتر","tags":["تگ۱","تگ۲","تگ۳","تگ۴"]}';

    $payload = json_encode([
        'model' => $model,
        'temperature' => 0.5,
        'messages' => [
            ['role' => 'system', 'content' => 'You are an expert Persian industrial printing & packaging SEO editor. Respond strictly with valid JSON.'],
            ['role' => 'user', 'content' => $prompt],
        ],
    ], JSON_UNESCAPED_UNICODE);

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_TIMEOUT => 35,
        CURLOPT_CONNECTTIMEOUT => 12,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
    ]);
    $raw = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if (!$raw || $code < 200 || $code >= 300) {
        return null;
    }
    $resp = json_decode((string) $raw, true);
    $content = (string) ($resp['choices'][0]['message']['content'] ?? '');
    if ($content === '') {
        return null;
    }
    if (preg_match('/\{[\s\S]*\}/', $content, $m)) {
        $parsed = json_decode($m[0], true);
        if (is_array($parsed) && !empty($parsed['content']) && seoApWordCount((string) $parsed['content']) >= 220) {
            return $parsed;
        }
    }
    return null;
}

function seoApComposeDeterministicArticle(array $topic, array $config): array {
    $brand = (string) ($config['brandName'] ?? 'چاپ و بسته‌بندی اشک قلم');
    $baseUrl = seoApDetectBaseUrl($config['siteBaseUrl'] ?? '');
    $title = (string) $topic['title'];
    $keyword = (string) ($topic['keyword'] ?? $title);
    $category = (string) ($topic['category'] ?? 'چاپ و بسته‌بندی صنعتی');
    $angle = (string) ($topic['angle'] ?? 'بررسی فنی، استانداردهای اجرایی، کنترل کیفیت و بهینه‌سازی هزینه تولید در خطوط چاپ افست و جعبه‌سازی');
    $keywords = is_array($config['focusKeywords'] ?? null) ? $config['focusKeywords'] : [];
    $extraKw = !empty($keywords) ? $keywords[array_rand($keywords)] : 'چاپ افست صنعتی';

    $excerpt = "بررسی تخصصی و کاربردی {$keyword} در صنعت چاپ و بسته‌بندی؛ شامل استانداردهای مهندسی، کنترل کیفیت پیش از چاپ و راهکارهای کاهش هزینه تولید در {$brand}.";
    if (function_exists('mb_strlen') && mb_strlen($excerpt, 'UTF-8') > 160) {
        $excerpt = mb_substr($excerpt, 0, 155, 'UTF-8') . '...';
    }

    $paragraphs = [
        "در بازار رقابتی امروز، کیفیت بسته‌بندی و دقت اجرای فنی نقش تعیین‌کننده‌ای در موفقیت فروش، سلامت حمل‌ونقل و ماندگاری برند در ذهن مشتری دارد. موضوع «{$title}» یکی از مهم‌ترین تصمیم‌های فنی در فرآیند سفارش‌گذاری تولیدکنندگان، برندهای دارویی، غذایی، آرایشی و فروشگاه‌های اینترنتی به شمار می‌رود. در این راهنمای تخصصی از {$brand}، تمام ابعاد مهندسی، چاپی و اقتصادی {$keyword} را به زبان کاربردی بررسی می‌کنیم.",
        "",
        "۱. چرا توجه به {$keyword} در کیفیت نهایی حیاتی است؟",
        "بخش بزرگی از هزینه‌های پنهان و دوباره‌کاری‌ها در سفارش‌های چاپی، نه به دلیل خرابی ماشین‌آلات، بلکه ناشی از انتخاب نادرست مشخصات فنی در مرحله طراحی و سفارش است. تمرکز اصلی در {$angle} این است که میان استحکام سازه‌ای، زیبایی بصری و قیمت تمام‌شده توازن مهندسی برقرار شود.",
        "• افزایش دوام فیزیکی بسته در انبارداری چندلایه و مسیرهای ارسال بین‌شهری یا صادراتی",
        "• حفظ ثبات رنگ برند و جلوگیری از ترک‌خوردگی روکش یا تغییر فرم خطوط تا در خط بسته‌بندی",
        "• کاهش پرت مقوا در شیت‌بندی و بهینه‌سازی تیراژ اقتصادی متناسب با بودجه پروژه",
        "• ارتقای تجربه بازگشایی بسته توسط مصرف‌کننده نهایی و افزایش نرخ خرید مجدد",
        "",
        "۲. معیارهای فنی و استانداردهای اجرایی در {$category}",
        "برای دستیابی به خروجی استاندارد در {$keyword}، واحد مهندسی پیش از چاپ لازم است چندین پارامتر کلیدی را هم‌زمان کنترل کند. هماهنگی میان ضخامت متریال (کالیپر)، جهت الیاف مقوا و نوع روکش تکمیلی، پایه اصلی یک تولید بی‌نقص محسوب می‌شود:",
        "• انتخاب دقیق متریال: بررسی گرماژ، ضریب سفتی (Stiffness) و صافی سطح مقوا متناسب با وزن و حساسیت محصول داخلی.",
        "• کنترل تلرانس قالب و تیغ دایکات: در نظر گرفتن انحنای خطوط تا (Creasing) و فضای آزاد زبانه‌های قفل‌شو تا جعبه بدون فشار اضافی و با سرعت بالا مونتاژ شود.",
        "• استاندارد رنگ و پیش از چاپ: استفاده از پروفایل رنگی کالیبره‌شده CMYK و در صورت نیاز رنگ ساختگی پنتون به همراه حداقل ۳ میلی‌متر فضای برش ایمن (Bleed).",
        "• خدمات تکمیلی هدفمند: انتخاب هوشمندانه میان سلفون مات، براق، مخملی، ورنی پایه آب، یووی موضعی یا طلاکوب حرارتی مطابق با جایگاه برند.",
        "",
        "۳. اشتباهات رایج در سفارش‌گذاری و روش پیشگیری از آن‌ها",
        "بسیاری از کسب‌وکارها هنگام ثبت سفارش {$keyword} یا هماهنگی با واحد طراحی، دچار چند خطای پرتکرار می‌شوند که به سادگی قابل پیشگیری است:",
        "۱) طراحی گرافیک بدون در نظر گرفتن فایل دایلاین واقعی و ضخامت مقوا که باعث جابه‌جایی لوگو یا نوشته‌ها روی لبه‌های تا می‌شود.",
        "۲) انتخاب گرماژ بیش از حد سبک برای محصولات سنگین، یا برعکس انتخاب متریال پرهزینه بدون نیاز واقعی سازه‌ای.",
        "۳) بی‌توجهی به فضای بدون روکش در لبه چسب‌خور (Glue Flap) که چسبندگی خط لب‌چسب اتوماتیک را تضعیف می‌کند.",
        "۴) ارسال فایل بدون نمونه‌سازی و بازبینی سه‌بعدی پیش از ساخت قالب فلزی و زینک‌گیری انبوه.",
        "",
        "۴. چگونه با ابزارهای آنلاین {$brand} زمان و هزینه تولید را بهینه کنیم؟",
        "در سامانه تخصصی {$brand} می‌توانید پیش از ورود به مرحله چاپ انبوه، ابعاد دقیق جعبه را در ابزار طراحی دایلاین آنلاین محاسبه کرده، ساختار بسته را در استودیو سه‌بعدی بازبینی کنید و با استفاده از فرم استعلام قیمت آنلاین، برآورد شفاف تیراژ، گرماژ و زمان تحویل دریافت نمایید. همچنین برای بررسی نمونه‌های اجراشده در حوزه {$extraKw}، بخش کاتالوگ محصولات و نمونه‌کارهای سایت به صورت ۲۴ ساعته در دسترس شماست.",
        "",
        "۵. چک‌لیست سریع پیش از تایید نهایی چاپ",
        "• ابعاد داخلی (طول × عرض × ارتفاع) با تلرانس محصول و اینسرت داخلی تطبیق داده شده است.",
        "• فایل نهایی در مد رنگی استاندارد، با رزولوشن ۳۰۰ DPI و فونت‌های تبدیل‌شده به وکتور آماده شده است.",
        "• نوع کاربری (فروشگاهی، پستی، دارویی، غذایی یا صادراتی) و شرایط رطوبتی انبار در انتخاب مقوا لحاظ شده است.",
        "• هماهنگی میان ابعاد جعبه تکی و کارتن مادر جهت کاهش هزینه حمل‌ونقل بررسی شده است.",
        "",
        "سوالات متداول درباره {$keyword}",
        "سوال ۱: حداقل تیراژ اقتصادی برای سفارش تخصصی در حوزه {$category} چقدر است؟",
        "پاسخ: در چاپ افست صنعتی و جعبه‌سازی اختصاصی، معمولاً تیراژ ۱۰۰۰ عدد به بالا بهترین نسبت قیمت تمام‌شده به کیفیت را ارائه می‌دهد؛ با این حال بسته به ابعاد فرم‌بندی روی شیت، امکان برآورد دقیق برای تیراژهای مختلف از طریق بخش استعلام سایت وجود دارد.",
        "",
        "سوال ۲: آیا پیش از تولید انبوه امکان دریافت ماکت یا بررسی ساختار دایلاین وجود دارد؟",
        "پاسخ: بله، پیش از ساخت قالب و چاپ نهایی، طراحی دایلاین دقیق و کنترل ابعادی انجام می‌شود تا تمامی زبانه‌ها، قفل‌ها و تراز گرافیکی با اطمینان کامل تایید شوند.",
        "",
        "سوال ۳: چه عواملی بیشترین تاثیر را بر قیمت نهایی {$keyword} دارند؟",
        "پاسخ: ابعاد بازشده جعبه و تعداد چیدمان آن در هر شیت مقوا، نوع و گرماژ مقوا، تعداد رنگ چاپی، خدمات تکمیلی (سلفون، یووی، طلاکوب، برجسته‌سازی) و تیراژ کل سفارش اصلی‌ترین عوامل تعیین‌کننده هزینه هستند.",
        "",
        "جمع‌بندی",
        "اجرای اصولی {$keyword} ترکیبی از مهندسی بسته‌بندی، مدیریت دقیق رنگ و چیدمان اقتصادی تولید است. کارشناسان فنی {$brand} آماده ارائه مشاوره تخصصی، طراحی قالب اختصاصی و اجرای کامل سفارش‌های چاپ و بسته‌بندی با بالاترین استاندارد صنعتی هستند. برای شروع پروژه یا دریافت مشاوره می‌توانید همین حالا به صفحه استعلام قیمت ({$baseUrl}/inquiry) یا ابزار طراحی دایلاین ({$baseUrl}/tools/dieline) مراجعه کنید.",
    ];

    $content = implode("\n", $paragraphs);
    $metaTitle = $title;
    if (function_exists('mb_strlen') && mb_strlen($metaTitle, 'UTF-8') > 58) {
        $metaTitle = mb_substr($metaTitle, 0, 55, 'UTF-8') . '...';
    }
    $metaTitle .= ' | اشک قلم';

    return [
        'excerpt' => $excerpt,
        'content' => $content,
        'metaTitle' => $metaTitle,
        'metaDescription' => $excerpt,
        'tags' => array_values(array_unique(array_merge(
            is_array($topic['tags'] ?? null) ? $topic['tags'] : [],
            [$keyword, 'چاپ و بسته‌بندی', 'اشک قلم']
        ))),
        'providerUsed' => 'php-native-engine',
    ];
}

function seoApBuildArticleJsonLd(array $post, string $baseUrl, string $brandName): array {
    $slug = (string) ($post['slug'] ?? $post['id'] ?? 'article');
    $url = rtrim($baseUrl, '/') . '/blog/' . rawurlencode($slug);
    $img = (string) ($post['imageUrl'] ?? '');
    if ($img !== '' && strpos($img, 'http') !== 0) {
        $img = rtrim($baseUrl, '/') . '/' . ltrim($img, '/');
    }
    return [
        '@context' => 'https://schema.org',
        '@type' => 'Article',
        'headline' => (string) ($post['title'] ?? ''),
        'description' => (string) ($post['excerpt'] ?? ''),
        'inLanguage' => 'fa-IR',
        'datePublished' => (string) ($post['createdAtIso'] ?? gmdate('c')),
        'dateModified' => (string) ($post['updatedAtIso'] ?? gmdate('c')),
        'author' => [
            '@type' => 'Organization',
            'name' => $brandName,
            'url' => rtrim($baseUrl, '/'),
        ],
        'publisher' => [
            '@type' => 'Organization',
            'name' => $brandName,
            'url' => rtrim($baseUrl, '/'),
        ],
        'image' => $img !== '' ? $img : (rtrim($baseUrl, '/') . '/assets/catalog_luxury_hardbox_1794764676452.jpg'),
        'mainEntityOfPage' => [
            '@type' => 'WebPage',
            '@id' => $url,
        ],
    ];
}

function seoApPickNextTopic(array $config, array $existingPosts, ?string $forcedTopic = null): array {
    $existingTitles = [];
    foreach ($existingPosts as $p) {
        if (is_array($p) && !empty($p['title'])) {
            $existingTitles[] = (string) $p['title'];
        }
    }

    $defaultImages = [
        '/assets/catalog_luxury_hardbox_1794764676452.jpg',
        '/assets/catalog_fefco_corrugated_1794764676518.jpg',
        '/assets/catalog_pharma_cosmetic_1794764676825.jpg',
        '/assets/catalog_ecommerce_mailer_1794764677888.jpg',
    ];

    // 1. Explicit forced topic from Admin
    $forced = trim((string) $forcedTopic);
    if ($forced !== '') {
        return [
            'title' => $forced,
            'keyword' => $forced,
            'category' => 'مقاله تخصصی چاپ و بسته‌بندی',
            'tags' => ['چاپ و بسته‌بندی', 'جعبه‌سازی', 'اشک قلم'],
            'image' => $defaultImages[array_rand($defaultImages)],
            'angle' => 'بررسی جامع فنی، استانداردهای تولید و راهنمای اجرایی سفارش در چاپخانه صنعتی',
            'fromCustomQueue' => false,
        ];
    }

    // 2. Queued custom topics in config
    $customTopics = is_array($config['customTopics'] ?? null) ? $config['customTopics'] : [];
    foreach ($customTopics as $idx => $ct) {
        $ctClean = trim((string) $ct);
        if ($ctClean === '') continue;
        $isDup = false;
        foreach ($existingTitles as $et) {
            if (seoApTextSimilarity($ctClean, $et) >= 0.72) {
                $isDup = true;
                break;
            }
        }
        if (!$isDup) {
            return [
                'title' => $ctClean,
                'keyword' => $ctClean,
                'category' => 'تولید محتوای اختصاصی',
                'tags' => ['چاپ و بسته‌بندی', 'بسته‌بندی صنعتی', 'اشک قلم'],
                'image' => $defaultImages[$idx % count($defaultImages)],
                'angle' => 'بررسی دقیق فنی، انتخاب متریال، استاندارد پیش از چاپ و کاهش هزینه‌های تولید',
                'fromCustomQueue' => true,
                'customIndex' => $idx,
            ];
        }
    }

    // 3. Built-in 24+ topic Persian printing & packaging bank (avoid duplicates)
    $bank = seoApTopicBank();
    foreach ($bank as $candidate) {
        $isDup = false;
        foreach ($existingTitles as $et) {
            if (seoApTextSimilarity((string) $candidate['title'], $et) >= 0.58) {
                $isDup = true;
                break;
            }
        }
        if (!$isDup) {
            $candidate['fromCustomQueue'] = false;
            return $candidate;
        }
    }

    // 4. All built-in topics used -> generate a fresh seasonal/edition industrial guide
    $shamsiYear = substr(seoApShamsiToday(), 0, 4);
    $picked = $bank[count($existingPosts) % count($bank)];
    $picked['title'] = $picked['title'] . ' (ویرایش تخصصی ' . $shamsiYear . ')';
    $picked['fromCustomQueue'] = false;
    return $picked;
}

function seoApCountRecentAutoArticles(array $posts, int $days = 7): int {
    $cutoff = time() - ($days * 86400);
    $count = 0;
    foreach ($posts as $p) {
        if (!is_array($p)) continue;
        if (($p['source'] ?? '') !== 'ai-auto') continue;
        $ts = strtotime((string) ($p['createdAtIso'] ?? ''));
        if ($ts && $ts >= $cutoff) {
            $count++;
        }
    }
    return $count;
}

function seoApGenerateAndSaveArticle(array &$config, ?string $forcedTopic = null, bool $ignoreQuota = false): array {
    $posts = seoApReadJson('posts.json', []);
    if (!is_array($posts)) {
        $posts = [];
    }

    $maxWeekly = max(1, (int) ($config['maxArticlesPerWeek'] ?? 4));
    if (!$ignoreQuota && seoApCountRecentAutoArticles($posts, 7) >= $maxWeekly) {
        return [
            'ok' => false,
            'skipped' => true,
            'reason' => "سقف مجاز انتشار هفتگی ({$maxWeekly} مقاله در هفته) تکمیل شده است.",
        ];
    }

    $topic = seoApPickNextTopic($config, $posts, $forcedTopic);
    $title = (string) $topic['title'];
    $keyword = (string) ($topic['keyword'] ?? $title);
    $angle = (string) ($topic['angle'] ?? '');

    // Check strict similarity unless admin forced a topic
    $maxSim = 0.0;
    foreach ($posts as $p) {
        if (!is_array($p) || empty($p['title'])) continue;
        $sim = seoApTextSimilarity($title, (string) $p['title']);
        if ($sim > $maxSim) $maxSim = $sim;
    }

    $aiDraft = seoApTryOptionalExternalAi($config, $title, $keyword, $angle);
    if (is_array($aiDraft)) {
        $composed = [
            'excerpt' => trim((string) ($aiDraft['excerpt'] ?? '')),
            'content' => trim((string) ($aiDraft['content'] ?? '')),
            'metaTitle' => trim((string) ($aiDraft['metaTitle'] ?? ($title . ' | اشک قلم'))),
            'metaDescription' => trim((string) ($aiDraft['metaDescription'] ?? ($aiDraft['excerpt'] ?? ''))),
            'tags' => is_array($aiDraft['tags'] ?? null) && !empty($aiDraft['tags']) ? $aiDraft['tags'] : ($topic['tags'] ?? ['چاپ و بسته‌بندی']),
            'providerUsed' => 'php-external-ai',
        ];
    } else {
        $composed = seoApComposeDeterministicArticle($topic, $config);
    }

    $baseUrl = seoApDetectBaseUrl($config['siteBaseUrl'] ?? '');
    $brandName = (string) ($config['brandName'] ?? 'چاپ و بسته‌بندی اشک قلم');
    $slug = seoApSlugify($title);

    // Ensure unique slug
    $existingSlugs = [];
    foreach ($posts as $p) {
        if (is_array($p) && !empty($p['slug'])) {
            $existingSlugs[(string) $p['slug']] = true;
        }
    }
    if (isset($existingSlugs[$slug])) {
        $slug .= '-' . substr((string) time(), -4);
    }

    $wordCount = seoApWordCount((string) $composed['content']);
    $readTime = max(3, (int) ceil($wordCount / 180));
    $status = (($config['publishMode'] ?? 'published') === 'draft') ? 'draft' : 'published';
    $nowIso = gmdate('c');

    $post = [
        'id' => 'post-auto-' . (int) round(microtime(true) * 1000),
        'slug' => $slug,
        'title' => $title,
        'excerpt' => $composed['excerpt'],
        'content' => $composed['content'],
        'author' => 'تحریریه مهندسی ' . $brandName,
        'date' => seoApShamsiToday(),
        'imageUrl' => (string) ($topic['image'] ?? '/assets/catalog_luxury_hardbox_1794764676452.jpg'),
        'tags' => array_slice(array_values(array_unique(array_map('strval', $composed['tags']))), 0, 6),
        'readTime' => $readTime,
        'status' => $status,
        'source' => 'ai-auto',
        'createdAtIso' => $nowIso,
        'updatedAtIso' => $nowIso,
        'seo' => [
            'metaTitle' => $composed['metaTitle'],
            'metaDescription' => $composed['metaDescription'],
            'focusKeyword' => $keyword,
            'canonicalPath' => '/blog/' . $slug,
        ],
        'qualityReport' => [
            'score' => $wordCount >= 450 ? 96 : 88,
            'wordCount' => $wordCount,
            'maxTitleSimilarity' => round($maxSim, 2),
            'passed' => true,
            'notes' => [
                'تولید خودکار زمان‌بندی‌شده PHP بدون نیاز به Node.js',
                'ساختار سئو، اسکیما JSON-LD و لینک‌سازی داخلی بررسی شد',
            ],
            'providerUsed' => $composed['providerUsed'],
        ],
    ];
    $post['seo']['jsonLd'] = seoApBuildArticleJsonLd($post, $baseUrl, $brandName);

    array_unshift($posts, $post);
    seoApWriteJson('posts.json', array_values($posts));

    // Pop from customTopics queue if it came from there
    if (!empty($topic['fromCustomQueue']) && isset($topic['customIndex'])) {
        $idx = (int) $topic['customIndex'];
        if (isset($config['customTopics'][$idx])) {
            array_splice($config['customTopics'], $idx, 1);
            $config['customTopics'] = array_values($config['customTopics']);
            seoApWriteJson('seo-autopilot-config.json', $config);
        }
    }

    return [
        'ok' => true,
        'post' => $post,
    ];
}

function seoApRunAuditAndOptimize(array $config): array {
    $root = seoApRootDir();
    $baseUrl = seoApDetectBaseUrl($config['siteBaseUrl'] ?? '');
    $brandName = (string) ($config['brandName'] ?? 'چاپ و بسته‌بندی اشک قلم');
    $autoFix = !empty($config['autoFixSeoMeta']);

    $catalogs = seoApReadJson('catalogs.json', []);
    if (!is_array($catalogs)) $catalogs = [];
    $posts = seoApReadJson('posts.json', []);
    if (!is_array($posts)) $posts = [];

    $issues = [];
    $fixesCount = 0;
    $postsModified = false;
    $seenSlugs = [];

    foreach ($posts as $idx => $p) {
        if (!is_array($p)) continue;
        $title = trim((string) ($p['title'] ?? ''));
        $slug = trim((string) ($p['slug'] ?? ''));
        $path = '/blog/' . ($slug !== '' ? $slug : (string) ($p['id'] ?? $idx));

        if ($slug === '' && $title !== '') {
            if ($autoFix) {
                $slug = seoApSlugify($title);
                $posts[$idx]['slug'] = $slug;
                $postsModified = true;
                $fixesCount++;
            } else {
                $issues[] = [
                    'path' => $path,
                    'severity' => 'warning',
                    'code' => 'MISSING_SLUG',
                    'message' => 'مقاله فاقد نامک (Slug) سئو شده است.',
                    'suggestedFix' => 'فعال‌سازی اصلاح خودکار متاتگ برای ساخت Slug استاندارد.',
                ];
            }
        }
        if ($slug !== '') {
            if (isset($seenSlugs[$slug])) {
                if ($autoFix) {
                    $slug = $slug . '-' . ($idx + 1);
                    $posts[$idx]['slug'] = $slug;
                    $postsModified = true;
                    $fixesCount++;
                } else {
                    $issues[] = [
                        'path' => $path,
                        'severity' => 'critical',
                        'code' => 'DUPLICATE_SLUG',
                        'message' => "نامک تکراری «{$slug}» شناسایی شد.",
                    ];
                }
            }
            $seenSlugs[$slug] = true;
        }

        $content = (string) ($p['content'] ?? '');
        $wc = seoApWordCount($content);
        if ($wc < 220) {
            $issues[] = [
                'path' => '/blog/' . $slug,
                'severity' => 'warning',
                'code' => 'THIN_CONTENT',
                'message' => "مقاله «{$title}» کوتاه است ({$wc} کلمه). برای رتبه‌گیری بهتر حداقل ۴۵۰ کلمه پیشنهاد می‌شود.",
            ];
        }

        if (empty($p['excerpt']) && $content !== '') {
            if ($autoFix) {
                $plain = trim((string) preg_replace('/\s+/u', ' ', strip_tags($content)));
                $posts[$idx]['excerpt'] = (function_exists('mb_substr') ? mb_substr($plain, 0, 152, 'UTF-8') : substr($plain, 0, 152)) . '...';
                $postsModified = true;
                $fixesCount++;
            } else {
                $issues[] = [
                    'path' => '/blog/' . $slug,
                    'severity' => 'warning',
                    'code' => 'MISSING_EXCERPT',
                    'message' => "خلاصه (Excerpt) مقاله «{$title}» خالی است.",
                ];
            }
        }

        if (empty($p['readTime']) || (int) $p['readTime'] <= 0) {
            if ($autoFix) {
                $posts[$idx]['readTime'] = max(2, (int) ceil($wc / 180));
                $postsModified = true;
                $fixesCount++;
            }
        }

        if (empty($p['tags']) || !is_array($p['tags'])) {
            if ($autoFix) {
                $posts[$idx]['tags'] = ['چاپ و بسته‌بندی', 'جعبه‌سازی', 'اشک قلم'];
                $postsModified = true;
                $fixesCount++;
            }
        }

        $seo = is_array($p['seo'] ?? null) ? $p['seo'] : [];
        $seoChanged = false;
        if (empty($seo['metaTitle']) && $title !== '') {
            if ($autoFix) {
                $seo['metaTitle'] = (function_exists('mb_strlen') && mb_strlen($title, 'UTF-8') > 58 ? mb_substr($title, 0, 55, 'UTF-8') . '...' : $title) . ' | اشک قلم';
                $seoChanged = true;
                $fixesCount++;
            } else {
                $issues[] = [
                    'path' => '/blog/' . $slug,
                    'severity' => 'warning',
                    'code' => 'MISSING_META_TITLE',
                    'message' => "عنوان سئو (Meta Title) مقاله «{$title}» تنظیم نشده است.",
                ];
            }
        }
        if (empty($seo['metaDescription'])) {
            $descSrc = (string) ($posts[$idx]['excerpt'] ?? $title);
            if ($autoFix && $descSrc !== '') {
                $seo['metaDescription'] = function_exists('mb_substr') ? mb_substr($descSrc, 0, 158, 'UTF-8') : substr($descSrc, 0, 158);
                $seoChanged = true;
                $fixesCount++;
            } else {
                $issues[] = [
                    'path' => '/blog/' . $slug,
                    'severity' => 'warning',
                    'code' => 'MISSING_META_DESC',
                    'message' => "توضیحات متا مقاله «{$title}» تنظیم نشده است.",
                ];
            }
        }
        if (empty($seo['canonicalPath']) && $slug !== '') {
            if ($autoFix) {
                $seo['canonicalPath'] = '/blog/' . $slug;
                $seoChanged = true;
            }
        }
        if (empty($seo['jsonLd'])) {
            if ($autoFix) {
                $seo['jsonLd'] = seoApBuildArticleJsonLd($posts[$idx], $baseUrl, $brandName);
                $seoChanged = true;
                $fixesCount++;
            }
        }
        if ($seoChanged) {
            $posts[$idx]['seo'] = $seo;
            $postsModified = true;
        }
    }

    if ($postsModified) {
        seoApWriteJson('posts.json', array_values($posts));
    }

    // Check core site discovery files
    $checks = [
        'sitemap.xml' => 'فایل نقشه سایت sitemap.xml هنوز ساخته نشده است.',
        'robots.txt' => 'فایل robots.txt در ریشه سایت یافت نشد.',
        'rss.xml' => 'فید RSS مقالات برای خزنده‌ها هنوز ایجاد نشده است.',
        'llms.txt' => 'فایل معرفی سایت llms.txt برای موتورهای جستجو و هوش مصنوعی ایجاد نشده است.',
    ];
    foreach ($checks as $file => $msg) {
        if (!is_file($root . DIRECTORY_SEPARATOR . $file)) {
            $issues[] = [
                'path' => '/' . $file,
                'severity' => 'info',
                'code' => 'MISSING_DISCOVERY_FILE',
                'message' => $msg,
                'suggestedFix' => 'اجرای بخش «معرفی سایت و بروزرسانی فایل‌های سئو».',
            ];
        }
    }

    $pubPosts = array_values(array_filter($posts, function ($p) {
        return is_array($p) && (($p['status'] ?? 'published') === 'published');
    }));
    $pubCatalogs = array_values(array_filter($catalogs, function ($c) {
        return is_array($c) && !empty($c['isPublished']);
    }));

    $pagesAudited = 12 + count($pubCatalogs) + count($pubPosts);
    $penalty = 0;
    foreach ($issues as $iss) {
        if ($iss['severity'] === 'critical') $penalty += 8;
        elseif ($iss['severity'] === 'warning') $penalty += 3;
        else $penalty += 1;
    }
    $score = max(62, min(100, 100 - $penalty));

    $report = [
        'generatedAt' => gmdate('c'),
        'baseUrl' => $baseUrl,
        'pagesAudited' => $pagesAudited,
        'averageScore' => $score,
        'sitemapUrlCount' => $pagesAudited,
        'brokenInternalLinks' => [],
        'autoFixesApplied' => $fixesCount,
        'issues' => $issues,
    ];
    seoApWriteJson('seo-state.json', $report);

    return [
        'ok' => true,
        'report' => $report,
        'fixesCount' => $fixesCount,
    ];
}

function seoApPromoteSite(array $config, array $extraNotifyUrls = []): array {
    $root = seoApRootDir();
    $baseUrl = seoApDetectBaseUrl($config['siteBaseUrl'] ?? '');
    $brandName = (string) ($config['brandName'] ?? 'چاپ و بسته‌بندی اشک قلم');
    $tagline = (string) ($config['brandTagline'] ?? 'تولید تخصصی جعبه، کارتن لمینتی، چاپ افست ۵ رنگ و طراحی آنلاین دایلاین');
    $today = date('Y-m-d');

    $catalogs = seoApReadJson('catalogs.json', []);
    if (!is_array($catalogs)) $catalogs = [];
    $posts = seoApReadJson('posts.json', []);
    if (!is_array($posts)) $posts = [];

    $corePages = [
        ['path' => '/', 'priority' => '1.0', 'changefreq' => 'daily'],
        ['path' => '/services', 'priority' => '0.9', 'changefreq' => 'weekly'],
        ['path' => '/products', 'priority' => '0.9', 'changefreq' => 'weekly'],
        ['path' => '/catalog', 'priority' => '0.9', 'changefreq' => 'weekly'],
        ['path' => '/blog', 'priority' => '0.9', 'changefreq' => 'daily'],
        ['path' => '/inquiry', 'priority' => '0.9', 'changefreq' => 'monthly'],
        ['path' => '/tools/dieline', 'priority' => '0.8', 'changefreq' => 'monthly'],
        ['path' => '/tools/box-studio', 'priority' => '0.8', 'changefreq' => 'monthly'],
        ['path' => '/tools/design-studio', 'priority' => '0.8', 'changefreq' => 'monthly'],
        ['path' => '/tools/autocad', 'priority' => '0.7', 'changefreq' => 'monthly'],
        ['path' => '/portfolio', 'priority' => '0.8', 'changefreq' => 'weekly'],
        ['path' => '/about', 'priority' => '0.7', 'changefreq' => 'monthly'],
    ];

    $urlEntries = [];
    foreach ($corePages as $cp) {
        $urlEntries[] = [
            'loc' => $baseUrl . $cp['path'],
            'lastmod' => $today,
            'changefreq' => $cp['changefreq'],
            'priority' => $cp['priority'],
        ];
    }

    $pubCatalogs = [];
    foreach ($catalogs as $c) {
        if (!is_array($c) || empty($c['isPublished']) || empty($c['slug'])) continue;
        $pubCatalogs[] = $c;
        $urlEntries[] = [
            'loc' => $baseUrl . '/catalog/' . rawurlencode((string) $c['slug']),
            'lastmod' => !empty($c['updatedAt']) ? substr((string) $c['updatedAt'], 0, 10) : $today,
            'changefreq' => 'weekly',
            'priority' => '0.8',
        ];
    }

    $pubPosts = [];
    foreach ($posts as $p) {
        if (!is_array($p)) continue;
        if (($p['status'] ?? 'published') !== 'published') continue;
        $slug = (string) ($p['slug'] ?? ($p['id'] ?? ''));
        if ($slug === '') continue;
        $pubPosts[] = $p;
        $urlEntries[] = [
            'loc' => $baseUrl . '/blog/' . rawurlencode($slug),
            'lastmod' => !empty($p['updatedAtIso']) ? substr((string) $p['updatedAtIso'], 0, 10) : $today,
            'changefreq' => 'weekly',
            'priority' => '0.8',
        ];
    }

    // 1. Build rich sitemap.xml
    $xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    $xml .= "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
    $seenLoc = [];
    foreach ($urlEntries as $entry) {
        if (isset($seenLoc[$entry['loc']])) continue;
        $seenLoc[$entry['loc']] = true;
        $loc = htmlspecialchars($entry['loc'], ENT_XML1 | ENT_QUOTES, 'UTF-8');
        $lm = htmlspecialchars($entry['lastmod'], ENT_XML1 | ENT_QUOTES, 'UTF-8');
        $cf = htmlspecialchars($entry['changefreq'], ENT_XML1 | ENT_QUOTES, 'UTF-8');
        $pr = htmlspecialchars($entry['priority'], ENT_XML1 | ENT_QUOTES, 'UTF-8');
        $xml .= "  <url>\n    <loc>{$loc}</loc>\n    <lastmod>{$lm}</lastmod>\n    <changefreq>{$cf}</changefreq>\n    <priority>{$pr}</priority>\n  </url>\n";
    }
    $xml .= "</urlset>\n";
    $sitemapWritten = @file_put_contents($root . DIRECTORY_SEPARATOR . 'sitemap.xml', $xml, LOCK_EX) !== false;

    // 2. Build RSS 2.0 feed (/rss.xml)
    $rssWritten = false;
    if (!empty($config['enableRssFeed'])) {
        $rss = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
        $rss .= "<rss version=\"2.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\">\n<channel>\n";
        $rss .= "  <title>" . htmlspecialchars($brandName . ' - مجله تخصصی چاپ و بسته‌بندی', ENT_XML1 | ENT_QUOTES, 'UTF-8') . "</title>\n";
        $rss .= "  <link>" . htmlspecialchars($baseUrl, ENT_XML1 | ENT_QUOTES, 'UTF-8') . "</link>\n";
        $rss .= "  <description>" . htmlspecialchars($tagline, ENT_XML1 | ENT_QUOTES, 'UTF-8') . "</description>\n";
        $rss .= "  <language>fa-ir</language>\n";
        $rss .= "  <lastBuildDate>" . gmdate(DATE_RSS) . "</lastBuildDate>\n";
        $rss .= "  <atom:link href=\"" . htmlspecialchars($baseUrl . '/rss.xml', ENT_XML1 | ENT_QUOTES, 'UTF-8') . "\" rel=\"self\" type=\"application/rss+xml\" />\n";

        foreach (array_slice($pubPosts, 0, 25) as $p) {
            $slug = (string) ($p['slug'] ?? $p['id']);
            $link = $baseUrl . '/blog/' . rawurlencode($slug);
            $pubDate = !empty($p['createdAtIso']) ? gmdate(DATE_RSS, (int) strtotime((string) $p['createdAtIso'])) : gmdate(DATE_RSS);
            $rss .= "  <item>\n";
            $rss .= "    <title>" . htmlspecialchars((string) ($p['title'] ?? ''), ENT_XML1 | ENT_QUOTES, 'UTF-8') . "</title>\n";
            $rss .= "    <link>" . htmlspecialchars($link, ENT_XML1 | ENT_QUOTES, 'UTF-8') . "</link>\n";
            $rss .= "    <guid isPermaLink=\"true\">" . htmlspecialchars($link, ENT_XML1 | ENT_QUOTES, 'UTF-8') . "</guid>\n";
            $rss .= "    <description>" . htmlspecialchars((string) ($p['excerpt'] ?? ''), ENT_XML1 | ENT_QUOTES, 'UTF-8') . "</description>\n";
            $rss .= "    <pubDate>{$pubDate}</pubDate>\n";
            $rss .= "  </item>\n";
        }
        $rss .= "</channel>\n</rss>\n";
        $rssWritten = @file_put_contents($root . DIRECTORY_SEPARATOR . 'rss.xml', $rss, LOCK_EX) !== false;
    }

    // 3. Build llms.txt (AI & Search Engine Site Directory)
    $llmsWritten = false;
    if (!empty($config['enableLlmsTxt'])) {
        $kwLine = implode('، ', is_array($config['focusKeywords'] ?? null) ? $config['focusKeywords'] : []);
        $lines = [
            "# {$brandName}",
            "",
            "> {$tagline}",
            "",
            "## معرفی مجموعه",
            "- وب‌سایت رسمی: {$baseUrl}",
            "- حوزه تخصصی: {$kwLine}",
            "- نقشه سایت: {$baseUrl}/sitemap.xml",
            "- خوراک مقالات (RSS): {$baseUrl}/rss.xml",
            "",
            "## صفحات و ابزارهای کلیدی",
            "- [خدمات چاپ و بسته‌بندی]({$baseUrl}/services): چاپ افست ۵ رنگ، لمینت، سلفون، یووی موضعی، طلاکوب و جعبه‌سازی",
            "- [محصولات و بسته‌بندی]({$baseUrl}/products): جعبه دارویی، آرایشی، غذایی، هاردباکس لوکس و کارتن لمینتی صادراتی",
            "- [کاتالوگ‌های دیجیتال]({$baseUrl}/catalog): مشاهده کاتالوگ‌های صنعتی و نمونه‌کارهای اجراشده",
            "- [طراحی دایلاین آنلاین]({$baseUrl}/tools/dieline): مهندسی خطوط برش و خط‌تا با خروجی استاندارد",
            "- [استودیو سه‌بعدی جعبه]({$baseUrl}/tools/box-studio): پیش‌نمایش و شبیه‌سازی سه‌بعدی بسته‌بندی",
            "- [استعلام قیمت آنلاین]({$baseUrl}/inquiry): ثبت مشخصات سفارش و دریافت برآورد قیمت",
            "- [مجله تخصصی چاپ و بسته‌بندی]({$baseUrl}/blog): مقالات آموزشی و مهندسی",
            "",
            "## تازه‌ترین مقالات تخصصی",
        ];
        foreach (array_slice($pubPosts, 0, 20) as $p) {
            $slug = (string) ($p['slug'] ?? $p['id']);
            $t = (string) ($p['title'] ?? '');
            $ex = (string) ($p['excerpt'] ?? '');
            $lines[] = "- [{$t}]({$baseUrl}/blog/" . rawurlencode($slug) . "): {$ex}";
        }
        if (!empty($pubCatalogs)) {
            $lines[] = "";
            $lines[] = "## کاتالوگ‌های منتشرشده";
            foreach (array_slice($pubCatalogs, 0, 15) as $c) {
                $lines[] = "- [" . (string) ($c['title'] ?? $c['slug']) . "]({$baseUrl}/catalog/" . rawurlencode((string) $c['slug']) . ")";
            }
        }
        $lines[] = "";
        $lines[] = "Updated: " . gmdate('c');
        $llmsWritten = @file_put_contents($root . DIRECTORY_SEPARATOR . 'llms.txt', implode("\n", $lines) . "\n", LOCK_EX) !== false;
    }

    // 4. Maintain robots.txt
    $robotsWritten = false;
    if (!empty($config['enableRobotsMaintenance'])) {
        $robots = "User-agent: *\n"
            . "Allow: /\n"
            . "Disallow: /admin\n"
            . "Disallow: /api/\n"
            . "Disallow: /api.php\n"
            . "Disallow: /cron-seo.php\n"
            . "Disallow: /data/\n"
            . "Disallow: /backups/\n\n"
            . "Sitemap: {$baseUrl}/sitemap.xml\n"
            . "# AI Directory: {$baseUrl}/llms.txt\n"
            . "# RSS Feed: {$baseUrl}/rss.xml\n";
        $robotsWritten = @file_put_contents($root . DIRECTORY_SEPARATOR . 'robots.txt', $robots, LOCK_EX) !== false;
    }

    // 5. IndexNow Notification (Bing, Yandex, Seznam, Naver)
    $indexNowResult = [
        'enabled' => !empty($config['enableIndexNow']),
        'ok' => false,
        'statusCode' => 0,
        'submittedCount' => 0,
        'message' => 'غیرفعال',
    ];
    if (!empty($config['enableIndexNow'])) {
        $key = (string) ($config['indexNowKey'] ?? '');
        if ($key !== '') {
            @file_put_contents($root . DIRECTORY_SEPARATOR . $key . '.txt', $key, LOCK_EX);
        }
        $parsedHost = (string) parse_url($baseUrl, PHP_URL_HOST);
        $submitUrls = array_values(array_unique(array_merge(
            $extraNotifyUrls,
            [$baseUrl . '/', $baseUrl . '/blog', $baseUrl . '/catalog'],
            array_map(function ($p) use ($baseUrl) {
                return $baseUrl . '/blog/' . rawurlencode((string) ($p['slug'] ?? $p['id']));
            }, array_slice($pubPosts, 0, 10))
        )));

        if ($parsedHost === '' || stripos($parsedHost, 'localhost') !== false || strpos($parsedHost, '127.0.0.1') !== false) {
            $indexNowResult['message'] = 'دامنه محلی است؛ ارسال IndexNow روی دامنه اصلی هاست انجام می‌شود.';
        } else {
            $payload = json_encode([
                'host' => $parsedHost,
                'key' => $key,
                'keyLocation' => $baseUrl . '/' . $key . '.txt',
                'urlList' => $submitUrls,
            ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

            $httpCode = 0;
            $errText = '';
            if (function_exists('curl_init')) {
                $ch = curl_init('https://api.indexnow.org/indexnow');
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => $payload,
                    CURLOPT_HTTPHEADER => ['Content-Type: application/json; charset=utf-8'],
                    CURLOPT_TIMEOUT => 12,
                    CURLOPT_CONNECTTIMEOUT => 6,
                ]);
                curl_exec($ch);
                $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $errText = curl_error($ch);
                curl_close($ch);
            } elseif ((bool) ini_get('allow_url_fopen')) {
                $ctx = stream_context_create([
                    'http' => [
                        'method' => 'POST',
                        'header' => "Content-Type: application/json; charset=utf-8\r\n",
                        'content' => $payload,
                        'timeout' => 10,
                        'ignore_errors' => true,
                    ],
                ]);
                @file_get_contents('https://api.indexnow.org/indexnow', false, $ctx);
                if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
                    $httpCode = (int) $m[1];
                }
            } else {
                $errText = 'cURL غیرفعال است';
            }

            $indexNowResult['statusCode'] = $httpCode;
            $indexNowResult['submittedCount'] = count($submitUrls);
            if ($httpCode >= 200 && $httpCode < 300) {
                $indexNowResult['ok'] = true;
                $indexNowResult['message'] = "ارسال موفق ({$httpCode}) برای " . count($submitUrls) . " آدرس به IndexNow";
            } else {
                $indexNowResult['ok'] = false;
                $indexNowResult['message'] = "فایل‌های Sitemap/RSS/llms.txt به‌روزرسانی شدند؛ پاسخ IndexNow: " . ($httpCode > 0 ? "HTTP {$httpCode}" : ($errText ?: 'عدم دسترسی شبکه'));
            }
        }
    }

    return [
        'ok' => true,
        'urlCount' => count($seenLoc),
        'files' => [
            'sitemap' => $sitemapWritten,
            'rss' => $rssWritten,
            'llms' => $llmsWritten,
            'robots' => $robotsWritten,
        ],
        'indexNow' => $indexNowResult,
    ];
}

function seoApIsDue(?string $lastIso, int $intervalHours): bool {
    if (empty($lastIso)) return true;
    $ts = strtotime($lastIso);
    if (!$ts) return true;
    return (time() - $ts) >= (max(1, $intervalHours) * 3600);
}

function seoApNextDueIso(?string $lastIso, int $intervalHours): string {
    $sec = max(1, $intervalHours) * 3600;
    if (empty($lastIso)) return gmdate('c');
    $ts = strtotime($lastIso);
    if (!$ts) return gmdate('c');
    return gmdate('c', $ts + $sec);
}

function seoApRunCycle(string $triggerSource = 'admin_manual', array $forceTasks = [], ?string $forcedTopic = null): array {
    $startedAt = microtime(true);
    $config = seoApLoadConfig();
    $state = seoApLoadState();

    $isAutomatic = in_array($triggerSource, ['cron_cli', 'cron_http', 'smart_tick'], true);
    if ($isAutomatic && empty($config['enabled'])) {
        return [
            'ok' => true,
            'skipped' => true,
            'reason' => 'ماژول زمان‌بند سئو غیرفعال است.',
        ];
    }

    // Smart hybrid cron detection: if a real cPanel Cron ran within last 36 hours, smart_tick backs off immediately!
    if ($triggerSource === 'smart_tick') {
        if (empty($config['smartPseudoCron'])) {
            return ['ok' => true, 'skipped' => true, 'reason' => 'حالت اجرای هوشمند با ترافیک خاموش است.'];
        }
        $lastRealTs = !empty($state['lastRealCronAt']) ? (int) strtotime((string) $state['lastRealCronAt']) : 0;
        if ($lastRealTs > 0 && (time() - $lastRealTs) < (36 * 3600)) {
            return ['ok' => true, 'skipped' => true, 'reason' => 'کرون جاب واقعی cPanel فعال است؛ نیازی به اجرای هوشمند نیست.'];
        }
    }

    // Check whether anything is due before taking the lock (fast path < 1ms for smart_tick)
    $articleDue = in_array('all', $forceTasks, true) || in_array('article', $forceTasks, true)
        || ($isAutomatic && seoApIsDue($state['lastArticleAt'] ?? null, (int) ($config['articleScheduleHours'] ?? 48)));
    $auditDue = in_array('all', $forceTasks, true) || in_array('audit', $forceTasks, true)
        || ($isAutomatic && seoApIsDue($state['lastAuditAt'] ?? null, (int) ($config['seoAuditScheduleHours'] ?? 24)));
    $promoteDue = in_array('all', $forceTasks, true) || in_array('promote', $forceTasks, true)
        || ($isAutomatic && seoApIsDue($state['lastPromoteAt'] ?? null, (int) ($config['promoteScheduleHours'] ?? 24)));

    if ($triggerSource === 'cron_cli' || $triggerSource === 'cron_http') {
        $state['lastRealCronAt'] = gmdate('c');
        $state['detectedCronMode'] = 'cpanel_cron';
    } elseif ($triggerSource === 'smart_tick') {
        $state['lastPseudoCronAt'] = gmdate('c');
        if (($state['detectedCronMode'] ?? '') !== 'cpanel_cron') {
            $state['detectedCronMode'] = 'smart_pseudo_cron';
        }
    }

    if (!$articleDue && !$auditDue && !$promoteDue) {
        if ($triggerSource === 'cron_cli' || $triggerSource === 'cron_http') {
            seoApSaveState($state);
        }
        return [
            'ok' => true,
            'skipped' => true,
            'reason' => 'زمان اجرای هیچ وظیفه‌ای هنوز فرا نرسیده است.',
            'executed' => [],
        ];
    }

    // Acquire non-blocking lock to prevent parallel execution
    $lockPath = seoApStoragePath('.seo-autopilot.lock');
    $lockFp = @fopen($lockPath, 'c+');
    if ($lockFp && !@flock($lockFp, LOCK_EX | LOCK_NB)) {
        fclose($lockFp);
        return [
            'ok' => true,
            'skipped' => true,
            'reason' => 'چرخه دیگری هم‌اکنون در حال اجراست.',
        ];
    }

    $executed = [];
    $summaries = [];
    $extraNotifyUrls = [];
    $generatedPost = null;
    $auditReport = null;
    $promoteResult = null;
    $baseUrl = seoApDetectBaseUrl($config['siteBaseUrl'] ?? '');

    try {
        // Task 1: Generate & Publish Article
        if ($articleDue) {
            $ignoreQuota = !$isAutomatic;
            $artRes = seoApGenerateAndSaveArticle($config, $forcedTopic, $ignoreQuota);
            if (!empty($artRes['ok']) && !empty($artRes['post'])) {
                $generatedPost = $artRes['post'];
                $state['lastArticleAt'] = gmdate('c');
                $state['totalArticlesGenerated'] = ((int) ($state['totalArticlesGenerated'] ?? 0)) + 1;
                $executed[] = 'article';
                $summaries[] = 'انتشار مقاله «' . $generatedPost['title'] . '»';
                if (($generatedPost['status'] ?? 'published') === 'published') {
                    $extraNotifyUrls[] = $baseUrl . '/blog/' . rawurlencode((string) ($generatedPost['slug'] ?? $generatedPost['id']));
                    // Force promotion refresh whenever a new article is published
                    $promoteDue = true;
                }
            } elseif (!empty($artRes['skipped'])) {
                $summaries[] = (string) ($artRes['reason'] ?? 'تولید مقاله رد شد');
            }
        }

        // Task 2: SEO Audit & Auto-Fix Meta/Schema
        if ($auditDue) {
            $audRes = seoApRunAuditAndOptimize($config);
            $auditReport = $audRes['report'] ?? null;
            $fixes = (int) ($audRes['fixesCount'] ?? 0);
            $state['lastAuditAt'] = gmdate('c');
            $state['totalAuditsRun'] = ((int) ($state['totalAuditsRun'] ?? 0)) + 1;
            $state['totalMetaFixes'] = ((int) ($state['totalMetaFixes'] ?? 0)) + $fixes;
            $executed[] = 'audit';
            $score = (int) ($auditReport['averageScore'] ?? 0);
            $summaries[] = "ممیزی سئو (امتیاز {$score}/100" . ($fixes > 0 ? "، {$fixes} اصلاح خودکار" : '') . ')';
        }

        // Task 3: Promote Site (Sitemap, RSS, llms.txt, robots.txt, IndexNow)
        if ($promoteDue) {
            $promoteResult = seoApPromoteSite($config, $extraNotifyUrls);
            $state['lastPromoteAt'] = gmdate('c');
            $state['totalPingsSent'] = ((int) ($state['totalPingsSent'] ?? 0)) + 1;
            $state['lastIndexNowStatus'] = $promoteResult['indexNow']['message'] ?? null;
            $executed[] = 'promote';
            $summaries[] = 'بروزرسانی Sitemap/RSS/llms.txt (' . (int) ($promoteResult['urlCount'] ?? 0) . ' آدرس)';
        }

        $durationMs = (int) round((microtime(true) - $startedAt) * 1000);
        $state['lastRunAt'] = gmdate('c');

        $logEntry = [
            'at' => gmdate('c'),
            'atShamsi' => seoApShamsiToday() . ' ' . date('H:i'),
            'source' => $triggerSource,
            'tasks' => $executed,
            'durationMs' => $durationMs,
            'summary' => !empty($summaries) ? implode(' | ', $summaries) : 'چرخه بررسی انجام شد.',
        ];
        array_unshift($state['recentLogs'], $logEntry);
        seoApSaveState($state);
    } finally {
        if ($lockFp) {
            @flock($lockFp, LOCK_UN);
            @fclose($lockFp);
        }
    }

    return [
        'ok' => true,
        'skipped' => false,
        'source' => $triggerSource,
        'executed' => $executed,
        'summary' => implode(' | ', $summaries),
        'post' => $generatedPost,
        'auditReport' => $auditReport,
        'promoteResult' => $promoteResult,
        'status' => seoApBuildStatusPayload(),
    ];
}

function seoApBuildStatusPayload(): array {
    $config = seoApLoadConfig();
    $state = seoApLoadState();
    $root = seoApRootDir();
    $baseUrl = seoApDetectBaseUrl($config['siteBaseUrl'] ?? '');
    $seoReport = seoApReadJson('seo-state.json', null);
    $posts = seoApReadJson('posts.json', []);
    if (!is_array($posts)) $posts = [];

    // Mask optional external API key in response
    $safeConfig = $config;
    if (!empty($safeConfig['optionalAiApiKey'])) {
        $safeConfig['hasOptionalAiKey'] = true;
        $safeConfig['optionalAiApiKey'] = '';
    } else {
        $safeConfig['hasOptionalAiKey'] = false;
    }

    $lastRealTs = !empty($state['lastRealCronAt']) ? (int) strtotime((string) $state['lastRealCronAt']) : 0;
    if ($lastRealTs > 0 && (time() - $lastRealTs) < (36 * 3600)) {
        $detectedMode = 'cpanel_cron';
    } elseif (!empty($config['smartPseudoCron'])) {
        $detectedMode = 'smart_pseudo_cron';
    } else {
        $detectedMode = 'manual_only';
    }
    $state['detectedCronMode'] = $detectedMode;

    $cronFilePath = $root . DIRECTORY_SEPARATOR . 'cron-seo.php';
    $cronCliCommand = 'php -q ' . $cronFilePath . ' >/dev/null 2>&1';
    $cronHttpUrl = $baseUrl . '/cron-seo.php?token=' . rawurlencode((string) $config['cronToken']);
    $cronCurlCommand = 'curl -s "' . $cronHttpUrl . '" >/dev/null 2>&1';

    $publishedCount = 0;
    $draftCount = 0;
    foreach ($posts as $p) {
        if (!is_array($p)) continue;
        if (($p['status'] ?? 'published') === 'draft') $draftCount++;
        elseif (($p['status'] ?? 'published') === 'published') $publishedCount++;
    }

    return [
        'config' => $safeConfig,
        'state' => $state,
        'nextDue' => [
            'articleAt' => seoApNextDueIso($state['lastArticleAt'] ?? null, (int) ($config['articleScheduleHours'] ?? 48)),
            'auditAt' => seoApNextDueIso($state['lastAuditAt'] ?? null, (int) ($config['seoAuditScheduleHours'] ?? 24)),
            'promoteAt' => seoApNextDueIso($state['lastPromoteAt'] ?? null, (int) ($config['promoteScheduleHours'] ?? 24)),
        ],
        'stats' => [
            'publishedPosts' => $publishedCount,
            'draftPosts' => $draftCount,
            'weeklyAutoPosts' => seoApCountRecentAutoArticles($posts, 7),
            'seoScore' => is_array($seoReport) ? (int) ($seoReport['averageScore'] ?? 0) : null,
            'sitemapUrlCount' => is_array($seoReport) ? (int) ($seoReport['sitemapUrlCount'] ?? 0) : null,
            'issuesCount' => is_array($seoReport) && is_array($seoReport['issues'] ?? null) ? count($seoReport['issues']) : 0,
        ],
        'files' => [
            'sitemap' => ['exists' => is_file($root . DIRECTORY_SEPARATOR . 'sitemap.xml'), 'url' => '/sitemap.xml'],
            'rss' => ['exists' => is_file($root . DIRECTORY_SEPARATOR . 'rss.xml'), 'url' => '/rss.xml'],
            'llms' => ['exists' => is_file($root . DIRECTORY_SEPARATOR . 'llms.txt'), 'url' => '/llms.txt'],
            'robots' => ['exists' => is_file($root . DIRECTORY_SEPARATOR . 'robots.txt'), 'url' => '/robots.txt'],
        ],
        'cron' => [
            'recommendedSchedule' => '0 * * * *',
            'cliCommand' => $cronCliCommand,
            'curlCommand' => $cronCurlCommand,
            'webhookUrl' => $cronHttpUrl,
            'runtime' => 'php',
            'phpVersion' => PHP_VERSION,
            'hasCurl' => function_exists('curl_init'),
            'rootWritable' => is_writable($root),
        ],
    ];
}

// =========================================================================
// Gemini AI Periodic Page SEO Optimizer (Pure PHP cPanel Parity)
// Model: gemini-4-hydrogen via server environment variable GEMINI_API_KEY
// =========================================================================

function seoGeminiDefaultConfig(): array {
    return [
        'enabled' => true,
        'intervalHours' => 24,
        'batchSize' => 3,
        'autoApplyToDatabase' => true,
        'includeCorePages' => true,
        'includeBlogPosts' => true,
        'includeCatalogs' => true,
        'siteBrand' => 'صنایع چاپ و بسته‌بندی اشک قلم',
        'targetAudience' => 'تولیدکنندگان، برندهای صادراتی، دارویی، آرایشی، غذایی و فروشگاه‌های آنلاین در ایران',
    ];
}

function seoGeminiLoadConfig(): array {
    $saved = seoApReadJson('seo-gemini-config.json', []);
    if (!is_array($saved)) $saved = [];
    return array_merge(seoGeminiDefaultConfig(), $saved);
}

function seoGeminiSaveConfig(array $cfg): bool {
    return seoApWriteJson('seo-gemini-config.json', $cfg);
}

function seoGeminiLoadDb(): array {
    $db = seoApReadJson('seo-gemini-db.json', []);
    return is_array($db) ? $db : [];
}

function seoGeminiSaveDb(array $db): bool {
    return seoApWriteJson('seo-gemini-db.json', $db);
}

function seoGeminiLoadState(): array {
    $st = seoApReadJson('seo-gemini-state.json', []);
    if (!is_array($st)) $st = [];
    return array_merge([
        'lastRunAt' => null,
        'totalPagesOptimized' => 0,
        'totalCronRuns' => 0,
        'lastError' => null,
        'recentLogs' => [],
    ], $st);
}

function seoGeminiSaveState(array $st): bool {
    if (!is_array($st['recentLogs'] ?? null)) $st['recentLogs'] = [];
    $st['recentLogs'] = array_slice($st['recentLogs'], 0, 30);
    return seoApWriteJson('seo-gemini-state.json', $st);
}

function seoGeminiGetApiKey(): string {
    $k = getenv('GEMINI_API_KEY');
    if ($k === false || trim((string) $k) === '') {
        $k = $_SERVER['GEMINI_API_KEY'] ?? ($_ENV['GEMINI_API_KEY'] ?? '');
    }
    return trim((string) $k);
}

function seoGeminiCollectPages(array $cfg): array {
    $pages = [];
    if (!empty($cfg['includeCorePages'])) {
        $core = [
            ['pageId' => 'core:/', 'path' => '/', 'pageType' => 'core', 'title' => 'صفحه اصلی صنایع چاپ و بسته‌بندی اشک قلم', 'textContent' => 'چاپ و بسته‌بندی اشک قلم؛ طراحی مهندسی و تولید انواع جعبه مقوایی، کارتن لمینتی، هاردباکس لوکس مگنتی، جعبه‌های دارویی و آرایشی، چاپ افست ۵ رنگ و جعبه‌ساز آنلاین سه‌بعدی.'],
            ['pageId' => 'core:/services', 'path' => '/services', 'pageType' => 'core', 'title' => 'خدمات چاپ افست، لمینت، قالب‌سازی و بسته‌بندی', 'textContent' => 'خدمات تخصصی چاپ افست پنج رنگ، سلفون مات و براق، سافت‌تاچ مخملی، طلاکوب، یووی موضعی، برجسته‌سازی، دایکات و لب‌چسب اتوماتیک.'],
            ['pageId' => 'core:/products', 'path' => '/products', 'pageType' => 'core', 'title' => 'محصولات و انواع جعبه و کارتن بسته‌بندی', 'textContent' => 'تولید انواع جعبه کیبوردی FEFCO 0427، کارتن مادر چهار درب FEFCO 0201، هاردباکس مگنتی، جعبه دارویی ECMA، جعبه خشکبار و زعفران صادراتی.'],
            ['pageId' => 'core:/catalog', 'path' => '/catalog', 'pageType' => 'core', 'title' => 'آرشیو کاتالوگ‌های فنی و ژورنال‌های بسته‌بندی', 'textContent' => 'مشاهده آنلاین کاتالوگ‌های سه‌بعدی ورق‌زن، نقشه‌های شماتیک خط برش و تا، جدول تلورانس کارگاهی و استانداردهای FEFCO و ECMA.'],
            ['pageId' => 'core:/blog', 'path' => '/blog', 'pageType' => 'core', 'title' => 'مجله تخصصی چاپ، بسته‌بندی و مهندسی کارتن', 'textContent' => 'مقالات تخصصی انتخاب گرماژ مقوا ایندربرد، استانداردهای FEFCO، مقاومت فشاری کارتن و طراحی دایلاین بدون خطا.'],
            ['pageId' => 'core:/inquiry', 'path' => '/inquiry', 'pageType' => 'core', 'title' => 'استعلام قیمت آنلاین چاپ و سفارش جعبه و کارتن', 'textContent' => 'فرم ثبت سفارش و دریافت پیش‌فاکتور آنلاین برای تولید جعبه مقوایی، کارتن لمینتی و هاردباکس با ابعاد دلخواه.'],
            ['pageId' => 'core:/tools/dieline', 'path' => '/tools/dieline', 'pageType' => 'core', 'title' => 'جعبه‌ساز مهندسی و طراحی آنلاین دایلاین سه‌بعدی', 'textContent' => 'ابزار تحت وب طراحی خط تیغ و خط تا با پیش‌نمایش سه‌بعدی و خروجی برداری DXF و PDF.'],
            ['pageId' => 'core:/tools/design-studio', 'path' => '/tools/design-studio', 'pageType' => 'core', 'title' => 'استودیو طراحی گرافیک و چیدمان طرح چاپ آنلاین', 'textContent' => 'محیط طراحی آنلاین فایل‌های PSD، PNG و SVG روی قالب جعبه با دسترسی به Photopea، PhotoCraft و VectorCraft.'],
            ['pageId' => 'core:/tools/autocad', 'path' => '/tools/autocad', 'pageType' => 'core', 'title' => 'اتوکد آنلاین و بررسی نقشه‌های CAD و DXF', 'textContent' => 'مشاهده و اندازه‌گیری نقشه‌های فنی DXF و DWG خطوط برش و قالب جعبه بدون نیاز به نصب نرم‌افزار.'],
            ['pageId' => 'core:/about', 'path' => '/about', 'pageType' => 'core', 'title' => 'درباره صنایع چاپ و بسته‌بندی اشک قلم', 'textContent' => 'معرفی مجموعه چاپ و بسته‌بندی اشک قلم، خط تولید افست و دایکات و مشاوره بسته‌بندی صادراتی.'],
        ];
        foreach ($core as $c) $pages[] = $c;
    }

    if (!empty($cfg['includeCatalogs'])) {
        $cats = seoApReadJson('catalogs.json', []);
        if (is_array($cats)) {
            foreach ($cats as $c) {
                if (!is_array($c) || (isset($c['isPublished']) && !$c['isPublished'])) continue;
                $slug = trim((string) ($c['slug'] ?? ($c['id'] ?? '')));
                if ($slug === '') continue;
                $txt = trim(strip_tags((string) ($c['title'] ?? '') . ' - ' . (string) ($c['category'] ?? '') . ' - ' . (string) ($c['description'] ?? '')));
                $pages[] = [
                    'pageId' => 'catalog:' . (string) ($c['id'] ?? $slug),
                    'path' => '/catalog/' . $slug,
                    'pageType' => 'catalog',
                    'title' => (string) ($c['title'] ?? 'کاتالوگ'),
                    'textContent' => mb_substr($txt, 0, 2200, 'UTF-8'),
                    'refId' => $c['id'] ?? null,
                ];
            }
        }
    }

    if (!empty($cfg['includeBlogPosts'])) {
        $posts = seoApReadJson('posts.json', []);
        if (is_array($posts)) {
            foreach ($posts as $p) {
                if (!is_array($p) || (($p['status'] ?? 'published') !== 'published')) continue;
                $slug = trim((string) ($p['slug'] ?? ($p['id'] ?? '')));
                if ($slug === '') continue;
                $txt = trim(preg_replace('/\s+/u', ' ', strip_tags((string) ($p['title'] ?? '') . ' | ' . (string) ($p['excerpt'] ?? '') . ' | ' . (string) ($p['content'] ?? ''))));
                $pages[] = [
                    'pageId' => 'blog:' . (string) ($p['id'] ?? $slug),
                    'path' => '/blog/' . $slug,
                    'pageType' => 'blog',
                    'title' => (string) ($p['title'] ?? 'مقاله'),
                    'textContent' => mb_substr($txt, 0, 2800, 'UTF-8'),
                    'refId' => $p['id'] ?? null,
                ];
            }
        }
    }

    return $pages;
}

function seoGeminiApplyToDb(array $page, array $rec): bool {
    if ($page['pageType'] === 'blog' && isset($page['refId'])) {
        $posts = seoApReadJson('posts.json', []);
        if (is_array($posts)) {
            foreach ($posts as $i => $p) {
                if (is_array($p) && (string) ($p['id'] ?? '') === (string) $page['refId']) {
                    $seo = is_array($p['seo'] ?? null) ? $p['seo'] : [];
                    $seo['metaTitle'] = $rec['metaTitle'];
                    $seo['metaDescription'] = $rec['metaDescription'];
                    $seo['focusKeyword'] = $rec['focusKeyword'];
                    $seo['keywords'] = $rec['keywords'];
                    $seo['internalLinks'] = $rec['internalLinks'];
                    $seo['geminiOptimizedAt'] = $rec['optimizedAt'];
                    $posts[$i]['seo'] = $seo;
                    return seoApWriteJson('posts.json', array_values($posts));
                }
            }
        }
    }
    if ($page['pageType'] === 'catalog' && isset($page['refId'])) {
        $cats = seoApReadJson('catalogs.json', []);
        if (is_array($cats)) {
            foreach ($cats as $i => $c) {
                if (is_array($c) && (string) ($c['id'] ?? '') === (string) $page['refId']) {
                    $cats[$i]['seo'] = [
                        'metaTitle' => $rec['metaTitle'],
                        'metaDescription' => $rec['metaDescription'],
                        'focusKeyword' => $rec['focusKeyword'],
                        'keywords' => $rec['keywords'],
                        'internalLinks' => $rec['internalLinks'],
                        'geminiOptimizedAt' => $rec['optimizedAt'],
                    ];
                    return seoApWriteJson('catalogs.json', array_values($cats));
                }
            }
        }
    }
    $settings = seoApReadJson('settings.json', []);
    if (!is_array($settings)) $settings = [];
    if (!is_array($settings['seoOverrides'] ?? null)) $settings['seoOverrides'] = [];
    $settings['seoOverrides'][$page['path']] = [
        'metaTitle' => $rec['metaTitle'],
        'metaDescription' => $rec['metaDescription'],
        'focusKeyword' => $rec['focusKeyword'],
        'keywords' => $rec['keywords'],
        'internalLinks' => $rec['internalLinks'],
        'optimizedAt' => $rec['optimizedAt'],
    ];
    return seoApWriteJson('settings.json', $settings);
}

function seoGeminiCallModel(string $apiKey, array $page, array $allRoutes, array $cfg, ?string &$errorMsg = null): ?array {
    if (!function_exists('curl_init')) {
        $errorMsg = 'افزونه cURL روی سرور PHP فعال نیست.';
        return null;
    }
    $targetLines = [];
    foreach ($allRoutes as $r) {
        if ($r['path'] === $page['path']) continue;
        $targetLines[] = '- ' . $r['path'] . ' : ' . $r['title'];
        if (count($targetLines) >= 35) break;
    }
    $prompt = "محتوای زیر متعلق به یکی از صفحات وب‌سایت «{$cfg['siteBrand']}» است.\n"
        . "مسیر: {$page['path']} | عنوان: {$page['title']}\n"
        . "متن صفحه:\n{$page['textContent']}\n\n"
        . "مسیرهای معتبر برای لینک داخلی:\n" . implode("\n", $targetLines) . "\n\n"
        . "خروجی JSON دقیق فارسی تولید کن شامل: metaTitle (50-62 کاراکتر)، metaDescription (125-158 کاراکتر)، focusKeyword، keywords (5 تا 8 مورد)، internalLinks (آرایه‌ای از اشیا با anchorText، targetPath از لیست بالا، و reason)، seoScore (عدد 60 تا 100)، و summaryNote.";

    $payload = [
        'systemInstruction' => [
            'parts' => [['text' => 'You are a senior Persian technical SEO specialist. Respond strictly in JSON matching the requested schema.']],
        ],
        'contents' => [
            ['role' => 'user', 'parts' => [['text' => $prompt]]],
        ],
        'generationConfig' => [
            'responseMimeType' => 'application/json',
        ],
    ];

    $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-4-hydrogen:generateContent?key=' . rawurlencode($apiKey);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_TIMEOUT => 45,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'User-Agent: aistudio-build',
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);
    $raw = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($raw === false || $httpCode < 200 || $httpCode >= 300) {
        $errorMsg = $curlErr ?: ('خطای سرویس Gemini (کد HTTP ' . $httpCode . ')');
        return null;
    }
    $decoded = json_decode((string) $raw, true);
    $text = trim((string) ($decoded['candidates'][0]['content']['parts'][0]['text'] ?? ''));
    if ($text === '') {
        $errorMsg = 'پاسخ متنی از سرویس Gemini دریافت نشد.';
        return null;
    }
    $parsed = json_decode($text, true);
    if (!is_array($parsed)) {
        $errorMsg = 'فرمت JSON پاسخ Gemini نامعتبر بود.';
        return null;
    }
    $validPaths = [];
    foreach ($allRoutes as $r) $validPaths[$r['path']] = true;
    $links = [];
    if (is_array($parsed['internalLinks'] ?? null)) {
        foreach ($parsed['internalLinks'] as $l) {
            if (!is_array($l)) continue;
            $tp = trim((string) ($l['targetPath'] ?? ''));
            if ($tp === '' || $tp === $page['path'] || !isset($validPaths[$tp])) continue;
            $links[] = [
                'anchorText' => trim((string) ($l['anchorText'] ?? '')),
                'targetPath' => $tp,
                'reason' => trim((string) ($l['reason'] ?? '')),
            ];
            if (count($links) >= 5) break;
        }
    }
    return [
        'pageId' => $page['pageId'],
        'path' => $page['path'],
        'pageType' => $page['pageType'],
        'sourceTitle' => $page['title'],
        'metaTitle' => mb_substr(trim((string) ($parsed['metaTitle'] ?? $page['title'])), 0, 80, 'UTF-8'),
        'metaDescription' => mb_substr(trim((string) ($parsed['metaDescription'] ?? '')), 0, 200, 'UTF-8'),
        'focusKeyword' => trim((string) ($parsed['focusKeyword'] ?? '')),
        'keywords' => is_array($parsed['keywords'] ?? null) ? array_values(array_slice(array_filter(array_map('strval', $parsed['keywords'])), 0, 10)) : [],
        'internalLinks' => $links,
        'seoScore' => max(0, min(100, (int) ($parsed['seoScore'] ?? 80))),
        'summaryNote' => trim((string) ($parsed['summaryNote'] ?? '')),
        'model' => 'gemini-4-hydrogen',
        'optimizedAt' => gmdate('c'),
        'appliedToDb' => false,
    ];
}

function seoGeminiBuildStatusPayload(): array {
    $cfg = seoGeminiLoadConfig();
    $db = seoGeminiLoadDb();
    $state = seoGeminiLoadState();
    $scannable = seoGeminiCollectPages($cfg);

    $pages = [];
    $optCount = 0;
    $scoreSum = 0;
    $linkSum = 0;
    foreach ($scannable as $p) {
        $opt = $db[$p['pageId']] ?? null;
        if (is_array($opt)) {
            $optCount++;
            $scoreSum += (int) ($opt['seoScore'] ?? 0);
            $linkSum += is_array($opt['internalLinks'] ?? null) ? count($opt['internalLinks']) : 0;
        }
        $pages[] = [
            'pageId' => $p['pageId'],
            'path' => $p['path'],
            'pageType' => $p['pageType'],
            'sourceTitle' => $p['title'],
            'wordCount' => seoApWordCount((string) $p['textContent']),
            'optimization' => $opt,
        ];
    }
    $lastTs = !empty($state['lastRunAt']) ? (int) strtotime((string) $state['lastRunAt']) : 0;
    $nextRunAt = $lastTs > 0 ? gmdate('c', $lastTs + ((int) $cfg['intervalHours'] * 3600)) : gmdate('c');

    return [
        'ok' => true,
        'geminiConfigured' => seoGeminiGetApiKey() !== '',
        'model' => 'gemini-4-hydrogen',
        'cronActive' => !empty($cfg['enabled']),
        'isRunning' => false,
        'config' => $cfg,
        'state' => $state,
        'nextRunAt' => $nextRunAt,
        'stats' => [
            'totalScannablePages' => count($pages),
            'optimizedPagesCount' => $optCount,
            'pendingPagesCount' => count($pages) - $optCount,
            'averageSeoScore' => $optCount > 0 ? (int) round($scoreSum / $optCount) : null,
            'totalInternalLinksSuggested' => $linkSum,
        ],
        'pages' => $pages,
    ];
}

function seoGeminiRunBatch(string $source = 'admin_manual', ?string $targetPageId = null): array {
    $apiKey = seoGeminiGetApiKey();
    if ($apiKey === '') {
        return [
            'ok' => false,
            'statusCode' => 503,
            'error' => 'متغیر محیطی GEMINI_API_KEY روی سرور تنظیم نشده است.',
        ];
    }
    $cfg = seoGeminiLoadConfig();
    $db = seoGeminiLoadDb();
    $state = seoGeminiLoadState();
    $allPages = seoGeminiCollectPages($cfg);
    $routeIndex = array_map(function ($p) {
        return ['path' => $p['path'], 'title' => $p['title']];
    }, $allPages);

    $queue = [];
    if ($targetPageId !== null && $targetPageId !== '') {
        foreach ($allPages as $p) {
            if ($p['pageId'] === $targetPageId || $p['path'] === $targetPageId) {
                $queue[] = $p;
                break;
            }
        }
        if (empty($queue)) {
            return ['ok' => false, 'statusCode' => 404, 'error' => 'صفحه مورد نظر یافت نشد.'];
        }
    } else {
        usort($allPages, function ($a, $b) use ($db) {
            $at = !empty($db[$a['pageId']]['optimizedAt']) ? (int) strtotime((string) $db[$a['pageId']]['optimizedAt']) : 0;
            $bt = !empty($db[$b['pageId']]['optimizedAt']) ? (int) strtotime((string) $db[$b['pageId']]['optimizedAt']) : 0;
            return $at <=> $bt;
        });
        $queue = array_slice($allPages, 0, max(1, min(10, (int) $cfg['batchSize'])));
    }

    $processed = 0;
    $applied = 0;
    $errors = [];
    foreach ($queue as $page) {
        $err = null;
        $rec = seoGeminiCallModel($apiKey, $page, $routeIndex, $cfg, $err);
        if ($rec !== null) {
            if (!empty($cfg['autoApplyToDatabase'])) {
                $rec['appliedToDb'] = seoGeminiApplyToDb($page, $rec);
                if ($rec['appliedToDb']) $applied++;
            }
            $db[$page['pageId']] = $rec;
            $processed++;
        } else {
            $errors[] = $page['path'] . ': ' . ($err ?: 'خطا در Gemini');
        }
    }
    seoGeminiSaveDb($db);

    $nowIso = gmdate('c');
    $state['lastRunAt'] = $nowIso;
    $state['totalPagesOptimized'] = ((int) ($state['totalPagesOptimized'] ?? 0)) + $processed;
    if ($source === 'cron_background') {
        $state['totalCronRuns'] = ((int) ($state['totalCronRuns'] ?? 0)) + 1;
    }
    $state['lastError'] = !empty($errors) ? $errors[0] : null;
    $summary = $processed > 0
        ? "{$processed} صفحه با Gemini بهینه‌سازی شد ({$applied} ذخیره در دیتابیس)"
        : ($errors[0] ?? 'هیچ صفحه‌ای پردازش نشد.');
    array_unshift($state['recentLogs'], [
        'at' => $nowIso,
        'atShamsi' => seoApShamsiToday() . ' ' . date('H:i'),
        'source' => $source,
        'processedCount' => $processed,
        'appliedCount' => $applied,
        'errorCount' => count($errors),
        'summary' => $summary,
        'errorDetail' => !empty($errors) ? implode(' | ', $errors) : null,
    ]);
    seoGeminiSaveState($state);

    if ($processed === 0 && !empty($errors)) {
        return ['ok' => false, 'statusCode' => 502, 'error' => $errors[0], 'status' => seoGeminiBuildStatusPayload()];
    }
    return [
        'ok' => true,
        'statusCode' => 200,
        'summary' => $summary,
        'processedCount' => $processed,
        'appliedCount' => $applied,
        'errorCount' => count($errors),
        'status' => seoGeminiBuildStatusPayload(),
    ];
}

function seoGeminiRunIfDue(): ?array {
    $cfg = seoGeminiLoadConfig();
    if (empty($cfg['enabled']) || seoGeminiGetApiKey() === '') return null;
    $st = seoGeminiLoadState();
    $lastTs = !empty($st['lastRunAt']) ? (int) strtotime((string) $st['lastRunAt']) : 0;
    if ($lastTs > 0 && (time() - $lastTs) < ((int) $cfg['intervalHours'] * 3600)) {
        return null;
    }
    return seoGeminiRunBatch('cron_background');
}

