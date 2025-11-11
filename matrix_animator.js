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

createMatrix();
updateMatrixFromFrame();
updateCode();
