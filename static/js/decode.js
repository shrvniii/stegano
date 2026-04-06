/**
 * static/js/decode.js
 * Pari's Tasks: #4 Decoder Page · #5 Integrity Check · #8 Session History · #9 Drag & Drop
 */

"use strict";

/* ── State ─────────────────────────────────────────────────── */
let selectedFile = null;

/* ── DOM refs ───────────────────────────────────────────────── */
const dropzone       = document.getElementById("dropzone-decode");
const dropInner      = document.getElementById("drop-inner-decode");
const dropReady      = document.getElementById("drop-ready-decode");
const dropFilename   = document.getElementById("drop-filename-decode");
const fileInput      = document.getElementById("decode-file-input");
const clearBtn       = document.getElementById("clear-decode-file");

const passwordInput  = document.getElementById("decode-password");
const togglePwBtn    = document.getElementById("toggle-pw");
const decodeBtn      = document.getElementById("btn-decode");
const decodeBtnText  = document.getElementById("decode-btn-text");
const decodeSpinner  = document.getElementById("decode-spinner");

const resultPanel    = document.getElementById("result-panel");
const integrityBadge = document.getElementById("integrity-badge");
const integrityIcon  = document.getElementById("integrity-icon");
const integrityLabel = document.getElementById("integrity-label");
const integrityDetail= document.getElementById("integrity-detail");
const decodedMessage = document.getElementById("decoded-message");
const copyBtn        = document.getElementById("btn-copy-msg");

const historyList    = document.getElementById("history-list");
const historyEmpty   = document.getElementById("history-empty");
const clearHistBtn   = document.getElementById("btn-clear-history");

/* ── Session History (sessionStorage) ──────────────────────── */
const HISTORY_KEY = "stegvault_decode_history";

function getHistory() {
  try {
    return JSON.parse(sessionStorage.getItem(HISTORY_KEY) || "[]");
  } catch { return []; }
}

function saveHistory(arr) {
  sessionStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
}

function addHistoryEntry(entry) {
  const arr = getHistory();
  arr.unshift(entry);          // newest first
  saveHistory(arr.slice(0, 20)); // keep last 20
  renderHistory();
}

function renderHistory() {
  const arr = getHistory();
  if (arr.length === 0) {
    historyEmpty.classList.remove("hidden");
    // remove old items
    [...historyList.querySelectorAll(".history-item")].forEach(el => el.remove());
    return;
  }
  historyEmpty.classList.add("hidden");
  historyList.innerHTML = "";
  arr.forEach(entry => {
    const msg = entry.message || "";
    const li = document.createElement("li");
    li.className = "history-item";
    li.innerHTML = `
      <span class="hist-time">${entry.time}</span>
      <span class="hist-msg" title="${escapeHtml(msg)}">${escapeHtml(msg.slice(0, 60))}${msg.length > 60 ? "…" : ""}</span>
      <span class="hist-badge ${entry.integrity ? 'ok' : 'fail'}">${entry.integrity ? "✓ OK" : "✗ Tampered"}</span>
    `;
    historyList.appendChild(li);
  });
}

function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

clearHistBtn.addEventListener("click", () => {
  sessionStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

/* ── Drag & Drop ────────────────────────────────────────────── */
function setupDropZone(zone, onFile) {
  zone.addEventListener("dragover", e => {
    e.preventDefault();
    zone.classList.add("dragover");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", e => {
    e.preventDefault();
    zone.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  });
  zone.addEventListener("click", e => {
    if ((clearBtn && clearBtn.contains(e.target)) || (togglePwBtn && togglePwBtn.contains(e.target))) return;
    if (fileInput) fileInput.click();
  });
}

function setFile(file) {
  if (!file || !file.name.toLowerCase().endsWith(".obj")) {
    alert("Please upload a .obj file.");
    return;
  }
  selectedFile = file;
  dropFilename.textContent = file.name;
  dropInner.classList.add("hidden");
  dropReady.classList.remove("hidden");
}

setupDropZone(dropzone, setFile);

fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) setFile(fileInput.files[0]);
});

if (clearBtn) {
  clearBtn.addEventListener("click", e => {
    e.stopPropagation();
    selectedFile = null;
    if (fileInput) fileInput.value = "";
    if (dropInner) dropInner.classList.remove("hidden");
    if (dropReady) dropReady.classList.add("hidden");
    if (resultPanel) resultPanel.classList.add("hidden");
  });
}

/* ── Password toggle ────────────────────────────────────────── */
togglePwBtn.addEventListener("click", e => {
  e.stopPropagation();
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  togglePwBtn.textContent = isPassword ? "🙈" : "👁";
});

/* ── Decode ─────────────────────────────────────────────────── */
decodeBtn.addEventListener("click", async () => {
  if (!selectedFile) { alert("Please upload an encoded .obj file."); return; }
  const password = passwordInput.value.trim();
  if (!password)   { alert("Please enter the password key."); return; }

  // Loading state
  decodeBtn.disabled   = true;
  decodeBtnText.classList.add("hidden");
  decodeSpinner.classList.remove("hidden");
  resultPanel.classList.add("hidden");

  const formData = new FormData();
  formData.append("obj_file", selectedFile);
  formData.append("password", password);

  try {
    const res  = await fetch("/decode", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error || "Decoding failed.");
    }

    showResult(data);

    // Add to session history
    addHistoryEntry({
      time:      new Date().toLocaleTimeString(),
      filename:  selectedFile.name,
      message:   data.message,
      integrity: data.integrity_ok,
    });

  } catch (err) {
    alert("❌ " + err.message);
  } finally {
    decodeBtn.disabled = false;
    decodeBtnText.classList.remove("hidden");
    decodeSpinner.classList.add("hidden");
  }
});

/* ── Show result ────────────────────────────────────────────── */
function showResult(data) {
  resultPanel.classList.remove("hidden");

  // Integrity badge
  integrityBadge.className = "integrity-badge " + (data.integrity_ok ? "pass" : "fail");
  integrityIcon.textContent  = data.integrity_ok ? "✅" : "⚠️";
  integrityLabel.textContent = data.integrity_ok
    ? "SHA-256 Integrity Check Passed"
    : "SHA-256 Integrity Check Failed — file may have been tampered with";
  integrityDetail.textContent = data.integrity_ok
    ? "The file has not been modified since encoding."
    : "Hash mismatch detected.";

  // Message
  decodedMessage.textContent = data.message || "(empty message)";
}

/* ── Copy message ───────────────────────────────────────────── */
copyBtn.addEventListener("click", async () => {
  const text = decodedMessage.textContent;
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = "✅ Copied!";
    setTimeout(() => copyBtn.textContent = "📋 Copy", 2000);
  } catch {
    copyBtn.textContent = "❌ Failed";
  }
});

/* ── QR Scanner stub ────────────────────────────────────────── */
const btnScanQr = document.getElementById("btn-scan-qr");
if (btnScanQr) {
  btnScanQr.addEventListener("click", () => {
    alert("QR scanner: point your phone camera at QR2 and manually enter the key shown, or use a QR scanner app to copy it here.");
  });
}

/* ── Init ───────────────────────────────────────────────────── */
renderHistory();

/* ── Global drag & drop for all file inputs on page ────────── */
// Prevent browser from opening files dropped outside designated zones
window.addEventListener("dragover", e => e.preventDefault());
window.addEventListener("drop",     e => e.preventDefault());
