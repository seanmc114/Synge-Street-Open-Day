// TURBO: Open Day — Beginner Spanish (Present) v2
(()=>{
  const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));

  // ----- VOICE (robust) -----
  const VOICE = {
    enabled: 'speechSynthesis' in window,
    english: null, spanish: null, ready: false,
    pickVoices(){
      const list = speechSynthesis.getVoices();
      if (!list || list.length === 0) return false;
      this.english = list.find(v=>/en-GB|en-US|en-AU/i.test(v.lang)) || list.find(v=>/^en/i.test(v.lang)) || list[0] || null;
      this.spanish = list.find(v=>/es-ES|es-MX|es-US/i.test(v.lang)) || list.find(v=>/^es/i.test(v.lang)) || this.english;
      this.ready = !!(this.english || this.spanish);
      return this.ready;
    },
    ensureVoices(maxTries=12){
      if (!this.enabled) return false;
      if (this.pickVoices()) return true;
      let tries = 0;
      const tick = (resolve)=>{
        tries++;
        if (this.pickVoices()) return resolve(true);
        if (tries >= maxTries) return resolve(false);
        setTimeout(()=>tick(resolve), 250);
      };
      return new Promise(res=>tick(res));
    },
    async speak(text, lang='en'){
      if(!this.enabled || !text) return;
      await this.ensureVoices();
      const u = new SpeechSynthesisUtterance(text);
      const voice = (lang.startsWith('es') ? this.spanish : this.english) || this.english || this.spanish;
      if (voice) { u.voice = voice; u.lang = voice.lang; }
      try { speechSynthesis.cancel(); } catch(e){}
      speechSynthesis.speak(u);
    }
  };
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = ()=> VOICE.pickVoices();
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const srSupported = !!SR;

  // ----- Beginner phrases (Present only). Some accept alternatives. -----
  const PHRASES = [
    {en:"Hello", es:["hola"]},
    {en:"Good morning", es:["buenos días","buenos dias"]},
    {en:"Good afternoon", es:["buenas tardes"]},
    {en:"Good night", es:["buenas noches"]},
    {en:"Please", es:["por favor"]},
    {en:"Thank you", es:["gracias"]},
    {en:"You're welcome", es:["de nada"]},
    {en:"Yes", es:["sí","si"]},
    {en:"No", es:["no"]},
    {en:"How are you? (you: singular)", es:["¿cómo estás?","como estas","cómo estás","¿como estas?"]},
    {en:"How are you? (you: plural)", es:["¿cómo estáis?","como estais","cómo estáis","¿como estais?"]},
    {en:"I am well", es:["estoy bien"]},
    {en:"I am happy", es:["estoy feliz","estoy contento","estoy contenta"]},
    {en:"I am from Ireland", es:["soy de irlanda"]},
    {en:"I am a student", es:["soy estudiante"]},
    {en:"We are students", es:["somos estudiantes"]},
    {en:"I have a dog", es:["tengo un perro"]},
    {en:"I have two brothers", es:["tengo dos hermanos"]},
    {en:"I am 12 years old", es:["tengo doce años","tengo doce anos"]},
    {en:"I like Spanish", es:["me gusta el español","me gusta el espanol"]},
    {en:"I like music", es:["me gusta la música","me gusta la musica"]},
    {en:"We like football", es:["nos gusta el fútbol","nos gusta el futbol"]},
    {en:"Where is the bathroom?", es:["¿dónde está el baño?","donde esta el bano","¿donde esta el baño?","¿dónde esta el baño?"]},
    {en:"Where is the school?", es:["¿dónde está la escuela?","donde esta la escuela"]},
    {en:"The classroom is here", es:["la clase está aquí","la clase esta aqui"]},
    {en:"She is my mother", es:["ella es mi madre"]},
    {en:"He is my father", es:["él es mi padre","el es mi padre"]},
    {en:"Excuse me", es:["perdón","perdon","disculpa"]},
    {en:"What is your name? (you: singular)", es:["¿cómo te llamas?","como te llamas","¿como te llamas?"]},
    {en:"I am at school", es:["estoy en la escuela","estoy en el colegio"]},
    {en:"We are in Ireland", es:["estamos en irlanda"]},
  ];

  const QUESTIONS_PER_RUN = 10;

  // ----- UI Wiring -----
  $("#startDemo").onclick = startDemo;
  $("#audioTest").onclick = async () => {
    const m = $("#msg");
    if (!VOICE.enabled) { m.textContent = "❌ Voice not supported in this browser."; return; }
    m.textContent = "🔊 Trying to speak…";
    await VOICE.speak("Audio test. If you hear this, voice is working.", 'en');
  };

  let startTime = 0, timerId = null;

  function startDemo(){
    $("#menu").style.display = "none";
    $("#game").style.display = "block";
    $("#results").innerHTML = "";
    $("#back-button").style.display = "none";

    const pool = [...PHRASES];
    shuffle(pool);
    const quiz = pool.slice(0, QUESTIONS_PER_RUN);

    const qwrap = $("#questions"); qwrap.innerHTML = "";

    const vbar = $("#voice-bar");
    if ('speechSynthesis' in window) {
      vbar.style.display = "flex";
      $("#read-all").onclick = () => {
        const items = quiz.map(q => q.en);
        let idx = 0;
        const speakNext = () => {
          if (idx >= items.length) return;
          const u = new SpeechSynthesisUtterance(items[idx]);
          const voices = speechSynthesis.getVoices();
          const en = voices.find(v=>/^en/i.test(v.lang)) || voices[0];
          if (en) { u.voice = en; u.lang = en.lang; }
          idx++;
          u.onend = speakNext;
          try { speechSynthesis.cancel(); } catch(e){}
          speechSynthesis.speak(u);
        };
        speakNext();
      };
    } else vbar.style.display = "none";

    quiz.forEach((q,i) => {
      const row = document.createElement("div");
      row.className = "q";

      const promptRow = document.createElement("div"); promptRow.className = "prompt-row";
      const p = document.createElement("div"); p.className = "prompt"; p.textContent = `${i+1}. Type the Spanish: "${q.en}"`;

      const spk = document.createElement("button"); spk.className = "icon-btn"; spk.textContent = "🔊"; spk.title = "Read this phrase";
      spk.onclick = ()=> VOICE.speak(q.en, 'en');

      const mic = document.createElement("button"); mic.className = "icon-btn"; mic.textContent = "🎤"; mic.title = srSupported ? "Dictate answer (Spanish)" : "Speech recognition not supported";
      const input = document.createElement("input"); input.type = "text"; input.placeholder = "Type or dictate in Spanish (Present)";
      if (srSupported) {
        mic.onclick = ()=>{ const rec = new (window.SpeechRecognition || window.webkitSpeechRecognition)(); rec.lang = "es-ES"; rec.interimResults = false; rec.maxAlternatives = 1;
          mic.disabled = true; mic.textContent = "⏺️…";
          rec.onresult = e => { const said = e.results[0][0].transcript || ""; input.value = said; };
          rec.onerror = ()=>{}; rec.onend = ()=>{ mic.disabled=false; mic.textContent="🎤"; };
          try { rec.start(); } catch(e) { mic.disabled=false; mic.textContent="🎤"; }
        };
      } else mic.disabled = true;

      promptRow.appendChild(p); promptRow.appendChild(spk); promptRow.appendChild(mic);
      row.appendChild(promptRow); row.appendChild(input); qwrap.appendChild(row);

      // auto-read prompt on focus
      input.addEventListener('focus', ()=>{ const a = $("#auto-read"); if(a && a.checked) VOICE.speak(q.en, 'en'); });
    });

    $("#submit").onclick = () => checkAnswers(quiz);
    $("#back-button").onclick = ()=>{ $("#game").style.display = "none"; $("#menu").style.display = "block"; };
    startTimer();
  }

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

  function checkAnswers(quiz){
    stopTimer();
    const inputs = $$("#questions .q input");
    let correct = 0; const items = [];
    inputs.forEach((inp,i)=>{
      const ok = matchesAny(norm(inp.value), quiz[i].es);
      inp.classList.remove("good","bad"); inp.classList.add(ok ? "good" : "bad");
      if (ok) correct++;
      const li = document.createElement("li");
      li.className = ok ? "correct" : "incorrect";
      const targetShow = Array.isArray(quiz[i].es) ? quiz[i].es[0] : quiz[i].es;
      li.textContent = `${i+1}. "${quiz[i].en}" → ${targetShow}`;
      items.push(li);
    });
    const elapsed = (performance.now() - startTime)/1000;
    const penalty = (quiz.length - correct) * 15; // soft penalty for demo
    const finalTime = elapsed + penalty;

    const summary = document.createElement("div");
    summary.className = "result-summary";
    summary.innerHTML = [
      `<div class="final-time">🏁 Final Time: ${finalTime.toFixed(1)}s</div>`,
      `<div class="line">✅ Correct: ${correct}/${quiz.length}</div>`,
      penalty>0 ? `<div class="line">⏱️ Penalty: +${penalty}s (15s per incorrect)</div>` : ``
    ].join("");

    const ul = document.createElement("ul"); items.forEach(li => ul.appendChild(li));
    const results = $("#results"); results.innerHTML = ""; results.appendChild(summary); results.appendChild(ul);

    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(`Great job! You got ${correct} out of ${quiz.length}. Final time ${finalTime.toFixed(1)} seconds.`);
      const voices = speechSynthesis.getVoices();
      const en = voices.find(v=>/^en/i.test(v.lang)) || voices[0];
      if (en) { u.voice = en; u.lang = en.lang; }
      try { speechSynthesis.cancel(); } catch(e) {}
      speechSynthesis.speak(u);
    }

    $("#back-button").style.display = "inline-block";
  }

  // ----- Helpers -----
  function norm(s){
    return (s||"").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/[¿?¡!"]/g,"").replace(/\s+/g," ").trim();
  }
  function matchesAny(user, answers){
    if (!answers) return false;
    const list = Array.isArray(answers) ? answers : [answers];
    return list.some(ans => norm(ans) === user);
  }
  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }

})();