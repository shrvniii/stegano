// static/js/encode.js

// ── Model Selector ────────────────────────────────────────────────────────────
// On page load, fetch available models from the backend and render cards

let selectedModelFile = null;  // Tracks the preloaded model chosen
let selectedFile = null;       // Tracks a user-uploaded file (if any)

async function loadModels() {
    try {
        const res = await fetch('/models');
        const models = await res.json();
        renderModelCards(models);
    } catch (err) {
        console.error('Failed to load models:', err);
    }
}

function renderModelCards(models) {
    const container = document.getElementById('model-cards-container');
    if (!container) return;
    container.innerHTML = '';

    models.forEach(model => {
        const card = document.createElement('div');
        card.className = 'model-card';
        card.dataset.filename = model.filename;
        card.innerHTML = `
            <img src="${model.thumbnail_url}" alt="${model.name}" onerror="this.src='/static/thumbnails/default.png'">
            <h3>${model.name}</h3>
            <p>${model.vertex_count.toLocaleString()} vertices</p>
            <p class="capacity">~${model.capacity_chars.toLocaleString()} chars capacity</p>
        `;
        card.addEventListener('click', () => selectModelCard(card, model));
        container.appendChild(card);
    });
}

function selectModelCard(card, model) {
    // Deselect all cards, then highlight chosen one
    document.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedModelFile = model.obj_url;
    selectedFile = null;
    updateCapacityDisplay(model.capacity_chars);
}

function updateCapacityDisplay(capacityChars) {
    const el = document.getElementById('capacity-display');
    if (el) el.textContent = `Model capacity: ~${capacityChars.toLocaleString()} characters`;
}

// ── File Upload Override ───────────────────────────────────────────────────────
// If user uploads their own OBJ, use that instead of a preloaded model

const objUploadInput = document.getElementById('obj-upload');
if (objUploadInput) {
    objUploadInput.addEventListener('change', (e) => {
        selectedFile = e.target.files[0];
        selectedModelFile = null;
        document.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected'));
        document.getElementById('upload-label').textContent = selectedFile.name;
    });
}

// ── Encode Form Submission ────────────────────────────────────────────────────
const encodeForm = document.getElementById('encode-form');
if (encodeForm) {
    encodeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitEncode();
    });
}

async function submitEncode() {
    const message = document.getElementById('message-input').value.trim();
    const password = document.getElementById('password-input').value.trim();
    const useEncryption = document.getElementById('encryption-toggle')?.checked ?? true;

    if (!message || !password) {
        showError('Please enter a message and password.');
        return;
    }

    // Build FormData — keys must match routes/encode_routes.py exactly
    const formData = new FormData();
    formData.append('message', message);
    formData.append('password', password);
    formData.append('use_encryption', useEncryption ? 'true' : 'false');

    if (selectedFile) {
        // User uploaded their own OBJ
        formData.append('obj_file', selectedFile);
    } else if (selectedModelFile) {
        // Fetch the preloaded model blob and attach it
        showStatus('Fetching selected model...');
        const blob = await fetch(selectedModelFile).then(r => r.blob());
        const filename = selectedModelFile.split('/').pop();
        formData.append('obj_file', blob, filename);
    } else {
        showError('Please select a model or upload an OBJ file.');
        return;
    }

    showStatus('Encoding... this may take a moment.');
    setLoading(true);

    try {
        const res = await fetch('/encode', { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok || data.error) {
            showError(data.error || 'Encoding failed.');
            return;
        }

        showResult(data);
    } catch (err) {
        showError('Network error: ' + err.message);
    } finally {
        setLoading(false);
    }
}

// ── Result Display ────────────────────────────────────────────────────────────
function showResult(data) {
    // QR Codes
    const qr1 = document.getElementById('qr1-img');
    const qr2 = document.getElementById('qr2-img');
    if (qr1) qr1.src = data.qr1_url;
    if (qr2) qr2.src = data.qr2_url;

    // Download link
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.href = `/download/${data.encoded_file}`;
        downloadBtn.style.display = 'inline-block';
    }

    // Stats
    const statsEl = document.getElementById('encode-stats');
    if (statsEl && data.stats) {
        statsEl.innerHTML = `
            <span>Message: ${data.stats.message_length} chars</span>
            <span>Bits used: ${data.stats.bits_used}</span>
            <span>Capacity: ${data.stats.capacity_chars} chars</span>
            <span>Encrypted: ${data.stats.encrypted ? '✅ Yes' : '❌ No'}</span>
        `;
    }

    document.getElementById('result-section')?.classList.remove('hidden');
    showStatus('✅ Encoding complete!');
}

// ── UI Helpers ────────────────────────────────────────────────────────────────
function showError(msg) {
    const el = document.getElementById('error-msg');
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
    console.error(msg);
}

function showStatus(msg) {
    const el = document.getElementById('status-msg');
    if (el) el.textContent = msg;
}

function setLoading(state) {
    const btn = document.getElementById('encode-btn');
    if (btn) btn.disabled = state;
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadModels);
