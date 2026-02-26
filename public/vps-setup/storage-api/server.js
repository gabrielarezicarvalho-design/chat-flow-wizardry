// =============================================================
// Storage API — Node.js / Express
// Roda na VPS em: /var/www/marketflow/storage-api/server.js
// Endpoints: upload, download, list, delete, health
// Isolamento por empresa via header X-Company ou path param
// =============================================================

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.STORAGE_PORT || 3500;
const STORAGE_ROOT = process.env.STORAGE_ROOT || '/var/www/marketflow/storage';

// ── CORS ────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Company'],
}));

// ── Helpers ─────────────────────────────────────────────────
function sanitizeSlug(slug) {
  if (!slug) return null;
  return slug.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64) || null;
}

function ensureCompanyDir(slug) {
  const dir = path.join(STORAGE_ROOT, slug);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function sanitizeFileName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/_+/g, '_');
}

// ── Multer config ───────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const slug = sanitizeSlug(req.headers['x-company']);
    if (!slug) return cb(new Error('Header X-Company é obrigatório'));
    const dir = ensureCompanyDir(slug);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${sanitizeFileName(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB max
});

// ── Health ──────────────────────────────────────────────────
app.get('/api/storage/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Upload ──────────────────────────────────────────────────
app.post('/api/storage/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
  }

  const slug = sanitizeSlug(req.headers['x-company']);
  const fileName = req.file.filename;

  res.json({
    success: true,
    fileName,
    size: req.file.size,
    mimetype: req.file.mimetype,
    url: `/api/storage/download/${slug}/${fileName}`,
  });
});

// ── Download ────────────────────────────────────────────────
app.get('/api/storage/download/:slug/:fileName', (req, res) => {
  const slug = sanitizeSlug(req.params.slug);
  const fileName = req.params.fileName;

  if (!slug || !fileName) {
    return res.status(400).json({ error: 'Parâmetros inválidos' });
  }

  // Prevent path traversal
  const safeName = path.basename(fileName);
  const filePath = path.join(STORAGE_ROOT, slug, safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }

  res.sendFile(filePath);
});

// ── List files ──────────────────────────────────────────────
app.get('/api/storage/files/:slug', (req, res) => {
  const slug = sanitizeSlug(req.params.slug);
  if (!slug) {
    return res.status(400).json({ success: false, error: 'Slug inválido' });
  }

  const dir = path.join(STORAGE_ROOT, slug);
  if (!fs.existsSync(dir)) {
    return res.json({ success: true, files: [] });
  }

  try {
    const entries = fs.readdirSync(dir);
    const files = entries
      .map((name) => {
        try {
          const stats = fs.statSync(path.join(dir, name));
          if (!stats.isFile()) return null;

          // Guess mimetype from extension
          const ext = path.extname(name).toLowerCase();
          const mimeMap = {
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
            '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
            '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
            '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
            '.pdf': 'application/pdf', '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.txt': 'text/plain',
          };

          return {
            name,
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
            mimetype: mimeMap[ext] || 'application/octet-stream',
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Delete file ─────────────────────────────────────────────
app.delete('/api/storage/delete/:slug/:fileName', (req, res) => {
  const slug = sanitizeSlug(req.params.slug);
  const fileName = req.params.fileName;

  if (!slug || !fileName) {
    return res.status(400).json({ success: false, error: 'Parâmetros inválidos' });
  }

  const safeName = path.basename(fileName);
  const filePath = path.join(STORAGE_ROOT, slug, safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'Arquivo não encontrado' });
  }

  try {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Disk usage (admin) ──────────────────────────────────────
app.get('/api/storage/usage/:slug', (req, res) => {
  const slug = sanitizeSlug(req.params.slug);
  if (!slug) {
    return res.status(400).json({ success: false, error: 'Slug inválido' });
  }

  const dir = path.join(STORAGE_ROOT, slug);
  if (!fs.existsSync(dir)) {
    return res.json({ success: true, totalSize: 0, fileCount: 0 });
  }

  try {
    const entries = fs.readdirSync(dir);
    let totalSize = 0;
    let fileCount = 0;
    for (const name of entries) {
      try {
        const stats = fs.statSync(path.join(dir, name));
        if (stats.isFile()) {
          totalSize += stats.size;
          fileCount++;
        }
      } catch { /* skip */ }
    }
    res.json({ success: true, totalSize, fileCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Error handler ───────────────────────────────────────────
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
  }
  console.error('[Storage API Error]', err.message);
  res.status(500).json({ success: false, error: err.message });
});

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`📦 Storage API rodando na porta ${PORT}`);
  console.log(`📂 Diretório de storage: ${STORAGE_ROOT}`);

  // Ensure root storage dir exists
  if (!fs.existsSync(STORAGE_ROOT)) {
    fs.mkdirSync(STORAGE_ROOT, { recursive: true });
    console.log(`✅ Diretório criado: ${STORAGE_ROOT}`);
  }
});
