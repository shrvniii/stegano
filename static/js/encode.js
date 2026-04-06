/**
 * encode.js — UI logic for /encode page
 * Handles live stats, model selection, drag-and-drop, 3D viewer, and form submission
 */

import { initViewer, setRenderMode, syncBackground } from './viewer.js';

/* ── State ─────────────────────────────────────────────────────── */
let activeViewer  = null;
let selectedModel = null;   // { name, capacity_bits }
let customFile    = null;   // File object from drag-drop / input
let isSubmitting  = false;

/* ── DOM refs ───────────────────────────────────────────────────── */
let msgTextarea, charCount, bitsNeeded;
let passInput, strengthBar, strengthLabel;
let aesToggle, decoyField, decoyMessage;
let dropzone, dropInput, dropFilename;
let encodeBtn, encodeSpinner;
let alertBox;
let renderBtns;

/* ── Init ───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  msgTextarea    = document.getElementById('message');
  charCount      = document.getElementById('char-count');
  bitsNeeded     = document.getElementById('bits-needed');
  passInput      = document.getElementById('password');
  strengthBar    = document.getElementById('strength-bar');
  strengthLabel  = document.getElementById('strength-label');
  aesToggle      = document.getElementById('aes-toggle');
  decoyField     = document.getElementById('decoy-field');
  decoyMessage   = document.getElementById('decoy-message');
  dropzone       = document.getElementById('dropzone');
  dropInput      = document.getElementById('obj-upload');
  dropFilename   = document.getElementById('drop-filename');
  encodeBtn      = document.getElementById('encode-btn');
  encodeSpinner  = document.getElementById('encode-spinner');
  alertBox       = document.getElementById('alert-box');
  renderBtns     = document.querySelectorAll('.btn-mode');

  setupMessageCounter();
  setupPasswordStrength();
  setupAesToggle();
  setupDropzone();
  fetchAndRenderModels(); // Task 2: Dynamically fetch and render model cards
  setupRenderButtons();
  setupEncodeForm();
});

/* ── Model API & Dynamic Rendering ──────────────────────────────── */
async function fetchAndRenderModels() {
  const grid = document.getElementById('model-grid');
  if (!grid) return;

  try {
    const res = await fetch('/api/models');
    const models = await res.json();

    if (!models || models.length === 0) {
      grid.innerHTML = '<div class="viewer-empty" style="grid-column: 1/-1;">No models found.</div>';
      return;
    }

    grid.innerHTML = ''; // Clear loader

    models.forEach(model => {
      const card = document.createElement('div');
      card.className = 'model-card';
      card.setAttribute('role', 'option');
      card.setAttribute('tabindex', '0');
      card.dataset.name = model.name.toLowerCase().replace(/\s+/g, '_');
      card.dataset.capacityBits = model.capacity_bits;
      card.id = `model-card-${card.dataset.name}`;
      
      const charCap = Math.floor(model.capacity_bits / 8);

      card.innerHTML = `
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

      card.addEventListener('click', () => selectModelCard(card, model));
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') card.click(); });

      grid.appendChild(card);
    });

    // Check for pre-selected model in URL
    const params = new URLSearchParams(location.search);
    const pre = params.get('model');
    if (pre) {
      const card = document.querySelector(`.model-card[data-name="${pre}"]`);
      if (card) card.click();
    }

    // Refresh capacity bars if message already exists
    updateAllCapacityBars();

  } catch (err) {
    grid.innerHTML = '<div class="viewer-empty" style="grid-column: 1/-1;">⚠️ Failed to load model library.</div>';
    console.error('Fetch models error:', err);
  }
}

function selectModelCard(card, model) {
  if (card.classList.contains('disabled')) return;

  // Highlight selection (Task 2 step 6)
  document.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');

  // Store selection in state (Task 2 step 7)
  selectedModel = {
    name: card.dataset.name,
    capacity_bits: parseInt(card.dataset.capacityBits, 10),
  };
  customFile = null;
  if (dropFilename) dropFilename.textContent = '';

  const objUrl = `/static/models/${selectedModel.name}.obj`;
  loadModelInViewer(objUrl, selectedModel.name);
}

/* ── Message Counter & Capacity ─────────────────────────────────── */
function setupMessageCounter() {
  if (!msgTextarea) return;
  msgTextarea.addEventListener('input', () => {
    const len  = msgTextarea.value.length;
    const bits = len * 8; // Task 2 step 4
    if (charCount) charCount.textContent = `${len} characters`;
    if (bitsNeeded) bitsNeeded.textContent = `${bits} bits needed`;
    updateAllCapacityBars(); // Task 2 step 5
  });
}

function updateAllCapacityBars() {
  const bits = msgTextarea ? msgTextarea.value.length * 8 : 0;
  document.querySelectorAll('.model-card').forEach(card => {
    const cap = parseInt(card.dataset.capacityBits, 10) || 0;
    const bar = card.querySelector('.cap-bar');
    const pct = cap > 0 ? Math.min(100, (bits / cap) * 100) : 0;

    if (bar) {
      bar.style.width = pct + '%';
      bar.className = 'cap-bar' + (pct > 80 ? ' high' : pct > 50 ? ' medium' : '');
    }

    // Disable card if message is too big (Task 2 step 5)
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

  container.innerHTML = '<div class="viewer-empty"><span class="viewer-empty__icon">⏳</span>Loading model…</div>';

  if (activeViewer) {
    activeViewer.dispose();
    activeViewer = null;
  }

  try {
    activeViewer = await initViewer('viewer-container', objUrl);
    syncBackground(activeViewer);
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

    const message = msgTextarea ? msgTextarea.value.trim() : '';
    const password = passInput ? passInput.value.trim() : '';

    if (!message) { showAlert('Please enter a secret message.', 'error'); return; }
    if (!password) { showAlert('Please enter a password/key.', 'error'); return; }
    if (!selectedModel && !customFile) {
      showAlert('Please select a model or upload a custom .OBJ file.', 'error');
      return;
    }

    const aesEnabled = aesToggle ? aesToggle.checked : false;
    const decoy = (aesEnabled && decoyMessage) ? decoyMessage.value.trim() : '';

    isSubmitting = true;
    setButtonLoading(true);
    hideAlert();

    const formData = new FormData();
    formData.append('message', message);
    formData.append('password', password);     // Your backend expects 'password'
    formData.append('use_encryption', aesEnabled ? 'true' : 'false');
    formData.append('decoy_message', decoy);

    if (customFile) {
      formData.append('obj_file', customFile);
    } else if (selectedModel) {
      formData.append('model_name', selectedModel.name);   // or 'obj_file' depending on your route
    }

    try {
      const res = await fetch('/encode', { 
        method: 'POST', 
        body: formData 
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Encoding failed');
      }

      // Redirect to result page (Shravani's flow)
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
  const btnText = encodeBtn.querySelector('.btn-text');
  if (btnText) btnText.textContent = loading ? 'Encoding…' : '🔐 Encode & Download';
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