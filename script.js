const STORAGE_KEYS = {
  API_KEY: 'studymate_gemini_api_key',
  THEME: 'studymate_theme',
  HISTORY: 'studymate_study_history',
  QUIZ_STATS: 'studymate_quiz_statistics',
  MODEL: 'studymate_gemini_model'
};

const SUPPORTED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro'
];

const CHAR_LIMITS = {
  WARNING_THRESHOLD: 8000,
  MAX_ALLOWED: 12000
};

const appState = {
  apiKey: '',
  preferredModel: 'gemini-2.5-flash',
  currentData: null,      

  userQuizAnswers: [null, null, null, null, null],
  isQuizSubmitted: false,

  currentCardIndex: 0,
  isCardFlipped: false,
  masteredCards: new Set(),

  isSpeaking: false,
  speechUtterance: null,

  isGenerating: false
};

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initApiKey();
  initEventListeners();
  initHistory();
  updateQuizStatisticsUI();
});

function initEventListeners() {
  
  document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
  document.getElementById('toggleSettingsBtn').addEventListener('click', toggleSettingsDrawer);
  document.getElementById('closeSettingsBtn').addEventListener('click', closeSettingsDrawer);

  document.getElementById('saveApiKeyBtn').addEventListener('click', saveApiKeyFromInput);
  document.getElementById('testApiKeyBtn').addEventListener('click', testApiKeyConnection);
  document.getElementById('clearApiKeyBtn').addEventListener('click', clearApiKey);
  document.getElementById('toggleApiKeyVisibilityBtn').addEventListener('click', toggleApiKeyVisibility);

  const modelSelect = document.getElementById('modelSelect');
  if (modelSelect) {
    modelSelect.addEventListener('change', (e) => {
      appState.preferredModel = e.target.value;
      try {
        localStorage.setItem(STORAGE_KEYS.MODEL, e.target.value);
      } catch (_) {}
      showToast(`Selected model: ${e.target.value}`, 'info');
    });
  }

  document.getElementById('dismissAlertBtn').addEventListener('click', dismissAlert);

  const notesInput = document.getElementById('notesInput');
  notesInput.addEventListener('input', handleNotesInput);
  document.getElementById('loadSampleNotesBtn').addEventListener('click', loadSampleNotes);
  document.getElementById('clearNotesBtn').addEventListener('click', clearNotesInput);

  document.getElementById('generateBtn').addEventListener('click', () => handleGenerateRequest(false));
  document.getElementById('demoBtn').addEventListener('click', () => handleGenerateRequest(true));

  document.getElementById('copySummaryBtn').addEventListener('click', copySummaryToClipboard);
  document.getElementById('downloadSummaryBtn').addEventListener('click', downloadSummaryAsText);
  document.getElementById('readAloudBtn').addEventListener('click', toggleSpeechSynthesis);

  document.getElementById('submitQuizBtn').addEventListener('click', submitQuiz);
  document.getElementById('tryAgainQuizBtn').addEventListener('click', resetQuiz);
  document.getElementById('resetQuizBtn').addEventListener('click', resetQuizSelections);

  const activeCard = document.getElementById('activeFlashcard');
  activeCard.addEventListener('click', toggleCardFlip);
  activeCard.addEventListener('keydown', handleFlashcardKeydown);

  document.getElementById('prevCardBtn').addEventListener('click', showPreviousCard);
  document.getElementById('nextCardBtn').addEventListener('click', showNextCard);
  document.getElementById('markKnownBtn').addEventListener('click', markCurrentCardKnown);
  document.getElementById('markReviewBtn').addEventListener('click', markCurrentCardReview);

  document.addEventListener('keydown', handleGlobalKeyboardShortcuts);

  document.getElementById('historySearchInput').addEventListener('input', handleHistorySearch);
  document.getElementById('clearAllHistoryBtn').addEventListener('click', handleClearAllHistory);
  document.getElementById('regenerateCurrentBtn').addEventListener('click', () => handleGenerateRequest(false));
}

function initTheme() {
  try {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    applyTheme(savedTheme);
  } catch (err) {
    console.warn('LocalStorage access issue during theme init:', err);
    applyTheme('light');
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
  } catch (err) {
    console.warn('Could not save theme preference:', err);
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');

  if (theme === 'dark') {
    themeIcon.textContent = '☀️';
    themeText.textContent = 'Light Mode';
  } else {
    themeIcon.textContent = '🌙';
    themeText.textContent = 'Dark Mode';
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span aria-hidden="true">${icon}</span> <span>${escapeHTML(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function showAlert(title, message, type = 'danger') {
  const banner = document.getElementById('alertBanner');
  const alertIcon = document.getElementById('alertIcon');
  const alertTitle = document.getElementById('alertTitle');
  const alertMessage = document.getElementById('alertMessage');

  banner.className = `alert-banner alert-${type}`;
  alertTitle.textContent = title;
  alertMessage.textContent = message;

  if (type === 'danger') alertIcon.textContent = '🛑';
  else if (type === 'warning') alertIcon.textContent = '⚠️';
  else alertIcon.textContent = '✅';

  banner.classList.remove('hidden');
  banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function dismissAlert() {
  const banner = document.getElementById('alertBanner');
  banner.classList.add('hidden');
}

function initApiKey() {
  try {
    const savedKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    if (savedKey && savedKey.trim().length > 0) {
      const cleanKey = savedKey.trim();
      if (cleanKey.startsWith('gen-lang-client') || cleanKey.includes('client-')) {
        localStorage.removeItem(STORAGE_KEYS.API_KEY);
        appState.apiKey = '';
        updateApiKeyStatusUI(false);
        showAlert(
          'Project ID Detected (Invalid API Key Removed)',
          `The saved key was "${cleanKey}", which is your Google Cloud Project Name, NOT your Gemini API Key! Google Gemini API keys start with "AIzaSy...". Please click "API Settings" and copy the key from the "Key" column in Google AI Studio.`,
          'danger'
        );
      } else {
        appState.apiKey = cleanKey;
        updateApiKeyStatusUI(true, appState.apiKey);
      }
    } else {
      updateApiKeyStatusUI(false);
    }

    const savedModel = localStorage.getItem(STORAGE_KEYS.MODEL);
    if (savedModel && SUPPORTED_MODELS.includes(savedModel)) {
      appState.preferredModel = savedModel;
    } else {
      appState.preferredModel = 'gemini-2.5-flash';
    }

    const modelSelect = document.getElementById('modelSelect');
    if (modelSelect) {
      modelSelect.value = appState.preferredModel;
    }
  } catch (err) {
    console.warn('Error reading API key or model from localStorage:', err);
    updateApiKeyStatusUI(false);
  }
}

function saveApiKeyFromInput() {
  const input = document.getElementById('apiKeyInput');
  let rawValue = input.value.trim().replace(/^GEMINI_API_KEY\s*=\s*/i, '').replace(/;$/, '').trim();

  if (!rawValue) {
    showAlert('API Key Required', 'Please enter a valid Google Gemini API key before saving.', 'warning');
    return;
  }

  if (rawValue.startsWith('gen-lang-client') || rawValue.includes('client-')) {
    input.value = '';
    appState.apiKey = '';
    try { localStorage.removeItem(STORAGE_KEYS.API_KEY); } catch (_) {}
    updateApiKeyStatusUI(false);
    showAlert(
      'Project ID Detected (Not an API Key)',
      `"${rawValue}" is your Google Cloud Project Name, NOT your Gemini API Key! Google Gemini API keys always start with "AIzaSy...". In Google AI Studio (aistudio.google.com/app/apikey), locate the "Key" column and click "Copy Key".`,
      'danger'
    );
    return;
  }

  if (!rawValue.startsWith('AIza')) {
    showAlert(
      'Unusual Key Format',
      'Google Gemini API keys start with "AIzaSy...". Please verify you copied the string from the "Key" column in Google AI Studio.',
      'warning'
    );
  }

  try {
    localStorage.setItem(STORAGE_KEYS.API_KEY, rawValue);
    appState.apiKey = rawValue;
    input.value = '';
    updateApiKeyStatusUI(true, rawValue);
    showToast('Gemini API Key saved securely in browser!', 'success');
    closeSettingsDrawer();
    dismissAlert();
  } catch (err) {
    console.error('Failed to save API key to localStorage:', err);
    showAlert('Storage Error', 'Could not save the API key to localStorage. Please check browser privacy/storage settings.', 'danger');
  }
}

async function testApiKeyConnection() {
  const input = document.getElementById('apiKeyInput');
  let testKey = (input.value.trim() || appState.apiKey).replace(/^GEMINI_API_KEY\s*=\s*/i, '').replace(/;$/, '').trim();

  if (!testKey) {
    showAlert('API Key Required', 'Please enter your Gemini API key in the field above before testing.', 'warning');
    input.focus();
    return;
  }

  if (testKey.startsWith('gen-lang-client') || testKey.includes('client-')) {
    input.value = '';
    appState.apiKey = '';
    try { localStorage.removeItem(STORAGE_KEYS.API_KEY); } catch (_) {}
    updateApiKeyStatusUI(false);
    showAlert(
      'Project ID Detected (Not an API Key)',
      `"${testKey}" is your Google Cloud Project Name, NOT your Gemini API Key! Gemini API keys start with "AIzaSy...". In Google AI Studio (aistudio.google.com/app/apikey), copy the value from the "Key" column, not the "Project" column.`,
      'danger'
    );
    return;
  }

  const testBtn = document.getElementById('testApiKeyBtn');
  const originalHtml = testBtn.innerHTML;
  testBtn.disabled = true;
  testBtn.innerHTML = '<span>⏳ Testing...</span>';

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(testKey)}`;
    const response = await fetch(endpoint);

    if (!response.ok) {
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        throw new Error(`Authentication failed (HTTP ${response.status}). Key appears invalid or lacks permissions.`);
      }
      throw new Error(`Connection test failed with HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const availableModels = (data.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map(m => m.name.replace(/^models\//, ''));

    const matched = SUPPORTED_MODELS.filter(m => availableModels.includes(m));
    const bestModel = matched[0] || availableModels[0] || 'gemini-2.5-flash';

    appState.preferredModel = bestModel;
    try {
      localStorage.setItem(STORAGE_KEYS.MODEL, bestModel);
      const modelSelect = document.getElementById('modelSelect');
      if (modelSelect) modelSelect.value = bestModel;
    } catch (_) {}

    showToast(`API Key verified! Active model: ${bestModel}`, 'success');
    showAlert(
      'Gemini Connection Verified!', 
      `Your API key is valid. Models verified for generateContent: ${matched.length > 0 ? matched.join(', ') : availableModels.slice(0, 3).join(', ')}. Active model set to "${bestModel}".`, 
      'success'
    );

  } catch (err) {
    console.error('API test error:', err);
    showAlert('Connection Test Failed', err.message, 'danger');
  } finally {
    testBtn.disabled = false;
    testBtn.innerHTML = originalHtml;
  }
}

function clearApiKey() {
  try {
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
    appState.apiKey = '';
    document.getElementById('apiKeyInput').value = '';
    updateApiKeyStatusUI(false);
    showToast('API Key removed from this browser.', 'info');
  } catch (err) {
    console.error('Failed to clear API key:', err);
  }
}

function updateApiKeyStatusUI(isConfigured, rawKey = '') {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('keyStatusText');

  if (isConfigured && rawKey) {
    statusDot.className = 'status-dot status-configured';
    
    const masked = rawKey.length > 8 
      ? `${rawKey.substring(0, 6)}••••••••${rawKey.substring(rawKey.length - 4)}` 
      : '••••••••';
    statusText.innerHTML = `Active Key Configured: <code>${escapeHTML(masked)}</code>`;
  } else {
    statusDot.className = 'status-dot status-missing';
    statusText.textContent = 'No API key saved in browser localStorage.';
  }
}

function toggleApiKeyVisibility() {
  const input = document.getElementById('apiKeyInput');
  const btn = document.getElementById('toggleApiKeyVisibilityBtn');
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
    btn.title = 'Hide key';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
    btn.title = 'Show key';
  }
}

function toggleSettingsDrawer() {
  const section = document.getElementById('settingsSection');
  const isCollapsed = section.classList.contains('collapsed');
  if (isCollapsed) {
    section.classList.remove('collapsed');
    section.setAttribute('aria-expanded', 'true');
    document.getElementById('apiKeyInput').focus();
  } else {
    section.classList.add('collapsed');
    section.setAttribute('aria-expanded', 'false');
  }
}

function closeSettingsDrawer() {
  const section = document.getElementById('settingsSection');
  section.classList.add('collapsed');
  section.setAttribute('aria-expanded', 'false');
}

function handleNotesInput() {
  const textarea = document.getElementById('notesInput');
  const countSpan = document.getElementById('charCount');
  const warningSpan = document.getElementById('charWarning');
  
  const length = textarea.value.length;
  countSpan.textContent = `${length.toLocaleString()} / ${CHAR_LIMITS.MAX_ALLOWED.toLocaleString()} characters`;

  if (length > CHAR_LIMITS.MAX_ALLOWED) {
    countSpan.style.color = 'var(--danger)';
    warningSpan.textContent = `🛑 Notes exceed maximum limit of ${CHAR_LIMITS.MAX_ALLOWED.toLocaleString()} characters. Please trim your text.`;
    warningSpan.className = 'char-warning limit-exceeded';
    warningSpan.classList.remove('hidden');
  } else if (length > CHAR_LIMITS.WARNING_THRESHOLD) {
    countSpan.style.color = 'var(--warning)';
    warningSpan.textContent = `⚠️ Long notes detected (${length.toLocaleString()} chars). Processing might take a few extra seconds.`;
    warningSpan.className = 'char-warning';
    warningSpan.classList.remove('hidden');
  } else {
    countSpan.style.color = 'var(--text-muted)';
    warningSpan.classList.add('hidden');
  }
}

function clearNotesInput() {
  const textarea = document.getElementById('notesInput');
  textarea.value = '';
  handleNotesInput();
  textarea.focus();
}

function loadSampleNotes() {
  const sampleText = `Topic: Operating Systems - Process Synchronization & Deadlocks

1. The Critical Section Problem:
A critical section is a piece of code that accesses shared resources (such as common variables, files, or hardware devices) that must not be concurrently accessed by more than one process or thread.
To solve the critical section problem, any synchronization mechanism must satisfy three fundamental conditions:
- Mutual Exclusion: If process P is executing in its critical section, no other processes can be executing in their critical sections.
- Progress: If no process is executing in its critical section and there exist some processes that wish to enter their critical section, only those processes not executing in their remainder sections can participate in deciding which will enter next.
- Bounded Waiting: There must be a bound or limit on the number of times other processes are allowed to enter their critical sections after a process has made a request to enter.

2. Semaphores:
Introduced by Edsger Dijkstra, a semaphore S is an integer variable accessed only through two standard atomic operations: wait() (also known as P) and signal() (also known as V).
- wait(S): Decrements S. If S <= 0, the calling process blocks until S becomes positive.
- signal(S): Increments S. If processes were blocked, one is unblocked.
- Counting Semaphore: Value can range over an unrestricted integer domain (used to control access to a resource pool with finite instances).
- Binary Semaphore: Value can be only 0 or 1 (essentially a Mutex lock).

3. Classic Synchronization Problems:
- Producer-Consumer Problem (Bounded Buffer): Uses semaphores mutex, empty, and full to coordinate buffer access between producers and consumers.
- Readers-Writers Problem: Ensures multiple readers can read simultaneously, but writers must have exclusive access.
- Dining Philosophers Problem: Demonstrates resource allocation deadlock when each philosopher picks up their left fork simultaneously and waits indefinitely for their right fork.

4. Deadlocks:
A deadlock is a situation where a set of processes are blocked because each process is holding a resource and waiting for another resource held by another process.
Four Coffman conditions must hold simultaneously for a deadlock to arise:
1. Mutual Exclusion: At least one resource must be non-shareable.
2. Hold and Wait: A process must be holding at least one resource and waiting to acquire additional resources.
3. No Preemption: Resources cannot be preempted; they are released only voluntarily.
4. Circular Wait: A closed chain of processes exists such that each process holds at least one resource needed by the next process in the chain.

5. Deadlock Handling Strategies:
- Deadlock Prevention: Invalidate at least one of the four Coffman conditions (e.g. enforce total resource ordering to eliminate circular wait).
- Deadlock Avoidance: System examines dynamic resource-allocation state before granting requests to ensure the system never enters an unsafe state (Banker's Algorithm).
- Deadlock Detection & Recovery: Allow deadlocks to occur, periodically detect cycles using Resource Allocation Graphs (RAG) or Wait-For Graphs, and recover by process termination or resource preemption.
- Ignorance (Ostrich Algorithm): Stick your head in the sand and pretend deadlocks never occur (commonly adopted by general-purpose OSes like Linux and Windows due to low overhead).`;

  const textarea = document.getElementById('notesInput');
  textarea.value = sampleText;
  handleNotesInput();
  showToast('Sample lecture notes loaded!', 'info');
}

async function handleGenerateRequest(isDemoMode = false) {
  if (appState.isGenerating) return;

  dismissAlert();
  stopSpeechSynthesis();

  const notes = document.getElementById('notesInput').value.trim();
  const style = document.getElementById('styleSelect').value;
  const difficulty = document.getElementById('difficultySelect').value;

  if (!notes) {
    showAlert('Notes Required', 'Please enter or paste your class notes, or click "Load Sample Notes" to test.', 'warning');
    document.getElementById('notesInput').focus();
    return;
  }

  if (notes.length > CHAR_LIMITS.MAX_ALLOWED) {
    showAlert('Notes Too Long', `Your notes exceed ${CHAR_LIMITS.MAX_ALLOWED.toLocaleString()} characters. Please shorten them before submitting to Gemini.`, 'danger');
    return;
  }

  if (!isDemoMode) {
    if (!appState.apiKey) {
      showAlert(
        'Gemini API Key Missing', 
        'Please click the "API Settings" button at the top to save your Google Gemini API key. Alternatively, click "Try Demo Mode" to test the app instantly without a key.', 
        'danger'
      );
      toggleSettingsDrawer();
      return;
    }

    if (appState.apiKey.startsWith('gen-lang-client') || appState.apiKey.includes('client-')) {
      const invalidKey = appState.apiKey;
      appState.apiKey = '';
      try { localStorage.removeItem(STORAGE_KEYS.API_KEY); } catch (_) {}
      updateApiKeyStatusUI(false);
      showAlert(
        'Project ID Detected (Not an API Key)',
        `"${invalidKey}" is your Google Cloud Project Name, NOT a Gemini API Key! Google Gemini API keys always start with "AIzaSy...". Please click "API Settings" and copy the key from the "Key" column in Google AI Studio.`,
        'danger'
      );
      toggleSettingsDrawer();
      return;
    }
  }

  setGeneratingUI(true, isDemoMode ? 'Preparing offline demo data...' : 'Contacting Google Gemini AI...');

  try {
    let generatedPackage;

    if (isDemoMode) {
      
      await new Promise(resolve => setTimeout(resolve, 800));
      updateLoadingStep('Formatting 5-question quiz & flashcards...', 'Generating high-yield academic material.');
      await new Promise(resolve => setTimeout(resolve, 600));
      generatedPackage = getDemoStudyPackage(notes, style, difficulty);
      showToast('Loaded instant Demo Study Material!', 'success');
    } else {
      
      updateLoadingStep(`Calling Gemini API (${appState.preferredModel})...`, 'Sending prompt with custom explanation style & quiz difficulty.');
      const prompt = buildGeminiPrompt(notes, style, difficulty);
      const rawText = await callGeminiAPI(appState.apiKey, prompt, appState.preferredModel);
      
      updateLoadingStep('Validating JSON response structure...', 'Checking 5 quiz questions, options, answers, and flashcards.');
      generatedPackage = parseAndValidateResponse(rawText);

      generatedPackage.topic = extractTopicTitle(notes);
      generatedPackage.style = style;
      generatedPackage.difficulty = difficulty;
      generatedPackage.timestamp = new Date().toISOString();

      showToast('Study Material generated successfully by Gemini!', 'success');
    }

    renderCompleteStudyPackage(generatedPackage);

    saveToHistory(generatedPackage);

  } catch (err) {
    console.error('Generation Error:', err);
    showAlert('Generation Failed', err.message || 'An unexpected error occurred while communicating with Gemini AI.', 'danger');
  } finally {
    setGeneratingUI(false);
  }
}

function buildGeminiPrompt(notes, style, difficulty) {
  return `You are an expert academic tutor and university study assistant.
Analyze the following student notes and generate comprehensive study material.

STUDY PARAMETERS:
- Explanation Style: "${style}" (Adopt this tone/depth for the summary)
- Quiz Difficulty: "${difficulty}" (Align the question complexity with this level)

CRITICAL INSTRUCTIONS - RETURN ONLY RAW JSON:
Do not include any greeting, markdown intro, conversational text, or commentary.
Your entire response must be a single parseable JSON object matching this EXACT schema:
{
  "summary": "A well-structured, clear summary explaining the core concepts according to the requested style.",
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "answer": 0,
      "explanation": "Clear explanation of why option at index 0 is correct and why other options are incorrect."
    }
  ],
  "flashcards": [
    {
      "front": "Concept, term, or question",
      "back": "Clear, concise definition or answer"
    }
  ]
}

STRICT CONSTRAINTS:
1. "questions" MUST contain EXACTLY 5 multiple-choice questions.
2. Each question MUST have EXACTLY 4 strings in its "options" array.
3. Each question's "answer" MUST be an integer between 0 and 3 (the 0-based index of the correct option).
4. "flashcards" MUST contain AT LEAST 5 high-yield flashcard objects, each having "front" and "back".
5. Return ONLY valid JSON.

STUDENT NOTES:
${notes}`;
}

async function callGeminiAPI(apiKey, prompt, preferredModel = 'gemini-2.5-flash') {
  
  const modelsToTry = [
    preferredModel,
    ...SUPPORTED_MODELS.filter(m => m !== preferredModel)
  ];

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${encodeURIComponent(apiKey)}`;

    updateLoadingStep(`Calling Gemini API (${currentModel})...`, 'Sending prompt with custom explanation style & quiz difficulty.');

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7
      }
    };

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
    } catch (networkError) {
      if (!navigator.onLine) {
        throw new Error('You appear to be offline. Please verify your internet connection.');
      }
      throw new Error('Network error: Failed to connect to Google Gemini API servers. Please check your network connection.');
    }

    if (!response.ok) {
      let errorDetails = '';
      try {
        const errJson = await response.json();
        errorDetails = errJson.error?.message || '';
      } catch (_) {
        
      }

      if (response.status === 404 && i < modelsToTry.length - 1) {
        console.warn(`Model "${currentModel}" returned 404 (${errorDetails}). Automatically trying fallback: "${modelsToTry[i + 1]}"`);
        continue;
      }

      switch (response.status) {
        case 400:
          if (errorDetails.toLowerCase().includes('api key not valid') || apiKey.startsWith('gen-lang-client')) {
            throw new Error(`Invalid API Key (${errorDetails}): "${apiKey.substring(0, 16)}..." is your Google Cloud Project Name, NOT your API Key! Google Gemini API keys start with "AIzaSy...". Please copy the key from the "Key" column in Google AI Studio.`);
          }
          throw new Error(`HTTP 400 Bad Request: Gemini rejected the request format. ${errorDetails}`);
        case 401:
        case 403:
          throw new Error('HTTP 401/403 Authentication Failed: Your Google Gemini API key is invalid, expired, or does not have permissions. Please check your key in API Settings.');
        case 404:
          throw new Error(`HTTP 404 Model Not Found: Neither "${currentModel}" nor alternative fallback models (${modelsToTry.join(', ')}) were found for this API key. ${errorDetails}`);
        case 429:
          throw new Error('HTTP 429 Rate Limit Exceeded: You have reached Google Gemini free tier rate limits or quota. Please wait a minute before trying again.');
        case 500:
        case 503:
        case 504:
          throw new Error('HTTP 5xx Server Error: Google Gemini AI service is temporarily experiencing high traffic. Please retry in a few moments.');
        default:
          throw new Error(`Gemini API Error (HTTP ${response.status}): ${errorDetails || response.statusText}`);
      }
    }

    const responseData = await response.json();

    const candidate = responseData?.candidates?.[0];
    if (!candidate) {
      throw new Error('Gemini API returned an empty response with no candidates. The prompt may have triggered safety filters.');
    }

    const rawText = candidate.content?.parts?.[0]?.text;
    if (!rawText || typeof rawText !== 'string') {
      throw new Error('Gemini response did not contain text content in the expected format.');
    }

    if (currentModel !== appState.preferredModel) {
      console.log(`Switched active model to "${currentModel}" following successful fallback.`);
      appState.preferredModel = currentModel;
      try {
        localStorage.setItem(STORAGE_KEYS.MODEL, currentModel);
        const modelSelect = document.getElementById('modelSelect');
        if (modelSelect) modelSelect.value = currentModel;
      } catch (_) {}
    }

    return rawText;
  }
}

function parseAndValidateResponse(rawText) {
  
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
  }
  cleaned = cleaned.trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (parseError) {
    console.error('Raw unparseable text from model:', rawText);
    throw new Error('AI returned an invalid JSON response. Please try generating again or use a different explanation style.');
  }

  if (!parsed.summary || typeof parsed.summary !== 'string' || parsed.summary.trim().length === 0) {
    throw new Error('Generated response is missing a valid "summary" text field.');
  }

  if (!Array.isArray(parsed.questions)) {
    throw new Error('Generated response is missing the "questions" array.');
  }

  if (parsed.questions.length < 5) {
    throw new Error(`Generated quiz has only ${parsed.questions.length} questions, but 5 are required.`);
  }

  const validatedQuestions = [];
  for (let i = 0; i < 5; i++) {
    const q = parsed.questions[i];
    if (!q || typeof q.question !== 'string' || !q.question.trim()) {
      throw new Error(`Question #${i + 1} is missing valid question text.`);
    }

    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error(`Question #${i + 1} must contain exactly 4 options.`);
    }

    const cleanOptions = q.options.map((opt, optIdx) => {
      const str = String(opt || '').trim();
      return str || `Option ${String.fromCharCode(65 + optIdx)}`;
    });

    let answerIdx = parseInt(q.answer, 10);
    if (isNaN(answerIdx) || answerIdx < 0 || answerIdx > 3) {
      console.warn(`Question #${i + 1} had invalid answer index (${q.answer}). Defaulting to 0.`);
      answerIdx = 0;
    }

    const explanation = typeof q.explanation === 'string' && q.explanation.trim() 
      ? q.explanation.trim() 
      : 'This is the correct answer according to the provided study material.';

    validatedQuestions.push({
      question: q.question.trim(),
      options: cleanOptions,
      answer: answerIdx,
      explanation: explanation
    });
  }

  if (!Array.isArray(parsed.flashcards) || parsed.flashcards.length === 0) {
    throw new Error('Generated response is missing the "flashcards" array.');
  }

  const validatedFlashcards = [];
  parsed.flashcards.forEach((card, idx) => {
    if (card && (card.front || card.back)) {
      validatedFlashcards.push({
        front: String(card.front || `Concept #${idx + 1}`).trim(),
        back: String(card.back || 'Detailed definition not provided.').trim()
      });
    }
  });

  if (validatedFlashcards.length < 5) {
    
    for (let i = validatedFlashcards.length; i < 5; i++) {
      validatedFlashcards.push({
        front: `Key Concept #${i + 1}`,
        back: `Review key point from summary section regarding this topic.`
      });
    }
  }

  return {
    summary: parsed.summary.trim(),
    questions: validatedQuestions,
    flashcards: validatedFlashcards
  };
}

function extractTopicTitle(notes) {
  const firstLine = notes.trim().split('\n')[0].replace(/^#+\s*/, '').replace(/Topic:\s*/i, '').trim();
  if (firstLine.length > 0 && firstLine.length <= 60) {
    return firstLine;
  }
  return notes.trim().substring(0, 45) + '...';
}

function setGeneratingUI(isLoading, title = 'Generating Study Material...') {
  appState.isGenerating = isLoading;
  const generateBtn = document.getElementById('generateBtn');
  const demoBtn = document.getElementById('demoBtn');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const generateBtnText = document.getElementById('generateBtnText');
  const loadingTitle = document.getElementById('loadingStepTitle');

  if (isLoading) {
    generateBtn.disabled = true;
    demoBtn.disabled = true;
    generateBtnText.textContent = 'Generating...';
    loadingTitle.textContent = title;
    loadingIndicator.classList.remove('hidden');
  } else {
    generateBtn.disabled = false;
    demoBtn.disabled = false;
    generateBtnText.textContent = 'Generate Study Material';
    loadingIndicator.classList.add('hidden');
  }
}

function updateLoadingStep(title, desc) {
  const t = document.getElementById('loadingStepTitle');
  const d = document.getElementById('loadingStepDesc');
  if (t) t.textContent = title;
  if (d) d.textContent = desc;
}

function renderSummary(summaryText) {
  const container = document.getElementById('summaryContent');
  container.innerHTML = '';

  const paragraphs = summaryText.split(/\n\s*\n/);
  paragraphs.forEach(pText => {
    const trimmed = pText.trim();
    if (trimmed) {
      const p = document.createElement('p');
      p.textContent = trimmed;
      container.appendChild(p);
    }
  });

  stopSpeechSynthesis();
}

async function copySummaryToClipboard() {
  if (!appState.currentData || !appState.currentData.summary) {
    showToast('No summary available to copy', 'error');
    return;
  }

  const textToCopy = appState.currentData.summary;
  const copyBtn = document.getElementById('copySummaryBtn');
  const copyText = document.getElementById('copyText');
  const copyIcon = document.getElementById('copyIcon');

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(textToCopy);
    } else {
      
      const hiddenTextarea = document.createElement('textarea');
      hiddenTextarea.value = textToCopy;
      hiddenTextarea.style.position = 'fixed';
      hiddenTextarea.style.left = '-9999px';
      document.body.appendChild(hiddenTextarea);
      hiddenTextarea.select();
      document.execCommand('copy');
      document.body.removeChild(hiddenTextarea);
    }

    copyText.textContent = 'Copied!';
    copyIcon.textContent = '✅';
    showToast('Summary copied to clipboard!', 'success');

    setTimeout(() => {
      copyText.textContent = 'Copy';
      copyIcon.textContent = '📋';
    }, 2000);
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    showToast('Could not copy to clipboard. Please copy manually.', 'error');
  }
}

function downloadSummaryAsText() {
  if (!appState.currentData || !appState.currentData.summary) {
    showToast('No summary to download', 'error');
    return;
  }

  try {
    const topic = appState.currentData.topic || 'StudyMate_Summary';
    const cleanTopic = topic.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    const filename = `${cleanTopic}_Summary.txt`;

    const fileContent = `========================================================
StudyMate AI - Study Summary
Topic: ${appState.currentData.topic || 'Class Notes'}
Explanation Style: ${appState.currentData.style || 'Exam-Focused'}
Generated On: ${new Date().toLocaleString()}
========================================================

${appState.currentData.summary}

========================================================
Generated by StudyMate AI - College Project Demonstration
========================================================`;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);

    showToast(`Downloaded: ${filename}`, 'success');
  } catch (err) {
    console.error('File download failed:', err);
    showToast('Failed to download text file.', 'error');
  }
}

function toggleSpeechSynthesis() {
  if (!('speechSynthesis' in window)) {
    showToast('Speech synthesis is not supported in this browser.', 'error');
    return;
  }

  if (appState.isSpeaking) {
    stopSpeechSynthesis();
  } else {
    startSpeechSynthesis();
  }
}

function startSpeechSynthesis() {
  if (!appState.currentData || !appState.currentData.summary) {
    showToast('No summary available to read aloud.', 'warning');
    return;
  }

  window.speechSynthesis.cancel(); 

  const utterance = new SpeechSynthesisUtterance(appState.currentData.summary);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.lang = 'en-US';

  utterance.onstart = () => {
    appState.isSpeaking = true;
    updateSpeechUI(true);
  };

  utterance.onend = () => {
    appState.isSpeaking = false;
    updateSpeechUI(false);
  };

  utterance.onerror = (e) => {
    console.warn('Speech synthesis error:', e);
    appState.isSpeaking = false;
    updateSpeechUI(false);
  };

  appState.speechUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

function stopSpeechSynthesis() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  appState.isSpeaking = false;
  updateSpeechUI(false);
}

function updateSpeechUI(isSpeaking) {
  const speakText = document.getElementById('speakText');
  const speakIcon = document.getElementById('speakIcon');
  if (isSpeaking) {
    speakText.textContent = 'Stop Reading';
    speakIcon.textContent = '⏹️';
  } else {
    speakText.textContent = 'Read Aloud';
    speakIcon.textContent = '🔊';
  }
}

function renderQuiz(questions) {
  const form = document.getElementById('quizForm');
  form.innerHTML = '';

  appState.userQuizAnswers = [null, null, null, null, null];
  appState.isQuizSubmitted = false;

  document.getElementById('quizScoreBanner').classList.add('hidden');
  document.getElementById('tryAgainQuizBtn').classList.add('hidden');
  document.getElementById('submitQuizBtn').classList.remove('hidden');
  document.getElementById('submitQuizBtn').disabled = false;
  document.getElementById('resetQuizBtn').disabled = false;

  const difficultyBadge = document.getElementById('quizDifficultyBadge');
  if (appState.currentData?.difficulty) {
    difficultyBadge.textContent = `Difficulty: ${appState.currentData.difficulty}`;
  }

  questions.forEach((q, qIndex) => {
    const questionCard = document.createElement('div');
    questionCard.className = 'quiz-question-card';
    questionCard.id = `questionCard_${qIndex}`;

    const header = document.createElement('div');
    header.className = 'question-header';
    header.innerHTML = `
      <span class="question-number-badge">${qIndex + 1}</span>
      <h4 class="question-text">${escapeHTML(q.question)}</h4>
    `;
    questionCard.appendChild(header);

    const optionsList = document.createElement('div');
    optionsList.className = 'options-list';

    q.options.forEach((optText, optIndex) => {
      const optionLabel = document.createElement('label');
      optionLabel.className = 'option-label';
      optionLabel.id = `optLabel_${qIndex}_${optIndex}`;

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `quiz_question_${qIndex}`;
      radio.value = optIndex;
      radio.addEventListener('change', () => {
        if (!appState.isQuizSubmitted) {
          appState.userQuizAnswers[qIndex] = optIndex;
        }
      });

      const spanText = document.createElement('span');
      spanText.className = 'option-text';
      spanText.textContent = optText;

      optionLabel.appendChild(radio);
      optionLabel.appendChild(spanText);
      optionsList.appendChild(optionLabel);
    });

    questionCard.appendChild(optionsList);

    const explanationBox = document.createElement('div');
    explanationBox.className = 'question-explanation hidden';
    explanationBox.id = `explanation_${qIndex}`;
    explanationBox.innerHTML = `<strong>💡 Explanation:</strong> ${escapeHTML(q.explanation)}`;
    questionCard.appendChild(explanationBox);

    form.appendChild(questionCard);
  });
}

function submitQuiz() {
  if (appState.isQuizSubmitted) return;
  if (!appState.currentData || !appState.currentData.questions) return;

  const questions = appState.currentData.questions;

  const unansweredIndices = [];
  appState.userQuizAnswers.forEach((ans, idx) => {
    if (ans === null) unansweredIndices.push(idx + 1);
  });

  if (unansweredIndices.length > 0) {
    showAlert(
      'Incomplete Quiz',
      `Please answer all questions before submitting. Unanswered questions: #${unansweredIndices.join(', #')}`,
      'warning'
    );
    return;
  }

  dismissAlert();
  appState.isQuizSubmitted = true;

  let score = 0;
  questions.forEach((q, qIndex) => {
    const selected = appState.userQuizAnswers[qIndex];
    const correct = q.answer;

    const selectedLabel = document.getElementById(`optLabel_${qIndex}_${selected}`);
    const correctLabel = document.getElementById(`optLabel_${qIndex}_${correct}`);
    const explanationBox = document.getElementById(`explanation_${qIndex}`);

    if (explanationBox) explanationBox.classList.remove('hidden');

    if (correctLabel) {
      correctLabel.classList.add('is-correct');
    }

    if (selected === correct) {
      score++;
    } else {
      if (selectedLabel) {
        selectedLabel.classList.add('is-wrong');
      }
    }
  });

  const radios = document.querySelectorAll('#quizForm input[type="radio"]');
  radios.forEach(r => r.disabled = true);

  document.getElementById('submitQuizBtn').classList.add('hidden');
  document.getElementById('tryAgainQuizBtn').classList.remove('hidden');
  document.getElementById('resetQuizBtn').disabled = true;

  const percentage = Math.round((score / 5) * 100);
  const scoreBanner = document.getElementById('quizScoreBanner');
  const scoreSummary = document.getElementById('scoreSummary');
  const scoreTitle = document.getElementById('scoreTitle');
  const scoreEmoji = document.getElementById('scoreEmoji');
  const scoreFeedback = document.getElementById('scoreFeedback');

  scoreSummary.innerHTML = `You scored <strong>${score} / 5 (${percentage}%)</strong>`;

  if (score === 5) {
    scoreEmoji.textContent = '🏆';
    scoreTitle.textContent = 'Outstanding Mastery!';
    scoreFeedback.textContent = 'Perfect score! You have completely mastered this study topic.';
  } else if (score >= 3) {
    scoreEmoji.textContent = '🎉';
    scoreTitle.textContent = 'Great Job!';
    scoreFeedback.textContent = 'Solid understanding. Check the explanations below to clear up any missed concepts.';
  } else {
    scoreEmoji.textContent = '📚';
    scoreTitle.textContent = 'Keep Practicing!';
    scoreFeedback.textContent = 'Good effort! Review the detailed explanations and flip through the flashcards.';
  }

  scoreBanner.classList.remove('hidden');
  scoreBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  recordQuizAttempt(score, 5);
}

function resetQuiz() {
  if (!appState.currentData || !appState.currentData.questions) return;
  renderQuiz(appState.currentData.questions);
  showToast('Quiz reset. Good luck on your next attempt!', 'info');
}

function resetQuizSelections() {
  if (appState.isQuizSubmitted) return;
  appState.userQuizAnswers = [null, null, null, null, null];
  const radios = document.querySelectorAll('#quizForm input[type="radio"]');
  radios.forEach(r => r.checked = false);
  showToast('Selections cleared.', 'info');
}

function recordQuizAttempt(score, total) {
  try {
    let stats = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUIZ_STATS)) || { attempts: 0, totalScore: 0, totalPossible: 0 };
    stats.attempts += 1;
    stats.totalScore += score;
    stats.totalPossible += total;
    localStorage.setItem(STORAGE_KEYS.QUIZ_STATS, JSON.stringify(stats));
    updateQuizStatisticsUI();
  } catch (err) {
    console.warn('Could not record quiz stats:', err);
  }
}

function updateQuizStatisticsUI() {
  const summarySpan = document.getElementById('quizAttemptsSummary');
  if (!summarySpan) return;

  try {
    const stats = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUIZ_STATS)) || { attempts: 0, totalScore: 0, totalPossible: 0 };
    if (stats.attempts === 0) {
      summarySpan.textContent = 'No quiz attempts recorded yet. Take the quiz to track progress!';
    } else {
      const avgPercent = Math.round((stats.totalScore / stats.totalPossible) * 100);
      summarySpan.textContent = `Total Quiz Attempts: ${stats.attempts} | Cumulative Average: ${avgPercent}%`;
    }
  } catch (_) {
    summarySpan.textContent = '';
  }
}

function renderFlashcards(flashcards) {
  if (!Array.isArray(flashcards) || flashcards.length === 0) return;

  appState.currentCardIndex = 0;
  appState.isCardFlipped = false;
  appState.masteredCards.clear();

  document.getElementById('totalCardsCount').textContent = flashcards.length;
  updateActiveCardView();
  updateFlashcardMasteryUI();
}

function updateActiveCardView() {
  const flashcards = appState.currentData?.flashcards;
  if (!flashcards || flashcards.length === 0) return;

  const cardElement = document.getElementById('activeFlashcard');
  const frontText = document.getElementById('flashcardFrontText');
  const backText = document.getElementById('flashcardBackText');
  const indexSpan = document.getElementById('currentCardIndex');
  const prevBtn = document.getElementById('prevCardBtn');
  const nextBtn = document.getElementById('nextCardBtn');

  appState.isCardFlipped = false;
  cardElement.classList.remove('flipped');
  cardElement.setAttribute('aria-expanded', 'false');

  const card = flashcards[appState.currentCardIndex];
  frontText.textContent = card.front;
  backText.textContent = card.back;

  indexSpan.textContent = appState.currentCardIndex + 1;

  prevBtn.disabled = appState.currentCardIndex === 0;
  nextBtn.disabled = appState.currentCardIndex === flashcards.length - 1;
}

function toggleCardFlip() {
  const cardElement = document.getElementById('activeFlashcard');
  appState.isCardFlipped = !appState.isCardFlipped;
  
  if (appState.isCardFlipped) {
    cardElement.classList.add('flipped');
    cardElement.setAttribute('aria-expanded', 'true');
  } else {
    cardElement.classList.remove('flipped');
    cardElement.setAttribute('aria-expanded', 'false');
  }
}

function showPreviousCard() {
  if (appState.currentCardIndex > 0) {
    appState.currentCardIndex--;
    updateActiveCardView();
  }
}

function showNextCard() {
  const total = appState.currentData?.flashcards?.length || 0;
  if (appState.currentCardIndex < total - 1) {
    appState.currentCardIndex++;
    updateActiveCardView();
  }
}

function markCurrentCardKnown() {
  appState.masteredCards.add(appState.currentCardIndex);
  updateFlashcardMasteryUI();
  showToast('Card marked as known! ⭐', 'success');

  const total = appState.currentData?.flashcards?.length || 0;
  if (appState.currentCardIndex < total - 1) {
    setTimeout(showNextCard, 250);
  }
}

function markCurrentCardReview() {
  appState.masteredCards.delete(appState.currentCardIndex);
  updateFlashcardMasteryUI();
  showToast('Card scheduled for review 🔄', 'info');

  const total = appState.currentData?.flashcards?.length || 0;
  if (appState.currentCardIndex < total - 1) {
    setTimeout(showNextCard, 250);
  }
}

function updateFlashcardMasteryUI() {
  const total = appState.currentData?.flashcards?.length || 0;
  const known = appState.masteredCards.size;
  const percentage = total > 0 ? Math.round((known / total) * 100) : 0;

  document.getElementById('masteryCountText').textContent = `Mastered: ${known} / ${total}`;
  document.getElementById('flashcardProgressBar').style.width = `${percentage}%`;
}

function handleFlashcardKeydown(e) {
  if (e.code === 'Space' || e.key === 'Enter') {
    e.preventDefault();
    toggleCardFlip();
  }
}

function handleGlobalKeyboardShortcuts(e) {
  
  const activeTag = document.activeElement?.tagName?.toLowerCase();
  if (activeTag === 'textarea' || activeTag === 'input') return;

  const outputContainer = document.getElementById('outputContainer');
  if (outputContainer.classList.contains('hidden')) return;

  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    showPreviousCard();
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    showNextCard();
  }
}

function initHistory() {
  renderHistory();
}

function saveToHistory(pkg) {
  try {
    const history = getSavedHistory();

    const newEntry = {
      id: 'session_' + Date.now(),
      topic: pkg.topic || 'Untitled Study Session',
      summary: pkg.summary,
      questions: pkg.questions,
      flashcards: pkg.flashcards,
      style: pkg.style,
      difficulty: pkg.difficulty,
      timestamp: pkg.timestamp || new Date().toISOString()
    };

    history.unshift(newEntry);
    if (history.length > 20) {
      history.pop();
    }

    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    renderHistory();
  } catch (err) {
    console.warn('LocalStorage error while saving study history:', err);
  }
}

function getSavedHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Could not read history:', err);
    return [];
  }
}

function renderHistory(filterTerm = '') {
  const container = document.getElementById('historyListContainer');
  container.innerHTML = '';

  const history = getSavedHistory();
  const term = filterTerm.trim().toLowerCase();

  const filtered = term 
    ? history.filter(item => item.topic.toLowerCase().includes(term) || item.summary.toLowerCase().includes(term))
    : history;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>${term ? 'No study sessions matched your search.' : 'No saved study sessions yet. Generate study materials above to automatically save them here!'}</p>
      </div>
    `;
    return;
  }

  filtered.forEach(item => {
    const itemCard = document.createElement('div');
    itemCard.className = 'history-item';
    itemCard.setAttribute('role', 'listitem');

    const dateFormatted = new Date(item.timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    itemCard.innerHTML = `
      <div class="history-item-details">
        <h4 class="history-item-title">${escapeHTML(item.topic)}</h4>
        <div class="history-item-meta">
          <span>📅 ${dateFormatted}</span>
          <span>• 🎯 ${escapeHTML(item.difficulty || 'Medium')}</span>
          <span>• 🗂️ ${item.flashcards?.length || 5} cards</span>
        </div>
      </div>
      <div class="history-item-actions">
        <button class="btn btn-outline-primary btn-sm restore-btn" title="Restore this study session">
          Restore
        </button>
        <button class="btn btn-ghost-danger btn-sm delete-btn" title="Delete this session">
          🗑️
        </button>
      </div>
    `;

    itemCard.querySelector('.restore-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      restoreHistorySession(item);
    });

    itemCard.addEventListener('click', () => {
      restoreHistorySession(item);
    });

    itemCard.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteHistoryItem(item.id);
    });

    container.appendChild(itemCard);
  });
}

function restoreHistorySession(item) {
  dismissAlert();
  stopSpeechSynthesis();
  renderCompleteStudyPackage(item);
  showToast(`Restored study session: "${item.topic}"`, 'info');
  document.getElementById('outputContainer').scrollIntoView({ behavior: 'smooth' });
}

function deleteHistoryItem(id) {
  try {
    let history = getSavedHistory();
    history = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    renderHistory(document.getElementById('historySearchInput').value);
    showToast('Session removed from history.', 'info');
  } catch (err) {
    console.error('Failed to delete history item:', err);
  }
}

function handleClearAllHistory() {
  const history = getSavedHistory();
  if (history.length === 0) {
    showToast('History is already empty.', 'info');
    return;
  }

  const confirmClear = window.confirm('Are you sure you want to permanently clear all saved study sessions?');
  if (confirmClear) {
    try {
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
      renderHistory();
      showToast('All study history cleared.', 'info');
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  }
}

function handleHistorySearch(e) {
  renderHistory(e.target.value);
}

function renderCompleteStudyPackage(pkg) {
  appState.currentData = pkg;

  renderSummary(pkg.summary);

  renderQuiz(pkg.questions);

  renderFlashcards(pkg.flashcards);

  const outputContainer = document.getElementById('outputContainer');
  outputContainer.classList.remove('hidden');

  outputContainer.scrollIntoView({ behavior: 'smooth' });
}

function getDemoStudyPackage(notes, style, difficulty) {
  const topic = extractTopicTitle(notes);

  return {
    topic: topic,
    style: style,
    difficulty: difficulty,
    timestamp: new Date().toISOString(),
    summary: `Study Summary: ${topic} (${style} Mode)

Key Concepts & Architecture:
This topic examines fundamental computing and systems concepts critical for engineering students. In modern computer architecture, processes and threads form the primary units of execution, each managing their own state, memory registers, and runtime stacks. Ensuring that concurrent entities coordinate access to shared memory without race conditions is essential for computational correctness.

Core Principles & Solutions:
1. Mutual Exclusion: Guarantees that when one process executes inside a critical region, all other processes are strictly prevented from entering.
2. Progress & Bounded Waiting: Guarantees freedom from deadlock and starvation, ensuring requests to access resources are resolved within finite, bounded time.
3. Synchronization Primitives: Semaphores (both counting and binary mutexes) and monitors provide atomic test-and-set operations that allow operating system kernels to schedule threads safely.
4. Deadlock Prevention vs Avoidance: Deadlock conditions (Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait) are mitigated either by static protocol enforcement or dynamic state verification such as Dijkstra's Banker's Algorithm.

Exam Tip:
Always differentiate between binary semaphores (which act as mutual exclusion locks with values 0 and 1) and counting semaphores (which manage access to finite resource pools).`,

    questions: [
      {
        question: "Which of the following is NOT one of the four Coffman conditions required for a deadlock to occur?",
        options: [
          "Mutual Exclusion",
          "Hold and Wait",
          "Preemptive Scheduling",
          "Circular Wait"
        ],
        answer: 2,
        explanation: "No Preemption is the required condition for deadlock. 'Preemptive Scheduling' actually breaks deadlocks because resources can be forcibly reclaimed."
      },
      {
        question: "What are the two standard atomic operations associated with an Edsger Dijkstra semaphore?",
        options: [
          "start() and stop()",
          "wait() and signal() (or P and V)",
          "push() and pop()",
          "lock() and unlock_all()"
        ],
        answer: 1,
        explanation: "Semaphores are controlled exclusively through wait() (which decrements) and signal() (which increments), historically termed P and V from Dutch."
      },
      {
        question: "Which criteria guarantees that a process will eventually be permitted into its critical section after making a request?",
        options: [
          "Bounded Waiting",
          "Mutual Exclusion",
          "Busy Waiting",
          "Resource Ordering"
        ],
        answer: 0,
        explanation: "Bounded Waiting guarantees that a limit exists on the number of times other processes are allowed to enter their critical sections after a process has requested entry."
      },
      {
        question: "Dijkstra's Banker's Algorithm is primarily utilized by operating systems for which purpose?",
        options: [
          "Deadlock Detection",
          "Deadlock Avoidance",
          "Deadlock Recovery",
          "Deadlock Ignorance"
        ],
        answer: 1,
        explanation: "The Banker's Algorithm is an avoidance algorithm that tests for safety by simulating the allocation of predetermined maximum possible amounts of all resources."
      },
      {
        question: "What fundamental condition distinguishes a binary semaphore from a counting semaphore?",
        options: [
          "Binary semaphores allow negative values",
          "Binary semaphores are restricted to integer values 0 and 1",
          "Counting semaphores cannot be accessed atomically",
          "Binary semaphores do not support the signal() operation"
        ],
        answer: 1,
        explanation: "A binary semaphore's value is constrained strictly to 0 and 1, functioning equivalently to a mutual exclusion (mutex) lock."
      }
    ],

    flashcards: [
      {
        front: "What is a Critical Section in concurrent programming?",
        back: "A segment of code that accesses shared resources (memory, files, or devices) that must not be concurrently accessed by more than one process."
      },
      {
        front: "Define Mutual Exclusion.",
        back: "The principle that if process P is executing in its critical section, no other process may execute in their critical section simultaneously."
      },
      {
        front: "What is the key difference between wait() and signal() on a semaphore?",
        back: "wait() decrements the semaphore value and blocks if <= 0; signal() increments the value and unblocks any waiting processes."
      },
      {
        front: "Name the Four Coffman Conditions for Deadlock.",
        back: "1. Mutual Exclusion, 2. Hold and Wait, 3. No Preemption, and 4. Circular Wait."
      },
      {
        front: "How does Deadlock Prevention differ from Deadlock Avoidance?",
        back: "Prevention eliminates at least one Coffman condition statically; Avoidance dynamically monitors system state (e.g. Banker's Algorithm) to ensure safe states."
      }
    ]
  };
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
