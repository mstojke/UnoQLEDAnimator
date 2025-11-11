const rows_count = 8;
const columns_count = 13;
const total = rows_count * columns_count;

const matrixContainer = document.getElementById("matrixContainer");
const codeOutput = document.getElementById("codeOutput");
const copyStatus = document.getElementById("copyStatus");
const frameIndicator = document.getElementById("frameIndicator");
const frameNameInput = document.getElementById("frameName");
const nameError = document.getElementById("nameError");

let frames = [createEmptyFrame("Frame_1")];
let currentFrame = 0;
let playInterval = null;

function createEmptyFrame(name = "Frame") {
    return { name, data: Array(total).fill(0) };
}

function createMatrix() {
    matrixContainer.innerHTML = "";
    for (let r = 0; r < rows_count; r++) {
        const rowDiv = document.createElement("div");
        rowDiv.className = "matrix-row";
        for (let c = 0; c < columns_count; c++) {
            const cell = document.createElement("div");
            cell.className = "led-cell";
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.addEventListener("click", toggleCell);
            rowDiv.appendChild(cell);
        }
        matrixContainer.appendChild(rowDiv);
    }
}

function toggleCell(e) {
    const cell = e.target;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    const index = row * columns_count + col;
    cell.classList.toggle("on");
    frames[currentFrame].data[index] = cell.classList.contains("on") ? 1 : 0;
    updateCode();
}

function updateMatrixFromFrame() {
    document.querySelectorAll(".led-cell").forEach((cell, i) => {
        cell.classList.toggle("on", frames[currentFrame].data[i] === 1);
    });
    frameIndicator.textContent = `${currentFrame + 1} / ${frames.length}`;
    frameNameInput.value = frames[currentFrame].name;
}

function clearMatrix() {
    frames[currentFrame].data = Array(total).fill(0);
    updateMatrixFromFrame();
    updateCode();
}

function fillMatrix() {
    frames[currentFrame].data = Array(total).fill(1);
    updateMatrixFromFrame();
    updateCode();
}

function invertMatrix() {
    frames[currentFrame].data = frames[currentFrame].data.map(v => (v ? 0 : 1));
    updateMatrixFromFrame();
    updateCode();
}

function addFrame() {
    const newName = `Frame_${frames.length + 1}`;
    frames.push(createEmptyFrame(newName));
    currentFrame = frames.length - 1;
    updateMatrixFromFrame();
    updateCode();
}

function duplicateFrame() {
    const src = frames[currentFrame];
    const clone = { name: src.name + "_copy", data: [...src.data] };
    frames.splice(currentFrame + 1, 0, clone);
    currentFrame++;
    updateMatrixFromFrame();
    updateCode();
}

function deleteFrame() {
    if (frames.length > 1) {
        frames.splice(currentFrame, 1);
        currentFrame = Math.max(0, currentFrame - 1);
        updateMatrixFromFrame();
        updateCode();
    } else {
        clearMatrix();
    }
}

function nextFrame() {
    currentFrame = (currentFrame + 1) % frames.length;
    updateMatrixFromFrame();
    updateCode();
}

function prevFrame() {
    currentFrame = (currentFrame - 1 + frames.length) % frames.length;
    updateMatrixFromFrame();
    updateCode();
}

function playAnimation() {
    if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
        document.getElementById("playBtn").textContent = "▶ Play";
        return;
    }
    let index = 0;
    document.getElementById("playBtn").textContent = "⏸ Pause";
    playInterval = setInterval(() => {
        currentFrame = index;
        updateMatrixFromFrame();
        index = (index + 1) % frames.length;
    }, 300);
}

function updateCode() {
    const lines = frames.map(frame => {
        const rows = [];
        for (let r = 0; r < rows_count; r++) {
            const slice = frame.data.slice(r * columns_count, (r + 1) * columns_count).join(",");
            rows.push("  " + slice + ",");
        }
        return `// ${frame.name}\nuint8_t ${frame.name}[${total}] = {\n${rows.join("\n")}\n};`;
    });

    const arrayNames = frames.map(f => f.name).join(", ");
    const allCode = `${lines.join("\n\n")}\n\nuint8_t* animation[] = { ${arrayNames} };`;
    codeOutput.value = allCode;
}

frameNameInput.addEventListener("input", () => {
    const name = frameNameInput.value.trim();
    if (/\s/.test(name)) {
        frameNameInput.classList.add("invalid");
        nameError.style.display = "block";
        return;
    }
    frameNameInput.classList.remove("invalid");
    nameError.style.display = "none";
    frames[currentFrame].name = name || `Frame_${currentFrame + 1}`;
    updateCode();
});

async function copyCode() {
    try {
        await navigator.clipboard.writeText(codeOutput.value);
        copyStatus.textContent = "✅ Code copied!";
    } catch {
        copyStatus.textContent = "⚠️ Unable to copy automatically.";
    }
    setTimeout(() => (copyStatus.textContent = ""), 2000);
}

function importJSON() {
    const file = importFile.files[0];
    if (!file) { importError.textContent = "Please select a JSON file."; importError.style.display = "block"; return; }
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const obj = JSON.parse(e.target.result);
            validateImport(obj);
            frames = obj.frames;
            currentFrame = 0;
            updateMatrixFromFrame();
            updateCode();
            importError.style.display = "none";
            alert("✅ Animation imported successfully!");
        } catch (err) {
            importError.textContent = "❌ " + err.message;
            importError.style.display = "block";
        }
    };
    reader.readAsText(file);
}

function validateImport(obj) {
    if (!obj || typeof obj !== "object") throw new Error("Invalid JSON structure.");
    if (obj.rows !== rows_count || obj.cols !== columns_count)
        throw new Error(`Matrix size mismatch. Expected ${rows_count}x${columns_count}.`);
    if (!Array.isArray(obj.frames)) throw new Error("Missing or invalid 'frames' array.");
    obj.frames.forEach((f, i) => {
        if (typeof f.name !== "string" || !Array.isArray(f.data))
            throw new Error(`Invalid frame at index ${i}.`);
        if (/\s/.test(f.name)) throw new Error(`Frame '${f.name}' has spaces in name.`);
        if (f.data.length !== total) throw new Error(`Frame '${f.name}' has incorrect data length.`);
        if (!f.data.every(v => v === 0 || v === 1))
            throw new Error(`Frame '${f.name}' contains invalid LED values.`);
    });
}

function exportJSON() {
    const data = { rows: rows_count, cols: columns_count, frames };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "led_animation.json";
    a.click();
    URL.revokeObjectURL(url);
}

function exportINO() {
    const codeHeader = `// Arduino Uno Q LED Matrix Animator\n// https://mstojke.github.io/UnoQLEDAnimator/\n// ${new Date().toLocaleString()}\n\n#include "Arduino_LED_Matrix.h"\n#include "Arduino_RouterBridge.h"\n\n`;
    const frameCode = frames.map(f => {
        const rows = [];
        for (let r = 0; r < rows_count; r++)
            rows.push("  " + f.data.slice(r * columns_count, (r + 1) * columns_count).join(",") + ",");
        return `// ${f.name}\nuint8_t ${f.name}[${total}] = {\n${rows.join("\n")}\n};`;
    }).join("\n\n");
    const arrayDecl = `\n\nArduino_LED_Matrix matrix;\nuint8_t* animation[] = { ${frames.map(f => f.name).join(", ")} };\nconst int frameCount = ${frames.length};\n\n`;

    const demoCode = `void setup() {\n\tmatrix.begin();\n}\n\nvoid loop() {\n  for (int i = 0; i < frameCount; i++) {\n\tmatrix.draw(animation[i]);\n\tdelay(100);\n  }\n}\n`;
    const finalCode = codeHeader + frameCode + arrayDecl + demoCode;

    const blob = new Blob([finalCode], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "led_animation.ino";
    a.click();
    URL.revokeObjectURL(a.href);
}

document.getElementById("btnClear").addEventListener("click", clearMatrix);
document.getElementById("btnFill").addEventListener("click", fillMatrix);
document.getElementById("btnInvert").addEventListener("click", invertMatrix);
document.getElementById("btnCopy").addEventListener("click", copyCode);
document.getElementById("addFrameBtn").addEventListener("click", addFrame);
document.getElementById("duplicateFrameBtn").addEventListener("click", duplicateFrame);
document.getElementById("deleteFrameBtn").addEventListener("click", deleteFrame);
document.getElementById("playBtn").addEventListener("click", playAnimation);
document.getElementById("nextFrameBtn").addEventListener("click", nextFrame);
document.getElementById("prevFrameBtn").addEventListener("click", prevFrame);
document.getElementById("btnExport").onclick = exportJSON;
document.getElementById("btnImport").onclick = importJSON;
document.getElementById("btnExportINO").onclick = exportINO;

createMatrix();
updateMatrixFromFrame();
updateCode();
