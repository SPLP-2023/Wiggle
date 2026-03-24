// ══════════════════════════════════════════════
// STRIKE POINT — SHARED NAV / HAMBURGER
// /Wiggle/js/nav.js
// Include on every page AFTER data.js
// ══════════════════════════════════════════════

(function() {

  // ── CSS injected once into <head> ──────────
  var css = `
    /* Hide regular nav buttons on mobile */
    @media(max-width:768px) {
      .nav-btn-hide { display:none !important; }
    }

    /* Hamburger button */
    .sp-hamburger {
      display:none;
      background:var(--dark3,#334155);
      border:1px solid var(--border,#334155);
      border-radius:8px;
      color:var(--text,#f1f5f9);
      width:36px; height:36px;
      font-size:18px;
      cursor:pointer;
      align-items:center;
      justify-content:center;
      flex-shrink:0;
      z-index:150;
    }
    @media(max-width:768px) {
      .sp-hamburger { display:flex; }
    }

    /* Dropdown menu */
    .sp-nav-dropdown {
      display:none;
      position:fixed;
      top:58px; right:12px;
      background:var(--dark2,#1e293b);
      border:1px solid var(--border,#334155);
      border-radius:12px;
      padding:8px;
      z-index:500;
      min-width:200px;
      box-shadow:0 8px 32px rgba(0,0,0,0.5);
    }
    .sp-nav-dropdown.open { display:block; }

    .sp-nav-item {
      display:flex;
      align-items:center;
      gap:10px;
      width:100%;
      padding:11px 14px;
      background:none;
      border:none;
      border-radius:8px;
      color:var(--text,#f1f5f9);
      font-size:14px;
      font-weight:500;
      cursor:pointer;
      text-align:left;
      text-decoration:none;
      transition:background 0.15s;
      font-family:inherit;
      white-space:nowrap;
    }
    .sp-nav-item:hover { background:var(--dark3,#334155); }
    .sp-nav-item.active { color:var(--primary,#f59e0b); font-weight:700; }
    .sp-nav-item.danger { color:#ef4444; }
    .sp-nav-divider {
      height:1px;
      background:var(--border,#334155);
      margin:6px 0;
    }

    /* Overlay to close on outside click */
    .sp-nav-overlay {
      display:none;
      position:fixed;
      inset:0;
      z-index:499;
    }
    .sp-nav-overlay.open { display:block; }
  `;

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── Build nav once DOM + currentUser ready ──
  // We hook into DOMContentLoaded or run immediately if already loaded
  function init() {
    // Wait until currentUser is set (may take a tick after Firebase)
    // We poll briefly then give up — keeps it simple
    var attempts = 0;
    var interval = setInterval(function() {
      attempts++;
      if (typeof currentUser !== 'undefined' && currentUser) {
        clearInterval(interval);
        buildHamburger();
      }
      if (attempts > 100) clearInterval(interval); // give up after ~5s
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function buildHamburger() {
    var navRight = document.querySelector('.nav-right');
    if (!navRight) return;

    var isManager = currentUser.role === 'manager';
    var currentPath = window.location.pathname;

    function isActive(path) {
      return currentPath.includes(path) ? 'active' : '';
    }

    // Mark all existing nav buttons (except btn-back and user-badge) as hide-on-mobile
    navRight.querySelectorAll('.btn, button').forEach(function(btn) {
      if (btn.id === 'btn-back') return; // keep back button always visible
      btn.classList.add('nav-btn-hide');
    });
    // Also hide user-badge text on mobile — keep avatar only
    var userBadge = navRight.querySelector('.user-badge');
    if (userBadge) userBadge.classList.add('nav-btn-hide');

    // ── Hamburger button ──
    var hamburger = document.createElement('button');
    hamburger.className = 'sp-hamburger';
    hamburger.innerHTML = '&#9776;';
    hamburger.setAttribute('aria-label', 'Menu');
    hamburger.onclick = function(e) {
      e.stopPropagation();
      toggleMenu();
    };

    // ── Overlay ──
    var overlay = document.createElement('div');
    overlay.className = 'sp-nav-overlay';
    overlay.onclick = function() { closeMenu(); };

    // ── Dropdown ──
    var dropdown = document.createElement('div');
    dropdown.className = 'sp-nav-dropdown';
    dropdown.id = 'sp-nav-dropdown';

    // ── Manager links ──
    var managerLinks = [
      { label: '&#127968; Dashboard',  href: '/Wiggle/index.html?from=nav',        match: 'index' },
      { label: '&#128197; Calendar',   href: '/Wiggle/calendar.html?from=nav',     match: 'calendar' },
      { label: '&#128101; Customers',  href: '/Wiggle/customers.html?from=nav',    match: 'customers' },
      { label: '&#128176; Quotes',     href: '/Wiggle/crm-quotes.html?from=nav',   match: 'crm-quotes' },
      { label: '&#129534; Invoices',   href: '/Wiggle/crm-invoices.html?from=nav', match: 'crm-invoices' },
      { label: '&#128269; Search',     href: '/Wiggle/job-search.html?from=nav',   match: 'job-search' },
      { label: '&#128230; Parts',      href: '/Wiggle/parts-catalogue.html?from=nav',    match: 'parts-catalogue' },
      { label: '&#128178; Banking',    href: '/Wiggle/banking.html?from=nav',      match: 'banking' },
      { label: '&#9881;&#65039; Settings', href: '/Wiggle/settings.html?from=nav', match: 'settings' },
    ];

    // ── Engineer links ──
    var engineerLinks = [
      { label: '&#127968; Dashboard',  href: '/Wiggle/index.html?from=nav',    match: 'index' },
      { label: '&#128197; Calendar',   href: '/Wiggle/calendar.html?from=nav', match: 'calendar' },
    ];

    // ── Accountant links ──
    var accountantLinks = [
      { label: '&#128178; Banking',    href: '/Wiggle/banking.html?from=nav',      match: 'banking' },
      { label: '&#129534; Invoices',   href: '/Wiggle/crm-invoices.html?from=nav', match: 'crm-invoices' },
    ];

    var isAccountant = currentUser.role === 'accountant';
    var links = isManager ? managerLinks : (isAccountant ? accountantLinks : engineerLinks);

    links.forEach(function(link) {
      var btn = document.createElement('button');
      btn.className = 'sp-nav-item ' + (currentPath.includes(link.match) ? 'active' : '');
      btn.innerHTML = link.label;
      btn.onclick = function() {
        closeMenu();
        window.location.href = link.href;
      };
      dropdown.appendChild(btn);
    });

    // Divider + Logout
    var divider = document.createElement('div');
    divider.className = 'sp-nav-divider';
    dropdown.appendChild(divider);

    var logoutBtn = document.createElement('button');
    logoutBtn.className = 'sp-nav-item danger';
    logoutBtn.innerHTML = '&#128682; Logout';
    logoutBtn.onclick = function() {
      closeMenu();
      if (typeof doLogout === 'function') doLogout();
      else if (typeof clearSession === 'function') {
        clearSession();
        window.location.href = '/Wiggle/login.html';
      }
    };
    dropdown.appendChild(logoutBtn);

    // ── Insert into DOM ──
    // Insert hamburger before user-badge (or at end of nav-right)
    var userBadgeEl = navRight.querySelector('.user-badge');
    if (userBadgeEl) {
      navRight.insertBefore(hamburger, userBadgeEl);
    } else {
      navRight.appendChild(hamburger);
    }
    document.body.appendChild(overlay);
    document.body.appendChild(dropdown);

    function toggleMenu() {
      var isOpen = dropdown.classList.contains('open');
      if (isOpen) closeMenu(); else openMenu();
    }

    function openMenu() {
      dropdown.classList.add('open');
      overlay.classList.add('open');
      hamburger.innerHTML = '&#10005;';
    }

    function closeMenu() {
      dropdown.classList.remove('open');
      overlay.classList.remove('open');
      hamburger.innerHTML = '&#9776;';
    }

    // Close on Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

})();
