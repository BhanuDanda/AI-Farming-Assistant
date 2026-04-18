// =============================================
//  KrishiAI — Upgraded Frontend Script
//  Auth Guard · Dashboard · AI Chatbot · Form
// =============================================

// ── CONFIG ──────────────────────────────────
const LOCAL_BACKEND_HOSTS = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://localhost:3002'];
let BACKEND_URL = window.location.protocol === 'file:' ? LOCAL_BACKEND_HOSTS[0] : window.location.origin;
let backendDetectionPromise = null;
let chatApiReady = true;
const GOOGLE_AI_KEY_STORAGE = 'krishiai_google_ai_api_key';
const RESPONSE_CACHE_MAX = 120;
const GEMINI_MODEL = (window.KRISHI_AI_CONFIG?.geminiModel || 'gemini-2.5-flash').trim();
const PREFER_BACKEND = window.KRISHI_AI_CONFIG?.preferBackend !== false;

class LruNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

class LruCache {
  constructor(capacity = 100) {
    this.capacity = capacity;
    this.map = new Map();
    this.head = null;
    this.tail = null;
  }

  get(key) {
    const node = this.map.get(key);
    if (!node) return null;
    this.moveToFront(node);
    return node.value;
  }

  set(key, value) {
    let node = this.map.get(key);
    if (node) {
      node.value = value;
      this.moveToFront(node);
      return;
    }

    node = new LruNode(key, value);
    this.map.set(key, node);
    this.addToFront(node);

    if (this.map.size > this.capacity) {
      this.evictTail();
    }
  }

  addToFront(node) {
    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  moveToFront(node) {
    if (this.head === node) return;
    this.removeNode(node);
    this.addToFront(node);
  }

  removeNode(node) {
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (this.tail === node) this.tail = node.prev;
    if (this.head === node) this.head = node.next;
  }

  evictTail() {
    if (!this.tail) return;
    const oldTail = this.tail;
    this.removeNode(oldTail);
    this.map.delete(oldTail.key);
  }
}

const responseCache = new LruCache(RESPONSE_CACHE_MAX);

function buildCacheKey(kind, payload) {
  return `${kind}:${JSON.stringify(payload)}`;
}

function getCachedResponse(kind, payload) {
  return responseCache.get(buildCacheKey(kind, payload));
}

function setCachedResponse(kind, payload, value) {
  responseCache.set(buildCacheKey(kind, payload), value);
}

function getStoredGoogleAiKey() {
  try { return localStorage.getItem(GOOGLE_AI_KEY_STORAGE) || ''; } catch { return ''; }
}

function setStoredGoogleAiKey(key) {
  const normalized = (key || '').trim();
  if (!normalized) {
    localStorage.removeItem(GOOGLE_AI_KEY_STORAGE);
  } else {
    localStorage.setItem(GOOGLE_AI_KEY_STORAGE, normalized);
  }
  syncApiKeyBanner();
}

function syncApiKeyBanner() {
  const banner = document.getElementById('apiKeyBanner');
  if (!banner) return;

  const input = document.getElementById('apiKeyInput');
  const status = document.getElementById('apiKeyStatus');
  const saveBtn = document.getElementById('apiKeySaveBtn');
  const storedKey = getStoredGoogleAiKey();

  if (input && input.value !== storedKey) input.value = storedKey;
  if (status) {
    status.textContent = storedKey
      ? 'API key saved locally in this browser. You can replace it anytime below.'
      : 'Enter your Google AI API key to enable crop, disease, and fertilizer advice.';
  }
  if (saveBtn) saveBtn.textContent = storedKey ? 'Update Key' : 'Save Key';
  banner.classList.remove('hidden');
}

function saveApiKey() {
  const input = document.getElementById('apiKeyInput');
  const key = input?.value.trim() || '';
  if (!key) {
    showToast('Please enter your Google AI API key.');
    return;
  }
  setStoredGoogleAiKey(key);
  showToast('API key saved for this browser.');
}

function clearApiKey() {
  setStoredGoogleAiKey('');
  const input = document.getElementById('apiKeyInput');
  if (input) input.focus();
  showToast('API key cleared.');
}

function getActiveGoogleAiKey() {
  return getStoredGoogleAiKey();
}

function isApiKeyError(message) {
  return /api\s*key|invalid\s*key|key\s*invalid|expired|revoked|leak|compromised|not\s*valid|permission denied|unauthori|forbidden/i.test(message || '');
}

function normalizeAiErrorMessage(error) {
  const raw = (error?.message || '').trim();
  if (isApiKeyError(raw)) {
    clearApiKey();
    return 'Your API key was rejected or reported as leaked. Please paste a new key and try again.';
  }
  if (raw) return raw;
  return 'Request failed. Please check your internet connection and try again.';
}

async function resolveBackendUrl() {
  if (!PREFER_BACKEND) return null;
  const configuredUrl = (window.KRISHI_AI_CONFIG?.apiBaseUrl || '').trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '');
  if (window.location.protocol !== 'file:') return window.location.origin;
  if (backendDetectionPromise) return backendDetectionPromise;

  backendDetectionPromise = (async () => {
    for (const host of LOCAL_BACKEND_HOSTS) {
      try {
        const res = await fetch(`${host}/api/health`, { method: 'GET' });
        if (res.ok) return host;
      } catch (err) {
        /* ignore and try next host */
      }
    }
    return LOCAL_BACKEND_HOSTS[0];
  })();

  return backendDetectionPromise;
}

async function callGeminiText(prompt, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Gemini request failed (${response.status})`);
  }

  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n').trim();
  if (!text) throw new Error('Gemini returned an empty response.');
  return text;
}

async function callGeminiChat(messages, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const contents = messages
    .filter(m => m?.content)
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Gemini request failed (${response.status})`);
  }

  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n').trim();
  if (!text) throw new Error('Gemini returned an empty response.');
  return text;
}

// ── AUTH ─────────────────────────────────────
function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('krishiai_user')); } catch { return null; }
}

function authGuard() {
  const user = getCurrentUser();
  if (!user) { window.location.href = 'login.html'; return null; }
  return user;
}

function handleLogout() {
  localStorage.removeItem('krishiai_user');
  window.location.href = 'login.html';
}

function closeDropdown() {
  document.getElementById('userDropdown').classList.remove('open');
}

// ── INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const user = authGuard();
  if (!user) return;

  // Set user info in navbar
  const nameEl = document.getElementById('userName');
  const udHeader = document.getElementById('udHeader');
  const dashName = document.getElementById('dashName');
  if (nameEl) nameEl.textContent = user.name?.split(' ')[0] || 'Farmer';
  if (dashName) dashName.textContent = user.name?.split(' ')[0] || 'Farmer';
  if (udHeader) udHeader.innerHTML = `<div class="ud-name">${user.name || 'Farmer'}</div><div class="ud-email">${user.email || ''}</div>`;

  initSliders();
  initQueryTypeToggle();
  initNavHighlight();
  initForm();
  initDashboard();
  initChatbot();
  syncApiKeyBanner();
  updateDashboardStats();

  // Close dropdown on outside click
  document.addEventListener('click', e => {
    const pill = document.getElementById('userPill');
    if (pill && !pill.contains(e.target)) closeDropdown();
  });
});

// ── DASHBOARD ────────────────────────────────
function initDashboard() {
  renderHistory();
  updateDashboardStats();
}

function updateDashboardStats() {
  const history = getHistory();
  const qs = document.getElementById('statQueries');
  const histCount = document.getElementById('historyCount');
  if (qs) qs.textContent = history.length;
  if (histCount) histCount.textContent = history.length;
  const crops = history.filter(h => h.type === 'crop').length;
  const diseases = history.filter(h => h.type === 'disease').length;
  const fertilizers = history.filter(h => h.type === 'fertilizer').length;
  if (document.getElementById('statCrops')) document.getElementById('statCrops').textContent = crops || 3;
  if (document.getElementById('statDisease')) document.getElementById('statDisease').textContent = diseases || 1;
  if (document.getElementById('statFertilizer')) document.getElementById('statFertilizer').textContent = fertilizers || 2;
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem('krishiai_history') || '[]'); } catch { return []; }
}

function saveToHistory(entry) {
  const history = getHistory();
  history.unshift({ ...entry, time: new Date().toISOString(), id: Date.now() });
  if (history.length > 20) history.pop(); // keep last 20
  localStorage.setItem('krishiai_history', JSON.stringify(history));
  renderHistory();
  updateDashboardStats();
}

function renderHistory() {
  const list = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');
  if (!list) return;
  const history = getHistory();
  if (history.length === 0) {
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';
  const icons = { crop: '🌱', disease: '🦠', fertilizer: '🧪' };
  const titles = { crop: 'Crop Suggestion', disease: 'Disease Analysis', fertilizer: 'Fertilizer Plan' };

  // Remove old items (keep empty div)
  list.querySelectorAll('.history-item').forEach(el => el.remove());

  history.slice(0, 6).forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <span class="hi-icon">${icons[item.type] || '🌾'}</span>
      <div class="hi-info">
        <div class="hi-type">${titles[item.type] || 'AI Advice'}</div>
        <div class="hi-detail">${item.state || ''} · ${item.soilType || ''}</div>
      </div>
      <span class="hi-time">${timeAgo(item.time)}</span>
    `;
    div.onclick = () => { window.location.hash = '#assistant'; };
    list.appendChild(div);
  });
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
  return `${Math.floor(mins/1440)}d ago`;
}

function preselectQuery(type) {
  setTimeout(() => {
    // Jump to step 3 and preselect type
    const steps = document.querySelectorAll('.form-step');
    const stepInds = document.querySelectorAll('.step');
    steps.forEach(s => s.classList.remove('active'));
    stepInds.forEach((s,i) => { s.classList.remove('active','done'); if(i<2) s.classList.add('done'); });
    const step3 = document.getElementById('step3');
    const stepInd3 = stepInds[2];
    if (step3) step3.classList.add('active');
    if (stepInd3) stepInd3.classList.add('active');
    currentStep = 3;
    const radio = document.querySelector(`input[name="queryType"][value="${type}"]`);
    if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
  }, 300);
}

// ── SLIDERS ──────────────────────────────────
let currentStep = 1;

function initSliders() {
  const phSlider = document.getElementById('phSlider');
  const phVal    = document.getElementById('phVal');
  const tempSlider = document.getElementById('tempSlider');
  const tempVal  = document.getElementById('tempVal');

  phSlider?.addEventListener('input', () => {
    phVal.textContent = phSlider.value;
    const pct = ((phSlider.value - 3) / 7) * 100;
    phSlider.style.background = `linear-gradient(90deg, var(--green-light) ${pct}%, rgba(82,183,136,0.2) ${pct}%)`;
    const ph = parseFloat(phSlider.value);
    phVal.style.color = ph < 6 ? '#e76f51' : ph <= 7.5 ? 'var(--green-mid)' : 'var(--gold)';
  });

  tempSlider?.addEventListener('input', () => {
    tempVal.textContent = tempSlider.value + '°C';
    const pct = ((tempSlider.value - 5) / 45) * 100;
    tempSlider.style.background = `linear-gradient(90deg, var(--green-light) ${pct}%, rgba(82,183,136,0.2) ${pct}%)`;
  });
}

// ── QUERY TYPE TOGGLE ─────────────────────────
function initQueryTypeToggle() {
  document.querySelectorAll('input[name="queryType"]').forEach(input => {
    input.addEventListener('change', () => {
      document.getElementById('diseaseExtra').classList.add('hidden');
      document.getElementById('cropExtra').classList.add('hidden');
      if (input.value === 'disease') document.getElementById('diseaseExtra').classList.remove('hidden');
      if (input.value === 'crop')    document.getElementById('cropExtra').classList.remove('hidden');
    });
  });
}

// ── FORM STEPS ───────────────────────────────
function nextStep(fromStep) {
  if (!validateStep(fromStep)) return;
  document.getElementById(`step${fromStep}`).classList.remove('active');
  document.getElementById(`step${fromStep + 1}`).classList.add('active');
  const steps = document.querySelectorAll('.step');
  steps[fromStep-1].classList.remove('active');
  steps[fromStep-1].classList.add('done');
  steps[fromStep].classList.add('active');
  currentStep = fromStep + 1;
}

function prevStep(fromStep) {
  document.getElementById(`step${fromStep}`).classList.remove('active');
  document.getElementById(`step${fromStep - 1}`).classList.add('active');
  const steps = document.querySelectorAll('.step');
  steps[fromStep-1].classList.remove('active');
  steps[fromStep-2].classList.remove('done');
  steps[fromStep-2].classList.add('active');
  currentStep = fromStep - 1;
}

function validateStep(step) {
  if (step === 1) {
    if (!document.querySelector('select[name="state"]').value) { showToast('Please select your State.'); return false; }
    if (!document.querySelector('select[name="soilType"]').value) { showToast('Please select your Soil Type.'); return false; }
  }
  if (step === 2) {
    if (!document.querySelector('input[name="season"]:checked')) { showToast('Please select a Season.'); return false; }
  }
  return true;
}

// ── FORM SUBMIT ──────────────────────────────
function initForm() {
  document.getElementById('farmForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!document.querySelector('input[name="queryType"]:checked')) {
      showToast('Please select a query type.'); return;
    }
    await getAIAdvice(collectFormData());
  });
}

function collectFormData() {
  const data = {};
  new FormData(document.getElementById('farmForm')).forEach((val, key) => { data[key] = val; });
  return data;
}

async function getAIAdvice(data) {
  const apiKey = getActiveGoogleAiKey();
  if (!apiKey) {
    syncApiKeyBanner();
    showResultPanel('error', 'Enter your Google AI API key to generate AI advice.');
    return;
  }

  setLoading(true);
  showResultPanel('loading');
  try {
    const prompt = buildPrompt(data);
    const cachePayload = { prompt, queryType: data.queryType, farmData: data };
    const cached = getCachedResponse('advice', cachePayload);
    if (cached) {
      displayResult(cached, data.queryType, data);
      saveToHistory({ type: data.queryType, state: data.state, soilType: data.soilType });
      showToast('Loaded from smart cache.');
      return;
    }

    let advice = null;
    const backendUrl = await resolveBackendUrl();
    if (backendUrl) {
      const response = await fetch(`${backendUrl}/api/farming/advice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Google-AI-API-Key': apiKey
        },
        body: JSON.stringify({ prompt, queryType: data.queryType, farmData: data })
      });

      if (response.ok) {
        const result = await response.json();
        advice = result?.advice || '';
      }
    }

    if (!advice) {
      advice = await callGeminiText(prompt, apiKey);
    }

    setCachedResponse('advice', cachePayload, advice);
    displayResult(advice, data.queryType, data);
    saveToHistory({ type: data.queryType, state: data.state, soilType: data.soilType });
  } catch (err) {
    console.error('AI Advice error:', err);
    const message = normalizeAiErrorMessage(err);
    showResultPanel('error', message);
  } finally {
    setLoading(false);
  }
}

function buildPrompt(data) {
  const targetCrop = data.targetCrop || data.prevCrop || 'None';
  const base = `Farmer's Details:\n- Region/State: ${data.state}\n- Soil Type: ${data.soilType}\n- Soil pH: ${data.soilPh}\n- Land Area: ${data.landArea} acres\n- Season: ${data.season}\n- Irrigation: ${data.irrigation}\n- Avg Temp: ${data.temperature}°C\n- Rainfall: ${data.rainfall} mm\n- Current/Target Crop: ${targetCrop}`;
  if (data.queryType === 'crop') return `${base}\n\nSuggest TOP 3 crops for these conditions. If the farmer has a specific target crop mentioned, explain whether it is a good fit and provide alternatives. For each recommendation: name, why it suits, expected yield/acre, key growing tips, market potential. Be specific and practical for an Indian farmer.`;
  if (data.queryType === 'disease') return `${base}\n\nSymptoms: ${data.symptoms || 'Not described'}\n\nDiagnose this crop issue and provide: disease name, causes, organic treatment, chemical treatment, prevention measures, when to consult an expert. Be practical.`;
  return `${base}\n\nCreate a complete fertilizer plan: NPK ratio & amounts per acre, organic options (compost/vermicompost), application schedule, micronutrient tips, cost estimate in INR. Be specific and budget-friendly.`;
}

function displayResult(text, queryType, data) {
  const icons  = { crop:'🌱', disease:'🦠', fertilizer:'🧪' };
  const titles = { crop:'Crop Suggestion', disease:'Disease Analysis', fertilizer:'Fertilizer Plan' };
  const targetCrop = data.targetCrop ? ` | Target: ${data.targetCrop}` : '';
  const metas  = { crop:`For ${data.soilType} in ${data.state}${targetCrop}`, disease:'Based on described symptoms', fertilizer:`For ${data.soilType}${targetCrop}` };
  document.getElementById('resultIcon').textContent = icons[queryType]||'🌾';
  document.getElementById('resultType').textContent = titles[queryType]||'AI Advice';
  document.getElementById('resultMeta').textContent = metas[queryType]||'Based on your farm data';
  document.getElementById('resultBody').innerHTML = formatAIResponse(text);
  showResultPanel('content');
}

function formatAIResponse(text) {
  if (!text) return '<p>No response received.</p>';
  return '<p>' + text
    .replace(/^#{1,3}\s(.+)$/gm, '</p><h4>$1</h4><p>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
    .replace(/^[-•]\s(.+)$/gm, '<li>$1</li>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, ' ') + '</p>';
}

function showResultPanel(state, errorMsg='') {
  const panel   = document.getElementById('resultPanel');
  const idle    = document.getElementById('resultIdle');
  const content = document.getElementById('resultContent');
  const error   = document.getElementById('resultError');
  panel.style.alignItems = state === 'content' ? 'flex-start' : 'center';
  idle.classList.add('hidden');
  content.classList.add('hidden');
  error.classList.add('hidden');
  if (state==='idle') {
    idle.classList.remove('hidden');
    document.querySelector('.idle-emoji').textContent = '🌾';
    document.querySelector('.result-idle h3').innerHTML = 'Your AI Advice<br/>Will Appear Here';
    document.querySelector('.result-idle p').textContent = 'Fill in the form and submit to get personalised guidance.';
  } else if (state==='content') {
    content.classList.remove('hidden');
  } else if (state==='error') {
    error.classList.remove('hidden');
    if (errorMsg) document.getElementById('errorMsg').textContent = errorMsg;
  } else if (state==='loading') {
    idle.classList.remove('hidden');
    document.querySelector('.idle-emoji').textContent = '⏳';
    document.querySelector('.result-idle h3').innerHTML = 'Analysing your<br/>farm data…';
    document.querySelector('.result-idle p').textContent = 'Google AI is generating your personalised advice…';
  }
}

function setLoading(isLoading) {
  const btn = document.getElementById('submitBtn');
  if (!btn) return;
  btn.disabled = isLoading;
  document.getElementById('submitText').classList.toggle('hidden', isLoading);
  document.getElementById('submitLoader').classList.toggle('hidden', !isLoading);
}

function resetForm() { showResultPanel('idle'); }
function resetResult() { resetForm(); }
function feedback(type) { showToast(type==='good' ? '✅ Thanks for your feedback!' : '📝 Noted. We\'ll improve!'); }
function copyResult() {
  navigator.clipboard.writeText(document.getElementById('resultBody').innerText)
    .then(() => showToast('📋 Copied!')).catch(() => showToast('Please copy manually.'));
}

// ── CHATBOT ──────────────────────────────────
let chatHistory = []; // { role, content }
let chatbotOpen = false;

function initChatbot() {
  syncApiKeyBanner();
}

function toggleChatbot() {
  chatbotOpen = !chatbotOpen;
  const widget = document.getElementById('chatbotWidget');
  if (chatbotOpen) {
    widget.classList.remove('hidden');
    document.getElementById('cwInput')?.focus();
  } else {
    widget.classList.add('hidden');
  }
}

function openChatbot() {
  chatbotOpen = false;
  toggleChatbot();
}

function clearChat() {
  chatHistory = [];
  const msgs = document.getElementById('cwMessages');
  msgs.innerHTML = `
    <div class="cw-msg bot">
      <div class="cw-msg-avatar">🌾</div>
      <div class="cw-msg-bubble">
        Namaskar! 🙏 I'm KrishiAI, your smart farming assistant.<br/><br/>Ask me anything about crops, diseases, or fertilizers!
        <div class="quick-chips">
          <span class="chip" onclick="sendQuick('Best crops for Punjab in Rabi season?')">🌱 Crop advice</span>
          <span class="chip" onclick="sendQuick('My wheat leaves are turning yellow. What disease is this?')">🦠 Disease help</span>
          <span class="chip" onclick="sendQuick('Fertilizer plan for rice on clay soil')">🧪 Fertilizer</span>
        </div>
      </div>
    </div>`;
}

function sendQuick(text) {
  document.getElementById('cwInput').value = text;
  sendMessage();
}

async function sendMessage() {
  const input = document.getElementById('cwInput');
  const text = input.value.trim();
  if (!text) return;

  const apiKey = getActiveGoogleAiKey();
  if (!apiKey) {
    syncApiKeyBanner();
    showToast('Enter your Google AI API key to use the chatbot.');
    input.focus();
    return;
  }

  input.value = '';
  appendUserMessage(text);
  chatHistory.push({ role: 'user', content: text });

  const typingId = showTyping();
  const sendBtn = document.getElementById('cwSendBtn');
  if (sendBtn) sendBtn.disabled = true;

  try {
    const cached = getCachedResponse('chat', { messages: chatHistory });
    if (cached) {
      removeTyping(typingId);
      chatHistory.push({ role: 'assistant', content: cached });
      appendBotMessage(cached);
      showToast('Chat loaded from smart cache.');
      return;
    }

    let reply = null;
    const backendUrl = await resolveBackendUrl();
    if (backendUrl) {
      const response = await fetch(`${backendUrl}/api/farming/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Google-AI-API-Key': apiKey,
        },
        body: JSON.stringify({ messages: chatHistory })
      });
      if (response.ok) {
        const data = await response.json();
        reply = data.message || null;
      }
    }

    if (!reply) {
      reply = await callGeminiChat(chatHistory, apiKey);
    }

    removeTyping(typingId);
    setCachedResponse('chat', { messages: chatHistory }, reply);
    chatHistory.push({ role: 'assistant', content: reply });
    appendBotMessage(reply);

  } catch (err) {
    removeTyping(typingId);
    console.error('Chatbot error:', err);
    appendBotMessage(`⚠️ ${normalizeAiErrorMessage(err)}`);
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    input.focus();
  }
}

function appendUserMessage(text) {
  const msgs = document.getElementById('cwMessages');
  const div = document.createElement('div');
  div.className = 'cw-msg user';
  div.innerHTML = `
    <div class="cw-msg-avatar">🧑‍🌾</div>
    <div class="cw-msg-bubble">${escapeHtml(text)}</div>`;
  msgs.appendChild(div);
  scrollToBottom();
}

function appendBotMessage(text) {
  const msgs = document.getElementById('cwMessages');
  const div = document.createElement('div');
  div.className = 'cw-msg bot';
  div.innerHTML = `
    <div class="cw-msg-avatar">🌾</div>
    <div class="cw-msg-bubble">${formatChatResponse(text)}</div>`;
  msgs.appendChild(div);
  scrollToBottom();
}

function showTyping() {
  const msgs = document.getElementById('cwMessages');
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'cw-msg bot cw-typing';
  div.id = id;
  div.innerHTML = `
    <div class="cw-msg-avatar">🌾</div>
    <div class="cw-msg-bubble">
      <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
    </div>`;
  msgs.appendChild(div);
  scrollToBottom();
  return id;
}

function removeTyping(id) {
  document.getElementById(id)?.remove();
}

function scrollToBottom() {
  const msgs = document.getElementById('cwMessages');
  setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 50);
}

function formatChatResponse(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[-•]\s(.+)$/gm, '<li style="margin:4px 0;padding-left:4px">$1</li>')
    .replace(/^\d+\.\s(.+)$/gm, '<li style="margin:4px 0;padding-left:4px">$1</li>')
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

function escapeHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── NAV HIGHLIGHT ─────────────────────────────
function initNavHighlight() {
  const links = document.querySelectorAll('.nav-links a');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        document.querySelector(`.nav-links a[href="#${e.target.id}"]`)?.classList.add('active');
      }
    });
  }, { threshold: 0.35 });
  document.querySelectorAll('section[id]').forEach(s => observer.observe(s));
}

// ── TOAST ─────────────────────────────────────
function showToast(message) {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:var(--green-deep);color:var(--cream);padding:12px 24px;border-radius:30px;font-family:'DM Sans',sans-serif;font-size:0.88rem;font-weight:500;box-shadow:0 8px 30px rgba(26,60,46,0.3);z-index:9999;white-space:nowrap`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
