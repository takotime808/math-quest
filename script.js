// Copyright (c) 2025 takotime808
// Math Quest — Addition Adventure
// A lightweight, accessible, game-style site that teaches addition.
// No frameworks or external assets required.

(() => {
  'use strict';

  const $ = (sel, el=document) => el.querySelector(sel);
  const $$ = (sel, el=document) => [...el.querySelectorAll(sel)];

  // ---------- Persistent state ----------
  const STORAGE_KEY = 'mathQuestV1';
  const defaultState = {
    playerName: 'Player',
    avatar: 'fox',
    settings: { sound: true, speak: false, highContrast: false, bigButtons: false },
    progress: {
      level: 1,
      unlocked: 1,
      stats: {
        1: { bestScore: 0, bestAccuracy: 0, bestTime: null },
        2: { bestScore: 0, bestAccuracy: 0, bestTime: null },
        3: { bestScore: 0, bestAccuracy: 0, bestTime: null },
        4: { bestScore: 0, bestAccuracy: 0, bestTime: null },
      },
      badges: []
    }
  };

  let state = loadState();

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(defaultState);
      const parsed = JSON.parse(raw);
      return { ...structuredClone(defaultState), ...parsed };
    }catch(e){
      console.warn('Could not load state:', e);
      return structuredClone(defaultState);
    }
  }
  function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  // ---------- Utils ----------
  function randInt(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]];} return a; }
  function choice(a){ return a[Math.floor(Math.random()*a.length)]; }

  // SFX without files (WebAudio beeps)
  let audioCtx;
  function beep(type='good'){
    if(!state.settings.sound) return;
    try{
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.type = 'sine';
      const now = audioCtx.currentTime;
      if(type === 'good'){ o.frequency.value = 880; g.gain.setValueAtTime(0.001, now); g.gain.exponentialRampToValueAtTime(0.2, now+0.01); g.gain.exponentialRampToValueAtTime(0.001, now+0.25); }
      else { o.frequency.value = 196; g.gain.setValueAtTime(0.001, now); g.gain.exponentialRampToValueAtTime(0.2, now+0.01); g.gain.exponentialRampToValueAtTime(0.001, now+0.45); }
      o.start(now); o.stop(now + (type==='good' ? 0.26 : 0.5));
    }catch(e){/* ignore */}
  }

  function speak(text){
    if(!state.settings.speak || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  // ---------- DOM references ----------
  const screens = {
    home: $('#screen-home'),
    map: $('#screen-map'),
    game: $('#screen-game'),
    progress: $('#screen-progress'),
    settings: $('#screen-settings')
  };
  const yearEl = $('#year');
  yearEl.textContent = new Date().getFullYear();

  // nav
  $$('.nav-btn').forEach(b => b.addEventListener('click', () => showScreen(b.dataset.target)));
  let advancing = false; // prevents double submissions while we auto-advance

  // Home
  const nameInput = $('#playerName');
  const avatarButtons = $$('.avatar');
  const btnStart = $('#btnStart');
  const dlgHowTo = $('#dlgHowTo');
  $('#btnHowTo').addEventListener('click', () => dlgHowTo.showModal());

  // Map
  const levelTiles = $$('.level-tile');

  // Game/HUD
  const hudAvatar = $('#hudAvatar');
  const hudPlayer = $('#hudPlayer strong');
  const hudLevel = $('#hudLevel strong');
  const hudHearts = $('#hudHearts');
  const hudScore = $('#hudScore');
  const hudStreak = $('#hudStreak');

  const termA = $('#termA');
  const termB = $('#termB');
  const termResult = $('#termResult');
  const choicesEl = $('#choices');
  const typeArea = $('#typeArea');
  const toggleInputMode = $('#toggleInputMode');
  const typedAnswer = $('#typedAnswer');
  const btnSubmit = $('#btnSubmit');
  const btnRead = $('#btnRead');
  const btnHint = $('#btnHint');
  const tenFrame = $('#tenFrame');
  const numberLine = $('#numberLine');
  const feedback = $('#feedback');
  const btnSkip = $('#btnSkip');
  const btnQuit = $('#btnQuit');
  const btnNext = $('#btnNext');

  // Allow Enter key to submit typed answers
  typedAnswer.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = typedAnswer.value.trim();
      if (v !== '') submitAnswer(Number(v));
    }
  });

  // Progress
  const badgeList = $('#badgeList');
  const statsRows = $('#statsRows');

  // Settings
  const optSound = $('#optSound');
  const optSpeak = $('#optSpeak');
  const optContrast = $('#optContrast');
  const optBigButtons = $('#optBigButtons');
  const btnReset = $('#btnReset');

  // ---------- Screen management ----------
  function showScreen(id){
    Object.values(screens).forEach(s => s.classList.remove('is-active'));
    const el = document.getElementById(id);
    if(el) el.classList.add('is-active');
    if(id === 'screen-map') renderMap();
    if(id === 'screen-progress') renderProgress();
    if(id === 'screen-settings') renderSettings();
  }

  // ---------- Avatar + name ----------
  nameInput.value = state.playerName;
  nameInput.addEventListener('input', () => { state.playerName = nameInput.value || 'Player'; saveState(); });
  avatarButtons.forEach(btn => {
    if(btn.dataset.avatar === state.avatar) btn.classList.add('is-selected');
    btn.addEventListener('click', () => {
      avatarButtons.forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      state.avatar = btn.dataset.avatar;
      saveState();
    });
  });

  btnStart.addEventListener('click', () => showScreen('screen-map'));

  // ---------- Level map ----------
  levelTiles.forEach(tile => {
    const lvl = Number(tile.dataset.level);
    tile.addEventListener('click', () => {
      if(lvl <= state.progress.unlocked){
        startLevel(lvl);
      }else{
        alert('Beat earlier levels to unlock this one!');
      }
    });
  });

  function renderMap(){
    levelTiles.forEach(tile => {
      const lvl = Number(tile.dataset.level);
      if(lvl <= state.progress.unlocked){
        tile.removeAttribute('disabled');
        tile.style.opacity = '1';
      }else{
        tile.setAttribute('disabled', 'true');
        tile.style.opacity = '.5';
      }
    });
  }

  // ---------- Settings ----------
  function renderSettings(){
    optSound.checked = !!state.settings.sound;
    optSpeak.checked = !!state.settings.speak;
    optContrast.checked = !!state.settings.highContrast;
    optBigButtons.checked = !!state.settings.bigButtons;
  }
  optSound.addEventListener('change', () => { state.settings.sound = optSound.checked; saveState(); });
  optSpeak.addEventListener('change', () => { state.settings.speak = optSpeak.checked; saveState(); });
  optContrast.addEventListener('change', () => {
    state.settings.highContrast = optContrast.checked; 
    document.documentElement.classList.toggle('high-contrast', optContrast.checked);
    saveState();
  });
  optBigButtons.addEventListener('change', () => {
    state.settings.bigButtons = optBigButtons.checked;
    document.body.classList.toggle('big-buttons', optBigButtons.checked);
    saveState();
  });
  btnReset.addEventListener('click', () => {
    if(confirm('Reset all progress and settings?')){
      state = structuredClone(defaultState);
      saveState();
      renderSettings();
      renderProgress();
      renderMap();
      showScreen('screen-home');
    }
  });

  // Apply persisted UI prefs on load
  document.documentElement.classList.toggle('high-contrast', !!state.settings.highContrast);
  document.body.classList.toggle('big-buttons', !!state.settings.bigButtons);

  // ---------- Progress ----------
  function renderProgress(){
    // badges
    badgeList.innerHTML = '';
    const badges = state.progress.badges.length ? state.progress.badges : ['🏁 Beginner'];
    badges.forEach(b => {
      const li = document.createElement('li');
      li.className = 'badge';
      li.textContent = b;
      badgeList.appendChild(li);
    });
    // table
    statsRows.innerHTML = '';
    for(const lvl of [1,2,3,4]){
      const row = document.createElement('tr');
      const st = state.progress.stats[lvl];
      const acc = st.bestAccuracy ? Math.round(st.bestAccuracy*100) + '%' : '-';
      const time = (st.bestTime != null) ? (st.bestTime + 's') : '-';
      row.innerHTML = `<td>${lvl}</td><td>${st.bestScore}</td><td>${acc}</td><td>${time}</td>`;
      statsRows.appendChild(row);
    }
  }

  // ---------- Game Engine ----------
  const levelConfigs = {
    1: { name: 'Sums to 10', targetCorrect: 8, hearts: 3, type: 'sum', rangeA:[0,9], rangeB:[0,9], sumCap: 10, timeLimit: null },
    2: { name: 'Up to 20', targetCorrect: 10, hearts: 3, type: 'sum', rangeA:[0,15], rangeB:[0,15], sumCap: 20, timeLimit: null },
    3: { name: 'Missing Addends', targetCorrect: 10, hearts: 3, type: 'missing', rangeA:[0,15], rangeB:[0,15], sumCap: 20, timeLimit: null },
    4: { name: 'Timed Quest', targetCorrect: 12, hearts: 3, type: 'mix', rangeA:[0,15], rangeB:[0,15], sumCap: 20, timeLimit: 60 },
  };

  let session = null;
  function startLevel(lvl){
    const cfg = levelConfigs[lvl];
    session = {
      level: lvl,
      hearts: cfg.hearts,
      score: 0,
      streak: 0,
      correctCount: 0,
      attempts: 0,
      startTime: Date.now(),
      timeLeft: cfg.timeLimit,
      accuracyWindow: []
    };
    hudAvatar.textContent = avatarEmoji(state.avatar);
    hudPlayer.textContent = state.playerName || 'Player';
    hudLevel.textContent = String(lvl);
    updateHUD();
    showScreen('screen-game');
    nextProblem();
    if(cfg.timeLimit) startTimer();
  }

  function avatarEmoji(name){
    return { fox:'🦊', panda:'🐼', robot:'🤖', unicorn:'🦄' }[name] || '🦊';
  }

  function updateHUD(){
    hudHearts.textContent = '❤️'.repeat(Math.max(session.hearts,0));
    hudScore.textContent = 'Score: ' + session.score;
    hudStreak.textContent = 'Streak: ' + session.streak;
  }

  function startTimer(){
    if(session.timer) clearInterval(session.timer);
    session.timer = setInterval(() => {
      const cfg = levelConfigs[session.level];
      if(cfg.timeLimit == null) return clearInterval(session.timer);
      const elapsed = Math.floor((Date.now() - session.startTime)/1000);
      session.timeLeft = Math.max(0, cfg.timeLimit - elapsed);
      if(session.timeLeft <= 0){
        clearInterval(session.timer);
        endLevel(false);
      }
      // show time in score pill for quick glance
      hudScore.textContent = `Score: ${session.score} · ${session.timeLeft}s`;
    }, 200);
  }

  // Problem generation
  function generateProblem(level){
    const cfg = levelConfigs[level];
    let type = cfg.type;
    if(type === 'mix') type = choice(['sum','missing']);

    let a, b, sum;
    const [minA, maxA] = cfg.rangeA;
    const [minB, maxB] = cfg.rangeB;
    if(cfg.sumCap != null){
      // draw until sum constraint satisfied
      do {
        a = randInt(minA, maxA);
        b = randInt(minB, maxB);
        sum = a + b;
      } while (sum > cfg.sumCap);
    } else {
      a = randInt(minA, maxA);
      b = randInt(minB, maxB);
      sum = a + b;
    }

    let promptType = 'sum'; // 'sum' => a + b = ?
    let missing = null;     // 'a' or 'b'
    if(type === 'missing'){
      promptType = 'missing';
      missing = choice(['a','b']);
    }

    // Choices
    const correct = (promptType === 'sum') ? sum : (missing === 'a' ? a : b);
    const choices = new Set([correct]);
    // generate reasonable distractors
    while(choices.size < 4){
      const delta = choice([-2,-1,1,2,3,-3,4,-4]);
      const c = Math.max(0, correct + delta);
      choices.add(c);
    }
    const choicesArr = shuffle([...choices]);

    // Hints
    const hint = makeHint(a,b,promptType,missing);

    return { a, b, sum, promptType, missing, correct, choices: choicesArr, hint };
  }

  function makeHint(a,b,pt,missing){
    if(pt === 'sum'){
      if(a + b <= 10) return `Use the ten frame: show ${a} dots, then add ${b} more.`;
      if(a === b) return `Doubles fact! ${a} + ${b} = ${a*2}.`;
      if(a + b === 10) return `Make 10: ${a} + ${b} = 10.`;
      if(a + b <= 12) return `Think: ${a} + ${b} is close to 10.`;
      return `Jump on the number line: start at ${a}, hop ${b} steps.`;
    } else {
      // missing addend
      const need = (missing === 'a') ? a : b;
      return `Think: ${a} + ${b} = ${a+b}. What number with ${missing==='a'?b:a} makes ${a+b}?`;
    }
  }

  // Compute expected answer from operands (robust for 0-cases)
  function expectedAnswer(p){
    return (p.promptType === 'sum') ? (p.a + p.b) : (p.missing === 'a' ? p.a : p.b);
  }

  // Render helpers
  function renderProblem(p){
    // Default to sum layout: a + b = ?
    termA.textContent = p.promptType === 'missing' && p.missing === 'a' ? '?' : String(p.a);
    termB.textContent = p.promptType === 'missing' && p.missing === 'b' ? '?' : String(p.b);
    termResult.textContent = p.promptType === 'sum' ? '?' : String(p.a + p.b);

    // Choices or typing
    if(toggleInputMode.checked){
      choicesEl.innerHTML = '';
      typeArea.classList.remove('hidden');
      typedAnswer.value = '';
      typedAnswer.focus();

      // important: disable MC key shortcuts in typing mode
      document.onkeydown = null;
    }else{
      typeArea.classList.add('hidden');
      choicesEl.innerHTML = '';
      p.choices.forEach(val => {
        const btn = document.createElement('button');
        btn.className = 'choice';
        btn.textContent = String(val);
        btn.setAttribute('aria-pressed','false');
        btn.addEventListener('click', () => submitAnswer(val));
        choicesEl.appendChild(btn);
      });
      // keyboard support: numbers 0-9 quick select if visible
      document.onkeydown = (e) => {
        if(e.key >= '0' && e.key <= '9'){
          const n = Number(e.key);
          const btn = $$('.choice').find(b => Number(b.textContent) === n);
          if(btn) btn.click();
        }
      };
    }

    // manipulatives
    renderTenFrame(p);
    renderNumberLine(p);

    // speak the problem
    const readText = (p.promptType === 'sum')
      ? `${p.a} plus ${p.b}. What is the total?`
      : (p.missing === 'a'
        ? `Blank plus ${p.b} equals ${p.a + p.b}. What goes in the blank?`
        : `${p.a} plus blank equals ${p.a + p.b}. What goes in the blank?`);
    if(state.settings.speak) speak(readText);

    // hint button
    btnHint.onclick = () => {
      feedback.className = 'feedback';
      feedback.textContent = 'Hint: ' + p.hint;
    };

    // read button
    btnRead.onclick = () => speak(readText);
  }

  // Ten-frame: show addend A as filled, addend B as hollow placeholders (no reveal)
  function renderTenFrame(p){
    tenFrame.innerHTML = '';
    const a = Math.min(p.a, 10);
    const upTo = Math.min(p.a + p.b, 10); // how far the frame will eventually fill

    for (let i = 0; i < 10; i++) {
      const cell = document.createElement('div');
      cell.className = 'ten-cell';

      if (i < a) {
        // filled dots for the first addend
        const dot = document.createElement('div');
        dot.className = 'ten-dot';
        cell.appendChild(dot);
      } else if (i < upTo) {
        // hollow placeholders for the second addend (no reveal)
        const ghost = document.createElement('div');
        ghost.className = 'ten-dot';
        ghost.style.background = 'transparent';
        ghost.style.border = '2px dashed #cddfff';
        cell.appendChild(ghost);
      }
      // cells beyond (a+b) remain empty
      tenFrame.appendChild(cell);
    }
  }

  // Number line: show start at a; put '?' at a+b (no reveal)
  function renderNumberLine(p){
    numberLine.innerHTML = '';

    const track = document.createElement('div');
    track.className = 'nl-track';
    numberLine.appendChild(track);

    const zero = document.createElement('div');
    zero.className = 'nl-zero';
    zero.style.left = '6%';
    zero.textContent = '0';
    numberLine.appendChild(zero);

    const max = Math.max(10, p.a + p.b, p.a, p.b, 20);
    const end = document.createElement('div');
    end.className = 'nl-end';
    end.style.left = '94%';
    end.textContent = String(max);
    numberLine.appendChild(end);

    const pos = (x) => (6 + (94 - 6) * (x / max)) + '%';

    // start marker at "a"
    const markA = document.createElement('div');
    markA.className = 'nl-marker';
    markA.style.left = pos(p.a);
    markA.textContent = p.a;
    numberLine.appendChild(markA);

    // final marker is a question mark — no answer reveal
    const markQ = document.createElement('div');
    markQ.className = 'nl-marker';
    markQ.style.left = pos(p.a + p.b);
    markQ.textContent = '?';
    numberLine.appendChild(markQ);
  }

  // Submit answers (compute expected answer from operands to avoid edge-case bugs)
  function submitAnswer(value){
    if (advancing) return; // ignore extra clicks/keys during transition

    const p = session.currentProblem;
    const want = Number(expectedAnswer(p));
    const got  = Number(value);
    const correct = Number.isFinite(want) && Number.isFinite(got) && got === want;

    session.attempts++;
    session.accuracyWindow.push(correct ? 1 : 0);
    if(session.accuracyWindow.length > 12) session.accuracyWindow.shift();

    if(correct){
      beep('good');
      session.score += 10 + Math.min(session.streak*2, 10);
      session.streak += 1;
      session.correctCount += 1;
      feedback.className = 'feedback good';
      feedback.textContent = choice(['Great!', 'Nice!', 'You got it!', 'Awesome!']);

      // badges
      if(session.streak === 5) addBadge('🔥 Streak x5');
      if(session.correctCount === 5) addBadge('⭐ 5 Correct');

      // level completion?
      const target = levelConfigs[session.level].targetCorrect;
      if(session.correctCount >= target){
        endLevel(true);
        return;
      }

      // ---- Auto-advance after a short pause ----
      advancing = true;

      // temporarily disable inputs
      $$('.choice').forEach(b => b.disabled = true);
      btnSubmit.disabled = true;
      typedAnswer.disabled = true;

      setTimeout(() => {
        // reset input disabled state for the next problem
        $$('.choice').forEach(b => b.disabled = false);
        btnSubmit.disabled = false;
        typedAnswer.disabled = false;

        btnNext.classList.add('hidden'); // keep Next hidden; we auto-advance
        nextProblem();
        advancing = false;
      }, 700); // feel free to tweak (500–900ms works nicely)
    } else {
      beep('bad');
      session.streak = 0;
      session.hearts -= 1;
      updateHUD();
      feedback.className = 'feedback bad';
      feedback.textContent = choice(['Close, try again!', 'Not quite—use a hint.', 'Give it another shot!']);
      if(session.hearts <= 0){
        endLevel(false);
        return;
      }
    }

    // adaptive difficulty
    adaptDifficulty();
  }


  // Adaptive difficulty by adjusting the operand ranges in the level config
  function adaptDifficulty(){
    const acc = session.accuracyWindow.reduce((a,c)=>a+c,0) / session.accuracyWindow.length;
    const cfg = levelConfigs[session.level];
    if(acc >= 0.85){
      cfg.rangeA[1] = Math.min(cfg.rangeA[1] + 1, 20);
      cfg.rangeB[1] = Math.min(cfg.rangeB[1] + 1, 20);
      if(cfg.sumCap != null) cfg.sumCap = Math.min((cfg.sumCap + 1), 20);
    }else if(acc <= 0.6){
      cfg.rangeA[1] = Math.max(cfg.rangeA[1] - 1, 9);
      cfg.rangeB[1] = Math.max(cfg.rangeB[1] - 1, 9);
      if(cfg.sumCap != null) cfg.sumCap = Math.max((cfg.sumCap - 1), 10);
    }
  }

  function nextProblem(){
    btnNext.classList.add('hidden');
    feedback.textContent = '';
    const p = generateProblem(session.level);
    session.currentProblem = p;
    renderProblem(p);
    updateHUD();
  }

  btnNext.addEventListener('click', nextProblem);
  btnSkip.addEventListener('click', nextProblem);
  btnQuit.addEventListener('click', () => { showScreen('screen-map'); });

  btnSubmit.addEventListener('click', () => {
    const v = typedAnswer.value.trim();
    if(v === '') return;
    submitAnswer(Number(v));
  });

  toggleInputMode.addEventListener('change', () => {
    renderProblem(session.currentProblem);
  });

  // end level
  function endLevel(win){
    if(session.timer) { clearInterval(session.timer); session.timer = null; }

    const cfg = levelConfigs[session.level];
    const elapsed = Math.floor((Date.now() - session.startTime)/1000);
    const accuracy = session.attempts ? (session.correctCount / session.attempts) : 0;

    // Update progress stats
    const st = state.progress.stats[session.level];
    st.bestScore = Math.max(st.bestScore, session.score);
    st.bestAccuracy = Math.max(st.bestAccuracy, accuracy);
    st.bestTime = st.bestTime == null ? elapsed : Math.min(st.bestTime, elapsed);

    // unlock next level if win
    if(win && state.progress.unlocked < 4){
      state.progress.unlocked = Math.max(state.progress.unlocked, session.level + 1);
      addBadge('🏆 Level ' + session.level + ' Cleared');
    }
    saveState();

    // Clearer dialog + correct answer for the last problem on loss
    let header = win ? 'Level cleared!' : 'Level over. Try again!';
    let details = `Final score: ${session.score}.`;

    if(!win && session?.currentProblem){
      const p = session.currentProblem;
      const want = expectedAnswer(p); // uses the helper that computes from operands
      const sum = p.a + p.b;

      const lastLine = (p.promptType === 'sum')
        ? `Last problem: ${p.a} + ${p.b} = ${sum}.`
        : `Last problem: ${p.missing==='a'?'?':p.a} + ${p.missing==='b'?'?':p.b} = ${sum}. Correct blank: ${want}.`;

      details += `\n${lastLine}`;
    }

    alert(`${header}\n${details}`);
    showScreen('screen-map');
  }


  function addBadge(name){
    if(!state.progress.badges.includes(name)){
      state.progress.badges.push(name);
      saveState();
    }
  }

  // ---------- Init HUD ----------
  hudAvatar.textContent = avatarEmoji(state.avatar);
  hudPlayer.textContent = state.playerName || 'Player';
  hudLevel.textContent = String(state.progress.level);
  updateHUD();

  // Default to home screen
  showScreen('screen-home');

})();
