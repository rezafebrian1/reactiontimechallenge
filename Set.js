// ========== VARIABEL GLOBAL ==========
const lights = [
    document.getElementById("light1"),
    document.getElementById("light2"),
    document.getElementById("light3"),
    document.getElementById("light4"),
    document.getElementById("light5")
];
const timerDisplay = document.getElementById("timer");
const startStopBtn = document.getElementById("startStopBtn");
const result = document.getElementById("result");
const levelDisplay = document.getElementById("level");
const cooldownInfo = document.getElementById("cooldownInfo");
const historyTableBody = document.querySelector("#historyTable tbody");

const maxHistoryEntries = 5;
let historyData = [];

let timerInterval;
let timerRunning = false;
let startTime;
let elapsedTime = 0;

let cooldownInterval;
let cooldownSeconds = 0;

let gameState = "start";

// ========== UTILITY ==========
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTime(ms) {
    let totalSeconds = Math.floor(ms / 1000);
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;
    let milliseconds = ms % 1000;
    let minStr = minutes.toString().padStart(2, "0");
    let secStr = seconds.toString().padStart(2, "0");
    let msStr = milliseconds.toString().padStart(3, "0");
    return `${minStr}:${secStr}.${msStr}`;
}

// ========== AUDIO BEEP ==========
function playBeep() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(700, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);

    oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
        ctx.close();
    };
}

// ========== RESET/STATE ==========
function resetLights() {
    lights.forEach(light => {
        light.classList.remove("on", "red", "green");
        light.style.backgroundColor = "#700";
        light.style.boxShadow = "none";
    });
}

function setButtonState(state) {
    startStopBtn.classList.remove(
        "start-state",
        "stop-disabled",
        "stop-enabled"
    );
    cooldownInfo.textContent = "";

    if (state === "start") {
        startStopBtn.textContent = "START";
        startStopBtn.classList.add("start-state");
        startStopBtn.disabled = false;
        startStopBtn.style.cursor = "pointer";
    } else if (state === "lights") {
        startStopBtn.textContent = "STOP";
        startStopBtn.classList.add("stop-disabled");
        startStopBtn.disabled = true;
        startStopBtn.style.cursor = "default";
    } else if (state === "running") {
        startStopBtn.textContent = "STOP";
        startStopBtn.classList.add("stop-enabled");
        startStopBtn.disabled = false;
        startStopBtn.style.cursor = "pointer";
    } else if (state === "stopped") {
        startStopBtn.textContent = "START";
        startStopBtn.classList.add("stop-disabled");
        startStopBtn.disabled = true;
        startStopBtn.style.cursor = "default";
    }
}

// ========== HISTORY ==========
// Fungsi menilai level berdasar ms
function getLevel(timeMs) {
    if (timeMs >= 0 && timeMs <= 100) {
        return "Excellent";
    } else if (timeMs > 100 && timeMs <= 200) {
        return "Good";
    } else if (timeMs > 200 && timeMs <= 300) {
        return "Regular";
    } else if (timeMs > 300) {
        return "Bad";
    } else {
        return "-";
    }
}

// Parsing waktu "MM:SS.mmm" ke ms
function getMsFromResult(result) {
    if (!result || result === "-") return 0;
    let [minsec, ms] = result.split(".");
    if (!ms) return 0;
    let [min, sec] = minsec.split(":").map(Number);
    return (min * 60 + sec) * 1000 + parseInt(ms);
}

// Inisialisasi tabel history dengan placeholder
function initHistoryPlaceholder() {
    historyData = [];
    for (let i = 1; i <= maxHistoryEntries; i++) {
        historyData.push({
            no: i,
            name: `Challenge${i}`,
            result: "-",
            level: "-"
        });
    }
    renderHistoryTable();
}

// Menambah/mengganti entry ke history
function addHistoryEntry(result) {
    // Ambil ms dari result & generate level
    let ms = getMsFromResult(result);
    let level = getLevel(ms);

    // Ganti placeholder secara urut dulu
    let placeholderIdx = historyData.findIndex(entry => entry.result === "-");
    if (placeholderIdx !== -1) {
        historyData[placeholderIdx].result = result;
        historyData[placeholderIdx].level = level;
    } else {
        // Jika penuh, append ke akhir & shift atas
        historyData.push({
            no: historyData.length + 1,
            name: `Challenge${historyData.length + 1}`,
            result,
            level
        });
        if (historyData.length > maxHistoryEntries) {
            historyData.shift();
            historyData = historyData.map((entry, idx) => ({
                ...entry,
                no: idx + 1,
                name: `Challenge${idx + 1}`
            }));
        }
    }
    renderHistoryTable();
}

function getLevelColor(levelText) {
    if (levelText === "Excellent") {
        return "#0ff"; // Biru muda/cyan
    } else if (levelText === "Good") {
        return "#0f0"; // Hijau
    } else if (levelText === "Regular") {
        return "#ff0"; // Kuning
    } else if (levelText === "Bad") {
        return "#f00"; // Merah
    } else {
        return "#fff"; // Putih utk placeholder '-'
    }
}

// Render tabel ke tampilan
function renderHistoryTable() {
    historyTableBody.innerHTML = "";
    historyData.forEach(entry => {
        const tr = document.createElement("tr");

        const tdNo = document.createElement("td");
        tdNo.textContent = entry.no;
        tdNo.style.border = "1px solid white";
        tdNo.style.padding = "8px";
        tdNo.style.textAlign = "center";

        const tdName = document.createElement("td");
        tdName.textContent = entry.name;
        tdName.style.border = "1px solid white";
        tdName.style.padding = "8px";

        const tdResult = document.createElement("td");
        tdResult.textContent = entry.result;
        tdResult.style.border = "1px solid white";
        tdResult.style.padding = "8px";
        tdResult.style.textAlign = "center";

        const tdLevel = document.createElement("td");
        tdLevel.textContent = entry.level;
        tdLevel.style.border = "1px solid white";
        tdLevel.style.padding = "8px";
        tdLevel.style.textAlign = "center";
        tdLevel.style.color = getLevelColor(entry.level);

        tr.appendChild(tdNo);
        tr.appendChild(tdName);
        tr.appendChild(tdResult);
        tr.appendChild(tdLevel);

        historyTableBody.appendChild(tr);
    });
}
// Mengubah "MM:SS.mmm" menjadi ms
function getMsFromResult(result) {
    if (!result || result === "-") return 0;
    let [minsec, ms] = result.split(".");
    if (!ms) return 0;
    let [min, sec] = minsec.split(":").map(Number);
    return (parseInt(min) * 60 + parseInt(sec)) * 1000 + parseInt(ms);
}

// ========== LOGIKA INTI ==========
async function startLightsSequence() {
    resetLights();
    setButtonState("lights");
    for (let i = 0; i < lights.length; i++) {
        playBeep(); // Suara beep tiap lampu nyala!
        lights[i].classList.add("on", "red");
        lights[i].style.backgroundColor = "#f00";
        lights[i].style.boxShadow = "0 0 12px 7px rgba(255,0,0,0.7)";
        await delay(1500);
    }
    lights.forEach(light => {
        light.classList.remove("red");
        light.classList.add("green");
        light.style.backgroundColor = "#0f0";
        light.style.boxShadow = "0 0 12px 7px rgba(0,255,0,0.7)";
    });
    startTimer();
}

function startTimer() {
    startTime = performance.now();
    timerRunning = true;
    gameState = "running";
    // result.textContent = "";
    levelDisplay.textContent = "";
    timerDisplay.textContent = "00:00.000";

    timerInterval = setInterval(() => {
        if (timerRunning) {
            elapsedTime = performance.now() - startTime;
            timerDisplay.textContent = formatTime(Math.floor(elapsedTime));
        }
    }, 30);

    setButtonState("running");
}

function showCooldownTimer(seconds) {
    cooldownSeconds = seconds;
    cooldownInfo.textContent = `Try again in ${cooldownSeconds} seconds...`;

    cooldownInterval = setInterval(() => {
        cooldownSeconds--;
        if (cooldownSeconds <= 0) {
            clearInterval(cooldownInterval);
            cooldownInfo.textContent = "";
            setButtonState("start");
            gameState = "start";
        } else {
            cooldownInfo.textContent = `Try again in ${cooldownSeconds} seconds...`;
        }
    }, 1000);
}

function resetGame() {
    resetLights();
    timerDisplay.textContent = "00:00.000";
    result.textContent = "Reaction Time: -";
    levelDisplay.textContent = "";
    cooldownInfo.textContent = "";
    elapsedTime = 0;
    timerRunning = false;
    clearInterval(timerInterval);
}

function showLevel(timeMs) {
    if (timeMs >= 0 && timeMs <= 100) {
        levelDisplay.style.color = "#0ff";
        levelDisplay.textContent = "Level: Excellent";
    } else if (timeMs > 100 && timeMs <= 200) {
        levelDisplay.style.color = "#0f0"; // hijau juga
        levelDisplay.textContent = "Level: Good";
    } else if (timeMs > 200 && timeMs <= 300) {
        levelDisplay.style.color = "#ff0";
        levelDisplay.textContent = "Level: Regular";
    } else if (timeMs > 300) {
        levelDisplay.style.color = "#f00";
        levelDisplay.textContent = "Level: Bad";
    } else {
        levelDisplay.textContent = "";
    }
}

async function stopTimer() {
    timerRunning = false;
    clearInterval(timerInterval);
    result.textContent = `Reaction Time: ${formatTime(
        Math.floor(elapsedTime)
    )}`;
    showLevel(elapsedTime);
    addHistoryEntry(formatTime(Math.floor(elapsedTime))); // catat ke history!
    gameState = "stopped";
    setButtonState("stopped");
    showCooldownTimer(5);
}

// ========== EVENT LISTENERS ==========
startStopBtn.addEventListener("click", () => {
    if (gameState === "start" || gameState === "stopped") {
        resetGame();
        startLightsSequence();
    } else if (gameState === "lights") {
        // tombol disabled, abaikan
    } else if (gameState === "running") {
        stopTimer();
    }
});

// ========== INIT ==========
resetGame();
setButtonState("start");
initHistoryPlaceholder(); // PENTING! Panggil hanya sekali pada awal
