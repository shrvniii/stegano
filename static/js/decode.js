// static/js/decode.js

// ── Decode Form Submission ────────────────────────────────────────────────────
const decodeForm = document.getElementById('decode-form');
if (decodeForm) {
    decodeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitDecode();
    });
}

async function submitDecode() {
    const passwordInput = document.getElementById('decode-password-input').value.trim();
    const fileInput = document.getElementById('decode-obj-upload');
    const uploadedObjFile = fileInput?.files[0];

    // Validation
    if (!passwordInput) {
        showDecodeError('Please enter the decryption password.');
        return;
    }
    if (!uploadedObjFile) {
        showDecodeError('Please upload an encoded OBJ file.');
        return;
    }

    // Build FormData — keys must match routes/decode_routes.py exactly
    const formData = new FormData();
    formData.append('password', passwordInput);
    formData.append('obj_file', uploadedObjFile);

    showDecodeStatus('Decoding... extracting hidden bits.');
    setDecodeLoading(true);
    clearDecodeResult();

    try {
        const res = await fetch('/decode', { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok || data.error) {
            showDecodeError(data.error || 'Decoding failed.');
            return;
        }

        showDecodeResult(data);
    } catch (err) {
        showDecodeError('Network error: ' + err.message);
    } finally {
        setDecodeLoading(false);
    }
}

// ── Result Display ────────────────────────────────────────────────────────────

// Backend returns: { success, message, integrity_ok, was_encrypted }
function showDecodeResult(data) {
    const messageEl = document.getElementById('decoded-message');
    if (messageEl) messageEl.textContent = data.message;

    const integrityEl = document.getElementById('integrity-badge');
    if (integrityEl) {
        integrityEl.textContent = data.integrity_ok
            ? '✅ File integrity verified — message is untampered.'
            : '⚠️ Integrity check FAILED — file may have been modified.';
        integrityEl.className = data.integrity_ok ? 'badge badge-ok' : 'badge badge-warn';
    }

    const encBadge = document.getElementById('encryption-badge');
    if (encBadge) {
        encBadge.textContent = data.was_encrypted
            ? '🔒 Message was AES-256 encrypted.'
            : '🔓 Message was stored as plain text.';
    }

    document.getElementById('decode-result-section')?.classList.remove('hidden');
    showDecodeStatus('✅ Decoding complete!');
}

// ── File Upload Label ─────────────────────────────────────────────────────────
const decodeFileInput = document.getElementById('decode-obj-upload');
if (decodeFileInput) {
    decodeFileInput.addEventListener('change', (e) => {
        const label = document.getElementById('decode-upload-label');
        if (label) label.textContent = e.target.files[0]?.name || 'Choose file';
    });
}

// ── UI Helpers ────────────────────────────────────────────────────────────────
function showDecodeError(msg) {
    const el = document.getElementById('decode-error-msg');
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
    console.error(msg);
}

function showDecodeStatus(msg) {
    const el = document.getElementById('decode-status-msg');
    if (el) el.textContent = msg;
}

function setDecodeLoading(state) {
    const btn = document.getElementById('decode-btn');
    if (btn) btn.disabled = state;
}

function clearDecodeResult() {
    document.getElementById('decode-result-section')?.classList.add('hidden');
    const errEl = document.getElementById('decode-error-msg');
    if (errEl) errEl.classList.add('hidden');
}
