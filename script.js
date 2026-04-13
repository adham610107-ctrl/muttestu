// ============================================================
// PRO EXAM v12 — Main Script
// Full Google Sheets CloudDB sync per-user stats,
// AutoKick, EyeComfort dark mode fix, BuyCoffee(7x magic),
// Certificate mobile, iOS notch, Timer fix
// ============================================================

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzC4-Axk2bQsnHJYxMhzn0fblk48j2fWAheHhCxJF5as8fH-NKlIgV0-C7uO6mQfHAM/exec";
const DB_URL            = "https://script.google.com/macros/s/AKfycbz5f2V0eKXyglWPZ6tiWC0P1ASBjJc4d_9nKfWoCYJSHhPJSn5opLxkIRamjfp3UuiyMA/exec";

const subjectNames = {
    musiqa_nazariyasi:  "Musiqa nazariyasi",
    cholgu_ijrochiligi: "Cholg'u ijrochiligi",
    vokal_ijrochiligi:  "Vokal ijrochiligi",
    metodika_repertuar: "Metodika"
};

// ===== GOOGLE SHEETS DB =====
async function dbSave(key, value) {
    try {
        await fetch(DB_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'set', key, value: JSON.stringify(value) })
        });
    } catch(e) { console.warn('dbSave:', e); }
}
async function dbLoad(key) {
    try {
        const r = await fetch(DB_URL + '?action=get&key=' + encodeURIComponent(key));
        const j = await r.json();
        if (j && j.value != null) return JSON.parse(j.value);
    } catch(e) { console.warn('dbLoad:', e); }
    return null;
}
async function saveLeaderboard(user, score, subject, mode) {
    try {
        await fetch(DB_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'leaderboard', user, score, subject, mode, date: new Date().toISOString() })
        });
    } catch(e) {}
}
async function sendLog(type, data) {
    try {
        await fetch(DB_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'log', type, data, user: localStorage.getItem('pro_exam_name') || 'unknown', date: new Date().toISOString() })
        });
    } catch(e) {}
}

// Throttled db save — avoid spam while answering
let dbSaveTimer = null;
function scheduledDbSave() {
    if (dbSaveTimer) clearTimeout(dbSaveTimer);
    dbSaveTimer = setTimeout(() => {
        if (currentUser) dbSave('stats_' + currentUser, stats);
    }, 2000);
}

// ===== INDEXEDDB — PWA Device ID =====
const IDB_NAME = 'adham_pro_db', IDB_VERSION = 1;
let dbInstance = null;
function openIDB() {
    return new Promise((res,rej) => {
        if (dbInstance) { res(dbInstance); return; }
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = e => { const db=e.target.result; if(!db.objectStoreNames.contains('kv')) db.createObjectStore('kv',{keyPath:'key'}); };
        req.onsuccess = e => { dbInstance=e.target.result; res(dbInstance); };
        req.onerror = () => rej(req.error);
    });
}
async function idbGet(key) {
    try {
        const db = await openIDB();
        return new Promise((res,rej) => {
            const tx = db.transaction('kv','readonly');
            const req = tx.objectStore('kv').get(key);
            req.onsuccess = () => res(req.result ? req.result.value : null);
            req.onerror = () => rej(req.error);
        });
    } catch(e) { return localStorage.getItem(key); }
}
async function idbSet(key, value) {
    try {
        const db = await openIDB();
        return new Promise((res,rej) => {
            const tx = db.transaction('kv','readwrite');
            tx.objectStore('kv').put({key,value});
            tx.oncomplete = () => res(true);
            tx.onerror = () => rej(tx.error);
        });
    } catch(e) { localStorage.setItem(key,value); }
}
async function getOrCreateDeviceId() {
    let d = await idbGet('adham_pro_device_id');
    if (!d) { d = 'dev_'+Math.random().toString(36).substr(2,9)+'_'+Date.now(); await idbSet('adham_pro_device_id',d); }
    return d;
}

// ===== PWA — BUG FIX #3: Strengthen install prompt =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () =>
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registered:', reg.scope))
            .catch(e  => console.log('SW error:', e))
    );
}
let deferredPrompt = null;

// Store prompt as soon as browser fires it
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Show install button
    const b = document.getElementById('install-app-btn');
    if (b) { b.classList.remove('hidden'); b.style.display = ''; }
    console.log('PWA install prompt ready');
});

// Attach click handler after DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const b = document.getElementById('install-app-btn');
    if (!b) return;
    b.addEventListener('click', async () => {
        if (!deferredPrompt) {
            console.warn('No install prompt available');
            return;
        }
        try {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('PWA install outcome:', outcome);
            if (outcome === 'accepted') b.classList.add('hidden');
        } catch (err) {
            console.error('Install prompt error:', err);
        } finally {
            deferredPrompt = null;
        }
    });
});

window.addEventListener('appinstalled', () => {
    const b = document.getElementById('install-app-btn');
    if (b) b.classList.add('hidden');
    deferredPrompt = null;
    console.log('PWA installed successfully');
});

// ===== SECURITY =====
function copyCard() {
    const el = document.getElementById("card-num") || document.getElementById("card-num-donate");
    const t  = el ? el.innerText : "9860350141282409";
    navigator.clipboard.writeText(t).then(()=>alert("✓ Karta raqami nusxalandi: "+t)).catch(()=>alert("Karta: "+t));
}
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', function(e) {
    if (e.keyCode===123||(e.ctrlKey&&e.shiftKey&&(e.keyCode===73||e.keyCode===74))||(e.ctrlKey&&e.keyCode===85)) { e.preventDefault(); return false; }
    if (e.ctrlKey&&e.keyCode===67) { e.preventDefault(); alert("⚠ Nusxalash (Ctrl+C) qat'iyan taqiqlangan!"); return false; }
});
let cheatWarnings = 0;
document.addEventListener("visibilitychange", () => {
    const ts = document.getElementById("test-screen");
    if (ts && !ts.classList.contains("hidden") && document.hidden) {
        cheatWarnings++;
        if (cheatWarnings >= 3) { alert("❌ 3 marta oynadan chiqdingiz. Sessiya avtomatik yakunlandi!"); finishExam(true); }
        else alert(`⚠ OGOHLANTIRISH (${cheatWarnings}/3)\nBoshqa oynaga o'tish test sessiyasini yakunlaydi!`);
    }
});

// ===== AUTOKICK — every 30s =====
let blockCheckInterval=null, heartbeatInterval=null;
async function checkAdminBlock() {
    const savedName = localStorage.getItem('pro_exam_name');
    if (!savedName) return;
    try {
        const r = await fetch(GOOGLE_SCRIPT_URL, { method:'POST', body: JSON.stringify({action:"check_block",login:savedName}) });
        const result = await r.json();
        if (result.blocked) {
            sendLog('autokick', {reason:'admin_block',login:savedName});
            if (blockCheckInterval) clearInterval(blockCheckInterval);
            if (heartbeatInterval)  clearInterval(heartbeatInterval);
            localStorage.removeItem('pro_exam_auth');
            localStorage.removeItem('pro_exam_name');
            clearInterval(timerInterval);
            alert("🚫 Admin tomonidan bloklangansiz!\nSiz tizimdan chiqarildi.");
            setTimeout(() => location.reload(), 500);
        }
    } catch(e) {}
}
function startBlockCheck() {
    if (blockCheckInterval) clearInterval(blockCheckInterval);
    blockCheckInterval = setInterval(() => {
        const a = localStorage.getItem('pro_exam_auth');
        if (a === 'true') checkAdminBlock(); else { clearInterval(blockCheckInterval); blockCheckInterval=null; }
    }, 30000);
}
function startHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => { const a=localStorage.getItem('pro_exam_auth'); if(a==='true'&&!document.hidden) checkAdminBlock(); }, 45000);
}

// ===== AUTH =====
async function authenticateUser() {
    const loginVal  = document.getElementById('auth-login').value.trim();
    const passVal   = document.getElementById('auth-password').value.trim();
    const keygenVal = document.getElementById('auth-keygen').value.trim();
    const errorEl   = document.getElementById('auth-error');
    const btn       = document.getElementById('btn-auth');
    if (!loginVal || !passVal) {
        errorEl.innerText = "Login va Parol majburiy!";
        errorEl.classList.remove('hidden'); return;
    }
    btn.innerText = "Tekshirilmoqda..."; btn.disabled = true;
    errorEl.classList.add('hidden');
    try {
        const deviceId = await getOrCreateDeviceId();
        // Google Apps Script: Content-Type header qo'shilmaydi (CORS muammo bo'ladi)
        const r = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ login: loginVal, password: passVal, keygen: keygenVal, deviceId })
        });
        const result = await r.json();
        if (result.success) {
            localStorage.setItem('pro_exam_auth', 'true');
            localStorage.setItem('pro_exam_name', result.name || loginVal);
            const snEl = document.getElementById('student-name');
            if (snEl) snEl.value = result.name || loginVal;
            try { sendLog('login', { login: loginVal, deviceId }); } catch(e) {}
            switchScreen('auth-screen', 'welcome-screen');
            startBlockCheck();
            startHeartbeat();
        } else {
            errorEl.innerText = result.message || "Xato login yoki parol!";
            errorEl.classList.remove('hidden');
        }
    } catch(e) {
        errorEl.innerText = "Tarmoqda xatolik. Internetni tekshiring.";
        errorEl.classList.remove('hidden');
        console.error('Auth error:', e);
    } finally {
        btn.innerText = "Kirish · Tasdiqlash"; btn.disabled = false;
    }
}

// ===== AUDIO & PARTICLES =====
const audioCtx = new (window.AudioContext||window.webkitAudioContext)();
function playFeedback(type) {
    if (audioCtx.state==='suspended') audioCtx.resume();
    const osc=audioCtx.createOscillator(), gain=audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    if (type==='correct') {
        osc.type='sine'; osc.frequency.setValueAtTime(600,audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200,audioCtx.currentTime+0.12);
        gain.gain.setValueAtTime(0.28,audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01,audioCtx.currentTime+0.12);
        osc.start(); osc.stop(audioCtx.currentTime+0.12); if("vibrate"in navigator)navigator.vibrate(50);
    } else {
        osc.type='sawtooth'; osc.frequency.setValueAtTime(280,audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(90,audioCtx.currentTime+0.22);
        gain.gain.setValueAtTime(0.28,audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01,audioCtx.currentTime+0.22);
        osc.start(); osc.stop(audioCtx.currentTime+0.22); if("vibrate"in navigator)navigator.vibrate([150,100,150]);
    }
}
function createParticles(event) {
    if (!event) return;
    const x=event.clientX, y=event.clientY;
    for (let i=0;i<14;i++) {
        const p=document.createElement('div'); p.className='magic-particle'; document.body.appendChild(p);
        const dx=(Math.random()-0.5)*130, dy=(Math.random()-0.5)*130;
        p.style.left=x+'px'; p.style.top=y+'px';
        p.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx}px,${dy}px) scale(0)`,opacity:0}],{duration:620,easing:'ease-out'});
        setTimeout(()=>p.remove(),620);
    }
}
function speakQuestion(idx) {
    if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const msg=new SpeechSynthesisUtterance(currentTest[idx].q); msg.lang='uz-UZ'; msg.rate=0.9; window.speechSynthesis.speak(msg); }
    else alert("Brauzer ovozli o'qishni qo'llab-quvvatlamaydi.");
}
let comboCount=0, hackerStreak=0, lastAnswerTime=0, totalErrorsInTest=0;
function showComboBadge() { const b=document.getElementById('combo-badge'); b.innerText=`COMBO x${comboCount} 🔥`; b.classList.remove('hidden'); b.style.animation='none'; void b.offsetWidth; b.style.animation='comboPop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards'; setTimeout(()=>b.classList.add('hidden'),2000); }
function showHackerBadge() { const b=document.getElementById('hacker-badge'); b.classList.remove('hidden'); b.style.animation='none'; void b.offsetWidth; b.style.animation='comboPop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards'; setTimeout(()=>b.classList.add('hidden'),3000); }

// ===== STREAK & GREETING =====
function updateDailyStreak() {
    const today=new Date().toDateString(), lastDate=localStorage.getItem('adham_last_date');
    let streak=parseInt(localStorage.getItem('adham_streak'))||0;
    if (lastDate!==today) {
        const yesterday=new Date(); yesterday.setDate(yesterday.getDate()-1);
        streak=(lastDate===yesterday.toDateString())?streak+1:1;
        localStorage.setItem('adham_last_date',today); localStorage.setItem('adham_streak',streak);
    }
    const e1=document.getElementById('streak-count'), e2=document.getElementById('streak-dash');
    if(e1)e1.innerText=streak; if(e2)e2.innerText=streak;
}
function updateGreeting() {
    const h=new Date().getHours();
    const t=h>=5&&h<12?"Xayrli tong":h>=12&&h<18?"Xayrli kun":h>=18&&h<22?"Xayrli kech":"Xayrli tun";
    const el=document.getElementById('greeting-text'); if(el)el.innerText=t;
}

// ===== GLOBAL STATE =====
let bank=[],currentTest=[],userAnswers=[],currentIndex=0;
let currentUser=null, timerInterval;
let stats=JSON.parse(localStorage.getItem('adham_pro_stats'))||{learned:[],errors:[],history:[]};
let pendingSubject=null, pendingLevelQs=[], testType=null;
let diffTime=900, orderMode='random', isExamMode=false;
let testModeName="";
let donateShownCount=parseInt(localStorage.getItem('adham_donate_count'))||0;
let currentRentgenView='all', currentChartPeriod='daily';

function forceCloseAllModals() { document.querySelectorAll('.modal-overlay').forEach(m=>m.style.display='none'); }
function closeModal(e,id) { if(e.target.id===id) document.getElementById(id).style.display='none'; }
function closeModalDirect(id) { document.getElementById(id).style.display='none'; }

// ===== DATA LOADING =====
async function loadData() {
    const files=['musiqa_nazariyasi.json','cholgu_ijrochiligi.json','vokal_ijrochiligi.json','metodika_repertuar.json'];
    let globalId=1;
    for (const f of files) {
        try {
            const res=await fetch(f); const data=await res.json(); const subName=f.replace('.json','');
            data.forEach(q=>{
                const opts=q.options.filter(o=>o!==null&&o!==undefined&&o.toString().trim()!=='');
                const uniqueOpts=[...new Set(opts)]; const correctText=q.options[q.answer];
                if(uniqueOpts.length===3) uniqueOpts.push("Barcha javoblar to'g'ri");
                bank.push({id:globalId++,subject:subName,q:q.q,originalOpts:uniqueOpts,correctText});
            });
        } catch(e) { console.warn(f+' topilmadi'); }
    }
    const el=document.getElementById('max-learned-total'); if(el)el.innerText=`/ ${bank.length}`;
}

// ===== LOAD USER STATS FROM GOOGLE SHEETS =====
async function loadUserStats(userName) {
    try {
        const cloudStats = await dbLoad('stats_' + userName);
        if (cloudStats) {
            const localRaw    = localStorage.getItem('adham_pro_stats');
            const localStats  = localRaw ? JSON.parse(localRaw) : {learned:[],errors:[],history:[]};
            // Merge learned (cloud + local union — most progress wins)
            const mergedLearned = [...new Set([...(localStats.learned||[]), ...(cloudStats.learned||[])])];
            // Errors: remove any that are now in learned
            const mergedErrors  = [...new Set([...(localStats.errors||[]), ...(cloudStats.errors||[])])].filter(id=>!mergedLearned.includes(id));
            // History: merge by date, take max values
            const histMap={};
            [...(cloudStats.history||[]), ...(localStats.history||[])].forEach(h=>{
                if (!histMap[h.date]) histMap[h.date]={...h};
                else { histMap[h.date].correct=Math.max(histMap[h.date].correct,h.correct||0); histMap[h.date].errors=Math.max(histMap[h.date].errors,h.errors||0); }
            });
            const mergedHistory=Object.values(histMap).sort((a,b)=>a.date.localeCompare(b.date));
            stats={learned:mergedLearned, errors:mergedErrors, history:mergedHistory};
            localStorage.setItem('adham_pro_stats', JSON.stringify(stats));
            // Push merged back to cloud
            dbSave('stats_' + userName, stats);
        }
    } catch(e) { console.warn('loadUserStats error:', e); }
}

// ===== iOS NOTCH FIX =====
function applyIOSNotchFix() {
    const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    if (isIOS) {
        document.body.classList.add('ios-device');
        const s=document.createElement('style');
        s.textContent=`:root{--safe-top:env(safe-area-inset-top,44px);--safe-bottom:env(safe-area-inset-bottom,34px);}.ios-device .global-nav{padding-top:calc(env(safe-area-inset-top,0px)+12px)!important;backdrop-filter:blur(40px) saturate(180%)!important;-webkit-backdrop-filter:blur(40px) saturate(180%)!important;}.ios-device .hero-overlay{padding-top:calc(env(safe-area-inset-top,0px)+20px);padding-bottom:calc(env(safe-area-inset-bottom,0px)+20px);}`;
        document.head.appendChild(s);
    }
}

// ===== INIT =====
window.onload = async () => {
    await loadData();
    const isAuth=localStorage.getItem('pro_exam_auth');
    if (isAuth==='true') {
        const name=localStorage.getItem('pro_exam_name')||'Talaba';
        const snEl=document.getElementById('student-name'); if(snEl)snEl.value=name;
        const dnEl=document.getElementById('display-name'); if(dnEl)dnEl.innerText=name;
        currentUser=name;
        document.getElementById('global-nav').classList.remove('hidden');
        const authScreen=document.getElementById('auth-screen');
        if (authScreen&&!authScreen.classList.contains('hidden')) switchScreen('auth-screen','welcome-screen');
        // Load stats from Google Sheets on startup
        await loadUserStats(name);
        checkAdminBlock(); startBlockCheck(); startHeartbeat();
    }
    if (localStorage.getItem('theme')==='dark') { document.body.classList.replace('light-mode','dark-mode'); const s=document.getElementById('theme-slider'); if(s)s.checked=true; }
    if (localStorage.getItem('comfort_eye')==='on') applyComfortEye(true);
    applyIOSNotchFix();
    updateDashboardStats(); updateDailyStreak(); updateGreeting(); updateProgressChart(currentChartPeriod); updateCategoryProgress();
};

// ===== THEME & COMFORT EYE — v13 =====
function toggleTheme() {
    const slider = document.getElementById('theme-slider');
    if (slider && slider.checked) {
        document.body.classList.replace('light-mode', 'dark-mode');
        localStorage.setItem('theme', 'dark');
        // Dark mode + comfort-eye: filter olib tashlanadi, faqat icon "on" ko'rinadi
        if (document.body.classList.contains('comfort-eye')) {
            document.body.classList.remove('comfort-eye');
            document.body.classList.add('comfort-eye-stored');
        }
    } else {
        document.body.classList.replace('dark-mode', 'light-mode');
        localStorage.setItem('theme', 'light');
        // Light modega o'tganda stored comfort-eye ni qaytarish
        if (document.body.classList.contains('comfort-eye-stored') ||
            localStorage.getItem('comfort_eye') === 'on') {
            document.body.classList.remove('comfort-eye-stored');
            applyComfortEye(true);
        }
    }
}

// COMFORT EYE — to'liq body filter (sepia+warm)
// Dark modeda: filter olib tashlanadi, faqat ogohlantirish ko'rsatiladi
// pointer-events muammosi: filter body ga qo'llansa stacking context buzilishi mumkin,
// shuning uchun faqat filter ishlatamiz (blur emas), va modal/button larga z-index ta'sir qilmaydi
function applyComfortEye(on) {
    const btn = document.getElementById('comfortEyeToggle');
    const oe  = document.getElementById('eye-open-icon');
    const ce  = document.getElementById('eye-closed-icon');
    const isDark = document.body.classList.contains('dark-mode');

    if (on) {
        if (isDark) {
            // Dark modeda filter ishlatilmaydi — ogohlantirish ko'rsatiladi
            showComfortEyeDarkWarning();
            // Icon ni "on" ko'rinishda qoldirish (preference saqlansin)
            if (btn) btn.classList.add('eye-active');
            if (oe)  oe.classList.add('active-eye');
            if (ce)  ce.classList.remove('active-eye');
            localStorage.setItem('comfort_eye', 'on');
            document.body.classList.add('comfort-eye-stored');
            return;
        }
        document.body.classList.add('comfort-eye');
        document.body.classList.remove('comfort-eye-stored');
        if (btn) btn.classList.add('eye-active');
        if (oe)  oe.classList.add('active-eye');
        if (ce)  ce.classList.remove('active-eye');
        localStorage.setItem('comfort_eye', 'on');
    } else {
        document.body.classList.remove('comfort-eye');
        document.body.classList.remove('comfort-eye-stored');
        if (btn) btn.classList.remove('eye-active');
        if (ce)  ce.classList.add('active-eye');
        if (oe)  oe.classList.remove('active-eye');
        localStorage.setItem('comfort_eye', 'off');
    }
}

function showComfortEyeDarkWarning() {
    // Non-blocking toast notification
    let toast = document.getElementById('comfort-eye-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'comfort-eye-toast';
        toast.style.cssText = `
            position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
            background:rgba(30,30,30,0.95); color:#FFD580; font-weight:700;
            padding:12px 20px; border-radius:14px; font-size:0.88rem;
            z-index:99999; pointer-events:none; text-align:center;
            border:1px solid rgba(255,210,100,0.3); max-width:280px;
            backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
            box-shadow:0 8px 24px rgba(0,0,0,0.5);
            animation:toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards;
        `;
        toast.innerHTML = '🌙 Qorong'i rejimda ko'z qulayligi<br><span style="opacity:0.75;font-weight:500">Yorug' rejimga o'tsangiz to'liq ishlaydi</span>';
        document.body.appendChild(toast);
    }
    toast.style.display = 'block';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => { toast.style.display = 'none'; toast.style.animation = ''; }, 300);
    }, 2800);
}

function toggleComfortEye() {
    const isOn = document.body.classList.contains('comfort-eye') ||
                 document.body.classList.contains('comfort-eye-stored');
    applyComfortEye(!isOn);
}

// ===== SCREEN NAV =====
function switchScreen(hideId,showId) {
    forceCloseAllModals();
    document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active');s.classList.add('hidden');});
    const el=document.getElementById(showId); if(el){el.classList.remove('hidden');el.classList.add('active');}
}

// handleLogin — loads user stats from CloudDB before dashboard
async function handleLogin() {
    const name=document.getElementById('student-name').value.trim();
    if (name.length<2) return alert("Ismingizni kiriting!");
    if (name.toLowerCase()==='adham') alert("Assalomu alaykum, Admin (Creator)! 🔑\nSizga maxsus rejim yoqildi.");
    currentUser=name;
    const dnEl=document.getElementById('display-name'); if(dnEl)dnEl.innerText=name;
    if (audioCtx.state==='suspended') audioCtx.resume();
    document.getElementById('global-nav').classList.remove('hidden');
    // Show loading while fetching cloud stats
    const loginBtn=document.querySelector('#welcome-screen .btn-primary');
    if(loginBtn){loginBtn.innerText="☁ Yuklanmoqda...";loginBtn.disabled=true;}
    await loadUserStats(name);
    if(loginBtn){loginBtn.innerText="Sessiyani Boshlash 🚀";loginBtn.disabled=false;}
    switchScreen('welcome-screen','dashboard-screen');
    updateDashboardStats(); updateGreeting(); updateProgressChart(currentChartPeriod); updateCategoryProgress(); showRentgenOnDashboard();
}

function goHome() {
    clearInterval(timerInterval); forceCloseAllModals();
    document.getElementById('exit-test-btn').classList.add('hidden');
    document.getElementById('exam-timer').classList.add('hidden');
    document.getElementById('restart-mini-btn').classList.add('hidden');
    document.body.classList.remove('boss-fight-mode');
    const bw=document.getElementById('boss-fight-warning'); if(bw)bw.classList.add('hidden');
    if('speechSynthesis' in window)window.speechSynthesis.cancel();
    cheatWarnings=0;comboCount=0;hackerStreak=0;totalErrorsInTest=0;
    switchScreen('test-screen','dashboard-screen');
    updateDashboardStats(); updateProgressChart(currentChartPeriod); updateCategoryProgress(); showRentgenOnDashboard();
}
function confirmExit() {
    const hasErrors = stats.errors && stats.errors.length > 0;
    const answeredCount = userAnswers.filter(a => a !== null).length;
    const wrongCount = userAnswers.filter(a => a !== null && !a.isCorrect).length;

    // Foydalanuvchiga chiqishni tasdiqlash va xatolar taklifini ko'rsatish
    let msg = "Testdan chiqishni xohlaysizmi?\nJoriy test natijalari yo\'qoladi.";
    if (wrongCount > 0 || hasErrors) {
        msg += `\n\n⚠ Sizda ${wrongCount > 0 ? wrongCount + ' ta test xatosi' : stats.errors.length + ' ta saqlangan xato'} bor.\nChiqgandan so\'ng Xatolar ustida ishlashga o\'tilsinmi?`;
    }

    const confirmed = confirm(msg);
    if (!confirmed) return;

    // Chiqish
    goHome();

    // Xatolar bo'lsa taklifni ko'rsatish
    if (wrongCount > 0 || hasErrors) {
        setTimeout(() => {
            const goToErrors = confirm(
                "💡 Xatolar ustida ishlash\n\n" +
                "Noto\'g\'ri javob bergan savollarni qayta mashq qilmoqchimisiz?\n\n" +
                "✅ Ha — Xatolar rejimi boshlanadi\n❌ Yo\'q — Asosiy menyu"
            );
            if (goToErrors && stats.errors.length > 0) {
                prepareTest('errors');
            } else if (goToErrors && stats.errors.length === 0) {
                // Test paytidagi xatolarni qo'shib olish
                const sessionErrors = currentTest.filter((q, idx) => userAnswers[idx] && !userAnswers[idx].isCorrect).map(q => q.id);
                if (sessionErrors.length > 0) {
                    sessionErrors.forEach(id => { if (!stats.errors.includes(id)) stats.errors.push(id); });
                    localStorage.setItem('adham_pro_stats', JSON.stringify(stats));
                    updateDashboardStats();
                    prepareTest('errors');
                }
            }
        }, 400);
    }
}
function logout(){if(confirm("Tizimdan chiqishni xohlaysizmi?")){sendLog('logout',{});localStorage.removeItem('pro_exam_auth');if(blockCheckInterval)clearInterval(blockCheckInterval);if(heartbeatInterval)clearInterval(heartbeatInterval);location.reload();}}

// ===== DASHBOARD STATS — saves to localStorage + Google Sheets =====
function updateDashboardStats() {
    stats.learned=[...new Set(stats.learned)]; stats.errors=[...new Set(stats.errors)];
    localStorage.setItem('adham_pro_stats',JSON.stringify(stats));
    // Cloud save (throttled)
    if (currentUser) scheduledDbSave();
    const lc=document.getElementById('learned-count'),ec=document.getElementById('error-count');
    if(lc)lc.innerText=stats.learned.length; if(ec)ec.innerText=stats.errors.length;
    const eb=document.getElementById('error-work-btn'); if(eb)eb.disabled=stats.errors.length===0;
}
function updateCategoryProgress(){
    ['musiqa_nazariyasi','cholgu_ijrochiligi','vokal_ijrochiligi','metodika_repertuar'].forEach(sub=>{
        const subQs=bank.filter(q=>q.subject===sub); if(!subQs.length)return;
        const learned=subQs.filter(q=>stats.learned.includes(q.id)).length;
        const pct=Math.round((learned/subQs.length)*100);
        const el=document.getElementById('prog-'+sub); if(el)el.innerText=pct+'%';
    });
}
function setChartPeriod(period,btn){currentChartPeriod=period;document.querySelectorAll('.chart-tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');updateProgressChart(period);}
function getHistoryByPeriod(period){
    const history=stats.history||[],now=new Date();let labels=[],correctData=[],errorData=[];
    if(period==='daily'){for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);const key=d.toISOString().slice(0,10);const entry=history.find(h=>h.date===key)||{correct:0,errors:0};labels.push(d.toLocaleDateString('uz',{weekday:'short'}));correctData.push(entry.correct||0);errorData.push(entry.errors||0);}}
    else if(period==='weekly'){for(let i=5;i>=0;i--){const ws=new Date(now);ws.setDate(ws.getDate()-ws.getDay()-i*7);const we=new Date(ws);we.setDate(we.getDate()+6);const sk=ws.toISOString().slice(0,10),ek=we.toISOString().slice(0,10);const we2=history.filter(h=>h.date>=sk&&h.date<=ek);labels.push(ws.getDate()+'/'+(ws.getMonth()+1));correctData.push(we2.reduce((s,e)=>s+(e.correct||0),0));errorData.push(we2.reduce((s,e)=>s+(e.errors||0),0));}}
    else{for(let i=5;i>=0;i--){const m=new Date(now.getFullYear(),now.getMonth()-i,1);const key=m.toISOString().slice(0,7);const me=history.filter(h=>h.date.startsWith(key));labels.push(m.toLocaleDateString('uz',{month:'short'}));correctData.push(me.reduce((s,e)=>s+(e.correct||0),0));errorData.push(me.reduce((s,e)=>s+(e.errors||0),0));}}
    return{labels,correctData,errorData};
}
function updateProgressChart(period){
    const canvas=document.getElementById('progressChart');if(!canvas)return;
    const ctx=canvas.getContext('2d');const{labels,correctData,errorData}=getHistoryByPeriod(period);
    const dpr=window.devicePixelRatio||1,W=canvas.offsetWidth||300,H=100;
    canvas.width=W*dpr;canvas.height=H*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,W,H);
    const maxVal=Math.max(...correctData,...errorData,1),padL=6,padR=6,padT=10,padB=18,chartW=W-padL-padR,chartH=H-padT-padB,n=labels.length,step=chartW/(n-1||1);

    // FIX: fill va stroke ajratildi — to'g'ri mix-blend-mode siz ikkalasi ham ko'rinadi
    function drawFill(data,color,alpha){
        ctx.save();
        ctx.beginPath();
        data.forEach((v,i)=>{const x=padL+i*step,y=padT+chartH-(v/maxVal)*chartH;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
        ctx.lineTo(padL+(n-1)*step,padT+chartH);
        ctx.lineTo(padL,padT+chartH);
        ctx.closePath();
        const grad=ctx.createLinearGradient(0,padT,0,padT+chartH);
        const rgb=color.slice(4,-1); // 'rgb(r,g,b)' => 'r,g,b'
        grad.addColorStop(0,`rgba(${rgb},${alpha})`);
        grad.addColorStop(1,`rgba(${rgb},0)`);
        ctx.fillStyle=grad;
        ctx.fill();
        ctx.restore();
    }
    function drawStroke(data,color){
        ctx.save();
        ctx.beginPath();
        data.forEach((v,i)=>{const x=padL+i*step,y=padT+chartH-(v/maxVal)*chartH;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
        ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.lineCap='round';
        ctx.stroke();
        // Dots
        data.forEach((v,i)=>{
            if(v===0)return; // 0 qiymatli nuqtalarni chizmaymiz
            const x=padL+i*step,y=padT+chartH-(v/maxVal)*chartH;
            ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);
            ctx.fillStyle=color;ctx.fill();
        });
        ctx.restore();
    }
    // Avval filllar (pastda), keyin strokelar (ustda) — ikkalasi ham aniq ko'rinadi
    drawFill(correctData,'rgb(48,209,88)',0.22);
    drawFill(errorData,'rgb(255,69,58)',0.18);
    drawStroke(correctData,'rgb(48,209,88)');
    drawStroke(errorData,'rgb(255,69,58)');
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text-sec').trim()||'#6B7280';ctx.font='600 9px DM Sans,sans-serif';ctx.textAlign='center';labels.forEach((l,i)=>ctx.fillText(l,padL+i*step,H-3));
}
function showRentgenOnDashboard(){if(!bank.length)return;const w=document.getElementById('rentgen-dashboard-wrap');if(w){w.style.display='block';updateDashboardRentgen('all');}}
function setRentgenView(view,btn){currentRentgenView=view;document.querySelectorAll('.rentgen-filter .rentgen-tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');updateDashboardRentgen(view);}
function updateDashboardRentgen(view){
    const container=document.getElementById('rentgen-dashboard-bars');if(!container)return;container.innerHTML='';
    ['musiqa_nazariyasi','cholgu_ijrochiligi','vokal_ijrochiligi','metodika_repertuar'].forEach(sub=>{
        const subQs=bank.filter(q=>q.subject===sub);if(!subQs.length)return;
        const lc=subQs.filter(q=>stats.learned.includes(q.id)).length,ec=subQs.filter(q=>stats.errors.includes(q.id)).length;
        let value,color,suffix;
        if(view==='errors'){value=Math.round((ec/subQs.length)*100);color='var(--error)';suffix=`${ec} xato`;}
        else if(view==='learned'){value=Math.round((lc/subQs.length)*100);color='var(--success)';suffix=`${lc} to'g'ri`;}
        else{value=Math.round((lc/subQs.length)*100);color=value>=80?'var(--success)':value>=50?'var(--warning)':'var(--error)';suffix=value+'%';}
        container.innerHTML+=`<div class="rentgen-item"><div class="rentgen-label"><span>${subjectNames[sub]}</span><span style="color:${color}">${suffix}</span></div><div class="rentgen-bar-bg"><div class="rentgen-bar-fill" style="width:${value}%;background:${color};"></div></div></div>`;
    });
}

// ===== TEST ENGINE =====
function openLevels(sub,title){
    forceCloseAllModals();pendingSubject=sub;document.getElementById('modal-subject-title').innerText=title;
    const grid=document.getElementById('level-grid-box');grid.innerHTML='';
    let subQs=bank.filter(q=>q.subject===sub);
    for(let i=0;i<10;i++){let start=i*20,end=start+20;if(start>=subQs.length)break;const chunk=subQs.slice(start,end);const learned=chunk.filter(q=>stats.learned.includes(q.id)).length;const isDone=learned===chunk.length;const btn=document.createElement('button');btn.className='lvl-btn';btn.innerHTML=`<b>${i+1}-Daraja</b><span style="font-size:0.78rem;color:${isDone?'var(--success)':'var(--text-sec)'};">${learned}/${chunk.length} ✓</span>`;btn.onclick=()=>{pendingLevelQs=chunk;testType='level';openSetup();};grid.appendChild(btn);}
    document.getElementById('modal-level').style.display='flex';
}
function openChapters(){
    forceCloseAllModals();const grid=document.getElementById('chapters-grid-box');grid.innerHTML='';
    const cleanBank=[...bank].sort((a,b)=>a.id-b.id);const chunks=Math.ceil(cleanBank.length/20);
    for(let i=0;i<chunks;i++){let start=i*20,end=Math.min(start+20,cleanBank.length);const chunk=cleanBank.slice(start,end);const learned=chunk.filter(q=>stats.learned.includes(q.id)).length;const isDone=learned===chunk.length;const btn=document.createElement('button');btn.className='lvl-btn';btn.innerHTML=`<b>${start+1}–${end}</b><span style="font-size:0.78rem;color:${isDone?'var(--success)':'var(--warning)'};">${learned}/${end-start} ✓</span>`;btn.onclick=()=>{pendingLevelQs=chunk;testType='chapter';openSetup();};grid.appendChild(btn);}
    document.getElementById('modal-chapters').style.display='flex';
}
function prepareTest(type){forceCloseAllModals();if(type==='errors'&&stats.errors.length===0)return alert("Hozircha xatolar topilmadi!");testType=type;openSetup();}
function openSetup(){forceCloseAllModals();document.getElementById('setup-screen').style.display='flex';}
function setDifficulty(level,btn){document.querySelectorAll('.difficulty-control .seg-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');diffTime=level==='easy'?1200:level==='medium'?900:600;}
function setOrder(mode,btn){document.querySelectorAll('.order-control .seg-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');orderMode=mode;}
function applySetup(){
    forceCloseAllModals();isExamMode=false;cheatWarnings=0;comboCount=0;hackerStreak=0;totalErrorsInTest=0;
    document.body.classList.remove('boss-fight-mode');let pool=[];const cleanBank=[...bank].sort((a,b)=>a.id-b.id);
    if(testType==='level'||testType==='chapter'){pool=[...pendingLevelQs];testModeName=testType==='level'?`${pendingSubject} daraja`:"Bob rejimi";}
    else if(testType==='mix_800'){pool=[...cleanBank].sort(()=>Math.random()-0.5).slice(0,20);testModeName="Aralash Smart Mix";}
    else if(testType==='errors'){pool=cleanBank.filter(q=>stats.errors.includes(q.id)).sort(()=>Math.random()-0.5).slice(0,20);testModeName="Xatolar ustida ishlash";}
    else if(testType==='sub_mix'){pool=cleanBank.filter(q=>q.subject===pendingSubject).sort(()=>Math.random()-0.5).slice(0,20);testModeName=(subjectNames[pendingSubject]||pendingSubject)+" aralash";}
    if(orderMode==='random')pool=pool.sort(()=>Math.random()-0.5);else pool=pool.sort((a,b)=>a.id-b.id);
    currentTest=pool;startTestSession();
}
function startExamMode(){
    forceCloseAllModals();testType='exam';isExamMode=true;testModeName="Imtihon Mode · Boss Fight";
    cheatWarnings=0;comboCount=0;hackerStreak=0;totalErrorsInTest=0;
    let examQs=[];['musiqa_nazariyasi','cholgu_ijrochiligi','vokal_ijrochiligi','metodika_repertuar'].forEach(sub=>{const sQs=bank.filter(q=>q.subject===sub).sort(()=>Math.random()-0.5).slice(0,15);examQs=examQs.concat(sQs);});
    currentTest=examQs.sort(()=>Math.random()-0.5);diffTime=3600;startTestSession();
}
function startTestSession(){
    switchScreen('dashboard-screen','test-screen');
    document.getElementById('exit-test-btn').classList.remove('hidden');
    document.getElementById('exam-timer').classList.remove('hidden');
    document.getElementById('restart-mini-btn').classList.add('hidden');
    sendLog('test_start',{mode:testModeName,count:currentTest.length});
    currentIndex=0;userAnswers=new Array(currentTest.length).fill(null);
    currentTest=currentTest.map(q=>{const shuffledOpts=[...q.originalOpts].sort(()=>Math.random()-0.5);return{...q,options:shuffledOpts,answer:shuffledOpts.indexOf(q.correctText)};});
    clearInterval(timerInterval);startTimer(diffTime);renderMap();renderAllQuestions();
    liquidGreenLevel=0;liquidRedLevel=0;gyroX=0;gyroY=0;_applyLiquidLevels();initGyro();
}
function startTimer(seconds){
    let time=seconds;const timerEl=document.getElementById('exam-timer');
    timerInterval=setInterval(()=>{time--;const m=Math.floor(time/60),s=time%60;if(timerEl)timerEl.innerText=`${m}:${s<10?'0'+s:s}`;if(time<=0){clearInterval(timerInterval);showResult(userAnswers.filter(a=>a?.isCorrect).length);}},1000);
}
function renderMap(){const mapEl=document.getElementById('indicator-map');if(mapEl)mapEl.innerHTML=currentTest.map((_,i)=>`<div class="dot" id="dot-${i}" onclick="goTo(${i})">${i+1}</div>`).join('');}
function renderAllQuestions(){
    const area=document.getElementById('all-questions-area');if(!area)return;
    const isAdmin=(currentUser||'').toLowerCase()==='adham';
    area.innerHTML=currentTest.map((q,idx)=>{
        const opts=q.options.map((opt,optIdx)=>{const h=isAdmin&&optIdx===q.answer;return`<button class="option-btn${h?' admin-hint':''}" id="btn-${idx}-${optIdx}" onclick="checkAns(${idx},${optIdx},event)" ${userAnswers[idx]?'disabled':''}>${opt}</button>`;}).join('');
        return`<div class="q-block ${idx===currentIndex?'active-q':'blurred-q'}" id="q-block-${idx}"><div class="q-meta"><button class="tts-btn" onclick="speakQuestion(${idx})">🔊</button><div class="spin-box" id="spin-${idx}">${idx+1}</div><span>Savol ${idx+1} / ${currentTest.length}</span></div><div class="q-text">${q.q}</div><div class="options-box" id="opts-${idx}">${opts}</div></div>`;
    }).join('');
    updateMap();scrollToActive();runSpin(currentIndex);
}
function runSpin(idx){const spin=document.getElementById(`spin-${idx}`);if(!spin)return;let sc=0;const si=setInterval(()=>{spin.innerText=Math.floor(Math.random()*currentTest.length)+1;if(++sc>8){clearInterval(si);spin.innerText=idx+1;}},40);}
function updateFocus(){
    for(let i=0;i<currentTest.length;i++){const b=document.getElementById(`q-block-${i}`);if(b){if(i===currentIndex){b.classList.remove('blurred-q');b.classList.add('active-q');runSpin(i);}else{b.classList.remove('active-q');b.classList.add('blurred-q');}}}
    const bw=document.getElementById('boss-fight-warning');
    if(isExamMode&&currentTest.length>=5&&currentIndex>=currentTest.length-5){document.body.classList.add('boss-fight-mode');if(bw)bw.classList.remove('hidden');}
    else{document.body.classList.remove('boss-fight-mode');if(bw)bw.classList.add('hidden');}
    scrollToActive();updateMap();
}
function scrollToActive(){const ab=document.getElementById(`q-block-${currentIndex}`);if(ab)ab.scrollIntoView({behavior:'smooth',block:'center'});const ad=document.getElementById(`dot-${currentIndex}`);if(ad)ad.scrollIntoView({behavior:'smooth',inline:'center'});}
function updateMap(){
    const answered=userAnswers.filter(a=>a!==null).length;const fe=document.getElementById('progress-fill');if(fe)fe.style.width=`${(answered/currentTest.length)*100}%`;
    currentTest.forEach((_,i)=>{const dot=document.getElementById(`dot-${i}`);if(dot){dot.className='dot';if(i===currentIndex)dot.classList.add('active-dot');if(userAnswers[i])dot.classList.add(userAnswers[i].isCorrect?'correct':'wrong');}});
}

// ===== ANSWER =====
function checkAns(qIdx,optIdx,event){
    if(qIdx!==currentIndex||userAnswers[qIdx])return;
    const now=Date.now();if(now-lastAnswerTime<1500){hackerStreak++;if(hackerStreak===10)showHackerBadge();}else hackerStreak=0;lastAnswerTime=now;
    const isCorrect=optIdx===currentTest[qIdx].answer;userAnswers[qIdx]={selected:optIdx,isCorrect};
    const qId=currentTest[qIdx].id;const clickedBtn=document.getElementById(`btn-${qIdx}-${optIdx}`);
    if(isCorrect){if(!stats.learned.includes(qId))stats.learned.push(qId);stats.errors=stats.errors.filter(id=>id!==qId);clickedBtn.classList.add('magic-correct');playFeedback('correct');createParticles(event);comboCount++;if(comboCount>=3)showComboBadge();updateLiquid('correct');document.body.classList.add('ambient-success');setTimeout(()=>document.body.classList.remove('ambient-success'),650);}
    else{if(!stats.errors.includes(qId))stats.errors.push(qId);clickedBtn.classList.add('magic-wrong');playFeedback('wrong');comboCount=0;hackerStreak=0;totalErrorsInTest++;updateLiquid('wrong');document.body.classList.add('ambient-error');setTimeout(()=>document.body.classList.remove('ambient-error'),650);if(totalErrorsInTest===1)document.getElementById('restart-mini-btn').classList.remove('hidden');}
    // Save: localStorage (immediate) + Google Sheets (throttled 2s)
    localStorage.setItem('adham_pro_stats',JSON.stringify(stats));
    scheduledDbSave();
    const opts=document.getElementById(`opts-${qIdx}`).getElementsByTagName('button');for(const b of opts)b.disabled=true;
    if(userAnswers.filter(a=>a!==null).length===currentTest.length)document.getElementById('finish-btn').classList.remove('hidden');
    setTimeout(()=>{const next=userAnswers.findIndex(a=>a===null);if(next!==-1){currentIndex=next;updateFocus();}},820);
}
function move(step){const n=currentIndex+step;if(n>=0&&n<currentTest.length){currentIndex=n;updateFocus();}}
function goTo(i){currentIndex=i;updateFocus();}
function confirmRestart(){document.getElementById('modal-restart').style.display='flex';}
function doRestart(){
    closeModalDirect('modal-restart');clearInterval(timerInterval);currentIndex=0;userAnswers=new Array(currentTest.length).fill(null);comboCount=0;hackerStreak=0;totalErrorsInTest=0;
    document.body.classList.remove('boss-fight-mode');document.getElementById('finish-btn').classList.add('hidden');document.getElementById('restart-mini-btn').classList.add('hidden');
    const bw=document.getElementById('boss-fight-warning');if(bw)bw.classList.add('hidden');startTimer(diffTime);renderAllQuestions();
}

// ===== FINISH & RESULTS =====
function finishExam(force=false){
    clearInterval(timerInterval);document.body.classList.remove('boss-fight-mode');
    const bw=document.getElementById('boss-fight-warning');if(bw)bw.classList.add('hidden');
    document.getElementById('restart-mini-btn').classList.add('hidden');
    const correctCount=userAnswers.filter(a=>a?.isCorrect).length;
    if(!isExamMode&&correctCount<currentTest.length&&!force){
        alert(`Natija: ${correctCount}/${currentTest.length}.\nQoidaga ko'ra, 100% to'g'ri bo'lmaguncha savollar qayta beriladi.`);
        currentTest=shuffleArray(currentTest).map(q=>{const ct=q.options[q.answer];const so=shuffleArray([...q.options]);return{...q,options:so,answer:so.indexOf(ct)};});
        userAnswers=new Array(currentTest.length).fill(null);currentIndex=0;totalErrorsInTest=0;comboCount=0;
        startTimer(diffTime);renderAllQuestions();document.getElementById('finish-btn').classList.add('hidden');
    }else{
        recordHistory(correctCount,currentTest.length-correctCount);
        showResult(correctCount);
        const pct=Math.round((correctCount/currentTest.length)*100);
        const subjects=[...new Set(currentTest.map(q=>q.subject))].join(',');
        saveLeaderboard(currentUser||'Unknown',pct,subjects,testModeName);
        sendLog('test_finish',{mode:testModeName,correct:correctCount,total:currentTest.length,pct});
        // Final sync to Google Sheets
        if(currentUser) dbSave('stats_'+currentUser, stats);
    }
}
function shuffleArray(arr){return arr.sort(()=>Math.random()-0.5);}
function recordHistory(correct,errors){
    const today=new Date().toISOString().slice(0,10);if(!stats.history)stats.history=[];
    const existing=stats.history.find(h=>h.date===today);
    if(existing){existing.correct+=correct;existing.errors+=errors;}
    else{stats.history.push({date:today,correct,errors});if(stats.history.length>180)stats.history.shift();}
    localStorage.setItem('adham_pro_stats',JSON.stringify(stats));
}
function showResult(correctCount){
    const percent=Math.round((correctCount/currentTest.length)*100);
    document.getElementById('result-percent').innerText=`${percent}%`;
    let msg='',color='';
    if(percent>=90){msg="Muhtasham natija! Siz haqiqiy mutaxassissiz. 🏆";color="var(--success)";confetti({particleCount:220,spread:90,origin:{y:0.6}});document.getElementById('cert-btn').style.display='block';}
    else if(percent>=70){msg="Yaxshi ko'rsatkich! Akademik cho'qqiga oz qoldi. 👍";color="var(--primary)";document.getElementById('cert-btn').style.display='none';}
    else if(percent>=50){msg="Qoniqarli! Intellektual salohiyatingiz bundan baland. 📚";color="var(--warning)";document.getElementById('cert-btn').style.display='none';}
    else{msg="Chuqur tahlil qiling va qayta urinib ko'ring! ⚠";color="var(--error)";document.getElementById('cert-btn').style.display='none';}
    document.getElementById('result-msg').innerText=msg;
    const donut=document.getElementById('result-donut');donut.style.borderColor=color;donut.style.boxShadow=`0 0 35px ${color}`;document.getElementById('result-percent').style.color=color;
    renderRentgenBars('all');renderTradingChart();forceCloseAllModals();document.getElementById('modal-result').style.display='flex';
    donateShownCount++;
    localStorage.setItem('adham_donate_count', donateShownCount);
    // Har 3 testdan keyin Buy Me Coffee modali
    if (donateShownCount % 3 === 0) {
        setTimeout(() => { forceCloseAllModals(); showBuyCoffeeModal(); }, 3000);
    }
}

// ===== BUY ME COFFEE =====
function showBuyCoffeeModal(){const modal=document.getElementById('modal-donate');if(!modal)return;modal.style.display='flex';const content=modal.querySelector('.modal-content');if(content){content.style.animation='none';void content.offsetWidth;content.style.animation='coffeeModalIn 0.6s cubic-bezier(0.175,0.885,0.32,1.275) forwards';}}
function closeCoffeeModal(){const modal=document.getElementById('modal-donate');if(!modal)return;const content=modal.querySelector('.modal-content');for(let i=0;i<20;i++)spawnMagicStar(content);if(content){content.style.animation='coffeeModalOut 0.7s cubic-bezier(0.68,-0.55,0.265,1.55) forwards';setTimeout(()=>{modal.style.display='none';content.style.animation='';},700);}else modal.style.display='none';}
function spawnMagicStar(anchor){const rect=anchor?anchor.getBoundingClientRect():{left:window.innerWidth/2,top:window.innerHeight/2,width:0,height:0};const star=document.createElement('div');star.className='coffee-magic-star';star.innerText=['☕','⭐','✨','💛','🎉','🌟'][Math.floor(Math.random()*6)];star.style.left=(rect.left+rect.width/2)+'px';star.style.top=(rect.top+rect.height/2)+'px';document.body.appendChild(star);const angle=Math.random()*Math.PI*2,dist=80+Math.random()*120,dx=Math.cos(angle)*dist,dy=Math.sin(angle)*dist;star.animate([{transform:'translate(0,0) scale(0.5) rotate(0deg)',opacity:1},{transform:`translate(${dx}px,${dy}px) scale(1.5) rotate(${Math.random()*360}deg)`,opacity:0}],{duration:700+Math.random()*300,easing:'ease-out'});setTimeout(()=>star.remove(),1100);}

// ===== RENTGEN =====
function setResultRentgenView(view,btn){document.querySelectorAll('.rentgen-filter-result .rentgen-tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderRentgenBars(view);}
function renderRentgenBars(view){
    const bc=document.getElementById('rentgen-bars');if(!bc)return;bc.innerHTML='';
    const subjectsInTest=[...new Set(currentTest.map(q=>q.subject))];
    subjectsInTest.forEach(sub=>{
        const subQs=currentTest.filter(q=>q.subject===sub);
        const subCorrect=subQs.filter((q)=>{const idx=currentTest.indexOf(q);return userAnswers[idx]&&userAnswers[idx].isCorrect;}).length;
        const subPercent=Math.round((subCorrect/subQs.length)*100),subError=100-subPercent;
        let barColor,subMsg,displayValue;
        if(view==='errors'){displayValue=subError;barColor=subError>50?'var(--error)':'var(--warning)';subMsg=`${subQs.length-subCorrect} xato`;}
        else if(view==='learned'){displayValue=subPercent;barColor=subPercent>=90?'var(--success)':subPercent>=60?'var(--warning)':'var(--error)';subMsg=`${subCorrect} to'g'ri`;}
        else{displayValue=subPercent;barColor=subPercent>=90?'var(--success)':subPercent>=60?'var(--warning)':'var(--error)';subMsg=subPercent>=90?'(Ajoyib!)':subPercent>=60?'(Yaxshi)':'(Kuchsiz)';}
        bc.innerHTML+=`<div class="rentgen-item"><div class="rentgen-label"><span>${subjectNames[sub]||sub} ${view==='all'?subMsg:''}</span><span style="color:${barColor}">${view==='all'?subPercent+'%':(view==='errors'?(subQs.length-subCorrect)+' xato':subCorrect+" to'g'ri")}</span></div><div class="rentgen-bar-bg"><div class="rentgen-bar-fill" style="width:${displayValue}%;background:${barColor};"></div></div></div>`;
    });
}
function renderTradingChart(){
    const canvas=document.getElementById('tradingChart');if(!canvas)return;const ctx=canvas.getContext('2d');const dpr=window.devicePixelRatio||1,W=canvas.offsetWidth||380,H=90;canvas.width=W*dpr;canvas.height=H*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,W,H);
    const ca=[],ea=[];let c=0,e=0;userAnswers.forEach(ans=>{if(ans===null)return;if(ans.isCorrect)c++;else e++;ca.push(c);ea.push(e);});if(!ca.length)return;
    const maxVal=Math.max(...ca,...ea,1),padL=6,padR=6,padT=8,padB=6,chartW=W-padL-padR,chartH=H-padT-padB,n=ca.length,step=n>1?chartW/(n-1):chartW;
    function drawTL(data,color){ctx.beginPath();data.forEach((v,i)=>{const x=padL+i*step,y=padT+chartH-(v/maxVal)*chartH;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});const grad=ctx.createLinearGradient(0,padT,0,padT+chartH);const rgba=color.includes('48,209')?'48,209,88':'255,69,58';grad.addColorStop(0,`rgba(${rgba},0.2)`);grad.addColorStop(1,`rgba(${rgba},0)`);ctx.lineTo(padL+(n-1)*step,padT+chartH);ctx.lineTo(padL,padT+chartH);ctx.closePath();ctx.fillStyle=grad;ctx.fill();ctx.beginPath();data.forEach((v,i)=>{const x=padL+i*step,y=padT+chartH-(v/maxVal)*chartH;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});ctx.strokeStyle=color;ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();}
    drawTL(ea,'rgb(255,69,58)');drawTL(ca,'rgb(48,209,88)');
}

// ===== CERTIFICATE =====
function showCertificate(){
    const today=new Date();const dateStr=`${today.getDate().toString().padStart(2,'0')}.${(today.getMonth()+1).toString().padStart(2,'0')}.${today.getFullYear()}`;
    document.getElementById('cert-student-name').innerText=currentUser||"Noma'lum Talaba";
    document.getElementById('cert-mode-name').innerText=testModeName||"Test";
    document.getElementById('cert-score').innerText=document.getElementById('result-percent').innerText;
    document.getElementById('cert-global-stats').innerText=`${stats.learned.length}/${bank.length}`;
    document.getElementById('cert-date').innerText=dateStr;
    const barsEl=document.getElementById('cert-subject-bars');
    if(barsEl){barsEl.innerHTML='';const subjectsInTest=[...new Set(currentTest.map(q=>q.subject))];subjectsInTest.forEach(sub=>{const subQs=currentTest.filter(q=>q.subject===sub);const subCorrect=subQs.filter((q)=>{const idx=currentTest.indexOf(q);return userAnswers[idx]&&userAnswers[idx].isCorrect;}).length;const pct=Math.round((subCorrect/subQs.length)*100);barsEl.innerHTML+=`<div class="cert-sub-bar-wrap"><span class="cert-sub-label">${subjectNames[sub]||sub}</span><div class="cert-sub-bar-bg"><div class="cert-sub-bar-fill" style="width:${pct}%"></div></div><span class="cert-sub-pct">${pct}%</span></div>`;});}
    forceCloseAllModals();document.getElementById('modal-cert').style.display='flex';
    confetti({particleCount:300,spread:130,origin:{y:0.5},colors:['#D4AF37','#FFF8E7','#FFFFFF']});
}
async function downloadCertificate(){
    const certEl=document.getElementById('printable-cert');if(!certEl)return;
    const btn=document.querySelector('.cert-download-btn');
    if(btn){btn.innerText='⏳ Tayyorlanmoqda...';btn.disabled=true;}
    try{
        const scale=Math.max(window.devicePixelRatio||1,3);
        const canvas=await html2canvas(certEl,{scale,useCORS:true,allowTaint:true,backgroundColor:'#0A0A0A',logging:false,imageTimeout:15000,onclone:(doc)=>{const cl=doc.getElementById('printable-cert');if(cl){cl.style.width='860px';cl.style.height='auto';cl.style.minHeight='608px';}}});
        const link=document.createElement('a');
        link.download=`PRO_EXAM_Sertifikat_${(currentUser||'Talaba').replace(/\s/g,'_')}.png`;
        link.href=canvas.toDataURL('image/png',1.0);link.click();
        sendLog('cert_download',{user:currentUser,mode:testModeName});
    }catch(e){
        try{const canvas=await html2canvas(certEl,{scale:2,backgroundColor:'#0A0A0A',useCORS:true});const link=document.createElement('a');link.download='PRO_EXAM_Sertifikat.png';link.href=canvas.toDataURL('image/png');link.click();}
        catch(e2){window.print();}
    }finally{if(btn){btn.innerText='⬇ Yuklab olish (PNG)';btn.disabled=false;}}
}

// ============================================================
// LIQUID GYROSCOPE — Haqiqiy suv fizikasi effekti
// ============================================================
let liquidGreenLevel = 0;
let liquidRedLevel   = 0;
let gyroX = 0, gyroY = 0;
let gyroVelX = 0, gyroVelY = 0;
let gyroActive = false;

function initGyro() {
    if (gyroActive || !window.DeviceOrientationEvent) return;
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+ — click event ichida ruxsat so'rash
        const askBtn = document.createElement('button');
        askBtn.id = 'gyro-ask-btn';
        askBtn.style.cssText = 'position:fixed;bottom:120px;right:16px;z-index:9000;background:rgba(22,160,90,0.9);color:#fff;border:none;padding:8px 14px;border-radius:12px;font-weight:700;font-size:0.8rem;cursor:pointer;backdrop-filter:blur(10px);';
        askBtn.innerText = '📱 Suv effekti';
        askBtn.onclick = () => {
            DeviceOrientationEvent.requestPermission()
                .then(state => { if(state==='granted'){attachGyroListener();gyroActive=true;} askBtn.remove(); })
                .catch(() => askBtn.remove());
        };
        document.body.appendChild(askBtn);
        setTimeout(()=>askBtn.remove(), 5000);
    } else {
        attachGyroListener();
        gyroActive = true;
    }
}

function attachGyroListener() {
    window.addEventListener('deviceorientation', (e) => {
        const gamma = Math.max(-45, Math.min(45, e.gamma || 0));
        const beta  = Math.max(-60, Math.min(60, (e.beta||0) - 45));
        const targetX = gamma / 45;
        const targetY = beta  / 60;
        // Inertiya (85% damping)
        gyroVelX = gyroVelX * 0.82 + (targetX - gyroX) * 0.18;
        gyroVelY = gyroVelY * 0.82 + (targetY - gyroY) * 0.18;
        gyroX += gyroVelX;
        gyroY += gyroVelY;
        applyGyroTransform();
    }, { passive: true });
}

function applyGyroTransform() {
    const inner = document.getElementById('liquid-gyro-inner');
    if (!inner) return;
    const tx = gyroX * 24;
    const ty = gyroY * 16;
    const rot = gyroX * 3.5;
    inner.style.transform = `translate3d(${tx}px,${ty}px,0) rotate(${rot}deg)`;
}

function updateLiquid(type) {
    if (type === 'correct') {
        const correctCount = (userAnswers||[]).filter(a => a?.isCorrect).length;
        const total = (currentTest||[]).length || 20;
        liquidGreenLevel = Math.min(78, (correctCount / total) * 82);
    } else if (type === 'wrong') {
        liquidRedLevel = Math.min(40, liquidRedLevel + 14);
        setTimeout(() => { liquidRedLevel = Math.max(0, liquidRedLevel - 10); _applyLiquidLevels(); }, 1600);
    } else if (type === 'reset') {
        liquidGreenLevel = 0; liquidRedLevel = 0;
    }
    _applyLiquidLevels();
}

function _applyLiquidLevels() {
    const wg1=document.getElementById('wg1'), wg2=document.getElementById('wg2');
    const wr1=document.getElementById('wr1'), wr2=document.getElementById('wr2');
    if (!wg1) return;
    wg1.style.bottom = `${-85 + liquidGreenLevel}%`;
    wg2.style.bottom = `${-92 + liquidGreenLevel * 0.88}%`;
    if (liquidRedLevel > 0) {
        wr1.style.opacity = '0.55';
        wr2.style.opacity = '0.40';
        wr1.style.bottom  = `${-95 + liquidRedLevel}%`;
        wr2.style.bottom  = `${-102 + liquidRedLevel * 0.8}%`;
    } else {
        wr1.style.opacity = '0';
        wr2.style.opacity = '0';
    }
}
