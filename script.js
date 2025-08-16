// Copyright (c) 2025 takotime808
// Math Quest — Ultimate
(() => {
  'use strict';

  const $ = (sel, el=document) => el.querySelector(sel);
  const $$ = (sel, el=document) => [...el.querySelectorAll(sel)];

  // i18n
  const i18n = {
    en: {
      'nav.home':'Home', 'nav.map':'Map','nav.store':'Store','nav.quests':'Quests','nav.dashboard':'Dashboard','nav.settings':'Settings','nav.admin':'Admin',
      'home.title':'Welcome, hero!','home.tagline':'Choose your player and begin the adventure.','home.newProfile':'New Player','home.export':'Export','home.import':'Import','home.customize':'Customize','home.name':'Player name','home.language':'Language','home.start':'Start',
      'map.title':'World Map','map.tagline':'Choose a world and level. Clear levels to face the boss!','map.boss':'Boss Battle',
      'game.read':'Read','game.hint':'Hint','game.type':'Type answer','game.tutor':'Tutor mode','game.tenframe':'Ten Frame','game.numline':'Number Line','game.submit':'Submit','game.skip':'Skip','game.quit':'Quit','game.next':'Next',
      'store.title':'Coin Shop','store.tagline':'Earn coins by playing. Buy avatars, themes, and pets!',
      'quests.title':'Daily Quests','quests.streak':'Streak',
      'dash.title':'Dashboard','dash.report':'Report','dash.email':'Parent Email','dash.leaderboard':'Leaderboard (this device)','dash.assignments':'Assignments','dash.newAssign':'New Assignment',
      'settings.title':'Settings','settings.sound':'Sound effects','settings.speak':'Read problems aloud','settings.contrast':'High contrast','settings.big':'Big buttons','settings.tutor':'Tutor mode default','settings.reset':'Reset Profile','settings.install':'Install App',
      'admin.title':'Teacher / Parent','admin.locked':'Enter PIN to unlock adult tools.','admin.unlock':'Unlock','admin.manage':'Manage Profiles','admin.pintitle':'PIN','admin.setpin':'Set PIN','admin.pinnote':'Note: PIN stored only on this device.'
    },
    es: {
      'nav.home':'Inicio','nav.map':'Mapa','nav.store':'Tienda','nav.quests':'Misiones','nav.dashboard':'Panel','nav.settings':'Ajustes','nav.admin':'Adultos',
      'home.title':'¡Bienvenido, héroe!','home.tagline':'Elige tu jugador y empieza la aventura.','home.newProfile':'Nuevo jugador','home.export':'Exportar','home.import':'Importar','home.customize':'Personalizar','home.name':'Nombre','home.language':'Idioma','home.start':'Jugar',
      'map.title':'Mapa del mundo','map.tagline':'Elige un mundo y nivel. ¡Vence al jefe!','map.boss':'Jefe final',
      'game.read':'Leer','game.hint':'Pista','game.type':'Escribir respuesta','game.tutor':'Modo tutor','game.tenframe':'Cuadro de diez','game.numline':'Recta numérica','game.submit':'Enviar','game.skip':'Saltar','game.quit':'Salir','game.next':'Siguiente',
      'store.title':'Tienda de monedas','store.tagline':'Gana monedas jugando. ¡Compra avatares, temas y mascotas!',
      'quests.title':'Misiones diarias','quests.streak':'Racha',
      'dash.title':'Panel','dash.report':'Informe','dash.email':'Correo a padres','dash.leaderboard':'Clasificación (este dispositivo)','dash.assignments':'Tareas','dash.newAssign':'Nueva tarea',
      'settings.title':'Ajustes','settings.sound':'Efectos de sonido','settings.speak':'Leer en voz alta','settings.contrast':'Alto contraste','settings.big':'Botones grandes','settings.tutor':'Modo tutor por defecto','settings.reset':'Reiniciar perfil','settings.install':'Instalar app',
      'admin.title':'Adultos','admin.locked':'Introduce PIN para desbloquear.','admin.unlock':'Desbloquear','admin.manage':'Gestionar perfiles','admin.pintitle':'PIN','admin.setpin':'Guardar PIN','admin.pinnote':'El PIN se guarda solo en este dispositivo.'
    }
  };
  function t(key){ const lang = currentProfile()?.language || 'en'; return i18n[lang][key] || i18n.en[key] || key; }
  function renderI18n(){ $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); }); }

  // PWA
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('./service-worker.js'); }

  // ---------- Persistent state ----------
  const STORAGE_KEY = 'mqUltimateV1';
  const defaultProfile = (name='Player', avatar='🦊') => ({
    id: 'p-' + Math.random().toString(36).slice(2,9),
    name, avatar, language: 'en',
    coins: 0, inventory: { themes: [], pets: [], hats: [] },
    settings: { sound:true, speak:false, contrast:false, big:false, tutor:false },
    streaks: { dailyStreak: 0, lastQuestDate: null },
    // ops: add/sub/mul/div with levels 1..4
    ops: { add: baseProgress(), sub: baseProgress(), mul: baseProgress(), div: baseProgress() },
    modules: { frac: baseProgress(), dec: baseProgress() },
    factStats: { add:{}, sub:{}, mul:{}, div:{}, frac:{}, dec:{} },
    timeline: [], // recent answers
    leaderboard: [],
    assignments: [],
  });
  function baseProgress(){ return { level:1, unlocked:1, stats: {1:statRow(),2:statRow(),3:statRow(),4:statRow()}, badges: [] }; }
  function statRow(){ return { bestScore:0, bestAccuracy:0, bestTime:null }; }

  function loadState(){
    try{ const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : { profiles: [defaultProfile()], currentProfileId: null, pin:null }; }
    catch{ return { profiles:[defaultProfile()], currentProfileId: null, pin:null }; }
  }
  function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  let state = loadState();

  function currentProfile(){
    const id = state.currentProfileId || (state.profiles[0] && state.profiles[0].id);
    return state.profiles.find(p => p.id === id) || state.profiles[0] || null;
  }
  function setCurrentProfile(id){ state.currentProfileId = id; saveState(); renderProfileUI(); }

  // ---------- Audio + Speech ----------
  let audioCtx;
  function beep(type='good'){
    const prof = currentProfile(); if(!prof?.settings.sound) return;
    try{
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination); o.type='sine';
      const now = audioCtx.currentTime;
      if(type==='good'){ o.frequency.value=880; g.gain.setValueAtTime(0.001, now); g.gain.exponentialRampToValueAtTime(0.2, now+0.01); g.gain.exponentialRampToValueAtTime(0.001, now+0.25); }
      else { o.frequency.value=196; g.gain.setValueAtTime(0.001, now); g.gain.exponentialRampToValueAtTime(0.2, now+0.01); g.gain.exponentialRampToValueAtTime(0.001, now+0.45); }
      o.start(now); o.stop(now + (type==='good'?0.26:0.5));
    }catch(e){}
  }
  function speak(text){
    const prof = currentProfile(); if(!prof?.settings.speak || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text); u.rate=0.95; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
  }

  // ---------- DOM refs ----------
  const screens = {
    home: $('#screen-home'),
    map: $('#screen-map'),
    game: $('#screen-game'),
    store: $('#screen-store'),
    quests: $('#screen-quests'),
    dashboard: $('#screen-dashboard'),
    settings: $('#screen-settings'),
    admin: $('#screen-admin')
  };
  const yearEl = $('#year'); yearEl.textContent = new Date().getFullYear();
  $$('.nav-btn').forEach(b => b.addEventListener('click', () => showScreen(b.dataset.target)));

  // Home/Profile
  const profilesList = $('#profilesList');
  const btnNewProfile = $('#btnNewProfile');
  const btnExportProfile = $('#btnExportProfile');
  const fileImport = $('#fileImport');
  const avatarChooser = $('#avatarChooser');
  const playerName = $('#playerName');
  const langSelect = $('#langSelect');
  const btnStart = $('#btnStart');

  // Map/UI
  const worldTabs = $('#worldTabs');
  const levelGrid = $('#levelGrid');
  const bossBtn = $('#btnBoss');
  $('#worldMap').addEventListener('click', (e) => {
    const g = e.target.closest('.island'); if(!g) return;
    const op = g.dataset.op; setOp(op);
  });

  // Game HUD/controls
  const hudAvatar = $('#hudAvatar'), hudPlayer = $('#hudPlayer strong'), hudOp = $('#hudOp strong'), hudLevel = $('#hudLevel strong');
  const hudHearts = $('#hudHearts'), hudCoins = $('#hudCoins'), hudStreak = $('#hudStreak'), hudTime = $('#hudTime');
  const termA = $('#termA'), termB = $('#termB'), termOp = $('#termOp'), termResult = $('#termResult');
  const choicesEl = $('#choices'), typeArea = $('#typeArea'), toggleInputMode = $('#toggleInputMode'), typedAnswer = $('#typedAnswer'), btnSubmit = $('#btnSubmit');
  const btnRead = $('#btnRead'), btnHint = $('#btnHint'), tenFrame = $('#tenFrame'), numberLine = $('#numberLine');
  const feedback = $('#feedback'); const btnSkip = $('#btnSkip'), btnQuit = $('#btnQuit'), btnNext = $('#btnNext'); const toggleTutor = $('#toggleTutor');

  // Store
  const storeItems = $('#storeItems');

  // Quests
  const questList = $('#questList'); const questStreak = $('#questStreak');

  // Dashboard
  const dashTabs = $('#dashTabs'); const heatmapWrap = $('#heatmapWrap'); const reportCharts = $('#reportCharts');
  const btnExportCSV = $('#btnExportCSV'); const btnCopyEmail = $('#btnCopyEmail'); const leaderboardEl = $('#leaderboard');
  const assignmentList = $('#assignmentList'); const btnNewAssignment = $('#btnNewAssignment');

  // Settings
  const optSound = $('#optSound'), optSpeak = $('#optSpeak'), optContrast = $('#optContrast'), optBigButtons = $('#optBigButtons'), optTutor = $('#optTutor');
  const btnReset = $('#btnReset'), btnInstall = $('#btnInstall');

  // Admin
  const pinInput = $('#pinInput'), btnUnlock = $('#btnUnlock'), pinNew = $('#pinNew'), btnSetPin = $('#btnSetPin');
  const adminLocked = $('#adminLocked'); const adminUnlocked = $('#adminUnlocked'); const adminProfiles = $('#adminProfiles');

  // Footer coins
  const footCoins = $('#footCoins');

  // ---------- Screen management ----------
  function showScreen(id){
    Object.values(screens).forEach(s => s.classList.remove('is-active'));
    const el = document.getElementById(id);
    if(el) el.classList.add('is-active');
    if(id==='screen-home') renderHome();
    if(id==='screen-map') renderMap();
    if(id==='screen-store') renderStore();
    if(id==='screen-quests') renderQuests();
    if(id==='screen-dashboard') renderDashboard();
    if(id==='screen-settings') renderSettings();
    if(id==='screen-admin') renderAdmin();
  }

  function renderProfileUI(){
    const prof = currentProfile(); if(!prof) return;
    playerName.value = prof.name; langSelect.value = prof.language;
    renderAvatars();
    renderI18n();
    footCoins.textContent = `🪙 ${prof.coins}`;
  }

  function renderHome(){
    const profs = state.profiles;
    profilesList.innerHTML = '';
    profs.forEach(p => {
      const card = document.createElement('div'); card.className='profile-card';
      card.innerHTML = `
        <div class="profile-head"><span class="hud-avatar">${p.avatar}</span> <strong>${p.name}</strong></div>
        <div class="profile-meta"><span>🪙 ${p.coins}</span><span>⭐ ${totalBadges(p)}</span></div>
        <div class="profile-actions">
          <button class="cta small" data-id="${p.id}">Play</button>
          <button class="ghost small del" data-id="${p.id}">Delete</button>
        </div>`;
      const btn = card.querySelector('.cta'); btn.addEventListener('click', () => { setCurrentProfile(p.id); showScreen('screen-map'); });
      const del = card.querySelector('.del'); del.addEventListener('click', () => { if(confirm('Delete this profile?')){ state.profiles = state.profiles.filter(x=>x.id!==p.id); saveState(); renderHome(); } });
      profilesList.appendChild(card);
    });
    renderProfileUI();
  }
  function totalBadges(p){ let c=0; for(const k of Object.keys(p.ops)){ c += p.ops[k].badges.length; } return c; }

  function renderAvatars(){
    const prof = currentProfile(); const options = ['🦊','🐼','🤖','🦄','🐯','🐶','🐱','🐸','🐧','🐙','🐼‍⬛','🐨'];
    avatarChooser.innerHTML = '';
    options.forEach(emoji => {
      const b = document.createElement('button'); b.className='avatar'; b.textContent = emoji;
      if(emoji===prof.avatar) b.classList.add('is-selected');
      b.addEventListener('click', () => { $$('.avatar', avatarChooser).forEach(x=>x.classList.remove('is-selected')); b.classList.add('is-selected'); prof.avatar = emoji; saveState(); renderProfileUI(); });
      avatarChooser.appendChild(b);
    });
  }

  btnNewProfile.addEventListener('click', () => { const p = defaultProfile('Player ' + (state.profiles.length+1)); state.profiles.push(p); saveState(); renderHome(); });
  btnExportProfile.addEventListener('click', () => {
    const prof = currentProfile(); const blob = new Blob([JSON.stringify(prof,null,2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${prof.name.replace(/\s+/g,'_')}.mqprofile.json`; a.click(); URL.revokeObjectURL(a.href);
  });
  fileImport.addEventListener('change', (e) => {
    const file = e.target.files[0]; if(!file) return;
    const fr = new FileReader(); fr.onload = () => {
      try{ const obj = JSON.parse(fr.result); if(!obj.id) obj.id = 'p-' + Math.random().toString(36).slice(2,9); state.profiles.push(obj); saveState(); renderHome(); }
      catch{ alert('Invalid file.'); }
    }; fr.readAsText(file);
  });

  playerName.addEventListener('input', () => { const p = currentProfile(); p.name = playerName.value || 'Player'; saveState(); renderHome(); });
  langSelect.addEventListener('change', () => { const p = currentProfile(); p.language = langSelect.value; saveState(); renderI18n(); });
  btnStart.addEventListener('click', () => showScreen('screen-map'));

  // ---------- Worlds/Levels ----------
  const worldDefs = [
    { id:'add', name:'+ Addition', icon:'+', levels:[
      {id:1, name:'Sums to 10', type:'sum', ranges:{a:[0,9],b:[0,9]}, cap:10},
      {id:2, name:'Up to 20', type:'sum', ranges:{a:[0,15],b:[0,15]}, cap:20},
      {id:3, name:'Missing Addends', type:'missing', ranges:{a:[0,15],b:[0,15]}, cap:20},
      {id:4, name:'Timed Quest', type:'mix', ranges:{a:[0,15],b:[0,15]}, cap:20, time:60},
    ]},
    { id:'sub', name:'− Subtraction', icon:'−', levels:[
      {id:1, name:'Differences to 10', type:'diff', ranges:{a:[0,10],b:[0,10]}, cap:10},
      {id:2, name:'Up to 20', type:'diff', ranges:{a:[0,20],b:[0,20]}, cap:20},
      {id:3, name:'Missing Parts', type:'missing-sub', ranges:{a:[0,20],b:[0,20]}, cap:20},
      {id:4, name:'Timed Quest', type:'mix-sub', ranges:{a:[0,20],b:[0,20]}, cap:20, time:60},
    ]},
    { id:'mul', name:'× Multiplication', icon:'×', levels:[
      {id:1, name:'Facts up to 5×5', type:'mul', ranges:{a:[0,5],b:[0,5]}},
      {id:2, name:'Facts up to 10×10', type:'mul', ranges:{a:[0,10],b:[0,10]}},
      {id:3, name:'Missing Factor', type:'missing-mul', ranges:{a:[1,10],b:[1,10]}},
      {id:4, name:'Timed Quest', type:'mix-mul', ranges:{a:[0,10],b:[0,10]}, time:60},
    ]},
    { id:'div', name:'÷ Division', icon:'÷', levels:[
      {id:1, name:'Within 20', type:'div', ranges:{a:[1,20],b:[1,10]}},
      {id:2, name:'Up to 100', type:'div', ranges:{a:[1,100],b:[1,10]}},
      {id:3, name:'Missing Part', type:'missing-div', ranges:{a:[1,100],b:[1,10]}},
      {id:4, name:'Timed Quest', type:'mix-div', ranges:{a:[1,100],b:[1,10]}, time:60},
    ]},
    { id:'frac', name:'⅟ Fractions & Decimals', icon:'⅟', levels:[
      {id:1, name:'Same-denominator fractions', type:'frac-sum', ranges:{d:[2,10]} },
      {id:2, name:'One-decimal addition', type:'dec-sum', ranges:{a:[0,90],b:[0,90]} },
      {id:3, name:'Fraction to decimal', type:'frac-to-dec', ranges:{d:[2,10]} },
      {id:4, name:'Mixed Timed', type:'mix-frac', ranges:{}, time:60 },
    ]}
  ];
  let currentOp = 'add';

  function setOp(op){
    currentOp = op;
    renderMap();
  }

  function renderMap(){
    // tabs
    worldTabs.innerHTML='';
    worldDefs.forEach(w => {
      const b = document.createElement('button'); b.className='tab'; b.textContent = w.name;
      if(w.id===currentOp) b.classList.add('is-active');
      b.addEventListener('click', () => setOp(w.id));
      worldTabs.appendChild(b);
    });
    // levels
    levelGrid.innerHTML='';
    const prof = currentProfile(); const prog = progressFor(prof, currentOp);
    const world = worldDefs.find(w => w.id===currentOp);
    world.levels.forEach(lvl => {
      const tile = document.createElement('button'); tile.className='level-tile';
      tile.innerHTML = `<span class="level-icon">⭐</span><span class="level-name">${lvl.name}</span><span class="level-desc">${world.icon} Level ${lvl.id}</span>`;
      const unlocked = lvl.id <= prog.unlocked;
      if(!unlocked){ tile.disabled=true; tile.style.opacity='.5'; }
      tile.addEventListener('click', () => { if(unlocked) startLevel(currentOp, lvl.id, null); });
      levelGrid.appendChild(tile);
    });
    // boss unlocked if all 1..3 cleared
    const bossUnlocked = prog.unlocked >= 4;
    bossBtn.disabled = !bossUnlocked; bossBtn.style.opacity = bossUnlocked? '1':'.5';
    bossBtn.onclick = () => { if(bossUnlocked) startBossBattle(world.id); };
  }

  function progressFor(prof, op){
    if(op==='frac') return prof.modules.frac;
    return prof.ops[op];
  }

  // ---------- Game Engine ----------
  let session = null;

  function startLevel(op, lvlId, practicePair){
    const prof = currentProfile();
    const world = worldDefs.find(w=>w.id===op);
    const lvl = world.levels.find(l=>l.id===lvlId);
    session = {
      op, lvlId, level:lvl, practicePair,
      hearts: 3, score: 0, streak: 0,
      correctCount: 0, attempts: 0,
      startTime: Date.now(), timeLeft: lvl.time || null,
      accuracyWindow: [],
    };
    hudAvatar.textContent = prof.avatar; hudPlayer.textContent = prof.name; hudOp.textContent = world.icon; hudLevel.textContent = String(lvlId);
    $('#toggleTutor').checked = !!prof.settings.tutor;
    updateHUD(); showScreen('screen-game'); nextProblem(); if(lvl.time) startTimer();
  }

  function startBossBattle(op){
    // Boss: 15 rapid-fire problems with shorter timer, more coins
    const prof = currentProfile();
    session = { op, lvlId:'boss', level:{time:45}, hearts:3, score: 0, streak:0, correctCount:0, attempts:0, startTime:Date.now(), timeLeft:45, goal:15, accuracyWindow:[] };
    hudAvatar.textContent = prof.avatar; hudPlayer.textContent = prof.name; hudOp.textContent = '👾'; hudLevel.textContent = 'BOSS';
    showScreen('screen-game'); nextProblem(); startTimer();
  }

  function startTimer(){
    if(session.timer) clearInterval(session.timer);
    session.timer = setInterval(() => {
      if(session.timeLeft == null) return clearInterval(session.timer);
      const elapsed = Math.floor((Date.now()-session.startTime)/1000);
      const total = session.level.time || session.timeLeft;
      session.timeLeft = Math.max(0, (session.level.time || session.timeLeft) - elapsed);
      hudTime.textContent = `⏱️ ${session.timeLeft}s`;
      if(session.timeLeft <= 0){ clearInterval(session.timer); endLevel(false); }
    }, 250);
  }

  function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
  function choice(a){ return a[Math.floor(Math.random()*a.length)]; }
  function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }

  function nextProblem(){
    btnNext.classList.add('hidden'); feedback.textContent=''; hudTime.textContent = session.timeLeft? `⏱️ ${session.timeLeft}s` : '';
    const p = generateProblem(session.op, session.level, session.practicePair);
    session.currentProblem = p;
    renderProblem(p);
    updateHUD();
  }

  function generateProblem(op, lvl, practicePair){
    if(op==='frac') return generateFractionProblem(lvl);
    if(op==='add' || op==='sub' || op==='mul' || op==='div') return generateArithmeticProblem(op, lvl, practicePair);
    return generateArithmeticProblem('add', lvl, practicePair);
  }

  function generateArithmeticProblem(op, lvl, practicePair){
    // returns {displayA,displayB, correctValue, promptType, missing, a,b, opSymbol, choices, hint, readText}
    const opSym = ({add:'+', sub:'−', mul:'×', div:'÷'})[op];
    let a, b;
    if(practicePair){ a = practicePair.a; b = practicePair.b; }
    else {
      const rA = lvl.ranges.a || [0,10], rB = lvl.ranges.b || [0,10];
      a = randInt(rA[0], rA[1]); b = randInt(rB[0], rB[1]);
      if(op==='add' && lvl.cap!=null && a+b>lvl.cap){ return generateArithmeticProblem(op, lvl, practicePair); }
      if(op==='sub'){ if(a<b){ const t=a; a=b; b=t; } }
      if(op==='div'){ if(b===0) b=1; a = a - (a % b); if(a===0) a=b; }
    }

    let promptType = lvl.type || 'sum';
    if(promptType==='mix') promptType = choice(['sum','missing']);
    if(promptType==='mix-sub') promptType = choice(['diff','missing-sub']);
    if(promptType==='mix-mul') promptType = choice(['mul','missing-mul']);
    if(promptType==='mix-div') promptType = choice(['div','missing-div']);
    let missing = null;

    const result = (op==='add')? a+b : (op==='sub')? a-b : (op==='mul')? a*b : Math.floor(a/b);
    let displayA = String(a), displayB = String(b), displayRes = '?';
    if(promptType.startsWith('missing')){
      missing = choice(['a','b']);
      if(missing==='a') displayA='?'; else displayB='?';
      displayRes = (op==='div')? String(a/b) : String(result + (op==='div'?0:0)); // div uses exact numbers
      if(op==='add') displayRes = String(a+b);
      if(op==='sub') displayRes = String(a-b);
      if(op==='mul') displayRes = String(a*b);
      if(op==='div') displayRes = String(a/b);
    }

    const correctValue = (promptType==='sum')? (a+b)
                        : (promptType==='diff')? (a-b)
                        : (promptType==='mul')? (a*b)
                        : (promptType==='div')? (a/b)
                        : (missing==='a'? a : b);

    const choices = new Set([correctValue]);
    while(choices.size < 4){
      const deltas = [-3,-2,-1,1,2,3,4,-4,5,-5];
      let candidate = correctValue + choice(deltas);
      if(op==='div' && promptType!=='missing-div'){ candidate = Math.max(1, Math.round(candidate)); } else { candidate = Math.max(0, candidate); }
      choices.add(candidate);
    }

    const readText = (()=>{
      if(promptType==='sum') return `${a} plus ${b}. What is the total?`;
      if(promptType==='diff') return `${a} minus ${b}. What is the result?`;
      if(promptType==='mul') return `${a} times ${b}. What is the product?`;
      if(promptType==='div') return `${a} divided by ${b}. What is the quotient?`;
      if(missing==='a') return `Blank ${wordOp(op)} ${b} equals ${result}. What goes in the blank?`;
      return `${a} ${wordOp(op)} blank equals ${result}. What goes in the blank?`;
    })();

    const hint = tutorHint(op, a, b, promptType, missing);

    return { a,b, opSymbol:opSym, displayA, displayB, displayRes, correctValue, promptType, missing, choices: shuffle([...choices]), hint, readText };
  }

  function wordOp(op){ return {add:'plus', sub:'minus', mul:'times', div:'divided by'}[op]; }

  function generateFractionProblem(lvl){
    const type = lvl.type;
    if(type==='frac-sum'){
      const d = randInt(2,10); const n1 = randInt(1,d-1); const n2 = randInt(1,d-1);
      const sum = n1 + n2; const correct = sum / d;
      const displayA = `${n1}/${d}`, displayB = `${n2}/${d}`;
      const choices = new Set([ (sum>=d ? (sum/d).toFixed(2) : (sum+'/'+d) ) ]);
      while(choices.size<4){
        const n = Math.max(1, sum + choice([-2,-1,1,2])); choices.add( n>=d ? (n/d).toFixed(2) : (n+'/'+d) );
      }
      return { a:n1,b:n2,d, opSymbol:'+', displayA, displayB, displayRes:'?', correctValue: (sum>=d ? Number((sum/d).toFixed(2)) : `${sum}/${d}`), promptType:'frac-sum', missing:null, choices:[...choices], hint:`Add the numerators and keep denominator ${d}.`, readText:`${n1} over ${d} plus ${n2} over ${d}.` };
    }
    if(type==='dec-sum'){
      const a = randInt(0,90)/10; const b = randInt(0,90)/10; const correct = +(a+b).toFixed(1);
      const choices = new Set([correct]); while(choices.size<4){ choices.add(+((correct + choice([-0.3,-0.2,-0.1,0.1,0.2,0.3])).toFixed(1))); }
      return { a,b, opSymbol:'+', displayA:String(a), displayB:String(b), displayRes:'?', correctValue:correct, promptType:'dec-sum', missing:null, choices:[...choices], hint:'Line up the decimal points and add.', readText:`${a} plus ${b}.` };
    }
    if(type==='frac-to-dec'){
      const d = randInt(2,10); const n = randInt(1,d-1); const correct = +(n/d).toFixed(2);
      const choices = new Set([correct]); while(choices.size<4){ choices.add(+((correct + choice([-0.2,-0.1,0.1,0.2])).toFixed(2))); }
      return { a:n,b:d, opSymbol:'→', displayA:`${n}/${d}`, displayB:'', displayRes:'?', correctValue:correct, promptType:'frac-to-dec', missing:null, choices:[...choices], hint:`Divide ${n} by ${d}.`, readText:`Convert ${n} over ${d} to a decimal.` };
    }
    // mix-frac
    return Math.random()<0.5 ? generateFractionProblem({type:'frac-sum'}) : generateFractionProblem({type:'dec-sum'});
  }

  function tutorHint(op, a, b, pt, missing){
    if(op==='add'){
      if(pt==='sum'){ if(a+b<=10) return `Use ten frame: ${a} dots, add ${b}.`; if(a===b) return `Doubles fact: ${a}+${b}=${a*2}.`; return `Start at ${a} on number line, hop ${b}.`; }
      return `Think: what with ${missing==='a'?b:a} makes ${a+b}?`;
    }
    if(op==='sub'){
      if(pt==='diff'){ return `On the number line: start at ${a}, jump back ${b}.`; }
      return (missing==='a') ? `What number minus ${b} equals ${a-b}?` : `${a} minus what number equals ${a-b}?`;
    }
    if(op==='mul'){
      if(pt==='mul') return `Groups: ${a} groups of ${b}. Repeated addition: ${b}+... ${a} times.`;
      return (missing==='a') ? `What times ${b} equals ${a*b}?` : `${a} times what equals ${a*b}?`;
    }
    if(op==='div'){
      if(pt==='div') return `Sharing: split ${a} into ${b} equal groups.`;
      return (missing==='a') ? `What number divided by ${b} equals ${a/b}?` : `${a} divided by what number equals ${a/b}?`;
    }
    return 'Try a strategy: draw, use number line, or estimate.';
  }

  function renderProblem(p){
    termOp.textContent = p.opSymbol;
    termA.textContent = p.displayA; termB.textContent = p.displayB; termResult.textContent = p.displayRes || '?';
    // choices vs typing
    if(toggleInputMode.checked){ choicesEl.innerHTML=''; typeArea.classList.remove('hidden'); typedAnswer.value=''; typedAnswer.focus(); }
    else { typeArea.classList.add('hidden'); choicesEl.innerHTML=''; p.choices.forEach(v => { const b = document.createElement('button'); b.className='choice'; b.textContent=String(v); b.addEventListener('click', ()=> submitAnswer(valueFromText(String(v)))); choicesEl.appendChild(b); }); }
    // manipulatives
    renderTenFrame(p); renderNumberLine(p);
    btnHint.onclick = ()=>{ feedback.className='feedback'; feedback.textContent = 'Hint: ' + p.hint; };
    const prof = currentProfile(); if(prof?.settings.speak){ speak(p.readText); }
    btnRead.onclick = ()=> speak(p.readText);
  }

  function valueFromText(s){
    // interpret fraction like "3/4" or decimal
    if(s.includes('/')){
      const [n,d] = s.split('/').map(Number); return n/d;
    }
    const num = Number(s); if(!Number.isNaN(num)) return num;
    return s;
  }

  function renderTenFrame(p){
    tenFrame.innerHTML='';
    // Only meaningful for small integers
    const aVal = Number(p.a), bVal = Number(p.b);
    if(!Number.isFinite(aVal) || !Number.isFinite(bVal)) return;
    if(p.opSymbol==='+'){
      const total = Math.min(aVal + bVal, 10);
      for(let i=0;i<10;i++){ const cell=document.createElement('div'); cell.className='ten-cell';
        if(i < Math.min(aVal,10)){ const dot=document.createElement('div'); dot.className='ten-dot'; cell.appendChild(dot); }
        else if(i < total){ const dot=document.createElement('div'); dot.className='ten-dot'; cell.appendChild(dot); }
        tenFrame.appendChild(cell);
      }
    }else if(p.opSymbol==='−'){
      const keep = Math.max(0, aVal - bVal);
      for(let i=0;i<10;i++){ const cell=document.createElement('div'); cell.className='ten-cell';
        if(i < Math.min(aVal,10)){ const dot=document.createElement('div'); dot.className='ten-dot'; if(i >= keep) dot.classList.add('removed'); cell.appendChild(dot); }
        tenFrame.appendChild(cell);
      }
    }else{
      // not rendering for mul/div by default
    }
  }

  function renderNumberLine(p){
    numberLine.innerHTML='';
    const track = document.createElement('div'); track.className='nl-track'; numberLine.appendChild(track);
    const zero = document.createElement('div'); zero.className='nl-zero'; zero.style.left='6%'; zero.textContent='0'; numberLine.appendChild(zero);
    const max =  Math.max(10, (p.opSymbol==='+'? (Number(p.a)+Number(p.b)) : Number(p.a)) || 10, 20);
    const end = document.createElement('div'); end.className='nl-end'; end.style.left='94%'; end.textContent = String(max); numberLine.appendChild(end);
    const pos = (x)=> (6 + (94-6)*(x/max)) + '%';
    const markA = document.createElement('div'); markA.className='nl-marker'; markA.style.left = pos(Number(p.a)||0); markA.textContent = p.a; numberLine.appendChild(markA);
    const out = (p.opSymbol==='+'? (Number(p.a)+Number(p.b)) : (p.opSymbol==='−'? (Number(p.a)-Number(p.b)) : null));
    if(out!=null){
      const markB = document.createElement('div'); markB.className='nl-marker'; markB.style.left = pos(out); markB.textContent = out; numberLine.appendChild(markB);
    }
  }

  btnSubmit.addEventListener('click', () => { const v = typedAnswer.value.trim(); if(v==='') return; submitAnswer(valueFromText(v)); });
  toggleInputMode.addEventListener('change', () => { renderProblem(session.currentProblem); });
  btnNext.addEventListener('click', nextProblem);
  btnSkip.addEventListener('click', nextProblem);
  btnQuit.addEventListener('click', () => showScreen('screen-map'));

  function submitAnswer(value){
    const p = session.currentProblem;
    const correct = Math.abs(Number(value) - Number(valueFromText(String(p.correctValue)))) < 1e-9;
    session.attempts++; session.accuracyWindow.push(correct?1:0); if(session.accuracyWindow.length>12) session.accuracyWindow.shift();
    if(correct){
      beep('good'); session.streak+=1; session.score += 10 + Math.min(session.streak*2, 10); session.correctCount+=1;
      feedback.className='feedback good'; feedback.textContent = choice(['Great!','Nice!','Awesome!','You got it!']);
      btnNext.classList.remove('hidden'); awardCoins(3 + Math.min(session.streak,5));
      if(session.streak===5) addBadge('🔥 Streak x5');
      if(session.correctCount % 10 === 0) addBadge('⭐ '+session.correctCount+' Correct');
      // Boss win condition
      if(session.lvlId==='boss' && session.correctCount >= (session.goal || 15)){ endLevel(true); return; }
      // Level finish condition (targetCorrect similar heuristic)
      if(session.level && session.level.time==null && session.correctCount >= 10){ endLevel(true); return; }
    }else{
      beep('bad'); session.streak=0; session.hearts-=1; feedback.className='feedback bad'; feedback.textContent = choice(['Close! Try again.','Use a hint!','Give it another shot.']);
      if(session.hearts<=0){ endLevel(false); return; }
      if($('#toggleTutor').checked){ feedback.textContent += ' '+ stepByStepTutor(); }
    }
    // Update stats/facts
    recordFact(p, correct);
    updateHUD();
  }

  function stepByStepTutor(){
    const p = session.currentProblem;
    const op = session.op;
    if(op==='add'){ return `Break ${p.b} into tens and ones. Make 10 with ${p.a}.`; }
    if(op==='sub'){ return `Count back ${p.b} from ${p.a} on the number line.`; }
    if(op==='mul'){ return `Think ${p.a} groups of ${p.b}. Add ${p.b} repeatedly.`; }
    if(op==='div'){ return `Share ${p.a} into ${p.b} groups. How many in each?`; }
    return 'Use a drawing or number line to reason it out.';
  }

  function awardCoins(n){ const prof = currentProfile(); prof.coins += n; footCoins.textContent = `🪙 ${prof.coins}`; saveState(); }

  function recordFact(p, correct){
    const prof = currentProfile();
    const op = session.op;
    let key;
    if(op==='add'){ key = canonicalAddKey(p.a,p.b); }
    else if(op==='sub'){ key = `${p.a}-${p.b}`; }
    else if(op==='mul'){ key = canonicalAddKey(p.a,p.b).replace('+','×'); }
    else if(op==='div'){ key = `${p.a}÷${p.b}`; }
    else if(op==='frac'){ key = `${p.displayA}${p.opSymbol}${p.displayB}`; }
    const obj = (prof.factStats[op][key] || {correct:0, attempts:0}); obj.attempts += 1; if(correct) obj.correct += 1; prof.factStats[op][key] = obj;
    // timeline
    prof.timeline.push({ts: Date.now(), op, a:p.a, b:p.b, correct}); if(prof.timeline.length>400) prof.timeline.shift();
    saveState();
  }
  function canonicalAddKey(a,b){ const x=Math.min(a,b), y=Math.max(a,b); return `${x}+${y}`; }

  function endLevel(win){
    if(session.timer){ clearInterval(session.timer); session.timer=null; }
    const prof = currentProfile();
    // update prog
    const prog = session.op==='frac' ? prof.modules.frac : prof.ops[session.op];
    const st = prog.stats[session.lvlId] || statRow();
    const acc = session.attempts ? (session.correctCount/session.attempts) : 0;
    st.bestScore = Math.max(st.bestScore, session.score); st.bestAccuracy = Math.max(st.bestAccuracy, acc);
    const elapsed = Math.floor((Date.now()-session.startTime)/1000); st.bestTime = (st.bestTime==null) ? elapsed : Math.min(st.bestTime, elapsed);
    prog.stats[session.lvlId] = st;
    if(win && session.lvlId!=='boss'){ prog.unlocked = Math.max(prog.unlocked, Number(session.lvlId)+1); addBadge('🏆 Level '+session.lvlId+' Cleared'); awardCoins(20); }
    if(win && session.lvlId==='boss'){ addBadge('👑 Boss Defeated'); awardCoins(50); }
    // leaderboard
    prof.leaderboard.push({mode: `${session.op}-${session.lvlId}`, score: session.score, when: Date.now()}); prof.leaderboard.sort((a,b)=>b.score-a.score); if(prof.leaderboard.length>20) prof.leaderboard.length=20;
    saveState();
    alert(win? 'Level cleared!':'Level over. Try again!');
    showScreen('screen-map');
  }

  // ---------- Store ----------
  const storeCatalog = [
    {id:'theme-night', name:'Night Theme', type:'theme', price:40},
    {id:'theme-forest', name:'Forest Theme', type:'theme', price:40},
    {id:'hat-crown', name:'Crown', type:'hat', price:60},
    {id:'pet-slime', name:'Pet Slime', type:'pet', price:80},
  ];
  function renderStore(){
    const prof = currentProfile();
    storeItems.innerHTML='';
    storeCatalog.forEach(item => {
      const owned = prof.inventory[item.type+'s']?.includes(item.id);
      const div = document.createElement('div'); div.className='store-item';
      div.innerHTML = `<div><strong>${item.name}</strong></div><div class="store-price">🪙 ${item.price}</div>`;
      const btn = document.createElement('button'); btn.className='cta small store-buy'; btn.textContent = owned ? 'Owned' : 'Buy';
      btn.disabled = owned || prof.coins < item.price;
      btn.addEventListener('click', () => {
        if(prof.coins >= item.price){
          prof.coins -= item.price;
          if(!prof.inventory[item.type+'s']) prof.inventory[item.type+'s']=[];
          prof.inventory[item.type+'s'].push(item.id);
          saveState(); renderStore(); renderProfileUI();
        }
      });
      div.appendChild(btn);
      storeItems.appendChild(div);
    });
  }

  // ---------- Quests ----------
  function renderQuests(){
    const prof = currentProfile();
    questList.innerHTML='';
    const today = new Date().toDateString();
    if(prof.streaks.lastQuestDate !== today){
      // roll new quests
      prof.dailyQuests = [
        {id:'q1', text:'Solve 15 problems', goal:15, prog:0, reward:15},
        {id:'q2', text:'Get a streak of 5', goal:5, prog:0, reward:20, type:'streak'},
        {id:'q3', text:'Practice 5 in any world', goal:5, prog:0, reward:10},
      ];
      if(prof.streaks.lastQuestDate){ // if yesterday completed, maintain streak
        const prev = new Date(prof.streaks.lastQuestDate);
        const diff = (new Date(today) - prev)/(24*3600*1000);
        prof.streaks.dailyStreak = (diff<=2) ? (prof.streaks.dailyStreak||0) : 0;
      }
      prof.streaks.lastQuestDate = today; saveState();
    }
    prof.dailyQuests.forEach(q => {
      const div = document.createElement('div'); div.className='quest';
      div.innerHTML = `<div>${q.text} — 🪙 ${q.reward}</div><div class="progress">${Math.min(q.prog,q.goal)}/${q.goal}</div>`;
      questList.appendChild(div);
    });
    questStreak.textContent = String(prof.streaks.dailyStreak || 0);
  }

  // Hook quest progress
  function questTick(event){
    const prof = currentProfile(); if(!prof?.dailyQuests) return;
    prof.dailyQuests.forEach(q => {
      if(q.type==='streak'){ if(session.streak > (q.prog||0)) q.prog = session.streak; if(session.streak>=q.goal && !q.done){ q.done=true; awardCoins(q.reward); addBadge('🔥 Quest streak'); } }
      else { q.prog = (q.prog||0) + 1; if(q.prog>=q.goal && !q.done){ q.done=true; awardCoins(q.reward); addBadge('📜 Quest complete'); } }
    });
    saveState();
  }

  // ---------- Dashboard (Heatmap + Charts + Assignments + Leaderboard) ----------
  function renderDashboard(){
    renderHeatmap(currentOpForDash());
    renderCharts();
    renderLeaderboard();
    renderAssignments();
    // tabs
    dashTabs.innerHTML='';
    ['add','sub','mul','div','frac'].forEach(op => {
      const b = document.createElement('button'); b.className='tab'; b.textContent = opLabel(op);
      if(op===currentOpForDash()) b.classList.add('is-active');
      b.addEventListener('click', ()=>{ setDashOp(op); });
      dashTabs.appendChild(b);
    });
  }
  let dashOp = 'add';
  function setDashOp(op){ dashOp = op; renderDashboard(); }
  function currentOpForDash(){ return dashOp; }
  function opLabel(op){ return ({add:'+', sub:'−', mul:'×', div:'÷', frac:'⅟'})[op] + ' ' + ({add:'Add', sub:'Sub', mul:'Mul', div:'Div', frac:'Frac/Dec'})[op]; }

  function renderHeatmap(op){
    heatmapWrap.innerHTML='';
    const table = document.createElement('table'); table.className='hm';
    const thead = document.createElement('thead'); const headRow = document.createElement('tr'); headRow.appendChild(document.createElement('th'));
    for(let b=0;b<=10;b++){ const th=document.createElement('th'); th.textContent = (op==='add'||op==='mul')? ('b='+b) : (op==='div'?'÷b='+Math.max(1,b): ('b='+b)); headRow.appendChild(th); }
    thead.appendChild(headRow); table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for(let a=0;a<=10;a++){
      const tr=document.createElement('tr'); const th=document.createElement('th'); th.textContent='a='+a; tr.appendChild(th);
      for(let b=0;b<=10;b++){
        const td=document.createElement('td'); td.className='hm-cell';
        let valid=true;
        if(op==='sub' && a<b) valid=false;
        if(op==='div' && b===0) valid=false;
        if(!valid){ td.style.opacity='.25'; td.textContent='—'; tr.appendChild(td); continue; }
        const key = heatKey(op,a,b);
        const rec = currentProfile().factStats[op][key] || {correct:0, attempts:0};
        const acc = rec.attempts ? (rec.correct/rec.attempts) : null;
        const hue = acc==null ? 0 : (acc*120); const bg = acc==null ? '#f1f5ff' : `hsl(${hue} 80% 85%)`; const border = acc==null ? '#e2ecff' : `hsl(${hue} 70% 60%)`;
        td.style.background=bg; td.style.borderColor=border; td.title = `${key} · attempts ${rec.attempts}, accuracy ${acc==null?'–':Math.round(acc*100)+'%'}`;
        td.textContent = previewVal(op,a,b);
        const count = document.createElement('span'); count.className='count'; count.textContent = rec.attempts||''; td.appendChild(count);
        td.addEventListener('click', ()=> startLevel(op==='frac'?'frac':op, 1, op==='div' ? {a: a*(b||1), b: (b||1)} : {a,b}));
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody); heatmapWrap.appendChild(table);
  }
  function heatKey(op,a,b){
    if(op==='add') return canonicalAddKey(a,b);
    if(op==='mul'){ const x=Math.min(a,b), y=Math.max(a,b); return `${x}×${y}`; }
    if(op==='sub') return `${a}-${b}`;
    if(op==='div') return `${a}÷${b}`;
    return `${a}+${b}`;
  }
  function previewVal(op,a,b){
    if(op==='add') return a+b;
    if(op==='sub') return a-b;
    if(op==='mul') return a*b;
    if(op==='div') return b? Math.floor(a/b):'—';
    return '';
  }

  function renderCharts(){
    reportCharts.innerHTML='';
    const prof = currentProfile();
    // Accuracy over time chart (last 50)
    const data = prof.timeline.slice(-50).map((r,i) => ({x:i, y:r.correct?1:0}));
    reportCharts.appendChild(lineChart(data, {title:'Recent Accuracy (1=correct)'}));
    // Streak distribution (simple bar)
    const streaks=[]; let s=0; prof.timeline.forEach(r=>{ if(r.correct){s++} else { if(s>0) streaks.push(s); s=0; } }); if(s>0) streaks.push(s);
    const hist = new Array(6).fill(0); streaks.forEach(v=>{ hist[Math.min(v,5)]++; });
    reportCharts.appendChild(barChart(hist.map((y,i)=>({x: i===5? '5+':String(i), y})), {title:'Streaks histogram'}));
  }

  function lineChart(points, {title=''}={}){
    const wrap = document.createElement('div'); wrap.className='chart';
    const w=600, h=200, pad=24;
    const xs = points.map(p=>p.x), ys=points.map(p=>p.y);
    const minx=Math.min(...xs,0), maxx=Math.max(...xs,1);
    const miny=Math.min(...ys,0), maxy=Math.max(...ys,1);
    const sx = x=> pad + (x-minx)/(maxx-minx||1)*(w-2*pad);
    const sy = y=> h-pad - (y-miny)/(maxy-miny||1)*(h-2*pad);
    let path=''; points.forEach((p,i)=>{ path += (i?'L':'M')+sx(p.x)+','+sy(p.y); });
    wrap.innerHTML = `<strong>${title}</strong><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="${path}" fill="none" stroke="#2d6cdf" stroke-width="2"/></svg>`;
    return wrap;
  }
  function barChart(points, {title=''}={}){
    const wrap = document.createElement('div'); wrap.className='chart';
    const w=600, h=200, pad=24;
    const maxy=Math.max(...points.map(p=>p.y),1);
    const bw=(w-2*pad)/points.length - 8;
    let bars=''; points.forEach((p,i)=>{
      const x = pad + i*((w-2*pad)/points.length) + 4;
      const bh = (p.y/maxy)*(h-2*pad);
      const y = h-pad - bh;
      bars += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="#2d6cdf"></rect>`;
      bars += `<text x="${x+bw/2}" y="${h-6}" font-size="10" text-anchor="middle">${p.x}</text>`;
    });
    wrap.innerHTML = `<strong>${title}</strong><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${bars}</svg>`;
    return wrap;
  }

  function renderLeaderboard(){
    const prof = currentProfile(); leaderboardEl.innerHTML='';
    prof.leaderboard.slice(0,10).forEach((r,i)=>{
      const row=document.createElement('div'); row.className='lb-row';
      row.innerHTML = `<span>${i+1}. ${r.mode}</span><strong>${r.score}</strong><span>${new Date(r.when).toLocaleDateString()}</span>`;
      leaderboardEl.appendChild(row);
    });
  }

  function renderAssignments(){
    const prof = currentProfile(); assignmentList.innerHTML='';
    prof.assignments.forEach((a,idx)=>{
      const el=document.createElement('div'); el.className='assign';
      el.innerHTML = `<div><strong>${a.title}</strong><div class="small">${a.op} · ${a.count} problems · due ${a.due||'—'}</div></div>`;
      const btn=document.createElement('button'); btn.className='cta small'; btn.textContent='Start'; btn.addEventListener('click', ()=> startLevel(a.op, 1, null));
      el.appendChild(btn); assignmentList.appendChild(el);
    });
  }

  btnNewAssignment.addEventListener('click', ()=>{
    const t = prompt('Assignment title?'); if(!t) return;
    const op = prompt('Operation (add, sub, mul, div)?','add');
    const count = Number(prompt('How many problems?','10'))||10;
    currentProfile().assignments.push({title:t, op, count, due:null});
    saveState(); renderAssignments();
  });

  btnExportCSV.addEventListener('click', ()=>{
    const prof=currentProfile(); const rows=[['ts','op','a','b','correct']];
    prof.timeline.forEach(r=> rows.push([new Date(r.ts).toISOString(), r.op, r.a, r.b, r.correct?1:0]));
    const csv = rows.map(r=>r.join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='math-quest-report.csv'; a.click(); URL.revokeObjectURL(a.href);
  });
  btnCopyEmail.addEventListener('click', ()=>{
    const prof = currentProfile();
    const acc = prof.timeline.length ? Math.round(prof.timeline.filter(r=>r.correct).length / prof.timeline.length * 100) : 0;
    const body = encodeURIComponent(`Hi!\n\nHere is ${prof.name}'s progress in Math Quest:\n- Coins: ${prof.coins}\n- Recent accuracy: ${acc}%\n- Badges: ${totalBadges(prof)}\n\n— Sent from Math Quest`);
    const a=document.createElement('a'); a.href=`mailto:?subject=Math%20Quest%20Progress&body=${body}`; a.click();
  });

  // ---------- Settings ----------
  function renderSettings(){
    const p = currentProfile(); optSound.checked = !!p.settings.sound; optSpeak.checked=!!p.settings.speak; optContrast.checked=!!p.settings.contrast; optBigButtons.checked=!!p.settings.big; optTutor.checked=!!p.settings.tutor;
  }
  optSound.addEventListener('change', ()=>{ currentProfile().settings.sound = optSound.checked; saveState(); });
  optSpeak.addEventListener('change', ()=>{ currentProfile().settings.speak = optSpeak.checked; saveState(); });
  optContrast.addEventListener('change', ()=>{ currentProfile().settings.contrast = optContrast.checked; document.documentElement.classList.toggle('high-contrast', optContrast.checked); saveState(); });
  optBigButtons.addEventListener('change', ()=>{ currentProfile().settings.big = optBigButtons.checked; document.body.classList.toggle('big-buttons', optBigButtons.checked); saveState(); });
  optTutor.addEventListener('change', ()=>{ currentProfile().settings.tutor = optTutor.checked; saveState(); });
  btnReset.addEventListener('click', ()=>{ if(confirm('Reset current profile?')){ const i=state.profiles.findIndex(p=>p.id===currentProfile().id); state.profiles[i]=defaultProfile(currentProfile().name, currentProfile().avatar); saveState(); renderProfileUI(); }});

  let deferredPrompt=null;
  window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredPrompt=e; });
  btnInstall.addEventListener('click', async ()=>{ if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt=null; } else { alert('Open in your browser and use "Add to Home Screen".'); } });

  // ---------- Admin ----------
  function renderAdmin(){
    const unlocked = !!sessionStorage.getItem('pin-ok');
    adminLocked.classList.toggle('hidden', unlocked);
    adminUnlocked.classList.toggle('hidden', !unlocked);
    adminProfiles.innerHTML='';
    state.profiles.forEach(p=>{
      const div=document.createElement('div'); div.className='profile-card';
      div.innerHTML = `<div class="profile-head"><span class="hud-avatar">${p.avatar}</span> <strong>${p.name}</strong></div>
        <div class="profile-meta"><span>🪙 ${p.coins}</span><span>Badges ${totalBadges(p)}</span></div>
        <button class="ghost small">Export</button>`;
      const btn = div.querySelector('button'); btn.addEventListener('click', ()=>{
        const blob = new Blob([JSON.stringify(p,null,2)], {type:'application/json'});
        const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${p.name.replace(/\s+/g,'_')}.mqprofile.json`; a.click(); URL.revokeObjectURL(a.href);
      });
      adminProfiles.appendChild(div);
    });
  }
  btnUnlock.addEventListener('click', ()=>{
    const pin = pinInput.value.trim(); if(!pin) return;
    if(!state.pin){ alert('No PIN set yet. Set one below.'); sessionStorage.setItem('pin-ok','1'); renderAdmin(); return; }
    if(pin === state.pin){ sessionStorage.setItem('pin-ok','1'); renderAdmin(); } else { alert('Wrong PIN'); }
  });
  btnSetPin.addEventListener('click', ()=>{ const pin = pinNew.value.trim(); if(!pin) return; state.pin = pin; saveState(); alert('PIN saved.'); });

  // ---------- HUD ----------
  function updateHUD(){
    const prof=currentProfile(); hudHearts.textContent='❤️'.repeat(Math.max(0,session.hearts)); hudCoins.textContent=`🪙 ${prof.coins}`; hudStreak.textContent='Streak: '+session.streak;
  }

  // ---------- INIT ----------
  showScreen('screen-home'); renderHome(); document.documentElement.classList.toggle('high-contrast', !!currentProfile().settings.contrast); document.body.classList.toggle('big-buttons', !!currentProfile().settings.big);
  $('#year').textContent = new Date().getFullYear();

})();