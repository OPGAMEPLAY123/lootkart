/* ═══════════════════════════════════════════
   LOOTKART USER PANEL — app.js
   ✅ Working Auth (Login + Signup + Google UI)
   ✅ Cursor Dot + Ring
   ✅ Banner Slider
   ✅ Push Notifications (Inline SW)
   ✅ Full App Logic
═══════════════════════════════════════════ */
'use strict';

/* ── STATE ── */
let CU = null;
let allProds = [], spinRot = 0, isSpinning = false, cdTimer = null;
let sliderIndex = 0, sliderTimer = null, sliderSlides = [];
let touchStartX = 0, touchDeltaX = 0, isDragging = false;

const PRIZES  = [10, 25, 5, 50, 15, 100, 20, 30];
const PCOLORS = ['#7c3aed','#9333ea','#a855f7','#b865f8','#c084fc','#8b44f7','#a03af7','#9040f0'];

/* ════════════════════════════════════════════════════
   SAFE STORAGE — Works in CodePen, iframes, and all browsers
   Falls back to in-memory store if localStorage is blocked
════════════════════════════════════════════════════ */

/* In-memory fallback store */
const _mem = {};

function _lsGet(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? v : def;
  } catch(e) {
    return key in _mem ? _mem[key] : def;
  }
}
function _lsSet(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch(e) {
    _mem[key] = val;
  }
}
function _lsRemove(key) {
  try { localStorage.removeItem(key); } catch(e) { delete _mem[key]; }
}

const S = {
  users:    () => JSON.parse(_lsGet('lk_users',  '{}')),
  saveU:    (u) => _lsSet('lk_users',  JSON.stringify(u)),
  cur:      () => JSON.parse(_lsGet('lk_cur',    'null')),
  saveCur:  (u) => { _lsSet('lk_cur', JSON.stringify(u)); CU = u; },
  prods:    () => JSON.parse(_lsGet('opg_admin_products', '[]')),
  partners: () => JSON.parse(_lsGet('lk_partners', '[]')),
  sliders:  () => JSON.parse(_lsGet('lk_sliders',  '[]')),
  hist:     (id) => JSON.parse(_lsGet('lk_h_' + id, '[]')),
  saveHist: (id, h) => _lsSet('lk_h_' + id, JSON.stringify(h)),
  notifs:   () => JSON.parse(_lsGet('opg_notifs', '[]')),
};

/* ════════════════════════
   PARTICLES BACKGROUND
════════════════════════ */
function initParticles() {
  const c = document.getElementById('p-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, pts;

  const resize = () => { W = c.width = window.innerWidth; H = c.height = window.innerHeight; };
  const make = () => {
    const n = Math.floor((W * H) / 14000);
    pts = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.6 + .4,
      dx: (Math.random() - .5) * .35, dy: (Math.random() - .5) * .35,
      a: Math.random() * .5 + .1,
      ph: Math.random() * Math.PI * 2, ps: .02 + Math.random() * .02
    }));
  };
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    pts.forEach(p => {
      p.ph += p.ps;
      const a = p.a * (.6 + .4 * Math.sin(p.ph));
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(168,85,247,${a})`; ctx.fill();
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
    });
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 90) {
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(168,85,247,${.1 * (1 - d / 90)})`; ctx.lineWidth = .5; ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  };
  resize(); make(); draw();
  window.addEventListener('resize', () => { resize(); make(); });
}

/* ════════════════════════
   CURSOR DOT + RING
════════════════════════ */
function initCursor() {
  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  // Hide on mobile
  if (window.matchMedia('(pointer: coarse)').matches) {
    dot.style.display = 'none';
    ring.style.display = 'none';
    document.body.style.cursor = 'auto';
    return;
  }

  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    // Dot follows instantly
    dot.style.left  = mx + 'px';
    dot.style.top   = my + 'px';
    dot.style.opacity = '1';
    ring.style.opacity = '1';
  });

  // Ring follows with smooth lag
  function animRing() {
    rx += (mx - rx) * 0.15;
    ry += (my - ry) * 0.15;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animRing);
  }
  animRing();

  document.addEventListener('mousedown', () => {
    dot.classList.add('click');
    ring.classList.add('click');
  });
  document.addEventListener('mouseup', () => {
    dot.classList.remove('click');
    ring.classList.remove('click');
  });

  // Enlarge ring on interactive elements
  document.addEventListener('mouseover', e => {
    const tag = e.target.tagName;
    const isBtn = tag === 'BUTTON' || tag === 'A' || e.target.classList.contains('mrow') || e.target.classList.contains('sc-card') || e.target.classList.contains('p-card');
    if (isBtn) {
      ring.style.width  = '50px';
      ring.style.height = '50px';
      ring.style.borderColor = 'rgba(196,132,252,.85)';
    } else {
      ring.style.width  = '34px';
      ring.style.height = '34px';
      ring.style.borderColor = 'rgba(168,85,247,.6)';
    }
  });
}


/* ════════════════════════
   NOTIFICATIONS (Simple — no FCM)
════════════════════════ */
function registerSW()      {}
function requestPush()     { showToast('🔔 Notifications are delivered through the app'); }
function sendLocalNotif(d) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification(d.title || 'LootKart', { body: d.body || '', icon: d.icon || '' }); } catch(e) {}
}
function updatePushUI()    {}
function showFCMTokenBox() {}
function copyFCMToken()    {}
function storeFCMToken()   {}
function initFCMMessaging(){}
function dismissBanner()   {
  const b = document.getElementById('push-banner');
  if (b) b.classList.remove('show');
  _lsSet('push_banner_dismissed','1');
}

/* ════════════════════════
   SCREEN + SECTION NAV
════════════════════════ */
function goS(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function gotoSec(name, tabEl) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById('sec-' + name);
  if (sec) sec.classList.add('active');

  document.querySelectorAll('.snav').forEach(t => t.classList.remove('active'));
  if (tabEl) tabEl.classList.add('active');
  else {
    const m = document.querySelector(`.snav[data-s="${name}"]`);
    if (m) m.classList.add('active');
  }

  const at = document.querySelector('.snav.active');
  if (at) at.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  if (name === 'notifications') renderNotifsList();

  ['home','deals','rewards','refer','profile'].forEach(n => {
    const b = document.getElementById('bn-' + n);
    if (b) b.classList.remove('active');
  });
  const nb = document.getElementById('bn-' + name);
  if (nb) nb.classList.add('active');

  if (name === 'deals')         renderDeals();
  if (name === 'rewards')       renderRwdPage();
  if (name === 'partners')      renderPartnersPage();

}

function navCk(name, el) {
  document.querySelectorAll('.bni').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  gotoSec(name);
}

/* ════════════════════════
   AUTH — TAB SWITCH
════════════════════════ */
function switchTab(tab) {
  /* Legacy — just show new user form */
  gotoNewUser();
}

/* Show existing user login panel (no tabs needed) */
function showLoginPanel() { gotoExistingUser(); }
function showSignupPanel() { gotoNewUser(); }

/* Password visibility toggle */
function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else                          { inp.type = 'password'; btn.textContent = '👁'; }
}

/* Password strength meter */
function checkPwStrength(val) {
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  const fill  = document.getElementById('pws-fill');
  const label = document.getElementById('pws-label');
  if (!fill || !label) return;

  const levels = [
    { w: '0%',   bg: 'transparent',    text: '' },
    { w: '25%',  bg: '#ef4444',        text: '🔴 Weak' },
    { w: '50%',  bg: '#f97316',        text: '🟠 Fair' },
    { w: '75%',  bg: '#eab308',        text: '🟡 Good' },
    { w: '100%', bg: '#22c55e',        text: '🟢 Strong' },
  ];
  const lv = levels[score];
  fill.style.width      = lv.w;
  fill.style.background = lv.bg;
  label.textContent     = lv.text;
}




/* ══════════════════════════════════════════════════════════
   EMAIL OTP AUTHENTICATION
   Firebase Firestore + EmailJS
   EmailJS: service_wyg026w / template_0zaypmd / OOqUXRQAgjYrKa_Jo
   Firebase: lootkart-cab67
══════════════════════════════════════════════════════════ */

/* ── Config ── */
const EMAILJS_PUBLIC_KEY = 'OOqUXRQAgjYrKa_Jo';
const EMAILJS_SERVICE_ID = 'service_wyg026w';
const EMAILJS_TEMPLATE_ID = 'template_0zaypmd';

const EMAIL_OTP_FB_CONFIG = {
  apiKey:            "AIzaSyCHO9Ehooazl_SjoU_-sMOByKBFPZ5cxDc",
  authDomain:        "lootkart-cab67.firebaseapp.com",
  projectId:         "lootkart-cab67",
  storageBucket:     "lootkart-cab67.firebasestorage.app",
  messagingSenderId: "572199200458",
  appId:             "1:572199200458:web:db6e5d941631941eff7633"
};

/* ── State ── */
let emailOTPFirebaseApp = null;
let emailOTPDb          = null;
let currentOTPEmail     = '';
let currentGeneratedOTP = null;   // stored locally as backup
let otpCountdownTimer   = null;
let emailJSReady        = false;

/* ── Init Firebase Firestore (reuses the default Firebase app) ── */
function initEmailOTPFirebase() {
  if (typeof firebase === 'undefined') return false;
  try {
    // Reuse existing default app if already initialized by initFirebase()
    // or initialize if needed — both use lootkart-cab67
    let app;
    try {
      app = firebase.app(); // get default app
    } catch(e) {
      app = firebase.initializeApp(EMAIL_OTP_FB_CONFIG);
    }
    emailOTPFirebaseApp = app;
    emailOTPDb = app.firestore();
    console.log('✅ Email OTP Firestore initialized');
    return true;
  } catch(e) {
    console.error('Email OTP Firebase init error:', e);
    return false;
  }
}

/* ════════════════════════════════════════
   EMAILJS — Send via fetch (no SDK needed)
   Uses EmailJS REST API directly — works
   in CodePen, mobile, any environment
════════════════════════════════════════ */
function initEmailJS() { emailJSReady = true; return true; }

async function sendViaEmailJS(toEmail, otp) {
  const payload = {
    service_id:  'service_wyg026w',
    template_id: 'template_0zaypmd',
    user_id:     'OOqUXRQAgjYrKa_Jo',
    template_params: {
      to_email: toEmail,
      to_name:  toEmail.split('@')[0],
      passcode: String(otp),
      otp_code: String(otp),
      message:  'Your LootKart OTP is: ' + otp + '. Valid for 5 minutes.',
      email:    toEmail
    }
  };

  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error('EmailJS error: ' + text);
  }
  return true;
}

/* ── Generate 6-digit OTP ── */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

/* ════════════════════════
   SEND EMAIL OTP (Login)
════════════════════════ */
async function sendEmailOTP() {
  hideOTPError();

  const emailInput = document.getElementById('otp-email');
  const email = emailInput ? emailInput.value.trim().toLowerCase() : '';

  if (!email) {
    showOTPError('📧 Please enter your email address');
    emailInput && emailInput.focus(); return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showOTPError('⚠️ Please enter a valid email address');
    emailInput && emailInput.focus(); return;
  }

  currentOTPEmail = email;

  const btn = document.getElementById('send-otp-btn');
  const txt = document.getElementById('send-otp-text');
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }
  if (txt) txt.textContent = 'Sending...';

  if (!emailOTPDb) initEmailOTPFirebase();

  try {
    const otp = generateOTP();
    currentGeneratedOTP = otp; // local backup

    /* ── Step A: Save OTP to Firestore ── */
    let firestoreSaved = false;
    if (emailOTPDb) {
      try {
        // Delete old OTPs for this email first
        const oldQ = emailOTPDb.collection('otp_codes').where('email', '==', email);
        const oldSnap = await oldQ.get();
        const delBatch = emailOTPDb.batch();
        oldSnap.forEach(d => delBatch.delete(d.ref));
        await delBatch.commit();

        // Save new OTP
        await emailOTPDb.collection('otp_codes').add({
          email:  email,
          otp:    otp,
          expiry: new Date(Date.now() + 5 * 60 * 1000) // 5 min
        });
        firestoreSaved = true;
        console.log('✅ OTP saved to Firestore');
      } catch(fsErr) {
        console.warn('Firestore save failed (using local backup):', fsErr.message);
      }
    }

    /* ── Step B: Send OTP via EmailJS ── */
    await sendViaEmailJS(email, otp);

    console.log('✅ OTP email sent to', email);

    /* ── Step C: Show Step 2 ── */
    showEmailStep2(email);
    startOTPCountdown(60);
    showToast('📧 OTP sent! Check your inbox.');

  } catch(e) {
    console.error('Send Email OTP error:', e);
    let msg = '❌ Failed to send OTP. Check your email and internet connection.';
    if (e.text)    msg = '❌ EmailJS error: ' + e.text;
    else if (e.message && e.message.includes('EmailJS'))  msg = '⚠️ ' + e.message;
    else if (e.message && e.message.includes('network'))  msg = '🌐 Network error. Check your connection.';
    else if (e.message && e.message.includes('template')) msg = '⚠️ EmailJS template not found. Check template ID.';
    else if (e.message) msg = '❌ ' + e.message;
    showOTPError(msg);

    // Re-enable button
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
    if (txt) txt.textContent = '📧 Send OTP to Email';
  }
}

/* ════════════════════════
   VERIFY EMAIL OTP
════════════════════════ */
async function verifyEmailOTP() {
  hideOTPError();

  if (!currentOTPEmail) {
    showOTPError('❌ No OTP request found. Please send OTP first.');
    return;
  }

  // Collect digits from 6 boxes
  const boxes = document.querySelectorAll('.otp-box');
  const enteredOTP = Array.from(boxes).map(b => b.value).join('');

  if (enteredOTP.length !== 6) {
    showOTPError('⚠️ Please enter all 6 digits of the OTP');
    shakeOTPBoxes();
    return;
  }
  if (!/^\d{6}$/.test(enteredOTP)) {
    showOTPError('⚠️ OTP must contain 6 digits only');
    shakeOTPBoxes();
    return;
  }

  // Set loading state
  const btn = document.getElementById('verify-otp-btn');
  const txt = document.getElementById('verify-otp-text');
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }
  if (txt) txt.textContent = 'Verifying...';

  try {
    let isValid = false;

    /* ── Try Firestore verification first ── */
    if (emailOTPDb) {
      try {
        const q = emailOTPDb.collection('otp_codes')
          .where('email', '==', currentOTPEmail)
          .where('otp', '==', parseInt(enteredOTP));

        const snap = await q.get();

        if (!snap.empty) {
          for (const docSnap of snap.docs) {
            const data = docSnap.data();
            const expiry = data.expiry && data.expiry.toDate ? data.expiry.toDate() : new Date(data.expiry);
            if (expiry > new Date()) {
              isValid = true;
              // Delete used OTP
              await docSnap.ref.delete();
              break;
            }
          }
          if (!isValid) {
            throw { code: 'otp/expired', message: 'OTP has expired. Please request a new one.' };
          }
        } else {
          throw { code: 'otp/invalid', message: 'Invalid OTP. Please check and try again.' };
        }
      } catch(fsErr) {
        if (fsErr.code === 'otp/expired' || fsErr.code === 'otp/invalid') throw fsErr;
        // Firestore failed — fall back to local OTP
        console.warn('Firestore verify failed, using local OTP:', fsErr.message);
        if (currentGeneratedOTP && parseInt(enteredOTP) === currentGeneratedOTP) {
          isValid = true;
        } else {
          throw { code: 'otp/invalid', message: 'Invalid OTP. Please try again.' };
        }
      }
    } else {
      // No Firestore — use local OTP
      if (currentGeneratedOTP && parseInt(enteredOTP) === currentGeneratedOTP) {
        isValid = true;
      } else {
        throw { code: 'otp/invalid', message: 'Invalid OTP. Please try again.' };
      }
    }

    if (isValid) {
      /* ── Create user in Firestore (silent — doesn't block login) ── */
      createFirestoreUser(currentOTPEmail).catch(e => console.warn('Firestore user create:', e.message));

      /* ── Create local user (safe — falls back to in-memory) ── */
      try {
        createLocalUser(currentOTPEmail);
      } catch(storageErr) {
        console.warn('Local storage blocked — using in-memory session');
        const uname = currentOTPEmail.split('@')[0].replace(/[^a-z0-9]/gi,'').slice(0,12) || 'user';
        const user  = {
          id: 'e_' + Date.now(), name: uname, username: uname,
          email: currentOTPEmail, phone: '', password: '',
          coins: 0, referralCode: 'OPG' + Math.floor(Math.random()*10000),
          joinDate: new Date().toLocaleDateString(),
          loginMethod: 'email_otp', avatar: '📧'
        };
        _mem['lk_cur'] = JSON.stringify(user);
        CU = user;
      }

      /* ── Show success overlay then enter app ── */
      showOTPSuccessOverlay(currentOTPEmail);
      setTimeout(() => initApp(), 1800);
    }

  } catch(e) {
    console.error('Verify OTP error:', e);
    let msg = '❌ Verification failed. Please try again.';
    if (e.code === 'otp/expired') msg = '⏰ ' + e.message;
    else if (e.code === 'otp/invalid') msg = '❌ ' + e.message;
    else if (e.message && e.message.includes('localStorage')) msg = '❌ OTP verified but session storage blocked. Try opening in a full browser tab instead of an iframe.';
    else if (e.message) msg = '❌ ' + e.message;

    showOTPError(msg);
    shakeOTPBoxes();

    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
    if (txt) txt.textContent = '✅ Verify OTP';
  }
}

/* ════════════════════════
   CREATE USER IN FIRESTORE
════════════════════════ */
async function createFirestoreUser(email) {
  if (!emailOTPDb) return;
  try {
    const userRef = emailOTPDb.collection('users').doc(email);
    await userRef.set({
      email:         email,
      coins:         0,
      referral_code: 'OPG' + Math.floor(Math.random() * 10000),
      created_at:    firebase.firestore.FieldValue.serverTimestamp(),
      last_login:    firebase.firestore.FieldValue.serverTimestamp(),
      login_method:  'email_otp'
    }, { merge: true });
    console.log('✅ User created/updated in Firestore:', email);
  } catch(e) {
    console.warn('Firestore user creation failed:', e.message);
  }
}

/* ════════════════════════
   CREATE LOCAL USER (localStorage)
════════════════════════ */
function createLocalUser(email) {
  try {
    const users = S.users();
    let user = Object.values(users).find(u => u.email === email);

    if (!user) {
      const id    = 'e_' + Date.now();
      const code  = 'OPG' + Math.floor(Math.random() * 10000);
      const uname = email.split('@')[0].replace(/[^a-z0-9]/gi,'').slice(0,12) || 'user';
      user = {
        id, name: uname, username: uname,
        email, phone: '', password: '',
        coins: 0, referralCode: code,
        joinDate: new Date().toLocaleDateString(),
        loginMethod: 'email_otp', avatar: '📧'
      };
      users[id] = user;
      S.saveU(users);
    } else {
      user.lastLogin = new Date().toLocaleDateString();
      users[user.id] = user;
      S.saveU(users);
    }

    S.saveCur(user);
    return user;
  } catch(e) {
    console.warn('createLocalUser storage error:', e.message);
    const uname = email.split('@')[0].replace(/[^a-z0-9]/gi,'').slice(0,12) || 'user';
    const user  = {
      id: 'e_' + Date.now(), name: uname, username: uname, email,
      phone: '', password: '',
      coins: 0, referralCode: 'OPG' + Math.floor(Math.random()*10000),
      joinDate: new Date().toLocaleDateString(),
      loginMethod: 'email_otp', avatar: '📧'
    };
    _mem['lk_cur'] = JSON.stringify(user);
    CU = user;
    return user;
  }
}

/* ════════════════════════
   RESEND EMAIL OTP
════════════════════════ */
async function resendEmailOTP() {
  if (!currentOTPEmail) return;
  clearInterval(otpCountdownTimer);
  hideOTPError();
  currentGeneratedOTP = null;

  const resendBtn = document.getElementById('otp-resend-btn');
  if (resendBtn) resendBtn.disabled = true;

  // Clear OTP boxes
  document.querySelectorAll('.otp-box').forEach(b => { b.value = ''; b.classList.remove('filled','shake'); });

  try {
    const otp = generateOTP();
    currentGeneratedOTP = otp;

    // Save to Firestore
    if (emailOTPDb) {
      try {
        await emailOTPDb.collection('otp_codes').add({
          email: currentOTPEmail, otp, expiry: new Date(Date.now() + 5*60*1000)
        });
      } catch(fsErr) { console.warn('Firestore resave failed:', fsErr.message); }
    }

    // Resend email
    await sendViaEmailJS(currentOTPEmail, otp);

    startOTPCountdown(60);
    showToast('📧 New OTP sent to ' + currentOTPEmail);
    showOTPInfo('✅ New OTP sent! Check your inbox.');
  } catch(e) {
    console.error('Resend OTP error:', e);
    showOTPError('❌ Could not resend OTP. ' + (e.text || e.message || ''));
    if (resendBtn) resendBtn.disabled = false;
  }
}

/* ════════════════════════
   OTP UI HELPERS
════════════════════════ */
function showEmailStep2(email) {
  const s1   = document.getElementById('login-step1');
  const s2   = document.getElementById('email-step2');
  const disp = document.getElementById('otp-email-display');
  if (s1)   s1.style.display = 'none';
  if (s2)   { s2.style.display = 'block'; s2.style.animation = 'formIn .4s ease both'; }
  if (disp) disp.textContent = email;
  setTimeout(() => { const f = document.querySelector('.otp-box'); if (f) f.focus(); }, 200);
}

function resetLoginFlow() {
  const s1  = document.getElementById('login-step1');
  const s2  = document.getElementById('email-step2');
  if (s1) s1.style.display = 'block';
  if (s2) s2.style.display = 'none';
  document.querySelectorAll('#otp-boxes .otp-box').forEach(b => {
    b.value = ''; b.classList.remove('filled','shake');
  });
  currentOTPEmail     = '';
  currentGeneratedOTP = null;
  clearInterval(otpCountdownTimer);
  hideOTPError();
  const btn = document.getElementById('send-otp-btn');
  const txt = document.getElementById('send-otp-text');
  if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
  if (txt) txt.textContent = '📧 Get OTP';
}

/* Keep old name as alias */
function resetEmailOTPFlow() { resetLoginFlow(); }

/* OTP Box navigation with auto-verify */
function otpBoxNext(input, boxNum) {
  const boxes = document.querySelectorAll('.otp-box');
  const key   = event.key;

  if (key === 'Backspace') {
    input.value = '';
    input.classList.remove('filled');
    if (boxNum > 1) boxes[boxNum - 2].focus();
    return;
  }
  if (key === 'ArrowLeft' && boxNum > 1) { boxes[boxNum - 2].focus(); return; }
  if (key === 'ArrowRight' && boxNum < 6) { boxes[boxNum].focus(); return; }

  const val = input.value;
  if (val.length > 1) {
    const digits = val.replace(/\D/g,'').slice(0,6);
    boxes.forEach((b,i) => { b.value = digits[i]||''; b.classList.toggle('filled',!!digits[i]); });
    if (digits.length === 6) { setTimeout(()=>verifyEmailOTP(),300); }
    return;
  }
  if (/\d/.test(val)) {
    input.classList.add('filled');
    if (boxNum < 6) boxes[boxNum].focus();
    else { input.blur(); setTimeout(()=>verifyEmailOTP(),400); }
  } else {
    input.value = '';
    input.classList.remove('filled');
  }
}

/* Countdown timer */
function startOTPCountdown(seconds) {
  clearInterval(otpCountdownTimer);
  const countEl   = document.getElementById('otp-countdown');
  const timerEl   = document.getElementById('otp-timer');
  const resendBtn = document.getElementById('otp-resend-btn');

  let rem = seconds;
  if (countEl)   countEl.textContent = rem;
  if (resendBtn) resendBtn.disabled = true;
  if (timerEl)   { timerEl.innerHTML = 'Resend in <b id="otp-countdown">' + rem + '</b>s'; timerEl.classList.remove('expired'); }

  otpCountdownTimer = setInterval(() => {
    rem--;
    const cd = document.getElementById('otp-countdown');
    if (cd) cd.textContent = rem;
    if (rem <= 0) {
      clearInterval(otpCountdownTimer);
      if (timerEl)   { timerEl.textContent = "OTP expired. Request a new one."; timerEl.classList.add('expired'); }
      if (resendBtn) resendBtn.disabled = false;
    }
  }, 1000);
}

/* Error / Info helpers */
function showOTPError(msg) {
  const box = document.getElementById('otp-error-box');
  if (!box) return;
  box.textContent = msg;
  box.className = 'otp-error-box show';
}
function showOTPInfo(msg) {
  const box = document.getElementById('otp-error-box');
  if (!box) return;
  box.textContent = msg;
  box.className = 'otp-error-box show success-msg';
}
function hideOTPError() {
  const box = document.getElementById('otp-error-box');
  if (box) { box.textContent = ''; box.className = 'otp-error-box'; }
}

/* Shake OTP boxes on wrong code */
function shakeOTPBoxes() {
  document.querySelectorAll('.otp-box').forEach(b => {
    b.classList.remove('shake');
    void b.offsetWidth; // force reflow
    b.classList.add('shake');
    b.addEventListener('animationend', () => b.classList.remove('shake'), { once:true });
  });
}

/* Success overlay */
function showOTPSuccessOverlay(email) {
  const overlay = document.createElement('div');
  overlay.className = 'otp-success-overlay';
  overlay.innerHTML = `
    <div class="otp-success-circle">✓</div>
    <div class="otp-success-text">Email Verified!</div>
    <div class="otp-success-sub">${email}</div>
    <div class="otp-success-sub" style="margin-top:8px">Welcome to LootKart 🛍️</div>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 2500);
}

/* ════════════════════════════════════════════
   FIREBASE — Google Authentication
   Config: lootkart-cab67
════════════════════════════════════════════ */

const FB_CONFIG = {
  apiKey:            "AIzaSyCHO9Ehooazl_SjoU_-sMOByKBFPZ5cxDc",
  authDomain:        "lootkart-cab67.firebaseapp.com",
  projectId:         "lootkart-cab67",
  storageBucket:     "lootkart-cab67.firebasestorage.app",
  messagingSenderId: "572199200458",
  appId:             "1:572199200458:web:db6e5d941631941eff7633"
};

let fbApp  = null;
let fbAuth = null;
let googleProvider = null;

/* Detect if running inside a sandboxed iframe (CodePen, etc.) */
function isFirebaseSupported() {
  try {
    const proto = window.location.protocol;
    if (proto !== 'http:' && proto !== 'https:') return false;
    localStorage.setItem('_fb_test', '1');
    localStorage.removeItem('_fb_test');
    return true;
  } catch(e) {
    return false;
  }
}

function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK not loaded yet');
      return false;
    }
    if (!isFirebaseSupported()) {
      console.warn('Firebase Auth not supported in this environment (sandboxed iframe)');
      return false;
    }
    if (!firebase.apps.length) {
      fbApp = firebase.initializeApp(FB_CONFIG);
    } else {
      fbApp = firebase.app();
    }

    fbAuth = fbApp.auth();
    googleProvider = new firebase.auth.GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');

    fbAuth.onAuthStateChanged(firebaseUser => {
      if (firebaseUser) handleGoogleUser(firebaseUser);
    });

    fbAuth.getRedirectResult().then(result => {
      if (result && result.user) handleGoogleUser(result.user);
    }).catch(() => {});

    console.log('✅ Firebase initialized');
    return true;
  } catch(e) {
    console.error('Firebase init error:', e);
    return false;
  }
}

function handleGoogleUser(firebaseUser) {
  const users = S.users();
  const email = firebaseUser.email;
  const uid   = 'g_' + firebaseUser.uid.slice(0, 12);
  let existing = Object.values(users).find(u => u.email === email);
  if (!existing) {
    const name  = firebaseUser.displayName || 'Google User';
    const uname = (name.replace(/\s/g, '').toLowerCase().slice(0, 10)) + Math.floor(Math.random() * 100);
    const code  = uname.toUpperCase().slice(0, 6) + Math.floor(Math.random() * 100);
    existing = {
      id: uid, name, username: uname, email,
      phone: '', password: '', coins: 50, referralCode: code,
      avatar: firebaseUser.photoURL || '👤',
      joinDate: new Date().toLocaleDateString(),
      googleUID: firebaseUser.uid, loginMethod: 'google'
    };
    users[uid] = existing;
    S.saveU(users);
    showToast('🎉 Welcome to LootKart, ' + name.split(' ')[0] + '!');
  } else {
    existing.avatar    = firebaseUser.photoURL || existing.avatar || '👤';
    existing.googleUID = firebaseUser.uid;
    existing.loginMethod = 'google';
    users[existing.id] = existing;
    S.saveU(users);
    showToast('✅ Welcome back, ' + (existing.name || 'User').split(' ')[0] + '! 👋');
  }
  S.saveCur(existing);
  const avEl = document.getElementById('pav-img');
  if (avEl && existing.avatar && existing.avatar.startsWith('http')) {
    avEl.innerHTML = `<img src="${existing.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:22px" onerror="this.parentElement.textContent='👤'"/>`;
  }
  setTimeout(() => initApp(), 400);
}

/* ════════════════════════════════════════════════════
   GOOGLE SIGN-IN — Smart environment detection
   • Real browser / hosted site → Firebase popup
   • CodePen / sandboxed iframe  → Email OTP modal
════════════════════════════════════════════════════ */
async function signInGoogle() {

  /* ── If running in CodePen / sandboxed iframe ── */
  if (!isFirebaseSupported()) {
    showGoogleFallbackModal();
    return;
  }

  if (!fbAuth) {
    const ok = initFirebase();
    if (!ok) { showGoogleFallbackModal(); return; }
  }

  const resetBtns = () => {
    document.querySelectorAll('.google-btn').forEach(btn => {
      btn.disabled = false;
      const sp = btn.querySelector('span');
      if (sp) sp.textContent = btn.closest('#form-login') ? 'Sign in with Google' : 'Sign up with Google';
    });
  };

  document.querySelectorAll('.google-btn').forEach(btn => {
    btn.disabled = true;
    const sp = btn.querySelector('span');
    if (sp) sp.textContent = 'Connecting...';
  });
  hideOTPError();

  try {
    const result = await fbAuth.signInWithPopup(googleProvider);
    console.log('✅ Google Sign-In:', result.user.email);
    resetBtns();
  } catch(e) {
    console.warn('Google Sign-In error:', e.code);
    resetBtns();

    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;

    if (e.code === 'auth/operation-not-supported-in-this-environment' ||
        e.code === 'auth/unauthorized-domain' ||
        e.code === 'auth/popup-blocked') {
      showGoogleFallbackModal();
      return;
    }

    const msgs = {
      'auth/network-request-failed': '🌐 Network error.',
      'auth/too-many-requests':      '⏳ Too many attempts.',
      'auth/operation-not-allowed':  '⚠️ Google sign-in not enabled in Firebase Console.',
    };
    showOTPError(msgs[e.code] || ('❌ ' + (e.message || e.code)));
  }
}

/* ── Fallback modal for sandboxed environments ── */
function showGoogleFallbackModal() {
  // Remove existing
  const old = document.getElementById('gfm-overlay');
  if (old) old.remove();

  const ov = document.createElement('div');
  ov.id = 'gfm-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(5,2,20,.92);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .3s ease';
  ov.innerHTML = `
    <div style="background:rgba(14,7,38,.97);border:1.5px solid rgba(168,85,247,.3);border-radius:24px;padding:28px 24px;width:100%;max-width:360px;text-align:center;box-shadow:0 0 60px rgba(168,85,247,.2)">
      <div style="font-size:44px;margin-bottom:14px">🔐</div>
      <h3 style="font-size:18px;font-weight:900;color:#fff;font-family:'Exo 2',sans-serif;margin-bottom:8px">Google Sign-In</h3>
      <p style="font-size:13px;color:rgba(255,255,255,.5);margin-bottom:20px;line-height:1.6">
        Google Sign-In doesn't work inside CodePen's preview.<br/>
        <b style="color:#c084fc">Use Email OTP instead</b> — it works perfectly!
      </p>
      <div style="background:rgba(168,85,247,.1);border:1px solid rgba(168,85,247,.25);border-radius:14px;padding:14px;margin-bottom:18px;text-align:left">
        <div style="font-size:12px;font-weight:800;color:#c084fc;margin-bottom:8px">✅ How to use Email OTP:</div>
        <div style="font-size:12px;color:rgba(255,255,255,.6);line-height:1.8">
          1. Close this popup<br/>
          2. Enter your email below<br/>
          3. Click "Send OTP to Email"<br/>
          4. Enter the 6-digit code
        </div>
      </div>
      <p style="font-size:11px;color:rgba(255,255,255,.3);margin-bottom:16px">
        Hosting on Netlify/Vercel? Google Sign-In will work there ✓
      </p>
      <button onclick="document.getElementById('gfm-overlay').remove();document.getElementById('otp-email')&&document.getElementById('otp-email').focus();"
        style="width:100%;padding:13px;background:linear-gradient(135deg,#7c3aed,#a855f7);border:none;border-radius:13px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:'Nunito',sans-serif;box-shadow:0 0 22px rgba(168,85,247,.5)">
        ✉️ Use Email OTP Instead
      </button>
    </div>`;
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
}

/* ── Firebase Google Logout ── */
function signOutGoogle() {
  if (fbAuth) fbAuth.signOut().catch(() => {});
}

/* ── Stub ── */
async function handleGoogleRedirect() {}



/* ════════════════════════
   LOGIN
════════════════════════ */
function doLogin() {
  const raw  = (document.getElementById('l-id')   || {}).value?.trim() || '';
  const pass = (document.getElementById('l-pass') || {}).value?.trim() || '';

  if (!raw || !pass) { showToast('⚠️ Please fill both fields'); return; }

  const users = S.users();
  // Match by phone OR email
  const user = Object.values(users).find(u =>
    (u.phone === raw || u.email === raw || u.username === raw) && u.password === pass
  );

  if (!user) {
    showToast('❌ Invalid credentials — check phone/email and password');
    // Shake login button
    const btn = document.querySelector('#form-login .glow-btn');
    if (btn) { btn.style.animation = 'shake .4s ease'; btn.addEventListener('animationend', () => btn.style.animation = '', { once: true }); }
    return;
  }

  S.saveCur(user);
  showToast('✅ Welcome back, ' + (user.name || 'User').split(' ')[0] + '! 👋');
  setTimeout(() => initApp(), 400);
}

/* ════════════════════════
   SIGNUP
════════════════════════ */
/* ════════════════════════════════════════════
   SIGNUP — OTP VERIFICATION + CREATE ACCOUNT
════════════════════════════════════════════ */

let signupOTPTimer    = null;
let signupOTPGenerated = null;
let signupPendingData  = null;

function showSignupErr(msg) {
  const b1 = document.getElementById('signup-error-box');
  const b2 = document.getElementById('signup-otp-error');
  if (b1) { b1.textContent = msg; b1.style.display = msg ? 'block' : 'none'; }
  if (b2) { b2.textContent = msg; b2.style.display = msg ? 'block' : 'none'; }
}

/* Navigate between Create Account and Login panels */
function gotoExistingUser() {
  document.getElementById('signup-step1').style.display = 'none';
  document.getElementById('signup-step2').style.display = 'none';
  document.getElementById('login-panel').style.display  = 'block';
}
function gotoNewUser() {
  document.getElementById('login-panel').style.display  = 'none';
  document.getElementById('signup-step1').style.display = 'block';
  document.getElementById('signup-step2').style.display = 'none';
}

/* Step 1 → validate + send OTP */
async function sendSignupOTP() {
  showSignupErr('');

  const uname = (document.getElementById('r-uname') ||{}).value?.trim()||'';
  const phone = (document.getElementById('r-phone') ||{}).value?.trim()||'';
  const email = (document.getElementById('r-email') ||{}).value?.trim().toLowerCase()||'';
  const pass  = (document.getElementById('r-pass')  ||{}).value?.trim()||'';

  if (!uname)              { showSignupErr('⚠️ Choose a username'); return; }
  if (!phone)              { showSignupErr('⚠️ Enter your phone number'); return; }
  if (!email)              { showSignupErr('⚠️ Enter your email'); return; }
  if (!/\S+@\S+\.\S+/.test(email)) { showSignupErr('⚠️ Enter a valid email'); return; }
  if (!pass)               { showSignupErr('⚠️ Create a password'); return; }
  if (pass.length < 6)     { showSignupErr('⚠️ Password must be at least 6 characters'); return; }

  const users = S.users();
  if (Object.values(users).find(u => u.email === email)) {
    showSignupErr('⚠️ Email already registered — use Login with OTP');
    return;
  }

  signupPendingData = { name: uname, username: uname, email, phone, pass, ref: '' };

  const btn = document.getElementById('signup-otp-btn');
  const txt = document.getElementById('signup-otp-text');
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }
  if (txt) txt.textContent = 'Sending OTP...';

  if (!emailOTPDb) initEmailOTPFirebase();
  try {
    const otp = generateOTP();
    signupOTPGenerated = otp;

    if (emailOTPDb) {
      try {
        const oldQ = emailOTPDb.collection('otp_codes').where('email','==',email);
        const snap = await oldQ.get();
        const batch = emailOTPDb.batch();
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
        await emailOTPDb.collection('otp_codes').add({
          email, otp: otp.toString(),
          createdAt: Date.now(), expiresAt: Date.now() + 5*60*1000,
          type: 'signup'
        });
      } catch(e) { console.warn('Firestore OTP save:', e.message); }
    }

    await sendViaEmailJS(email, otp);

    document.getElementById('signup-step1').style.display = 'none';
    const s2 = document.getElementById('signup-step2');
    s2.style.display = 'block';
    s2.style.animation = 'formIn .4s ease both';
    const disp = document.getElementById('signup-email-display');
    if (disp) disp.textContent = email;

    startSignupCountdown(60);
    setTimeout(() => {
      const boxes = document.querySelectorAll('#signup-otp-boxes .otp-box');
      if (boxes[0]) boxes[0].focus();
    }, 200);

  } catch(e) {
    console.error('sendSignupOTP error:', e);
    let msg = '❌ Failed to send OTP. Check your email and try again.';
    if (e && e.text) msg = '❌ EmailJS: ' + e.text;
    showSignupErr(msg);
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
    if (txt) txt.textContent = '📧 Send OTP';
  }
}

/* OTP box navigation for signup */
function signupOtpNext(input, boxNum) {
  const boxes = document.querySelectorAll('#signup-otp-boxes .otp-box');
  const key   = event.key;
  if (key === 'Backspace') {
    input.value = '';
    input.classList.remove('filled');
    if (boxNum > 1) boxes[boxNum-2].focus();
    return;
  }
  if (!/^\d$/.test(key) && key !== 'Tab') { input.value = ''; return; }
  if (input.value) {
    input.classList.add('filled');
    if (boxNum < 6) boxes[boxNum].focus();
    const digits = [...boxes].map(b=>b.value).join('');
    if (digits.length === 6) setTimeout(() => verifySignupOTP(), 300);
  }
}

/* Step 2 → verify OTP + create account */
async function verifySignupOTP() {
  const boxes = document.querySelectorAll('#signup-otp-boxes .otp-box');
  const enteredOTP = [...boxes].map(b => b.value).join('');

  if (enteredOTP.length < 6) { showSignupErr('⚠️ Enter all 6 digits'); return; }
  if (!signupPendingData)    { showSignupErr('❌ Session expired. Go back and try again.'); return; }

  const btn = document.getElementById('create-account-btn');
  const txt = document.getElementById('create-account-text');
  if (btn) { btn.disabled = true; btn.classList.add('loading'); }
  if (txt) txt.textContent = 'Verifying...';

  let isValid = false;

  /* Check Firestore OTP */
  if (emailOTPDb) {
    try {
      const q = emailOTPDb.collection('otp_codes')
        .where('email','==', signupPendingData.email)
        .where('otp','==', enteredOTP);
      const snap = await q.get();
      if (!snap.empty) {
        const doc = snap.docs[0].data();
        if (Date.now() < doc.expiresAt) {
          isValid = true;
          snap.docs.forEach(d => d.ref.delete());
        } else {
          showSignupErr('⏰ OTP expired. Click Resend OTP.');
        }
      } else {
        /* Fallback to local OTP */
        if (signupOTPGenerated && parseInt(enteredOTP) === signupOTPGenerated) {
          isValid = true;
        } else {
          showSignupErr('❌ Wrong OTP. Try again.');
        }
      }
    } catch(e) {
      if (signupOTPGenerated && parseInt(enteredOTP) === signupOTPGenerated) {
        isValid = true;
      } else {
        showSignupErr('❌ Wrong OTP. Try again.');
      }
    }
  } else {
    if (signupOTPGenerated && parseInt(enteredOTP) === signupOTPGenerated) {
      isValid = true;
    } else {
      showSignupErr('❌ Wrong OTP. Try again.');
    }
  }

  if (isValid) {
    /* Create account — save to lk_users (admin reads this) */
    const { name, fname, lname, username, email, phone, pass, ref } = signupPendingData;
    const users = S.users();
    const id    = 'u_' + Date.now();
    const code  = (fname||'OPG').replace(/\s+/g,'').toUpperCase().slice(0,5) + Math.floor(Math.random()*10000);

    const newUser = {
      id,
      name,
      firstName: fname,
      lastName:  lname,
      username:  username,
      email,
      phone,
      password:  pass,
      coins:     50,
      referralCode: code,
      joinDate:  new Date().toLocaleDateString(),
      avatar:    '👤'
    };

    if (ref) {
      const referrer = Object.values(users).find(u => u.referralCode === ref);
      if (referrer) { referrer.coins = (referrer.coins||0) + 100; users[referrer.id] = referrer; }
    }

    users[id] = newUser;
    S.saveU(users);      /* saves to lk_users — admin dashboard reads this */
    S.saveCur(newUser);
    signupPendingData  = null;
    signupOTPGenerated = null;
    clearInterval(signupOTPTimer);

    showOTPSuccessOverlay(email);
    setTimeout(() => initApp(), 1800);
  } else {
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
    if (txt) txt.textContent = '✅ Verify OTP & Create Account';
    boxes.forEach(b => { b.classList.add('shake'); setTimeout(()=>b.classList.remove('shake'),500); });
  }
}

/* Countdown timer for signup OTP */
function startSignupCountdown(secs) {
  clearInterval(signupOTPTimer);
  const resendBtn = document.getElementById('signup-resend-btn');
  const countEl   = document.getElementById('signup-otp-countdown');
  const timerEl   = document.getElementById('signup-otp-timer');
  let remaining = secs;
  if (resendBtn) resendBtn.disabled = true;
  signupOTPTimer = setInterval(() => {
    remaining--;
    if (countEl) countEl.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(signupOTPTimer);
      if (timerEl)   timerEl.style.display = 'none';
      if (resendBtn) resendBtn.disabled = false;
    }
  }, 1000);
}

/* Resend OTP for signup */
async function resendSignupOTP() {
  if (!signupPendingData) return;
  const resendBtn = document.getElementById('signup-resend-btn');
  if (resendBtn) resendBtn.disabled = true;

  const { name, email } = signupPendingData;
  const otp = generateOTP();
  signupOTPGenerated = otp;

  try {
    if (emailOTPDb) {
      await emailOTPDb.collection('otp_codes').add({
        email, otp: otp.toString(),
        createdAt: Date.now(), expiresAt: Date.now() + 5*60*1000, type:'signup'
      });
    }
    await sendViaEmailJS(email, otp);
    showSignupErr('');
    const timerEl = document.getElementById('signup-otp-timer');
    if (timerEl) timerEl.style.display = '';
    startSignupCountdown(60);
    showToast('📧 New OTP sent!');
  } catch(e) {
    showSignupErr('❌ Failed to resend OTP. Try again.');
    if (resendBtn) resendBtn.disabled = false;
  }
}

/* Reset signup OTP flow back to step 1 */
function resetSignupOTPFlow() {
  const s1 = document.getElementById('signup-step1');
  const s2 = document.getElementById('signup-step2');
  if (s1) s1.style.display = 'block';
  if (s2) s2.style.display = 'none';
  document.querySelectorAll('#signup-otp-boxes .otp-box').forEach(b => {
    b.value = ''; b.classList.remove('filled','shake');
  });
  signupOTPGenerated = null;
  clearInterval(signupOTPTimer);
  showSignupErr('');
  const btn = document.getElementById('signup-otp-btn');
  const txt = document.getElementById('signup-otp-text');
  if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
  if (txt) txt.textContent = '📧 Get OTP';
}

/* Legacy doSignup kept as stub (replaced by OTP flow above) */
function doSignup() { sendSignupOTP(); }

function doLogout() {
  _lsRemove('lk_cur');
  CU = null;
  signOutGoogle();
  goS('s-auth');
  gotoNewUser(); /* always show Create Account on logout */
}

/* ════════════════════════
   APP INIT
════════════════════════ */
function initApp() {
  CU = S.cur();
  goS('s-app');
  updateUI();
  loadSlider();
  loadProducts();
  loadPartners();
  gotoSec('home');
  startCD();
  drawWheel();
  renderNotifsList();
  setInterval(() => { if (CU) { loadSlider(); loadProducts(); loadPartners(); pollAdminNotifs(); checkLatestPush(); } }, 5000);
}

/* ════════════════════════
   UI UPDATE
════════════════════════ */
function updateUI() {
  if (!CU) return;
  const c = CU.coins || 0;
  ['qs-c','rwd-coins','wallet-c','prof-coins'].forEach(id => {
    const el = document.getElementById(id);
    if (el) animNum(el, parseInt(el.textContent) || 0, c);
  });
  setEl('prof-n',  CU.name     || 'User');
  setEl('prof-ph', CU.phone    || '');
  setEl('prof-em', CU.email    || '');
  setEl('prof-un', CU.username ? '@' + CU.username : '');
  ['ref-code','prof-ref'].forEach(id => setEl(id, CU.referralCode || 'LKART01'));

  const today = new Date().toDateString();
  const cl    = _lsGet('lk_d_' + CU.id) === today;
  setEl('qs-d', cl ? '✅' : 'Claim');
  ['daily-btn','daily-btn2'].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.textContent = cl ? '✅ Claimed!' : 'Claim 10 🪙';
  });
}

function setEl(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

function animNum(el, from, to) {
  if (from === to) { el.textContent = to; return; }
  const step = (to - from) / 20; let cur = from;
  const t = setInterval(() => {
    cur += step;
    if ((step > 0 && cur >= to) || (step < 0 && cur <= to)) { el.textContent = Math.round(to); clearInterval(t); }
    else el.textContent = Math.round(cur);
  }, 30);
}

function addCoins(amt, lbl) {
  CU.coins = (CU.coins || 0) + amt;
  const u = S.users(); u[CU.id] = CU; S.saveU(u); S.saveCur(CU);
  const h = S.hist(CU.id);
  h.unshift({ lbl, amt, date: new Date().toLocaleString() });
  S.saveHist(CU.id, h.slice(0, 50));
  updateUI();
  showToast('🪙 +' + amt + ' coins! ' + lbl);

}

/* ════════════════════════
   BANNER SLIDER
════════════════════════ */
const DEF_SLIDES = [
  { id:'ds1', image:'', url:'#', label:'🔥 Today\'s Best Deals — Shop Now!', status:'on' },
  { id:'ds2', image:'', url:'#', label:'🎁 Spin & Win Up to ₹500 Off!',     status:'on' },
  { id:'ds3', image:'', url:'#', label:'🛍️ Refer Friends — Earn 100 Coins',  status:'on' },
];
const DEF_GRADS = [
  'linear-gradient(135deg,#4c1d95,#7c3aed,#db2777)',
  'linear-gradient(135deg,#1e1b4b,#7c3aed,#a855f7)',
  'linear-gradient(135deg,#831843,#a21caf,#7c3aed)',
];
const DEF_ICONS = ['🔥','🎁','🛍️'];
const DEF_SUBS  = ['Up to 80% off!','Win up to ₹500','Get 100 coins per referral'];

function loadSlider() {
  const active = S.sliders().filter(s => s.status === 'on');
  sliderSlides = active.length ? active : DEF_SLIDES;
  buildSlider();
}

function buildSlider() {
  const wrap  = document.getElementById('slider-wrap');
  const track = document.getElementById('slider-track');
  const dots  = document.getElementById('sl-dots');
  if (!wrap || !track || !dots) return;
  if (!sliderSlides.length) { wrap.classList.add('empty'); return; }
  wrap.classList.remove('empty');

  track.innerHTML = sliderSlides.map((s, i) => {
    if (s.image && s.image.trim()) {
      return `<div class="slide" onclick="slideClick('${s.url||'#'}')">
        <img class="slide-img" src="${s.image}" alt="${s.label||''}"
             onerror="this.parentElement.innerHTML='<div class=slide-fallback style=background:${DEF_GRADS[i%3]}><div class=sf-ico>${DEF_ICONS[i%3]}</div><div class=sf-text>${s.label||DEF_ICONS[i%3]}</div><div class=sf-sub>${DEF_SUBS[i%3]}</div></div>'"/>
        <div class="slide-overlay"></div>
        ${s.label ? `<div class="slide-label">${s.label}</div>` : ''}
      </div>`;
    } else {
      return `<div class="slide" onclick="slideClick('${s.url||'#'}')">
        <div class="slide-fallback" style="background:${DEF_GRADS[i%3]}">
          <div class="sf-ico">${DEF_ICONS[i%3]}</div>
          <div class="sf-text">${s.label || 'LootKart Deals'}</div>
          <div class="sf-sub">${DEF_SUBS[i%3]}</div>
        </div>
      </div>`;
    }
  }).join('');

  dots.innerHTML = sliderSlides.map((_, i) =>
    `<div class="sl-dot ${i===0?'active':''}" onclick="goSlide(${i})"></div>`
  ).join('');

  // Touch/swipe
  track.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX; isDragging = true;
    track.classList.add('dragging'); clearInterval(sliderTimer);
  }, { passive: true });
  track.addEventListener('touchmove', e => {
    if (!isDragging) return;
    touchDeltaX = e.touches[0].clientX - touchStartX;
    const base = -sliderIndex * 100;
    const drag = (touchDeltaX / wrap.offsetWidth) * 100;
    track.style.transform = `translateX(${base + drag}%)`;
  }, { passive: true });
  track.addEventListener('touchend', () => {
    isDragging = false; track.classList.remove('dragging');
    if (touchDeltaX < -50) sliderNext();
    else if (touchDeltaX > 50) sliderPrev();
    else goSlide(sliderIndex);
    touchDeltaX = 0; startSliderAuto();
  }, { passive: true });

  sliderIndex = 0; goSlide(0); startSliderAuto();
}

function goSlide(idx) {
  if (!sliderSlides.length) return;
  sliderIndex = (idx + sliderSlides.length) % sliderSlides.length;
  const track = document.getElementById('slider-track');
  if (track) track.style.transform = `translateX(${-sliderIndex * 100}%)`;
  document.querySelectorAll('.sl-dot').forEach((d, i) => d.classList.toggle('active', i === sliderIndex));
}
function sliderNext() { goSlide(sliderIndex + 1); }
function sliderPrev() { goSlide(sliderIndex - 1); }
function startSliderAuto() {
  clearInterval(sliderTimer);
  if (sliderSlides.length > 1) sliderTimer = setInterval(() => sliderNext(), 3500);
}
function slideClick(url) {
  if (url && url !== '#') window.open(url, '_blank');
}

/* ════════════════════════
   PRODUCTS
════════════════════════ */
const DEF = [
  { id:'d1', name:'Galaxy Smartwatch', image:'⌚', price:999,  discount:60, category:'electronics', link:'#', status:'on' },
  { id:'d2', name:'Wireless Earbuds',  image:'🎧', price:799,  discount:55, category:'electronics', link:'#', status:'on' },
  { id:'d3', name:'RGB Gaming Mouse',  image:'🖱️', price:199,  discount:75, category:'electronics', link:'#', status:'on' },
  { id:'d4', name:'JBL Speaker',       image:'🔊', price:899,  discount:45, category:'electronics', link:'#', status:'on' },
  { id:'d5', name:'Smart LED Strip',   image:'💡', price:499,  discount:50, category:'home',        link:'#', status:'on' },
  { id:'d6', name:'Running Shoes',     image:'👟', price:1299, discount:40, category:'sports',      link:'#', status:'on' },
];

function loadProducts() {
  const adminProds = S.prods().filter(p => p.status === 'on');

  if (adminProds.length > 0) {
    // Admin has products (including seeded DEFs) — use those, de-duplicate by id
    const seen = new Set();
    allProds = adminProds
      .filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; })
      .map(p => ({
        id: p.id, name: p.name,
        image: p.image || '🛍️',
        price: Number(p.price),
        discount: Number(p.discount) || 0,
        category: p.category || 'electronics',
        link: p.link || '#',
        status: 'on',
        clicks: p.clicks || 0
      }));
  } else {
    // Fallback to hard-coded DEF list (first load before admin opens)
    allProds = [...DEF];
  }

  setEl('qs-dn', allProds.length);
  renderHomeProds();
}

function pcHTML(p, i = 0) {
  const safeLink = (p.link || '#').replace(/'/g, "\\'");
  const safeName = (p.name || '').replace(/'/g, "\\'");
  return `<div class="p-card" style="animation-delay:${i*.06}s" onclick="buyProd('${safeLink}','${safeName}',${p.price||0})">
    <div class="p-img">${p.image || '🛍️'}<span class="disc-badge">${p.discount}% OFF</span></div>
    <div class="p-info">
      <div class="p-name">${p.name}</div>
      <div class="p-rat">⭐ 4.5 (2.1k)</div>
      <div class="p-row">
        <span class="p-price">₹${p.price.toLocaleString()}</span>
        <button class="buy-btn" onclick="event.stopPropagation();buyProd('${safeLink}','${safeName}',${p.price||0})">Buy Now</button>
      </div>
    </div>
  </div>`;
}

function renderHomeProds() { const el = document.getElementById('home-prods'); if (el) el.innerHTML = allProds.slice(0,6).map((p,i) => pcHTML(p,i)).join(''); }
function renderDeals(cat='all') { const el = document.getElementById('deals-prods'); if (!el) return; const l = cat==='all' ? allProds : allProds.filter(p => p.category===cat); el.innerHTML = l.length ? l.map((p,i) => pcHTML(p,i)).join('') : '<p style="text-align:center;color:var(--sub);grid-column:1/-1;padding:28px">No products found</p>'; }
function filterD(btn, cat) { document.querySelectorAll('.ft').forEach(t => t.classList.remove('active')); btn.classList.add('active'); renderDeals(cat); }
function buyProd(link, name, price) {
  // Track click in admin storage + in-memory allProds
  const prods = S.prods();
  const idx = prods.findIndex(p => p.link === link && p.link !== '#');
  if (idx > -1) {
    prods[idx].clicks = (prods[idx].clicks || 0) + 1;
    _lsSet('opg_admin_products', JSON.stringify(prods));
    // Update in-memory
    const memIdx = allProds.findIndex(p => p.link === link && p.link !== '#');
    if (memIdx > -1) allProds[memIdx].clicks = prods[idx].clicks;
  }

  if (link && link !== '#' && link !== '') {
    // Real affiliate link — open it
    showToast('🛍️ Opening deal... You earn coins on purchase!');
    setTimeout(() => window.open(link, '_blank'), 300);
    // Reward coins for clicking
    if (CU) addCoins(2, 'Product Click Reward 🛍️');
  } else {
    // No link — show buy modal
    showBuyModal(name || 'This Product', price || 0);
  }
}

function showBuyModal(name, price) {
  // Remove existing modal if any
  const old = document.getElementById('buy-modal-overlay');
  if (old) old.remove();

  const ov = document.createElement('div');
  ov.id = 'buy-modal-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(10px);z-index:9990;display:flex;align-items:flex-end;justify-content:center';
  ov.innerHTML = `
    <div style="background:rgba(9,4,30,.97);border:1.5px solid rgba(168,85,247,.3);border-radius:28px 28px 0 0;padding:26px 22px 36px;width:100%;max-width:420px;animation:mSlide .4s cubic-bezier(.34,1.56,.64,1)">
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:48px;margin-bottom:10px">🛍️</div>
        <h3 style="font-size:18px;font-weight:900;color:#fff;font-family:'Exo 2',sans-serif;margin-bottom:6px">${name}</h3>
        <p style="font-size:13px;color:rgba(255,255,255,.5)">₹${Number(price).toLocaleString()} · Add affiliate link in Admin Panel to enable direct purchase</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
        <button onclick="document.getElementById('buy-modal-overlay').remove()"
          style="padding:13px;background:rgba(168,85,247,.15);border:1.5px solid rgba(168,85,247,.3);border-radius:13px;color:#c084fc;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;cursor:pointer">
          ← Go Back
        </button>
        <button onclick="document.getElementById('buy-modal-overlay').remove();gotoSec('stores')"
          style="padding:13px;background:linear-gradient(135deg,#7c3aed,#a855f7);border:none;border-radius:13px;color:#fff;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 0 18px rgba(168,85,247,.5)">
          🛒 Browse Stores
        </button>
      </div>
    </div>`;
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
}
function searchProds(q) { const el = document.getElementById('home-prods'); if (!el) return; if (!q) { renderHomeProds(); return; } const r = allProds.filter(p => p.name.toLowerCase().includes(q.toLowerCase())); el.innerHTML = r.length ? r.map((p,i) => pcHTML(p,i)).join('') : '<p style="color:var(--sub);grid-column:1/-1;text-align:center;padding:20px">No results for "'+q+'"</p>'; }

/* ════════════════════════
   PARTNERS
════════════════════════ */
const DEF_PARTNERS = [
  { id:'dp1', name:'Amazon',  image:'📦', description:'World\'s largest online store',  link:'https://amazon.in',  status:'on' },
  { id:'dp2', name:'Flipkart',image:'🏬', description:'India\'s biggest marketplace',    link:'https://flipkart.com',status:'on' },
  { id:'dp3', name:'Ajio',    image:'👗', description:'Fashion & lifestyle deals',        link:'https://ajio.com',   status:'on' },
  { id:'dp4', name:'Myntra',  image:'👠', description:'Top fashion brands',               link:'https://myntra.com', status:'on' },
];

function loadPartners() {
  const adminP = S.partners().filter(p => p.status === 'on');
  const all = [...DEF_PARTNERS, ...adminP];
  renderHomePartners(all);
}

function renderHomePartners(partners) {
  const el = document.getElementById('home-partners');
  if (!el) return;
  el.innerHTML = (partners || []).map((p, i) => `
    <div class="ps-item" style="animation-delay:${i*.08}s" onclick="openPartner('${p.link}','${p.name}')">
      <div class="ps-img">${p.image}</div>
      <div class="ps-name">${p.name}</div>
      <div class="ps-link">Shop Now</div>
    </div>`).join('');
}

function renderPartnersPage() {
  const el = document.getElementById('partners-grid');
  if (!el) return;
  const adminP = S.partners().filter(p => p.status === 'on');
  const all = [...DEF_PARTNERS, ...adminP];
  el.innerHTML = all.map((p, i) => `
    <div class="pg-item" style="animation-delay:${i*.08}s">
      <div class="pgi-top">${p.image}</div>
      <div class="pgi-info">
        <div class="pgi-name">${p.name}</div>
        <div class="pgi-desc">${p.description || 'Exclusive deals available'}</div>
        <button class="pgi-btn" onclick="openPartner('${p.link}','${p.name}')">Shop Now →</button>
      </div>
    </div>`).join('');
}
function openPartner(link, name) { if (link && link !== '#') window.open(link, '_blank'); else showToast('🤝 Opening ' + name + '...'); }

/* ════════════════════════
   DAILY CLAIM
════════════════════════ */
function claimDaily() {
  if (!CU) return;
  const today = new Date().toDateString();
  const key   = 'lk_d_' + CU.id;
  if (_lsGet(key, null) === today) { showToast('✅ Already claimed today! Come back tomorrow 🌙'); return; }
  _lsSet(key, today);
  addCoins(10, 'Daily Login Reward 🎁');
  ['daily-btn','daily-btn2'].forEach(id => { const b = document.getElementById(id); if (b) { b.textContent = '✅ Claimed!'; b.style.background = 'rgba(0,230,160,.3)'; } });
  setEl('qs-d', '✅');
}

/* ════════════════════════
   REWARDS PAGE
════════════════════════ */
function renderRwdPage() {
  const el = document.getElementById('coins-hist');
  if (!el || !CU) return;
  const h = S.hist(CU.id);
  el.innerHTML = h.length
    ? h.slice(0,12).map(x => `<div class="ch-item"><div class="chi-ico">🪙</div><div class="chi-info"><h4>${x.lbl}</h4><p>${x.date}</p></div><div class="chi-amt">+${x.amt}</div></div>`).join('')
    : '<div class="empty-b"><div>🪙</div><p>No coin history yet</p></div>';
}

/* ════════════════════════
   NOTIFICATIONS
════════════════════════ */
function renderNotifsList() {
  const el = document.getElementById('notifs-list');
  if (!el) return;
  const notifs = S.notifs();
  if (!notifs.length) { el.innerHTML = ''; return; }
  el.innerHTML = notifs.slice(0,5).map(n =>
    `<div class="ni"><div class="ni-i" style="background:rgba(168,85,247,.2)">🔔</div><div class="ni-t"><h4>${n.title}</h4><p>${n.message}</p><span class="nt">${n.date}</span></div></div>`
  ).join('');
  const cnt   = document.getElementById('notif-cnt');
  const badge = document.getElementById('prof-notif-badge');
  if (cnt)   cnt.textContent   = notifs.length;
  if (badge) badge.textContent = notifs.length;
}

function pollAdminNotifs() {
  const notifs   = S.notifs();
  const lastSeen = parseInt(_lsGet('lk_last_notif','0'));
  const fresh    = notifs.filter(n => parseInt(n.id.replace('n_','')) > lastSeen);
  if (fresh.length) {
    sendLocalNotif({ title: fresh[0].title, body: fresh[0].message });
    _lsSet('lk_last_notif', fresh[0].id.replace('n_',''));
    renderNotifsList();
  }
}

function checkLatestPush() {
  const raw = _lsGet('lk_push_latest', null);
  if (!raw) return;
  try {
    const notif = JSON.parse(raw);
    if (_lsGet('lk_push_seen_'+notif.id, null)) return;
    _lsSet('lk_push_seen_'+notif.id,'1');
    _lsRemove('lk_push_latest');
    renderNotifsList();
    sendLocalNotif({ title: notif.title, body: notif.message });
  } catch(e) {}
}

/* ════════════════════════
   SPIN WHEEL
════════════════════════ */
function drawWheel(rot = 0) {
  const c = document.getElementById('sw-canvas'); if (!c) return;
  const ctx = c.getContext('2d'), cx = 120, cy = 120, r = 112, arc = (2*Math.PI)/PRIZES.length;
  ctx.clearRect(0, 0, 240, 240);
  PRIZES.forEach((pr, i) => {
    const s = rot + i * arc, e = s + arc;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, s, e);
    ctx.fillStyle = PCOLORS[i]; ctx.fill();
    ctx.strokeStyle = 'rgba(200,150,255,.25)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(s + arc/2);
    ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Nunito,sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 4;
    ctx.fillText('🪙' + pr, r - 10, 5); ctx.restore();
  });
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2*Math.PI); ctx.strokeStyle = 'rgba(196,132,252,.5)'; ctx.lineWidth = 3; ctx.stroke();
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 22);
  grd.addColorStop(0, '#09041e'); grd.addColorStop(1, '#1a0540');
  ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 2*Math.PI); ctx.fillStyle = grd; ctx.fill();
  ctx.strokeStyle = 'rgba(196,132,252,.5)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#c084fc'; ctx.font = 'bold 9px Nunito,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowBlur = 0; ctx.fillText('SPIN', cx, cy);
}

function openSpin() { document.getElementById('spin-modal').classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function doSpin() {
  if (isSpinning) return;
  isSpinning = true; document.getElementById('spin-btn').disabled = true;
  const extra = 5*2*Math.PI + Math.random()*2*Math.PI, total = spinRot + extra, dur = 4200, st = performance.now(), sR = spinRot;
  const anim = now => {
    const el = now - st, pr = Math.min(el/dur, 1), ease = 1 - Math.pow(1-pr, 3);
    drawWheel(sR + extra * ease);
    if (pr < 1) { requestAnimationFrame(anim); return; }
    spinRot = total % (2*Math.PI);
    const arc = (2*Math.PI)/PRIZES.length, ptr = (3*Math.PI/2 - spinRot + 2*Math.PI) % (2*Math.PI);
    const won = PRIZES[Math.floor(ptr/arc) % PRIZES.length];
    isSpinning = false; document.getElementById('spin-btn').disabled = false;
    addCoins(won, 'Spin & Win 🎡'); confettiBurst(); setTimeout(() => showToast('🎊 You won ' + won + ' coins!'), 200);
  };
  requestAnimationFrame(anim);
}

/* ════════════════════════
   CONFETTI
════════════════════════ */
function confettiBurst() {
  const colors = ['#a855f7','#c084fc','#ffd700','#ff4466','#00e89e','#7c3aed','#f9a8d4'];
  if (!document.getElementById('cstyle')) {
    const s = document.createElement('style'); s.id = 'cstyle';
    s.textContent = '@keyframes cfly{0%{transform:translate(0,0) rotate(0deg);opacity:1}100%{transform:translate(var(--cx),var(--cy)) rotate(var(--cr));opacity:0}}';
    document.head.appendChild(s);
  }
  for (let i = 0; i < 60; i++) {
    const d = document.createElement('div');
    const cx = (Math.random()-.5)*400, cy = 200+Math.random()*300, cr = (360+Math.random()*360)+'deg';
    d.style.cssText = `position:fixed;z-index:9999;pointer-events:none;width:${6+Math.random()*6}px;height:${6+Math.random()*6}px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${Math.random()>.5?'50%':'2px'};left:${30+Math.random()*40}%;top:40%;--cx:${cx}px;--cy:${cy}px;--cr:${cr};animation:cfly ${1+Math.random()*1.5}s ease-out forwards`;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 3000);
  }
}

/* ════════════════════════
   COUNTDOWN
════════════════════════ */
function startCD() {
  if (cdTimer) clearInterval(cdTimer);
  let t = 4*3600 + 23*60;
  const upd = () => {
    const h = Math.floor(t/3600), m = Math.floor((t%3600)/60), s = t%60;
    updCD('cd-h', h.toString().padStart(2,'0'));
    updCD('cd-m', m.toString().padStart(2,'0'));
    updCD('cd-s', s.toString().padStart(2,'0'));
    if (t <= 0) t = 24*3600; else t--;
  };
  upd(); cdTimer = setInterval(upd, 1000);
}
function updCD(id, v) {
  const el = document.getElementById(id); if (!el) return;
  if (el.textContent !== v) { el.classList.add('flip'); el.textContent = v; el.addEventListener('animationend', () => el.classList.remove('flip'), { once: true }); }
}

/* ════════════════════════
   UTILS
════════════════════════ */
function storeClick(n) { showToast('🛒 Opening ' + n + '...'); }
function copyCode() { const c = CU?.referralCode || 'LKART01'; navigator.clipboard.writeText(c).catch(() => {}); showToast('📋 Copied: ' + c); }
function doWithdraw() { if ((CU?.coins||0) < 1000) { showToast('⚠️ Need at least 1000 coins'); return; } showToast('💸 Withdrawal request submitted!'); }
function openEditModal() {
  const dn  = document.getElementById('e-name');
  const dun = document.getElementById('e-uname');
  const dem = document.getElementById('e-email');
  if (dn)  dn.value  = CU?.name     || '';
  if (dun) dun.value = CU?.username || '';
  if (dem) dem.value = CU?.email    || '';
  document.getElementById('edit-modal').classList.add('open');
}
function saveEdit() {
  if (!CU) return;
  const n  = (document.getElementById('e-name')  ||{}).value?.trim();
  const un = (document.getElementById('e-uname') ||{}).value?.trim();
  const em = (document.getElementById('e-email') ||{}).value?.trim();
  if (n)  CU.name     = n;
  if (un) CU.username = un;
  if (em) CU.email    = em;
  const u = S.users(); u[CU.id] = CU; S.saveU(u); S.saveCur(CU);
  updateUI(); closeModal('edit-modal'); showToast('✅ Profile updated!');
}
function ripple(btn) {
  const r = document.createElement('div');
  r.style.cssText = 'position:absolute;border-radius:50%;background:rgba(255,255,255,.4);width:8px;height:8px;animation:ripOut .5s ease-out forwards;left:50%;top:50%;transform:translate(-50%,-50%)';
  btn.style.position = 'relative'; btn.style.overflow = 'hidden';
  btn.appendChild(r); setTimeout(() => r.remove(), 600);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 3000);
}

/* ════════════════════════
   GLOBAL KEYFRAMES
════════════════════════ */
const _gs = document.createElement('style');
_gs.textContent = `
  @keyframes ripOut{to{transform:translate(-50%,-50%) scale(20);opacity:0}}
  @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}
`;
document.head.appendChild(_gs);

/* ════════════════════════
   PASSWORD STRENGTH WATCHER
════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const rp = document.getElementById('r-pass');
  if (rp) rp.addEventListener('input', () => checkPwStrength(rp.value));
});

/* ════════════════════════
   BOOT
════════════════════════ */
window.addEventListener('load', () => {
  initParticles();
  initCursor();
  drawWheel();
  // Init Firebase and EmailJS after SDKs fully load
  setTimeout(() => {
    initFirebase();
    initEmailOTPFirebase();
    initEmailJS();
  }, 800);
  // Retry EmailJS in case SDK loaded late
  setTimeout(() => {
    if (!emailJSReady) initEmailJS();
  }, 2500);

  // Try real storage first, then in-memory fallback
  let saved = null;
  try { saved = S.cur(); } catch(e) { /* blocked */ }
  if (!saved && _mem['lk_cur']) {
    try { saved = JSON.parse(_mem['lk_cur']); } catch(e) {}
  }
  if (saved) {
    CU = saved;
    initApp();
  } else {
    goS('s-auth');
    gotoNewUser();  // Show Create Account form
  }
});
