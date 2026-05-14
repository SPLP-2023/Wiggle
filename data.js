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
  leave: [],
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

// ── Firebase Auth user lookup ──────────────────
const AUTH_USERS = [
  { id: 'u1', email: 'operations@strikepoint.uk',     name: 'Luke Storey',  role: 'manager',   colour: null       },
  { id: 'u2', email: 'luke.storey@strikepoint.uk',    name: 'Luke Storey',  role: 'engineer',  colour: '#3b82f6'  },
  { id: 'u3', email: 'lewis.kirk@strikepoint.uk',     name: 'Lewis Kirk',   role: 'engineer',  colour: '#22c55e'  },
  { id: 'u4', email: 'josh.barbour@strikepoint.uk',   name: 'Josh Barbour', role: 'engineer',  colour: '#a855f7'  },
  { id: 'u5', email: 'aaron@atkinson-evans.co.uk',    name: 'Aaron',        role: 'accountant', colour: null      },
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
function initFirebaseWithAuth() {
  return new Promise((resolve, reject) => {
    if (!firebase.apps.length) firebase.initializeApp(_firebaseConfig);
    _db = firebase.firestore();
    firebase.auth().onAuthStateChanged(user => {
      if (!user) {
        clearSession();
        window.location.href = BASE + '/login.html';
        return;
      }
      initFirebase().then(resolve).catch(reject);
    });
  });
}

function initFirebase() {
  return new Promise((resolve, reject) => {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(_firebaseConfig);
      }
      _db = firebase.firestore();

      // Load settings then jobs (no longer loading users from Firestore)
      const metaRef = _db.collection('meta');

      metaRef.doc('settings').get().then(async (settingsSnap) => {
        // ── Settings ────────────────────────
        if (settingsSnap.exists) {
          appData.settings = settingsSnap.data();
        } else {
          await metaRef.doc('settings').set(DEFAULT_SETTINGS);
          appData.settings = { ...DEFAULT_SETTINGS };
        }

        // ── Users — now come from AUTH_USERS lookup, not Firestore ──
        appData.users = AUTH_USERS.map(u => ({ ...u }));

        // ── Jobs ────────────────────────────
        const jobsSnap = await _db.collection('jobs').orderBy('createdAt', 'desc').get();
        appData.jobs = jobsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));

        // ── Leave ────────────────────────────
        try {
          const leaveSnap = await _db.collection('leave').orderBy('createdAt', 'desc').get();
          appData.leave = leaveSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        } catch (_) {
          appData.leave = [];
        }

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
  return firebase.auth().signOut();
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

function genLeaveId() {
  return 'l_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function saveLeave(leaveItem) {
  if (!_db) return Promise.resolve();
  const { id, ...data } = leaveItem;
  return _db.collection('leave').doc(id).set(data);
}

function deleteLeaveFromDB(id) {
  if (!_db) return Promise.resolve();
  return _db.collection('leave').doc(id).delete();
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
