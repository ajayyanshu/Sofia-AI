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
// UPDATED: Now using an array for multiple files
let selectedFiles = []; 
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
let usageCounts = {
    messages: 0,
    webSearches: 0
};
const usageLimits = {
    messages: 500, 
    webSearches: 1
};
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
    if (sidebar.classList.contains('-translate-x-full')) {
        openSidebar();
    } else {
        closeSidebar();
    }
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

// --- FILE UPLOAD LISTENERS ---
uploadFileBtn.addEventListener('click', () => {
    fileInput.accept = "image/*,.pdf,.doc,.docx";
    fileInput.click();
});

uploadCodeBtn.addEventListener('click', () => {
    fileInput.accept = ".txt,.py,.js,.java,.c,.cpp,.h,.html,.css,.json,.md,.sh,.rb,.go,.php,.swift,.kt";
    fileInput.click();
});

// UPDATED: handleFileSelect now processes all files in the selection
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
     if (!addMenu.classList.contains('hidden') && !addBtn.contains(e.target)) {
        addMenu.classList.add('hidden');
    }
    if (userMenu && !userMenu.classList.contains('hidden') && !userMenuBtn.contains(e.target) && !userMenu.contains(e.target)) {
        userMenu.classList.add('hidden');
    }
});

messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    let newHeight = messageInput.scrollHeight;
    messageInput.style.height = `${newHeight}px`;
    
    const hasText = messageInput.value.trim() !== '';
    const shouldShowSend = hasText || selectedFiles.length > 0;
    
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
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) { closeSettingsModal(); } });

function switchSettingsTab(tab) {
    const tabs = document.querySelectorAll('.settings-tab-btn');
    tabs.forEach(t => {
        t.classList.remove('active', 'bg-gray-100', 'text-gray-800', 'font-semibold');
        t.classList.add('text-gray-600', 'hover:bg-gray-100');
    });
    
    const contents = document.querySelectorAll('#general-settings-content, #profile-settings-content, #usage-settings-content');
    contents.forEach(c => c.classList.add('hidden'));

    let titleKey = 'settings'; 
    if (tab === 'general') {
        generalTabBtn.classList.add('active', 'bg-gray-100', 'text-gray-800', 'font-semibold');
        generalTabBtn.classList.remove('text-gray-600', 'hover:bg-gray-100');
        generalSettingsContent.classList.remove('hidden');
        titleKey = 'general';
    } else if (tab === 'profile') {
        profileTabBtn.classList.add('active', 'bg-gray-100', 'text-gray-800', 'font-semibold');
        profileTabBtn.classList.remove('text-gray-600', 'hover:bg-gray-100');
        profileSettingsContent.classList.remove('hidden');
        titleKey = 'profile';
    } else if (tab === 'usage') {
        usageTabBtn.classList.add('active', 'bg-gray-100', 'text-gray-800', 'font-semibold');
        usageTabBtn.classList.remove('text-gray-600', 'hover:bg-gray-100');
        usageSettingsContent.classList.remove('hidden');
        titleKey = 'usagePlan';
    }
    
    settingsContentTitle.textContent = translations[currentLang][titleKey] || translations['en'][titleKey];
    settingsContentTitle.setAttribute('data-current-tab', titleKey); 
}

generalTabBtn.addEventListener('click', (e) => { e.preventDefault(); switchSettingsTab('general'); });
profileTabBtn.addEventListener('click', (e) => { e.preventDefault(); switchSettingsTab('profile'); });
usageTabBtn.addEventListener('click', (e) => { e.preventDefault(); switchSettingsTab('usage'); });

// --- Contact Modal Logic ---
function openContactModal() {
    if (!sidebar.classList.contains('-translate-x-full')) closeSidebar();
    if (userMenu && !userMenu.classList.contains('hidden')) userMenu.classList.add('hidden');
    contactModal.classList.remove('hidden');
    contactModal.classList.add('flex');
}

if (contactMenuItem) contactMenuItem.addEventListener('click', openContactModal);

closeContactModalBtn.addEventListener('click', () => {
    contactModal.classList.add('hidden');
    contactModal.classList.remove('flex');
});

contactModal.addEventListener('click', (e) => {
    if (e.target === contactModal) {
        contactModal.classList.add('hidden');
        contactModal.classList.remove('flex');
    }
});


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
    cyberModal.classList.remove('flex');
    
    const statusMsg = isEthicalHackingMode 
        ? "👨‍💻 **Ethical Hacking Teacher Mode Activated.**\nAsk me about penetration testing, network security, or defense mechanisms."
        : "🔄 **Standard Mode Restored.**\nI am back to being your general AI assistant.";
        
    addMessage({ text: statusMsg, sender: 'system' });
    
    if (isEthicalHackingMode) startNewChat(); 
});

/**
 * UPDATED FUNCTION: Removes the background box and 
 * shows plain text for Cyber Training Mode On.
 */
function updateHackingModeUI() {
    const headerTitle = document.querySelector('header span');
    if (isEthicalHackingMode) {
        toggleHackingModeBtn.classList.remove('bg-gray-100', 'text-gray-800', 'dark:bg-gray-700', 'dark:text-white', 'hover:bg-green-600');
        toggleHackingModeBtn.classList.add('bg-green-600', 'text-white', 'hover:bg-red-600');
        hackingModeStatusText.textContent = "Disable Teacher Mode";
        
        // Removed green background and padding; displaying only text
        if (headerTitle) {
            headerTitle.innerHTML = 'Sofia AI <span class="text-xs text-green-600 dark:text-green-400 font-medium ml-2">Cyber Training Mode On</span>';
        }
        
    } else {
        toggleHackingModeBtn.classList.add('bg-gray-100', 'text-gray-800', 'dark:bg-gray-700', 'dark:text-white', 'hover:bg-green-600');
        toggleHackingModeBtn.classList.remove('bg-green-600', 'text-white', 'hover:bg-red-600');
        hackingModeStatusText.textContent = "Enable Teacher Mode";
        
        if (headerTitle) {
            headerTitle.textContent = 'Sofia AI';
        }
    }
}


// --- Language and Theme Logic ---
let currentLang = 'en';
const translations = {
    'en': { 
        settings: 'Settings', 
        general: 'General', 
        profile: 'Profile', 
        theme: 'Theme', 
        light: 'Light', 
        dark: 'Dark', 
        system: 'System', 
        language: 'Language', 
        username: 'Username', 
        newChat: 'New chat', 
        library: 'Library', 
        chatHistory: 'Chat History', 
        chatHistoryEmpty: 'Your chat history will appear here.', 
        logOut: 'Log out', 
        welcome: 'What can I help with?', 
        addFiles: 'Add photos & file', 
        askAnything: 'Ask anything', 
        search: 'Search', 
        sofiaTitle: 'Sofia AI',
        uploadCode: 'Upload code',
        usagePlan: 'Usage & Plan',
        upgradePlan: 'Upgrade your plan',
        cyberTraining: 'Cyber Training',
        upgrade: 'Upgrade',
        verify: 'Verify',
        verified: 'Verified',
        delete: 'Delete',
        emailVerification: 'Email Verification',
        logoutAllDevices: 'Log out of all devices',
        deleteAccountLabel: 'Delete account',
        themeLabel: 'Theme',
        emailNotVerifiedMsg: 'Your email is not verified.',
        emailVerifiedMsg: 'Your email has been verified.',
        feature: 'Feature',
        dailyTextMessages: 'Text Messages',
        voiceCommands: 'Voice-to-Voice Commands',
        readDocs: 'Read Image/PDF/Docs',
        webSearchLimit: 'Web Search',
        saveHistory: 'Save & Search History',
        messages: 'messages',
        unlimited: 'Unlimited',
        perDay: 'per day',
        perMonth: '1 per month (5 pages)',
        yesForever: '✔ Yes, Forever',
        msgsUsedMonth: 'messages used this month',
        freePlanTitle: 'Free Plan',
        premiumPlanTitle: 'Sofia AI Pro',
        upgradeBtnText: 'Upgrade for ₹49/month', 
        used: 'Used',
        contactUs: 'Contact Us',
        email: 'Email',
        telegram: 'Telegram',
        contactMessage: "We'd love to hear from you!"
    },
    'hi': { 
        settings: 'सेटिंग्स', 
        general: 'सामान्य', 
        profile: 'प्रोफ़ाइल', 
        theme: 'थीम', 
        light: 'लाइट', 
        dark: 'डार्क', 
        system: 'सिस्टम', 
        language: 'भाषा', 
        username: 'उपयोगकर्ता नाम', 
        newChat: 'नई चैट', 
        library: 'लाइब्रेरी', 
        chatHistory: 'चैट इतिहास', 
        chatHistoryEmpty: 'आपका चैट इतिहास यहाँ दिखाई देगा।', 
        logOut: 'लॉग आउट', 
        welcome: 'मैं आपकी क्या मदद कर सकता हूँ?', 
        addFiles: 'तस्वीरें और फ़ाइलें जोड़ें', 
        askAnything: 'कुछ भी पूछें', 
        search: 'खोजें', 
        sofiaTitle: 'सोफिया एआई',
        uploadCode: 'कोड अपलोड करें',
        usagePlan: 'उपयोग और योजना',
        upgradePlan: 'अपना प्लान अपग्रेड करें',
        cyberTraining: 'साइबर प्रशिक्षण',
        upgrade: 'अपग्रेड करें',
        verify: 'सत्यापित करें',
        verified: 'सत्यापित',
        delete: 'हटाएं',
        emailVerification: 'ईमेल सत्यापन',
        logoutAllDevices: 'सभी उपकरणों से लॉग आउट करें',
        deleteAccountLabel: 'खाता हटाएं',
        themeLabel: 'थीम',
        emailNotVerifiedMsg: 'आपका ईमेल सत्यापित नहीं है।',
        emailVerifiedMsg: 'आपका ईमेल सत्यापित हो गया है।',
        feature: 'सुविधा',
        dailyTextMessages: 'टेक्स्ट संदेश',
        voiceCommands: 'वॉयस-टू-वॉयस कमांड',
        readDocs: 'छवि/पीडीएफ/दस्तावेज़ पढ़ें',
        webSearchLimit: 'वेब खोज',
        saveHistory: 'इतिहास सहेजें और खोजें',
        messages: 'संदेश',
        unlimited: 'असीमित',
        perDay: 'प्रति दिन',
        perMonth: '1 प्रति माह (5 पृष्ठ)',
        yesForever: '✔ हाँ, हमेशा के लिए',
        msgsUsedMonth: 'इस महीने उपयोग किए गए संदेश',
        freePlanTitle: 'फ्री प्लान',
        premiumPlanTitle: 'सोफिया एआई प्रो',
        upgradeBtnText: '₹49/माह में अपग्रेड करें', 
        used: 'उपयोग किया गया',
        contactUs: 'हमसे संपर्क करें',
        email: 'ईमेल',
        telegram: 'टेलीग्राम',
        contactMessage: 'हमें आपसे जानकर खुशी होगी!'
    },
    'bn': { 
        settings: 'সেটিংস', 
        general: 'সাধারণ', 
        profile: 'প্রোফাইল', 
        theme: 'থিম', 
        light: 'লাইট', 
        dark: 'ডার্ক', 
        system: 'সিস্টেম', 
        language: 'ভাষা', 
        username: 'ব্যবহারকারীর নাম', 
        newChat: 'নতুন চ্যাট', 
        library: 'লাইব্রেরি', 
        chatHistory: 'চ্যাট ইতিহাস', 
        chatHistoryEmpty: 'আপনার চ্যাট ইতিহাস এখানে প্রদর্শিত হবে।', 
        logOut: 'লগ আউট', 
        welcome: 'আমি আপনাকে কীভাবে সাহায্য করতে পারি?', 
        addFiles: 'ছবি এবং ফাইল যোগ করুন', 
        askAnything: 'যা খুশি জিজ্ঞাসা করুন', 
        search: 'অনুসন্ধান', 
        sofiaTitle: 'সোফিয়া এআই',
        uploadCode: 'কোড আপলোড করুন',
        usagePlan: 'ব্যবহার এবং পরিকল্পনা',
        upgradePlan: 'আপনার পরিকল্পনা আপগ্রেড করুন',
        cyberTraining: 'সাইবার প্রশিক্ষণ',
        upgrade: 'আপগ্রেড করুন',
        verify: 'যাচাই করুন',
        verified: 'যাচাইকৃত',
        delete: 'মুছুন',
        emailVerification: 'ইমেল যাচাইকরণ',
        logoutAllDevices: 'সমস্ত ডিভাইস থেকে লগ আউট করুন',
        deleteAccountLabel: 'অ্যাকাউন্ট মুছুন',
        themeLabel: 'থিম',
        emailNotVerifiedMsg: 'আপনার ইমেল যাচাই করা হয়নি।',
        emailVerifiedMsg: 'আপনার ইমেল যাচাই করা হয়েছে।',
        feature: 'বৈশিষ্ট্য',
        dailyTextMessages: 'টেক্সট বার্তা',
        voiceCommands: 'ভয়েস-টু-ভয়েস কমান্ড',
        readDocs: 'ছবি/পিডিএফ/ডক্স পড়ুন',
        webSearchLimit: 'ওয়েব অনুসন্ধান',
        saveHistory: 'ইতিহাস সংরক্ষণ ও অনুসন্ধান',
        messages: 'বার্তা',
        unlimited: 'সীমাহীন',
        perDay: 'প্রতিদিন',
        perMonth: 'মাসে ১টি (৫ পৃষ্ঠা)',
        yesForever: '✔ হ্যাঁ, চিরকাল',
        msgsUsedMonth: 'এই মাসে ব্যবহৃত বার্তা',
        freePlanTitle: 'ফ্রি প্ল্যান',
        premiumPlanTitle: 'সোফিয়া এআই প্রো',
        upgradeBtnText: '৪৯ টাকা/মাসে আপগ্রেড করুন', 
        used: 'ব্যবহৃত',
        contactUs: 'আমাদের সাথে যোগাযোগ করুন',
        email: 'ইমেল',
        telegram: 'টেলিগ্রাম',
        contactMessage: 'আমরা আপনার কথা শুনতে চাই!'
    }
};

const languages = { "en": "English", "hi": "हिंदी", "bn": "বাংলা" };

function applyLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (translations[lang] && translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });
     document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
        const key = el.getAttribute('data-lang-placeholder');
        if (translations[lang] && translations[lang][key]) {
            el.placeholder = translations[lang][key];
        }
    });

    const currentTab = settingsContentTitle.getAttribute('data-current-tab') || 'general';
    settingsContentTitle.textContent = translations[lang][currentTab] || translations['en'][currentTab];

    const uploadCodeSpan = document.querySelector('#upload-code-btn span');
    if (uploadCodeSpan) uploadCodeSpan.textContent = translations[lang]['uploadCode'];

    const usageTabSpan = document.querySelector('#usage-tab-btn span');
    if (usageTabSpan) usageTabSpan.textContent = translations[lang]['usagePlan'];

    const upgradeSidebarSpan = document.querySelector('#upgrade-plan-sidebar-btn span');
    if (upgradeSidebarSpan) upgradeSidebarSpan.textContent = translations[lang]['upgradePlan'];

    const cyberTrainingSpan = document.querySelector('#cyber-training-btn span');
    if (cyberTrainingSpan) cyberTrainingSpan.textContent = translations[lang]['cyberTraining'];
    
    const themeLabel = document.querySelector('#general-settings-content label');
    if (themeLabel) themeLabel.textContent = translations[lang]['themeLabel'];

    const lightSpan = document.querySelector('#theme-light span');
    if (lightSpan) lightSpan.textContent = translations[lang]['light'];

    const darkSpan = document.querySelector('#theme-dark span');
    if (darkSpan) darkSpan.textContent = translations[lang]['dark'];

    const systemSpan = document.querySelector('#theme-system span');
    if (systemSpan) systemSpan.textContent = translations[lang]['system'];

    const generalTabSpan = document.querySelector('#general-tab-btn span');
    if (generalTabSpan) generalTabSpan.textContent = translations[lang]['general'];

    const profileTabSpan = document.querySelector('#profile-tab-btn span');
    if (profileTabSpan) profileTabSpan.textContent = translations[lang]['profile'];

    const planTable = document.querySelector('.plan-table');
    if (planTable) {
        const headerRow = planTable.querySelector('.flex.justify-between.items-end');
        if (headerRow) {
            headerRow.children[0].textContent = translations[lang]['feature'];
            headerRow.children[1].textContent = translations[lang]['freePlanTitle'];
            headerRow.children[2].innerHTML = `${translations[lang]['premiumPlanTitle']} <span class="text-sm font-normal">(₹49/month)</span>`;
        }

        const rows = planTable.querySelectorAll('.bg-gray-50 > div, .dark\\:bg-gray-800 > div');
        
        if (rows.length >= 5) {
            rows[0].children[0].textContent = translations[lang]['dailyTextMessages'];
            rows[0].children[1].textContent = `${usageLimits.messages} ${translations[lang]['messages']}`; 
            rows[0].children[2].textContent = translations[lang]['unlimited'];

            rows[1].children[0].textContent = translations[lang]['voiceCommands'];
            rows[1].children[1].textContent = `5 ${translations[lang]['perDay']}`;
            rows[1].children[2].textContent = translations[lang]['unlimited'];

            rows[2].children[0].textContent = translations[lang]['readDocs'];
            rows[2].children[1].textContent = translations[lang]['perMonth'];
            rows[2].children[2].textContent = translations[lang]['unlimited'];

            rows[3].children[0].textContent = translations[lang]['webSearchLimit'];
            rows[3].children[1].textContent = `1 ${translations[lang]['perDay']}`;
            rows[3].children[2].textContent = `${translations[lang]['unlimited']}*`;

            rows[4].children[0].textContent = translations[lang]['saveHistory'];
            rows[4].children[1].textContent = translations[lang]['yesForever'];
            rows[4].children[2].textContent = translations[lang]['yesForever'];
        }
    }

    if (planTitle) planTitle.textContent = translations[lang]['freePlanTitle'];
    if (razorpayBtn) razorpayBtn.textContent = translations[lang]['upgradeBtnText'];

    updateUsageUI();

    const profileContent = document.getElementById('profile-settings-content');
    if (profileContent) {
        const logoutLabel = profileContent.querySelector('div.space-y-6 > div:nth-child(3) > p');
        if (logoutLabel) logoutLabel.textContent = translations[lang]['logoutAllDevices'];

        const deleteAccountLabel = profileContent.querySelector('div.space-y-6 > div:nth-child(4) > p');
        if (deleteAccountLabel) deleteAccountLabel.textContent = translations[lang]['deleteAccountLabel'];
    }

    if (deleteAccountBtn) deleteAccountBtn.textContent = translations[lang]['delete'];
    if (logoutBtn) logoutBtn.textContent = translations[lang]['logOut'];

    document.documentElement.lang = lang;
}

function populateLanguages() {
    languageSelect.innerHTML = '';
    for (const [code, name] of Object.entries(languages)) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        if (code === currentLang) {
            option.selected = true;
        }
        languageSelect.appendChild(option);
    }
}

languageSelect.addEventListener('change', (e) => {
    const newLang = e.target.value;
    applyLanguage(newLang);
});

function applyTheme(theme) {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
        document.documentElement.classList.remove('light');
    } else { 
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
}

themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        themeBtns.forEach(b => b.classList.remove('border-indigo-600', 'border-2', 'ring-2', 'ring-indigo-200'));
        btn.classList.add('border-indigo-600', 'border-2', 'ring-2', 'ring-indigo-200');
        const theme = btn.id.replace('theme-', '');
        applyTheme(theme);
    });
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    const savedTheme = localStorage.getItem('theme');
    if(savedTheme === 'system') {
         applyTheme('system');
    }
});

// --- Core Functions ---

// UPDATED: Now loops through all files selected via input
function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    addMenu.classList.add('hidden');
    
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const fileObj = {
                name: file.name,
                type: file.type,
                dataUrl: e.target.result,
                base64: e.target.result.split(',')[1]
            };
            selectedFiles.push(fileObj);
            renderAllFilePreviews();
            sendBtn.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    });
    
    // Reset input so same file can be selected again if needed
    fileInput.value = '';
}

// UPDATED: Renders all files currently in the selectedFiles array
function renderAllFilePreviews() {
    filePreviewContainer.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        
        if (file.type.startsWith('image/')) {
             previewItem.classList.add('image-preview');
             previewItem.innerHTML = `<img src="${file.dataUrl}" alt="${file.name}"><button class="remove-preview-btn" onclick="removeFileByIndex(${index})">&times;</button>`;
        } else {
             previewItem.classList.add('doc-preview');
             previewItem.innerHTML = `<div class="file-icon"><svg class="h-6 w-6 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div><span class="file-name">${file.name}</span><button class="remove-preview-btn" onclick="removeFileByIndex(${index})">&times;</button>`;
        }
        filePreviewContainer.appendChild(previewItem);
    });
    
    // Update button visibility
    const hasInput = messageInput.value.trim() !== '';
    sendBtn.classList.toggle('hidden', !hasInput && selectedFiles.length === 0);
}

// UPDATED: Removes a specific file by its index in the array
window.removeFileByIndex = function(index) {
    selectedFiles.splice(index, 1);
    renderAllFilePreviews();
    
    if (selectedFiles.length === 0 && messageInput.value.trim() === '') {
        sendBtn.classList.add('hidden');
        micBtn.classList.remove('hidden');
        voiceModeBtn.classList.remove('hidden');
    }
}

// Helper for single file removal logic if needed (Legacy Support)
window.removeFile = function() {
    selectedFiles = [];
    renderAllFilePreviews();
}

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text && selectedFiles.length === 0) return;
    
    if (!isPremium && !isAdmin && usageCounts.messages >= usageLimits.messages) {
        alert("You've reached your monthly message limit. Please upgrade to continue.");
        if (isVoiceConversationActive) endVoiceConversation();
        openSettingsModal();
        switchSettingsTab('usage');
        return;
    }

    if (document.body.classList.contains('initial-view')) {
        document.body.classList.remove('initial-view');
        welcomeMessageContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
    }
    
    // Add User Message UI (Show all files in one bubble)
    const userMessage = {
        text,
        sender: 'user',
        files: [...selectedFiles], // Send clones
        mode: currentMode
    };
    addMessage(userMessage);
    currentChat.push(userMessage);

    messageInput.value = '';
    messageInput.dispatchEvent(new Event('input'));

    // Upload files to library
    selectedFiles.forEach(file => uploadFileToLibrary(file));
    
    const modeForThisMessage = currentMode;
    const filesToUpload = [...selectedFiles];
    selectedFiles = []; // Clear current selection
    renderAllFilePreviews();
    
    if (modeForThisMessage !== 'voice_mode') {
        deactivateWebSearch();
        currentMode = null;
    }
    
    const typingIndicator = addTypingIndicator();

    let textToSend = text;
    if (isEthicalHackingMode) {
        textToSend = `[SYSTEM: You are now an Expert Ethical Hacking Teacher...] User Question: "${text}"`;
    }

    try {
        // UPDATED: Assuming backend can handle 'files' array, otherwise sending first file info
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: textToSend, 
                files: filesToUpload.map(f => ({ data: f.base64, type: f.type, name: f.name })), // Support array
                fileData: filesToUpload.length > 0 ? filesToUpload[0].base64 : null, // Legacy support
                fileType: filesToUpload.length > 0 ? filesToUpload[0].type : null,
                isTemporary: isTemporaryChatActive,
                mode: modeForThisMessage 
            })
        });
        
        typingIndicator.remove();

        if (!response.ok) {
             const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server Error: ${response.status}`);
        }
        
        if (!isPremium && !isAdmin) {
            usageCounts.messages++;
            fetch('/update_usage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'message' }) });
            updateUsageUI();
        }

        const result = await response.json();
        const aiResponseText = result.response || "Sorry, I couldn't get a response.";
        
        const aiMessage = { text: aiResponseText, sender: 'ai' };
        addMessage(aiMessage);
        currentChat.push(aiMessage);
        saveChatSession();

        if (modeForThisMessage === 'voice_mode' && isVoiceConversationActive) {
            speakText(aiResponseText, startListening);
        }

    } catch (error) {
        typingIndicator.remove();
        console.error("API call failed:", error);
        const errorMessage = { text: `Service unavailable. Try again later.`, sender: 'system' };
        addMessage(errorMessage);
        currentChat.push(errorMessage);
        saveChatSession();
    }
}

// UPDATED: Modified to render multiple files in one message bubble
function addMessage({text, sender, files = [], mode = null, fileInfo = null}) {
     if (sender === 'user') {
        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble user-message ml-auto';
        
        let filesHtml = '';
        // Handle array of files
        const allFiles = files.length > 0 ? files : (fileInfo ? [fileInfo] : []);
        
        allFiles.forEach(file => {
            if (file.type.startsWith('image/')) {
                 filesHtml += `<img src="${file.dataUrl}" alt="User upload" class="rounded-lg mb-2 max-w-xs block">`;
            } else {
                filesHtml += `<div class="flex items-center bg-blue-100 rounded-lg p-2 mb-2"><svg class="h-6 w-6 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><span class="text-sm text-blue-800">${file.name}</span></div>`;
            }
        });
        
        let modeHtml = '';
        if (mode === 'web_search' || mode === 'mic_input' || mode === 'voice_mode') {
            let modeText = mode === 'web_search' ? 'Google Search' : (mode === 'mic_input' ? 'Voice Input' : 'Voice Mode');
            modeHtml = `<div class="mt-2 flex items-center gap-1.5"><div class="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg></div><span class="text-xs text-white/80">${modeText}</span></div>`;
        }

        messageBubble.innerHTML = filesHtml + `<div>${text}</div>` + modeHtml;
        chatContainer.appendChild(messageBubble);

    } else if (sender === 'ai') {
        const aiMessageContainer = document.createElement('div');
        aiMessageContainer.className = 'ai-message-container';
        const avatar = `<div class="ai-avatar"><span class="text-2xl">🌎</span></div>`;
        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble ai-message';
        
        let contentHtml = markdownConverter.makeHtml(text);
        const actionsHtml = `
            <div class="message-actions">
                <button class="action-btn copy-btn" title="Copy text"><svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM5 11a1 1 0 100 2h4a1 1 0 100-2H5z"/></svg></button>
                <button class="action-btn like-btn" title="Good response"><svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.821 2.311l-1.055 1.636a1 1 0 00-1.423 .23z"/></svg></button>
                <button class="action-btn dislike-btn" title="Bad response"><svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.642a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.821-2.311l1.055-1.636a1 1 0 001.423 .23z"/></svg></button>
                <button class="action-btn speak-btn" title="Speak"><svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clip-rule="evenodd" /></svg></button>
            </div>
        `;

        messageBubble.innerHTML = contentHtml + actionsHtml;
        aiMessageContainer.innerHTML = avatar;
        aiMessageContainer.appendChild(messageBubble);
        chatContainer.appendChild(aiMessageContainer);

        // Highlight code and add copy buttons
        const codeBlocks = messageBubble.querySelectorAll('pre');
        codeBlocks.forEach((pre) => {
            const copyButton = document.createElement('button');
            copyButton.className = 'code-copy-btn';
            copyButton.textContent = 'Copy Code';
            copyButton.onclick = () => {
                const code = pre.querySelector('code');
                if (code) {
                    navigator.clipboard.writeText(code.innerText);
                    copyButton.textContent = 'Copied!';
                    setTimeout(() => copyButton.textContent = 'Copy Code', 2000);
                }
            };
            pre.appendChild(copyButton);
        });

        if (window.Prism) Prism.highlightAll();

        messageBubble.querySelector('.copy-btn').addEventListener('click', (e) => {
            navigator.clipboard.writeText(text).then(() => {
                const btn = e.currentTarget;
                const original = btn.innerHTML;
                btn.innerHTML = '<span class="text-xs">Copied!</span>';
                setTimeout(() => btn.innerHTML = original, 2000);
            });
        });

        messageBubble.querySelector('.speak-btn').addEventListener('click', (e) => {
            const btn = e.currentTarget;
             if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                btn.classList.remove('text-green-600', 'animate-pulse');
            } else {
                btn.classList.add('text-green-600', 'animate-pulse');
                speakText(text, () => btn.classList.remove('text-green-600', 'animate-pulse'));
            }
        });

    } else if (sender === 'system') {
        const messageBubble = document.createElement('div');
        messageBubble.textContent = text;
        messageBubble.className = 'message-bubble system-message';
        chatContainer.appendChild(messageBubble);
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addTypingIndicator() {
    const typingIndicatorContainer = document.createElement('div');
    typingIndicatorContainer.className = 'ai-message-container typing-indicator items-center';
    typingIndicatorContainer.innerHTML = `
        <div class="ai-avatar-animated"><div class="orbiting-circle"></div><span class="globe text-2xl">🌎</span></div>
        <span class="text-gray-600 font-medium ml-2">Just a sec...</span>
    `;
    chatContainer.appendChild(typingIndicatorContainer);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return typingIndicatorContainer;
}

// --- Feature Toggles ---
function activateWebSearch() {
     if (!isPremium && !isAdmin && usageCounts.webSearches >= usageLimits.webSearches) {
        alert("Daily web search limit reached.");
        openSettingsModal(); switchSettingsTab('usage');
        return;
    }
    currentMode = 'web_search';
    const indicator = document.createElement('div');
    indicator.className = 'mode-indicator ml-2';
    indicator.innerHTML = `
        <svg class="h-4 w-4" viewBox="0 0 48 48"><path fill="#4CAF50" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
        <span>Web Search Active</span>
        <button id="close-search-mode-btn" class="ml-2">&times;</button>
    `;
    modeIndicatorContainer.innerHTML = '';
    modeIndicatorContainer.appendChild(indicator);
    document.getElementById('close-search-mode-btn').onclick = deactivateWebSearch;
    webSearchToggleBtn.classList.add('text-blue-600');
    messageInput.focus();
}

function deactivateWebSearch() {
    currentMode = null;
    modeIndicatorContainer.innerHTML = '';
    webSearchToggleBtn.classList.remove('text-blue-600');
}

webSearchToggleBtn.onclick = () => currentMode === 'web_search' ? deactivateWebSearch() : activateWebSearch();

// --- Voice Functions ---
function setVoiceUIState(state) {
    if (state === 'listening') {
        voiceStatusText.textContent = "Listening...";
        voiceVisualizer.classList.add('listening');
    } else if (state === 'thinking') {
        voiceStatusText.textContent = "Thinking...";
        voiceVisualizer.classList.remove('listening');
    }
}

function speakText(text, onEndCallback) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.replace(/[*_`#]/g, ''));
        utterance.lang = currentLang;
        utterance.onstart = () => isVoiceConversationActive && setVoiceUIState('speaking');
        utterance.onend = () => onEndCallback && onEndCallback();
        window.speechSynthesis.speak(utterance);
    }
}

function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognition = new SpeechRecognition();
    recognition.lang = currentLang;
    recognition.onstart = () => {
        if (isVoiceConversationActive) setVoiceUIState('listening');
        else messageInput.placeholder = "Listening...";
    };
    recognition.onresult = (event) => {
        let transcript = Array.from(event.results).map(r => r[0].transcript).join('');
        if (isVoiceConversationActive) voiceInterimTranscript.textContent = transcript;
        else messageInput.value = transcript;
    };
    recognition.onend = () => {
        if (isVoiceConversationActive && voiceInterimTranscript.textContent) sendMessage();
        else recognition.start();
    };
    recognition.start();
}

micBtn.onclick = () => { isVoiceConversationActive = false; startListening(); };
voiceModeBtn.onclick = () => {
    isVoiceConversationActive = true;
    voiceOverlay.classList.remove('hidden');
    startListening();
};
endVoiceBtn.onclick = () => {
    isVoiceConversationActive = false;
    voiceOverlay.classList.add('hidden');
    recognition.stop();
};


// --- Chat History Functions ---

async function saveChatSession() {
    if (isTemporaryChatActive || currentChat.length === 0) return;
    try {
        const response = await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: currentChatId,
                title: currentChat.find(m => m.sender === 'user')?.text.substring(0, 40) || 'Untitled',
                messages: currentChat
            })
        });
        if (response.ok) {
            const data = await response.json();
            currentChatId = data.id;
            loadChatsFromDB();
        }
    } catch (e) { console.error(e); }
}

async function saveTemporaryChatToDB() {
    if (currentChat.length === 0) return;
    try {
        const res = await fetch('/api/chats', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ messages: currentChat }) 
        });
        if (res.ok) {
            isTemporaryChatActive = false;
            tempChatBanner.classList.add('hidden');
            loadChatsFromDB();
        }
    } catch (e) { console.error(e); }
}

async function loadChatsFromDB() {
    try {
        const res = await fetch('/api/chats');
        if (res.ok) {
            chatHistory = await res.json();
            renderChatHistorySidebar();
        }
    } catch (e) { console.error(e); }
}


function renderChatHistorySidebar() {
    chatHistoryContainer.innerHTML = '';
    if (chatHistory.length === 0) {
         chatHistoryContainer.innerHTML = `<div class="p-2 text-sm text-gray-500">History empty.</div>`;
         return;
    }
    chatHistory.forEach(chat => {
        const item = document.createElement('div');
        item.className = `chat-history-item ${chat.id === currentChatId ? 'active' : ''}`;
        item.innerHTML = `<span class="chat-title">${chat.title}</span>`;
        item.onclick = () => loadChat(chat.id);
        chatHistoryContainer.appendChild(item);
    });
}

function loadChat(chatId) {
    const chat = chatHistory.find(c => c.id === chatId);
    if (!chat) return;
    currentChatId = chatId;
    currentChat = [...chat.messages];
    chatContainer.innerHTML = '';
    welcomeMessageContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    currentChat.forEach(msg => addMessage(msg));
}

function startNewChat() {
    currentChat = []; currentChatId = null;
    chatContainer.innerHTML = '';
    welcomeMessageContainer.classList.remove('hidden');
    chatContainer.classList.add('hidden');
    selectedFiles = [];
    renderAllFilePreviews();
}

// --- Library Functions ---
async function uploadFileToLibrary(file) {
    try {
        const formData = new FormData();
        const blob = await (await fetch(file.dataUrl)).blob();
        formData.append('file', blob, file.name);
        await fetch('/library/upload', { method: 'POST', body: formData });
    } catch(e) { console.error(e); }
}

libraryBtn.onclick = () => { libraryModal.classList.remove('hidden'); fetchLibraryFiles(); };
closeLibraryBtn.onclick = () => libraryModal.classList.add('hidden');

async function fetchLibraryFiles() {
    try {
        const res = await fetch('/library/files');
        const files = await res.json();
        libraryGrid.innerHTML = '';
        files.forEach(file => {
            const div = document.createElement('div');
            div.className = 'border p-2 rounded';
            div.innerHTML = `<p class="text-xs truncate">${file.fileName}</p>`;
            div.onclick = () => {
                selectedFiles.push({
                    name: file.fileName,
                    type: file.fileType,
                    dataUrl: `data:${file.fileType};base64,${file.fileData}`,
                    base64: file.fileData
                });
                renderAllFilePreviews();
                libraryModal.classList.add('hidden');
            };
            libraryGrid.appendChild(div);
        });
    } catch(e) { console.error(e); }
}

// --- Plan & Usage ---
function updateUsageUI() {
    sidebarUserPlan.textContent = isAdmin ? "Admin" : (isPremium ? "Pro" : "Free");
    const percentage = (usageCounts.messages / usageLimits.messages) * 100;
    usageProgressBar.style.width = `${percentage}%`;
    usageCounter.textContent = `${usageCounts.messages} / ${usageLimits.messages} messages`;
}

razorpayBtn.onclick = () => {
    // Razorpay logic here...
    isPremium = true; updateUsageUI();
};

// --- Init ---
async function initializeApp() {
    applyTheme(localStorage.getItem('theme') || 'system');
    populateLanguages();
    applyLanguage('en');
    loadChatsFromDB();
    
    try {
        const res = await fetch('/get_user_info');
        const data = await res.json();
        isAdmin = data.isAdmin; isPremium = data.isPremium;
        usageCounts = data.usageCounts || {messages: 0};
        updateUsageUI();
    } catch(e) { console.error(e); }
}

initializeApp();
