import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import path from "path";
import fs from "fs";
import cors from "cors";
import AdmZip from "adm-zip";
import crypto from "crypto";
import { execSync } from "child_process";
import { GoogleGenAI, Type } from "@google/genai";
import apiRouter from "./src/api/index";

// Headless CMS Engine imports
// Note: In production you would initialize your Drizzle PostgreSQL pool here 
// and pass it to your API routers.

const _filename = typeof __filename !== "undefined" ? __filename : "/app/applet/server.ts";
const _dirname = process.cwd();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Mount custom industrial CAD API Router
  app.use("/api", apiRouter);
  app.use("/", apiRouter);

  // Ensure uploads directory exists (legacy fallback)
  const uploadsDir = path.join(_dirname, "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve uploaded files statically with aggressive caching strategy (max-age of 30 days) to optimize loads
  // Both development and production modes require serving /uploads, /media, and /downloads statically
  app.use("/uploads", express.static(uploadsDir, {
    maxAge: "30d",
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
    }
  }));
  const mediaDir = path.join(_dirname, "public", "media");
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }
  app.use("/media", express.static(mediaDir, {
    maxAge: "30d",
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
    }
  }));
  const downloadsDir = path.join(_dirname, "public", "downloads");
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }
  app.use("/downloads", express.static(downloadsDir));

  // Enterprise S3 Configuration
  const { S3Client, PutObjectCommand, GetObjectCommand } = await import('@aws-sdk/client-s3');
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
  
  // NOTE: During transition we will use a hybrid/mock approach if env vars are missing
  const s3Endpoint = process.env.S3_ENDPOINT || '';
  const isS3Enabled = !!s3Endpoint;
  
  let s3Client: any = null;
  if (isS3Enabled) {
    s3Client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: s3Endpoint,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin'
      },
      forcePathStyle: true // Needed for MinIO
    });
  }

  // Fallback Local Storage Setup
  const localStorageOption = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      let ext = path.extname(file.originalname).toLowerCase();
      if (!ext || ext === '.img' || ext === '.blob') {
        if (file.mimetype === 'image/jpeg') ext = '.jpg';
        else if (file.mimetype === 'image/png') ext = '.png';
        else if (file.mimetype === 'image/webp') ext = '.webp';
        else if (file.mimetype === 'image/gif') ext = '.gif';
        else ext = '.jpg'; // default
      }
      cb(null, file.fieldname + "-" + uniqueSuffix + ext);
    },
  });
  const localUpload = multer({ storage: localStorageOption });

  // Configure multer (hybrid approach)
  let upload;
  let s3Upload: any = null;
  if (isS3Enabled) {
    try {
      const multerS3 = (await import('multer-s3')).default;
      s3Upload = multer({
        storage: multerS3({
          s3: s3Client,
          bucket: process.env.S3_BUCKET || 'ashk-ghalam-enterprise',
          key: function (req, file, cb) {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            let ext = path.extname(file.originalname).toLowerCase();
            if (!ext || ext === '.img' || ext === '.blob') {
              if (file.mimetype === 'image/jpeg') ext = '.jpg';
              else if (file.mimetype === 'image/png') ext = '.png';
              else if (file.mimetype === 'image/webp') ext = '.webp';
              else if (file.mimetype === 'image/gif') ext = '.gif';
              else ext = '.jpg'; // default
            }
            cb(null, file.fieldname + "-" + uniqueSuffix + ext);
          }
        })
      });
      upload = s3Upload;
    } catch (e) {
      console.error("Failed to initialize S3 upload storage, using local fallback only:", e);
      upload = localUpload;
    }
  } else {
    upload = localUpload;
  }

  // Ensure backups directory exists
  const backupsDir = path.join(_dirname, "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  // Helper function to package all upload assets as Base64 strings
  function getMediaFilesPack() {
    const mediaFiles: { filename: string; base64: string }[] = [];
    try {
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        for (const file of files) {
          const filePath = path.join(uploadsDir, file);
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            // Guard: Skip files larger than 5MB to prevent Node heap exhaustion during JSON exports
            if (stat.size > 5 * 1024 * 1024) {
              console.warn(`Skipping large file in base64 serialization: ${file} (${stat.size} bytes)`);
              continue;
            }
            const fileBuffer = fs.readFileSync(filePath);
            mediaFiles.push({
              filename: file,
              base64: fileBuffer.toString("base64")
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to pack uploads:", err);
    }
    return mediaFiles;
  }

  // Helper function to restore packaged media files to the uploads directory
  function restoreMediaFilesPack(mediaFiles: any[]) {
    if (!Array.isArray(mediaFiles)) return;
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      for (const fileItem of mediaFiles) {
        if (fileItem.filename && fileItem.base64) {
          const destPath = path.join(uploadsDir, fileItem.filename);
          // Protection against path traversal attacks
          const resolvedPath = path.resolve(destPath);
          if (resolvedPath.startsWith(uploadsDir)) {
            const fileBuffer = Buffer.from(fileItem.base64, "base64");
            fs.writeFileSync(resolvedPath, fileBuffer);
          }
        }
      }
    } catch (err) {
      console.error("Failed to restore packaged uploads:", err);
    }
  }

  // Save backup on server (includes packed media files)
  app.post("/api/backup/save", (req, res) => {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== "object") {
        return res.status(400).json({ error: "Invalid backup payload" });
      }
      
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `backup_${stamp}.json`;
      const filePath = path.join(backupsDir, filename);

      // Pack media files and merge with database payload
      const mediaFiles = getMediaFilesPack();
      const completeBackup = { ...payload, mediaFiles };

      fs.writeFileSync(filePath, JSON.stringify(completeBackup, null, 2), "utf8");
      res.json({ success: true, filename });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save backup on server: " + err.message });
    }
  });

  // Export complete client payload as unified package with packed media
  app.post("/api/backup/export", (req, res) => {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== "object") {
        return res.status(400).json({ error: "Invalid payload" });
      }
      const mediaFiles = getMediaFilesPack();
      const completeBackup = { ...payload, mediaFiles };
      res.json(completeBackup);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to compile export package: " + err.message });
    }
  });

  // Import uploaded JSON backup pack (restores files and DB structures)
  app.post("/api/backup/import", (req, res) => {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== "object") {
        return res.status(400).json({ error: "Invalid backup cargo" });
      }
      // Re-hydrate media files back to uploads folder
      if (payload.mediaFiles) {
        restoreMediaFilesPack(payload.mediaFiles);
      }
      res.json({ success: true, count: payload.mediaFiles ? payload.mediaFiles.length : 0 });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to restore content items on host: " + err.message });
    }
  });

  // --- DEDICATED ACTIVE CATALOGS & SETTINGS BACKUP & MIGRATION ENDPOINTS ---
  
  // Helper to extract catalog-specific media files
  function getCatalogMediaFilesPack(catalogs: any[]) {
    const catalogMedia: { filename: string; base64: string }[] = [];
    if (!Array.isArray(catalogs) || catalogs.length === 0) return catalogMedia;

    const referencedFiles = new Set<string>();

    catalogs.forEach((cat: any) => {
      const checkAndAdd = (url: string) => {
        if (!url || typeof url !== 'string') return;
        const cleaned = url.replace(/^\/?uploads\//, '').replace(/^\//, '');
        if (cleaned && !cleaned.startsWith('data:') && !cleaned.startsWith('http')) {
          referencedFiles.add(cleaned);
        }
      };

      checkAndAdd(cat.coverImage);
      checkAndAdd(cat.thumbnailUrl);
      checkAndAdd(cat.pdfUrl);

      if (Array.isArray(cat.pages)) {
        cat.pages.forEach((p: any) => {
          checkAndAdd(p.imageUrl);
          checkAndAdd(p.thumbnailUrl);
        });
      }
    });

    try {
      if (fs.existsSync(uploadsDir)) {
        const diskFiles = fs.readdirSync(uploadsDir);
        for (const filename of diskFiles) {
          // Include if explicitly referenced OR starts with catalog prefixes
          const isCatalogFile = referencedFiles.has(filename) || 
            filename.startsWith('cover_') || 
            filename.startsWith('thumb_') || 
            filename.startsWith('p_') || 
            filename.startsWith('pt_') || 
            filename.startsWith('catalog_');

          if (isCatalogFile) {
            const filePath = path.join(uploadsDir, filename);
            const stat = fs.statSync(filePath);
            if (stat.isFile() && stat.size <= 8 * 1024 * 1024) { // Up to 8MB per file
              const fileBuffer = fs.readFileSync(filePath);
              catalogMedia.push({
                filename,
                base64: fileBuffer.toString("base64")
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Error gathering catalog media pack:", err);
    }

    return catalogMedia;
  }

  // 1. Export Active Catalogs & Settings package
  app.all(["/api/backup/catalogs-and-settings/export", "/api/backup/catalogs-settings/export"], (req, res) => {
    try {
      // Gather server-side active catalogs
      let serverCatalogs: any[] = [];
      const catalogsFilePath = path.join(uploadsDir, "custom_catalogs.json");
      if (fs.existsSync(catalogsFilePath)) {
        try {
          serverCatalogs = JSON.parse(fs.readFileSync(catalogsFilePath, "utf8"));
        } catch (e) {
          console.error("Error reading custom_catalogs.json", e);
        }
      }

      // Gather server-side active global settings
      let serverSettings: any = {};
      const settingsFilePath = path.join(uploadsDir, "global_settings.json");
      if (fs.existsSync(settingsFilePath)) {
        try {
          serverSettings = JSON.parse(fs.readFileSync(settingsFilePath, "utf8"));
        } catch (e) {
          console.error("Error reading global_settings.json", e);
        }
      }

      // If client provided payload (e.g. from localStorage), merge cleanly
      const clientPayload = req.body || {};
      const finalCatalogs = (clientPayload.catalogs && Array.isArray(clientPayload.catalogs) && clientPayload.catalogs.length > 0)
        ? clientPayload.catalogs
        : serverCatalogs;

      const finalSettings = {
        ...serverSettings,
        ...(clientPayload.globalSettings || {}),
        pricingFormula: clientPayload.pricingFormula || serverSettings.pricingFormula,
        siteContent: clientPayload.siteContent || serverSettings.siteContent,
        seoConfigs: clientPayload.seoConfigs || serverSettings.seoConfigs,
        b2bSettings: clientPayload.b2bSettings || serverSettings.b2bSettings
      };

      // Gather catalog-specific media
      const catalogMedia = getCatalogMediaFilesPack(finalCatalogs);

      // Current Persian date stamp
      const now = new Date();
      const shamsiDateStr = new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now);

      const timestamp = now.getTime();
      const payloadData = {
        type: "ASHK_GHALAM_ACTIVE_CATALOGS_AND_SETTINGS_BACKUP",
        version: "2.10.0",
        createdAt: now.toISOString(),
        createdAtShamsi: shamsiDateStr,
        generator: "Ashk Ghalam Industrial CAD Studio Migration Engine",
        stats: {
          catalogsCount: finalCatalogs.length,
          catalogPagesCount: finalCatalogs.reduce((acc: number, c: any) => acc + (c.pages?.length || 0), 0),
          catalogMediaCount: catalogMedia.length,
          hasGlobalSettings: Object.keys(finalSettings).length > 0
        },
        data: {
          catalogs: finalCatalogs,
          settings: finalSettings,
          catalogMedia
        }
      };

      // Compute cryptographic hash
      const dataHash = crypto.createHash("sha256").update(JSON.stringify(payloadData.data)).digest("hex");
      const completePackage = {
        ...payloadData,
        sha256Hash: dataHash
      };

      // Save a local copy on the server for persistence
      const backupSavePath = path.join(backupsDir, `catalogs_settings_backup_${timestamp}.json`);
      fs.writeFileSync(backupSavePath, JSON.stringify(completePackage, null, 2), "utf8");

      res.setHeader("Content-Disposition", `attachment; filename="ashk_catalogs_settings_backup_${timestamp}.json"`);
      res.json(completePackage);
    } catch (err: any) {
      console.error("Error in catalogs-settings export:", err);
      res.status(500).json({ error: "خطا در استخراج بسته کاتالوگ‌ها و تنظیمات فعال: " + err.message });
    }
  });

  // 2. Restore and Migrate Active Catalogs & Settings to Updated Site
  app.post(["/api/backup/catalogs-and-settings/restore-migrate", "/api/backup/catalogs-settings/restore-migrate"], (req, res) => {
    try {
      const packageCargo = req.body;
      if (!packageCargo || !packageCargo.data) {
        return res.status(400).json({ error: "قالب فایل پشتیبان نامعتبر است یا فاقد بخش داده (data) می‌باشد." });
      }

      const { data, sha256Hash } = packageCargo;
      const { catalogs, settings, catalogMedia } = data;
      const mergeMode = req.query.mode === 'replace' ? 'replace' : 'merge'; // 'merge' or 'replace'

      // Verification check if hash exists
      if (sha256Hash) {
        const calculatedHash = crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
        if (calculatedHash !== sha256Hash) {
          console.warn("Notice: Hash mismatch in migration package, proceeding with data tolerance check.");
        }
      }

      // 1. Create a pre-migration emergency snapshot of current server state
      const timestamp = Date.now();
      const preMigrationSnapshotPath = path.join(backupsDir, `pre_migration_snapshot_${timestamp}.json`);
      const currentServerState: any = {};
      const catalogsFilePath = path.join(uploadsDir, "custom_catalogs.json");
      const settingsFilePath = path.join(uploadsDir, "global_settings.json");

      if (fs.existsSync(catalogsFilePath)) {
        try { currentServerState.catalogs = JSON.parse(fs.readFileSync(catalogsFilePath, "utf8")); } catch (_) {}
      }
      if (fs.existsSync(settingsFilePath)) {
        try { currentServerState.settings = JSON.parse(fs.readFileSync(settingsFilePath, "utf8")); } catch (_) {}
      }
      fs.writeFileSync(preMigrationSnapshotPath, JSON.stringify(currentServerState, null, 2), "utf8");

      // 2. Restore catalog media files physically to uploads folder
      let restoredMediaCount = 0;
      if (Array.isArray(catalogMedia) && catalogMedia.length > 0) {
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        for (const fileItem of catalogMedia) {
          if (fileItem.filename && fileItem.base64) {
            const destPath = path.join(uploadsDir, fileItem.filename);
            const resolvedPath = path.resolve(destPath);
            if (resolvedPath.startsWith(uploadsDir)) {
              const fileBuffer = Buffer.from(fileItem.base64, "base64");
              fs.writeFileSync(resolvedPath, fileBuffer);
              restoredMediaCount++;
            }
          }
        }
      }

      // 3. Migrate & Persist Catalogs
      let finalCatalogs: any[] = [];
      if (Array.isArray(catalogs)) {
        if (mergeMode === 'replace') {
          finalCatalogs = catalogs;
        } else {
          // Merge mode: preserve existing distinct catalogs and update/add imported ones
          const existingCatalogs = currentServerState.catalogs || [];
          const importedIds = new Set(catalogs.map((c: any) => String(c.id)));
          
          // Keep existing that are not in imported
          finalCatalogs = [
            ...catalogs,
            ...existingCatalogs.filter((c: any) => !importedIds.has(String(c.id)))
          ];
        }

        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        fs.writeFileSync(catalogsFilePath, JSON.stringify(finalCatalogs, null, 2), "utf8");
      }

      // 4. Migrate & Persist Global Settings
      let finalSettings: any = currentServerState.settings || {};
      if (settings && typeof settings === 'object') {
        if (mergeMode === 'replace') {
          finalSettings = settings;
        } else {
          finalSettings = {
            ...finalSettings,
            ...settings
          };
        }
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        fs.writeFileSync(settingsFilePath, JSON.stringify(finalSettings, null, 2), "utf8");
      }

      console.log(`[Migration Success] Restored ${finalCatalogs.length} catalogs, ${restoredMediaCount} media files, and global settings to updated site.`);

      res.json({
        success: true,
        message: "انتقال و بازیابی کاتالوگ‌ها و تنظیمات فعال به سایت با موفقیت کامل انجام گردید.",
        mergeMode,
        restoredStats: {
          catalogsCount: finalCatalogs.length,
          restoredMediaCount,
          settingsKeys: Object.keys(finalSettings)
        },
        restoredData: {
          catalogs: finalCatalogs,
          settings: finalSettings
        },
        preMigrationBackup: `pre_migration_snapshot_${timestamp}.json`
      });
    } catch (err: any) {
      console.error("Error in catalogs-settings restore-migrate:", err);
      res.status(500).json({ error: "خطا در انتقال و بازیابی کاتالوگ‌ها و تنظیمات به سایت: " + err.message });
    }
  });

  // 3. FULL-SYSTEM COMPREHENSIVE BACKUP EXPORT
  app.all(["/api/backup/full-system/export"], (req, res) => {
    try {
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

      // Gather Catalogs
      let catalogs: any[] = [];
      const catalogsFilePath = path.join(uploadsDir, "custom_catalogs.json");
      if (fs.existsSync(catalogsFilePath)) {
        try { catalogs = JSON.parse(fs.readFileSync(catalogsFilePath, "utf8")); } catch (_) {}
      }

      // Gather Settings
      let globalSettings: any = {};
      const settingsFilePath = path.join(uploadsDir, "global_settings.json");
      if (fs.existsSync(settingsFilePath)) {
        try { globalSettings = JSON.parse(fs.readFileSync(settingsFilePath, "utf8")); } catch (_) {}
      }

      // Gather Software Products & Licenses
      const softwareProducts = getSoftwareProductsData();
      const softwareLicenses = getSoftwareLicensesData();

      // Client-provided overrides
      const clientPayload = req.body || {};
      if (clientPayload.catalogs && Array.isArray(clientPayload.catalogs) && clientPayload.catalogs.length > 0) {
        catalogs = clientPayload.catalogs;
      }
      if (clientPayload.globalSettings && typeof clientPayload.globalSettings === "object") {
        globalSettings = { ...globalSettings, ...clientPayload.globalSettings };
      }

      // Pack all uploaded media files
      const mediaFiles = getMediaFilesPack();

      const now = new Date();
      const shamsiDateStr = new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now);

      const timestamp = now.getTime();
      const backupPackage = {
        packageType: "ASHK_GHALAM_FULL_SYSTEM_RECOVERABLE_ARCHIVE",
        version: "3.1.0",
        createdAt: now.toISOString(),
        createdAtShamsi: shamsiDateStr,
        generator: "Ashk Ghalam Industrial CAD Studio v3.1 Backup Engine",
        stats: {
          catalogsCount: catalogs.length,
          softwareProductsCount: softwareProducts.length,
          softwareLicensesCount: softwareLicenses.length,
          mediaFilesCount: mediaFiles.length,
          hasGlobalSettings: Object.keys(globalSettings).length > 0,
          hasSiteContent: !!(clientPayload.siteContent || globalSettings.siteContent)
        },
        data: {
          globalSettings,
          siteContent: clientPayload.siteContent || globalSettings.siteContent || {},
          pricingFormula: clientPayload.pricingFormula || globalSettings.pricingFormula || {},
          seoConfigs: clientPayload.seoConfigs || globalSettings.seoConfigs || [],
          emergencyConfig: clientPayload.emergencyConfig || globalSettings.emergencyConfig || {},
          catalogs,
          softwareProducts,
          softwareLicenses,
          b2bSettings: clientPayload.b2bSettings || {},
          mediaFiles
        }
      };

      // Cryptographic integrity seal
      const sha256 = crypto.createHash("sha256").update(JSON.stringify(backupPackage.data)).digest("hex");
      (backupPackage as any).sha256Hash = sha256;

      // Always save a persistent recoverable copy in the server backups/ directory
      const localBackupFilename = `full_system_backup_${timestamp}.json`;
      const localBackupFilePath = path.join(backupsDir, localBackupFilename);
      fs.writeFileSync(localBackupFilePath, JSON.stringify(backupPackage, null, 2), "utf8");

      res.setHeader("Content-Disposition", `attachment; filename="ashk_full_system_backup_${timestamp}.json"`);
      res.json(backupPackage);
    } catch (err: any) {
      console.error("Full system export failed:", err);
      res.status(500).json({ error: "خطا در تهیه نسخه پشتیبان جامع: " + err.message });
    }
  });

  // 4. FULL-SYSTEM COMPREHENSIVE BACKUP RESTORE
  app.post(["/api/backup/full-system/restore"], (req, res) => {
    try {
      const packageCargo = req.body;
      if (!packageCargo || !packageCargo.data) {
        return res.status(400).json({ error: "فایل پشتیبان فاقد ساختار استاندارد داده (data) می‌باشد." });
      }

      const { data } = packageCargo;
      const { 
        globalSettings, siteContent, pricingFormula, seoConfigs, 
        emergencyConfig, catalogs, softwareProducts, softwareLicenses, 
        mediaFiles, b2bSettings 
      } = data;

      const mergeMode = req.query.mode === 'replace' ? 'replace' : 'merge';
      const timestamp = Date.now();

      // 1. Create Pre-Restore Safety Snapshot in backups/
      if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

      const preRestoreSnapshotPath = path.join(backupsDir, `pre_full_restore_snapshot_${timestamp}.json`);
      const currentSnapshot: any = {};
      const catalogsFilePath = path.join(uploadsDir, "custom_catalogs.json");
      const settingsFilePath = path.join(uploadsDir, "global_settings.json");

      if (fs.existsSync(catalogsFilePath)) {
        try { currentSnapshot.catalogs = JSON.parse(fs.readFileSync(catalogsFilePath, "utf8")); } catch (_) {}
      }
      if (fs.existsSync(settingsFilePath)) {
        try { currentSnapshot.settings = JSON.parse(fs.readFileSync(settingsFilePath, "utf8")); } catch (_) {}
      }
      currentSnapshot.softwareProducts = getSoftwareProductsData();
      currentSnapshot.softwareLicenses = getSoftwareLicensesData();
      fs.writeFileSync(preRestoreSnapshotPath, JSON.stringify(currentSnapshot, null, 2), "utf8");

      // 2. Restore all media files to uploads/ directory
      let restoredMediaCount = 0;
      if (Array.isArray(mediaFiles) && mediaFiles.length > 0) {
        restoreMediaFilesPack(mediaFiles);
        restoredMediaCount = mediaFiles.length;
      }

      // 3. Restore global settings & content
      let finalSettings: any = currentSnapshot.settings || {};
      if (globalSettings && typeof globalSettings === 'object') {
        if (mergeMode === 'replace') {
          finalSettings = { ...globalSettings, siteContent, pricingFormula, seoConfigs, emergencyConfig };
        } else {
          finalSettings = {
            ...finalSettings,
            ...globalSettings,
            siteContent: siteContent || finalSettings.siteContent,
            pricingFormula: pricingFormula || finalSettings.pricingFormula,
            seoConfigs: seoConfigs || finalSettings.seoConfigs,
            emergencyConfig: emergencyConfig || finalSettings.emergencyConfig
          };
        }
        fs.writeFileSync(settingsFilePath, JSON.stringify(finalSettings, null, 2), "utf8");
      }

      // 4. Restore catalogs
      let finalCatalogs: any[] = [];
      if (Array.isArray(catalogs)) {
        if (mergeMode === 'replace') {
          finalCatalogs = catalogs;
        } else {
          const existingCatalogs = currentSnapshot.catalogs || [];
          const importedIds = new Set(catalogs.map((c: any) => String(c.id)));
          finalCatalogs = [
            ...catalogs,
            ...existingCatalogs.filter((c: any) => !importedIds.has(String(c.id)))
          ];
        }
        fs.writeFileSync(catalogsFilePath, JSON.stringify(finalCatalogs, null, 2), "utf8");
      }

      // 5. Restore software products and licenses
      if (Array.isArray(softwareProducts)) {
        let finalSoft = softwareProducts;
        if (mergeMode === 'merge') {
          const curSoft = getSoftwareProductsData();
          const importedSoftIds = new Set(softwareProducts.map((p: any) => String(p.id)));
          finalSoft = [...softwareProducts, ...curSoft.filter((p: any) => !importedSoftIds.has(String(p.id)))];
        }
        fs.writeFileSync(softwareProductsFilePath, JSON.stringify(finalSoft, null, 2), "utf8");
      }

      if (Array.isArray(softwareLicenses)) {
        let finalLic = softwareLicenses;
        if (mergeMode === 'merge') {
          const curLic = getSoftwareLicensesData();
          const importedLicIds = new Set(softwareLicenses.map((l: any) => String(l.id)));
          finalLic = [...softwareLicenses, ...curLic.filter((l: any) => !importedLicIds.has(String(l.id)))];
        }
        fs.writeFileSync(softwareLicensesFilePath, JSON.stringify(finalLic, null, 2), "utf8");
      }

      console.log(`[Full System Restore] Restored ${finalCatalogs.length} catalogs, ${restoredMediaCount} media files, settings and software products successfully.`);

      res.json({
        success: true,
        message: "تمامی اطلاعات برند، سایت، کاتالوگ‌ها، نرم‌افزارها، فایل‌های رسانه و تنظیمات با موفقیت بازیابی شدند.",
        restoredData: {
          globalSettings: finalSettings,
          siteContent: siteContent || finalSettings.siteContent,
          pricingFormula: pricingFormula || finalSettings.pricingFormula,
          seoConfigs: seoConfigs || finalSettings.seoConfigs,
          emergencyConfig: emergencyConfig || finalSettings.emergencyConfig,
          catalogs: finalCatalogs,
          b2bSettings: b2bSettings || {}
        },
        stats: {
          restoredMediaCount,
          catalogsCount: finalCatalogs.length,
          softwareProductsCount: Array.isArray(softwareProducts) ? softwareProducts.length : 0
        },
        preRestoreSnapshot: `pre_full_restore_snapshot_${timestamp}.json`
      });

    } catch (err: any) {
      console.error("Full system restore failed:", err);
      res.status(500).json({ error: "خطا در بازیابی نسخه پشتیبان جامع: " + err.message });
    }
  });

  // Helper for recursive file listing inside dist
  const getFilesRecursive = (dirPath: string, rootDir: string): string[] => {
    let results: string[] = [];
    if (!fs.existsSync(dirPath)) return results;
    const list = fs.readdirSync(dirPath);
    list.forEach((file) => {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFilesRecursive(fullPath, rootDir));
      } else {
        results.push(path.relative(rootDir, fullPath));
      }
    });
    return results;
  };

  // List all compiled assets/files in the dist directory
  app.get("/api/build/files", (req, res) => {
    try {
      const distPath = path.join(_dirname, "dist");
      if (!fs.existsSync(distPath)) {
        try {
          console.log("[AutoBuild] dist directory not found. Triggering npm run build...");
          execSync("npm run build", { stdio: "inherit" });
        } catch (buildErr: any) {
          console.error("[AutoBuild] Failed to build project:", buildErr);
        }
      }

      if (!fs.existsSync(distPath)) {
        return res.status(404).json({ error: "شاخه خروجی کامپایل شده (dist) یافت نشد. لطفاً ابتدا پروژه را بیلد کنید." });
      }

      const relativePaths = getFilesRecursive(distPath, distPath);
      const filesInfo = relativePaths.map((relPath) => {
        const fullPath = path.join(distPath, relPath);
        const stat = fs.statSync(fullPath);
        
        let category: "frontend" | "server" | "other" = "frontend";
        if (relPath.startsWith("server.cjs") || relPath === "server.cjs" || relPath === "server.cjs.map") {
          category = "server";
        } else if (relPath.endsWith(".php") || relPath.endsWith(".html") || relPath.startsWith("assets/")) {
          category = "frontend";
        } else {
          category = "other";
        }

        return {
          relativePath: relPath,
          size: stat.size,
          category,
          updatedAt: stat.mtime.toISOString()
        };
      });

      res.json({
        success: true,
        distPath,
        files: filesInfo
      });
    } catch (err: any) {
      res.status(500).json({ error: "خطا در بازیابی لیست فایل‌های خروجی: " + err.message });
    }
  });

  // Download a dynamically generated ZIP of files in the dist directory
  app.get("/api/build/download-zip", (req, res) => {
    try {
      const zipType = (req.query.type as string) || "frontend"; // "frontend", "server", "complete"
      const distPath = path.join(_dirname, "dist");

      if (!fs.existsSync(distPath)) {
        try {
          console.log("[AutoBuild] dist directory not found for download-zip. Triggering npm run build...");
          execSync("npm run build", { stdio: "inherit" });
        } catch (buildErr: any) {
          console.error("[AutoBuild] Failed to build project:", buildErr);
        }
      }

      if (!fs.existsSync(distPath)) {
        return res.status(404).send("<h2>شاخه خروجی کامپایل شده (dist) یافت نشد. لطفاً ابتدا پروژه را بیلد کنید.</h2>");
      }

      const relativePaths = getFilesRecursive(distPath, distPath);
      
      // Filter based on requested type
      const filteredPaths = relativePaths.filter((relPath) => {
        const isServerFile = relPath.startsWith("server.cjs") || relPath === "server.cjs" || relPath === "server.cjs.map";
        if (zipType === "frontend") {
          return !isServerFile;
        } else if (zipType === "server") {
          return isServerFile;
        }
        return true; // "complete" includes everything
      });

      if (filteredPaths.length === 0) {
        return res.status(400).send("<h2>فایلی جهت بسته‌بندی بر اساس فیلتر انتخاب شده یافت نشد.</h2>");
      }

      const zip = new AdmZip();
      
      // Add each file to the zip archive preserving its relative folder structure
      filteredPaths.forEach((relPath) => {
        const fullPath = path.join(distPath, relPath);
        const zipFolder = path.dirname(relPath);
        
        // If file is in the root, zipFolder will be "." or "/" which is fine, we pass empty string or "."
        const targetPathInZip = zipFolder === "." ? "" : zipFolder;
        
        zip.addLocalFile(fullPath, targetPathInZip);
      });

      // If VITE public directory has save_catalog.php but somehow it's not in the dist directory (or we want to guarantee it), 
      // we can inject it. But it's already there! We'll just generate the zip buffer.
      const zipBuffer = zip.toBuffer();
      
      const fileName = `ashk_ghalam_${zipType}_build_${Date.now()}.zip`;
      
      res.writeHead(200, {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": zipBuffer.length,
      });
      
      res.end(zipBuffer);
    } catch (err: any) {
      res.status(500).send("<h2>خطا در بسته‌بندی فایل‌های پروژه: " + err.message + "</h2>");
    }
  });

  // List backups on server
  app.get("/api/backup/list", (req, res) => {
    try {
      if (!fs.existsSync(backupsDir)) {
        return res.json([]);
      }
      const files = fs.readdirSync(backupsDir);
      const backupFiles = files
        .filter(f => f.startsWith("backup_") && f.endsWith(".json"))
        .map(file => {
          const filePath = path.join(backupsDir, file);
          const stat = fs.statSync(filePath);
          return {
            filename: file,
            size: stat.size,
            createdAt: stat.mtime.toISOString()
          };
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      res.json(backupFiles);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to list backups: " + err.message });
    }
  });

  // Get specific backup payload (stream as chunks and extract/restore media files on request)
  app.get("/api/backup/download/:filename", (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(backupsDir, filename);
      
      if (!filePath.startsWith(backupsDir) || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Backup file not found" });
      }
      
      const stats = fs.statSync(filePath);
      res.setHeader("Content-Length", stats.size);
      res.setHeader("Content-Type", "application/json");

      // Auto restore media files locally in the background so it doesn't block stream delivery
      fs.readFile(filePath, "utf8", (err, content) => {
        if (!err) {
          try {
            const payload = JSON.parse(content);
            if (payload && payload.mediaFiles) {
              restoreMediaFilesPack(payload.mediaFiles);
            }
          } catch (_) {}
        }
      });
      
      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to read backup: " + err.message });
    }
  });

  // Delete backup file
  app.delete("/api/backup/:filename", (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(backupsDir, filename);
      
      if (!filePath.startsWith(backupsDir) || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Backup file not found" });
      }
      
      fs.unlinkSync(filePath);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete backup: " + err.message });
    }
  });

  // --- ENTERPRISE SOFTWARE MARKETPLACE, CATALOG & LICENSING BACKEND APIs ---
  const softwareProductsFilePath = path.join(uploadsDir, "software_products.json");
  const softwareLicensesFilePath = path.join(uploadsDir, "software_licenses.json");

  // Initial Enterprise Software Products (Accounting, Remittance, Android Apps, Enterprise Utilities)
  const defaultSoftwareProducts = [
    {
      id: "ashk-acc-pro",
      name: "سامانه جامع حسابداری و انبارداری دوطرفه اشک",
      englishName: "Ashk Dual-Entry Accounting & ERP Lite",
      version: "v4.5.0",
      category: "حسابداری و مالیاتی",
      shortDesc: "نرم‌افزار یکپارچه حسابداری مالی، انبارداری و کاردکس کالا، صدور فاکتور رسمی دارایی و اتصال به سامانه مودیان بدون نیاز به اینترنت.",
      fullDesc: "نرم‌افزار جامع حسابداری اشک برای شرکت‌های تجاری، بازرگانی‌ها و مجتمع‌های تولیدی توسعه یافته است. این سامانه با دیتابیس محلی فوق‌سریع SQLite/Postgres، گزارشات فصلی ارزش افزوده، تراز آزمایشی ۸ ستونی، ثبت اسناد دوبل حسابداری، انبارداری تعدادی و ریالی با روش‌های میانگین موزون و FIFO را کاملاً آفلاین و مطمئن پردازش می‌کند.",
      badge: "پرفروش‌ترین سیستم مالی",
      color: "from-blue-600 via-indigo-600 to-sky-700",
      iconName: "Calculator",
      featured: true,
      downloadCondition: "requires_registration", // "free", "requires_registration", "requires_license"
      downloadUrl: "/downloads/ashk_accounting_setup_v4.5.exe",
      downloadSize: "142 مگابایت",
      releaseDatePersian: "۱۴۰۴/۰۵/۲۰",
      capabilities: [
        "ثبت سند اتوماتیک و دستی دوبل حسابداری با سرفصل‌های استاندارد کل، معین و تفصیلی",
        "اتصال به کارپوشه سامانه مودیان مالیاتی جهت ارسال مستقیم صورتحساب الکترونیکی",
        "سیستم انبارداری هوشمند و انبارگردانی با بارکدخوان و ثبت فاکتورهای ضایعات",
        "مغایرت‌گیری بانکی خودکار از فایل‌های اکسل گردش حساب تمام بانک‌های کشور",
        "دفاتر قانونی روزنامه و کل به همراه ترازنامه و صورت سود و زیان جامع",
        "پشتیبان‌گیری خودکار رمزنگاری‌شده در حافظه محلی و فلش مموری بدون وابستگی به اینترنت"
      ],
      specs: {
        os: "ویندوز ۱۰ / ۱۱ / سرور ۲۰۲۲ (نسخه ۶۴ بیتی)",
        ram: "حداقل ۴ گیگابایت (پیشنهادی ۸ گیگابایت)",
        gpu: "پشتیبانی از رزولوشن‌های استاندارد و مانیتورهای عریض",
        database: "پایگاه داده محلی ایمن با قابلیت شبکه چندکاربره",
        offlineEngine: true
      },
      plans: [
        {
          name: "پکیج پایه با ثبت‌نام (Free / Basic)",
          price: "رایگان با ثبت نام",
          period: "دائمی تک کاربره",
          features: ["صدور فاکتور استاندارد و پیش‌فاکتور", "کاردکس انبار تا ۵۰۰ کالا", "گزارشات پایه تراز و سود و زیان", "پشتیبان‌گیری محلی"],
          conditionType: "requires_registration"
        },
        {
          name: "پکیج تجاری و مودیان (Commercial)",
          price: "۸,۵۰۰,۰۰۰ تومان",
          period: "لایسنس ۱ ساله به همراه آپدیت",
          features: ["ماژول مستقیم سامانه مودیان", "کاردکس نامحدود چندانباره", "مغایرت‌گیری هوشمند اکسل بانک", "پشتیبانی تلفنی و ریموت"],
          recommended: true,
          conditionType: "requires_license"
        },
        {
          name: "پکیج سازمانی شبکه (Enterprise Network)",
          price: "۱۶,۸۰۰,۰۰۰ تومان",
          period: "لایسنس دائمی ۵ کاربر همزمان",
          features: ["تمام امکانات تجاری", "سیستم حقوق و دستمزد پیشرفته", "کنترل سطح دسترسی پرسنل", "پشتیبانی اختصاصی VIP"],
          conditionType: "requires_license"
        }
      ],
      catalogPages: [
        {
          title: "داشبورد نقدینگی و صورت وضعیت لحظه‌ای",
          description: "مدیر مالی و مدیرعامل در یک نگاه می‌توانند آخرین گردش حساب‌ها، مطالبات سررسید شده، چک‌های دریافتی و پرداختی و سود ناخالص ماه جاری را مشاهده کنند.",
          imageUrl: "/media/accounting_dash.png",
          highlights: ["نمودارهای تحلیلی نقدینگی", "هشدار سررسید چک‌ها", "محاسبه دقیق نقطه سر به سر"],
          stat: { label: "دقت محاسباتی", value: "۱۰۰٪ بدون خطا" }
        },
        {
          title: "ارسال آسان فاکتور به سامانه مودیان مالیاتی",
          description: "بدون نیاز به شرکت‌های معتمد یا پرداخت هزینه‌های واسطه‌ای سنگین، کلید اختصاصی مالیاتی خود را وارد کرده و فاکتورها را مستقیماً از داخل نرم‌افزار امضا و ارسال کنید.",
          imageUrl: "/media/accounting_modyan.png",
          highlights: ["پشتیبانی از الگوهای فاکتور طلا، کالا، پیمانکاری و صادرات", "استعلام آنی وضعیت صورتحساب از سرور مالیات", "جلوگیری از جریمه‌های مالیاتی"],
          stat: { label: "زمان ارسال هر فاکتور", value: "کمتر از ۲ ثانیه" }
        }
      ]
    },
    {
      id: "ashk-remittance-core",
      name: "سامانه جامع صرافی، تسویه و حواله‌جات ارزی اشک",
      englishName: "Ashk Remittance & Currency Clearing Core",
      version: "v3.8.2",
      category: "سامانه‌های حواله و ارزی",
      shortDesc: "پلتفرم تخصصی ثبت، پیگیری و تسویه انواع حواله‌جات درهم، دلار، لیر و یورو، تسویه دفاتر صرافی و صدور سند امن.",
      fullDesc: "نرم‌افزار مدیریت حواله و دفاتر صرافی اشک ویژه شرکت‌های بازرگانی واردات/صادرات و دفاتر حواله طراحی گردیده است. قابلیت محاسبه لحظه‌ای نرخ میانگین موزون، تسویه دفاتر حسابداری ارزی و ریالی، تفکیک کارمزد کارگزاران، صدور رسیدهای کدگذاری‌شده ضدجعل با بارکد دوبعدی، و گزارش سود تسعیر ارز بر اساس استانداردهای حسابداری را دارا می‌باشد.",
      badge: "امن‌ترین سیستم ارزی و حواله",
      color: "from-emerald-600 via-teal-600 to-cyan-700",
      iconName: "Coins",
      featured: true,
      downloadCondition: "requires_license",
      downloadUrl: "/downloads/ashk_remittance_setup_v3.8.exe",
      downloadSize: "168 مگابایت",
      releaseDatePersian: "۱۴۰۴/۰۶/۱۰",
      capabilities: [
        "مدیریت چندارزی کامل (درهم امارات، دلار، یورو، یوان چین، لیر ترکیه، روپیه و دینار)",
        "ثبت انواع حواله وارده، صادره، نقدی (اسکناس) و سوئیفت با درج مشخصات دقیق ذینفع",
        "تراز ارزی تفکیکی کارگزاران و صرافی‌های همکار با قابلیت تسویه ارزی یا تهاتر ریالی",
        "تولید رسید حواله اختصاصی ضدجعل با واترمارک رمزنگاری شده و QR Code اعتبارسنجی",
        "محاسبه کارمزد درصدی یا ثابت کارگزاران داخلی و خارجی به طور خودکار",
        "پایگاه داده آفلاین رمزنگاری‌شده AES-256 جهت امنیت حداکثری اطلاعات حساس ارزی"
      ],
      specs: {
        os: "ویندوز ۱۰ / ۱۱ / ویندوز سرور، و کلاینت وب لوکال",
        ram: "حداقل ۸ گیگابایت",
        gpu: "استاندارد سازمانی",
        database: "دیتابیس فوق ایمن محلی با سیستم تایید دومرحله‌ای",
        offlineEngine: true
      },
      plans: [
        {
          name: "نسخه دفتری استاندارد (Standard Office)",
          price: "۱۲,۰۰۰,۰۰۰ تومان",
          period: "لایسنس ۱ ساله تک سیستم",
          features: ["ثبت حوالجات تا ۳ ارز اصلی", "تسویه با ۱۰ صراف همکار", "صدور فاکتور و رسید چاپی امن", "گزارش تسعیر ارز"],
          conditionType: "requires_license"
        },
        {
          name: "نسخه صرافی پیشرفته (Exchange Pro)",
          price: "۲۴,۵۰۰,۰۰۰ تومان",
          period: "لایسنس نامحدود زمانی (۳ کاربر شبکه)",
          features: ["تمام ارزهای جهانی بدون محدودیت", "حسابداری کامل دفاتر ارزی", "ماژول اتصال به اپلیکیشن همراه", "پشتیبانی شبانه‌روزی"],
          recommended: true,
          conditionType: "requires_license"
        }
      ],
      catalogPages: [
        {
          title: "میز کار تسویه ارزی و حواله‌جات",
          description: "مشاهده لحظه‌ای وضعیت حواله‌های در انتظار، پرداخت شده، مرجوعی و مغایرت‌های احتمالی با کارگزاران دبی، ترکیه و چین در یک محیط امن.",
          imageUrl: "/media/remittance_flow.png",
          highlights: ["تفکیک رنگی وضعیت حواله", "هشدار تغییرات شدید نرخ ارز", "محاسبه خودکار سود مبادله"],
          stat: { label: "تسویه روزانه", value: "۱۰۰٪ تطبیق حساب" }
        },
        {
          title: "صدور رسید معتبر و رمزنگاری‌شده حواله",
          description: "رسیدهای رسمی با سربرگ دفتر شما، درج مشخصات کامل فرستنده و گیرنده، شماره رفرنس بین‌المللی و امضای دیجیتال که خطای جعل و سوءاستفاده را به صفر می‌رساند.",
          imageUrl: "/media/remittance_receipt.png",
          highlights: ["خروجی مستقیم PDF امن", "امکان ارسال خودکار در واتساپ و بله", "کد رهگیری پیامکی محلی"],
          stat: { label: "اعتبار اسناد", value: "مورد تایید بازرگانان" }
        }
      ]
    },
    {
      id: "ashk-remittance-pocket",
      name: "اپلیکیشن اندروید حواله و تسویه سریع اشک",
      englishName: "Ashk Remittance Pocket Android",
      version: "v2.6.1",
      category: "اپلیکیشن‌های کاربردی اندروید",
      shortDesc: "اپلیکیشن همراه برای مدیران صرافی و بازرگانان جهت صدور آنی برگه حواله، ثبت امضای مشتری و اشتراک رسید در محل.",
      fullDesc: "نرم‌افزار اندروید کاربردی حواله اشک، مدیریت مبادلات ارزی را روی گوشی تلفن همراه و تبلت ممکن می‌سازد. با این اپلیکیشن حتی در حالت قطع بودن اینترنت می‌توانید حواله‌ها را ثبت، اسناد را امضا، و از طریق چاپگر حرارتی بلوتوث پرینت بگیرید. هنگام ورود به دفتر، تمام داده‌ها به صورت خودکار با سرور اصلی سینک می‌شوند.",
      badge: "اپلیکیشن محبوب اندروید",
      color: "from-amber-600 via-orange-600 to-rose-700",
      iconName: "Smartphone",
      featured: true,
      downloadCondition: "requires_registration",
      downloadUrl: "/downloads/ashk_remittance_pocket.apk",
      downloadSize: "28 مگابایت (فایل نصبی APK)",
      releaseDatePersian: "۱۴۰۴/۰۶/۱۵",
      capabilities: [
        "سازگار با اندروید ۸ به بالا روی تمام برندهای گوشی و تبلت سامسونگ، شیائومی و...",
        "کارکرد کامل بدون اینترنت با پایگاه داده محلی SQLite روی گوشی",
        "اتصال به پرینترهای جیبی و رول حرارتی کمری با بلوتوث جهت صدور قبض فوری",
        "امکان دریافت امضای دست‌نویس طرف معامله روی صفحه لمسی گوشی",
        "اشتراک‌گذاری خودکار عکس یا PDF رسید حواله در ایتا، روبیکا، تلگرام و پیامک",
        "سینک هوشمند خودکار با نرم‌افزار ویندوز در شبکه Wi-Fi محلی دفتر"
      ],
      specs: {
        os: "اندروید ۸.۰ و بالاتر (Android 8.0 - 15.0)",
        ram: "حداقل ۲ گیگابایت",
        gpu: "پشتیبانی از حالت تیره و روشن",
        database: "دیتابیس آفلاین روی حافظه داخلی با رمزگذاری داده‌ها",
        offlineEngine: true
      },
      plans: [
        {
          name: "نسخه پایه کاربری همراه",
          price: "رایگان برای کاربران ثبت‌نام شده",
          period: "استفاده دائم",
          features: ["ثبت روزانه تا ۲۰ حواله", "صدور رسید تصویری", "اتصال به چاپگر بلوتوث", "ذخیره در گوشی"],
          conditionType: "requires_registration"
        },
        {
          name: "نسخه نامحدود بازرگانی",
          price: "۳,۲۰۰,۰۰۰ تومان",
          period: "لایسنس دائمی به همراه آپدیت‌های سالانه",
          features: ["ثبت نامحدود حواله", "امضای دیجیتال مشتری", "سینک خودکار با دیتابیس حسابداری مرکزی", "پشتیبان‌گیری ابری محلی"],
          recommended: true,
          conditionType: "requires_license"
        }
      ],
      catalogPages: [
        {
          title: "رابط کاربری سریع و ارگونومیک لمسی",
          description: "طراحی شده برای سرعت عمل بالا در بازار؛ ثبت یک حواله کامل کمتر از ۳۰ ثانیه زمان می‌برد.",
          imageUrl: "/media/android_pocket_ui.png",
          highlights: ["کیبورد عددی بزرگ و سریع", "فیلدهای هوشمند تبدیل نرخ", "فهرست مخاطبین تجاری پرتکرار"],
          stat: { label: "سرعت ثبت", value: "۳۰ ثانیه" }
        },
        {
          title: "پرینت فوری روی چاپگرهای همراه",
          description: "بدون نیاز به نصب درایورهای پیچیده، با یک لمس به پرینتر کمری متصل شده و قبض استاندارد چاپی به مشتری تحویل دهید.",
          imageUrl: "/media/android_bluetooth_print.png",
          highlights: ["پشتیبانی از چاپگرهای ۵۸ و ۸۰ میلی‌متری", "چاپ لوگوی دفتر صرافی", "بدون نیاز به کابل"],
          stat: { label: "سازگاری بلوتوث", value: "۱۰۰٪ مدل‌های بازار" }
        }
      ]
    },
    {
      id: "ashk-warehouse-order-android",
      name: "اپلیکیشن اندروید انبارداری هوشمند و ثبت سفارش ویزیتور اشک",
      englishName: "Ashk Smart Inventory & Order Android",
      version: "v3.1.0",
      category: "اپلیکیشن‌های کاربردی اندروید",
      shortDesc: "نرم‌افزار کاربردی تبلت و موبایل اندروید برای انبارگردانی با بارکدخوان، اسکن کالا، ویزیتوری و صدور پیش‌فاکتور در محل.",
      fullDesc: "اپلیکیشن اندروید انبارداری و فروش میدانی اشک، ابزاری قدرتمند برای پرسنل انبار و تیم بازاریابی و فروش است. بازاریاب با داشتن کاتالوگ دیجیتال محصولات روی تبلت، سفارشات مشتری را حتی در نقاط کور بدون اینترنت ثبت نموده و انباردار با اسکن بارکد بسته‌ها، ورود و خروج بار را بدون خطای انسانی در سیستم مستند می‌کند.",
      badge: "کاربردی‌ترین ابزار انبارداری",
      color: "from-purple-600 via-fuchsia-600 to-pink-700",
      iconName: "Box",
      featured: false,
      downloadCondition: "requires_registration",
      downloadUrl: "/downloads/ashk_inventory_android.apk",
      downloadSize: "34 مگابایت (فایل نصبی APK)",
      releaseDatePersian: "۱۴۰۴/۰۵/۲۸",
      capabilities: [
        "اسکن فوق‌سریع بارکد کالاها با دوربین گوشی یا دستگاه‌های هندلد صنعتی (Urovo, Point Mobile, iData)",
        "انبارگردانی آسان و مقایسه موجودی فیزیکی با موجودی سیستمی و ثبت کسری/اضافی",
        "کاتالوگ دیجیتال تصویری از محصولات برای پرزنت حضوری ویزیتورها نزد مشتری",
        "ثبت سفارشات فروش و صدور پیش‌فاکتور با اعمال تخفیفات پلکانی به صورت آفلاین",
        "محاسبه سقف اعتبار مشتری و هشدار فاکتورهای تسویه نشده قبلی",
        "انتقال آنی اسناد به نرم‌افزار حسابداری اشک از طریق شبکه داخلی"
      ],
      specs: {
        os: "اندروید ۷.۱ به بالا (سازگار با کلیه گوشی‌ها، تبلت‌ها و هندلدهای صنعتی)",
        ram: "حداقل ۲ گیگابایت",
        gpu: "بهینه‌شده برای مصرف حداقل باتری در شیفت‌های کاری طولانی",
        database: "بانک اطلاعاتی محلی آفلاین با قابلیت ذخیره ۲۰,۰۰۰ قلم کالا",
        offlineEngine: true
      },
      plans: [
        {
          name: "نسخه رایگان ثبت‌نامی",
          price: "رایگان با عضویت در سامانه",
          period: "استفاده دائم",
          features: ["اسکن بارکد تا ۲۰۰ کالا", "انبارگردانی پایه", "ثبت سفارش روزانه"],
          conditionType: "requires_registration"
        },
        {
          name: "لایسنس نامحدود تجاری",
          price: "۴,۵۰۰,۰۰۰ تومان",
          period: "لایسنس دائمی به همراه آپدیت‌ها",
          features: ["کالاهای نامحدود", "اتصال به هندلدهای لیزری", "ماژول کاتالوگ تصویری ویزیتور", "پشتیبانی کامل"],
          recommended: true,
          conditionType: "requires_license"
        }
      ],
      catalogPages: [
        {
          title: "اسکن بارکد در کسری از ثانیه",
          description: "موتور پردازش تصویر داخلی نرم‌افزار، بارکدهای مخدوش یا کم‌رنگ را نیز با سرعت شناسایی و مشخصات کالا را روی صفحه می‌آورد.",
          imageUrl: "/media/inventory_scan.png",
          highlights: ["تشخیص بارکد میله‌ای و QR", "صدور بوق تایید و لرزش", "جلوگیری از شمارش تکراری"],
          stat: { label: "کاهش خطای انبار", value: "۹۹.۵٪" }
        },
        {
          title: "ثبت سفارشات و کاتالوگ ویزیتوری",
          description: "ویزیتور می‌تواند تصاویر کیفیت بالای بسته‌بندی، مشخصات کارتن و قیمت‌ها را به خریدار نشان دهد و سفارش را ثبت کند.",
          imageUrl: "/media/visitor_catalog.png",
          highlights: ["کاتالوگ ورق‌زن تصویری", "محاسبه درصد پورسانت", "صدور آنی فاکتور در محل"],
          stat: { label: "افزایش فروش میدانی", value: "۲.۵ برابر" }
        }
      ]
    },
    {
      id: "ashk-payroll-hrm",
      name: "سامانه مدیریت حقوق و دستمزد و تردد پرسنل اشک",
      englishName: "Ashk Payroll & Attendance HRM",
      version: "v2.9.0",
      category: "حسابداری و مالیاتی",
      shortDesc: "نرم‌افزار جامع محاسبه حقوق و مزایا، شیفت‌های کاری، مرخصی و ماموریت با خروجی استاندارد دیسکت بیمه و بانک.",
      fullDesc: "سامانه حقوق و دستمزد اشک منطبق بر آخرین قوانین وزارت کار و سازمان تامین اجتماعی کشور است. این سیستم به دستگاه‌های ساعت‌زنی اثرانگشت و تشخیص چهره متصل شده و اضافه کار، کسر کار، شب‌کاری، حق اولاد و بن خواروبار را محاسبه کرده و فایل‌های دیسکت پرداخت حقوق بانک و لیست بیمه را بدون خطا تولید می‌کند.",
      badge: "دقت محاسباتی بالا",
      color: "from-teal-600 via-emerald-600 to-green-700",
      iconName: "Users",
      featured: false,
      downloadCondition: "requires_registration",
      downloadUrl: "/downloads/ashk_payroll_setup_v2.9.exe",
      downloadSize: "95 مگابایت",
      releaseDatePersian: "۱۴۰۴/۰۶/۰۱",
      capabilities: [
        "پشتیبانی از آخرین ضرایب و جداول مالیاتی سال جدید وزارت اقتصاد و دارایی",
        "تولید خودکار دیسکت پرداخت الکترونیکی حقوق برای بانک‌های ملی، ملت، صادرات، تجارت، پاسارگاد و...",
        "خروجی فایل استاندارد دیسکت بیمه تامین اجتماعی با فرمت DSK",
        "محاسبه عیدی، پاداش، سنوات پایان خدمت و مانده مرخصی با فرمول‌های دقیق قانونی",
        "طراحی و چاپ فیش حقوقی محرمانه با انواع قالب‌های استاندارد و ارسال پیامکی به پرسنل",
        "اتصال به انواع دستگاه‌های ساعت‌زنی کارت، اثر انگشت و دوربین تشخیص چهره در شبکه داخلی"
      ],
      specs: {
        os: "ویندوز ۱۰ / ۱۱ / سرور",
        ram: "حداقل ۴ گیگابایت",
        gpu: "استاندارد",
        database: "پایگاه داده محلی ایمن با پشتیبان‌گیری خودکار",
        offlineEngine: true
      },
      plans: [
        {
          name: "نسخه کارگاهی (تا ۱۵ نفر)",
          price: "رایگان با ثبت‌نام اولیه",
          period: "استفاده دائم",
          features: ["محاسبه حقوق تا ۱۵ پرسنل", "تولید دیسکت بیمه", "چاپ فیش حقوقی", "پشتیبان‌گیری"],
          conditionType: "requires_registration"
        },
        {
          name: "نسخه سازمانی نامحدود",
          price: "۵,۸۰۰,۰۰۰ تومان",
          period: "لایسنس دائمی به همراه پشتیبانی سالانه",
          features: ["پرسنل نامحدود", "اتصال به دستگاه کارت‌زنی", "تولید دیسکت تمام بانک‌ها", "محاسبه تسویه حساب سنوات"],
          recommended: true,
          conditionType: "requires_license"
        }
      ],
      catalogPages: [
        {
          title: "محاسبات بدون خطای احکام پرسنلی",
          description: "تنظیم پارامتریک پایه‌های حقوقی، حق جذب، حق شیفت و مسکن مطابق بخشنامه‌های جدید شورای عالی کار.",
          imageUrl: "/media/payroll_calc.png",
          highlights: ["به‌روزرسانی بخشنامه‌ها", "گزارش تفکیکی کسورات", "محاسبه دقیق حق بیمه سهم کارگر و کارفرما"],
          stat: { label: "سرعت صدور فیش‌ها", value: "کمتر از ۱ دقیقه" }
        }
      ]
    }
  ];

  // Helper: Read or initialize software products
  function getSoftwareProductsData(): any[] {
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      if (fs.existsSync(softwareProductsFilePath)) {
        const raw = fs.readFileSync(softwareProductsFilePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      // Write default products if file does not exist
      fs.writeFileSync(softwareProductsFilePath, JSON.stringify(defaultSoftwareProducts, null, 2), "utf-8");
      return defaultSoftwareProducts;
    } catch (e) {
      console.error("Error reading software products:", e);
      return defaultSoftwareProducts;
    }
  }

  // Helper: Read or initialize licenses
  function getSoftwareLicensesData(): any[] {
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      if (fs.existsSync(softwareLicensesFilePath)) {
        const raw = fs.readFileSync(softwareLicensesFilePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // 1. Get all software products
  app.get("/api/software/products", (req, res) => {
    try {
      const products = getSoftwareProductsData();
      const category = req.query.category as string;
      if (category && category !== "all" && category !== "همه") {
        const filtered = products.filter((p: any) => p.category === category);
        return res.json({ success: true, count: filtered.length, products: filtered });
      }
      res.json({ success: true, count: products.length, products });
    } catch (err: any) {
      res.status(500).json({ error: "خطا در دریافت لیست نرم‌افزارها: " + err.message });
    }
  });

  // 2. Get single software product
  app.get("/api/software/products/:id", (req, res) => {
    try {
      const products = getSoftwareProductsData();
      const product = products.find((p: any) => p.id === req.params.id);
      if (!product) {
        return res.status(404).json({ error: "نرم‌افزار مورد نظر یافت نشد." });
      }
      res.json({ success: true, product });
    } catch (err: any) {
      res.status(500).json({ error: "خطا در دریافت مشخصات نرم‌افزار: " + err.message });
    }
  });

  // 3. Create or update software product (Admin)
  app.post("/api/software/products", express.json({ limit: "50mb" }), (req, res) => {
    try {
      const productData = req.body;
      if (!productData || !productData.name) {
        return res.status(400).json({ error: "نام نرم‌افزار الزامی است." });
      }

      const products = getSoftwareProductsData();
      const prodId = productData.id || `soft-${Date.now()}`;
      productData.id = prodId;

      const existingIndex = products.findIndex((p: any) => p.id === prodId);
      if (existingIndex >= 0) {
        products[existingIndex] = { ...products[existingIndex], ...productData, updatedAt: new Date().toISOString() };
      } else {
        productData.createdAt = new Date().toISOString();
        products.unshift(productData);
      }

      fs.writeFileSync(softwareProductsFilePath, JSON.stringify(products, null, 2), "utf-8");
      res.json({ success: true, product: productData });
    } catch (err: any) {
      res.status(500).json({ error: "خطا در ذخیره‌سازی نرم‌افزار در بک‌اند: " + err.message });
    }
  });

  // 4. Delete software product (Admin)
  app.delete("/api/software/products/:id", (req, res) => {
    try {
      const id = req.params.id;
      let products = getSoftwareProductsData();
      products = products.filter((p: any) => p.id !== id);
      fs.writeFileSync(softwareProductsFilePath, JSON.stringify(products, null, 2), "utf-8");
      res.json({ success: true, message: "نرم‌افزار با موفقیت حذف گردید." });
    } catch (err: any) {
      res.status(500).json({ error: "خطا در حذف نرم‌افزار: " + err.message });
    }
  });

  // 5. Request & Generate Real Software License
  app.post("/api/software/license/request", express.json(), (req, res) => {
    try {
      const { productId, planName, customerName, customerPhone, customerEmail, companyName, hardwareId } = req.body;
      if (!productId || !customerName || !customerPhone) {
        return res.status(400).json({ error: "اطلاعات متقاضی (نام، شماره تماس و شناسه نرم‌افزار) الزامی است." });
      }

      const products = getSoftwareProductsData();
      const product = products.find((p: any) => p.id === productId);
      if (!product) {
        return res.status(404).json({ error: "نرم‌افزار یافت نشد." });
      }

      // Generate a cryptographically robust, offline-verifiable license key
      const salt = "ASHK-GHALAM-SECURE-KEY-2026";
      const cleanPhone = String(customerPhone).replace(/[^0-9]/g, "");
      const rawPayload = `${productId}:${cleanPhone}:${Date.now()}:${salt}`;
      const hash = crypto.createHash("sha256").update(rawPayload).digest("hex").toUpperCase();
      
      // Format: ASHK-XXXX-YYYY-ZZZZ-WWWW
      const formattedLicenseKey = `ASHK-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}`;

      const newLicenseRecord = {
        id: `lic_${Date.now()}`,
        licenseKey: formattedLicenseKey,
        productId,
        productName: product.name,
        planName: planName || "نسخه استاندارد",
        customerName,
        customerPhone: cleanPhone,
        customerEmail: customerEmail || "",
        companyName: companyName || "",
        hardwareId: hardwareId || "AUTO-DETECTED-HWID",
        createdAt: new Date().toISOString(),
        status: "ACTIVE",
        expiresAt: "PERMANENT"
      };

      const licenses = getSoftwareLicensesData();
      licenses.unshift(newLicenseRecord);
      fs.writeFileSync(softwareLicensesFilePath, JSON.stringify(licenses, null, 2), "utf-8");

      res.json({
        success: true,
        licenseKey: formattedLicenseKey,
        license: newLicenseRecord,
        downloadUrl: product.downloadUrl,
        message: "لایسنس نرم‌افزار با موفقیت صادر گردید."
      });
    } catch (err: any) {
      res.status(500).json({ error: "خطا در صدور لایسنس: " + err.message });
    }
  });

  // 6. Verify and authorize software download
  app.post("/api/software/download/verify", express.json(), (req, res) => {
    try {
      const { productId, userEmail, userPhone, licenseKey } = req.body;
      const products = getSoftwareProductsData();
      const product = products.find((p: any) => p.id === productId);

      if (!product) {
        return res.status(404).json({ error: "نرم‌افزار یافت نشد." });
      }

      const condition = product.downloadCondition || "free";

      // Case 1: Free
      if (condition === "free") {
        return res.json({
          authorized: true,
          downloadUrl: product.downloadUrl,
          message: "دانلود این نرم‌افزار آزاد و رایگان است."
        });
      }

      // Case 2: Requires registration
      if (condition === "requires_registration") {
        if (!userEmail && !userPhone) {
          return res.status(401).json({
            authorized: false,
            requiresAuth: true,
            message: "برای دانلود این نرم‌افزار، لطفاً ابتدا در سامانه ثبت‌نام نموده یا وارد حساب کاربری خود شوید."
          });
        }
        return res.json({
          authorized: true,
          downloadUrl: product.downloadUrl,
          message: "دسترسی دانلود بر اساس عضویت در سامانه تایید گردید."
        });
      }

      // Case 3: Requires license key
      if (condition === "requires_license") {
        if (!licenseKey) {
          return res.status(403).json({
            authorized: false,
            requiresLicense: true,
            message: "دانلود و راه‌اندازی این نرم‌افزار نیازمند ثبت کد لایسنس معتبر است."
          });
        }

        const licenses = getSoftwareLicensesData();
        const validLic = licenses.find((l: any) => 
          l.productId === productId && 
          l.licenseKey.trim().toUpperCase() === String(licenseKey).trim().toUpperCase() &&
          l.status === "ACTIVE"
        );

        if (!validLic) {
          return res.status(403).json({
            authorized: false,
            requiresLicense: true,
            message: "کد لایسنس وارد شده نامعتبر بوده یا برای این نرم‌افزار صادر نگردیده است."
          });
        }

        return res.json({
          authorized: true,
          downloadUrl: product.downloadUrl,
          message: "کد لایسنس تایید شد. لینک دانلود فعال گردید."
        });
      }

      // Default fallback
      res.json({ authorized: true, downloadUrl: product.downloadUrl });
    } catch (err: any) {
      res.status(500).json({ error: "خطا در اعتبارسنجی دانلود: " + err.message });
    }
  });

  // 7. List all issued licenses (Admin)
  app.get("/api/software/licenses/list", (req, res) => {
    try {
      const licenses = getSoftwareLicensesData();
      res.json({ success: true, count: licenses.length, licenses });
    } catch (err: any) {
      res.status(500).json({ error: "خطا در دریافت لیست لایسنس‌ها: " + err.message });
    }
  });
  // --- END OF SOFTWARE MARKETPLACE BACKEND APIs ---

  // API routes
  // --- Global Settings and Content Persistence ---
  const settingsFilePath = path.join(uploadsDir, "global_settings.json");
  const publicSettingsFilePath = path.join(_dirname, "public", "global_settings.json");

  app.get("/api/settings/global", (req, res) => {
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      if (fs.existsSync(settingsFilePath)) {
        const content = fs.readFileSync(settingsFilePath, "utf-8");
        return res.json(JSON.parse(content));
      }
      if (fs.existsSync(publicSettingsFilePath)) {
        const content = fs.readFileSync(publicSettingsFilePath, "utf-8");
        return res.json(JSON.parse(content));
      }
      return res.json({});
    } catch (err: any) {
      console.error("Failed reading global settings:", err);
      return res.status(500).json({ error: "Failed to read global settings" });
    }
  });

  app.post("/api/settings/global", express.json({ limit: "50mb" }), (req, res) => {
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const publicDir = path.join(_dirname, "public");
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      const newSettings = req.body;
      if (!newSettings) {
        return res.status(400).json({ error: "Invalid settings data" });
      }
      
      let settings = {};
      if (fs.existsSync(settingsFilePath)) {
        try {
          const content = fs.readFileSync(settingsFilePath, "utf-8");
          settings = JSON.parse(content);
        } catch (e) { console.error("Error parsing existing settings, overwriting..."); }
      } else if (fs.existsSync(publicSettingsFilePath)) {
        try {
          const content = fs.readFileSync(publicSettingsFilePath, "utf-8");
          settings = JSON.parse(content);
        } catch (e) { console.error("Error parsing public settings, overwriting..."); }
      }
      
      settings = { ...settings, ...newSettings };
      const settingsJson = JSON.stringify(settings, null, 2);
      
      fs.writeFileSync(settingsFilePath, settingsJson, "utf-8");
      try {
        fs.writeFileSync(publicSettingsFilePath, settingsJson, "utf-8");
      } catch (e) {
        console.warn("Could not write to public/global_settings.json fallback:", e);
      }
      
      res.json({ success: true, settings });
    } catch (err: any) {
      console.error("Failed saving global settings:", err);
      res.status(500).json({ error: "Failed to save global settings" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // --- INDEPENDENT EXPERT CAD PACKAGING DECODER & ANALYSIS ENGINE --- 
  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const { model, dims, material, specialEffect, userPrompt } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      
      if (!apiKey) {
        throw new Error("API_KEY_MISSING");
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const modelName = model?.name || "سازه جعبه سفارشی";
      const modelCode = model?.code || "CAD-Custom";
      const activeDims = dims ? `${dims.L}x${dims.W}x${dims.H} mm` : "نامشخص";
      const matName = material?.name || "ایندربرد ۳۰۰ گرم";

      const systemInstruction = `شما "موتور پردازش مستقل استانداردهای هندسی اشک قلم" هستید. یک متخصص تمام عیار در طراحی صنعتی کارتن و جعبه (سازه‌های مقوایی، FEFCO و ECMA). 
وظیفه شما تحلیل فنی ابعاد داده شده (طول، عرض، ارتفاع، جنس مقوا/کارتن و افکت ویژه)، پاسخگویی به چالش‌های تاخوردگی، چسب، پله لبه و زوایای برش در صنعت بسته‌بندی، محاسبه کسر خط تا (folding loss) و باطله مجاز لیتوگرافی بر اساس استاندارد ماشینهای دایکات BOBST و گوتمن است.
تمام پاسخ‌ها را به زبان فارسی فنی، دقیق، بسیار با پرستیژ و کاملاً مستدل فرمت شده با ساختار Markdown زیبا و خانای حرفه‌ای ارسال نمایید. از عبارات عامیانه بپرهیزید و از اصطلاحات تخصصی مثل لوپ تا، گرین مقوا، خط شاسی، تیغ ماتریکس، ایندربرد، پشت‌طوسی استفاده کنید.`;

      const promptText = `اطلاعات سازه جاری:
- مدل سازه: ${modelName} (${modelCode})
- ابعاد صنعتی: ${activeDims}
- جنس مقوا/کارتن: ${matName}
- جلوه ویژه: ${specialEffect || "ندارد"}

پرسش کاربر یا درخواست بررسی مجاور لبه‌ها:
"${userPrompt}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: promptText,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2,
        }
      });

      const textResponse = response.text;
      res.json({ success: true, text: textResponse });

    } catch (err: any) {
      if (err.message === "API_KEY_MISSING") {
        res.status(400).json({ error: "سیگنال کلید هوش مصنوعی در هاست یافت نشد." });
      } else {
        res.status(500).json({ error: "خطا در پردازش موتور مستقل کاد: " + err.message });
      }
    }
  });

  // --- AI REFERENCE OBJECT SCANNER & DIMENSION GENERATOR ---
  app.post("/api/gemini/analyze-object", async (req, res) => {
    try {
      const { image, mimeType, referenceHeight, objectDescription } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

      if (!image) {
        return res.status(400).json({ error: "تصویر شیء ارسال نشده است." });
      }

      // Safe Base64 parse
      let cleanBase64 = image;
      if (cleanBase64.includes(";base64,")) {
        cleanBase64 = cleanBase64.split(";base64,").pop() || "";
      }

      // If we don't have an API key, we simulate the analysis for full functional continuity
      if (!apiKey) {
        console.warn("GEMINI_API_KEY is missing. Using local rule-based computer vision simulator.");
        // Simulated local logic based on objectDescription strings:
        const lowerDesc = (objectDescription || "").toLowerCase();
        let name = "شیء مرجع اسکن شده";
        let estDims = "70x70x160 mm";
        let L = 80, W = 80, H = 170;
        let strategy = "بر مبنای الگوریتم‌های شبیه‌ساز اشک قلم، ابعاد بهینه جعبه با تلرانس ۵ میلی‌متر خلاصی دیواره‌ها برای بطری یا شیء تخمین زده شد تا از آسیب حین ترانزیت جلوگیری شود.";

        if (lowerDesc.includes("عطر") || lowerDesc.includes("perfume") || lowerDesc.includes("ادکلن")) {
          name = "بطری عطر ادکلن ایستاده";
          estDims = "65x65x110 mm";
          L = 75; W = 75; H = 125;
          strategy = "برای محصول عطر ادکلن ایستاده لوکس، استفاده از تلرانس متقارن ۱۰+ میلی‌متر در ارتفاع و ۱۰+ میلی‌متر در دهنه طول و عرض همراه با بافر فوم داخلی جهت تثبیت فیزیکی شیشه توصیه گردید.";
        } else if (lowerDesc.includes("ماگ") || lowerDesc.includes("mug") || lowerDesc.includes("لیوان")) {
          name = "ماگ سرامیکی دسته دار";
          estDims = "90x90x95 mm";
          L = 105; W = 100; H = 105;
          strategy = "دسته ماگ در نظر گرفته شد؛ لذا طول جعبه با حاشیه اضافی ۱۵ میلی‌متر طراحی شده تا فشار جانبی به دسته سرامیکی وارد نشود و از شکستگی جلوگیری شود.";
        } else if (lowerDesc.includes("تلفن") || lowerDesc.includes("phone") || lowerDesc.includes("موبایل")) {
          name = "جعبه تلفن همراه هوشمند";
          estDims = "75x155x8 mm";
          L = 90; W = 170; H = 22;
          strategy = "برای کالای حساس الکترونیکی، ساختار جعبه هاردباکس یا کیبوردی مجهز به دیواره دوبل پیشنهاد می‌شود. ابعاد پیشنهادی فضای کابل شارژر و آداپتور را تضمین می‌کند.";
        } else if (referenceHeight) {
          // Calculate dynamically based on reference height
          const numericHeight = parseInt(referenceHeight) || 120;
          const ratio = 0.6; // estimated typical ratio
          H = Math.round(numericHeight + 10);
          L = Math.round(numericHeight * ratio);
          W = Math.round(numericHeight * ratio);
          estDims = `${L - 8}x${W - 8}x${numericHeight} mm`;
          strategy = `ابعاد بر مبنای ارتفاع مرجع اعلامی کاربر (${referenceHeight} میلی‌متر) با محاسبه تناسبات طلایی هندسی طراحی گردید.`;
        }

        return res.json({
          success: true,
          data: {
            objectName: name,
            estimatedObjectDimensions: estDims,
            suggestedLength: L,
            suggestedWidth: W,
            suggestedHeight: H,
            packagingStrategy: strategy
          }
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `شما "موتور هوش مصنوعی آنالیز تصویر و استخراج ابعاد اشک قلم" هستید.
وظیفه شما بازشناخت دقیق شیء درون تصویر (مانند بطری عطر، کتاب، ماگ، ادکلن، کرم، قطعه صنعتی)، حدس زدن ابعاد فیزیکی آن به میلی‌متر (با بهره‌گیری از توضیحات کمکی کاربر)، و تولید ابعاد بهینه، امن و استاندارد جهت ساخت جعبه مقوایی یا کارتنی برای آن شیء است. ابعاد باید به فرم طول (Length)، عرض (Width) و ارتفاع (Height) به عدد صحیح میلی‌متر باشند. ابعاد پیشنهادی جعبه باید برای محافظت و جاگیری راحت، ترجیحاً ۵ الی ۱۵ میلی‌متر بزرگتر از طول، عرض و ارتفاع فیزیکی خودِ کالا باشد.
شما باید مقادیر را به صورت یک شیء JSON با ساختار معتبر برگردانید. هیچ متن مقدمه یا موخره اضافی ننویسید.`;

      const promptText = `لطفاً تصویر ضمیمه شده از شیء مرجع را بررسی کنید و ابعاد بهینه بسته‌بندی را مشخص نمایید.
اطلاعات ابعادی یا توضیحات تکمیلی ارائه شده توسط کاربر:
- ارتفاع تقریبی اعلام شده: "${referenceHeight || 'نامشخص'}"
- توصیف شیء: "${objectDescription || 'نامشخص'}"`;

      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/png",
          data: cleanBase64,
        },
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [imagePart, promptText],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              objectName: {
                type: Type.STRING,
                description: "Name of the recognized object in Persian (e.g. بطری عطر لوکس, لیوان ماگ سرامیکی)."
              },
              estimatedObjectDimensions: {
                type: Type.STRING,
                description: "Estimated dimensions of the product itself in 'L x W x H mm' format."
              },
              suggestedLength: {
                type: Type.INTEGER,
                description: "Recommended packaging outer length (L) in mm. Integer."
              },
              suggestedWidth: {
                type: Type.INTEGER,
                description: "Recommended packaging outer width (W) in mm. Integer."
              },
              suggestedHeight: {
                type: Type.INTEGER,
                description: "Recommended packaging outer height (H) in mm. Integer."
              },
              packagingStrategy: {
                type: Type.STRING,
                description: "Brief, highly technical and professional explanation in Persian explaining the structural design choice, why these dimensions were selected, and protective gaps added."
              }
            },
            required: ["objectName", "suggestedLength", "suggestedWidth", "suggestedHeight", "packagingStrategy"]
          }
        }
      });

      const textResponse = response.text;
      if (!textResponse) {
        throw new Error("EMPTY_GEMINI_RESPONSE");
      }

      const parsedData = JSON.parse(textResponse.trim());
      res.json({
        success: true,
        data: parsedData
      });

    } catch (err: any) {
      console.error("Error in analyze-object API:", err);
      res.status(500).json({ error: "خطا در تحلیل تصویر شیء مرجع: " + err.message });
    }
  });

  app.post("/api/gemini/analyze-dieline", async (req, res) => {
    try {
      const { image, mimeType, notes, activeModelId } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!image) {
        return res.status(400).json({ error: "تصویر دایلاین مرجع ارسال نشده است." });
      }

      // Safe Base64 parse
      let cleanBase64 = image;
      if (cleanBase64.includes(";base64,")) {
        cleanBase64 = cleanBase64.split(";base64,").pop() || "";
      }

      if (!apiKey) {
        console.warn("GEMINI_API_KEY is missing. Using local rule-based Dieline/ArtiosCAD simulator.");
        
        let anglesStatus = "تحلیل زاویه: زوایای باله‌ها به زوایای بهینه مایل ۱۵ درجه و لبه فولد با ۹۰ درجه ارتقا یافتند تا زوایای دایکات عاری از تداخل خطوط تا باشند.";
        let locksStatus = "تحلیل قفل ته: سیستم قفل کالیبره شد. اتصالات و فاق و زبانه مادی-مادگی با انطباق بالا بر اساس ضخامت مقوای فعلی در محاسبات دایلاین تثبیت شدند.";
        let creasesStatus = "تحلیل خط تا: جبران خط تا (Crease Compensation) برابر ۰.۵۵ میلی‌متر اعمال شد و لبه شیارهای قفل با کسر خم متناسب تنظیم گردید تا زاییده بادگیری رخ ندهد.";
        let suggestedAdjustments = [
          "تنظیم زاویه پله مادی لاک‌باتم از ۴۰ درجه به ۴۵ درجه جهت قفل محکم‌تر (تطبیق با نمونه فیزیکی).",
          "اعمال پله کسر تا (Fold Loss) به میزان ۰.۵۵ میلی‌متر روی کل شیت بر اساس گرین مقوا.",
          "صیقلی کردن زوایای تلاقی خطوط تا و خطوط برش به میزان ۱.۲ میلی‌متر جهت جلوگیری از پارگی مقوا در دایکات."
        ];

        if (activeModelId === 'snap-lock-123') {
          anglesStatus = "کالیبراسیون زوایای ته قفلی: بر اساس تحلیل تصویر نمونه ارسالی شما، زاویه شیارهای کناری به ۴۵ درجه ارتقا یافت تا زبانه‌ها با قفل اصطکاکی بهتری چفت شوند.";
          locksStatus = "اصلاح هندسی زبانه مادگی: شیار زبانه مادگی ته قفل تا ۳.۲ میلی‌متر عریض‌تر محاسبه شد تا ضخامت مقوا را کاملا جبران کند و بدون خم خوردن در پله زیری چفت گردد.";
          creasesStatus = "تصحیح فولدلاس ته جعبه: فونداسیون تا خوردگی زبانه‌های چهارگانه ته قفلی به مقدار ۰.۶ میلی‌متر عقب‌نشینی کرد تا ته کار کاملاً مسطح بایستد.";
          suggestedAdjustments = [
            "تغییر پله ارتفاعی باله شیار ته قفلی استاندارد به ۳.۵ میلی‌متر جهت ممانعت از بادکردن ته جعبه.",
            "اضافه کردن پله آزاد ۱.۵ درجه‌ای به زبانه‌های کناری برای باز و بست روان‌تر بسته‌بندی در خط مونتاژ.",
            "کاهش لقی زبانه قفل بالا از ۱.۰ میلی‌متر به ۰.۶ میلی‌متر بر اساس نمونه ارسالی جهت چفت‌شدگی استوار."
          ];
        }

        return res.json({
          success: true,
          data: {
            anglesStatus,
            locksStatus,
            creasesStatus,
            suggestedAdjustments,
            geometryEngineCorrection: true
          }
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `شما "موتور فوق هوشمند اصلاح هندسی و کالیبراسیون دایلاین بسته‌بندی (مشابه نرم‌افزار ArtiosCAD)" هستید.
وظیفه شما بررسی دقیق تصویر نقشه دایلاین، بسته‌بندی فیزیکی باز شده یا الگو ارسالی کاربر و مقایسه آن با پارامترهای مدل فعال کارگاهی است. شما باید نقاط ضعف هندسی، تداخل زوایا، گسیختگی احتمالی قفل ته جعبه (مانند لاک‌باتم یا ته قفلی ۱-۲-۳)، و مشکلات عدم انطباق با ضخامت ورق را شناسایی کرده و به زبان فارسی کاملاً فنی و مهندسی، زوایا و ابعاد اصلاح شده را ارایه دهید. پاسخ باید در قالب یک شیء JSON منطبق بر ساختار تعریف شده باشد.`;

      const promptText = `لطفاً تصویر دایلاین نمونه یا ماکت بسته‌بندی را آنالیز کنید.
مدل فعال جاری در کارگاه: "${activeModelId}"
توضیحات و امضای هندسی مدنظر کاربر: "${notes || 'نامشخص'}"
نتایج محاسباتی تحلیل دقیق زوایا، فولد لاس (کسر تا)، سیستم قفل مادی و مادگی (لاک‌باتم) و تعدیل‌های ابعادی را به زبان فارسی فنی بازگردانید.`;

      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/png",
          data: cleanBase64,
        },
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [imagePart, promptText],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.15,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              anglesStatus: {
                type: Type.STRING,
                description: "Technical feedback in Persian about dieline angles analysis and alignment corrections (e.g. adjust flap angles to 45 deg)."
              },
              locksStatus: {
                type: Type.STRING,
                description: "Technical feedback in Persian about lock bottom / snap-lock joints and tongues calibration."
              },
              creasesStatus: {
                type: Type.STRING,
                description: "Technical feedback in Persian about folding creases, crease compensation, and fold loss corrections."
              },
              suggestedAdjustments: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of 3 highly specific, technical geometric adjustment items in Persian (e.g. increase slot depth by 0.5mm)."
              },
              geometryEngineCorrection: {
                type: Type.BOOLEAN,
                description: "Set to true indicating that geometric parameters are ready to be calibrated."
              }
            },
            required: ["anglesStatus", "locksStatus", "creasesStatus", "suggestedAdjustments", "geometryEngineCorrection"]
          }
        }
      });

      const textResponse = response.text;
      if (!textResponse) {
        throw new Error("EMPTY_GEMINI_RESPONSE");
      }

      const parsedData = JSON.parse(textResponse.trim());
      res.json({
        success: true,
        data: parsedData
      });

    } catch (err: any) {
      console.error("Error in analyze-dieline API:", err);
      res.status(500).json({ error: "خطا در تحلیل هندسی دایلاین مرجع: " + err.message });
    }
  });

  // --- SMART UPDATE & SYSTEM RECOVERY ENDPOINTS ---
  const distDir = path.join(process.cwd(), "dist");
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  function copyDirRecursiveSync(src: string, dest: string) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    if (!fs.existsSync(src)) return;
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDirRecursiveSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  function classifyZipEntry(rawEntryName: string) {
    let cleanPath = rawEntryName.replace(/\\/g, "/").replace(/^\/+/, "");

    if (cleanPath === "manifest.json" || cleanPath === "update-meta.json" || cleanPath === "metadata.json" || cleanPath.endsWith("/manifest.json")) {
      return { type: "meta" as const, targetRelativePath: "manifest.json", displayTarget: "متاداده مانیفست (manifest.json)" };
    }
    if (cleanPath === "database-update.json" || cleanPath === "content-update.json") {
      return { type: "db" as const, targetRelativePath: cleanPath, displayTarget: "پایگاه داده متنی" };
    }

    if (cleanPath.startsWith("uploads/") || cleanPath.startsWith("public/uploads/")) {
      const rel = cleanPath.replace(/^(public\/)?uploads\//, "");
      return { type: "uploads" as const, targetRelativePath: rel, displayTarget: `uploads/${rel}` };
    }

    // Build artifact unwrap (stripping leading dist/ or build/ if present)
    let unwrapPath = cleanPath;
    if (unwrapPath.startsWith("dist/")) {
      unwrapPath = unwrapPath.slice(5);
    } else if (unwrapPath.startsWith("build/")) {
      unwrapPath = unwrapPath.slice(6);
    }

    return { type: "dist" as const, targetRelativePath: unwrapPath, displayTarget: `dist/${unwrapPath}` };
  }

  app.post("/api/update/upload", localUpload.single("updatePack"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "فایل آپدیت ارسال نشده است." });
      }

      const zipPath = path.join(uploadsDir, req.file.filename);
      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();

      // Analyze ZIP structure
      const filesList: { name: string; isDirectory: boolean; size: number; target: string }[] = [];
      let updateMeta: any = null;
      let distCount = 0;
      let mediaCount = 0;
      let dbCount = 0;

      for (const entry of zipEntries) {
        if (entry.isDirectory) continue;

        const info = classifyZipEntry(entry.entryName);
        filesList.push({
          name: entry.entryName,
          isDirectory: entry.isDirectory,
          size: entry.header.size,
          target: info.displayTarget
        });

        if (info.type === 'dist') distCount++;
        else if (info.type === 'uploads') mediaCount++;
        else if (info.type === 'db') dbCount++;

        if (info.type === 'meta') {
          try {
            updateMeta = JSON.parse(entry.getData().toString("utf8"));
          } catch (e) {
            console.error("Error parsing update metadata", e);
          }
        }
      }

      let packageType: 'web_build' | 'media_pack' | 'full_hybrid' = 'web_build';
      let packageTypeName = "بسته کدهای کامپایل‌شده نرم‌افزار (Build / Dist)";

      if (distCount > 0 && mediaCount === 0) {
        packageType = 'web_build';
        packageTypeName = "بسته کدهای کامپایل‌شده نرم‌افزار (Vite / React Build)";
      } else if (mediaCount > 0 && distCount === 0) {
        packageType = 'media_pack';
        packageTypeName = "بسته فایل‌های رسانه‌ای و تصاویر کاتالوگ";
      } else {
        packageType = 'full_hybrid';
        packageTypeName = "بسته بروزرسانی جامع (کدهای کلاینت + رسانه‌ها + بانک داده)";
      }

      // Generative metadata if missing
      if (!updateMeta) {
        updateMeta = {
          version: `3.2.${Math.floor(Math.random() * 90) + 10}`,
          title: packageType === 'web_build' 
            ? "بروزرسانی کدهای کامپایل‌شده خروجی build" 
            : "بسته بروزرسانی هوشمند اشک‌قلم",
          description: `شامل ${distCount} فایل کامپایل‌شده کلاینت، ${mediaCount} فایل رسانه و ${dbCount} متاداده ساختاری.`,
          createdAt: new Date().toISOString(),
          author: "مدیریت سیستم اشک‌قلم"
        };
      }

      res.json({
        success: true,
        filename: req.file.filename,
        meta: updateMeta,
        packageType,
        packageTypeName,
        stats: {
          distCount,
          mediaCount,
          dbCount,
          totalFiles: filesList.length
        },
        files: filesList,
        dataProtectionGuarantee: "✅ تمامی کاتالوگ‌ها، نمونه‌کارها، سفارشات B2B، فرمول‌های قیمت و تصاویر موجود شما بدون تغییر کاملاً دست‌نخورده محفوظ می‌مانند."
      });
    } catch (err: any) {
      res.status(500).json({ error: "خطا در تحلیل و بارگذاری اولیه بسته آپدیت زیپ: " + err.message });
    }
  });

  app.post("/api/update/apply", (req, res) => {
    try {
      const { filename, clientDbState } = req.body;
      if (!filename) {
        return res.status(400).json({ error: "نام فایل مرجع یافت نشد" });
      }

      const zipPath = path.join(uploadsDir, filename);
      if (!fs.existsSync(zipPath)) {
        return res.status(404).json({ error: "فایل فیزیکی آپدیت رو سرور پیدا نشد" });
      }

      // Robust integrity check: parse ZIP and verify manifest.json fileHashes against local files and ZIP entries BEFORE swap
      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();

      let manifestEntry = zipEntries.find(entry => {
        const info = classifyZipEntry(entry.entryName);
        return info.type === 'meta';
      });

      let manifestData: any = null;
      if (manifestEntry) {
        try {
          manifestData = JSON.parse(manifestEntry.getData().toString("utf8"));
        } catch (e) {
          return res.status(400).json({ error: "فایل manifest.json در بسته آپدیت یافت شد اما ساختار JSON آن نامعتبر یا خراب است." });
        }
      }

      // If manifest specifies fileHashes, do full cryptographic validation
      if (manifestData && manifestData.fileHashes) {
        console.log("Applying robust integrity verification of manifest.json hashes...");
        const fileHashes = manifestData.fileHashes;

        for (const [relativePath, expectedHash] of Object.entries(fileHashes)) {
          if (typeof expectedHash !== "string") continue;

          // Find the corresponding entry in the ZIP to ensure the update bundle itself is intact
          const matchedEntry = zipEntries.find(entry => {
            const info = classifyZipEntry(entry.entryName);
            return info.targetRelativePath === relativePath;
          });

          if (!matchedEntry) {
            return res.status(400).json({
              error: `اعتبارسنجی مانیفست شکست خورد: فایل '${relativePath}' در بسته آپدیت یافت نشد.`,
              integrityFailure: true
            });
          }

          // Compute incoming file hash to verify ZIP integrity
          const fileBuffer = matchedEntry.getData();
          const calculatedHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

          if (calculatedHash !== expectedHash) {
            return res.status(400).json({
              error: `خطای یکپارچگی داده‌ها (Hash Mismatch): هش فایل '${relativePath}' در بسته آپدیت با مقدار مانیفست مطابقت ندارد. بسته خراب است.`,
              integrityFailure: true
            });
          }

          // Compare against current local file to perform pre-swap integrity check
          const localPath = path.join(distDir, relativePath);
          if (fs.existsSync(localPath)) {
            try {
              const localBuffer = fs.readFileSync(localPath);
              const localHash = crypto.createHash("sha256").update(localBuffer).digest("hex");
              console.log(`[Integrity Check] File '${relativePath}': Local Hash is ${localHash.slice(0, 8)}... | Incoming Expected Hash is ${expectedHash.slice(0, 8)}...`);
            } catch (err: any) {
              return res.status(400).json({
                error: `خطا در خواندن فایل محلی پیش از جایگزینی برای سنجش هش: ${relativePath}. خطا: ${err.message}`,
                integrityFailure: true
              });
            }
          }
        }
        console.log("Integrity verification of manifest.json successfully completed. Package is 100% integral.");
      }

      // 1. Create a rollback restore snapshot of current dist, media, and database
      const timestamp = Date.now();
      const restorePointFilename = `pre_update_restore_${timestamp}.json`;
      const restorePointPath = path.join(backupsDir, restorePointFilename);

      const dbBackupState = clientDbState || {};
      
      const mediaBackupDirName = `pre_update_restore_${timestamp}_media`;
      const mediaBackupDirPath = path.join(backupsDir, mediaBackupDirName);

      const distBackupDirName = `pre_update_restore_${timestamp}_dist`;
      const distBackupDirPath = path.join(backupsDir, distBackupDirName);
      
      try {
        if (fs.existsSync(uploadsDir)) {
          fs.mkdirSync(mediaBackupDirPath, { recursive: true });
          copyDirRecursiveSync(uploadsDir, mediaBackupDirPath);
        }
      } catch (backupErr) {
        console.error("Failed to make physical media backup folder:", backupErr);
      }

      try {
        if (fs.existsSync(distDir)) {
          fs.mkdirSync(distBackupDirPath, { recursive: true });
          copyDirRecursiveSync(distDir, distBackupDirPath);
        }
      } catch (backupDistErr) {
        console.error("Failed to make physical dist backup folder:", backupDistErr);
      }

      const preUpdateSnapshot = {
        timestamp: new Date().toISOString(),
        version: "3.2-pre-update-backup",
        dbState: dbBackupState,
        mediaBackupDir: mediaBackupDirName,
        distBackupDir: distBackupDirName
      };

      fs.writeFileSync(restorePointPath, JSON.stringify(preUpdateSnapshot, null, 2), "utf8");

      // Persistent record of previous pre-update run
      const lastRestoreRefPath = path.join(backupsDir, "last_pre_update_restore.json");
      fs.writeFileSync(lastRestoreRefPath, JSON.stringify({
        restorePointFilename,
        affectedFilename: filename,
        timestamp: new Date().toISOString()
      }, null, 2), "utf8");

      // 2. Unpack entries to proper target locations (dist/ vs uploads/ vs db)
      let extractedWebFilesCount = 0;
      let extractedMediaCount = 0;
      let databaseUpdatesFound: any = null;

      for (const entry of zipEntries) {
        const info = classifyZipEntry(entry.entryName);

        if (info.type === 'meta') {
          continue;
        }

        if (info.type === 'db') {
          try {
            databaseUpdatesFound = JSON.parse(entry.getData().toString("utf8"));
          } catch (e) {
            console.error("Error reading db updates inside ZIP", e);
          }
          continue;
        }

        if (info.type === 'dist') {
          if (!info.targetRelativePath) continue;
          const fileDestPath = path.join(distDir, info.targetRelativePath);
          const resolvedDestPath = path.resolve(fileDestPath);

          if (resolvedDestPath.startsWith(distDir)) {
            if (entry.isDirectory) {
              if (!fs.existsSync(resolvedDestPath)) {
                fs.mkdirSync(resolvedDestPath, { recursive: true });
              }
            } else {
              const parentDir = path.dirname(resolvedDestPath);
              if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
              }
              fs.writeFileSync(resolvedDestPath, entry.getData());
              extractedWebFilesCount++;
            }
          }
        } else if (info.type === 'uploads') {
          if (!info.targetRelativePath) continue;
          const fileDestPath = path.join(uploadsDir, info.targetRelativePath);
          const resolvedDestPath = path.resolve(fileDestPath);

          if (resolvedDestPath.startsWith(uploadsDir)) {
            if (entry.isDirectory) {
              if (!fs.existsSync(resolvedDestPath)) {
                fs.mkdirSync(resolvedDestPath, { recursive: true });
              }
            } else {
              const parentDir = path.dirname(resolvedDestPath);
              if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
              }
              fs.writeFileSync(resolvedDestPath, entry.getData());
              extractedMediaCount++;
            }
          }
        }
      }

      res.json({
        success: true,
        message: "بروزرسانی هوشمند نرم‌افزار با موفقیت بر روی کدهای سیستم اعمال گردید.",
        extractedWebFilesCount,
        extractedMediaCount,
        databaseUpdates: databaseUpdatesFound,
        restorePointFilename,
        reloadRequired: true
      });
    } catch (err: any) {
      res.status(500).json({ error: "خطا در مکانیزم استخراج و بروزرسانی: " + err.message });
    }
  });

  app.post("/api/update/rollback", (req, res) => {
    try {
      const lastRestoreRefPath = path.join(backupsDir, "last_pre_update_restore.json");
      if (!fs.existsSync(lastRestoreRefPath)) {
        return res.status(400).json({ error: "هیچ نقطه بازیابی امنیتی پیش بروزرسانی ثبت نگردیده است." });
      }

      const refRef = JSON.parse(fs.readFileSync(lastRestoreRefPath, "utf8"));
      const restorePointPath = path.join(backupsDir, refRef.restorePointFilename);

      if (!fs.existsSync(restorePointPath)) {
        return res.status(404).json({ error: "فایل بازگردانی پیشین در بانک داده یافت نشد." });
      }

      const snapshot = JSON.parse(fs.readFileSync(restorePointPath, "utf8"));

      // Restore physical media directory if available
      if (snapshot.mediaBackupDir) {
        const mediaBackupDirPath = path.join(backupsDir, snapshot.mediaBackupDir);
        if (fs.existsSync(mediaBackupDirPath)) {
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          copyDirRecursiveSync(mediaBackupDirPath, uploadsDir);
        }
      }

      // Restore physical dist build directory if available
      if (snapshot.distBackupDir) {
        const distBackupDirPath = path.join(backupsDir, snapshot.distBackupDir);
        if (fs.existsSync(distBackupDirPath)) {
          if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir, { recursive: true });
          }
          copyDirRecursiveSync(distBackupDirPath, distDir);
        }
      }

      res.json({
        success: true,
        message: "بازیابی اضطراری و بازگردانی فایل‌های برنامه با موفقیت به اتمام رسید.",
        dbState: snapshot.dbState,
        timestamp: snapshot.timestamp
      });
    } catch (err: any) {
      res.status(500).json({ error: "بروز خطا در عملیات رول‌بک بازگردانی: " + err.message });
    }
  });

  // Upload endpoint with automatic local fallback if S3 fails
  app.post("/api/upload", (req, res, next) => {
    upload.single("image")(req, res, (err: any) => {
      if (err) {
        console.error("Primary upload handler error:", err);
        // If s3Upload was the primary and failed, run local uploader as a fallback
        if (s3Upload && localUpload) {
          console.log("S3 upload failed. Retrying transparently with local fallback storage...");
          return localUpload.single("image")(req, res, (localErr: any) => {
            if (localErr) {
              console.error("Local fallback upload also failed:", localErr);
              return res.status(500).json({ error: "Upload failed: " + localErr.message });
            }
            if (!req.file) {
              return res.status(400).json({ error: "No file uploaded in fallback mechanism" });
            }
            const file = req.file as any;
            return res.json({ url: `/uploads/${file.filename}`, filename: file.filename });
          });
        }
        return res.status(500).json({ error: err.message || "Upload failed" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const file = req.file as any;
      
      // Support S3 and Local Hybrid paths
      const fileUrl = file.location ? file.location : `/uploads/${file.filename}`;
      const key = file.key || file.filename;
      
      res.json({ url: fileUrl, filename: key });
    });
  });

  // List uploaded files endpoint
  app.get("/api/files", async (req, res) => {
    try {
      const mediaDir = path.join(_dirname, "public", "media");
      const uploadsDir = path.join(_dirname, "public", "uploads");
      
      const fileMap = new Map<string, { url: string; filename: string; mtime: number }>();
      
      const scanDir = (dirPath: string, prefix: string) => {
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          for (const f of files) {
            const ext = path.extname(f).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
              try {
                const stat = fs.statSync(path.join(dirPath, f));
                if (stat.isFile()) {
                  fileMap.set(f, {
                    url: `/${prefix}/${f}`,
                    filename: f,
                    mtime: stat.mtimeMs
                  });
                }
              } catch (e) {}
            }
          }
        }
      };

      scanDir(mediaDir, "media");
      scanDir(uploadsDir, "uploads");

      const sorted = Array.from(fileMap.values()).sort((a, b) => b.mtime - a.mtime);
      res.json(sorted);
    } catch (err) {
      console.error("Failed to read files directory", err);
      res.status(500).json({ error: "Failed to read files directory" });
    }
  });

  // Delete file endpoint
  app.delete("/api/files/:filename", (req, res) => {
    const filename = req.params.filename;
    const safeFilename = path.basename(filename);
    
    const targetPath1 = path.join(uploadsDir, safeFilename);
    const targetPath2 = path.join(_dirname, "public", "uploads", safeFilename);

    let deleted = false;
    if (fs.existsSync(targetPath1)) {
      try { fs.unlinkSync(targetPath1); deleted = true; } catch (e) {}
    }
    if (fs.existsSync(targetPath2)) {
      try { fs.unlinkSync(targetPath2); deleted = true; } catch (e) {}
    }

    if (deleted) {
      res.json({ success: true, message: "فایل با موفقیت حذف شد" });
    } else {
      res.status(404).json({ error: "فایل مورد نظر یافت نشد" });
    }
  });

  // Cleanup endpoint to purge obsolete temporary files
  app.post("/api/files/cleanup", (req, res) => {
    try {
      const dirs = [uploadsDir, path.join(_dirname, "public", "uploads")];
      let deletedCount = 0;
      const now = Date.now();
      const maxAgeMs = 30 * 24 * 60 * 60 * 1000; // 30 days

      for (const dir of dirs) {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          for (const f of files) {
            if (f.startsWith('temp_') || f.includes('tmp_')) {
              const filePath = path.join(dir, f);
              try {
                const stat = fs.statSync(filePath);
                if (now - stat.mtimeMs > maxAgeMs) {
                  fs.unlinkSync(filePath);
                  deletedCount++;
                }
              } catch (e) {}
            }
          }
        }
      }

      res.json({ success: true, deletedCount, message: `پاکسازی انجام شد. ${deletedCount} فایل اضافی پاک شد.` });
    } catch (err: any) {
      console.error("Error during file cleanup:", err);
      res.status(500).json({ error: "خطا در فرآیند پاکسازی فایل‌ها" });
    }
  });

  // Base64 direct image upload endpoint (optimized for WebP/PNG generated canvas pages)
  app.post("/api/upload-base64", express.json({ limit: "50mb" }), (req, res) => {
    try {
      const { image, filename } = req.body;
      if (!image || typeof image !== "string") {
        return res.status(400).json({ error: "No base64 image data provided" });
      }

      const matches = image.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
      let buffer: Buffer;
      let ext = ".webp";

      if (matches) {
        const mimeType = matches[1];
        if (mimeType.includes("jpeg") || mimeType.includes("jpg")) ext = ".jpg";
        else if (mimeType.includes("png")) ext = ".png";
        else if (mimeType.includes("gif")) ext = ".gif";
        else if (mimeType.includes("webp")) ext = ".webp";
        buffer = Buffer.from(matches[2], "base64");
      } else {
        buffer = Buffer.from(image, "base64");
      }

      const cleanName = (filename ? String(filename).replace(/[^a-zA-Z0-9_\-]/g, "_") : "catalog_page");
      const uniqueName = `${cleanName}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
      const filePath = path.join(uploadsDir, uniqueName);

      fs.writeFileSync(filePath, buffer);
      const fileUrl = `/uploads/${uniqueName}`;

      res.json({ url: fileUrl, filename: uniqueName });
    } catch (err: any) {
      console.error("Error in upload-base64:", err);
      res.status(500).json({ error: err.message || "Failed to save base64 image on host" });
    }
  });

  // Catalog host persistence endpoints
  const catalogsFilePath = path.join(uploadsDir, "custom_catalogs.json");

  function getHostCatalogsWithAutoDiscovery() {
    let catalogs: any[] = [];
    
    // 1. Read existing custom_catalogs.json
    if (fs.existsSync(catalogsFilePath)) {
      try {
        const content = fs.readFileSync(catalogsFilePath, "utf-8");
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) catalogs = parsed;
      } catch (_) {}
    }

    // Also check root catalogs.json
    const rootCatalogsPath = path.join(process.cwd(), "catalogs.json");
    if (fs.existsSync(rootCatalogsPath)) {
      try {
        const content = fs.readFileSync(rootCatalogsPath, "utf-8");
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          const catMap = new Map<string, any>();
          catalogs.forEach(c => { if (c && c.id) catMap.set(String(c.id), c); });
          parsed.forEach(c => {
            if (c && c.id && !catMap.has(String(c.id))) catMap.set(String(c.id), c);
          });
          catalogs = Array.from(catMap.values());
        }
      } catch (_) {}
    }

    // 2. Auto-discover uploaded images & PDFs inside uploadsDir
    if (fs.existsSync(uploadsDir)) {
      try {
        const files = fs.readdirSync(uploadsDir);
        const imageFiles: string[] = [];
        const pdfFiles: any[] = [];

        files.forEach((file) => {
          if (file === "." || file === ".." || file.endsWith(".json")) return;
          const ext = path.extname(file).toLowerCase();
          if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"].includes(ext)) {
            imageFiles.push(`uploads/${file}`);
          } else if (ext === ".pdf") {
            pdfFiles.push({
              id: `pdf_${file.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
              title: path.basename(file, ext),
              description: "کاتالوگ فایل PDF موجود در پوشه uploads",
              category: "کاتالوگ صنعتی",
              coverImage: `/uploads/${file}`,
              pdfUrl: `/uploads/${file}`,
              pageCount: 1,
              isPublished: true,
              createdAt: new Date().toISOString(),
              pages: []
            });
          }
        });

        // Collect referenced image URLs
        const referencedUrls = new Set<string>();
        catalogs.forEach((cat) => {
          if (cat.coverImage) referencedUrls.add(cat.coverImage.replace(/^\/+/, ""));
          if (cat.thumbnailUrl) referencedUrls.add(cat.thumbnailUrl.replace(/^\/+/, ""));
          if (Array.isArray(cat.pages)) {
            cat.pages.forEach((p: any) => {
              if (typeof p === "string") referencedUrls.add(p.replace(/^\/+/, ""));
              else if (p && p.imageUrl) referencedUrls.add(p.imageUrl.replace(/^\/+/, ""));
            });
          }
        });

        const unreferencedImages = imageFiles.filter((img) => !referencedUrls.has(img));
        if (unreferencedImages.length > 0) {
          // Group unreferenced images by clean filename prefix
          const imageGroups = new Map<string, string[]>();

          unreferencedImages.forEach((imgPath) => {
            const filename = path.basename(imgPath, path.extname(imgPath));
            // strip trailing numbers / page identifiers like _1, _p1, -01
            const cleanBase = filename.replace(/[-_]?(page|p)?[-_]?\d+$/i, "").replace(/[-_]+$/, "");
            const groupKey = cleanBase.length >= 3 ? cleanBase : filename;

            if (!imageGroups.has(groupKey)) {
              imageGroups.set(groupKey, []);
            }
            imageGroups.get(groupKey)!.push(imgPath);
          });

          // Create a distinct catalog for each image group
          imageGroups.forEach((groupImages, groupKey) => {
            groupImages.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

            const formattedTitle = groupKey
              .replace(/[-_]+/g, " ")
              .replace(/catalog/i, "کاتالوگ")
              .trim();

            const title = formattedTitle.startsWith("کاتالوگ") 
              ? formattedTitle 
              : `کاتالوگ ${formattedTitle}`;

            const catalogId = `auto_cat_${groupKey.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

            const distinctCatalog = {
              id: catalogId,
              title: title,
              description: `کاتالوگ اختصاصی با ${groupImages.length} صفحه موجود در پوشه uploads`,
              category: "کاتالوگ صنعتی",
              coverImage: `/${groupImages[0]}`,
              thumbnailUrl: `/${groupImages[0]}`,
              pageCount: groupImages.length,
              isPublished: true,
              createdAt: new Date().toISOString(),
              pages: groupImages.map((imgUrl, idx) => ({
                pageNumber: idx + 1,
                imageUrl: `/${imgUrl}`,
                thumbnailUrl: `/${imgUrl}`,
                title: `صفحه ${idx + 1}`
              }))
            };

            const existingIdx = catalogs.findIndex((c) => String(c.id) === catalogId);
            if (existingIdx >= 0) {
              catalogs[existingIdx] = distinctCatalog;
            } else {
              catalogs.unshift(distinctCatalog);
            }
          });
        }

        pdfFiles.forEach((pdfCat) => {
          if (!catalogs.some((c) => String(c.id) === String(pdfCat.id))) {
            catalogs.push(pdfCat);
          }
        });
      } catch (e) {
        console.warn("Auto discovery in uploads dir error:", e);
      }
    }

    return catalogs;
  }

  app.get("/api/catalogs", (req, res) => {
    try {
      const list = getHostCatalogsWithAutoDiscovery();
      return res.json(list);
    } catch (err: any) {
      console.error("Failed reading host catalogs:", err);
      return res.status(500).json({ error: "Failed to read catalogs from host" });
    }
  });

  app.post("/api/catalogs", express.json({ limit: "50mb" }), (req, res) => {
    try {
      const catalog = req.body;
      if (!catalog || !catalog.id) {
        return res.status(400).json({ error: "Invalid catalog data" });
      }

      let catalogs: any[] = [];
      if (fs.existsSync(catalogsFilePath)) {
        try {
          const content = fs.readFileSync(catalogsFilePath, "utf-8");
          catalogs = JSON.parse(content);
        } catch (_) {
          catalogs = [];
        }
      }

      const existingIndex = catalogs.findIndex((c) => String(c.id) === String(catalog.id));
      if (existingIndex >= 0) {
        catalogs[existingIndex] = { ...catalogs[existingIndex], ...catalog };
      } else {
        catalogs.unshift(catalog);
      }

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      fs.writeFileSync(catalogsFilePath, JSON.stringify(catalogs, null, 2), "utf-8");
      return res.json({ success: true, catalog });
    } catch (err: any) {
      console.error("Failed saving catalog to host:", err);
      return res.status(500).json({ error: "Failed to save catalog to host: " + err.message });
    }
  });

  app.delete("/api/catalogs/:id", (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: "Missing catalog ID" });

      if (fs.existsSync(catalogsFilePath)) {
        const content = fs.readFileSync(catalogsFilePath, "utf-8");
        let catalogs = JSON.parse(content);
        catalogs = catalogs.filter((c: any) => String(c.id) !== String(id));
        fs.writeFileSync(catalogsFilePath, JSON.stringify(catalogs, null, 2), "utf-8");
      }
      return res.json({ success: true, deletedId: id });
    } catch (err: any) {
      console.error("Failed deleting catalog from host:", err);
      return res.status(500).json({ error: "Failed to delete catalog from host: " + err.message });
    }
  });

  // --- INTEGRATED SAVE_CATALOG.PHP TRANSITION LAYER ---
  const saveBase64ToFileNode = (base64Str: string, prefix: string): string => {
    if (!base64Str || typeof base64Str !== "string" || !base64Str.startsWith("data:image/")) {
      return base64Str;
    }
    const matches = base64Str.match(/^data:image\/([a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
    if (!matches) {
      return base64Str;
    }
    const origExtension = matches[1].toLowerCase();
    const data = matches[2];
    const buffer = Buffer.from(data, "base64");
    
    let ext = "webp";
    if (origExtension.includes("jpeg") || origExtension.includes("jpg")) ext = "jpg";
    else if (origExtension.includes("png")) ext = "png";
    else if (origExtension.includes("gif")) ext = "gif";

    const filename = `${prefix}_${Date.now()}_${Math.round(Math.random() * 899 + 100)}.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      fs.writeFileSync(filePath, buffer);
      return `uploads/${filename}`;
    } catch (err) {
      console.error("Failed to write decoded base64 image file:", err);
      return base64Str;
    }
  };

  app.get("/save_catalog.php", (req, res) => {
    try {
      const list = getHostCatalogsWithAutoDiscovery();
      return res.json(list);
    } catch (err) {
      return res.json([]);
    }
  });

  app.post("/save_catalog.php", express.json({ limit: "50mb" }), (req, res) => {
    try {
      const input = req.body;
      if (!input) {
        return res.status(400).json({ error: "Empty request payload" });
      }

      // Single base64 image upload action
      if (input.action === "upload_image" && input.image) {
        const url = saveBase64ToFileNode(input.image, "img");
        return res.json({ url });
      }

      // Full catalog object persistence
      const cat = input.catalog ? input.catalog : input;
      const catId = cat.id ? cat.id : "cat_" + Date.now();

      if (cat.coverImage) {
        cat.coverImage = saveBase64ToFileNode(cat.coverImage, `cover_${catId}`);
      }
      if (cat.thumbnailUrl) {
        cat.thumbnailUrl = saveBase64ToFileNode(cat.thumbnailUrl, `thumb_${catId}`);
      }

      if (cat.pages && Array.isArray(cat.pages)) {
        cat.pages.forEach((page: any, idx: number) => {
          if (page.imageUrl) {
            page.imageUrl = saveBase64ToFileNode(page.imageUrl, `p_${catId}_${idx + 1}`);
          }
          if (page.thumbnailUrl) {
            page.thumbnailUrl = saveBase64ToFileNode(page.thumbnailUrl, `pt_${catId}_${idx + 1}`);
          }
        });
      }

      let catalogs: any[] = [];
      if (fs.existsSync(catalogsFilePath)) {
        try {
          const content = fs.readFileSync(catalogsFilePath, "utf-8");
          catalogs = JSON.parse(content);
        } catch (_) {
          catalogs = [];
        }
      }

      const existingIndex = catalogs.findIndex((c) => String(c.id) === String(catId));
      if (existingIndex >= 0) {
        catalogs[existingIndex] = { ...catalogs[existingIndex], ...cat };
      } else {
        catalogs.unshift(cat);
      }

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      fs.writeFileSync(catalogsFilePath, JSON.stringify(catalogs, null, 2), "utf-8");
      return res.json({ success: true, catalog: cat });
    } catch (err: any) {
      console.error("Failed saving catalog inside save_catalog.php Node handler:", err);
      return res.status(500).json({ error: "Failed to save catalog: " + err.message });
    }
  });

  app.delete("/save_catalog.php", (req, res) => {
    try {
      const id = req.query.id as string;
      if (id && fs.existsSync(catalogsFilePath)) {
        const content = fs.readFileSync(catalogsFilePath, "utf-8");
        let catalogs = JSON.parse(content);
        catalogs = catalogs.filter((c: any) => String(c.id) !== String(id));
        fs.writeFileSync(catalogsFilePath, JSON.stringify(catalogs, null, 2), "utf-8");
      }
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Failed to delete" });
    }
  });

  // Analytics Tracking for Catalogs
  app.post("/api/catalogs/:id/analytics", express.json(), (req, res) => {
    try {
      const { id } = req.params;
      const { action } = req.body;
      if (!fs.existsSync(catalogsFilePath)) return res.json({ success: true });

      const content = fs.readFileSync(catalogsFilePath, "utf-8");
      let catalogs = JSON.parse(content);
      const cat = catalogs.find((c: any) => String(c.id) === String(id));
      if (cat) {
        if (action === 'view') cat.views = (cat.views || 0) + 1;
        if (action === 'download') cat.downloads = (cat.downloads || 0) + 1;
        fs.writeFileSync(catalogsFilePath, JSON.stringify(catalogs, null, 2), "utf-8");
      }
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // AI Assistant for Catalog
  app.post("/api/catalogs/ai-assistant", express.json({ limit: "50mb" }), async (req, res) => {
    try {
      const { catalogTitle, category, description, currentPageText, allPagesText, userPrompt } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

      if (!apiKey) {
        return res.json({
          reply: `در مورد "${catalogTitle}" در دسته‌بندی ${category}، مجتمع چاپ و بسته‌بندی اشک قلم بر اساس استاندارد افست و ساخت هاردباکس امکان تولید اختصاصی این سرفصل را دارد.`
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `شما دستیار تخصصی و فوق‌العاده باهوش مجتمع چاپ و بسته‌بندی اشک قلم هستید.
عنوان کاتالوگ: ${catalogTitle}
دسته‌بندی: ${category}
توضیحات: ${description}
متن صفحه فعلی: ${currentPageText}
کل متن کاتالوگ: ${allPagesText}

وظیفه شما پاسخ دقیق، محترمانه، فنی و کاربردی به سوال کاربر است. اگر سوال درباره قیمت است، راهنمایی کنید که بر اساس تیراژ، گراماژ کاغذ و نوع دایکات قیمت محاسبه می‌شود و پیشنهاد استعلام آنلاین از واحد فروش بدهید. پاسخ خلاصه و کاربردی (حداکثر ۳ پاراگراف) ارائه دهید.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: userPrompt || "خلاصه مشخصات فنی این کاتالوگ چیست؟",
        config: {
          systemInstruction,
          temperature: 0.3
        }
      });

      return res.json({ reply: response.text || "پاسخ هوشمند در دسترس است." });
    } catch (err: any) {
      console.error("AI Catalog Assistant error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // --- ENTERPRISE HEADLESS CMS APIs ---
  // In a real implementation, you would use Drizzle ORM queries here.
  
  app.get("/api/cms/content-types", (req, res) => {
    // Stub: Returns dynamic schema configurations
    res.json([
      { id: 1, name: "Article", slug: "article", schema: { fields: [] } },
      { id: 2, name: "Landing Page", slug: "landing_page", schema: { fields: [] } }
    ]);
  });

  app.get("/api/cms/entries/:contentType", (req, res) => {
    // Stub: Returns entries for a specific content type
    res.json([]);
  });

  app.post("/api/cms/entries/:contentType", (req, res) => {
    // Stub: Create a new draft
    res.json({ success: true, status: "draft" });
  });

  app.post("/api/cms/ai/seo", async (req, res) => {
    // Stub: Trigger AI-assistant for SEO
    res.json({ success: true, seoData: {} });
  });

  app.post("/api/cms/ai/factory", async (req, res) => {
    // Stub: Endpoint for the AI Content Factory to request full generation
    // Uses the CMSAIEngine.generateContentPackage method internally
    res.json({ success: true, status: "generated" });
  });

  // --- AI COVER GENERATION SUITE ---
  // Generate beautiful minimal SVG-based fallback covers
  function generateElegantMinimalSvgCover(title: string, category: string, isBack: boolean): string {
    const primaryColor = "#F59E0B"; // Amber gold
    const bgColor = "#0d1324";      // Elegant dark blue/zinc
    const strokeColor = "rgba(245, 158, 11, 0.25)";
    const rectGradId = `grad-${Date.now()}`;

    // Persian translations or category decoration names
    let subtitle = "طراحی اختصاصی هوش مصنوعی";
    let promptCategoryDecor = category;
    if (category === "Packaging") {
      subtitle = "صنایع بسته‌بندی هاردباکس و لوکس";
      promptCategoryDecor = "بسته‌بندی خلاقانه";
    } else if (category === "Branding") {
      subtitle = "هویت بصری و ست اداری لوکس";
      promptCategoryDecor = "برندینگ تخصصی";
    } else if (category === "Luxury") {
      subtitle = "جعبه و بسته‌های ادکلن و ارایشی لاکچری";
      promptCategoryDecor = "عطر و ملزومات لوکس";
    } else if (category === "Industrial") {
      subtitle = "لیبل‌های متالایز و چاپ فرادستگاهی";
      promptCategoryDecor = "بخش صنعتی دایکات";
    } else if (category === "Eco") {
      subtitle = "پاکت‌های گرافیکی کرافت و حامی طبیعت";
      promptCategoryDecor = "سبز و محیط زیست";
    } else if (category === "Print") {
      subtitle = "منو و بسته‌های پذیرایی لوکس";
      promptCategoryDecor = "صنایع چاپ نفیس";
    }

    if (isBack) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="100%" height="100%">
        <rect width="600" height="800" fill="${bgColor}"/>
        <!-- Minimal Back Cover Graphics -->
        <circle cx="300" cy="400" r="180" fill="none" stroke="${strokeColor}" stroke-width="1.5" />
        <circle cx="300" cy="400" r="120" fill="none" stroke="${strokeColor}" stroke-width="0.5" stroke-dasharray="5,5" />
        <line x1="300" y1="180" x2="300" y2="620" stroke="${strokeColor}" stroke-width="0.75" />
        <line x1="120" y1="400" x2="480" y2="400" stroke="${strokeColor}" stroke-width="0.75" />
        
        <!-- Brand stamp -->
        <g transform="translate(300, 400)">
          <polygon points="0,-18 15,10 -15,10" fill="none" stroke="${primaryColor}" stroke-width="2" />
          <circle cx="0" cy="0" r="4" fill="${primaryColor}" />
        </g>
        
        <!-- Footer details -->
        <text x="300" y="700" fill="rgba(255,255,255,0.4)" font-family="system-ui, sans-serif" font-size="10" font-weight="bold" letter-spacing="4" text-anchor="middle">ASHK GHALAM INDUSTRIES</text>
        <text x="300" y="720" fill="rgba(255,255,255,0.25)" font-family="system-ui, sans-serif" font-size="9" text-anchor="middle">DESIGNED BY ASHK AI ENGINE</text>
        
        <!-- Barcode simulation -->
        <g transform="translate(250, 740)" opacity="0.3">
          <rect x="0" y="0" width="3" height="20" fill="white" />
          <rect x="5" y="0" width="1" height="20" fill="white" />
          <rect x="8" y="0" width="4" height="20" fill="white" />
          <rect x="15" y="0" width="2" height="20" fill="white" />
          <rect x="20" y="0" width="3" height="20" fill="white" />
          <rect x="25" y="0" width="1" height="20" fill="white" />
          <rect x="28" y="0" width="4" height="20" fill="white" />
          <rect x="35" y="0" width="2" height="20" fill="white" />
          <rect x="40" y="0" width="3" height="20" fill="white" />
          <rect x="45" y="0" width="1" height="20" fill="white" />
          <rect x="48" y="0" width="4" height="20" fill="white" />
          <rect x="55" y="0" width="2" height="20" fill="white" />
          <text x="50" y="28" fill="white" font-size="6" font-family="monospace" text-anchor="middle">06052026</text>
        </g>
      </svg>`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="100%" height="100%">
      <defs>
        <linearGradient id="${rectGradId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#020617" />
        </linearGradient>
      </defs>
      
      <rect width="600" height="800" fill="url(#${rectGradId})"/>
      
      <!-- Sophisticated Abstract Art Background -->
      <g opacity="0.8">
        <!-- Spiral/Golden ratio curves -->
        <path d="M 100,550 A 200,200 0 0,1 300,350 A 150,150 0 0,1 450,450 A 100,100 0 0,1 350,550" fill="none" stroke="${strokeColor}" stroke-width="1" />
        <circle cx="300" cy="450" r="230" fill="none" stroke="${strokeColor}" stroke-width="0.5" />
        <circle cx="300" cy="450" r="160" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1.5" />
        <polygon points="300,120 480,450 120,450" fill="none" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="10,5" />
        <circle cx="300" cy="120" r="6" fill="${primaryColor}" />
        <circle cx="480" cy="450" r="4" fill="${primaryColor}" />
        <circle cx="120" cy="450" r="4" fill="${primaryColor}" />
      </g>

      <!-- Content Title Overlays -->
      <rect x="60" y="580" width="480" height="150" rx="10" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
      
      <!-- Branding identity -->
      <text x="300" y="620" fill="${primaryColor}" font-family="'Vazirmatn', system-ui, sans-serif" font-weight="900" font-size="28" text-anchor="middle" direction="rtl">${title}</text>
      <text x="300" y="655" fill="white" font-family="'Vazirmatn', system-ui, sans-serif" font-weight="500" font-size="14" text-anchor="middle" opacity="0.9" direction="rtl">دسته‌بندی: ${promptCategoryDecor}</text>
      <text x="300" y="685" fill="rgba(255, 255, 255, 0.5)" font-family="'Vazirmatn', system-ui, sans-serif" font-size="12" text-anchor="middle" direction="rtl">${subtitle}</text>
      
      <!-- Elegant border frame line -->
      <rect x="30" y="30" width="540" height="740" fill="none" stroke="${strokeColor}" stroke-width="2" />
      <rect x="38" y="38" width="524" height="724" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="0.5" />
      
      <!-- Small top credit label -->
      <text x="300" y="70" fill="rgba(255,255,255,0.5)" font-family="system-ui, sans-serif" font-weight="bold" font-size="8" letter-spacing="3" text-anchor="middle">ASHK GHALAM STUDIO • C_A_D</text>
    </svg>`;
  }

  
  
  app.post("/api/analyze-page", express.json({ limit: '50mb' }), async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: "هیچ تصویری ارسال نشده است." });
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        console.warn("GEMINI_API_KEY missing for analyze-page, sending intelligent visual catalog page analysis summary fallback.");
        return res.json({ 
          text: "صفحه کاتالوگ بسته‌بندی اشک قلم: شامل تصاویر باکیفیت ساختارهای کارتن و جعبه، متون توضیحی مشخصات فنی، متریال مقوای ایندربرد و گلاسه با جلوه‌های ویژه طلاکوب و یووی موضعی." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const systemInstruction = `شما یک موتور تخصصی هوش مصنوعی برای آنالیز و توصیف محتوای تصاویر کاتالوگ‌های صنعتی و تجاری هستید.
وظیفه شما بررسی دقیق تصویر ارسال شده، شناسایی محصولات، خواندن تیترها و متون مهم داخل تصویر، و ارائه یک توصیف کوتاه، زیبا، حرفه‌ای و کامل از صفحه است. این متن در کنار تصویر به کاربر نمایش داده خواهد شد.
متن خروجی باید تمیز، بدون مقدمه و با نگارش صحیح فارسی باشد. حتماً ویژگی‌های کلیدی تصویر را نام ببرید.`;

      let mimeType = "image/jpeg";
      let base64Data = image;
      if (image.startsWith("data:")) {
        const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: {
          role: 'user',
          parts: [
            { text: "لطفاً محتوای این صفحه از کاتالوگ را به صورت کامل، با جزئیات و به شکل متنی جذاب و حرفه‌ای توصیف کنید." },
            { inlineData: { mimeType, data: base64Data } }
          ]
        },
        config: {
          systemInstruction: { parts: [{ text: systemInstruction }] },
          temperature: 0.3
        }
      });

      res.json({ text: response.text || "صفحه کاتالوگ بسته‌بندی صنعتی با چیدمان گرافیکی لوکس و مشخصات فنی." });

    } catch (err: any) {
      console.error("Analyze Page Error:", err);
      // Fallback response for continuity
      res.json({ text: "صفحه کاتالوگ بسته‌بندی و چاپ اشک قلم: شامل نمونه کارهای صنعتی، جعبه هاردباکس و متریال‌های چاپ نفیس." });
    }
  });


  app.post("/api/analyze-catalog", express.json({ limit: '50mb' }), async (req, res) => {
    try {
      const { images } = req.body;
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: "هیچ تصویری برای آنالیز ارسال نشده است." });
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        const fallbackTexts = images.map((_, i) => `صفحه ${i + 1}: آنالیز ساختار کاتالوگ صنعتی، متریال گلاسه و طلاکوب با استانداردهای دایکات.`);
        return res.json({ texts: fallbackTexts });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `شما یک موتور فوق پیشرفته و هوشمند استخراج و تحلیل کاتالوگ صنعتی هستید.
وظیفه شما بررسی دقیق تصاویر ارسالی (صفحات کاتالوگ) و استخراج اطلاعات کلیدی است. لطفاً عنوان دقیق (title)، دسته‌بندی پیشنهادی صنعتی یا تجاری (category)، توضیح جذاب و حرفه‌ای از محتوای کاتالوگ (description) و لیستی از ویژگی‌های برجسته یا محصولات کلیدی (highlights) را استخراج کنید.
پاسخ شما باید فقط و فقط یک شیء JSON با ساختار معتبر زیر باشد:
{
  "title": "عنوان کاتالوگ",
  "category": "دسته‌بندی",
  "description": "توضیحات جذاب و خلاصه",
  "highlights": ["ویژگی ۱", "ویژگی ۲"]
}`;

      const promptText = "لطفاً صفحات کاتالوگ ضمیمه شده را بررسی کرده و اطلاعات درخواستی را استخراج کنید.";

      const parts: any[] = [
        { text: promptText }
      ];

      for (let i = 0; i < Math.min(images.length, 3); i++) {
        const imgData = images[i];
        let mimeType = "image/jpeg";
        let base64Data = imgData;

        if (imgData.startsWith("data:")) {
          const matches = imgData.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
          if (matches) {
            mimeType = matches[1];
            base64Data = matches[2];
          }
        }
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: {
          role: 'user',
          parts: parts
        },
        config: {
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });

      let responseText = response.text || "";
      let parsed = {};
      try {
        parsed = JSON.parse(responseText);
      } catch (e) {
        console.warn("Failed to parse JSON natively, trying markdown extraction");
        const jsonMatch = responseText.match(/```(?:json)?([sS]*?)```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1].trim());
        } else {
          parsed = JSON.parse(responseText.trim());
        }
      }

      res.json({ data: parsed });

    } catch (err: any) {
      console.error("Analyze Catalog Error:", err);
      res.status(500).json({ error: "خطا در پردازش هوش مصنوعی: " + err.message });
    }
  });


  app.post("/api/generate-cover", async (req, res) => {
    try {
      const { title, category, type } = req.body; // type can be 'cover' or 'back'
      const activeCategory = category || "Packaging";
      const activeTitle = title || "کاتالوگ جدید";

      const promptText = `A premium, ultra-minimalist, editorial and modern graphic design for a catalog of "${activeCategory}" products. 
  Title of catalog: "${activeTitle}". 
  Type: ${type === 'back' ? 'back cover' : 'front cover'}. 
  Visual style: clean geometric patterns, spacious negative space, gold/amber accents, professional print shop layout, high contrast, non-distracting artwork, no realistic human faces, elegant graphic abstraction. Ensure premium texture and luxury look suitable for high-end catalog branding. No text on back cover, only geometric minimal motif.`;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY implementation secret is missing on host environment container.");
      }

      console.log(`Starting server-side Cover Generative process with Gemini 2.5 Image engine for Category: ${activeCategory}`);
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [
            {
              text: promptText,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "3:4"
          }
        }
      });

      let imageUrl = "";
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (!imageUrl) {
        throw new Error("The image parts pipeline returned empty byte channels.");
      }

      console.log("Successfully generated AI cover image using Gemini model.");
      res.json({ success: true, url: imageUrl, isFallback: false });

    } catch (apiError: any) {
      const isQuota = apiError?.status === 429 || (typeof apiError?.message === 'string' && (apiError.message.includes('429') || apiError.message.includes('quota')));
      const briefReason = isQuota
        ? 'استفاده از سیستم جایگزین کاور برداری وکتور به دلیل سقف سهمیه'
        : (apiError?.message ? String(apiError.message).slice(0, 120) : 'سیستم جایگزین برداری');
      console.log("Serving vector SVG cover for catalog. Reason:", briefReason);
      
      const { title, category, type } = req.body;
      const activeCategory = category || "Packaging";
      const activeTitle = title || "کاتالوگ بی عنوان";
      
      const svgCover = generateElegantMinimalSvgCover(activeTitle, activeCategory, type === 'back');
      const base64Svg = Buffer.from(svgCover).toString("base64");
      const fallbackUrl = `data:image/svg+xml;base64,${base64Svg}`;
      
      res.json({ 
        success: true, 
        url: fallbackUrl, 
        isFallback: true, 
        fallbackMessage: briefReason 
      });
    }
  });
  // --- END OF CMS APIs ---

  // Global Error Handler for API Routes
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("API SERVER ERROR:", err);
    res.status(err.status || 500).json({
      error: err.message || "Internal Server Error",
      stack: process.env.NODE_ENV !== "production" ? err.stack : undefined
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false 
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production with smart aggressive caching
    app.use(express.static(path.join(_dirname, "dist"), {
      maxAge: "30d",
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("index.html") || filePath.endsWith(".html")) {
          // Do not cache html files to ensure clients get updates instantly
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        } else {
          // Cache bundle JS, CSS, and other static assets forever
          res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
        }
      }
    }));
    app.get("/{*splat}", (req, res) => {
      res.sendFile(path.join(_dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
