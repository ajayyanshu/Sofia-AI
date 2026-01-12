// --- Element Selectors ---
const sidebarOverlay = document.getElementById('sidebar-overlay');
const headerNewChatBtn = document.getElementById('header-new-chat-btn'); 
const newChatBtn = document.getElementById('new-chat-btn');
const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menu-btn');
const chatContainer = document.getElementById('chat-container');
const welcomeMessageContainer = document.getElementById('welcome-message-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const addBtn = document.getElementById('add-btn');
const addMenu = document.getElementById('add-menu');
const uploadFileBtn = document.getElementById('upload-file-btn');
const uploadCodeBtn = document.getElementById('upload-code-btn');
const fileInput = document.getElementById('file-input');
const filePreviewContainer = document.getElementById('file-preview-container');
const webSearchToggleBtn = document.getElementById('web-search-toggle-btn');
const micBtn = document.getElementById('mic-btn');
const voiceModeBtn = document.getElementById('voice-mode-btn');
const modeIndicatorContainer = document.getElementById('mode-indicator-container');
const voiceOverlay = document.getElementById('voice-overlay');
const voiceStatusText = document.getElementById('voice-status-text');
const voiceInterimTranscript = document.getElementById('voice-interim-transcript');
const voiceVisualizer = document.getElementById('voice-visualizer');
const endVoiceBtn = document.getElementById('end-voice-btn');
const userMenuBtn = document.getElementById('user-menu-btn');
const userMenu = document.getElementById('user-menu');
const settingsMenuItem = document.getElementById('settings-menu-item');
const chatHistoryContainer = document.getElementById('chat-history-container');
const searchHistoryInput = document.getElementById('search-history-input');
const tempChatBanner = document.getElementById('temp-chat-banner');
const saveToDbBtn = document.getElementById('save-to-db-btn');

// Ethical Hacking Mode Elements
const cyberTrainingBtn = document.getElementById('cyber-training-btn');
const cyberModal = document.getElementById('cyber-modal');
const closeCyberModalBtn = document.getElementById('close-cyber-modal');
const toggleHackingModeBtn = document.getElementById('toggle-hacking-mode-btn');
const hackingModeStatusText = document.getElementById('hacking-mode-status-text');
const cyberGameControls = document.getElementById('cyber-game-controls');

// Contact Us Elements
const contactMenuItem = document.getElementById('contact-menu-item');
const contactModal = document.getElementById('contact-modal');
const closeContactModalBtn = document.getElementById('close-contact-modal');

// Settings Modal
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const closeSettingsBtnDesktop = document.getElementById('close-settings-btn-desktop');
const generalTabBtn = document.getElementById('general-tab-btn');
const profileTabBtn = document.getElementById('profile-tab-btn');
const usageTabBtn = document.getElementById('usage-tab-btn');
const generalSettingsContent = document.getElementById('general-settings-content');
const profileSettingsContent = document.getElementById('profile-settings-content');
const usageSettingsContent = document.getElementById('usage-settings-content');
const settingsContentTitle = document.getElementById('settings-content-title');
const languageSelect = document.getElementById('language-select');
const themeBtns = document.querySelectorAll('.theme-btn');
const logoutBtn = document.getElementById('logout-btn');
const deleteAccountBtn = document.getElementById('delete-account-btn');
const logoutMenuItem = document.getElementById('logout-menu-item');

// Library Modal
const libraryBtn = document.getElementById('library-btn');
const libraryModal = document.getElementById('library-modal');
const closeLibraryBtn = document.getElementById('close-library-btn');
const libraryGrid = document.getElementById('library-grid');
const libraryEmptyMsg = document.getElementById('library-empty-msg');

// Plan & Usage Elements
const upgradePlanSidebarBtn = document.getElementById('upgrade-plan-sidebar-btn');
const menuUsername = document.getElementById('menu-username');
const sidebarUserPlan = document.getElementById('sidebar-user-plan');
const sidebarUsageDisplay = document.getElementById('sidebar-usage-display');
const planTitle = document.getElementById('plan-title');
const usageCounter = document.getElementById('usage-counter');
const usageProgressBar = document.getElementById('usage-progress-bar');
const upgradeSection = document.getElementById('upgrade-section');
const premiumSection = document.getElementById('premium-section');
const razorpayBtn = document.getElementById('razorpay-btn');
const usagePlanSection = document.getElementById('usage-plan-section');


// --- Global State ---
const markdownConverter = new showdown.Converter();
let fileData = null;
let fileType = null;
let fileInfoForDisplay = null;
let currentMode = null; 
let recognition;
let isVoiceConversationActive = false;
let isTemporaryChatActive = false;
let chatHistory = [];
let currentChat = [];
let currentChatId = null;

// Hacking Mode State
let isEthicalHackingMode = false;

// Plan & Usage State
let usageCounts = { messages: 0, webSearches: 0 };
const usageLimits = { messages: 500, webSearches: 1 };
let isPremium = false;
let isAdmin = false;

// --- Sidebar & Temp Chat Logic ---
function openSidebar() {
    sidebar.classList.remove('-translate-x-full');
    sidebarOverlay.classList.remove('hidden');
}

function closeSidebar() {
    sidebar.classList.add('-translate-x-full');
    sidebarOverlay.classList.add('hidden');
}

menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.contains('-translate-x-full') ? openSidebar() : closeSidebar();
});
sidebarOverlay.addEventListener('click', closeSidebar);

headerNewChatBtn.addEventListener('click', () => {
    isTemporaryChatActive = false;
    startNewChat();
});

newChatBtn.addEventListener('click', () => {
    isTemporaryChatActive = false;
    startNewChat();
    closeSidebar();
});

// --- Event Listeners ---
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

uploadFileBtn.addEventListener('click', () => {
    fileInput.accept = "image/*,.pdf,.doc,.docx";
    fileInput.click();
});

uploadCodeBtn.addEventListener('click', () => {
    fileInput.accept = ".txt,.py,.js,.java,.c,.cpp,.h,.html,.css,.json,.md,.sh,.rb,.go,.php,.swift,.kt";
    fileInput.click();
});

fileInput.addEventListener('change', handleFileSelect);

addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    addMenu.classList.toggle('hidden');
});

userMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userMenu.classList.toggle('hidden');
});

window.addEventListener('click', (e) => {
     if (!addMenu.classList.contains('hidden') && !addBtn.contains(e.target)) addMenu.classList.add('hidden');
     if (userMenu && !userMenu.classList.contains('hidden') && !userMenuBtn.contains(e.target) && !userMenu.contains(e.target)) userMenu.classList.add('hidden');
});

messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = `${messageInput.scrollHeight}px`;
    const hasText = messageInput.value.trim() !== '';
    const shouldShowSend = hasText || fileData;
    sendBtn.classList.toggle('hidden', !shouldShowSend);
    micBtn.classList.toggle('hidden', hasText);
    voiceModeBtn.classList.toggle('hidden', hasText);
});

saveToDbBtn.addEventListener('click', saveTemporaryChatToDB);

// --- Settings Modal Logic ---
function openSettingsModal() { settingsModal.classList.remove('hidden'); settingsModal.classList.add('flex'); }
function closeSettingsModal() { settingsModal.classList.add('hidden'); settingsModal.classList.remove('flex'); }
settingsMenuItem.addEventListener('click', (e) => { e.preventDefault(); userMenu.classList.add('hidden'); openSettingsModal(); });
closeSettingsBtn.addEventListener('click', closeSettingsModal);
closeSettingsBtnDesktop.addEventListener('click', closeSettingsModal);

function switchSettingsTab(tab) {
    document.querySelectorAll('.settings-tab-btn').forEach(t => {
        t.classList.remove('active', 'bg-gray-100', 'text-gray-800', 'font-semibold');
        t.classList.add('text-gray-600', 'hover:bg-gray-100');
    });
    document.querySelectorAll('#general-settings-content, #profile-settings-content, #usage-settings-content').forEach(c => c.classList.add('hidden'));

    let titleKey = tab; 
    if (tab === 'general') {
        generalTabBtn.classList.add('active', 'bg-gray-100', 'text-gray-800', 'font-semibold');
        generalSettingsContent.classList.remove('hidden');
    } else if (tab === 'profile') {
        profileTabBtn.classList.add('active', 'bg-gray-100', 'text-gray-800', 'font-semibold');
        profileSettingsContent.classList.remove('hidden');
    } else if (tab === 'usage') {
        usageTabBtn.classList.add('active', 'bg-gray-100', 'text-gray-800', 'font-semibold');
        usageSettingsContent.classList.remove('hidden');
        titleKey = 'usagePlan';
    }
    settingsContentTitle.textContent = translations[currentLang][titleKey] || translations['en'][titleKey];
}

generalTabBtn.addEventListener('click', () => switchSettingsTab('general'));
profileTabBtn.addEventListener('click', () => switchSettingsTab('profile'));
usageTabBtn.addEventListener('click', () => switchSettingsTab('usage'));

// --- Ethical Hacking Mode Logic ---
cyberTrainingBtn.addEventListener('click', () => {
    if (!sidebar.classList.contains('-translate-x-full')) closeSidebar();
    cyberModal.classList.remove('hidden');
    cyberModal.classList.add('flex');
});

closeCyberModalBtn.addEventListener('click', () => {
    cyberModal.classList.add('hidden');
    cyberModal.classList.remove('flex');
});

toggleHackingModeBtn.addEventListener('click', () => {
    isEthicalHackingMode = !isEthicalHackingMode;
    updateHackingModeUI();
    cyberModal.classList.add('hidden');
    
    const statusMsg = isEthicalHackingMode 
        ? "👨‍💻 **Ethical Hacking Teacher Mode Activated.**"
        : "🔄 **Standard Mode Restored.**";
        
    addMessage({ text: statusMsg, sender: 'system' });
    if (isEthicalHackingMode) startNewChat(); 
});

/**
 * FIX: High-contrast update to ensure 'Cyber Training' is visible.
 */
function updateHackingModeUI() {
    const headerTitle = document.querySelector('header span');
    if (isEthicalHackingMode) {
        toggleHackingModeBtn.classList.remove('bg-gray-100', 'text-gray-800');
        toggleHackingModeBtn.classList.add('bg-green-600', 'text-white');
        hackingModeStatusText.textContent = "Disable Teacher Mode";
        if (headerTitle) {
            headerTitle.innerHTML = 'Sofia AI <span class="text-xs bg-green-600 text-white font-bold px-2 py-0.5 rounded-full ml-2 shadow-sm">Cyber Training</span>';
        }
    } else {
        toggleHackingModeBtn.classList.add('bg-gray-100', 'text-gray-800');
        toggleHackingModeBtn.classList.remove('bg-green-600', 'text-white');
        hackingModeStatusText.textContent = "Enable Teacher Mode";
        if (headerTitle) headerTitle.textContent = 'Sofia AI';
    }
}

// --- Multi-Language Logic ---
let currentLang = 'en';
const translations = { 'en': { sofiaTitle: 'Sofia AI', welcome: 'What can I help with?', askAnything: 'Ask anything' }, 'hi': { sofiaTitle: 'सोफिया एआई', welcome: 'मैं आपकी क्या मदद कर सकता हूँ?', askAnything: 'कुछ भी पूछें' } };

function applyLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (translations[lang] && translations[lang][key]) el.textContent = translations[lang][key];
    });
}

languageSelect.addEventListener('change', (e) => applyLanguage(e.target.value));

// --- Core Functions ---
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        fileData = e.target.result.split(',')[1];
        fileType = file.type;
        fileInfoForDisplay = { name: file.name, type: file.type, dataUrl: e.target.result };
        showFilePreview(file);
        sendBtn.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function showFilePreview(file) {
    filePreviewContainer.innerHTML = '';
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item image-preview';
    previewItem.innerHTML = `<img src="${fileInfoForDisplay.dataUrl}"><button class="remove-preview-btn" onclick="removeFile()">&times;</button>`;
    filePreviewContainer.appendChild(previewItem);
}

window.removeFile = () => {
    fileData = null; fileInfoForDisplay = null; fileInput.value = ''; filePreviewContainer.innerHTML = '';
};

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text && !fileData) return;

    if (document.body.classList.contains('initial-view')) {
        document.body.classList.remove('initial-view');
        welcomeMessageContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
    }
    
    addMessage({ text, sender: 'user', fileInfo: fileInfoForDisplay });
    messageInput.value = '';
    const currentFileData = fileData;
    removeFile();
    
    const typingIndicator = addTypingIndicator();
    let textToSend = isEthicalHackingMode ? `[SYSTEM: Expert Ethical Hacking Mode]\n${text}` : text;

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textToSend, fileData: currentFileData })
        });
        typingIndicator.remove();
        const result = await response.json();
        addMessage({ text: result.response, sender: 'ai' });
    } catch (error) {
        typingIndicator.remove();
        addMessage({ text: "Service unavailable.", sender: 'system' });
    }
}

function addMessage({text, sender, fileInfo = null}) {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${sender === 'user' ? 'user-message ml-auto' : 'ai-message'}`;
    bubble.innerHTML = markdownConverter.makeHtml(text);
    
    if (sender === 'ai') {
        const container = document.createElement('div');
        container.className = 'ai-message-container';
        container.innerHTML = `<div class="ai-avatar">🌎</div>`;
        container.appendChild(bubble);
        chatContainer.appendChild(container);
    } else {
        chatContainer.appendChild(bubble);
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'ai-message-container items-center';
    indicator.innerHTML = `<div class="ai-avatar-animated"><div class="orbiting-circle"></div>🌎</div><span class="ml-2">Thinking...</span>`;
    chatContainer.appendChild(indicator);
    return indicator;
}

// --- Initialization ---
function initializeApp() {
    applyLanguage('en');
    updateUsageUI();
    const welcomeH1 = document.querySelector('#welcome-message-container h1');
    if (welcomeH1) welcomeH1.textContent = translations[currentLang]['welcome'];
}

function updateUsageUI() {
    sidebarUserPlan.textContent = isPremium ? "Pro" : "Free";
}

initializeApp();
