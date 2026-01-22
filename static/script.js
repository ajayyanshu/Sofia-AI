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
const clearAllFilesBtn = document.getElementById('clear-all-files-btn');

// Ethical Hacking Mode Elements
const cyberTrainingBtn = document.getElementById('cyber-training-btn');
const cyberModal = document.getElementById('cyber-modal');
const closeCyberModalBtn = document.getElementById('close-cyber-modal');
const toggleHackingModeBtn = document.getElementById('toggle-hacking-mode-btn');
const hackingModeStatusText = document.getElementById('hacking-mode-status-text');

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
const menuUsername = document.getElementById('menu-username');
const sidebarUserPlan = document.getElementById('sidebar-user-plan');
const sidebarUsageDisplay = document.getElementById('sidebar-usage-display');
const planTitle = document.getElementById('plan-title');
const usageCounter = document.getElementById('usage-counter');
const usageProgressBar = document.getElementById('usage-progress-bar');
const usagePlanSection = document.getElementById('usage-plan-section');

// Loading Overlay
const loadingOverlay = document.getElementById('loading-overlay');

// --- Global State ---
const markdownConverter = new showdown.Converter({
    simplifiedAutoLink: true,
    strikethrough: true,
    tables: true,
    tasklists: true,
    smoothLivePreview: true,
    simpleLineBreaks: true,
    openLinksInNewWindow: true
});

// Multiple files storage
let filesData = []; // Array of objects {id, data, type, name, size}
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
let isAdmin = false;

// File Upload Limits
const MAX_TOTAL_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'];
const ALLOWED_DOC_TYPES = ['pdf', 'doc', 'docx', 'txt'];
const ALLOWED_CODE_TYPES = ['py', 'js', 'java', 'c', 'cpp', 'h', 'html', 'css', 'json', 'md', 'sh', 'rb', 'go', 'php', 'swift', 'kt', 'ts', 'rs', 'cs', 'sql'];

// --- Helper Functions ---

function showLoading(show = true) {
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        type === 'warning' ? 'bg-yellow-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    toast.textContent = message;
    toast.style.animation = 'slideIn 0.3s ease-out';
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function validateFile(file) {
    const fileExt = file.name.split('.').pop().toLowerCase();
    const fileSize = file.size;
    
    // Check file size
    if (fileSize > MAX_TOTAL_FILE_SIZE) {
        return { valid: false, message: `File "${file.name}" is too large (max 10MB)` };
    }
    
    // Check file type
    let allowedTypes = [];
    const acceptAttr = fileInput.accept;
    
    if (acceptAttr.includes('image/*')) {
        allowedTypes = ALLOWED_IMAGE_TYPES;
    } else if (acceptAttr.includes('.txt,.py,.js')) {
        allowedTypes = ALLOWED_CODE_TYPES;
    } else {
        allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES, ...ALLOWED_CODE_TYPES];
    }
    
    if (!allowedTypes.includes(fileExt)) {
        return { valid: false, message: `File type .${fileExt} not allowed for "${file.name}"` };
    }
    
    // Check total size
    const totalSize = filesData.reduce((sum, f) => sum + f.size, 0) + fileSize;
    if (totalSize > MAX_TOTAL_FILE_SIZE) {
        return { valid: false, message: 'Total file size exceeds 10MB limit' };
    }
    
    return { valid: true, message: 'Valid' };
}

function getFileIcon(fileType, fileName) {
    if (fileType.startsWith('image/')) return '🖼️';
    
    const ext = fileName.split('.').pop().toLowerCase();
    
    // Code files
    if (['py', 'js', 'ts', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt'].includes(ext)) {
        return '💻';
    }
    
    // Web files
    if (['html', 'css', 'jsx', 'tsx', 'vue', 'svelte'].includes(ext)) {
        return '🌐';
    }
    
    // Documents
    if (['pdf'].includes(ext)) return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['txt', 'md'].includes(ext)) return '📄';
    
    // Data files
    if (['json', 'xml', 'csv', 'yaml', 'yml'].includes(ext)) return '📊';
    
    // Config files
    if (['env', 'config', 'ini', 'toml'].includes(ext)) return '⚙️';
    
    return '📎';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

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
messageInput.addEventListener('keydown', (e) => { 
    if (e.key === 'Enter' && !e.shiftKey) { 
        e.preventDefault(); 
        sendMessage(); 
    } 
});

// --- FILE UPLOAD LISTENERS ---
uploadFileBtn.addEventListener('click', () => {
    fileInput.accept = "image/*,.pdf,.doc,.docx,.txt";
    fileInput.multiple = true;
    fileInput.click();
});

uploadCodeBtn.addEventListener('click', () => {
    fileInput.accept = ".txt,.py,.js,.java,.c,.cpp,.h,.html,.css,.json,.md,.sh,.rb,.go,.php,.swift,.kt,.ts,.rs,.cs,.sql";
    fileInput.multiple = true;
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
    const shouldShowSend = hasText || filesData.length > 0;
    
    sendBtn.classList.toggle('hidden', !shouldShowSend);
    micBtn.classList.toggle('hidden', hasText);
    voiceModeBtn.classList.toggle('hidden', hasText);
});

saveToDbBtn.addEventListener('click', saveTemporaryChatToDB);

// Clear all files button event listener
clearAllFilesBtn.addEventListener('click', clearAllFiles);

// --- Settings Modal Logic ---
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
settingsModal.addEventListener('click', (e) => { 
    if (e.target === settingsModal) { 
        closeSettingsModal(); 
    } 
});

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
        ? "👨‍💻 **Ethical Hacking Teacher Mode Activated.**\n\nI am now Sofia-Sec-L, your expert Ethical Hacking instructor. I can help you with:\n• Penetration testing methodologies\n• Network security analysis\n• Vulnerability assessments\n• Secure coding practices\n• Defense strategies\n\nAsk me anything about cybersecurity!"
        : "🔄 **Standard Mode Restored.**\n\nI am back to being your general AI assistant.";
        
    addMessage({ text: statusMsg, sender: 'system' });
    
    if (isEthicalHackingMode) startNewChat(); 
});

function updateHackingModeUI() {
    const headerTitle = document.querySelector('header span');
    if (isEthicalHackingMode) {
        toggleHackingModeBtn.classList.remove('bg-gray-100', 'text-gray-800', 'dark:bg-gray-700', 'dark:text-white', 'hover:bg-green-600');
        toggleHackingModeBtn.classList.add('bg-green-600', 'text-white', 'hover:bg-red-600');
        hackingModeStatusText.textContent = "Disable Teacher Mode";
        
        // Update header with security indicator
        if (headerTitle) {
            headerTitle.innerHTML = 'Sofia AI <span class="text-xs text-green-600 dark:text-green-400 font-medium ml-2">🔒 Security Mode</span>';
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
        cyberTraining: 'Cyber Training',
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
        perDay: 'per day',
        perMonth: '1 per month (5 pages)',
        yesForever: '✔ Yes, Forever',
        msgsUsedMonth: 'messages used this month',
        freePlanTitle: 'Free Plan',
        used: 'Used',
        contactUs: 'Contact Us',
        email: 'Email',
        telegram: 'Telegram',
        contactMessage: "We'd love to hear from you!",
        filesSelected: 'files selected',
        clearAll: 'Clear All',
        remove: 'Remove'
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
        askAnything: 'कुछ भी पूँछें', 
        search: 'खोजें', 
        sofiaTitle: 'सोफिया एआई',
        uploadCode: 'कोड अपलोड करें',
        usagePlan: 'उपयोग और योजना',
        cyberTraining: 'साइबर प्रशिक्षण',
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
        perDay: 'प्रति दिन',
        perMonth: '1 प्रति माह (5 पृष्ठ)',
        yesForever: '✔ हाँ, हमेशा के लिए',
        msgsUsedMonth: 'इस महीने उपयोग किए गए संदेश',
        freePlanTitle: 'फ्री प्लान',
        used: 'उपयोग किया गया',
        contactUs: 'हमसे संपर्क करें',
        email: 'ईमेल',
        telegram: 'टेलीग्राम',
        contactMessage: 'हमें आपसे जानकर खुशी होगी!',
        filesSelected: 'फ़ाइलें चुनी गईं',
        clearAll: 'सभी साफ़ करें',
        remove: 'हटाएं'
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
        cyberTraining: 'সাইবার প্রশিক্ষণ',
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
        perDay: 'প্রতিদিন',
        perMonth: 'মাসে ১টি (৫ পৃষ্ঠা)',
        yesForever: '✔ হ্যাঁ, চিরকাল',
        msgsUsedMonth: 'এই মাসে ব্যবহৃত বার্তা',
        freePlanTitle: 'ফ্রি প্ল্যান',
        used: 'ব্যবহৃত',
        contactUs: 'আমাদের সাথে যোগাযোগ করুন',
        email: 'ইমেল',
        telegram: 'টেলিগ্রাম',
        contactMessage: 'আমরা আপনার কথা শুনতে চাই!',
        filesSelected: 'ফাইল নির্বাচন করা হয়েছে',
        clearAll: 'সব মুছুন',
        remove: 'অপসারণ'
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
        }

        const rows = planTable.querySelectorAll('.bg-gray-50 > div, .dark\\:bg-gray-800 > div');
        
        if (rows.length >= 4) {
            rows[0].children[0].textContent = translations[lang]['dailyTextMessages'];
            rows[0].children[1].textContent = `${usageLimits.messages} ${translations[lang]['messages']}`; 

            rows[1].children[0].textContent = translations[lang]['voiceCommands'];
            rows[1].children[1].textContent = `5 ${translations[lang]['perDay']}`;

            rows[2].children[0].textContent = translations[lang]['readDocs'];
            rows[2].children[1].textContent = translations[lang]['perMonth'];

            rows[3].children[0].textContent = translations[lang]['webSearchLimit'];
            rows[3].children[1].textContent = `1 ${translations[lang]['perDay']}`;
        }
    }

    if (planTitle) planTitle.textContent = translations[lang]['freePlanTitle'];

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

    // Update clear all button
    if (clearAllFilesBtn) {
        clearAllFilesBtn.innerHTML = `${translations[lang]['clearAll']} (${filesData.length})`;
    }

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
        document.documentElement.classList.remove('dark');
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

// Handle multiple file selection with validation
function handleFileSelect(event) {
    const selectedFiles = Array.from(event.target.files);
    if (!selectedFiles || selectedFiles.length === 0) return;

    addMenu.classList.add('hidden');
    
    // Clear previous validation errors
    const existingAlerts = filePreviewContainer.querySelectorAll('.file-error-alert');
    existingAlerts.forEach(alert => alert.remove());
    
    let validFilesCount = 0;
    
    // Process each file
    for (const file of selectedFiles) {
        const validation = validateFile(file);
        
        if (!validation.valid) {
            showToast(validation.message, 'error', 5000);
            continue;
        }
        
        const reader = new FileReader();
        
        reader.onload = (function(file) {
            return function(e) {
                const base64Data = e.target.result.split(',')[1];
                const fileId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                
                // Add to filesData array
                filesData.push({
                    id: fileId,
                    data: base64Data,
                    type: file.type,
                    name: file.name,
                    size: file.size,
                    icon: getFileIcon(file.type, file.name)
                });
                
                // Show preview for this file
                showFilePreview(file, fileId);
                validFilesCount++;
                
                // Update UI after all files are processed
                if (validFilesCount === selectedFiles.length) {
                    // Show send button if we have any files
                    if (filesData.length > 0) {
                        sendBtn.classList.remove('hidden');
                        micBtn.classList.add('hidden');
                        voiceModeBtn.classList.add('hidden');
                    }
                    
                    // Show clear all button if we have files
                    if (filesData.length > 0) {
                        clearAllFilesBtn.classList.remove('hidden');
                        clearAllFilesBtn.innerHTML = `${translations[currentLang]['clearAll']} (${filesData.length})`;
                    }
                    
                    // Show success message
                    if (validFilesCount > 0) {
                        showToast(`${validFilesCount} ${translations[currentLang]['filesSelected']}`, 'success');
                    }
                }
            };
        })(file);
        
        reader.onerror = function(error) {
            console.error("Error reading file:", error);
            showToast(`Error reading "${file.name}"`, 'error');
        };
        reader.readAsDataURL(file);
    }
}

// Show file preview with enhanced UI
function showFilePreview(file, fileId) {
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item group relative';
    previewItem.dataset.fileId = fileId;
    
    const fileIcon = getFileIcon(file.type, file.name);
    const fileSize = formatFileSize(file.size);
    
    if (file.type.startsWith('image/')) {
        previewItem.classList.add('image-preview', 'hover-scale');
        previewItem.innerHTML = `
            <div class="relative w-full h-20 rounded-lg overflow-hidden">
                <img src="data:${file.type};base64,${filesData.find(f => f.id === fileId)?.data}" 
                     alt="${file.name}" 
                     class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="remove-preview-btn bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center" 
                        data-fileid="${fileId}" 
                        title="${translations[currentLang]['remove']}">
                    &times;
                </button>
            </div>
            <div class="absolute bottom-1 left-1 right-1">
                <span class="text-xs text-white font-medium truncate block bg-black/50 backdrop-blur-sm rounded px-2 py-1">
                    ${file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name}
                </span>
            </div>
        `;
    } else {
        previewItem.classList.add('doc-preview', 'hover-lift');
        previewItem.innerHTML = `
            <div class="flex flex-col items-center justify-center h-20 p-3 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <span class="text-2xl mb-1">${fileIcon}</span>
                <span class="text-xs text-gray-600 dark:text-gray-300 truncate w-full text-center">
                    ${file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name}
                </span>
                <span class="text-xs text-gray-500 dark:text-gray-400 mt-1">${fileSize}</span>
            </div>
            <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="remove-preview-btn bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center" 
                        data-fileid="${fileId}" 
                        title="${translations[currentLang]['remove']}">
                    &times;
                </button>
            </div>
        `;
    }
    
    // Add click event to remove button
    const removeBtn = previewItem.querySelector('.remove-preview-btn');
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFile(fileId);
    });
    
    filePreviewContainer.appendChild(previewItem);
}

// Remove specific file by ID
window.removeFile = function(fileId) {
    // Remove from filesData array
    const fileIndex = filesData.findIndex(f => f.id === fileId);
    if (fileIndex > -1) {
        filesData.splice(fileIndex, 1);
    }
    
    // Remove from preview
    const previewItem = filePreviewContainer.querySelector(`[data-file-id="${fileId}"]`);
    if (previewItem) {
        previewItem.remove();
    }
    
    // Check if all files are removed
    if (filesData.length === 0 && messageInput.value.trim() === '') {
        sendBtn.classList.add('hidden');
        micBtn.classList.remove('hidden');
        voiceModeBtn.classList.remove('hidden');
        fileInput.value = '';
        clearAllFilesBtn.classList.add('hidden');
    } else {
        // Update clear all button
        clearAllFilesBtn.classList.remove('hidden');
        clearAllFilesBtn.innerHTML = `${translations[currentLang]['clearAll']} (${filesData.length})`;
    }
}

// Clear all files function
function clearAllFiles() {
    if (filesData.length === 0) return;
    
    filesData = [];
    filePreviewContainer.innerHTML = '';
    fileInput.value = '';
    
    if (messageInput.value.trim() === '') {
        sendBtn.classList.add('hidden');
        micBtn.classList.remove('hidden');
        voiceModeBtn.classList.remove('hidden');
    }
    
    clearAllFilesBtn.classList.add('hidden');
    showToast('All files cleared', 'success');
}

// Enhanced send message with file validation
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text && filesData.length === 0) return;
    
    // Check usage limits
    if (!isAdmin && usageCounts.messages >= usageLimits.messages) {
        showToast("You've reached your monthly message limit. Please upgrade.", 'error', 5000);
        if (isVoiceConversationActive) endVoiceConversation();
        openSettingsModal();
        switchSettingsTab('usage');
        return;
    }

    // Check web search limit if in web search mode
    if (currentMode === 'web_search' && !isAdmin && usageCounts.webSearches >= usageLimits.webSearches) {
        showToast("You've reached your daily web search limit.", 'error', 5000);
        deactivateWebSearch();
        return;
    }

    if (document.body.classList.contains('initial-view')) {
        document.body.classList.remove('initial-view');
        welcomeMessageContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
    }
    
    // Create file info array for display
    const fileInfoArray = filesData.map(file => ({
        name: file.name,
        type: file.type,
        icon: file.icon,
        dataUrl: `data:${file.type};base64,${file.data}`
    }));
    
    const userMessage = {
        text,
        sender: 'user',
        fileInfo: fileInfoArray.length > 0 ? fileInfoArray : null,
        mode: currentMode
    };
    addMessage(userMessage);
    currentChat.push(userMessage);

    messageInput.value = '';
    messageInput.dispatchEvent(new Event('input'));

    // Upload each file to library
    if (fileInfoArray.length > 0) {
        fileInfoArray.forEach(fileInfo => {
            uploadFileToLibrary(fileInfo);
        });
    }
    
    const modeForThisMessage = currentMode;
    const currentFilesData = [...filesData]; // Copy the array
    
    // Clear files after sending
    clearAllFiles();
    
    if (modeForThisMessage !== 'voice_mode') {
        deactivateWebSearch();
        currentMode = null;
    }
    
    const typingIndicator = addTypingIndicator();

    let textToSend = text;
    if (isEthicalHackingMode) {
        textToSend = `[SYSTEM: You are now an Expert Ethical Hacking Teacher named "Sofia-Sec-L".
        Your goal is to teach cybersecurity concepts with practical examples while emphasizing legal and ethical boundaries.
        
        GUIDELINES:
        1. Explain security concepts clearly (SQL Injection, XSS, Phishing, etc.)
        2. Provide practical examples but NEVER provide actual exploit code
        3. Always emphasize the importance of authorization and legal compliance
        4. Focus on defense strategies and mitigation techniques
        5. Use emojis like 🛡️, 💻, 🔐 to make learning engaging
        6. If asked for malicious code, refuse and explain how to defend against it instead
        
        Format your response with:
        - Clear headings
        - Bullet points for key concepts
        - Practical examples (with sanitized code)
        - Security recommendations
        - Legal/ethical considerations
        
        User Question: "${text}"]`;
    }

    try {
        // Prepare files data for sending
        const filesToSend = currentFilesData.map(file => ({
            data: file.data,
            type: file.type,
            name: file.name
        }));

        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: textToSend, 
                filesData: filesToSend,
                isTemporary: isTemporaryChatActive,
                mode: modeForThisMessage 
            })
        });
        
        typingIndicator.remove();

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 429) {
                showToast('Rate limit exceeded. Please try again later.', 'error');
                throw new Error('Rate limit exceeded');
            } else if (response.status === 413) {
                showToast('File too large. Maximum size is 10MB.', 'error');
                throw new Error('File too large');
            } else {
                throw new Error(errorData.error || `Server Error: ${response.status}`);
            }
        }
        
        // Update usage counts
        if (!isAdmin) {
            usageCounts.messages++;
            updateUsageUI();
            
            // Update web search count if applicable
            if (modeForThisMessage === 'web_search' || modeForThisMessage === 'security_search') {
                usageCounts.webSearches++;
                updateUsageUI();
            }
        }

        const result = await response.json();
        const aiResponseText = result.response || "Sorry, I couldn't get a response.";
        
        const aiMessage = {
            text: aiResponseText,
            sender: 'ai'
        };
        addMessage(aiMessage);
        currentChat.push(aiMessage);
        saveChatSession();

        if (modeForThisMessage === 'voice_mode' && isVoiceConversationActive) {
            speakText(aiResponseText, startListening);
        }

    } catch (error) {
        typingIndicator.remove();
        console.error("API call failed:", error);
        
        const errorMessageText = error.message.includes('Rate limit') 
            ? "Rate limit exceeded. Please wait a moment before trying again."
            : "The AI service is currently unavailable. Please try again later.";
        
        const errorMessage = {
            text: errorMessageText,
            sender: 'system'
        };
        addMessage(errorMessage);
        currentChat.push(errorMessage);
        saveChatSession();
        
        if (isVoiceConversationActive) {
            speakText(errorMessageText, startListening);
        }
    }
}

// Enhanced addMessage with security report card
function addMessage({text, sender, fileInfo = null, mode = null}) {
     if (sender === 'user') {
        const messageBubble = document.createElement('div');
        let fileHtml = '';
        
        // Handle multiple files
        if (fileInfo && Array.isArray(fileInfo) && fileInfo.length > 0) {
            fileInfo.forEach(file => {
                if (file.type.startsWith('image/')) {
                    fileHtml += `
                        <div class="mb-2">
                            <img src="${file.dataUrl}" alt="Uploaded image" 
                                 class="rounded-lg max-w-xs md:max-w-md border border-gray-200 dark:border-gray-700">
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">${file.name}</p>
                        </div>
                    `;
                } else {
                    fileHtml += `
                        <div class="flex items-center bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2 mb-2 border border-blue-100 dark:border-blue-800">
                            <span class="text-lg mr-2">${file.icon}</span>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-blue-800 dark:text-blue-200 truncate">${file.name}</p>
                                <p class="text-xs text-blue-600 dark:text-blue-300">${getFileIcon(file.type, file.name)}</p>
                            </div>
                        </div>
                    `;
                }
            });
        }
        
        let modeHtml = '';
        if (mode === 'web_search' || mode === 'mic_input' || mode === 'voice_mode') {
            let modeText = '🌐 Web Search';
            if (mode === 'mic_input') modeText = '🎤 Voice Input';
            if (mode === 'voice_mode') modeText = '🔊 Voice Mode';
            
            modeHtml = `
                <div class="mt-2 flex items-center gap-1.5">
                    <div class="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <span class="text-xs text-white/80">${modeText}</span>
                </div>
            `;
        }

        messageBubble.innerHTML = fileHtml + `<div class="text-white">${text}</div>` + modeHtml;
        messageBubble.className = 'message-bubble user-message ml-auto';
        chatContainer.appendChild(messageBubble);

    } else if (sender === 'ai') {
        const aiMessageContainer = document.createElement('div');
        aiMessageContainer.className = 'ai-message-container';
        
        const avatar = `
            <div class="ai-avatar flex-shrink-0">
                <span class="text-2xl">${isEthicalHackingMode ? '🛡️' : '🌎'}</span>
            </div>
        `;
        
        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble ai-message';
        
        // Check for security report card
        let contentHtml = '';
        if (text.includes('SECURITY SCAN RESULTS') || text.includes('Code Security Analysis Report')) {
            contentHtml = createSecurityReportCard(text);
        } else {
            contentHtml = markdownConverter.makeHtml(text);
        }
        
        const actionsHtml = `
            <div class="message-actions">
                <button class="action-btn copy-btn" title="Copy text">
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM5 11a1 1 0 100 2h4a1 1 0 100-2H5z"/>
                    </svg>
                </button>
                <button class="action-btn like-btn" title="Good response">
                   <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.821 2.311l-1.055 1.636a1 1 0 00-1.423 .23z"/>
                    </svg>
                </button>
                <button class="action-btn dislike-btn" title="Bad response">
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.642a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.821-2.311l1.055-1.636a1 1 0 001.423 .23z"/>
                    </svg>
                </button>
                <button class="action-btn speak-btn" title="Speak">
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828a1 1 0 010-1.415z" clip-rule="evenodd"/>
                    </svg>
                </button>
            </div>
        `;

        messageBubble.innerHTML = contentHtml + actionsHtml;
        
        aiMessageContainer.innerHTML = avatar;
        aiMessageContainer.appendChild(messageBubble);
        chatContainer.appendChild(aiMessageContainer);

        // Add copy functionality for code blocks
        const codeBlocks = messageBubble.querySelectorAll('pre');
        codeBlocks.forEach((pre) => {
            const copyButton = document.createElement('button');
            copyButton.className = 'code-copy-btn';
            copyButton.textContent = 'Copy Code';
            copyButton.setAttribute('aria-label', 'Copy code to clipboard');

            copyButton.addEventListener('click', () => {
                const code = pre.querySelector('code');
                if (code) {
                    navigator.clipboard.writeText(code.innerText)
                        .then(() => {
                            copyButton.textContent = 'Copied!';
                            copyButton.classList.add('bg-green-500');
                            setTimeout(() => {
                                copyButton.textContent = 'Copy Code';
                                copyButton.classList.remove('bg-green-500');
                            }, 2000);
                        })
                        .catch(err => {
                            console.error('Failed to copy: ', err);
                            copyButton.textContent = 'Failed';
                        });
                }
            });

            pre.appendChild(copyButton);
        });

        // Apply syntax highlighting if Prism is loaded
        if (window.Prism) {
            Prism.highlightAllUnder(messageBubble);
        }

        // Message actions
        const copyBtn = messageBubble.querySelector('.copy-btn');
        copyBtn.addEventListener('click', (e) => {
            const button = e.currentTarget;
            const originalContent = button.innerHTML;
            navigator.clipboard.writeText(text).then(() => {
                button.innerHTML = '<span class="text-xs">Copied!</span>';
                setTimeout(() => {
                    button.innerHTML = originalContent;
                }, 2000);
            });
        });

        const likeBtn = messageBubble.querySelector('.like-btn');
        likeBtn.addEventListener('click', (e) => {
            e.currentTarget.classList.toggle('text-blue-600');
            messageBubble.querySelector('.dislike-btn').classList.remove('text-red-600');
        });

        const dislikeBtn = messageBubble.querySelector('.dislike-btn');
        dislikeBtn.addEventListener('click', (e) => {
            e.currentTarget.classList.toggle('text-red-600');
            messageBubble.querySelector('.like-btn').classList.remove('text-blue-600');
        });

        const speakBtn = messageBubble.querySelector('.speak-btn');
        speakBtn.addEventListener('click', () => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                document.querySelectorAll('.speak-btn').forEach(btn => btn.classList.remove('text-green-600', 'animate-pulse'));
            } else {
                speakBtn.classList.add('text-green-600', 'animate-pulse');
                speakText(text, () => {
                    speakBtn.classList.remove('text-green-600', 'animate-pulse');
                });
            }
        });

    } else if (sender === 'system') {
        const messageBubble = document.createElement('div');
        messageBubble.textContent = text;
        messageBubble.className = 'message-bubble system-message bg-gradient-to-r from-blue-500 to-purple-600 text-white';
        chatContainer.appendChild(messageBubble);
    }
    
    // Scroll to bottom with smooth animation
    chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
    });
}

// Create security report card from scan results
function createSecurityReportCard(text) {
    let html = '';
    
    // Extract score if present
    const scoreMatch = text.match(/Total Issues Found:\s*(\d+)/i);
    const vulnerabilitiesMatch = text.match(/Critical Vulnerabilities:\s*(\d+)/i);
    
    if (scoreMatch && vulnerabilitiesMatch) {
        const totalIssues = parseInt(scoreMatch[1]);
        const criticalVulns = parseInt(vulnerabilitiesMatch[1]);
        
        // Determine risk level
        let riskLevel = 'Low';
        let riskColor = 'green';
        if (criticalVulns > 3) {
            riskLevel = 'Critical';
            riskColor = 'red';
        } else if (criticalVulns > 0) {
            riskLevel = 'Medium';
            riskColor = 'yellow';
        }
        
        html += `
            <div class="cyber-report-card mb-4">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-gray-800 dark:text-white">🔒 Security Analysis Report</h3>
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-${riskColor}-100 text-${riskColor}-800 dark:bg-${riskColor}-900 dark:text-${riskColor}-200">
                        ${riskLevel} Risk
                    </span>
                </div>
                
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <p class="text-sm text-gray-500 dark:text-gray-400">Total Issues</p>
                        <p class="text-2xl font-bold text-gray-800 dark:text-white">${totalIssues}</p>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <p class="text-sm text-gray-500 dark:text-gray-400">Critical Vulnerabilities</p>
                        <p class="text-2xl font-bold text-red-600 dark:text-red-400">${criticalVulns}</p>
                    </div>
                </div>
        `;
    }
    
    // Add the rest of the content
    const contentWithoutReport = text.replace(/SECURITY SCAN RESULTS:[\s\S]*?CODE TO ANALYZE:/i, '');
    html += markdownConverter.makeHtml(contentWithoutReport);
    
    if (scoreMatch) {
        html += '</div>'; // Close cyber-report-card
    }
    
    return html;
}

function addTypingIndicator() {
    const typingIndicatorContainer = document.createElement('div');
    typingIndicatorContainer.className = 'ai-message-container typing-indicator items-center';
    const animatedAvatarHTML = `
        <div class="ai-avatar-animated">
            <div class="orbiting-circle"></div>
            <span class="globe text-2xl">${isEthicalHackingMode ? '🛡️' : '🌎'}</span>
        </div>
        <div class="flex flex-col ml-3">
            <span class="text-gray-600 dark:text-gray-300 font-medium">Sofia AI is thinking</span>
            <div class="flex space-x-1 mt-1">
                <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            </div>
        </div>
    `;
    typingIndicatorContainer.innerHTML = animatedAvatarHTML;
    chatContainer.appendChild(typingIndicatorContainer);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return typingIndicatorContainer;
}

// --- Feature Toggles ---
function activateWebSearch() {
    if (!isAdmin && usageCounts.webSearches >= usageLimits.webSearches) {
        showToast("You've reached your daily web search limit.", 'error');
        openSettingsModal();
        switchSettingsTab('usage');
        return;
    }
    
    currentMode = 'web_search';
    const indicator = document.createElement('div');
    indicator.className = 'mode-indicator ml-2';
    indicator.innerHTML = `
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 48 48">
            <path fill="#4CAF50" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
            <path fill="#FFC107" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
            <path fill="#FF3D00" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.902,35.636,44,29.598,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
        </svg>
        <span>Web Search Active</span>
        <button id="close-search-mode-btn" class="ml-2 p-1 rounded-full hover:bg-indigo-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-indigo-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    `;
    modeIndicatorContainer.innerHTML = '';
    modeIndicatorContainer.appendChild(indicator);
    document.getElementById('close-search-mode-btn').addEventListener('click', deactivateWebSearch);
    webSearchToggleBtn.classList.add('text-blue-600', 'animate-pulse');
    messageInput.focus();
    
    showToast('Web search activated. Your next message will include live search results.', 'success');
}

function deactivateWebSearch() {
    currentMode = null;
    modeIndicatorContainer.innerHTML = '';
    webSearchToggleBtn.classList.remove('text-blue-600', 'animate-pulse');
    showToast('Web search deactivated.', 'info');
}

webSearchToggleBtn.addEventListener('click', () => {
    if (currentMode === 'web_search') {
        deactivateWebSearch();
    } else {
        activateWebSearch();
    }
});

// --- Voice Functions ---
function setVoiceUIState(state) {
    if (state === 'listening') {
        voiceStatusText.textContent = "Listening... Speak now";
        voiceVisualizer.classList.add('listening');
        voiceVisualizer.classList.remove('bg-gray-500');
        voiceVisualizer.innerHTML = `
            <div class="relative">
                <div class="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center">
                    <svg class="h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                </div>
                <div class="absolute -inset-2 border-4 border-indigo-200 rounded-full animate-ping"></div>
            </div>
        `;
    } else if (state === 'thinking') {
        voiceStatusText.textContent = "Processing your request...";
        voiceVisualizer.classList.remove('listening');
        voiceVisualizer.classList.add('bg-gray-500');
        voiceVisualizer.innerHTML = `
            <div class="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        `;
    } else if (state === 'speaking') {
        voiceStatusText.textContent = "Sofia AI is speaking...";
        voiceVisualizer.classList.remove('listening');
        voiceVisualizer.classList.remove('bg-gray-500');
        voiceVisualizer.innerHTML = `
            <div class="flex space-x-1">
                <div class="w-3 h-8 bg-white rounded-full animate-audio-wave" style="animation-delay: 0s"></div>
                <div class="w-3 h-12 bg-white rounded-full animate-audio-wave" style="animation-delay: 0.1s"></div>
                <div class="w-3 h-16 bg-white rounded-full animate-audio-wave" style="animation-delay: 0.2s"></div>
                <div class="w-3 h-12 bg-white rounded-full animate-audio-wave" style="animation-delay: 0.3s"></div>
                <div class="w-3 h-8 bg-white rounded-full animate-audio-wave" style="animation-delay: 0.4s"></div>
            </div>
        `;
    }
}

function speakText(text, onEndCallback) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const cleanedText = text.replace(/[*_`#\[\]]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanedText);
        utterance.lang = currentLang;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onstart = () => {
            if (isVoiceConversationActive) setVoiceUIState('speaking');
        };
        
        utterance.onend = () => { 
            if (onEndCallback) onEndCallback(); 
        };
        
        utterance.onerror = (event) => {
            console.error('SpeechSynthesisUtterance.onerror', event);
            if (isVoiceConversationActive) {
                showToast('Sorry, I had trouble speaking. Please try again.', 'error');
            }
            if (onEndCallback) onEndCallback();
        };
        
        window.speechSynthesis.speak(utterance);
    } else {
        showToast('Voice synthesis is not supported in your browser.', 'error');
        if (onEndCallback) onEndCallback();
    }
}

function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showToast("Voice input is not supported in your browser. Please use Google Chrome or Edge.", "error");
        return;
    }

    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }

    try {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = currentLang;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            if (isVoiceConversationActive) {
                setVoiceUIState('listening');
            } else {
                micBtn.classList.add('text-red-600', 'animate-pulse');
                messageInput.placeholder = "Listening...";
                showToast('Listening... Speak now', 'info');
            }
        };

        recognition.onend = () => {
            micBtn.classList.remove('text-red-600', 'animate-pulse');
            messageInput.placeholder = translations[currentLang]['askAnything'] || "Ask anything"; 
            
            if (isVoiceConversationActive) {
                 const finalTranscript = voiceInterimTranscript.textContent.trim();
                 if (finalTranscript) {
                    messageInput.value = finalTranscript;
                    sendMessage();
                    setVoiceUIState('thinking');
                 } else {
                    // Restart listening if no transcript
                    setTimeout(() => {
                        try { recognition.start(); } catch(e) {
                            console.error('Failed to restart recognition:', e);
                        }
                    }, 500);
                 }
            }
        };

        recognition.onresult = (event) => {
            let interim_transcript = '';
            let final_transcript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final_transcript += event.results[i][0].transcript;
                } else {
                    interim_transcript += event.results[i][0].transcript;
                }
            }

            if (!isVoiceConversationActive) {
                messageInput.value = final_transcript || interim_transcript;
                messageInput.style.height = 'auto';
                messageInput.style.height = `${messageInput.scrollHeight}px`;
                if (final_transcript || interim_transcript) {
                    sendBtn.classList.remove('hidden');
                    micBtn.classList.add('hidden');
                    voiceModeBtn.classList.add('hidden');
                }
            } else {
                voiceInterimTranscript.textContent = final_transcript || interim_transcript;
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            micBtn.classList.remove('text-red-600', 'animate-pulse');
            messageInput.placeholder = "Error. Try again.";
            
            if (event.error === 'not-allowed') {
                showToast('Microphone access blocked. Please allow microphone permissions.', 'error');
            } else if (event.error === 'no-speech') {
                showToast('No speech detected. Please try again.', 'warning');
            } else if (event.error === 'audio-capture') {
                showToast('No microphone found. Please check your microphone.', 'error');
            }
            
            if (isVoiceConversationActive) {
                endVoiceConversation();
            }
        };

        recognition.start();

    } catch (e) {
        console.error("Recognition start error", e);
        showToast("Could not start microphone. Please check permissions.", "error");
    }
}

micBtn.addEventListener('click', () => {
    currentMode = 'mic_input';
    isVoiceConversationActive = false;
    startListening();
});

function startVoiceConversation() {
    if ('speechSynthesis' in window && window.speechSynthesis.getVoices().length === 0) {
         window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    }
    window.speechSynthesis.cancel();
    
    currentMode = 'voice_mode';
    isVoiceConversationActive = true;
    voiceOverlay.classList.remove('hidden');
    voiceOverlay.classList.add('flex');
    voiceInterimTranscript.textContent = '';
    showToast('Voice conversation started. Click "End Conversation" when done.', 'success');
    startListening();
}

function endVoiceConversation() {
    isVoiceConversationActive = false;
    voiceOverlay.classList.add('hidden');
    if (recognition) {
        recognition.abort();
    }
    window.speechSynthesis.cancel();
    currentMode = null;
    showToast('Voice conversation ended.', 'info');
}

voiceModeBtn.addEventListener('click', startVoiceConversation);
endVoiceBtn.addEventListener('click', endVoiceConversation);

// --- Chat History Functions ---

function showChatHistoryLoading() {
    chatHistoryContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const item = document.createElement('div');
        item.className = 'history-skeleton-item animate-pulse';
        item.innerHTML = `
            <div class="skeleton-line title bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800"></div>
            <div class="skeleton-line subtitle bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800"></div>
        `;
        chatHistoryContainer.appendChild(item);
    }
}

async function saveChatSession() {
    if (isTemporaryChatActive || currentChat.length === 0) {
        return;
    }

    try {
        const response = await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: currentChatId,
                title: currentChat.find(m => m.sender === 'user')?.text.substring(0, 40) || 'Untitled Chat',
                messages: currentChat
            })
        });
        
        if (response.ok) {
            const savedChat = await response.json();
            if (!currentChatId) {
                currentChatId = savedChat.id;
            }
            loadChatsFromDB();
        } else {
            console.error('Failed to save chat session to DB');
        }
    } catch (error) {
        console.error('Error saving chat session:', error);
    }
}

async function saveTemporaryChatToDB() {
    if (currentChat.length === 0) {
        showToast("Cannot save an empty chat.", 'warning');
        return;
    }

    saveToDbBtn.textContent = 'Saving...';
    saveToDbBtn.disabled = true;

    try {
        const response = await fetch('/api/chats', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: currentChat })
        });

        if (!response.ok) {
            throw new Error('Failed to save chat to the database.');
        }

        const savedChat = await response.json();

        isTemporaryChatActive = false;
        
        currentChatId = savedChat.id; 
        chatHistory.unshift({ id: savedChat.id, title: savedChat.title, messages: [...currentChat] });
        renderChatHistorySidebar();

        saveToDbBtn.textContent = 'Saved!';
        setTimeout(() => {
            tempChatBanner.classList.add('hidden');
            showToast('Chat saved successfully!', 'success');
        }, 1500);

    } catch (error) {
        console.error("Error saving temporary chat:", error);
        showToast("Could not save the chat. Please try again.", 'error');
        saveToDbBtn.textContent = 'Save Chat';
        saveToDbBtn.disabled = false;
    }
}

async function loadChatsFromDB() {
    showChatHistoryLoading();

    try {
        const response = await fetch('/api/chats');
        if (response.ok) {
            chatHistory = await response.json();
            renderChatHistorySidebar();
        } else {
            console.error('Failed to load chats from DB');
            chatHistoryContainer.innerHTML = `<div class="p-2 text-sm text-red-500">Could not load history.</div>`;
        }
    } catch (error) {
        console.error('Error loading chats:', error);
        chatHistoryContainer.innerHTML = `<div class="p-2 text-sm text-red-500">Error loading history.</div>`;
    }
}

function renderChatHistorySidebar() {
    chatHistoryContainer.innerHTML = '';
    
    if (chatHistory.length === 0) {
        chatHistoryContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center p-6 text-center">
                <div class="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <svg class="w-8 h-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400" data-lang="chatHistoryEmpty">Your chat history will appear here.</p>
            </div>
        `;
        applyLanguage(currentLang);
        return;
    }

    const sortedHistory = [...chatHistory].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    sortedHistory.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'chat-history-item group';
        if (chat.id === currentChatId) {
            item.classList.add('active', 'border-l-4', 'border-indigo-500');
        }
        item.dataset.chatId = chat.id;

        // Get first user message for preview
        const firstUserMessage = chat.messages?.find(m => m.sender === 'user')?.text || 'No messages';
        const previewText = firstUserMessage.length > 30 ? firstUserMessage.substring(0, 30) + '...' : firstUserMessage;
        
        item.innerHTML = `
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                    <span class="chat-title font-medium text-gray-800 dark:text-gray-200 truncate">${chat.title || 'Untitled Chat'}</span>
                    ${chat.id === currentChatId ? '<span class="text-xs text-indigo-500 font-semibold">• Current</span>' : ''}
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${previewText}</p>
            </div>
            <div class="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                <button class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400" title="Rename">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" />
                    </svg>
                </button>
                <button class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400" title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        `;

        // Add click event to load chat
        item.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                loadChat(chat.id);
            }
        });

        // Add button events
        const renameBtn = item.querySelector('button[title="Rename"]');
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            renameChat(chat.id, chat.title);
        });

        const deleteBtn = item.querySelector('button[title="Delete"]');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        });

        chatHistoryContainer.appendChild(item);
    });
}

async function renameChat(chatId, currentTitle) {
    const newTitle = prompt("Enter new chat title:", currentTitle || '');
    if (newTitle && newTitle.trim() !== '' && newTitle !== currentTitle) {
        try {
            const response = await fetch(`/api/chats/${chatId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle.trim() })
            });
            
            if(response.ok) {
                loadChatsFromDB();
                showToast('Chat renamed successfully!', 'success');
            } else {
                showToast('Failed to rename chat.', 'error');
            }
        } catch(error) {
            console.error('Error renaming chat:', error);
            showToast('An error occurred while renaming.', 'error');
        }
    }
}

async function deleteChat(chatId) {
    if (confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
        try {
            const response = await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
            if(response.ok) {
                if (currentChatId === chatId) {
                    startNewChat();
                }
                loadChatsFromDB();
                showToast('Chat deleted successfully!', 'success');
            } else {
                showToast('Failed to delete chat.', 'error');
            }
        } catch(error) {
            console.error('Error deleting chat:', error);
            showToast('An error occurred while deleting.', 'error');
        }
    }
}

searchHistoryInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const items = chatHistoryContainer.querySelectorAll('.chat-history-item');
    
    if (!query.trim()) {
        items.forEach(item => item.style.display = 'flex');
        return;
    }
    
    let visibleCount = 0;
    items.forEach(item => {
        const title = item.querySelector('.chat-title').textContent.toLowerCase();
        const preview = item.querySelector('p').textContent.toLowerCase();
        
        if (title.includes(query) || preview.includes(query)) {
            item.style.display = 'flex';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Show no results message
    const noResultsMsg = chatHistoryContainer.querySelector('.no-results-message');
    if (visibleCount === 0) {
        if (!noResultsMsg) {
            const msg = document.createElement('div');
            msg.className = 'no-results-message p-4 text-center text-gray-500 text-sm';
            msg.textContent = 'No matching chats found';
            chatHistoryContainer.appendChild(msg);
        }
    } else if (noResultsMsg) {
        noResultsMsg.remove();
    }
});

function loadChat(chatId) {
    isTemporaryChatActive = false;
    tempChatBanner.classList.add('hidden');
    
    const chat = chatHistory.find(c => c.id === chatId);
    if (!chat) return;
    
    currentChatId = chatId;
    currentChat = [...chat.messages];

    chatContainer.innerHTML = '';
    welcomeMessageContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    document.body.classList.remove('initial-view');

    currentChat.forEach(message => addMessage(message));
    renderChatHistorySidebar();
    
    // Update hacking mode UI when chat loads
    updateHackingModeUI();
    
    showToast('Chat loaded', 'success');
}

function startNewChat() {
    if (!isTemporaryChatActive) {
        tempChatBanner.classList.add('hidden');
    }

    currentChat = [];
    currentChatId = null;
    
    chatContainer.innerHTML = '';
    welcomeMessageContainer.classList.remove('hidden');
    chatContainer.classList.add('hidden');
    document.body.classList.add('initial-view');
    deactivateWebSearch();
    currentMode = null;
    clearAllFiles();
    messageInput.value = '';
    renderChatHistorySidebar();
    
    // Update hacking mode UI when starting new chat
    updateHackingModeUI();
    
    const welcomeH1 = welcomeMessageContainer.querySelector('h1');
    if (welcomeH1) {
        welcomeH1.id = 'welcome-text-animated';
        const textToType = translations[currentLang]['welcome'] || "What can I help with?";
        typeWriterEffect('welcome-text-animated', textToType);
    }
}

// --- Library Functions ---
function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i);
    }
    return new Blob([u8arr], {type: mime});
}

async function uploadFileToLibrary(fileInfo) {
    try {
        const blob = dataURLtoBlob(fileInfo.dataUrl);
        const formData = new FormData();
        formData.append('file', blob, fileInfo.name);
        
        const response = await fetch('/library/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Auto-save to library failed');
        }
        
        if (!libraryModal.classList.contains('hidden')) {
            fetchLibraryFiles();
        }
    } catch(error) {
        console.error('Error auto-saving to library:', error);
    }
}

function openLibraryModal() {
    libraryModal.classList.remove('hidden');
    libraryModal.classList.add('flex');
    fetchLibraryFiles();
}

function closeLibraryModal() {
    libraryModal.classList.add('hidden');
    libraryModal.classList.remove('flex');
}

async function fetchLibraryFiles() {
    libraryGrid.innerHTML = `
        <div class="col-span-full flex justify-center items-center p-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
    `;
    libraryEmptyMsg.classList.add('hidden');

    try {
        const response = await fetch('/library/files');
        if (!response.ok) {
            throw new Error('Failed to fetch library files.');
        }
        const files = await response.json();
        renderLibraryFiles(files);
    } catch (error) {
        console.error('Error fetching library files:', error);
        libraryGrid.innerHTML = `
            <div class="col-span-full text-center p-4">
                <div class="text-red-500 mb-2">⚠️</div>
                <p class="text-red-500">Could not load library. Please try again.</p>
            </div>
        `;
    }
}

function renderLibraryFiles(files) {
    libraryGrid.innerHTML = '';
    if (!files || files.length === 0) {
        libraryEmptyMsg.classList.remove('hidden');
        libraryGrid.appendChild(libraryEmptyMsg);
        return;
    }

    libraryEmptyMsg.classList.add('hidden');

    files.forEach(file => {
        const item = document.createElement('div');
        item.className = 'group relative border rounded-lg p-3 flex flex-col items-center text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors hover-lift';
        item.addEventListener('click', () => selectLibraryFile(file));
        
        const fileExt = file.fileName.split('.').pop().toLowerCase();
        const fileIcon = getFileIcon(file.fileType, file.fileName);
        
        item.innerHTML = `
            <div class="w-16 h-16 mb-3 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                <span class="text-3xl">${fileIcon}</span>
            </div>
            <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate w-full mb-1">
                ${file.originalFileName || file.fileName}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
                ${formatFileSize(file.fileSize)} • ${fileExt.toUpperCase()}
            </p>
            <button class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all transform hover:scale-110"
                    title="Delete file">
                &times;
            </button>
        `;
        
        item.querySelector('button').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteLibraryFile(file._id);
        });

        libraryGrid.appendChild(item);
    });
}

async function deleteLibraryFile(fileId) {
    if (!confirm("Are you sure you want to delete this file from your library?")) return;
    
    try {
        const response = await fetch(`/library/files/${fileId}`, { method: 'DELETE' });
        if (!response.ok) {
            throw new Error('Deletion failed');
        }
        fetchLibraryFiles();
        showToast('File deleted from library', 'success');
    } catch (error) {
        console.error('Error deleting library file:', error);
        showToast('Could not delete file.', 'error');
    }
}

function selectLibraryFile(file) {
    const fileId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Add to filesData array
    filesData.push({
        id: fileId,
        data: file.fileData,
        type: file.fileType,
        name: file.fileName,
        size: file.fileSize,
        icon: getFileIcon(file.fileType, file.fileName)
    });
    
    // Create a mock file object for preview
    const mockFile = {
        name: file.originalFileName || file.fileName,
        type: file.fileType,
        size: file.fileSize
    };
    
    showFilePreview(mockFile, fileId);
    sendBtn.classList.remove('hidden');
    micBtn.classList.add('hidden');
    voiceModeBtn.classList.add('hidden');
    clearAllFilesBtn.classList.remove('hidden');
    clearAllFilesBtn.innerHTML = `${translations[currentLang]['clearAll']} (${filesData.length})`;
    closeLibraryModal();
    
    showToast('File added to message', 'success');
}

libraryBtn.addEventListener('click', openLibraryModal);
closeLibraryBtn.addEventListener('click', closeLibraryModal);

// --- Plan, Usage & Payment Functions ---
function updateUsageUI() {
    if (isAdmin) {
        sidebarUserPlan.textContent = "Admin";
        sidebarUserPlan.className = "text-xs text-purple-600 dark:text-purple-400 font-semibold";
        usageTabBtn.classList.add('hidden');
        sidebarUsageDisplay.classList.add('hidden');
    } else {
        sidebarUserPlan.textContent = "Free";
        sidebarUserPlan.className = "text-xs text-gray-500 dark:text-gray-400";
        usageTabBtn.classList.remove('hidden');
        sidebarUsageDisplay.classList.remove('hidden');
        
        const percentage = Math.min((usageCounts.messages / usageLimits.messages) * 100, 100);
        
        const usedWord = translations[currentLang]['used'] || 'Used';
        const msgsUsedWord = translations[currentLang]['msgsUsedMonth'] || 'messages used this month';
        
        sidebarUsageDisplay.textContent = `${usageCounts.messages} / ${usageLimits.messages} ${usedWord}`;
        usageCounter.textContent = `${usageCounts.messages} / ${usageLimits.messages} ${msgsUsedWord}`;
        
        usageProgressBar.style.width = `${percentage}%`;
        usageProgressBar.className = percentage > 80 ? 'bg-red-600 h-2.5 rounded-full' : 
                                     percentage > 50 ? 'bg-yellow-500 h-2.5 rounded-full' : 
                                     'bg-blue-600 h-2.5 rounded-full';
    }
}

// --- Initializations ---
async function fetchAndDisplayUserInfo() {
    try {
        const response = await fetch('/get_user_info');
        if (!response.ok) {
            window.location.href = '/login.html'; 
            return;
        }
        const userData = await response.json();
       
        isAdmin = userData.isAdmin || false;
        usageCounts = userData.usageCounts || { messages: 0, webSearches: 0 };
        
        updateUsageUI();

        let userInitial = 'U';
        let displayName = 'User';

        if(userData.name) {
            displayName = userData.name;
            userInitial = userData.name.charAt(0).toUpperCase();
        } else if (userData.email) {
            displayName = userData.email.split('@')[0];
            userInitial = userData.email.charAt(0).toUpperCase();
        }
        
        document.getElementById('profile-name').textContent = displayName;
        document.getElementById('sidebar-username').textContent = displayName;
        menuUsername.textContent = displayName;
        
        const avatarImg = document.getElementById('sidebar-user-avatar');
        if (avatarImg) {
            avatarImg.src = `https://ui-avatars.com/api/?name=${userInitial}&background=6366f1&color=fff&bold=true&size=128`;
        }

        if(userData.email) {
            document.getElementById('profile-email').textContent = userData.email;
        } else {
            document.getElementById('profile-email').textContent = 'N/A';
        }

    } catch (error) {
        console.error('Failed to fetch user info:', error);
        document.getElementById('profile-name').textContent = 'Error loading user';
        document.getElementById('profile-email').textContent = 'Please refresh';
        document.getElementById('sidebar-username').textContent = 'Error';
        const avatarImg = document.getElementById('sidebar-user-avatar');
        if (avatarImg) {
            avatarImg.src = `https://ui-avatars.com/api/?name=!&background=ef4444&color=fff&bold=true`;
        }
    }
}

function initializeApp() {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'system';
    const initialThemeBtn = document.getElementById(`theme-${savedTheme}`);
    if (initialThemeBtn) initialThemeBtn.click();
    applyTheme(savedTheme);

    // Load language
    const savedLang = localStorage.getItem('language') || 'en';
    currentLang = savedLang;
    populateLanguages();
    applyLanguage(currentLang);
    
    // Save language preference
    languageSelect.addEventListener('change', (e) => {
        localStorage.setItem('language', e.target.value);
    });

    // Load initial data
    loadChatsFromDB();
    fetchAndDisplayUserInfo();
    
    // Initialize hacking mode UI
    updateHackingModeUI();
    
    // Initialize welcome message
    const welcomeH1 = document.querySelector('#welcome-message-container h1');
    if (welcomeH1) {
        welcomeH1.id = 'welcome-text-animated';
        const textToType = translations[currentLang]['welcome'] || "What can I help with?";
        typeWriterEffect('welcome-text-animated', textToType);
    }
    
    // Initialize logout handlers
    const handleLogout = async () => {
        try {
            const response = await fetch('/logout', { method: 'POST' });
            if(response.ok) {
                showToast('You have been logged out.', 'success');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 1000);
            } else {
                showToast('Logout failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Logout error:', error);
            showToast('An error occurred during logout.', 'error');
        }
    };

    const handleLogoutAll = async () => {
        if (!confirm('This will log you out from all other devices and this one. Are you sure?')) {
            return;
        }
        try {
            const response = await fetch('/logout-all', { method: 'POST' });
            if(response.ok) {
                showToast('Successfully logged out of all devices.', 'success');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 1000);
            } else {
                showToast('Failed to log out of all devices. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Logout all error:', error);
            showToast('An error occurred while logging out of all devices.', 'error');
        }
    };
    
    logoutBtn.addEventListener('click', handleLogoutAll);
    logoutMenuItem.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
    });
    
    deleteAccountBtn.addEventListener('click', async () => {
        if(confirm('Are you sure you want to delete your account? This action is permanent and cannot be undone.\n\nAll your data will be permanently deleted.')) {
            try {
                const response = await fetch('/delete_account', { method: 'DELETE' });
                if(response.ok) {
                    showToast('Your account has been successfully deleted.', 'success');
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 1500);
                } else {
                    const errorData = await response.json().catch(() => ({error: 'Server error'}));
                    showToast(`Failed to delete account: ${errorData.error}`, 'error');
                }
            } catch (error) {
                console.error('Delete account error:', error);
                showToast('An error occurred while deleting your account.', 'error');
            }
        }
    });
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        @keyframes audio-wave {
            0%, 100% { height: 8px; }
            50% { height: 16px; }
        }
        
        .animate-audio-wave {
            animation: audio-wave 1s ease-in-out infinite;
        }
        
        .toast-notification {
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
    `;
    document.head.appendChild(style);
}

function typeWriterEffect(elementId, text, speed = 40) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.innerHTML = ''; 
    element.classList.add('typing-cursor'); 
    
    let i = 0;
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        } else {
            element.classList.remove('typing-cursor');
        }
    }
    type();
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Export functions for global access (if needed)
window.removeFile = removeFile;
window.clearAllFiles = clearAllFiles;
