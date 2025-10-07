// Synge Street Open Day 2025. Turbo Sample — Levels, High Scores, Voice I/O
(()=>{
  const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));

  // ----- CONFIG (Open Day) -----
  const CONFIG = {
    title: "Synge Street Open Day 2025. Turbo Sample",
    QUESTIONS_PER_RUN: 10,
    PENALTY_SECONDS: 30, // keep as in originals
    UNLOCKS: { L2: 90, L3: 85 } // unlock targets (seconds)
  };

  // ----- Beginner PHRASES per LEVEL (Present-only) -----
  const LEVELS = {
    L1: {
      label: "Level 1 — Greetings & Basics",
      items: [
        {en:"Hello", es:"hola"},
        {en:"Good morning", es:"buenos días"},
        {en:"Good afternoon", es:"buenas tardes"},
        {en:"Good night", es:"buenas noches"},
        {en:"Please", es:"por favor"},
        {en:"Thank you", es:"gracias"},
        {en:"You're welcome", es:"de nada"},
        {en:"Yes", es:"sí"},
        {en:"No", es:"no"},
        {en:"How are you? (singular)", es:"¿cómo estás?"},
        {en:"I am well", es:"estoy bien"},
        {en:"I am very well", es:"estoy muy bien"},
        {en:"Excuse me", es:"perdón"},
        {en:"Sorry", es:"lo siento"}
      ]
    },
    L2: {
      label: "Level 2 — Where is…? (School)",
      items: [
        {en:"Where is the bathroom?", es:"¿dónde está el baño?"},
        {en:"Where is the school?", es:"¿dónde está la escuela?"},
        {en:"Where is the classroom?", es:"¿dónde está la clase?"},
        {en:"Where is the entrance?", es:"¿dónde está la entrada?"},
        {en:"Where is the exit?", es:"¿dónde está la salida?"},
        {en:"Where is the office?", es:"¿dónde está la oficina?"},
        {en:"Where is the canteen?", es:"¿dónde está la cafetería?"},
        {en:"Where is the sports hall?", es:"¿dónde está el polideportivo?"},
        {en:"Where is the library?", es:"¿dónde está la biblioteca?"},
        {en:"Where is the shop?", es:"¿dónde está la tienda?"}
      ]
    },
    L3: {
      label: "Level 3 — Goodbyes & Niceties",
      items: [
        {en:"Goodbye", es:"adiós"},
        {en:"See you later", es:"hasta luego"},
        {en:"See you soon", es:"hasta pronto"},
        {en:"See you", es:"nos vemos"},
        {en:"See you tomorrow", es:"hasta mañana"},
        {en:"Nice to meet you", es:"mucho gusto"},
        {en:"Pleased to meet you", es:"encantado"},
        {en:"Welcome", es:"bienvenido"},
        {en:"Good luck", es:"buena suerte"},
        {en:"Have a good day", es:"que tengas un buen día"}
      ]
    }
  };

  // ----- VOICE (TTS) -----
  const VOICE = {
    enabled: 'speechSynthesis' in window,
    english: null, spanish: null,
    init(){
      if(!this.enabled) return;
      const pick = () => {
        const voices = speechSynthesis.getVoices();
        this.english = voices.find(v=>/^en[-_]/i.test(v.lang)) || voices.find(v=>/en/i.test(v.lang)) || voices[0] || null;
        this.spanish = voices.find(v=>/^es[-_]/i.test(v.lang)) || voices.find(v=>/es/i.test(v.lang)) || this.english;
      };
      pick();
      window.speechSynthesis.onvoiceschanged = pick;
    },
    speak(text, lang='en'){
      if(!this.enabled || !text) return;
      const u = new SpeechSynthesisUtterance(text);
      const voice = lang.startsWith('es') ? (this.spanish || this.english) : (this.english || this.spanish);
      if (voice) u.voice = voice;
      u.lang = voice?.lang || (lang.startsWith('es') ? 'es-ES' : 'en-GB');
      try { speechSynthesis.cancel(); } catch(e){}
      speechSynthesis.speak(u);
    }
  };
  VOICE.init();

  // ----- Speech Recognition (SR) -----
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const srSupported = !!SR;

  // mic permission helper for Chrome
  async function ensureMicPermission(){
    try{
      if (navigator.mediaDevices?.getUserMedia){
        const s = await navigator.mediaDevices.getUserMedia({audio:true});
        (s.getTracks()||[]).forEach(t=>t.stop());
      }
    }catch(e){}
    return true;
  }

  // ----- State -----
  let currentLevel = null;
  let startTime = 0, timerId = null;

  // ----- Init (no HTML changes; preserve exact look) -----
  document.title = CONFIG.title;
  const h1 = document.querySelector("h1");
  if (h1) h1.innerHTML = `<span class="turbo">TURBO</span>: ${CONFIG.title}`;

  // Present-only: keep bar visible but disable Past/Future to preserve look
  $$(".tense-button").forEach(b=>{
    if (b.dataset.tense !== "Present"){ b.disabled = true; b.title = "Open Day: Present only"; }
    if (b.dataset.tense === "Present"){ b.classList.add("active"); }
  });

  // Hide teacher code bar (keep layout intact otherwise)
  const ub = $("#unlock-bar"); if (ub) ub.style.display = "none";

  // Render level buttons in the existing #mode-list container
  renderLevels();

  // ----- Best time helpers -----
  function bestKey(level){ return `turbo_open_day_best_${CONFIG.title}_${level}`; }
  function getBest(level){ const v = localStorage.getItem(bestKey(level)); return v ? parseFloat(v) : null; }
  function saveBest(level, score){
    const cur = getBest(level);
    const best = (cur == null || score < cur) ? score : cur;
    try { localStorage.setItem(bestKey(level), best.toString()); } catch(e){}
  }

  // Level unlock logic based on targets achieved on previous level(s)
  function isUnlocked(level){
    if (level === "L1") return true;
    if (level === "L2") {
      const b1 = getBest("L1"); return (b1 != null && b1 <= CONFIG.UNLOCKS.L2);
    }
    if (level === "L3") {
      const b2 = getBest("L2"); return (b2 != null && b2 <= CONFIG.UNLOCKS.L3);
    }
    return false;
  }

  // ----- UI: render levels as buttons (same look as modes) -----
  function renderLevels(){
    const host = $("#mode-list"); if (!host) return;
    host.innerHTML = "";
    host.appendChild(makeLevelBtn("L1", LEVELS.L1.label));
    host.appendChild(makeLevelBtn("L2", `${LEVELS.L2.label} (Target ≤ ${CONFIG.UNLOCKS.L2}s)`));
    host.appendChild(makeLevelBtn("L3", `${LEVELS.L3.label} (Target ≤ ${CONFIG.UNLOCKS.L3}s)`));
  }

  function makeLevelBtn(levelKey, label){
    const btn = document.createElement("button");
    btn.className = "mode-btn";
    btn.dataset.level = levelKey;
    const locked = !isUnlocked(levelKey);
    btn.disabled = locked;
    const icon = locked ? "🔒" : "🔓";
    const best = getBest(levelKey);
    btn.textContent = `${icon} ${label}${best!=null ? " — Best: "+best.toFixed(1)+"s" : ""}`;
    btn.onclick = () => { if (!locked) startLevel(levelKey); };
    return btn;
  }

  // ----- Start a level / build quiz -----
  function startLevel(levelKey){
    currentLevel = levelKey;
    $("#mode-list").style.display = "none";
    $("#game").style.display = "block";
    $("#results").innerHTML = "";
    $("#back-button").style.display = "none";

    const pool = (LEVELS[levelKey]?.items || []).map(p => ({ prompt: `Type the Spanish: "${p.en}"`, answer: p.es }));
    shuffle(pool);
    const quiz = pool.slice(0, CONFIG.QUESTIONS_PER_RUN);

    const qwrap = $("#questions"); qwrap.innerHTML = "";

    // Voice bar (keep same controls/IDs)
    const vbar = $("#voice-bar");
    if (VOICE.enabled) {
      vbar.style.display = "flex";
      const readAll = $("#read-all");
      if (readAll) readAll.onclick = () => {
        let i = 0; const items = quiz.map(q => q.prompt.replace(/Type the Spanish:\s*\"?|\"?$/g,'').trim());
        const next = () => { if (i >= items.length) return; VOICE.speak(items[i], 'en'); i++; setTimeout(next, 1700); };
        next();
      };
    } else vbar.style.display = "none";

    quiz.forEach((q,i) => {
      const row = document.createElement("div");
      row.className = "q";

      const promptRow = document.createElement("div"); promptRow.className = "prompt-row";
      const p = document.createElement("div"); p.className = "prompt"; p.textContent = `${i+1}. ${q.prompt}`;

      const spk = document.createElement("button"); spk.className = "icon-btn"; spk.textContent = "🔊"; spk.title = "Read this phrase";
      spk.onclick = ()=> VOICE.speak(q.prompt.replace(/^.*?\"|\"$/g,''), 'en');

      const mic = document.createElement("button"); mic.className = "icon-btn"; mic.textContent = "🎤"; mic.title = srSupported ? "Dictate answer (Spanish)" : "Speech recognition not supported";
      const input = document.createElement("input"); input.type = "text"; input.placeholder = "Type or dictate the Spanish phrase";

      if (srSupported) {
        mic.onclick = async ()=>{
          try { speechSynthesis.cancel(); } catch(e){}
          await ensureMicPermission();
          const rec = new SR(); rec.lang = "es-ES"; rec.interimResults = false; rec.maxAlternatives = 1;
          mic.disabled = true; mic.textContent = "⏺️…";
          rec.onresult = e => { const said = e.results?.[0]?.[0]?.transcript || ""; input.value = said; };
          rec.onerror = ()=>{}; rec.onend = ()=>{ mic.disabled=false; mic.textContent="🎤"; };
          try { rec.start(); } catch(e) { mic.disabled=false; mic.textContent="🎤"; }
        };
      } else mic.disabled = true;

      promptRow.appendChild(p); promptRow.appendChild(spk); promptRow.appendChild(mic);
      row.appendChild(promptRow); row.appendChild(input); qwrap.appendChild(row);
    });

    $("#submit").onclick = () => checkAnswers(quiz);
    $("#back-button").onclick = ()=>{ $("#game").style.display = "none"; $("#mode-list").style.display = "grid"; renderLevels(); };
    startTimer();
  }

  // ----- Timer -----
  function startTimer(){
    startTime = performance.now();
    $("#timer").textContent = "Time: 0s";
    clearInterval(timerId);
    timerId = setInterval(()=>{
      const e = (performance.now() - startTime)/1000;
      $("#timer").textContent = `Time: ${e.toFixed(1)}s`;
    }, 100);
  }
  function stopTimer(){ clearInterval(timerId); }

  // ----- Check answers, score, save best, unlock next -----
  function checkAnswers(quiz){
    stopTimer();
    const inputs = $$("#questions .q input");
    let correct = 0; const items = [];
    inputs.forEach((inp,i)=>{
      const expected = quiz[i].answer;
      const ok = norm(inp.value) === norm(expected);
      inp.classList.remove("good","bad"); inp.classList.add(ok ? "good" : "bad");
      if (ok) correct++;
      const li = document.createElement("li");
      li.className = ok ? "correct" : "incorrect";
      li.textContent = `${i+1}. ${quiz[i].prompt} → ${quiz[i].answer}`;
      items.push(li);
    });
    const elapsed = (performance.now() - startTime)/1000;
    const penalty = (quiz.length - correct) * CONFIG.PENALTY_SECONDS;
    const finalTime = elapsed + penalty;

    if (currentLevel) saveBest(currentLevel, finalTime);

    const summary = document.createElement("div");
    summary.className = "result-summary";
    summary.innerHTML = [
      `<div class="final-time">🏁 Final Time: ${finalTime.toFixed(1)}s</div>`,
      `<div class="line">✅ Correct: ${correct}/${quiz.length}</div>`,
      penalty>0 ? `<div class="line">⏱️ Penalty: +${penalty}s (${CONFIG.PENALTY_SECONDS}s per incorrect)</div>` : ``
    ].join("");

    const ul = document.createElement("ul"); items.forEach(li => ul.appendChild(li));
    const results = $("#results"); results.innerHTML = ""; results.appendChild(summary); results.appendChild(ul);

    if (VOICE.enabled) VOICE.speak(`You got ${correct} out of ${quiz.length}. Final time ${finalTime.toFixed(1)} seconds.`, 'en');

    $("#back-button").style.display = "inline-block";
    // update buttons (best & lock states)
    renderLevels();
  }

  // ----- Helpers -----
  function norm(s){
    return (s||"").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/[¿?¡!"]/g,"").replace(/\s+/g," ").trim();
  }
  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }

})();