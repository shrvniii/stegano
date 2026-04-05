/**
 * encode.js — UI logic for /encode page
 * ES Module. Handles live stats, model selection,
 * drag-and-drop, 3D viewer integration, and fetch submit.
 */

import { initViewer, setRenderMode, syncBackground } from './viewer.js';

/* ── State ─────────────────────────────────────────────────────── */
let activeViewer  = null;
let selectedModel = null;   // { name, capacity_bits }
let customFile    = null;   // File object from drag-drop / input
let isSubmitting  = false;

/* ── DOM refs (set after DOMContentLoaded) ──────────────────────── */
let msgTextarea, charCount, bitsNeeded;
let passInput, strengthBar, strengthLabel;
let aesToggle, decoyField;
let dropzone, dropInput, dropFilename;
let encodeBtn, encodeSpinner;
let alertBox;
let renderBtns;

/* ── Init ───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  msgTextarea   = document.getElementById('message');
  charCount     = document.getElementById('char-count');
  bitsNeeded    = document.getElementById('bits-needed');
  passInput     = document.getElementById('password');
  strengthBar   = document.getElementById('strength-bar');
  strengthLabel = document.getElementById('strength-label');
  aesToggle     = document.getElementById('aes-toggle');
  decoyField    = document.getElementById('decoy-field');
  dropzone      = document.getElementById('dropzone');
  dropInput     = document.getElementById('obj-upload');
  dropFilename  = document.getElementById('drop-filename');
  encodeBtn     = document.getElementById('encode-btn');
  encodeSpinner = document.getElementById('encode-spinner');
  alertBox      = document.getElementById('alert-box');
  renderBtns    = document.querySelectorAll('.btn-mode');

  setupMessageCounter();
  setupPasswordStrength();
  setupAesToggle();
  setupDropzone();
  setupModelCards();
  setupRenderButtons();
  setupEncodeForm();

  // Pre-select model from query param
  const params = new URLSearchParams(location.search);
  const pre = params.get('model');
  if (pre) {
    const card = document.querySelector(`.model-card[data-name="${pre}"]`);
    if (card) card.click();
  }

  // Sync viewer background on theme change
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      setTimeout(() => syncBackground(activeViewer), 50);
    });
  }
});

/* ── Message Counter ────────────────────────────────────────────── */
function setupMessageCounter() {
  if (!msgTextarea) return;
  msgTextarea.addEventListener('input', () => {
    const len  = msgTextarea.value.length;
    const bits = len * 8;
    if (charCount) charCount.textContent = `${len} characters`;
    if (bitsNeeded) bitsNeeded.textContent = `${bits} bits needed`;
    updateAllCapacityBars();
  });
}

/* ── Password Strength ──────────────────────────────────────────── */
function getStrength(pw) {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 14) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

function setupPasswordStrength() {
  if (!passInput) return;
  passInput.addEventListener('input', () => {
    const score = getStrength(passInput.value);
    const pct   = Math.min(100, (score / 5) * 100);

    if (strengthBar) {
      strengthBar.style.width = pct + '%';
      if (score <= 1)      { strengthBar.style.background = 'var(--danger)'; }
      else if (score <= 3) { strengthBar.style.background = 'var(--warning)'; }
      else                 { strengthBar.style.background = 'var(--success)'; }
    }

    if (strengthLabel) {
      const labels = ['', 'Weak', 'Weak', 'Medium', 'Strong', 'Very Strong'];
      const colors = ['', 'var(--danger)', 'var(--danger)', 'var(--warning)', 'var(--success)', 'var(--success)'];
      strengthLabel.textContent = passInput.value ? (labels[score] || 'Weak') : '';
      strengthLabel.style.color = colors[score] || '';
    }
  });
}

/* ── AES Toggle ─────────────────────────────────────────────────── */
function setupAesToggle() {
  if (!aesToggle || !decoyField) return;
  aesToggle.addEventListener('change', () => {
    decoyField.classList.toggle('visible', aesToggle.checked);
  });
}

/* ── Drag & Drop ────────────────────────────────────────────────── */
function setupDropzone() {
  if (!dropzone) return;

  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleCustomFile(file);
  });

  if (dropInput) {
    dropInput.addEventListener('change', () => {
      if (dropInput.files[0]) handleCustomFile(dropInput.files[0]);
    });
  }
}

function handleCustomFile(file) {
  if (!file.name.toLowerCase().endsWith('.obj')) {
    showAlert('Only .OBJ files are supported.', 'error');
    return;
  }
  customFile = file;
  selectedModel = null;

  // Deselect all model cards
  document.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected'));

  if (dropFilename) dropFilename.textContent = file.name;

  // Preview in 3D viewer
  const url = URL.createObjectURL(file);
  loadModelInViewer(url, file.name);
}

/* ── Model Cards ────────────────────────────────────────────────── */
function setupModelCards() {
  document.querySelectorAll('.model-card').forEach(card => {
    card.addEventListener('click', () => {
      if (card.classList.contains('disabled')) return;

      document.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      selectedModel = {
        name:          card.dataset.name,
        capacity_bits: parseInt(card.dataset.capacityBits, 10),
      };
      customFile = null;
      if (dropFilename) dropFilename.textContent = '';

      const objUrl = `/static/models/${card.dataset.name}.obj`;
      loadModelInViewer(objUrl, card.dataset.name);
    });
  });
}

/* ── Capacity Bars ─────────────────────────────────────────────── */
function updateAllCapacityBars() {
  const bits = msgTextarea ? msgTextarea.value.length * 8 : 0;
  document.querySelectorAll('.model-card').forEach(card => {
    const cap  = parseInt(card.dataset.capacityBits, 10) || 0;
    const bar  = card.querySelector('.cap-bar');
    const pct  = cap > 0 ? Math.min(100, (bits / cap) * 100) : 0;

    if (bar) {
      bar.style.width = pct + '%';
      bar.className = 'cap-bar' + (pct > 80 ? ' high' : pct > 50 ? ' medium' : '');
    }

    // Disable card if capacity exceeded
    if (bits > 0 && bits > cap) {
      card.classList.add('disabled');
      if (card.classList.contains('selected')) {
        card.classList.remove('selected');
        selectedModel = null;
      }
    } else {
      card.classList.remove('disabled');
    }
  });
}

/* ── 3D Viewer ──────────────────────────────────────────────────── */
async function loadModelInViewer(objUrl, name) {
  const container = document.getElementById('viewer-container');
  if (!container) return;

  // Show loading state
  container.innerHTML = '<div class="viewer-empty"><span class="viewer-empty__icon">⏳</span>Loading model…</div>';

  if (activeViewer) {
    activeViewer.dispose();
    activeViewer = null;
  }

  try {
    activeViewer = await initViewer('viewer-container', objUrl);
    syncBackground(activeViewer);
    // Restore active render mode
    const activeBtn = document.querySelector('.btn-mode.active');
    if (activeBtn) setRenderMode(activeViewer, activeBtn.dataset.mode);
  } catch (err) {
    container.innerHTML = `<div class="viewer-empty"><span class="viewer-empty__icon">⚠️</span>Failed to load ${name}</div>`;
  }
}

/* ── Render Mode Buttons ────────────────────────────────────────── */
function setupRenderButtons() {
  renderBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      renderBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (activeViewer) setRenderMode(activeViewer, btn.dataset.mode);
    });
  });
}

/* ── Encode Form Submit ─────────────────────────────────────────── */
function setupEncodeForm() {
  if (!encodeBtn) return;
  encodeBtn.addEventListener('click', async () => {
    if (isSubmitting) return;

    // Validation
    const message = msgTextarea ? msgTextarea.value.trim() : '';
    const password = passInput ? passInput.value.trim() : '';

    if (!message) { showAlert('Please enter a secret message.', 'error'); return; }
    if (!password) { showAlert('Please enter an encryption key/password.', 'error'); return; }
    if (!selectedModel && !customFile) {
      showAlert('Please select a 3D model or upload a custom .OBJ file.', 'error');
      return;
    }

    const aesEnabled = aesToggle ? aesToggle.checked : false;
    const decoyMsg   = document.getElementById('decoy-message');
    const decoy      = (aesEnabled && decoyMsg) ? decoyMsg.value.trim() : '';

    isSubmitting = true;
    setButtonLoading(true);
    hideAlert();

    const formData = new FormData();
    formData.append('message', message);
    formData.append('key', password);
    formData.append('aes', aesEnabled ? '1' : '0');
    formData.append('decoy', decoy);

    if (customFile) {
      formData.append('model', customFile);
    } else {
      formData.append('model', selectedModel.name);
    }

    try {
      const res  = await fetch('/encode', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `Server error: ${res.status}`);
      }

      // Redirect to result page
      window.location.href = '/result';
    } catch (err) {
      showAlert(err.message || 'Encoding failed. Please try again.', 'error');
    } finally {
      isSubmitting = false;
      setButtonLoading(false);
    }
  });
}

/* ── UI Helpers ─────────────────────────────────────────────────── */
function setButtonLoading(loading) {
  if (!encodeBtn) return;
  encodeBtn.disabled = loading;
  if (encodeSpinner) encodeSpinner.classList.toggle('hidden', !loading);
  encodeBtn.querySelector('.btn-text').textContent = loading ? 'Encoding…' : '🔐 Encode & Download';
}

function showAlert(msg, type = 'error') {
  if (!alertBox) return;
  alertBox.className = `alert alert-${type}`;
  alertBox.textContent = msg;
  alertBox.classList.remove('hidden');
  alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAlert() {
  if (alertBox) alertBox.classList.add('hidden');
}
