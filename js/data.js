// ══════════════════════════════════════════════
// STRIKE POINT FSM — SHARED DATA STORE
// js/data.js — include on every page
// ══════════════════════════════════════════════

const STORE_KEY = 'sp_fsm_data';
const BASE = '/Wiggle';

const DEFAULT_DATA = {
  users: [
    { id: 'u1', username: 'manager', password: 'spmanager2024', name: 'Gary',          role: 'manager'  },
    { id: 'u2', username: 'john',    password: 'john1234',       name: 'John Smith',    role: 'engineer' },
    { id: 'u3', username: 'mike',    password: 'mike1234',       name: 'Mike Johnson',  role: 'engineer' },
    { id: 'u4', username: 'dave',    password: 'dave1234',       name: 'Dave Williams', role: 'engineer' },
  ],
  jobs: [],
  settings: {
    dieselPricePerLitre: 1.55,
    mpg: 30,
  }
};

// ── Load / Save ──────────────────────────────
function loadData() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DATA));
    const d = JSON.parse(raw);
    if (!d.settings) d.settings = DEFAULT_DATA.settings;
    if (!d.users)    d.users    = DEFAULT_DATA.users;
    if (!d.jobs)     d.jobs     = [];
    return d;
  } catch { return JSON.parse(JSON.stringify(DEFAULT_DATA)); }
}

function saveData() {
  localStorage.setItem(STORE_KEY, JSON.stringify(appData));
}

// ── Session ──────────────────────────────────
function getSession() {
  try { return JSON.parse(sessionStorage.getItem('sp_user')); } catch { return null; }
}

function setSession(user) {
  sessionStorage.setItem('sp_user', JSON.stringify(user));
}

function clearSession() {
  sessionStorage.removeItem('sp_user');
}

// ── Auth guard — call at top of every sub-page ──
function requireAuth() {
  const user = getSession();
  if (!user) { window.location.href = BASE + '/login.html'; return null; }
  return user;
}

function requireManager() {
  const user = requireAuth();
  if (user && user.role !== 'manager') {
    window.location.href = BASE + '/login.html';
    return null;
  }
  return user;
}

// ── Helpers ──────────────────────────────────
function genId() {
  return 'j_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function getUserName(id) {
  const u = appData.users.find(x => x.id === id);
  return u ? u.name : 'Unknown';
}

function getEngineers() {
  return appData.users.filter(u => u.role === 'engineer');
}

function isOverdue(job) {
  if (job.status !== 'live' && job.status !== 'pending') return false;
  if (!job.bookingDate) return false;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return new Date(job.bookingDate) < now;
}

function getStatusInfo(status) {
  const map = {
    live:     { dot: 'status-live',     label: 'Live',            color: '#f59e0b' },
    pending:  { dot: 'status-pending',  label: 'Pending Review',  color: '#a855f7' },
    complete: { dot: 'status-complete', label: 'Completed',       color: '#22c55e' },
    aborted:  { dot: 'status-aborted',  label: 'Aborted',         color: '#ef4444' },
  };
  return map[status] || map.live;
}

// ── Audit Log ────────────────────────────────
function addAuditEntry(job, action, userName) {
  if (!job.auditLog) job.auditLog = [];
  job.auditLog.push({ action, user: userName, ts: new Date().toISOString() });
}

// ── Toast (shared UI) ────────────────────────
let _toastTimer;
function showToast(msg, type = 'success') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { t.className = 'toast'; }, 3200);
}

// ── Initialise global store ──────────────────
var appData = loadData();
