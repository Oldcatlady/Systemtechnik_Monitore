/* ========================================
   QUIZ SCRIPT (Kompatibel mit neuem IHK-JSON & Multiple-Choice)
   ======================================== */

let allQuestions = []; // Beinhaltet immer die 100+ Originalfragen aus dem JSON
let questions = [];    // Beinhaltet NUR NOCH die aktuell ausgewählten und gemischten 20 Fragen
let current = 0;
let correct = 0;       // Sammelt jetzt die exakten IHK-Punkte (Dezimalzahlen möglich)
let wrong = 0;
let answered = false;
let selectedTheme = "girl_power";

// Speichert die aktuell vom User angeklickten Buchstaben vor der Prüfung (z. B. ["a", "c"])
let selectedAnswers = []; 

// History: speichert den Zustand jeder beantworteten Frage
let history = [];

/* ========================================
   TIMER STEUERUNG (30 MINUTEN)
   ======================================== */
let timerInterval = null;
const QUIZ_DURATION_SECONDS = 15 * 60; // 30 Minuten in Sekunden

function startQuizTimer() {
    clearInterval(timerInterval); // Falls noch ein alter Timer läuft
    let timeRemaining = QUIZ_DURATION_SECONDS;
    
    // Sucht das Element mit der ID 'timer' in deinem HTML
    const timerDisplay = document.getElementById("timer"); 

    timerInterval = setInterval(() => {
        let minutes = Math.floor(timeRemaining / 60);
        let seconds = timeRemaining % 60;

        // Führende Null hinzufügen (z.B. "09:05")
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        if (timerDisplay) {
            timerDisplay.textContent = `${minutes}:${seconds}`;
        }

        if (--timeRemaining < 0) {
            clearInterval(timerInterval);
            if (timerDisplay) timerDisplay.textContent = "00:00";
            handleTimeout();
        }
    }, 1000);
}

function handleTimeout() {
    alert("Die Zeit ist abgelaufen! Das Quiz wird jetzt automatisch ausgewertet.");
    showResult(); // Beendet das Quiz sofort und springt zur IHK-Auswertung
}

/* ========================================
   THEME HANDLING
   ======================================== */
function previewTheme(theme) {
    selectedTheme = theme;
    document.body.className = theme === "girl_power" ? "" : theme;

    document.querySelectorAll(".theme-btn").forEach(btn => {
        btn.classList.toggle("active-theme", btn.dataset.theme === theme);
    });

    const preview = document.getElementById("themePreview");
    preview.classList.add("visible");
}

/* ========================================
   SEITEN-NAVIGATION
   ======================================== */
function showPage(id) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

function goToStart() {
    showPage("startPage");
}

/* ========================================
   QUIZ STARTEN (Mit Misch-Logik & Timer)
   ======================================== */
function startQuiz() {
    document.body.className = selectedTheme === "girl_power" ? "" : selectedTheme;

    // Fragen aus 'allQuestions' kopieren, komplett durchmischen und auf 20 begrenzen
    questions = shuffleArray([...allQuestions]).slice(0, 20);

    current = 0;
    correct = 0;
    wrong = 0;
    answered = false;
    history = []; 

    showPage("quizPage");
    loadQuestion();
    startQuizTimer(); // Den 30-Minuten-Timer starten
}

/* ========================================
   FRAGEN LADEN & RENDERN
   ======================================== */
function loadQuestion() {
    if (current >= questions.length) {
        clearInterval(timerInterval); // Stoppt den Timer, wenn man vor Ablauf fertig wird
        showResult();
        return;
    }

    let q = questions[current];
    let savedState = history[current];

    // q.frage greift sauber auf dein neues JSON zu
    document.getElementById("question").innerText = cleanQuestionText(q.frage);
    document.getElementById("feedback").className = "";
    document.getElementById("feedback").innerHTML = "";
    document.getElementById("feedback").style.display = "none"; 
    document.getElementById("textAnswer").value = "";

    clearAnswerButtons();

    let answersDiv = document.getElementById("answers");
    answersDiv.innerHTML = "";

    if (savedState) {
        answered = true;
        renderQuestionWithState(q, savedState);
    } else {
        answered = false;
        renderQuestion(q);
    }

    updateProgress();
    updateNavButtons();
}

function renderQuestion(q) {
    let answersDiv = document.getElementById("answers");
    selectedAnswers = []; // Auswahl für die neue Frage leeren

    if (!q.type || q.type === "mc") {
        // Schleife über das neue Optionen-Objekt (a, b, c, d)
        Object.entries(q.optionen).forEach(([key, value]) => {
            let btn = document.createElement("button");
            btn.innerText = `${key.toUpperCase()}) ${value}`;
            btn.className = "answer-btn";
            
            // Klick-Verhalten für Mehrfachauswahl vor der Prüfung
            btn.onclick = () => {
                if (answered) return;
                
                let currentKey = key.toLowerCase();
                const index = selectedAnswers.indexOf(currentKey);
                
                if (index > -1) {
                    selectedAnswers.splice(index, 1);
                    btn.classList.remove("btn-selected");
                } else {
                    selectedAnswers.push(currentKey);
                    btn.classList.add("btn-selected");
                }
            };
            answersDiv.appendChild(btn);
        });
        document.getElementById("textAnswer").style.display = "none";
    } else if (q.type === "text") {
        document.getElementById("textAnswer").style.display = "block";
    }
}

function renderQuestionWithState(q, state) {
    let answersDiv = document.getElementById("answers");

    let tag = document.createElement("div");
    tag.className = "reviewed-tag";
    tag.innerText = state.wasCorrect ? "✔ Vollständig richtig" : "✖ Nicht voll punktiert";
    answersDiv.appendChild(tag);

    if (!q.type || q.type === "mc") {
        let correctAnswers = q.korrekte_antworten.map(a => a.trim().toLowerCase());
        let userAnswers = state.userAnswers.map(a => a.trim().toLowerCase());

        Object.entries(q.optionen).forEach(([key, value]) => {
            let btn = document.createElement("button");
            btn.innerText = `${key.toUpperCase()}) ${value}`;
            btn.className = "answer-btn";
            btn.disabled = true;

            let currentKey = key.toLowerCase();

            if (correctAnswers.includes(currentKey)) {
                btn.classList.add("btn-correct");
            } else if (userAnswers.includes(currentKey) && !correctAnswers.includes(currentKey)) {
                btn.classList.add("btn-wrong");
            } else {
                btn.style.opacity = "0.45";
            }
            answersDiv.appendChild(btn);
        });
        document.getElementById("textAnswer").style.display = "none";
    }

    let feedback = document.getElementById("feedback");
    let correctString = q.korrekte_antworten.map(a => a.toUpperCase()).join(", ");

    feedback.className = state.wasCorrect ? "correct" : "wrong";
    feedback.innerHTML = `Erreichte Punkte für diese Frage: <b>${state.pointsEarned} / 1</b><br><br><b>Richtige Antworten:</b> ${correctString}`;
    feedback.style.display = "block";
}

/* ========================================
   ANTWORT PRÜFEN (Mit IHK-Teilpunkte-Schlüssel)
   ======================================= */
function checkAnswer(textValue = null) {
    if (answered) return;
    answered = true;

    let q = questions[current];
    let feedback = document.getElementById("feedback");

    let pointsEarned = 0;
    let wasFullyCorrect = false;

    // --- FALL 1: FREITEXT-FRAGE ---
    if (q.type === "text") {
        let userAnswer = textValue?.trim().toLowerCase();
        let correctAnswer = q.korrekte_antworten[0].trim().toLowerCase();
        
        if (userAnswer === correctAnswer) {
            pointsEarned = 1;
            wasFullyCorrect = true;
        } else {
            wrong++;
        }
        
        let correctString = q.korrekte_antworten[0];
        feedback.className = wasFullyCorrect ? "correct" : "wrong";
        feedback.innerHTML = wasFullyCorrect 
            ? `<b>Richtig!</b><br>Punkte: 1 / 1` 
            : `<b>Falsch!</b><br>Richtige Antwort wäre gewesen: <b>${correctString}</b>`;
        
        history[current] = {
            answered: true,
            userAnswers: [textValue || ""],
            wasCorrect: wasFullyCorrect,
            pointsEarned: pointsEarned
        };
    } 
    // --- FALL 2: MULTIPLE-CHOICE-FRAGE (IHK-Berechnung) ---
    else {
        document.querySelectorAll(".answer-btn").forEach(btn => {
            btn.disabled = true;
        });

        let correctAnswers = q.korrekte_antworten.map(a => a.trim().toLowerCase());
        let userAnswers = selectedAnswers.map(a => a.trim().toLowerCase());

        let totalOptionsCount = Object.keys(q.optionen).length; // Meistens 4 Optionen (A, B, C, D)
        let pointsPerOption = 1 / totalOptionsCount; // z.B. 0.25 Punkte pro richtige Entscheidung

        document.querySelectorAll(".answer-btn").forEach(btn => {
            let letter = btn.innerText.trim().charAt(0).toLowerCase();
            let isCorrectOption = correctAnswers.includes(letter);
            let isUserSelected = userAnswers.includes(letter);

            // Bewertung jeder einzelnen Option
            if (isCorrectOption && isUserSelected) {
                pointsEarned += pointsPerOption; // Richtiges angekreuzt
            } else if (!isCorrectOption && !isUserSelected) {
                pointsEarned += pointsPerOption; // Falsches weggelassen
            }

            // Visuelles Feedback zuweisen
            if (isCorrectOption) {
                btn.classList.add("btn-correct");
            } else if (isUserSelected && !isCorrectOption) {
                btn.classList.add("btn-wrong");
            } else {
                btn.style.opacity = "0.5";
            }
        });

        // Rundung auf zwei Nachkommastellen
        pointsEarned = Math.round(pointsEarned * 100) / 100;
        
        if (pointsEarned === 1) {
            wasFullyCorrect = true;
        } else {
            wrong++;
        }

        let correctString = q.korrekte_antworten.map(a => a.toUpperCase()).join(", ");
        feedback.className = wasFullyCorrect ? "correct" : "wrong";
        feedback.innerHTML = `Erreichte Punkte für diese Frage: <b>${pointsEarned} / 1</b><br><br><b>Richtige Antworten:</b> ${correctString}`;

        history[current] = {
            answered: true,
            userAnswers: [...selectedAnswers],
            wasCorrect: wasFullyCorrect,
            pointsEarned: pointsEarned
        };
    }

    correct += pointsEarned; // Punkte auf das Gesamtkonto buchen
    feedback.style.display = "block"; 

    updateProgress();
    updateNavButtons();
}

/* ========================================
   NAVIGATION
   ======================================== */
function nextQuestion() {
    let q = questions[current];

    // Wenn noch nicht geprüft wurde, fungiert der Button als "Prüfen ✔"
    if (!answered) {
        if (q.type === "text") {
            let value = document.getElementById("textAnswer").value;
            if (!value.trim()) {
                let fb = document.getElementById("feedback");
                fb.className = "wrong";
                fb.innerHTML = "Bitte gib zuerst eine Antwort ein.";
                fb.style.display = "block";
                return;
            }
            checkAnswer(value);
            return;
        }
        
        if (selectedAnswers.length === 0) {
            let fb = document.getElementById("feedback");
            fb.className = "wrong";
            fb.innerHTML = "Bitte wähle mindestens eine Antwort aus, bevor du prüfst.";
            fb.style.display = "block";
            return;
        }
        checkAnswer();
        return;
    }

    // Wenn bereits geprüft wurde, schaltet er um auf "Weiter" zur nächsten Frage
    current++;
    if (current < questions.length) {
        loadQuestion();
    } else {
        clearInterval(timerInterval);
        showResult();
    }
}

function prevQuestion() {
    if (current > 0) {
        current--;
        loadQuestion();
    }
}

function updateNavButtons() {
    let prevBtn = document.getElementById("prevBtn");
    let nextBtn = document.getElementById("nextBtn");

    prevBtn.style.display = (current > 0 && history[current - 1]) ? "block" : "none";
    nextBtn.style.display = "block";

    // Textwechsel-Logik auf dem Button
    if (!answered) {
        nextBtn.innerText = "Prüfen ✔";
    } else {
        if (current >= questions.length - 1) {
            nextBtn.innerText = "Auswertung →";
        } else {
            nextBtn.innerText = "Weiter →";
        }
    }
}

/* ========================================
   FORTSCHRITT
   ======================================== */
function updateProgress() {
    if (current >= questions.length) return;

    document.getElementById("progressText").innerText =
        `Frage ${current + 1} / ${questions.length}`;
    
    // Zeigt die akkumulierten Punkte mit einer Nachkommastelle
    document.getElementById("scoreText").innerText =
        `Punkte: ${correct.toFixed(1)} / ${questions.length}`;
        
    document.getElementById("percentText").innerText = "";
    document.getElementById("progressFill").style.width =
        ((current + 1) / questions.length) * 100 + "%";
}

/* ========================================
   ERGEBNIS (IHK-SCHLÜSSEL)
   ======================================== */
function showResult() {
    clearInterval(timerInterval); 
    let total = questions.length;
    let percent = total > 0 ? (correct / total) * 100 : 0;
    let grade = getGrade(percent);

    let gradeLabel = grade <= 2 ? "🎉" : grade <= 4 ? "👍" : "📚";

    document.getElementById("resultContent").innerHTML = `
    <div class="grade-badge">${grade}</div>
    <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:16px;">IHK-Note (1 = beste)</p>
    <p style="font-size:1.1rem; margin-bottom:6px;">
      ${gradeLabel} ${percent.toFixed(1)}% erreicht
    </p>
    <p style="color:var(--text-muted); margin-bottom:4px;">
      Erreichte Gesamtpunkte: <b>${correct.toFixed(1)}</b> von <b>${total}</b> Punkten
    </p>
  `;

    showPage("resultPage");
}

function getGrade(p) {
    if (p >= 92) return 1; 
    if (p >= 81) return 2; 
    if (p >= 67) return 3; 
    if (p >= 50) return 4; 
    if (p >= 30) return 5; 
    return 6;              
}

/* ========================================
   SHUFFLE & NEUSTART
   ======================================== */
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function shuffleAndRestart() {
    questions = shuffleArray([...allQuestions]).slice(0, 20);
    current = 0;
    correct = 0;
    wrong = 0;
    answered = false;
    history = []; 
    showPage("quizPage");
    loadQuestion();
    startQuizTimer(); 
}

/* ========================================
   HELPER
   ======================================== */
function cleanQuestionText(text) {
    if (!text) return "";
    return text
        .split("\nA)")[0]
        .split("\nAntwort:")[0]
        .split("\nErklärung:")[0]
        .trim();
}

function clearAnswerButtons() {
    document.querySelectorAll(".answer-btn").forEach(btn => btn.remove());
}

/* ========================================
   ENTER-TASTE für Texteingabe
   ======================================== */
document.getElementById("textAnswer").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        let value = e.target.value;
        if (value.trim()) checkAnswer(value);
    }
});

/* ========================================
   DATEN LADEN & INITIALISIEREN
   ======================================== */
fetch("questions.json")
    .then(res => res.json())
    .then(data => {
        allQuestions = data; 
        questions = []; 
        
        showPage("startPage");
        const defaultBtn = document.querySelector('[data-theme="girl_power"]');
        if (defaultBtn) defaultBtn.classList.add("active-theme");
        
        resetLizardTimer();
    })
    .catch(err => {
        console.error("Fehler beim Laden der Fragen:", err);
        document.body.innerHTML =
            "<p style='color:red;padding:20px;'>Fehler: questions.json konnte nicht geladen werden.</p>";
    });

/* ========================================
   ECHSEN-STEUERUNG (SCHNELLE SCHLEIFE)
   ======================================== */
const lizard = document.getElementById("lizard");
const toggleBtn = document.getElementById("lizardToggleBtn");

let lizardActive = true;
let lizardState = "hidden"; 
let posX = 0, posY = 0;
let targetX = 0, targetY = 0;
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let angle = 0;
let lizardInterval = null;
let lastTime = performance.now();

window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

toggleBtn.addEventListener("click", () => {
    lizardActive = !lizardActive;
    if (!lizardActive) {
        toggleBtn.innerText = "🦎 Ein";
        toggleBtn.classList.add("disabled");
        hideLizardImmediately();
    } else {
        toggleBtn.innerText = "🦎 Aus";
        toggleBtn.classList.remove("disabled");
        resetLizardTimer();
    }
});

lizard.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (lizardState === "hidden" || lizardState === "panicking" || lizardState === "escaping") return;
    triggerEscapeRoutine();
});

function hideLizardImmediately() {
    lizard.classList.add("lizard-hidden");
    lizard.classList.remove("lizard-walk-anim", "lizard-blink", "lizard-panic");
    lizardState = "hidden";
    clearTimeout(lizardInterval);
}

function resetLizardTimer() {
    clearTimeout(lizardInterval);
    if (lizardActive && lizardState === "hidden") {
        spawnLizard();
    }
}

function spawnLizard() {
    lizardState = "walkingToCenter";
    lizard.classList.remove("lizard-hidden");
    lizard.classList.add("lizard-walk-anim");

    const side = Math.floor(Math.random() * 4);
    const offset = 80; 
    
    if (side === 0) { 
        posX = Math.random() * window.innerWidth;
        posY = -offset;
    } else if (side === 1) { 
        posX = window.innerWidth + offset;
        posY = Math.random() * window.innerHeight;
    } else if (side === 2) { 
        posX = Math.random() * window.innerWidth;
        posY = window.innerHeight + offset;
    } else { 
        posX = -offset;
        posY = Math.random() * window.innerHeight;
    }

    targetX = window.innerWidth / 2;
    targetY = window.innerHeight / 2;
    
    lastTime = performance.now();
    requestAnimationFrame(updateLizardBehavior);
}

function updateLizardBehavior(currentTime) {
    if (!lizardActive || lizardState === "hidden") return;

    let dt = (currentTime - lastTime) / 16.666; 
    if (dt > 4) dt = 4; 
    lastTime = currentTime;

    if (lizardState === "panicking") {
        requestAnimationFrame(updateLizardBehavior);
        return;
    }

    if (lizardState === "walkingToCenter") {
        moveTowardsTarget(2.5, dt); 
        
        if (Math.hypot(targetX - posX, targetY - posY) < 25) {
            lizardState = "staring";
            lizard.classList.remove("lizard-walk-anim");
            lizard.classList.add("lizard-blink");
            
            angle = -Math.PI / 2; 
            lizard.style.transform = `translate(${posX}px, ${posY}px) rotate(${angle}rad)`;

            setTimeout(() => {
                if (lizardState === "staring") {
                    lizard.classList.remove("lizard-blink");
                    lizard.classList.add("lizard-walk-anim");
                    lizardState = "chasing"; 
                }
            }, 2500);
        }
    } 
    else if (lizardState === "chasing") {
        targetX = mouseX;
        targetY = mouseY;
        moveTowardsTarget(2.0, dt); 
    }
    else if (lizardState === "escaping") {
        moveTowardsTarget(6.0, dt); 
        
        if (posX < -150 || posX > window.innerWidth + 150 || posY < -150 || posY > window.innerHeight + 150) {
            hideLizardImmediately();
            
            if (lizardActive) {
                lizardInterval = setTimeout(() => {
                    if (lizardActive && lizardState === "hidden") spawnLizard();
                }, 3000); 
            }
            return; 
        }
    }

    if (lizardState !== "panicking" && lizardState !== "staring") {
        lizard.style.transform = `translate(${posX}px, ${posY}px) rotate(${angle}rad)`;
    }

    requestAnimationFrame(updateLizardBehavior);
}

function moveTowardsTarget(currentSpeed, dt) {
    let dx = targetX - posX;
    let dy = targetY - posY;
    let distance = Math.hypot(dx, dy);

    if (distance > 5) {
        angle = Math.atan2(dy, dx);
        posX += Math.cos(angle) * currentSpeed * dt;
        posY += Math.sin(angle) * currentSpeed * dt;
    }
}

function triggerEscapeRoutine() {
    lizardState = "panicking";
    lizard.classList.remove("lizard-walk-anim");
    lizard.classList.add("lizard-panic");

    setTimeout(() => {
        if (lizardState !== "panicking") return;
        lizard.classList.remove("lizard-panic");
        lizard.classList.add("lizard-walk-anim");
        
        let startTime = Date.now();
        let radius = 40;
        let startX = posX;
        let startY = posY;

        function runLoop() {
            let elapsed = Date.now() - startTime;
            if (elapsed < 800) { 
                let alpha = (elapsed / 800) * Math.PI * 2;
                posX = startX + Math.sin(alpha) * radius;
                posY = startY + (1 - Math.cos(alpha)) * radius;
                angle = alpha + Math.PI / 2;
                lizard.style.transform = `translate(${posX}px, ${posY}px) rotate(${angle}rad)`;
                requestAnimationFrame(runLoop);
            } else {
                const escapeSides = [
                    {x: -200, y: posY}, 
                    {x: window.innerWidth + 200, y: posY}, 
                    {x: posX, y: -200}, 
                    {x: posX, y: window.innerHeight + 200}
                ];
                let chosenSide = escapeSides[Math.floor(Math.random() * escapeSides.length)];
                targetX = chosenSide.x;
                targetY = chosenSide.y;
                lastTime = performance.now();
                lizardState = "escaping";
            }
        }
        runLoop();
    }, 600);
}
