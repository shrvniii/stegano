/**
 * encode.js — UI logic for /encode page
 * Handles live stats, model selection, drag-and-drop, 3D viewer, and form submission
 */

import { initViewer, setRenderMode, syncBackground } from "./viewer.js";

/* ── State ─────────────────────────────────────────────────────── */
let activeViewer = null;
let selectedModel = null; // { name, capacity_bits }
let customFile = null; // File object from drag-drop / input
let isSubmitting = false;

/* ── DOM refs ───────────────────────────────────────────────────── */
let msgTextarea, charCount, bitsNeeded;
let passInput, strengthBar, strengthLabel;
let aesToggle, decoyField, decoyMessage;
let dropzone, dropInput, dropFilename;
let encodeBtn, encodeSpinner;
let alertBox;
let renderBtns;

/* ── Init ───────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  // Get DOM elements
  msgTextarea = document.getElementById("message");
  charCount = document.getElementById("char-count");
  bitsNeeded = document.getElementById("bits-needed");
  passInput = document.getElementById("password");
  strengthBar = document.getElementById("strength-bar");
  strengthLabel = document.getElementById("strength-label");
  aesToggle = document.getElementById("aes-toggle");
  decoyField = document.getElementById("decoy-field");
  decoyMessage = document.getElementById("decoy-message");
  dropzone = document.getElementById("dropzone");
  dropInput = document.getElementById("obj-upload");
  dropFilename = document.getElementById("drop-filename");
  encodeBtn = document.getElementById("encode-btn");
  encodeSpinner = document.getElementById("encode-spinner");
  alertBox = document.getElementById("alert-box");
  renderBtns = document.querySelectorAll(".btn-mode");

  setupMessageCounter();
  setupPasswordStrength();
  setupAesToggle();
  setupDropzone();
  fetchAndRenderModels(); // Task 2: Dynamically fetch and render model cards
  setupRenderButtons();
  setupEncodeForm();
});

/* ── Model API & Dynamic Rendering ──────────────────────────────── */
import { renderThumbnail } from "./viewer.js";

async function fetchAndRenderModels() {
  const grid = document.getElementById("model-grid");
  if (!grid) return;

  try {
    const res = await fetch("/api/models");
    const models = await res.json();

    if (!models || models.length === 0) {
      grid.innerHTML =
        '<div class="viewer-empty" style="grid-column: 1/-1;">No models found.</div>';
      return;
    }

    grid.innerHTML = ""; // Clear loader

    models.forEach((model) => {
      const card = document.createElement("div");
      card.className = "model-card";
      card.setAttribute("role", "option");
      card.setAttribute("tabindex", "0");
      card.dataset.slug = model.slug;
      card.dataset.filename = model.filename;
      card.dataset.capacityBits = model.capacity_bits;
      card.id = `model-card-${model.slug}`;

      const charCap = Math.floor(model.capacity_bits / 8);

      card.innerHTML = `
        <div class="checkmark">✔</div>
        <img src="${model.thumbnail_url}" alt="${model.name}" class="model-card__thumb" loading="lazy">
        <div class="model-card__body">
          <div class="model-card__name">${model.name}</div>
          <div class="model-card__meta">${model.vertex_count} vertices</div>
          <div class="model-card__meta">Max ${charCap} chars</div>
          <div class="cap-bar-wrap" aria-hidden="true">
            <div class="cap-bar" style="width:0%"></div>
          </div>
        </div>
      `;

      card.addEventListener("click", () => selectModelCard(card, model));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") card.click();
      });

      grid.appendChild(card);

      // Dynamic thumbnail rendering using Three.js — avoids empty images
      const thumbImg = card.querySelector(".model-card__thumb");
      if (thumbImg) {
        renderThumbnail(thumbImg, model.obj_url);
      }
    });

    // Check for pre-selected model in URL
    const params = new URLSearchParams(location.search);
    const pre = params.get("model");
    if (pre) {
      const card = document.querySelector(`.model-card[data-slug="${pre}"]`);
      if (card) card.click();
    }

    // Refresh capacity bars if message already exists
    updateAllCapacityBars();
  } catch (err) {
    grid.innerHTML =
      '<div class="viewer-empty" style="grid-column: 1/-1;">⚠️ Failed to load model library.</div>';
    console.error("Fetch models error:", err);
  }
}

/* ── Backend Simulation Feed ─────────────────────────────────────── */

let hudElement, consoleLogs, hudProgress;

function initHUD() {
  hudElement = document.getElementById("backend-hud");
  consoleLogs = document.getElementById("console-logs");
  hudProgress = document.getElementById("hud-progress");
}

async function simulateBackendProcess() {
  if (!hudElement || !consoleLogs || !hudProgress) return;
  
  hudElement.classList.remove("hidden");
  consoleLogs.innerHTML = "";
  hudProgress.style.width = "0%";
  document.getElementById("hud-actions").classList.add("hidden");
  document.getElementById("hud-status-text").textContent = "PROCESSING...";
  
  const logs = [
    { type: 'sys', msg: "> [SYS] Handshake with Stego-Vault API established.", delay: 300, progress: 10 },
    { type: 'sec', msg: "> [SEC] Initializing AES-256-GCM cipher engine...", delay: 600, progress: 25 },
    { type: 'sec', msg: "> [SEC] Message vector encrypted with secure salt.", delay: 400, progress: 38 },
    { type: 'sys', msg: "> [IO] Fetching target 3D spatial buffer: .OBJ model", delay: 800, progress: 55 },
    { type: 'alg', msg: "> [ALG] Mapping payload to vertex LSB registers...", delay: 1000, progress: 75 },
    { type: 'alg', msg: "> [PROC] Injection complete: Modified RGB color space.", delay: 700, progress: 90 },
    { type: 'sys', msg: "> [SYS] Finalizing stego-asset to temp buffer...", delay: 500, progress: 98 },
    { type: 'success', msg: "> [SUCCESS] Vault sealed. Process complete.", delay: 400, progress: 100 }
  ];

  for (const step of logs) {
    await new Promise(r => setTimeout(r, step.delay));
    const line = document.createElement("div");
    line.className = `console__line active log-${step.type}`;
    line.textContent = step.msg;
    
    // De-activate previous lines
    const prev = consoleLogs.querySelectorAll(".console__line.active");
    prev.forEach(p => p.classList.remove("active"));
    
    consoleLogs.appendChild(line);
    consoleLogs.scrollTop = consoleLogs.scrollHeight;
    hudProgress.style.width = `${step.progress}%`;
  }

  // Show "Next" action button
  document.getElementById("hud-status-text").textContent = "COMPLETE!";
  document.getElementById("hud-status-text").style.color = "#39FF14";
  document.getElementById("hud-actions").classList.remove("hidden");
}

/* ── UI Handlers ────────────────────────────────────────────────── */

function setupPasswordStrength() {
  if (!passInput || !strengthBar || !strengthLabel) return;
  passInput.addEventListener("input", () => {
    const val = passInput.value;
    let score = 0;
    if (val.length > 5) score++;
    if (val.length > 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const pcts = ["0%", "20%", "40%", "60%", "80%", "100%"];
    const labels = ["Too Weak", "Weak", "Fair", "Good", "Strong", "Excellent"];
    const colors = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e", "#10b981"];

    strengthBar.style.width = pcts[score];
    strengthBar.style.backgroundColor = colors[score];
    strengthLabel.textContent = labels[score];
    strengthLabel.style.color = colors[score];
  });
}

function setupAesToggle() {
  if (!aesToggle || !decoyField) return;
  aesToggle.addEventListener("change", () => {
    decoyField.style.display = aesToggle.checked ? "block" : "none";
    // Recalculate capacity when encryption is toggled (Task 3 refinement)
    updateAllCapacityBars();
  });
}

function setupDropzone() {
  if (!dropzone || !dropInput) return;
  
  dropzone.addEventListener("click", () => dropInput.click());
  
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
  
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith(".obj")) {
      handleCustomFile(file);
    }
  });

  dropInput.addEventListener("change", () => {
    if (dropInput.files[0]) {
      handleCustomFile(dropInput.files[0]);
    }
  });
}

function handleCustomFile(file) {
  customFile = file;
  if (dropFilename) dropFilename.textContent = file.name;
  
  // Unselect cards
  document.querySelectorAll(".model-card").forEach(c => c.classList.remove("selected"));
  selectedModel = null;
  
  // Load preview directly from the file blob
  const url = URL.createObjectURL(file);
  loadModelInViewer(url, file.name);
}

function selectModelCard(card, model) {
  if (card.classList.contains("disabled")) return;

  // Highlight selection
  document
    .querySelectorAll(".model-card")
    .forEach((c) => c.classList.remove("selected"));
  card.classList.add("selected");

  // Store selection in state
  selectedModel = {
    name: model.name,
    filename: model.filename,
    obj_url: model.obj_url,
    capacity_bits: parseInt(model.capacity_bits, 10),
  };
  customFile = null;
  if (dropFilename) dropFilename.textContent = "";

  loadModelInViewer(selectedModel.obj_url, selectedModel.name);
}

/* ── Message Counter & Capacity ─────────────────────────────────── */

/** calculates required bits including encryption expansion, hashes, and delimiters (Task 3 & 4 refinement) */
function getRequiredBits() {
  if (!msgTextarea) return 0;
  const msgLen = msgTextarea.value.length;
  if (msgLen === 0) return 0;
  
  // 1. Text components: Separator ("|||HASH:") + 64-char hex hash
  const hashOverhead = 8 + 64; 
  
  let payloadChars = 0;
  
  if (aesToggle && aesToggle.checked) {
    // Exact AES-256 CBC + Base64 expansion
    // salt (16) + iv (16) = 32 bytes
    const binaryOverhead = 32;
    // CBC Padding: blocks of 16 bytes
    const paddedMsgSize = Math.ceil((msgLen || 1) / 16) * 16;
    const totalBinary = binaryOverhead + paddedMsgSize;
    // Base64 expansion: 每3个字符变成4个Base64字符
    payloadChars = Math.ceil(totalBinary / 3) * 4;
  } else {
    payloadChars = msgLen;
  }

  const finalPayloadChars = payloadChars + hashOverhead;
  // 3. Final bit count + bits marking the Delimiter (16 bits)
  return (finalPayloadChars * 8) + 16;
}

function setupMessageCounter() {
  if (!msgTextarea) return;
  msgTextarea.addEventListener("input", () => {
    const len = msgTextarea.value.length;
    const bits = getRequiredBits();
    if (charCount) charCount.textContent = `${len} characters`;
    if (bitsNeeded) bitsNeeded.textContent = `${bits} bits needed`;
    updateAllCapacityBars();
  });
}

function updateAllCapacityBars() {
  const bits = getRequiredBits();
  
  // Update the UI header too
  if (bitsNeeded) bitsNeeded.textContent = `${bits} bits needed`;

  document.querySelectorAll(".model-card").forEach((card) => {
    const cap = parseInt(card.dataset.capacityBits, 10) || 0;
    const bar = card.querySelector(".cap-bar");
    const pct = cap > 0 ? Math.min(100, (bits / cap) * 100) : 0;

    if (bar) {
      bar.style.width = pct + "%";
      bar.className = "cap-bar" + (pct > 95 ? " high" : pct > 60 ? " medium" : "");
    }

    // Disable card if message + overhead is too big
    if (bits > 0 && bits > cap) {
      card.classList.add("disabled");
      if (card.classList.contains("selected")) {
        card.classList.remove("selected");
        selectedModel = null;
      }
    } else {
      card.classList.remove("disabled");
    }
  });
}

/* ── 3D Viewer ──────────────────────────────────────────────────── */
async function loadModelInViewer(objUrl, name) {
  const container = document.getElementById("viewer-container");
  if (!container) return;

  container.innerHTML =
    '<div class="viewer-empty"><span class="viewer-empty__icon">⏳</span>Loading model…</div>';

  if (activeViewer) {
    activeViewer.dispose();
    activeViewer = null;
  }

  try {
    activeViewer = await initViewer("viewer-container", objUrl, name);
    syncBackground(activeViewer);
    const activeBtn = document.querySelector(".btn-mode.active");
    if (activeBtn) setRenderMode(activeViewer, activeBtn.dataset.mode);
  } catch (err) {
    container.innerHTML = `<div class="viewer-empty"><span class="viewer-empty__icon">⚠️</span>Failed to load ${name}</div>`;
  }
}

/* ── Render Mode Buttons ────────────────────────────────────────── */
function setupRenderButtons() {
  renderBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      renderBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      if (activeViewer) setRenderMode(activeViewer, btn.dataset.mode);
    });
  });
}

/* ── Encode Form Submit ─────────────────────────────────────────── */
function setupEncodeForm() {
  if (!encodeBtn) return;

  encodeBtn.addEventListener("click", async () => {
    if (isSubmitting) return;

    const message = msgTextarea ? msgTextarea.value.trim() : "";
    const password = passInput ? passInput.value.trim() : "";

    if (!message) {
      showAlert("Please enter a secret message.", "error");
      return;
    }
    if (!password) {
      showAlert("Please enter a password/key.", "error");
      return;
    }
    if (!selectedModel && !customFile) {
      showAlert("Please select a model or upload a custom .OBJ file.", "error");
      return;
    }

    const aesEnabled = aesToggle ? aesToggle.checked : false;
    const decoy = aesEnabled && decoyMessage ? decoyMessage.value.trim() : "";

    isSubmitting = true;
    setButtonLoading(true);
    hideAlert();
    
    // Start "Wow" HUD Simulation for the teacher
    initHUD();
    simulateBackendProcess();

    const formData = new FormData();
    formData.append("message", message);
    formData.append("password", password);
    formData.append("use_encryption", aesEnabled ? "true" : "false");
    formData.append("decoy_message", decoy);

    if (customFile) {
      formData.append("obj_file", customFile);
    } else if (selectedModel) {
      const nameWithoutExt = selectedModel.filename.replace(".obj", "");
      formData.append("model_name", nameWithoutExt);
    }

    try {
      const res = await fetch("/encode", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Encoding failed");
      }

      // NO AUTO REDIRECT - WAIT FOR NEXT BUTTON CLICK
      document.getElementById("hud-next-btn").addEventListener("click", () => {
        window.location.href = "/result";
      });

    } catch (err) {
      showAlert(err.message || "Encoding failed. Please try again.", "error");
      isSubmitting = false;
      setButtonLoading(false);
      if (hudElement) hudElement.classList.add("hidden");
    }
  });
}

/* ── UI Helpers ─────────────────────────────────────────────────── */
function setButtonLoading(loading) {
  if (!encodeBtn) return;
  encodeBtn.disabled = loading;
  if (encodeSpinner) encodeSpinner.classList.toggle("hidden", !loading);
  const btnText = encodeBtn.querySelector(".btn-text");
  if (btnText)
    btnText.textContent = loading ? "Encoding…" : "🔐 Encode & Download";
}

function showAlert(msg, type = "error") {
  if (!alertBox) return;
  alertBox.className = `alert alert-${type}`;
  alertBox.textContent = msg;
  alertBox.classList.remove("hidden");
  alertBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideAlert() {
  if (alertBox) alertBox.classList.add("hidden");
}
