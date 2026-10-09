import os
import zipfile
import shutil

print("Starting packaging for host deployment...")

os.makedirs("public/downloads", exist_ok=True)

# 1. Create .htaccess for Apache / cPanel / DirectAdmin SPA routing
htaccess_content = """# Ashk Ghalam CAD Studio - Apache / Litespeed / cPanel SPA Rewrite
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# MIME Types for 3D and Fonts
<IfModule mod_mime.c>
  AddType application/font-woff2 .woff2
  AddType application/font-woff .woff
  AddType application/dxf .dxf
  AddType image/svg+xml .svg
</IfModule>

# Gzip Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json application/font-woff2
</IfModule>
"""

with open("dist/.htaccess", "w", encoding="utf-8") as f:
    f.write(htaccess_content)

# 2. Create nginx.conf guide
nginx_content = """# Ashk Ghalam Nginx Configuration
server {
    listen 80;
    server_name your-domain.ir www.your-domain.ir;
    root /var/www/ashk-ghalam;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
"""

with open("dist/nginx.conf.example", "w", encoding="utf-8") as f:
    f.write(nginx_content)

# 3. Create comprehensive Persian Deployment Guide
deploy_guide = """# راهنمای استقرار و آپلود سامانه اشک قلم (نسخه ۳.۰) بر روی هاست

این بسته شامل تمامی فایلهای کامپایل شده و آماده بهره‌برداری سامانه مهندسی کارتن و بسته‌بندی اشک قلم می‌باشد.

---

### روش اول: استقرار روی هاست اشتراکی (cPanel / DirectAdmin / Plesk)
1. وارد کنترل پنل هاست خود شوید و به بخش **File Manager** بروید.
2. وارد پوشه ریشه سایت خود (معمولاً `public_html` یا `httpdocs`) شوید.
3. فایل‌های داخل پوشه `dist` (شامل `index.html`, `assets`, `.htaccess` و ...) را مستقیماً در `public_html` آپلود و Extract کنید.
4. سامانه با سرعت بسیار بالا و به صورت ۱۰۰٪ آفلاین بر روی هاست شما آماده استفاده است.

---

### روش دوم: استقرار روی سرورهای ابری یا PaaS (لیارا، پله، چابکان، سرور مجازی Ubuntu/CentOS)
- برای اجرای Node.js:
  دستور `npm install` یا `npm run start` را با استفاده از فایل `server.ts` یا `dist/server.cjs` اجرا فرمایید.
  پورت پیش‌فرض: `3000` (قابل تنظیم با متغیر محیطی PORT).

---

### روش سوم: استقرار با وب‌سرور Nginx بر روی VPS
1. محتویات پوشه `dist` را در مسیر `/var/www/ashk-ghalam` کپی کنید.
2. نمونه کانفیگ `nginx.conf.example` را در تنظیمات Nginx قرار داده و `nginx -s reload` کنید.

تمامی حقوق متعلق به سامانه مهندسی اشک قلم است.
"""

with open("dist/راهنمای_نصب_روی_هاست.txt", "w", encoding="utf-8") as f:
    f.write(deploy_guide)

with open("README_DEPLOY_IRAN_HOST.md", "w", encoding="utf-8") as f:
    f.write(deploy_guide)

# 4. Generate ZIP 1: Production Host Ready (Direct upload to public_html)
dist_zip_path = "public/downloads/ashk-ghalam-v3.0-host-ready.zip"
print(f"Creating {dist_zip_path}...")
with zipfile.ZipFile(dist_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk("dist"):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, "dist")
            zipf.write(full_path, arcname=rel_path)

# 5. Generate ZIP 2: Complete Project & Source Code (All components, services, configs, dist)
full_zip_path = "public/downloads/ashk-ghalam-v3.0-full-project.zip"
print(f"Creating {full_zip_path}...")
exclude_dirs = {"node_modules", ".git", ".next", ".cache", "dist", ".vite"}
exclude_files = {".DS_Store"}

with zipfile.ZipFile(full_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    # Add dist inside full zip as well
    for root, dirs, files in os.walk("dist"):
        for file in files:
            full_path = os.path.join(root, file)
            zipf.write(full_path, arcname=full_path)
            
    # Add all source files
    for root, dirs, files in os.walk("."):
        # filter out ignored directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith(".")]
        if root.startswith("./public/downloads"):
            continue
            
        for file in files:
            if file in exclude_files or file.endswith(".pyc") or file.endswith(".zip"):
                continue
            full_path = os.path.join(root, file)
            # normalize path
            rel_path = os.path.relpath(full_path, ".")
            zipf.write(full_path, arcname=rel_path)

print("ZIP files created successfully!")
print(f"1. {dist_zip_path} ({os.path.getsize(dist_zip_path) / 1024 / 1024:.2f} MB)")
print(f"2. {full_zip_path} ({os.path.getsize(full_zip_path) / 1024 / 1024:.2f} MB)")
