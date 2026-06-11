/* ============================================================
   AIODOWNLOADER by jar — script.js
   Production Ready · Vanilla JS · Async/Await
   API proxied through Netlify: /api/* → nexadev.my.id/api/*
============================================================ */

'use strict';

/* ============================================================
   CONFIG
============================================================ */
const CONFIG = {
  API_URL: '/api/aio',
  TOAST_DURATION: 3500,
};

/* ============================================================
   PLATFORM DETECTION
============================================================ */
const PLATFORMS = [
  {
    regex:     /tiktok\.com/i,
    name:      'TikTok',
    emoji:     '🎵',
    bg:        '#FF2D95',
    color:     '#FFFFFF',
  },
  {
    regex:     /instagram\.com/i,
    name:      'Instagram',
    emoji:     '📸',
    bg:        '#4F8CFF',
    color:     '#FFFFFF',
  },
  {
    regex:     /youtube\.com\/shorts/i,
    name:      'YouTube Shorts',
    emoji:     '▶️',
    bg:        '#00E676',
    color:     '#000000',
  },
  {
    regex:     /youtube\.com|youtu\.be/i,
    name:      'YouTube',
    emoji:     '▶️',
    bg:        '#FFD600',
    color:     '#000000',
  },
  {
    regex:     /facebook\.com|fb\.watch/i,
    name:      'Facebook',
    emoji:     '👤',
    bg:        '#4F8CFF',
    color:     '#FFFFFF',
  },
  {
    regex:     /twitter\.com|x\.com/i,
    name:      'X / Twitter',
    emoji:     '𝕏',
    bg:        '#000000',
    color:     '#FFFFFF',
  },
];

function detectPlatform(url) {
  for (const p of PLATFORMS) {
    if (p.regex.test(url)) return p;
  }
  return { name: 'Platform', emoji: '🌐', bg: '#000000', color: '#FFFFFF' };
}

/* ============================================================
   DOM REFERENCES
============================================================ */
const $ = (id) => document.getElementById(id);

const DOM = {
  urlInput:           $('url-input'),
  inputWrapper:       $('input-wrapper'),
  btnPaste:           $('btn-paste'),
  btnDownload:        $('btn-download'),
  btnDownloadAgain:   $('btn-download-again'),
  platformIndicator:  $('platform-indicator'),
  resultSection:      $('result-section'),
  resultPlatform:     $('result-platform'),
  resultActions:      $('result-actions'),
  photoGallerySection:$('photo-gallery-section'),
  photoGrid:          $('photo-grid'),
  toastContainer:     $('toast-container'),
};

/* ============================================================
   STATE
============================================================ */
let isLoading = false;

/* ============================================================
   TOAST NOTIFICATIONS
============================================================ */
function showToast(message, type = 'info') {
  const icons = {
    success: '✅',
    error:   '❌',
    info:    'ℹ️',
    warn:    '⚠️',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `<span aria-hidden="true">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;

  DOM.toastContainer.appendChild(toast);

  // Auto-remove
  const removeTimer = setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 320);
  }, CONFIG.TOAST_DURATION);

  // Click to dismiss early
  toast.addEventListener('click', () => {
    clearTimeout(removeTimer);
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 320);
  });
}

/* ============================================================
   LOADING STATE
============================================================ */
function setLoading(state) {
  isLoading = state;
  DOM.btnDownload.classList.toggle('is-loading', state);
  DOM.btnDownload.disabled = state;
  DOM.urlInput.disabled = state;
  DOM.btnPaste.disabled = state;
}

/* ============================================================
   URL VALIDATION
============================================================ */
function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/* ============================================================
   PLATFORM INDICATOR
============================================================ */
function updatePlatformIndicator(url) {
  DOM.platformIndicator.innerHTML = '';
  if (!url || !isValidUrl(url)) return;

  const platform = detectPlatform(url);
  const badge = document.createElement('span');
  badge.className = 'platform-badge';
  badge.style.cssText = `background:${platform.bg}; color:${platform.color}; border-color:#000;`;
  badge.textContent = `${platform.emoji} ${platform.name} terdeteksi`;
  DOM.platformIndicator.appendChild(badge);
}

/* ============================================================
   API — FETCH DOWNLOAD LINKS
============================================================ */
async function fetchDownloadLinks(url) {
  const endpoint = `${CONFIG.API_URL}?url=${encodeURIComponent(url)}`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    if (response.status === 404) throw new Error('URL tidak ditemukan atau tidak didukung.');
    if (response.status === 429) throw new Error('Terlalu banyak permintaan. Coba lagi sebentar.');
    throw new Error(`Gagal memproses (HTTP ${response.status}). Coba lagi.`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Respons dari server tidak valid. Coba lagi.');
  }

  if (!data || !data.status) {
    throw new Error('API tidak berhasil memproses URL ini. Pastikan URL valid dan konten bersifat publik.');
  }

  if (!data.data || typeof data.data !== 'object') {
    throw new Error('Data download tidak tersedia untuk URL ini.');
  }

  return data;
}

/* ============================================================
   DOWNLOAD — BLOB FETCH WITH FALLBACK
============================================================ */
async function triggerDownload(url, filename) {
  // Try blob download first (respects CORS on media server)
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('blob fetch failed');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
  } catch {
    // Fallback: open in new tab — user can save from there
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/* ============================================================
   COPY TO CLIPBOARD
============================================================ */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Link berhasil disalin ke clipboard!', 'success');
  } catch {
    // Fallback for older browsers / no permission
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      showToast('Link berhasil disalin!', 'success');
    } catch {
      showToast('Gagal menyalin. Coba salin manual.', 'error');
    }
  }
}

/* ============================================================
   BUILD RESULT BUTTON ELEMENT
============================================================ */
function createResultBtn({ icon, label, desc, modClass, onClick }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `result-btn ${modClass}`;
  btn.setAttribute('role', 'listitem');
  btn.innerHTML = `
    <span class="result-btn-icon" aria-hidden="true">${icon}</span>
    <span class="result-btn-label">${label}</span>
    <span class="result-btn-desc">${desc}</span>
  `;
  btn.addEventListener('click', onClick);
  return btn;
}

/* ============================================================
   RENDER RESULTS — ONLY REAL API DATA
============================================================ */
function renderResults(apiData, platform) {
  const d = apiData.data || {};
  const { video, videoHD, audio, photo } = d;

  // Clear previous
  DOM.resultActions.innerHTML = '';
  DOM.photoGrid.innerHTML = '';
  DOM.photoGallerySection.style.display = 'none';

  let hasAnyContent = false;

  // ---- Download Video ----
  if (video && typeof video === 'string' && video.startsWith('http')) {
    hasAnyContent = true;

    DOM.resultActions.appendChild(createResultBtn({
      icon:      '⬇️',
      label:     'Download Video',
      desc:      'Kualitas standar',
      modClass:  'rb-video',
      onClick:   async () => {
        showToast('Memulai download video...', 'info');
        await triggerDownload(video, `aiodownload_video_${Date.now()}.mp4`);
      },
    }));

    DOM.resultActions.appendChild(createResultBtn({
      icon:      '📋',
      label:     'Salin Link Video',
      desc:      'Copy URL ke clipboard',
      modClass:  'rb-copy',
      onClick:   () => copyToClipboard(video),
    }));
  }

  // ---- Download HD ----
  if (videoHD && typeof videoHD === 'string' && videoHD.startsWith('http')) {
    hasAnyContent = true;

    DOM.resultActions.appendChild(createResultBtn({
      icon:      '🎬',
      label:     'Download HD',
      desc:      'Resolusi tinggi',
      modClass:  'rb-hd',
      onClick:   async () => {
        showToast('Memulai download video HD...', 'info');
        await triggerDownload(videoHD, `aiodownload_hd_${Date.now()}.mp4`);
      },
    }));

    DOM.resultActions.appendChild(createResultBtn({
      icon:      '🔗',
      label:     'Salin Link HD',
      desc:      'Copy URL HD ke clipboard',
      modClass:  'rb-copyhd',
      onClick:   () => copyToClipboard(videoHD),
    }));
  }

  // ---- Download Audio ----
  if (audio && typeof audio === 'string' && audio.startsWith('http')) {
    hasAnyContent = true;

    DOM.resultActions.appendChild(createResultBtn({
      icon:      '🎵',
      label:     'Download Audio',
      desc:      'Hanya suara / musik',
      modClass:  'rb-audio',
      onClick:   async () => {
        showToast('Memulai download audio...', 'info');
        await triggerDownload(audio, `aiodownload_audio_${Date.now()}.mp3`);
      },
    }));
  }

  // ---- Open in browser (primary URL) ----
  const primaryUrl = videoHD || video || audio;
  if (primaryUrl) {
    DOM.resultActions.appendChild(createResultBtn({
      icon:      '🔗',
      label:     'Buka Link',
      desc:      'Buka di tab baru',
      modClass:  'rb-open',
      onClick:   () => {
        window.open(primaryUrl, '_blank', 'noopener,noreferrer');
        showToast('Link dibuka di tab baru', 'info');
      },
    }));
  }

  // ---- Photo Gallery ----
  if (Array.isArray(photo) && photo.length > 0) {
    hasAnyContent = true;
    const validPhotos = photo.filter(
      (url) => typeof url === 'string' && url.startsWith('http')
    );

    if (validPhotos.length > 0) {
      validPhotos.forEach((photoUrl, idx) => {
        const item = document.createElement('div');
        item.className = 'photo-item';
        item.setAttribute('role', 'listitem');
        item.setAttribute('aria-label', `Foto ${idx + 1} — klik untuk download`);
        item.title = `Download foto ${idx + 1}`;

        const img = document.createElement('img');
        img.src = photoUrl;
        img.alt = `Foto ${idx + 1}`;
        img.loading = 'lazy';
        img.decoding = 'async';

        const overlay = document.createElement('div');
        overlay.className = 'photo-overlay';
        overlay.innerHTML = `<span class="photo-overlay-label">⬇️ Download</span>`;

        item.appendChild(img);
        item.appendChild(overlay);

        item.addEventListener('click', async () => {
          showToast(`Mendownload foto ${idx + 1}...`, 'info');
          await triggerDownload(photoUrl, `aiodownload_photo_${idx + 1}_${Date.now()}.jpg`);
        });

        DOM.photoGrid.appendChild(item);
      });

      DOM.photoGallerySection.style.display = 'block';
    }
  }

  // ---- Guard: no content at all ----
  if (!hasAnyContent) {
    const empty = document.createElement('div');
    empty.style.cssText = 'grid-column:1/-1; padding:20px; text-align:center; font-weight:700; color:#555;';
    empty.textContent = 'Tidak ada file yang tersedia untuk URL ini.';
    DOM.resultActions.appendChild(empty);
  }

  // ---- Platform badge in header ----
  DOM.resultPlatform.textContent = `${platform.emoji} ${platform.name}`;

  // ---- Show & scroll ----
  DOM.resultSection.style.display = 'block';
  setTimeout(() => {
    DOM.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 80);
}

/* ============================================================
   MAIN DOWNLOAD HANDLER
============================================================ */
async function handleDownload() {
  if (isLoading) return;

  const url = DOM.urlInput.value.trim();

  if (!url) {
    showToast('Masukkan URL terlebih dahulu', 'warn');
    DOM.urlInput.focus();
    return;
  }

  if (!isValidUrl(url)) {
    showToast('URL tidak valid — pastikan dimulai dengan https://', 'error');
    DOM.urlInput.focus();
    return;
  }

  const platform = detectPlatform(url);

  // Hide previous result
  DOM.resultSection.style.display = 'none';

  setLoading(true);

  try {
    const data = await fetchDownloadLinks(url);
    renderResults(data, platform);
    showToast('Link download siap!', 'success');
  } catch (err) {
    console.error('[AIODOWNLOADER]', err);

    // Friendlier error messages
    let msg = 'Terjadi kesalahan. Coba lagi.';

    if (!navigator.onLine) {
      msg = 'Tidak ada koneksi internet. Periksa jaringan kamu.';
    } else if (
      err.message.includes('Failed to fetch') ||
      err.message.includes('NetworkError') ||
      err.message.includes('Load failed')
    ) {
      msg = 'Gagal terhubung ke server. Periksa koneksi internet kamu.';
    } else if (err.message) {
      msg = err.message;
    }

    showToast(msg, 'error');
  } finally {
    setLoading(false);
  }
}

/* ============================================================
   PASTE FROM CLIPBOARD
============================================================ */
async function handlePaste() {
  if (isLoading) return;

  try {
    const text = await navigator.clipboard.readText();
    const trimmed = (text || '').trim();
    if (trimmed) {
      DOM.urlInput.value = trimmed;
      updatePlatformIndicator(trimmed);
      showToast('URL berhasil di-paste!', 'success');
      DOM.urlInput.focus();
    } else {
      showToast('Clipboard kosong', 'warn');
    }
  } catch {
    // Clipboard API denied — guide user to manual paste
    DOM.urlInput.focus();
    showToast('Klik di kolom input lalu tekan Ctrl+V / Cmd+V', 'info');
  }
}

/* ============================================================
   FAQ ACCORDION
============================================================ */
function initFAQ() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach((item) => {
    const btn = item.querySelector('.faq-question');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');

      // Close all
      items.forEach((i) => {
        i.classList.remove('is-open');
        i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });

      // Toggle clicked
      if (!isOpen) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* ============================================================
   SMOOTH SCROLL — NAV ANCHORS
============================================================ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* ============================================================
   EVENT LISTENERS
============================================================ */
DOM.btnPaste.addEventListener('click', handlePaste);

DOM.btnDownload.addEventListener('click', handleDownload);

DOM.urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !isLoading) handleDownload();
});

DOM.urlInput.addEventListener('input', (e) => {
  updatePlatformIndicator(e.target.value.trim());
});

// Handle paste event on input (Ctrl+V)
DOM.urlInput.addEventListener('paste', () => {
  requestAnimationFrame(() => {
    updatePlatformIndicator(DOM.urlInput.value.trim());
  });
});

// "Download Again" resets state
DOM.btnDownloadAgain.addEventListener('click', () => {
  DOM.resultSection.style.display = 'none';
  DOM.urlInput.value = '';
  DOM.platformIndicator.innerHTML = '';
  document.getElementById('downloader').scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => DOM.urlInput.focus(), 600);
});

/* ============================================================
   INIT
============================================================ */
(function init() {
  initFAQ();
  initSmoothScroll();
  // Auto-focus input on load
  setTimeout(() => DOM.urlInput.focus(), 200);

  // Check for URL in query param (e.g. shared link ?url=...)
  try {
    const params = new URLSearchParams(window.location.search);
    const preloadUrl = params.get('url');
    if (preloadUrl && isValidUrl(preloadUrl)) {
      DOM.urlInput.value = preloadUrl;
      updatePlatformIndicator(preloadUrl);
    }
  } catch {
    // ignore
  }
})();
