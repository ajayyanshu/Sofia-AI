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

// Contact Us Elements
const contactBtn = document.getElementById('contact-btn');
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
const emailVerificationStatusText = document.getElementById('email-verification-status-text');
const verifyEmailBtn = document.getElementById('verify-email-btn');

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

// --- Language and Theme Logic ---
let currentLang = localStorage.getItem('sofia_lang') || 'en';

const translations = {
    'en': { 
        settings: 'Settings', general: 'General', profile: 'Profile', themeLabel: 'Theme', light: 'Light', dark: 'Dark', system: 'System', 
        language: 'Language', upload: 'Upload', username: 'Username', newChat: 'New chat', library: 'Library', chatHistory: 'Chat History', 
        chatHistoryEmpty: 'Your chat history will appear here.', help: 'Help', logOut: 'Log out', welcome: 'What can I help with?', 
        addFiles: 'Add photos & file', askAnything: 'Ask anything', search: 'Search', sofiaTitle: 'Sofia AI', uploadCode: 'Upload code',
        usagePlan: 'Usage & Plan', upgradePlan: 'Upgrade your plan', cyberTraining: 'Cyber Training', upgrade: 'Upgrade',
        verify: 'Verify', verified: 'Verified', delete: 'Delete', emailVerification: 'Email Verification', logoutAllDevices: 'Log out of all devices',
        deleteAccountLabel: 'Delete account', freePlanTitle: 'Free Plan', premiumPlanTitle: 'Sofia AI Pro', upgradeBtnText: 'Upgrade for ₹49/month',
        feature: 'Feature', dailyTextMessages: 'Messages', webSearchLimit: 'Web Search', unlimited: 'Unlimited'
    },
    'hi': { 
        settings: 'सेटिंग्स', general: 'सामान्य', profile: 'प्रोफ़ाइल', themeLabel: 'थीम', light: 'लाइट', dark: 'डार्क', system: 'सिस्टम', 
        language: 'भाषा', upload: 'अपलोड', username: 'उपयोगकर्ता नाम', newChat: 'नई चैट', library: 'लाइब्रेरी', chatHistory: 'चैट इतिहास', 
        chatHistoryEmpty: 'आपका चैट इतिहास यहाँ दिखाई देगा।', help: 'मदद', logOut: 'लॉग आउट', welcome: 'मैं क्या मदद कर सकती हूँ?', 
        addFiles: 'तस्वीरें और फ़ाइलें जोड़ें', askAnything: 'कुछ भी पूछें', search: 'खोजें', sofiaTitle: 'सोफिया एआई', uploadCode: 'कोड अपलोड करें',
        usagePlan: 'उपयोग और योजना', upgradePlan: 'अपना प्लान अपग्रेड करें', cyberTraining: 'साइबर प्रशिक्षण', upgrade: 'अपग्रेड करें',
        verify: 'सत्यापित करें', verified: 'सत्यापित', delete: 'हटाएं', emailVerification: 'ईमेल सत्यापन', logoutAllDevices: 'सभी उपकरणों से लॉग आउट करें',
        deleteAccountLabel: 'खाता हटाएं', freePlanTitle: 'फ्री प्लान', premiumPlanTitle: 'सोफिया एआई प्रो', upgradeBtnText: '₹49/माह में अपग्रेड करें',
        feature: 'सुविधा', dailyTextMessages: 'संदेश', webSearchLimit: 'वेब खोज', unlimited: 'असीमित'
    },
    'bn': { 
        settings: 'সেটিংস', general: 'সাধারণ', profile: 'প্রোফাইল', themeLabel: 'থিম', light: 'লাইট', dark: 'ডার্ক', system: 'সিস্টেম', 
        language: 'ভাষা', upload: 'আপলোড', username: 'ব্যবহারকারীর নাম', newChat: 'নতুন চ্যাট', library: 'লাইব্রেরি', chatHistory: 'চ্যাট ইতিহাস', 
        chatHistoryEmpty: 'আপনার চ্যাট ইতিহাস এখানে প্রদর্শিত হবে।', help: 'সাহায্য', logOut: 'লগ আউট', welcome: 'আমি কীভাবে সাহায্য করতে পারি?', 
        addFiles: 'ছবি এবং ফাইল যোগ করুন', askAnything: 'যা খুশি জিজ্ঞাসা করুন', search: 'অনুসন্ধান', sofiaTitle: 'সোফিয়া এআই', uploadCode: 'কোড আপলোড করুন',
        usagePlan: 'ব্যবহার এবং পরিকল্পনা', upgradePlan: 'আপনার পরিকল্পনা আপগ্রেড করুন', cyberTraining: 'সাইবার প্রশিক্ষণ', upgrade: 'আপগ্রেড করুন',
        verify: 'যাচাই করুন', verified: 'যাচাইকৃত', delete: 'মুছুন', emailVerification: 'ইমেল যাচাইকরণ', logoutAllDevices: 'সমস্ত ডিভাইস থেকে লগ আউট করুন',
        deleteAccountLabel: 'অ্যাকাউন্ট মুছুন', freePlanTitle: 'ফ্রি প্ল্যান', premiumPlanTitle: 'সোফিয়া এআই প্রো', upgradeBtnText: '৪৯ টাকা/মাসে আপগ্রেড করুন',
        feature: 'বৈশিষ্ট্য', dailyTextMessages: 'বার্তা', webSearchLimit: 'ওয়েব অনুসন্ধান', unlimited: 'সীমাহীন'
    }
};

const languages = { "en": "English", "hi": "हिंदी", "bn": "বাংলা" };

function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('sofia_lang', lang);
    
    // Update Text Content based on data-lang
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (translations[lang] && translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });

    // Update Placeholders based on data-lang-placeholder
    document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
        const key = el.getAttribute('data-lang-placeholder');
        if (translations[lang] && translations[lang][key]) {
            el.placeholder = translations[lang][key];
        }
    });

    // Handle settings title specifically
    const currentTab = settingsContentTitle.getAttribute('data-current-tab') || 'general';
    settingsContentTitle.textContent = translations[lang][currentTab] || translations['en'][currentTab];

    document.documentElement.lang = lang;
    updateUsageUI(); // Refresh usage labels with new language
}

function populateLanguages() {
    languageSelect.innerHTML = '';
    for (const [code, name] of Object.entries(languages)) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        if (code === currentLang) option.selected = true;
        languageSelect.appendChild(option);
    }
}

languageSelect.addEventListener('change', (e) => applyLanguage(e.target.value));

// --- Sidebar & UI Navigation ---
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

newChatBtn.addEventListener('click', () => { startNewChat(); closeSidebar(); });
headerNewChatBtn.addEventListener('click', startNewChat);

// --- Settings & Modal Logic ---
function openSettingsModal() { 
    settingsModal.classList.remove('hidden'); 
    settingsModal.classList.add('flex'); 
}
function closeSettingsModal() { 
    settingsModal.classList.add('hidden'); 
    settingsModal.classList.remove('flex'); 
}
settingsMenuItem.addEventListener('click', (e) => { 
    e.preventDefault(); 
    userMenu.classList.add('hidden'); 
    openSettingsModal(); 
});
closeSettingsBtn.addEventListener('click', closeSettingsModal);
closeSettingsBtnDesktop.addEventListener('click', closeSettingsModal);

function switchSettingsTab(tab) {
    const tabs = [generalTabBtn, profileTabBtn, usageTabBtn];
    const contents = [generalSettingsContent, profileSettingsContent, usageSettingsContent];
    
    tabs.forEach(t => t.classList.remove('bg-gray-100', 'text-gray-800', 'font-semibold'));
    contents.forEach(c => c.classList.add('hidden'));

    if (tab === 'general') {
        generalTabBtn.classList.add('bg-gray-100', 'text-gray-800', 'font-semibold');
        generalSettingsContent.classList.remove('hidden');
        settingsContentTitle.setAttribute('data-current-tab', 'general');
    } else if (tab === 'profile') {
        profileTabBtn.classList.add('bg-gray-100', 'text-gray-800', 'font-semibold');
        profileSettingsContent.classList.remove('hidden');
        settingsContentTitle.setAttribute('data-current-tab', 'profile');
    } else if (tab === 'usage') {
        usageTabBtn.classList.add('bg-gray-100', 'text-gray-800', 'font-semibold');
        usageSettingsContent.classList.remove('hidden');
        settingsContentTitle.setAttribute('data-current-tab', 'usagePlan');
    }
    applyLanguage(currentLang);
}

generalTabBtn.addEventListener('click', () => switchSettingsTab('general'));
profileTabBtn.addEventListener('click', () => switchSettingsTab('profile'));
usageTabBtn.addEventListener('click', () => switchSettingsTab('usage'));

// --- Core Messaging Logic ---
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text && !fileData) return;
    
    if (document.body.classList.contains('initial-view')) {
        document.body.classList.remove('initial-view');
        welcomeMessageContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
    }
    
    const userMessage = { text, sender: 'user', fileInfo: fileInfoForDisplay };
    addMessage(userMessage);
    currentChat.push(userMessage);

    messageInput.value = '';
    messageInput.style.height = 'auto';

    const typingIndicator = addTypingIndicator();

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, fileData, fileType, isTemporary: isTemporaryChatActive })
        });
        
        typingIndicator.remove();
        const result = await response.json();
        
        const aiMessage = { text: result.response, sender: 'ai' };
        addMessage(aiMessage);
        currentChat.push(aiMessage);
        saveChatSession();
    } catch (error) {
        typingIndicator.remove();
        addMessage({ text: "Error connecting to AI.", sender: 'system' });
    }
}

function addMessage({text, sender, fileInfo = null}) {
    const bubble = document.createElement('div');
    bubble.className = sender === 'user' ? 'message-bubble user-message ml-auto' : 'ai-message-container flex gap-3';
    
    if (sender === 'user') {
        bubble.innerHTML = `<div>${text}</div>`;
    } else {
        bubble.innerHTML = `
            <div class="ai-avatar">🌎</div>
            <div class="message-bubble ai-message">${markdownConverter.makeHtml(text)}</div>
        `;
    }
    
    chatContainer.appendChild(bubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'ai-message-container flex gap-2 items-center italic text-gray-400';
    indicator.innerHTML = `<div class="ai-avatar">🌎</div><span>Thinking...</span>`;
    chatContainer.appendChild(indicator);
    return indicator;
}

// --- Initialization ---
function initializeApp() {
    populateLanguages();
    applyLanguage(currentLang);
    
    // Theme setup
    const savedTheme = localStorage.getItem('sofia_theme') || 'system';
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    
    // Load existing history
    fetchAndDisplayUserInfo();
    
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
}

function startNewChat() {
    currentChat = [];
    currentChatId = null;
    chatContainer.innerHTML = '';
    welcomeMessageContainer.classList.remove('hidden');
    chatContainer.classList.add('hidden');
    document.body.classList.add('initial-view');
}

async function fetchAndDisplayUserInfo() {
    // Mock user info fetch
    document.getElementById('sidebar-username').textContent = "Ajay Kumar";
}

function updateUsageUI() {
    const usedWord = currentLang === 'hi' ? 'उपयोग किया गया' : (currentLang === 'bn' ? 'ব্যবহৃত' : 'Used');
    sidebarUsageDisplay.textContent = `${usageCounts.messages} / ${usageLimits.messages} ${usedWord}`;
}

initializeApp();
