// ══════════════════════════════════════════════
// STRIKE POINT FSM — SHARED DATA STORE
// js/data.js — Firebase Firestore edition
// Include on every page BEFORE page scripts
// ══════════════════════════════════════════════

const BASE = '/Wiggle';

// ── Firebase SDK (loaded via CDN modules) ──────
// We use the compat (global) SDK so existing code needs no changes.
// The scripts below are loaded in each HTML <head> — see instructions.

// ── Firestore collections ──────────────────────
//   /meta/settings  — fuel settings doc
//   /meta/users     — users doc (array)
//   /jobs/{id}      — one doc per job

// ── In-memory cache (mirrors Firestore) ───────
var appData = {
  users: [],
  jobs: [],
  settings: {
    dieselPricePerLitre: 1.55,
    mpg: 30,
  }
};

// ── Firestore reference (set after init) ───────
var _db = null;

// ── Firebase config ───────────────────────────
const _firebaseConfig = {
  apiKey: "AIzaSyDdsoekUkPFOaOcY4mm6UmoXVn1BKCLoXI",
  authDomain: "strikepointfsm.firebaseapp.com",
  projectId: "strikepointfsm",
  storageBucket: "strikepointfsm.firebasestorage.app",
  messagingSenderId: "820585618659",
  appId: "1:820585618659:web:0e1c6f8e35470c6b18b9d6"
};

// ── Default users (seeded once to Firestore) ──
const DEFAULT_USERS = [
  { id: 'u1', username: 'manager', password: 'splp.2024', name: 'Luke Storey',         role: 'manager'  },
  { id: 'u2', username: 'luke',    password: 'luke1234',       name: 'Luke Storey',  role: 'engineer', colour: '#3b82f6' },
  { id: 'u3', username: 'lewis',   password: 'lewis1234',      name: 'Lewis Kirk',   role: 'engineer', colour: '#22c55e' },
  { id: 'u4', username: 'josh',    password: 'josh1234',       name: 'Josh Barbour', role: 'engineer', colour: '#a855f7' },
];

const DEFAULT_SETTINGS = {
  dieselPricePerLitre: 1.55,
  mpg: 30,
};

// ══════════════════════════════════════════════
// INITIALISE FIREBASE & LOAD DATA
// Returns a Promise that resolves when appData
// is fully populated from Firestore.
// ══════════════════════════════════════════════
function initFirebase() {
  return new Promise((resolve, reject) => {
    try {
      // Initialise app (guard against double-init)
      if (!firebase.apps.length) {
        firebase.initializeApp(_firebaseConfig);
      }
      _db = firebase.firestore();

      // Load settings + users in parallel, then jobs
      const metaRef = _db.collection('meta');

      Promise.all([
        metaRef.doc('settings').get(),
        metaRef.doc('users').get(),
      ]).then(async ([settingsSnap, usersSnap]) => {

        // ── Settings ────────────────────────
        if (settingsSnap.exists) {
          appData.settings = settingsSnap.data();
        } else {
          // First run — seed defaults
          await metaRef.doc('settings').set(DEFAULT_SETTINGS);
          appData.settings = { ...DEFAULT_SETTINGS };
        }

        // ── Users ───────────────────────────
        if (usersSnap.exists && usersSnap.data().list) {
          appData.users = usersSnap.data().list;
        } else {
          // First run — seed defaults
          await metaRef.doc('users').set({ list: DEFAULT_USERS });
          appData.users = [...DEFAULT_USERS];
        }

        // ── Jobs ────────────────────────────
        const jobsSnap = await _db.collection('jobs').orderBy('createdAt', 'desc').get();
        appData.jobs = jobsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));

        resolve();
      }).catch(reject);
    } catch (err) {
      reject(err);
    }
  });
}

// ══════════════════════════════════════════════
// SAVE FUNCTIONS  (async — return Promises)
// ══════════════════════════════════════════════

// Save a single job to Firestore
function saveJob(job) {
  if (!_db) return Promise.resolve();
  const { id, ...data } = job;
  return _db.collection('jobs').doc(id).set(data);
}

// Save all users to Firestore
function saveUsers() {
  if (!_db) return Promise.resolve();
  return _db.collection('meta').doc('users').set({ list: appData.users });
}

// Save settings to Firestore
function saveSettings() {
  if (!_db) return Promise.resolve();
  return _db.collection('meta').doc('settings').set(appData.settings);
}

// Delete a job from Firestore
function deleteJobFromDB(id) {
  if (!_db) return Promise.resolve();
  return _db.collection('jobs').doc(id);
}

// Delete ALL jobs (used in settings danger zone)
function deleteAllJobs() {
  if (!_db) return Promise.resolve();
  const batch = _db.batch();
  appData.jobs.forEach(j => {
    batch.delete(_db.collection('jobs').doc(j.id));
  });
  appData.jobs = [];
  return batch.commit();
}

// Backward-compat stub so existing saveData() calls don't break.
// Individual pages that use saveData() will be updated to call
// the specific saveJob / saveUsers / saveSettings functions.
// For now this fires a save of all jobs + meta.
function saveData() {
  if (!_db) return;
  // Save all jobs
  appData.jobs.forEach(j => saveJob(j));
  saveUsers();
  saveSettings();
}

// ══════════════════════════════════════════════
// SESSION  (unchanged — stays in sessionStorage)
// ══════════════════════════════════════════════
function getSession() {
  try { return JSON.parse(sessionStorage.getItem('sp_user')); } catch { return null; }
}

function setSession(user) {
  sessionStorage.setItem('sp_user', JSON.stringify(user));
}

function clearSession() {
  sessionStorage.removeItem('sp_user');
}

// ── Auth guards ───────────────────────────────
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

// ══════════════════════════════════════════════
// HELPERS  (unchanged)
// ══════════════════════════════════════════════
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
    live:     { dot: 'status-live',     label: 'Live',           color: '#f59e0b' },
    pending:  { dot: 'status-pending',  label: 'Pending Review', color: '#a855f7' },
    complete: { dot: 'status-complete', label: 'Completed',      color: '#22c55e' },
    aborted:  { dot: 'status-aborted',  label: 'Aborted',        color: '#ef4444' },
    notconfirmed: { dot: 'status-notconfirmed',  label: 'Not Confirmed',  color: '#ef4444' },
  };
  return map[status] || map.live;
}

function addAuditEntry(job, action, userName) {
  if (!job.auditLog) job.auditLog = [];
  job.auditLog.push({ action, user: userName, ts: new Date().toISOString() });
}

// ── Toast ─────────────────────────────────────
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

// ══════════════════════════════════════════════
// LOADING OVERLAY  (shown while Firestore loads)
// ══════════════════════════════════════════════
function showLoader() {
  let el = document.getElementById('_fsm_loader');
  if (!el) {
    el = document.createElement('div');
    el.id = '_fsm_loader';
    el.style.cssText = `
      position:fixed;inset:0;background:#0f172a;z-index:9999;
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;
      font-family:'Segoe UI',system-ui,sans-serif;color:#f1f5f9;
    `;
    el.innerHTML = `
      <div style="font-size:40px;">⚡</div>
      <div style="font-size:16px;font-weight:600;color:#f59e0b;">Strike Point</div>
      <div style="width:40px;height:40px;border:3px solid #334155;border-top-color:#f59e0b;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
      <div style="font-size:13px;color:#94a3b8;" id="_fsm_loader_msg">Connecting…</div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    `;
    document.body.appendChild(el);
  }
  return el;
}

function hideLoader() {
  const el = document.getElementById('_fsm_loader');
  if (el) el.remove();
}

function setLoaderMsg(msg) {
  const el = document.getElementById('_fsm_loader_msg');
  if (el) el.textContent = msg;
}
