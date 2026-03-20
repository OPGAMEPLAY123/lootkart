/* ═══════════════════════════════════════════════════════════════
   LOOTKART USER PANEL — app.js
   ✅ Digit-by-digit code reveal replaces all email OTP steps
   ✅ After correct verify → opens dashboard instantly
   ✅ Full app logic preserved
═══════════════════════════════════════════════════════════════ */
'use strict';

/* ── GLOBAL STATE ── */
let CU         = null;
let allProds   = [], spinRot = 0, isSpinning = false, cdTimer = null;
let sliderIndex = 0, sliderTimer = null, sliderSlides = [];
let touchStartX = 0, touchDeltaX = 0, isDragging = false;

const PRIZES  = [10, 25, 5, 50, 15, 100, 20, 30];
const PCOLORS = ['#7c3aed','#9333ea','#a855f7','#b865f8','#c084fc','#8b44f7','#a03af7','#9040f0'];

/* ══════════════════════════════════════════════════════
   SAFE STORAGE — localStorage with in-memory fallback
══════════════════════════════════════════════════════ */
const _mem = {};
function _lsGet(k, d) { try { const v = localStorage.getItem(k); return v !== null ? v : d; } catch(e) { return k in _mem ? _mem[k] : d; } }
function _lsSet(k, v) { try { localStorage.setItem(k, v); } catch(e) { _mem[k] = v; } }
function _lsRemove(k) { try { localStorage.removeItem(k); } catch(e) { delete _mem[k]; } }

const S = {
  users:    ()  => JSON.parse(_lsGet('lk_users',  '{}')),
  saveU:    (u) => _lsSet('lk_users',  JSON.stringify(u)),
  cur:      ()  => JSON.parse(_lsGet('lk_cur',    'null')),
  saveCur:  (u) => { _lsSet('lk_cur', JSON.stringify(u)); CU = u; },
  prods:    ()  => JSON.parse(_lsGet('opg_admin_products', '[]')),
  partners: ()  => JSON.parse(_lsGet('lk_partners', '[]')),
  sliders:  ()  => JSON.parse(_lsGet('lk_sliders',  '[]')),
  hist:     (id)=> JSON.parse(_lsGet('lk_h_' + id, '[]')),
  saveHist: (id, h) => _lsSet('lk_h_' + id, JSON.stringify(h)),
  notifs:   ()  => JSON.parse(_lsGet('opg_notifs', '[]')),
};

/* ══════════════════════════════════════════════════════
   DIGIT-REVEAL VERIFY SYSTEM
   ─────────────────────────────────────────────────────
   • Generates a 6-digit code
   • Shows digits ONE BY ONE with pop animation (1.4s each)
   • Previous digit fades before next appears
   • After reveal → shows OTP input boxes
   • 10s resend countdown
   • Correct code → success overlay → dashboard
══════════════════════════════════════════════════════ */

/* Internal state for each flow */
const _v = {
  signup: { code: '', timers: [], resendTimer: null },
  login:  { code: '', timers: [], resendTimer: null },
};

function _genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/* ── Core reveal runner ── */
function _runReveal(prefix, code, onDone) {
  /* prefix = 'su' (signup) or 'ln' (login) */
  const dispEl  = document.getElementById(prefix + '-digit-display');
  const posEl   = document.getElementById(prefix + '-digit-pos');
  const fillEl  = document.getElementById(prefix + '-rpb-fill');
  const entryEl = document.getElementById(prefix === 'su' ? 'su-entry' : 'ln-entry');
  const flow    = prefix === 'su' ? _v.signup : _v.login;

  /* Reset */
  flow.timers.forEach(t => clearTimeout(t));
  flow.timers = [];
  if (dispEl)  { dispEl.textContent = ''; dispEl.className = 'digit-display'; }
  if (posEl)   posEl.textContent = '';
  if (fillEl)  fillEl.style.width = '0%';
  if (entryEl) entryEl.style.display = 'none';

  const digits = code.split('');

  digits.forEach((digit, idx) => {
    const SHOW_AT = idx * 1400;
    const FADE_AT = SHOW_AT + 950;

    /* Show digit */
    const tShow = setTimeout(() => {
      if (!dispEl) return;

      /* Fade out previous */
      dispEl.classList.remove('pop');
      if (idx > 0) {
        dispEl.classList.add('out');
        setTimeout(() => {
          dispEl.classList.remove('out');
          _showDigit(dispEl, posEl, fillEl, digit, idx, digits.length);
        }, 200);
      } else {
        _showDigit(dispEl, posEl, fillEl, digit, idx, digits.length);
      }
    }, SHOW_AT);

    flow.timers.push(tShow);
  });

  /* After all digits — show entry */
  const tDone = setTimeout(() => {
    if (dispEl) {
      dispEl.classList.add('out');
      setTimeout(() => { dispEl.textContent = ''; dispEl.className = 'digit-display'; }, 230);
    }
    if (posEl)  posEl.textContent = '';
    if (fillEl) fillEl.style.width = '100%';

    setTimeout(() => {
      if (entryEl) {
        entryEl.style.display = 'block';
        entryEl.style.animation = 'formIn .4s ease both';
      }
      /* focus first box */
      const firstBox = entryEl && entryEl.querySelector('.otp-box');
      if (firstBox) firstBox.focus();
      if (onDone) onDone();
    }, 350);
  }, digits.length * 1400 + 200);

  flow.timers.push(tDone);
}

function _showDigit(dispEl, posEl, fillEl, digit, idx, total) {
  dispEl.textContent = digit;
  void dispEl.offsetWidth;
  dispEl.classList.add('pop');
  if (posEl)  posEl.textContent = `Digit ${idx + 1} of ${total}`;
  if (fillEl) fillEl.style.width = `${((idx + 1) / total) * 100}%`;
}

/* ── Resend countdown ── */
function _startResend(prefix, seconds) {
  const flow     = prefix === 'su' ? _v.signup : _v.login;
  const countId  = prefix + '-countdown';
  const timerId  = prefix + '-resend-timer';
  const btnId    = prefix + '-resend-btn';

  clearInterval(flow.resendTimer);

  const countEl  = document.getElementById(countId);
  const timerEl  = document.getElementById(timerId);
  const resendEl = document.getElementById(btnId);

  if (resendEl) resendEl.disabled = true;
  if (timerEl)  { timerEl.innerHTML = `Resend in <b id="${countId}">${seconds}</b>s`; timerEl.className = 'resend-timer'; }

  let rem = seconds;
  flow.resendTimer = setInterval(() => {
    rem--;
    const cd = document.getElementById(countId);
    if (cd) cd.textContent = rem;
    if (rem <= 0) {
      clearInterval(flow.resendTimer);
      if (timerEl)  { timerEl.textContent = 'Code expired.'; timerEl.className = 'resend-timer expired'; }
      if (resendEl) resendEl.disabled = false;
    }
  }, 1000);
}

/* ── Show / hide error ── */
function _showErr(id, msg, isSuccess) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'otp-error-box show' + (isSuccess ? ' success-msg' : '');
}
function _hideErr(id) {
  const el = document.getElementById(id);
  if (el) el.className = 'otp-error-box';
}

/* ── OTP box navigation ── */
function _otpNav(input, boxNum, boxes, autoFn) {
  const val = input.value;
  if (val.length > 1) {
    const digits = val.replace(/\D/g,'').slice(0,6);
    boxes.forEach((b,i) => { b.value = digits[i]||''; b.classList.toggle('filled',!!digits[i]); });
    if (digits.length === 6) setTimeout(autoFn, 300);
    return;
  }
  if (/\d/.test(val)) {
    input.classList.add('filled');
    if (boxNum < 6) boxes[boxNum].focus();
    else { input.blur(); const all = Array.from(boxes).map(b=>b.value).join(''); if (all.length===6) setTimeout(autoFn,350); }
  } else { input.value = ''; input.classList.remove('filled'); }
}
function _otpBack(input, boxNum, boxes, e) {
  if (e.key === 'Backspace' && !input.value && boxNum > 1) { boxes[boxNum-2].value=''; boxes[boxNum-2].classList.remove('filled'); boxes[boxNum-2].focus(); }
  if (e.key === 'ArrowLeft'  && boxNum > 1) boxes[boxNum-2].focus();
  if (e.key === 'ArrowRight' && boxNum < 6) boxes[boxNum].focus();
}

/* ── Shake boxes ── */
function _shakeBoxes(selector) {
  document.querySelectorAll(selector).forEach(b => {
    b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
    b.addEventListener('animationend', () => b.classList.remove('shake'), {once:true});
  });
}

/* ══════════════════════════════════════════════════════
   SUCCESS OVERLAY → then open dashboard
══════════════════════════════════════════════════════ */
function _showSuccessAndGo(title, sub) {
  const ov = document.createElement('div');
  ov.className = 'verify-success-overlay';
  ov.innerHTML = `
    <div class="vso-circle">✓</div>
    <div class="vso-text">${title}</div>
    <div class="vso-sub">${sub}</div>
  `;
  document.body.appendChild(ov);
  confettiBurst();
  setTimeout(() => {
    if (ov.parentNode) ov.remove();
    initApp();  /* ← Opens the dashboard */
  }, 1600);
}

/* ══════════════════════════════════════════════════════
   SIGNUP FLOW
══════════════════════════════════════════════════════ */

/* Step 1 → validate fields → start reveal */
function startSignupVerify() {
  _hideErr('signup-error-box');

  const uname = (document.getElementById('r-uname')||{}).value?.trim()||'';
  const phone = (document.getElementById('r-phone')||{}).value?.trim()||'';
  const email = (document.getElementById('r-email')||{}).value?.trim().toLowerCase()||'';
  const pass  = (document.getElementById('r-pass') ||{}).value?.trim()||'';

  if (!uname)                   { _showErr('signup-error-box','⚠️ Choose a username'); return; }
  if (!phone)                   { _showErr('signup-error-box','⚠️ Enter your phone number'); return; }
  if (!email)                   { _showErr('signup-error-box','⚠️ Enter your email'); return; }
  if (!/\S+@\S+\.\S+/.test(email)) { _showErr('signup-error-box','⚠️ Enter a valid email'); return; }
  if (!pass)                    { _showErr('signup-error-box','⚠️ Create a password'); return; }
  if (pass.length < 6)          { _showErr('signup-error-box','⚠️ Password must be at least 6 characters'); return; }

  const users = S.users();
  if (Object.values(users).find(u => u.email === email)) {
    _showErr('signup-error-box','⚠️ Email already registered — use Login');
    return;
  }

  /* Store pending data */
  _v.signup._pending = { uname, phone, email, pass };

  /* Show step 2 */
  document.getElementById('signup-step1').style.display = 'none';
  const s2 = document.getElementById('signup-step2');
  s2.style.display = 'block';
  s2.style.animation = 'formIn .4s ease both';

  /* Clear boxes */
  document.querySelectorAll('#signup-otp-boxes .otp-box').forEach(b => { b.value=''; b.classList.remove('filled','shake'); });
  _hideErr('signup-otp-error');

  /* Generate + reveal code */
  _v.signup.code = _genCode();
  console.log('🔐 Signup code:', _v.signup.code); /* Dev helper — remove in production */

  _runReveal('su', _v.signup.code, () => {
    _startResend('su', 10);
  });
}

/* OTP box handlers for signup */
function signupOtpNext(input, boxNum) {
  const boxes = document.querySelectorAll('#signup-otp-boxes .otp-box');
  _otpNav(input, boxNum, boxes, verifySignupCode);
}
function signupOtpBack(input, boxNum, e) {
  const boxes = document.querySelectorAll('#signup-otp-boxes .otp-box');
  _otpBack(input, boxNum, boxes, e);
}

/* Verify signup code */
function verifySignupCode() {
  _hideErr('signup-otp-error');

  const boxes      = document.querySelectorAll('#signup-otp-boxes .otp-box');
  const enteredOTP = Array.from(boxes).map(b => b.value).join('');

  if (enteredOTP.length !== 6) {
    _showErr('signup-otp-error','⚠️ Please enter all 6 digits');
    _shakeBoxes('#signup-otp-boxes .otp-box');
    return;
  }

  /* Loading state */
  const btn = document.getElementById('su-verify-btn');
  const txt = document.getElementById('su-verify-text');
  if (btn) { btn.disabled = true; }
  if (txt) txt.innerHTML = '<div class="btn-spin"></div> Verifying…';

  setTimeout(() => {
    if (enteredOTP === _v.signup.code) {
      /* ✅ CORRECT — create account + open dashboard */
      const { uname, phone, email, pass } = _v.signup._pending || {};
      const users = S.users();
      const id    = 'u_' + Date.now();
      const code  = uname.toUpperCase().slice(0,5) + Math.floor(Math.random()*10000);

      const newUser = {
        id, name: uname, username: uname,
        email, phone, password: pass,
        coins: 50, referralCode: code,
        joinDate: new Date().toLocaleDateString(), avatar: '👤'
      };
      users[id] = newUser;
      S.saveU(users);
      S.saveCur(newUser);

      _v.signup.timers.forEach(t => clearTimeout(t));
      clearInterval(_v.signup.resendTimer);

      _showSuccessAndGo('Account Created! 🎉', 'Welcome to LootKart 🛍️');
    } else {
      /* ❌ WRONG */
      if (btn) btn.disabled = false;
      if (txt) txt.innerHTML = '✅ Verify &amp; Create Account';
      _showErr('signup-otp-error','❌ Wrong code. Check the digits and try again.');
      _shakeBoxes('#signup-otp-boxes .otp-box');
      boxes.forEach(b => { b.value=''; b.classList.remove('filled'); });
      if (boxes[0]) boxes[0].focus();
    }
  }, 500);
}

/* Resend signup code */
function resendSignupCode() {
  _v.signup.timers.forEach(t => clearTimeout(t));
  _v.signup.code = _genCode();
  console.log('🔐 Resent signup code:', _v.signup.code);
  document.querySelectorAll('#signup-otp-boxes .otp-box').forEach(b => { b.value=''; b.classList.remove('filled','shake'); });
  document.getElementById('su-entry').style.display = 'none';
  _hideErr('signup-otp-error');

  const btn = document.getElementById('su-verify-btn');
  const txt = document.getElementById('su-verify-text');
  if (btn) { btn.disabled = false; }
  if (txt) txt.innerHTML = '✅ Verify &amp; Create Account';

  _runReveal('su', _v.signup.code, () => { _startResend('su', 10); });
}

/* Reset signup back to step 1 */
function resetSignupFlow() {
  _v.signup.timers.forEach(t => clearTimeout(t));
  clearInterval(_v.signup.resendTimer);
  document.getElementById('signup-step1').style.display = 'block';
  document.getElementById('signup-step2').style.display = 'none';
  document.getElementById('su-entry').style.display = 'none';
  _hideErr('signup-error-box');
  _hideErr('signup-otp-error');

  const btn = document.getElementById('signup-next-btn');
  const txt = document.getElementById('signup-next-text');
  if (btn) btn.disabled = false;
  if (txt) txt.textContent = '🔐 Verify Code';
}

/* ══════════════════════════════════════════════════════
   LOGIN FLOW
══════════════════════════════════════════════════════ */

/* Step 1 → validate email → start reveal */
function startLoginVerify() {
  _hideErr('login-error-box');

  const email = (document.getElementById('login-email')||{}).value?.trim().toLowerCase()||'';
  if (!email)                   { _showErr('login-error-box','📧 Please enter your email'); return; }
  if (!/\S+@\S+\.\S+/.test(email)) { _showErr('login-error-box','⚠️ Enter a valid email'); return; }

  /* Check user exists */
  const users = S.users();
  const user  = Object.values(users).find(u => u.email === email);
  if (!user) {
    _showErr('login-error-box','❌ No account found. Please create one first.');
    return;
  }
  _v.login._user = user;

  /* Show step 2 */
  document.getElementById('login-step1').style.display = 'none';
  const s2 = document.getElementById('login-step2');
  s2.style.display = 'block';
  s2.style.animation = 'formIn .4s ease both';

  document.querySelectorAll('#login-otp-boxes .otp-box').forEach(b => { b.value=''; b.classList.remove('filled','shake'); });
  _hideErr('login-otp-error');

  _v.login.code = _genCode();
  console.log('🔐 Login code:', _v.login.code);

  _runReveal('ln', _v.login.code, () => {
    _startResend('ln', 10);
  });
}

/* OTP box handlers for login */
function loginOtpNext(input, boxNum) {
  const boxes = document.querySelectorAll('#login-otp-boxes .otp-box');
  _otpNav(input, boxNum, boxes, verifyLoginCode);
}
function loginOtpBack(input, boxNum, e) {
  const boxes = document.querySelectorAll('#login-otp-boxes .otp-box');
  _otpBack(input, boxNum, boxes, e);
}

/* Verify login code */
function verifyLoginCode() {
  _hideErr('login-otp-error');

  const boxes      = document.querySelectorAll('#login-otp-boxes .otp-box');
  const enteredOTP = Array.from(boxes).map(b => b.value).join('');

  if (enteredOTP.length !== 6) {
    _showErr('login-otp-error','⚠️ Please enter all 6 digits');
    _shakeBoxes('#login-otp-boxes .otp-box');
    return;
  }

  const btn = document.getElementById('ln-verify-btn');
  const txt = document.getElementById('ln-verify-text');
  if (btn) btn.disabled = true;
  if (txt) txt.innerHTML = '<div class="btn-spin"></div> Verifying…';

  setTimeout(() => {
    if (enteredOTP === _v.login.code) {
      /* ✅ CORRECT — log in + open dashboard */
      const user = _v.login._user;
      if (user) {
        S.saveCur(user);
        _v.login.timers.forEach(t => clearTimeout(t));
        clearInterval(_v.login.resendTimer);
        _showSuccessAndGo('Welcome Back! 👋', user.name || user.username || 'User');
      }
    } else {
      /* ❌ WRONG */
      if (btn) btn.disabled = false;
      if (txt) txt.innerHTML = '✅ Verify &amp; Login';
      _showErr('login-otp-error','❌ Wrong code. Check the digits and try again.');
      _shakeBoxes('#login-otp-boxes .otp-box');
      boxes.forEach(b => { b.value=''; b.classList.remove('filled'); });
      if (boxes[0]) boxes[0].focus();
    }
  }, 500);
}

/* Resend login code */
function resendLoginCode() {
  _v.login.timers.forEach(t => clearTimeout(t));
  _v.login.code = _genCode();
  console.log('🔐 Resent login code:', _v.login.code);
  document.querySelectorAll('#login-otp-boxes .otp-box').forEach(b => { b.value=''; b.classList.remove('filled','shake'); });
  document.getElementById('ln-entry').style.display = 'none';
  _hideErr('login-otp-error');

  const btn = document.getElementById('ln-verify-btn');
  const txt = document.getElementById('ln-verify-text');
  if (btn) btn.disabled = false;
  if (txt) txt.innerHTML = '✅ Verify &amp; Login';

  _runReveal('ln', _v.login.code, () => { _startResend('ln', 10); });
}

/* Reset login back to step 1 */
function resetLoginFlow() {
  _v.login.timers.forEach(t => clearTimeout(t));
  clearInterval(_v.login.resendTimer);
  document.getElementById('login-step1').style.display = 'block';
  document.getElementById('login-step2').style.display = 'none';
  document.getElementById('ln-entry').style.display = 'none';
  _hideErr('login-error-box');
  _hideErr('login-otp-error');
}

/* ── Navigation between signup and login panels ── */
function gotoExistingUser() {
  document.getElementById('signup-step1').style.display = 'none';
  document.getElementById('signup-step2').style.display = 'none';
  document.getElementById('login-panel').style.display  = 'block';
  resetLoginFlow();
}
function gotoNewUser() {
  document.getElementById('login-panel').style.display  = 'none';
  document.getElementById('signup-step1').style.display = 'block';
  document.getElementById('signup-step2').style.display = 'none';
}

/* Password toggle */
function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else                          { inp.type = 'password'; btn.textContent = '👁'; }
}

/* ══════════════════════════════════════════════════════
   PARTICLES BACKGROUND
══════════════════════════════════════════════════════ */
function initParticles() {
  const c = document.getElementById('p-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, pts;
  const resize = () => { W = c.width = window.innerWidth; H = c.height = window.innerHeight; };
  const make = () => {
    const n = Math.floor((W * H) / 14000);
    pts = Array.from({length: n}, () => ({
      x: Math.random()*W, y: Math.random()*H,
      r: Math.random()*1.6+.4, dx:(Math.random()-.5)*.35, dy:(Math.random()-.5)*.35,
      a: Math.random()*.5+.1, ph:Math.random()*Math.PI*2, ps:.02+Math.random()*.02
    }));
  };
  const draw = () => {
    ctx.clearRect(0,0,W,H);
    pts.forEach(p => {
      p.ph += p.ps;
      const a = p.a*(.6+.4*Math.sin(p.ph));
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(168,85,247,${a})`; ctx.fill();
      p.x+=p.dx; p.y+=p.dy;
      if(p.x<0)p.x=W; if(p.x>W)p.x=0; if(p.y<0)p.y=H; if(p.y>H)p.y=0;
    });
    for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
      const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y, d=Math.sqrt(dx*dx+dy*dy);
      if(d<90){ ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
        ctx.strokeStyle=`rgba(168,85,247,${.1*(1-d/90)})`; ctx.lineWidth=.5; ctx.stroke(); }
    }
    requestAnimationFrame(draw);
  };
  resize(); make(); draw();
  window.addEventListener('resize',()=>{resize();make();});
}

/* ══════════════════════════════════════════════════════
   CURSOR DOT + RING
══════════════════════════════════════════════════════ */
function initCursor() {
  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot||!ring) return;
  if (window.matchMedia('(pointer:coarse)').matches) { dot.style.display='none'; ring.style.display='none'; return; }
  let mx=0,my=0,rx=0,ry=0;
  document.addEventListener('mousemove', e => {
    mx=e.clientX; my=e.clientY;
    dot.style.left=mx+'px'; dot.style.top=my+'px';
    dot.style.opacity='1'; ring.style.opacity='1';
  });
  function animRing() {
    rx+=(mx-rx)*.15; ry+=(my-ry)*.15;
    ring.style.left=rx+'px'; ring.style.top=ry+'px';
    requestAnimationFrame(animRing);
  }
  animRing();
  document.addEventListener('mouseover', e => {
    const isBtn = ['BUTTON','A'].includes(e.target.tagName)||e.target.classList.contains('mrow')||e.target.classList.contains('p-card')||e.target.classList.contains('sc-card');
    ring.style.width  = isBtn?'50px':'34px';
    ring.style.height = isBtn?'50px':'34px';
    ring.style.borderColor = isBtn?'rgba(196,132,252,.85)':'rgba(168,85,247,.6)';
  });
}

/* ══════════════════════════════════════════════════════
   SCREEN + SECTION NAV
══════════════════════════════════════════════════════ */
function goS(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function gotoSec(name, tabEl) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById('sec-'+name);
  if (sec) sec.classList.add('active');
  document.querySelectorAll('.snav').forEach(t => t.classList.remove('active'));
  if (tabEl) tabEl.classList.add('active');
  else { const m=document.querySelector(`.snav[data-s="${name}"]`); if(m) m.classList.add('active'); }
  const at = document.querySelector('.snav.active');
  if (at) at.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
  if (name==='notifications') renderNotifsList();
  ['home','deals','rewards','refer','profile'].forEach(n=>{ const b=document.getElementById('bn-'+n); if(b) b.classList.remove('active'); });
  const nb = document.getElementById('bn-'+name);
  if (nb) nb.classList.add('active');
  if (name==='deals')    renderDeals();
  if (name==='rewards')  renderRwdPage();
  if (name==='partners') renderPartnersPage();
}

function navCk(name, el) {
  document.querySelectorAll('.bni').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  gotoSec(name);
}

/* ══════════════════════════════════════════════════════
   APP INIT (called after successful verify)
══════════════════════════════════════════════════════ */
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
  setInterval(() => {
    if (CU) { loadSlider(); loadProducts(); loadPartners(); pollAdminNotifs(); }
  }, 5000);
}

/* ══════════════════════════════════════════════════════
   UI UPDATE
══════════════════════════════════════════════════════ */
function updateUI() {
  if (!CU) return;
  const c = CU.coins || 0;
  ['qs-c','rwd-coins','wallet-c','prof-coins'].forEach(id => {
    const el = document.getElementById(id);
    if (el) animNum(el, parseInt(el.textContent)||0, c);
  });
  setEl('prof-n',  CU.name     || 'User');
  setEl('prof-ph', CU.phone    || '');
  setEl('prof-em', CU.email    || '');
  setEl('prof-un', CU.username ? '@'+CU.username : '');
  ['ref-code','prof-ref'].forEach(id => setEl(id, CU.referralCode||'LKART01'));
  const today = new Date().toDateString();
  const cl    = _lsGet('lk_d_'+CU.id) === today;
  setEl('qs-d', cl?'✅':'Claim');
  ['daily-btn','daily-btn2'].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.textContent = cl ? '✅ Claimed!' : 'Claim 10 🪙';
  });
}

function setEl(id,v){ const el=document.getElementById(id); if(el) el.textContent=v; }

function animNum(el, from, to) {
  if(from===to){el.textContent=to;return;}
  const step=(to-from)/20; let cur=from;
  const t=setInterval(()=>{
    cur+=step;
    if((step>0&&cur>=to)||(step<0&&cur<=to)){el.textContent=Math.round(to);clearInterval(t);}
    else el.textContent=Math.round(cur);
  },30);
}

function addCoins(amt, lbl) {
  CU.coins=(CU.coins||0)+amt;
  const u=S.users(); u[CU.id]=CU; S.saveU(u); S.saveCur(CU);
  const h=S.hist(CU.id);
  h.unshift({lbl,amt,date:new Date().toLocaleString()});
  S.saveHist(CU.id,h.slice(0,50));
  updateUI();
  showToast('🪙 +'+amt+' coins! '+lbl);
}

/* ══════════════════════════════════════════════════════
   LOGOUT
══════════════════════════════════════════════════════ */
function doLogout() {
  _lsRemove('lk_cur');
  CU = null;
  goS('s-auth');
  gotoNewUser();
}

/* ══════════════════════════════════════════════════════
   BANNER SLIDER
══════════════════════════════════════════════════════ */
const DEF_SLIDES = [
  {id:'ds1',image:'',url:'#',label:'🔥 Today\'s Best Deals — Shop Now!',status:'on'},
  {id:'ds2',image:'',url:'#',label:'🎁 Spin & Win Up to ₹500 Off!',     status:'on'},
  {id:'ds3',image:'',url:'#',label:'🛍️ Refer Friends — Earn 100 Coins', status:'on'},
];
const DEF_GRADS=['linear-gradient(135deg,#4c1d95,#7c3aed,#db2777)','linear-gradient(135deg,#1e1b4b,#7c3aed,#a855f7)','linear-gradient(135deg,#831843,#a21caf,#7c3aed)'];
const DEF_ICONS=['🔥','🎁','🛍️'];
const DEF_SUBS =['Up to 80% off!','Win up to ₹500','Get 100 coins per referral'];

function loadSlider() {
  const active = S.sliders().filter(s=>s.status==='on');
  sliderSlides = active.length ? active : DEF_SLIDES;
  buildSlider();
}

function buildSlider() {
  const wrap=document.getElementById('slider-wrap');
  const track=document.getElementById('slider-track');
  const dots=document.getElementById('sl-dots');
  if(!wrap||!track||!dots) return;
  if(!sliderSlides.length){wrap.classList.add('empty');return;}
  wrap.classList.remove('empty');
  track.innerHTML = sliderSlides.map((s,i)=>{
    if(s.image&&s.image.trim()) {
      return `<div class="slide" onclick="slideClick('${s.url||'#'}')">
        <img class="slide-img" src="${s.image}" alt="${s.label||''}" onerror="this.parentElement.innerHTML='<div class=slide-fallback style=background:${DEF_GRADS[i%3]}><div class=sf-ico>${DEF_ICONS[i%3]}</div><div class=sf-text>${s.label||''}</div><div class=sf-sub>${DEF_SUBS[i%3]}</div></div>'"/>
        <div class="slide-overlay"></div>${s.label?`<div class="slide-label">${s.label}</div>`:''}
      </div>`;
    }
    return `<div class="slide" onclick="slideClick('${s.url||'#'}')">
      <div class="slide-fallback" style="background:${DEF_GRADS[i%3]}">
        <div class="sf-ico">${DEF_ICONS[i%3]}</div>
        <div class="sf-text">${s.label||'LootKart Deals'}</div>
        <div class="sf-sub">${DEF_SUBS[i%3]}</div>
      </div>
    </div>`;
  }).join('');
  dots.innerHTML = sliderSlides.map((_,i)=>`<div class="sl-dot ${i===0?'active':''}" onclick="goSlide(${i})"></div>`).join('');

  track.addEventListener('touchstart', e=>{touchStartX=e.touches[0].clientX;isDragging=true;track.classList.add('dragging');clearInterval(sliderTimer);},{passive:true});
  track.addEventListener('touchmove', e=>{if(!isDragging)return;touchDeltaX=e.touches[0].clientX-touchStartX;const base=-sliderIndex*100;const drag=(touchDeltaX/wrap.offsetWidth)*100;track.style.transform=`translateX(${base+drag}%)`;},{passive:true});
  track.addEventListener('touchend', ()=>{isDragging=false;track.classList.remove('dragging');if(touchDeltaX<-50)sliderNext();else if(touchDeltaX>50)sliderPrev();else goSlide(sliderIndex);touchDeltaX=0;startSliderAuto();},{passive:true});

  sliderIndex=0; goSlide(0); startSliderAuto();
}

function goSlide(idx) {
  if(!sliderSlides.length) return;
  sliderIndex=(idx+sliderSlides.length)%sliderSlides.length;
  const track=document.getElementById('slider-track');
  if(track) track.style.transform=`translateX(${-sliderIndex*100}%)`;
  document.querySelectorAll('.sl-dot').forEach((d,i)=>d.classList.toggle('active',i===sliderIndex));
}
function sliderNext(){goSlide(sliderIndex+1);}
function sliderPrev(){goSlide(sliderIndex-1);}
function startSliderAuto(){clearInterval(sliderTimer);if(sliderSlides.length>1)sliderTimer=setInterval(()=>sliderNext(),3500);}
function slideClick(url){if(url&&url!=='#')window.open(url,'_blank');}

/* ══════════════════════════════════════════════════════
   PRODUCTS
══════════════════════════════════════════════════════ */
const DEF = [
  {id:'d1',name:'Galaxy Smartwatch',image:'⌚',price:999, discount:60,category:'electronics',link:'#',status:'on'},
  {id:'d2',name:'Wireless Earbuds', image:'🎧',price:799, discount:55,category:'electronics',link:'#',status:'on'},
  {id:'d3',name:'RGB Gaming Mouse', image:'🖱️',price:199, discount:75,category:'electronics',link:'#',status:'on'},
  {id:'d4',name:'JBL Speaker',      image:'🔊',price:899, discount:45,category:'electronics',link:'#',status:'on'},
  {id:'d5',name:'Smart LED Strip',  image:'💡',price:499, discount:50,category:'home',       link:'#',status:'on'},
  {id:'d6',name:'Running Shoes',    image:'👟',price:1299,discount:40,category:'sports',     link:'#',status:'on'},
];

function loadProducts() {
  const adminProds = S.prods().filter(p=>p.status==='on');
  if(adminProds.length>0){
    const seen=new Set();
    allProds=adminProds.filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true;})
      .map(p=>({id:p.id,name:p.name,image:p.image||'🛍️',price:Number(p.price),discount:Number(p.discount)||0,category:p.category||'electronics',link:p.link||'#',status:'on',clicks:p.clicks||0}));
  } else { allProds=[...DEF]; }
  setEl('qs-dn',allProds.length);
  renderHomeProds();
}

function pcHTML(p,i=0){
  const sl=(p.link||'#').replace(/'/g,"\\'");
  const sn=(p.name||'').replace(/'/g,"\\'");
  return `<div class="p-card" style="animation-delay:${i*.06}s" onclick="buyProd('${sl}','${sn}',${p.price||0})">
    <div class="p-img">${p.image||'🛍️'}<span class="disc-badge">${p.discount}% OFF</span></div>
    <div class="p-info">
      <div class="p-name">${p.name}</div>
      <div class="p-rat">⭐ 4.5 (2.1k)</div>
      <div class="p-row">
        <span class="p-price">₹${p.price.toLocaleString()}</span>
        <button class="buy-btn" onclick="event.stopPropagation();buyProd('${sl}','${sn}',${p.price||0})">Buy Now</button>
      </div>
    </div>
  </div>`;
}

function renderHomeProds(){
  const el=document.getElementById('home-prods');
  if(!el)return;
  if(!allProds.length){
    el.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--sub);"><div style="font-size:48px;margin-bottom:12px">🛍️</div><div style="font-size:16px;font-weight:600;margin-bottom:6px">No products available</div><div style="font-size:13px">Check back soon for amazing deals!</div></div>';
    return;
  }
  el.innerHTML=allProds.slice(0,6).map((p,i)=>pcHTML(p,i)).join('');
}
function renderDeals(cat='all'){const el=document.getElementById('deals-prods');if(!el)return;const l=cat==='all'?allProds:allProds.filter(p=>p.category===cat);el.innerHTML=l.length?l.map((p,i)=>pcHTML(p,i)).join(''):'<p style="text-align:center;color:var(--sub);grid-column:1/-1;padding:28px">No products found</p>';}
function filterD(btn,cat){document.querySelectorAll('.ft').forEach(t=>t.classList.remove('active'));btn.classList.add('active');renderDeals(cat);}

function buyProd(link,name,price){
  const prods=S.prods();
  const idx=prods.findIndex(p=>p.link===link&&p.link!=='#');
  if(idx>-1){prods[idx].clicks=(prods[idx].clicks||0)+1;_lsSet('opg_admin_products',JSON.stringify(prods));}
  if(link&&link!=='#'&&link!==''){
    showToast('🛍️ Opening deal...');
    setTimeout(()=>window.open(link,'_blank'),300);
    if(CU) addCoins(2,'Product Click Reward 🛍️');
  } else { showBuyModal(name||'This Product',price||0); }
}

function showBuyModal(name,price){
  const old=document.getElementById('buy-modal-overlay'); if(old) old.remove();
  const ov=document.createElement('div');
  ov.id='buy-modal-overlay';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(10px);z-index:9990;display:flex;align-items:flex-end;justify-content:center';
  ov.innerHTML=`<div style="background:rgba(9,4,30,.97);border:1.5px solid rgba(168,85,247,.3);border-radius:28px 28px 0 0;padding:26px 22px 36px;width:100%;max-width:420px;animation:mSlide .4s cubic-bezier(.34,1.56,.64,1)">
    <div style="text-align:center;margin-bottom:16px"><div style="font-size:48px;margin-bottom:10px">🛍️</div>
    <h3 style="font-size:18px;font-weight:900;color:#fff;font-family:'Exo 2',sans-serif;margin-bottom:6px">${name}</h3>
    <p style="font-size:13px;color:rgba(255,255,255,.5)">₹${Number(price).toLocaleString()} · Add affiliate link in Admin Panel</p></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
      <button onclick="document.getElementById('buy-modal-overlay').remove()" style="padding:13px;background:rgba(168,85,247,.15);border:1.5px solid rgba(168,85,247,.3);border-radius:13px;color:#c084fc;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;cursor:pointer">← Go Back</button>
      <button onclick="document.getElementById('buy-modal-overlay').remove();gotoSec('stores')" style="padding:13px;background:linear-gradient(135deg,#7c3aed,#a855f7);border:none;border-radius:13px;color:#fff;font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;cursor:pointer">🛒 Browse Stores</button>
    </div></div>`;
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  document.body.appendChild(ov);
}

function searchProds(q){const el=document.getElementById('home-prods');if(!el)return;if(!q){renderHomeProds();return;}const r=allProds.filter(p=>p.name.toLowerCase().includes(q.toLowerCase()));el.innerHTML=r.length?r.map((p,i)=>pcHTML(p,i)).join(''):'<p style="color:var(--sub);grid-column:1/-1;text-align:center;padding:20px">No results for "'+q+'"</p>';}

/* ══════════════════════════════════════════════════════
   PARTNERS
══════════════════════════════════════════════════════ */
const DEF_PARTNERS=[
  {id:'dp1',name:'Amazon', image:'📦',description:"World's largest online store", link:'https://amazon.in', status:'on'},
  {id:'dp2',name:'Flipkart',image:'🏬',description:"India's biggest marketplace",  link:'https://flipkart.com',status:'on'},
  {id:'dp3',name:'Ajio',   image:'👗',description:'Fashion & lifestyle deals',     link:'https://ajio.com',  status:'on'},
  {id:'dp4',name:'Myntra', image:'👠',description:'Top fashion brands',            link:'https://myntra.com',status:'on'},
];

function loadPartners(){
  const adminP=S.partners().filter(p=>p.status==='on');
  renderHomePartners([...DEF_PARTNERS,...adminP]);
}
function renderHomePartners(partners){
  const el=document.getElementById('home-partners');if(!el)return;
  el.innerHTML=(partners||[]).map((p,i)=>`<div class="ps-item" style="animation-delay:${i*.08}s" onclick="openPartner('${p.link}','${p.name}')"><div class="ps-img">${p.image}</div><div class="ps-name">${p.name}</div><div class="ps-link">Shop Now</div></div>`).join('');
}
function renderPartnersPage(){
  const el=document.getElementById('partners-grid');if(!el)return;
  const adminP=S.partners().filter(p=>p.status==='on');
  const all=[...DEF_PARTNERS,...adminP];
  el.innerHTML=all.map((p,i)=>`<div class="pg-item" style="animation-delay:${i*.08}s"><div class="pgi-top">${p.image}</div><div class="pgi-info"><div class="pgi-name">${p.name}</div><div class="pgi-desc">${p.description||'Exclusive deals'}</div><button class="pgi-btn" onclick="openPartner('${p.link}','${p.name}')">Shop Now →</button></div></div>`).join('');
}
function openPartner(link,name){if(link&&link!=='#')window.open(link,'_blank');else showToast('🤝 Opening '+name+'...');}

/* ══════════════════════════════════════════════════════
   DAILY CLAIM
══════════════════════════════════════════════════════ */
function claimDaily(){
  if(!CU)return;
  const today=new Date().toDateString();
  const key='lk_d_'+CU.id;
  if(_lsGet(key,null)===today){showToast('✅ Already claimed today! Come back tomorrow 🌙');return;}
  _lsSet(key,today);
  addCoins(10,'Daily Login Reward 🎁');
  ['daily-btn','daily-btn2'].forEach(id=>{const b=document.getElementById(id);if(b){b.textContent='✅ Claimed!';b.style.background='rgba(0,230,160,.3)';}});
  setEl('qs-d','✅');
}

/* ══════════════════════════════════════════════════════
   REWARDS PAGE
══════════════════════════════════════════════════════ */
function renderRwdPage(){
  const el=document.getElementById('coins-hist');if(!el||!CU)return;
  const h=S.hist(CU.id);
  el.innerHTML=h.length
    ?h.slice(0,12).map(x=>`<div class="ch-item"><div class="chi-ico">🪙</div><div class="chi-info"><h4>${x.lbl}</h4><p>${x.date}</p></div><div class="chi-amt">+${x.amt}</div></div>`).join('')
    :'<div class="empty-b"><div>🪙</div><p>No coin history yet</p></div>';
}

/* ══════════════════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════════════════ */
function renderNotifsList(){
  const el=document.getElementById('notifs-list');if(!el)return;
  const notifs=S.notifs();if(!notifs.length){el.innerHTML='';return;}
  el.innerHTML=notifs.slice(0,5).map(n=>`<div class="ni"><div class="ni-i" style="background:rgba(168,85,247,.2)">🔔</div><div class="ni-t"><h4>${n.title}</h4><p>${n.message}</p><span class="nt">${n.date}</span></div></div>`).join('');
  const cnt=document.getElementById('notif-cnt'); if(cnt) cnt.textContent=notifs.length;
  const badge=document.getElementById('prof-notif-badge'); if(badge) badge.textContent=notifs.length;
}
function pollAdminNotifs(){
  const notifs=S.notifs();
  const lastSeen=parseInt(_lsGet('lk_last_notif','0'));
  const fresh=notifs.filter(n=>parseInt(n.id.replace('n_',''))>lastSeen);
  if(fresh.length){_lsSet('lk_last_notif',fresh[0].id.replace('n_',''));renderNotifsList();}
}

/* ══════════════════════════════════════════════════════
   SPIN WHEEL
══════════════════════════════════════════════════════ */
function drawWheel(rot=0){
  const c=document.getElementById('sw-canvas');if(!c)return;
  const ctx=c.getContext('2d'),cx=120,cy=120,r=112,arc=(2*Math.PI)/PRIZES.length;
  ctx.clearRect(0,0,240,240);
  PRIZES.forEach((pr,i)=>{
    const s=rot+i*arc,e=s+arc;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,s,e);
    ctx.fillStyle=PCOLORS[i];ctx.fill();
    ctx.strokeStyle='rgba(200,150,255,.25)';ctx.lineWidth=1.5;ctx.stroke();
    ctx.save();ctx.translate(cx,cy);ctx.rotate(s+arc/2);
    ctx.textAlign='right';ctx.fillStyle='#fff';ctx.font='bold 13px Nunito,sans-serif';
    ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=4;
    ctx.fillText('🪙'+pr,r-10,5);ctx.restore();
  });
  ctx.beginPath();ctx.arc(cx,cy,r,0,2*Math.PI);ctx.strokeStyle='rgba(196,132,252,.5)';ctx.lineWidth=3;ctx.stroke();
  const grd=ctx.createRadialGradient(cx,cy,0,cx,cy,22);
  grd.addColorStop(0,'#09041e');grd.addColorStop(1,'#1a0540');
  ctx.beginPath();ctx.arc(cx,cy,22,0,2*Math.PI);ctx.fillStyle=grd;ctx.fill();
  ctx.strokeStyle='rgba(196,132,252,.5)';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#c084fc';ctx.font='bold 9px Nunito,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowBlur=0;ctx.fillText('SPIN',cx,cy);
}

function openSpin(){document.getElementById('spin-modal').classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}

function doSpin(){
  if(isSpinning)return;
  isSpinning=true;document.getElementById('spin-btn').disabled=true;
  const extra=5*2*Math.PI+Math.random()*2*Math.PI,total=spinRot+extra,dur=4200,st=performance.now(),sR=spinRot;
  const anim=now=>{
    const el=now-st,pr=Math.min(el/dur,1),ease=1-Math.pow(1-pr,3);
    drawWheel(sR+extra*ease);
    if(pr<1){requestAnimationFrame(anim);return;}
    spinRot=total%(2*Math.PI);
    const arc=(2*Math.PI)/PRIZES.length,ptr=(3*Math.PI/2-spinRot+2*Math.PI)%(2*Math.PI);
    const won=PRIZES[Math.floor(ptr/arc)%PRIZES.length];
    isSpinning=false;document.getElementById('spin-btn').disabled=false;
    addCoins(won,'Spin & Win 🎡');confettiBurst();setTimeout(()=>showToast('🎊 You won '+won+' coins!'),200);
  };
  requestAnimationFrame(anim);
}

/* ══════════════════════════════════════════════════════
   CONFETTI
══════════════════════════════════════════════════════ */
function confettiBurst(){
  const colors=['#a855f7','#c084fc','#ffd700','#ff4466','#00e89e','#7c3aed','#f9a8d4'];
  for(let i=0;i<60;i++){
    const d=document.createElement('div');
    const cx=(Math.random()-.5)*400,cy=200+Math.random()*300,cr=(360+Math.random()*360)+'deg';
    d.style.cssText=`position:fixed;z-index:9999;pointer-events:none;width:${6+Math.random()*6}px;height:${6+Math.random()*6}px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${Math.random()>.5?'50%':'2px'};left:${30+Math.random()*40}%;top:40%;--cx:${cx}px;--cy:${cy}px;--cr:${cr};animation:cfly ${1+Math.random()*1.5}s ease-out forwards`;
    document.body.appendChild(d);
    setTimeout(()=>d.remove(),3000);
  }
}

/* ══════════════════════════════════════════════════════
   COUNTDOWN TIMER
══════════════════════════════════════════════════════ */
function startCD(){
  if(cdTimer)clearInterval(cdTimer);
  let t=4*3600+23*60;
  const upd=()=>{
    const h=Math.floor(t/3600),m=Math.floor((t%3600)/60),s=t%60;
    updCD('cd-h',h.toString().padStart(2,'0'));
    updCD('cd-m',m.toString().padStart(2,'0'));
    updCD('cd-s',s.toString().padStart(2,'0'));
    if(t<=0)t=24*3600;else t--;
  };
  upd();cdTimer=setInterval(upd,1000);
}
function updCD(id,v){
  const el=document.getElementById(id);if(!el)return;
  if(el.textContent!==v){el.classList.add('flip');el.textContent=v;el.addEventListener('animationend',()=>el.classList.remove('flip'),{once:true});}
}

/* ══════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════ */
function storeClick(n){showToast('🛒 Opening '+n+'...');}
function copyCode(){const c=CU?.referralCode||'LKART01';navigator.clipboard.writeText(c).catch(()=>{});showToast('📋 Copied: '+c);}
function doWithdraw(){if((CU?.coins||0)<1000){showToast('⚠️ Need at least 1000 coins');return;}showToast('💸 Withdrawal request submitted!');}
function openEditModal(){
  const dn=document.getElementById('e-name'),dun=document.getElementById('e-uname'),dem=document.getElementById('e-email');
  if(dn)  dn.value=CU?.name||'';
  if(dun) dun.value=CU?.username||'';
  if(dem) dem.value=CU?.email||'';
  document.getElementById('edit-modal').classList.add('open');
}
function saveEdit(){
  if(!CU)return;
  const n=(document.getElementById('e-name')||{}).value?.trim();
  const un=(document.getElementById('e-uname')||{}).value?.trim();
  const em=(document.getElementById('e-email')||{}).value?.trim();
  if(n)CU.name=n; if(un)CU.username=un; if(em)CU.email=em;
  const u=S.users();u[CU.id]=CU;S.saveU(u);S.saveCur(CU);
  updateUI();closeModal('edit-modal');showToast('✅ Profile updated!');
}
function ripple(btn){
  const r=document.createElement('div');
  r.style.cssText='position:absolute;border-radius:50%;background:rgba(255,255,255,.4);width:8px;height:8px;animation:ripOut .5s ease-out forwards;left:50%;top:50%;transform:translate(-50%,-50%)';
  btn.style.position='relative';btn.style.overflow='hidden';
  btn.appendChild(r);setTimeout(()=>r.remove(),600);
}
function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),3000);
}

/* ══════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════
   REAL-TIME SYNC — listen for admin product changes
   (works when both panels open in same browser)
══════════════════════════════════════════════════════ */
window.addEventListener('storage', (e) => {
  if (e.key === 'opg_admin_products') {
    loadProducts();
    renderDeals();
  }
  if (e.key === 'lk_sliders') loadSlider();
  if (e.key === 'lk_partners') loadPartners();
  if (e.key === 'opg_notifs') pollAdminNotifs();
});

window.addEventListener('load',()=>{
  initParticles();
  initCursor();
  drawWheel();

  let saved=null;
  try{saved=S.cur();}catch(e){}
  if(!saved&&_mem['lk_cur']){try{saved=JSON.parse(_mem['lk_cur']);}catch(e){}}

  if(saved){
    CU=saved;
    initApp();
  } else {
    goS('s-auth');
    gotoNewUser();
  }
});
