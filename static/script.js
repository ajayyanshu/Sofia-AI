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

// --- Global State ---
const markdownConverter = new showdown.Converter();

// CHANGED: Multiple files storage instead of single file
let filesData = []; // Array of objects {id, data, type, name}
let currentMode = null; 
let recognition;
let isVoiceConversationActive = false;
let isTemporaryChatActive = false;
let chatHistory = [];
let currentChat = [];
let currentChatId = null;

// NEW: Track message indices for feedback
let currentMessageIndex = 0;

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

// NEW: Track feedback data
let feedbackData = new Map(); // Map<messageIndex, {type: 'like'|'dislike', timestamp: Date}>

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
    fileInput.multiple = true;
    fileInput.click();
});

uploadCodeBtn.addEventListener('click', () => {
    fileInput.accept = ".txt,.py,.js,.java,.c,.cpp,.h,.html,.css,.json,.md,.sh,.rb,.go,.php,.swift,.kt";
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
        askAnything: 'कुछ भी पूँछें', 
        search: 'खोजें', 
        sofiaTitle: 'सोफिया एआई',
        uploadCode: 'कोड अपलोड करें',
        usagePlan: 'उपयोग और योजना',
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
            
            // The last row (save history) doesn't need translation updates as it's just checkmarks
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

// UPDATED: Handle multiple file selection
function handleFileSelect(event) {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    addMenu.classList.add('hidden');
    
    // Process each file
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
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
                    name: file.name
                });
                
                // Show preview for this file
                showFilePreview(file, fileId);
                
                // Show send button if we have any files
                if (filesData.length > 0) {
                    sendBtn.classList.remove('hidden');
                    micBtn.classList.add('hidden');
                    voiceModeBtn.classList.add('hidden');
                }
                
                // Show clear all button if we have files
                if (filesData.length > 0) {
                    clearAllFilesBtn.classList.remove('hidden');
                }
            };
        })(file);
        
        reader.onerror = function(error) {
            console.error("Error reading file:", error);
            addMessage({ text: "Sorry, there was an error reading your file.", sender: 'system'});
        };
        reader.readAsDataURL(file);
    }
}

// UPDATED: Show file preview with unique ID
function showFilePreview(file, fileId) {
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';
    previewItem.dataset.fileId = fileId;
    
    if (file.type.startsWith('image/')) {
        previewItem.classList.add('image-preview');
        previewItem.innerHTML = `
            <img src="data:${file.type};base64,${filesData.find(f => f.id === fileId)?.data}" alt="${file.name}">
            <button class="remove-preview-btn" data-fileid="${fileId}" title="Remove file">&times;</button>
            <span class="file-name-tag">${file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name}</span>
        `;
    } else {
        previewItem.classList.add('doc-preview');
        previewItem.innerHTML = `
            <div class="file-icon">
                <svg class="h-6 w-6 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            </div>
            <span class="file-name">${file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name}</span>
            <button class="remove-preview-btn" data-fileid="${fileId}" title="Remove file">&times;</button>
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

// UPDATED: Remove specific file by ID
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
        // Update clear all button visibility
        clearAllFilesBtn.classList.toggle('hidden', filesData.length === 0);
    }
}

// NEW: Clear all files function
function clearAllFiles() {
    filesData = [];
    filePreviewContainer.innerHTML = '';
    fileInput.value = '';
    
    if (messageInput.value.trim() === '') {
        sendBtn.classList.add('hidden');
        micBtn.classList.remove('hidden');
        voiceModeBtn.classList.remove('hidden');
    }
    
    clearAllFilesBtn.classList.add('hidden');
}

// NEW: Send feedback to backend
async function sendFeedback(feedbackType, messageIndex) {
    // Don't send feedback for temporary chats
    if (!currentChatId || isTemporaryChatActive) {
        console.log('Cannot send feedback for temporary chats');
        return;
    }
    
    try {
        const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: currentChatId,
                message_index: messageIndex,
                feedback_type: feedbackType
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log(`Feedback ${feedbackType} saved for message ${messageIndex}`);
            
            // Store feedback locally
            feedbackData.set(messageIndex, {
                type: feedbackType,
                timestamp: new Date()
            });
        } else {
            console.error('Failed to save feedback:', result.error);
        }
    } catch (error) {
        console.error('Error sending feedback:', error);
    }
}

// NEW: Load feedback for a chat
async function loadChatFeedback(chatId) {
    if (!chatId) return;
    
    try {
        const response = await fetch(`/api/feedback/chat/${chatId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                // Clear existing feedback data
                feedbackData.clear();
                
                // Populate feedback data
                data.feedback.forEach(item => {
                    feedbackData.set(item.message_index, {
                        type: item.feedback_type,
                        timestamp: new Date(item.timestamp)
                    });
                });
            }
        }
    } catch (error) {
        console.error('Error loading feedback:', error);
    }
}

// UPDATED: Send message with multiple files
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text && filesData.length === 0) return;
    
    if (!isAdmin && usageCounts.messages >= usageLimits.messages) {
        alert("You've reached your monthly message limit.");
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
    
    // Create file info array for display
    const fileInfoArray = filesData.map(file => ({
        name: file.name,
        type: file.type,
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

    try {
        // UPDATED: Send array of files to server
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: textToSend, 
                filesData: currentFilesData, // Send array of files
                isTemporary: isTemporaryChatActive,
                mode: modeForThisMessage 
            })
        });
        
        typingIndicator.remove();

        if (!response.ok) {
             const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server Error: ${response.status}`);
        }
        
        if (!isAdmin) {
            usageCounts.messages++;
            fetch('/update_usage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'message' }) });
            updateUsageUI();
        }

        const result = await response.json();
        const aiResponseText = result.response || "Sorry, I couldn't get a response.";
        
        const aiMessage = {
            text: aiResponseText,
            sender: 'ai',
            messageIndex: currentMessageIndex // Track message index for feedback
        };
        
        const aiMessageElement = addMessage(aiMessage, currentMessageIndex);
        currentChat.push(aiMessage);
        
        // Increment message index for next message
        currentMessageIndex++;
        
        saveChatSession();

        if (modeForThisMessage === 'voice_mode' && isVoiceConversationActive) {
            speakText(aiResponseText, startListening);
        }

    } catch (error) {
        typingIndicator.remove();
        console.error("API call failed:", error);
        
        const errorMessageText = `The AI service is currently unavailable. Please try again later.`;
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

// UPDATED: Add message with multiple files display and feedback tracking
function addMessage({text, sender, fileInfo = null, mode = null}, messageIndex = null) {
    if (sender === 'user') {
        const messageBubble = document.createElement('div');
        let fileHtml = '';
        
        // Handle multiple files
        if (fileInfo && Array.isArray(fileInfo) && fileInfo.length > 0) {
            fileInfo.forEach(file => {
                if (file.type.startsWith('image/')) {
                    fileHtml += `<img src="${file.dataUrl}" alt="User upload" class="rounded-lg mb-2 max-w-xs">`;
                } else {
                    fileHtml += `<div class="flex items-center bg-blue-100 rounded-lg p-2 mb-2">
                        <svg class="h-6 w-6 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span class="text-sm text-blue-800">${file.name}</span>
                    </div>`;
                }
            });
        }
        
        let modeHtml = '';
        if (mode === 'web_search' || mode === 'mic_input' || mode === 'voice_mode') {
            let modeText = 'Google Search';
            if (mode === 'mic_input') modeText = 'Voice Input';
            if (mode === 'voice_mode') modeText = 'Voice Mode';
            
            modeHtml = `<div class="mt-2 flex items-center gap-1.5"><div class="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg></div><span class="text-xs text-white/80">${modeText}</span></div>`;
        }

        messageBubble.innerHTML = fileHtml + `<div>${text}</div>` + modeHtml;
        messageBubble.className = 'message-bubble user-message ml-auto';
        chatContainer.appendChild(messageBubble);

        return messageBubble;

    } else if (sender === 'ai') {
        const aiMessageContainer = document.createElement('div');
        aiMessageContainer.className = 'ai-message-container';
        const avatar = `<div class="ai-avatar"><span class="text-2xl">🌎</span></div>`;
        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble ai-message';
        
        let contentHtml = markdownConverter.makeHtml(text);
        
        // Check if feedback exists for this message
        const existingFeedback = feedbackData.get(messageIndex);
        const isLiked = existingFeedback?.type === 'like';
        const isDisliked = existingFeedback?.type === 'dislike';
        
        const actionsHtml = `
            <div class="message-actions">
                <button class="action-btn copy-btn" title="Copy text">
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM5 11a1 1 0 100 2h4a1 1 0 100-2H5z"/></svg>
                </button>
                <button class="action-btn like-btn ${isLiked ? 'text-blue-600' : ''}" title="Good response" data-message-index="${messageIndex}">
                   <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.821 2.311l-1.055 1.636a1 1 0 00-1.423 .23z"/></svg>
                </button>
                <button class="action-btn dislike-btn ${isDisliked ? 'text-red-600' : ''}" title="Bad response" data-message-index="${messageIndex}">
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.642a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.821-2.311l1.055-1.636a1 1 0 001.423 .23z"/></svg>
                </button>
                <button class="action-btn speak-btn" title="Speak">
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828a1 1 0 010-1.415z" clip-rule="evenodd" /></svg>
                </button>
            </div>
        `;

        messageBubble.innerHTML = contentHtml + actionsHtml;
        
        aiMessageContainer.innerHTML = avatar;
        aiMessageContainer.appendChild(messageBubble);
        chatContainer.appendChild(aiMessageContainer);

        // Add copy code functionality
        const codeBlocks = messageBubble.querySelectorAll('pre');
        codeBlocks.forEach((pre) => {
            const copyButton = document.createElement('button');
            copyButton.className = 'code-copy-btn';
            copyButton.textContent = 'Copy Code';

            copyButton.addEventListener('click', () => {
                const code = pre.querySelector('code');
                if (code) {
                    navigator.clipboard.writeText(code.innerText);
                    copyButton.textContent = 'Copied!';
                    setTimeout(() => {
                        copyButton.textContent = 'Copy Code';
                    }, 2000);
                }
            });

            pre.appendChild(copyButton);
        });

        if (window.Prism) {
            Prism.highlightAll();
        }

        // Copy button functionality
        messageBubble.querySelector('.copy-btn').addEventListener('click', (e) => {
            const button = e.currentTarget;
            const originalContent = button.innerHTML;
            navigator.clipboard.writeText(text).then(() => {
                button.innerHTML = '<span class="text-xs">Copied!</span>';
                setTimeout(() => {
                    button.innerHTML = originalContent;
                }, 2000);
            });
        });

        // UPDATED: Like button with backend integration
        const likeBtn = messageBubble.querySelector('.like-btn');
        likeBtn.addEventListener('click', async (e) => {
            const button = e.currentTarget;
            const messageIndex = parseInt(button.dataset.messageIndex);
            const isCurrentlyLiked = button.classList.contains('text-blue-600');
            
            if (isCurrentlyLiked) {
                // Remove like
                button.classList.remove('text-blue-600');
                feedbackData.delete(messageIndex);
                
                // Send neutral feedback (no feedback)
                await sendFeedback('neutral', messageIndex);
            } else {
                // Add like
                button.classList.add('text-blue-600');
                messageBubble.querySelector('.dislike-btn').classList.remove('text-red-600');
                
                // Send like feedback
                await sendFeedback('like', messageIndex);
                feedbackData.set(messageIndex, { type: 'like', timestamp: new Date() });
            }
        });

        // UPDATED: Dislike button with backend integration
        const dislikeBtn = messageBubble.querySelector('.dislike-btn');
        dislikeBtn.addEventListener('click', async (e) => {
            const button = e.currentTarget;
            const messageIndex = parseInt(button.dataset.messageIndex);
            const isCurrentlyDisliked = button.classList.contains('text-red-600');
            
            if (isCurrentlyDisliked) {
                // Remove dislike
                button.classList.remove('text-red-600');
                feedbackData.delete(messageIndex);
                
                // Send neutral feedback (no feedback)
                await sendFeedback('neutral', messageIndex);
            } else {
                // Add dislike
                button.classList.add('text-red-600');
                messageBubble.querySelector('.like-btn').classList.remove('text-blue-600');
                
                // Send dislike feedback
                await sendFeedback('dislike', messageIndex);
                feedbackData.set(messageIndex, { type: 'dislike', timestamp: new Date() });
            }
        });

        // Speak button functionality
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

        return aiMessageContainer;

    } else if (sender === 'system') {
        const messageBubble = document.createElement('div');
        messageBubble.textContent = text;
        messageBubble.className = 'message-bubble system-message';
        chatContainer.appendChild(messageBubble);
        return messageBubble;
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addTypingIndicator() {
    const typingIndicatorContainer = document.createElement('div');
    typingIndicatorContainer.className = 'ai-message-container typing-indicator items-center';
    const animatedAvatarHTML = `
        <div class="ai-avatar-animated">
            <div class="orbiting-circle"></div>
            <span class="globe text-2xl">🌎</span>
        </div>
        <span class="text-gray-600 font-medium ml-2">Just a sec...</span>
    `;
    typingIndicatorContainer.innerHTML = animatedAvatarHTML;
    chatContainer.appendChild(typingIndicatorContainer);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return typingIndicatorContainer;
}

// --- Feature Toggles ---
function activateWebSearch() {
     if (!isAdmin && usageCounts.webSearches >= usageLimits.webSearches) {
        alert("You've reached your daily web search limit.");
        openSettingsModal();
        switchSettingsTab('usage');
        return;
    }
    currentMode = 'web_search';
    const indicator = document.createElement('div');
    indicator.className = 'mode-indicator ml-2';
    indicator.innerHTML = `
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 48 48"><path fill="#4CAF50" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FFC107" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#FF3D00" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.902,35.636,44,29.598,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
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
    webSearchToggleBtn.classList.add('text-blue-600');
    messageInput.focus();
}

function deactivateWebSearch() {
    currentMode = null;
    modeIndicatorContainer.innerHTML = '';
    webSearchToggleBtn.classList.remove('text-blue-600');
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
        voiceStatusText.textContent = "Listening...";
        voiceVisualizer.classList.add('listening');
        voiceVisualizer.classList.remove('bg-gray-500');
        voiceVisualizer.innerHTML = `<svg class="h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`;
    } else if (state === 'thinking') {
        voiceStatusText.textContent = "Thinking...";
        voiceVisualizer.classList.remove('listening');
        voiceVisualizer.classList.add('bg-gray-500');
        voiceVisualizer.innerHTML = `<div class="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>`;
    } else if (state === 'speaking') {
        voiceStatusText.textContent = "Sofia is speaking...";
        voiceVisualizer.classList.remove('listening');
        voiceVisualizer.classList.remove('bg-gray-500');
    }
}

function speakText(text, onEndCallback) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const cleanedText = text.replace(/[*_`#]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanedText);
        utterance.lang = currentLang;
        utterance.onstart = () => {
            if (isVoiceConversationActive) setVoiceUIState('speaking');
        };
        utterance.onend = () => { if(onEndCallback) onEndCallback(); };
        utterance.onerror = (event) => {
            console.error('SpeechSynthesisUtterance.onerror', event);
             if (isVoiceConversationActive) {
                addMessage({ text: 'Sorry, I had trouble speaking. Please try again.', sender: 'system' });
            }
            if(onEndCallback) onEndCallback();
        };
        window.speechSynthesis.speak(utterance);
    } else {
         addMessage({ text: 'Sorry, my voice response is not available on your browser.', sender: 'system' });
        if (onEndCallback) onEndCallback();
    }
}

function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Your browser does not support voice input. Please use Google Chrome or Edge.");
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

        recognition.onstart = () => {
            if (isVoiceConversationActive) {
                setVoiceUIState('listening');
            } else {
                micBtn.classList.add('text-red-600', 'animate-pulse');
                messageInput.placeholder = "Listening...";
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
                    try { recognition.start(); } catch(e) {}
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
                alert("Microphone access blocked. Please allow microphone permissions in your browser settings.");
            }
            if (isVoiceConversationActive) {
                endVoiceConversation();
            }
        };

        recognition.start();

    } catch (e) {
        console.error("Recognition start error", e);
        alert("Could not start microphone. Please check permissions.");
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
}

voiceModeBtn.addEventListener('click', startVoiceConversation);
endVoiceBtn.addEventListener('click', endVoiceConversation);


// --- Chat History Functions ---

// Function to render skeleton loader in sidebar
function showChatHistoryLoading() {
    chatHistoryContainer.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const item = document.createElement('div');
        item.className = 'history-skeleton-item';
        item.innerHTML = `
            <div class="skeleton-line title"></div>
            <div class="skeleton-line subtitle"></div>
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
        alert("Cannot save an empty chat.");
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
        
        // Load feedback for the newly saved chat
        await loadChatFeedback(currentChatId);
        
        renderChatHistorySidebar();

        saveToDbBtn.textContent = 'Saved!';
        setTimeout(() => {
            tempChatBanner.classList.add('hidden');
        }, 1500);

    } catch (error) {
        console.error("Error saving temporary chat:", error);
        alert("Could not save the chat. Please try again.");
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
         chatHistoryContainer.innerHTML = `<div class="p-2 text-sm text-gray-600 dark:text-gray-400" data-lang="chatHistoryEmpty">Your chat history will appear here.</div>`;
         applyLanguage(currentLang);
         return;
    }

    const sortedHistory = chatHistory.sort((a, b) => b.id - a.id);

    sortedHistory.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'chat-history-item group';
        if (chat.id === currentChatId) {
            item.classList.add('active');
        }
        item.dataset.chatId = chat.id;

        const titleSpan = document.createElement('span');
        titleSpan.className = 'chat-title';
        titleSpan.textContent = chat.title;
        titleSpan.addEventListener('click', () => loadChat(chat.id));
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'flex items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity';
        
        actionsDiv.innerHTML = `
            <button class="p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600" title="Rename">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
            </button>
            <button class="p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        `;

        actionsDiv.querySelector('button[title="Rename"]').addEventListener('click', (e) => {
            e.stopPropagation();
            renameChat(chat.id);
        });
        actionsDiv.querySelector('button[title="Delete"]').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        });

        item.appendChild(titleSpan);
        item.appendChild(actionsDiv);
        chatHistoryContainer.appendChild(item);
    });
}

async function renameChat(chatId) {
    const newTitle = prompt("Enter new chat title:");
    if (newTitle && newTitle.trim() !== '') {
        try {
            const response = await fetch(`/api/chats/${chatId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle.trim() })
            });
            if(response.ok) {
                loadChatsFromDB(); 
            } else {
                alert('Failed to rename chat.');
            }
        } catch(error) {
            console.error('Error renaming chat:', error);
            alert('An error occurred while renaming.');
        }
    }
}

async function deleteChat(chatId) {
    if (confirm('Are you sure you want to delete this chat? This will be permanent.')) {
         try {
            const response = await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
            if(response.ok) {
                if (currentChatId === chatId) {
                    startNewChat();
                }
                loadChatsFromDB(); 
            } else {
                alert('Failed to delete chat.');
            }
        } catch(error) {
             console.error('Error deleting chat:', error);
             alert('An error occurred while deleting.');
        }
    }
}

searchHistoryInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const items = chatHistoryContainer.querySelectorAll('.chat-history-item');
    items.forEach(item => {
        const title = item.querySelector('.chat-title').textContent.toLowerCase();
        if (title.includes(query)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
});

async function loadChat(chatId) {
    isTemporaryChatActive = false;
    tempChatBanner.classList.add('hidden');
    
    const chat = chatHistory.find(c => c.id === chatId);
    if (!chat) return;
    
    currentChatId = chatId;
    currentChat = [...chat.messages];

    // Reset message index and load feedback for this chat
    currentMessageIndex = 0;
    feedbackData.clear();
    await loadChatFeedback(chatId);

    chatContainer.innerHTML = '';
    welcomeMessageContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    document.body.classList.remove('initial-view');

    // Render messages with their feedback states
    currentChat.forEach((message, index) => {
        if (message.sender === 'ai') {
            addMessage(message, index);
            currentMessageIndex++;
        } else {
            addMessage(message);
        }
    });
    
    renderChatHistorySidebar();
}

function startNewChat() {
    if (!isTemporaryChatActive) {
        tempChatBanner.classList.add('hidden');
    }

    currentChat = [];
    currentChatId = null;
    currentMessageIndex = 0;
    feedbackData.clear();
    
    chatContainer.innerHTML = '';
    welcomeMessageContainer.classList.remove('hidden');
    chatContainer.classList.add('hidden');
    document.body.classList.add('initial-view');
    deactivateWebSearch();
    currentMode = null;
    clearAllFiles();
    messageInput.value = '';
    renderChatHistorySidebar();
    
    const welcomeH1 = welcomeMessageContainer.querySelector('h1');
    if (welcomeH1) {
        welcomeH1.id = 'welcome-text-animated';
        const textToType = translations[currentLang]['welcome'] || "What can I help with?";
        typeWriterEffect('welcome-text-animated', textToType);
    }
}

// --- Library Functions ---
function dataURLtoBlob(dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
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
    libraryGrid.innerHTML = '<p class="text-gray-500">Loading library...</p>';
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
        libraryGrid.innerHTML = '<p class="text-red-500">Could not load library. Please try again.</p>';
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
        item.className = 'relative group border rounded-lg p-2 flex flex-col items-center text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700';
        item.addEventListener('click', () => selectLibraryFile(file));

        let previewHtml = '';
        
        if (file.fileType.startsWith('image/')) {
            previewHtml = `<img src="data:${file.fileType};base64,${file.fileData}" alt="${file.fileName}" class="w-20 h-20 object-cover rounded-md mb-2">`;
        } else if (file.fileType.includes('pdf')) {
            previewHtml = `<svg class="w-20 h-20 mb-2 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>`;
        } else if (file.fileType.includes('word') || file.fileType.includes('document')) {
            previewHtml = `<svg class="w-20 h-20 mb-2 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`;
        } else if (file.fileType.includes('text/') || file.fileName.endsWith('.py') || file.fileName.endsWith('.js') || file.fileName.endsWith('.html')) {
            previewHtml = `<svg class="w-20 h-20 mb-2 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l-4 4-4-4M6 16l-4-4 4-4" /></svg>`;
        } else {
            previewHtml = `<svg class="w-20 h-20 mb-2 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>`;
        }
        
        item.innerHTML = `
            ${previewHtml}
            <p class="text-xs break-all w-full line-clamp-2">${file.fileName}</p>
            <button class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-opacity" title="Delete file">&times;</button>
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
    } catch (error) {
        console.error('Error deleting library file:', error);
        alert('Could not delete file.');
    }
}

function selectLibraryFile(file) {
    const fileId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Add to filesData array
    filesData.push({
        id: fileId,
        data: file.fileData,
        type: file.fileType,
        name: file.fileName
    });
    
    // Create a mock file object for preview
    const mockFile = {
        name: file.fileName,
        type: file.fileType
    };
    
    showFilePreview(mockFile, fileId);
    sendBtn.classList.remove('hidden');
    micBtn.classList.add('hidden');
    voiceModeBtn.classList.add('hidden');
    clearAllFilesBtn.classList.remove('hidden');
    closeLibraryModal();
}

libraryBtn.addEventListener('click', openLibraryModal);
closeLibraryBtn.addEventListener('click', closeLibraryModal);


// --- Plan, Usage & Payment Functions ---
function updateUsageUI() {
     if (isAdmin) {
        sidebarUserPlan.textContent = "Admin";
        usageTabBtn.classList.add('hidden');
        sidebarUsageDisplay.classList.add('hidden');
    } else {
        sidebarUserPlan.textContent = "Free";
        usageTabBtn.classList.remove('hidden');
        sidebarUsageDisplay.classList.remove('hidden');
        
        const percentage = Math.min((usageCounts.messages / usageLimits.messages) * 100, 100);
        
        const usedWord = translations[currentLang]['used'] || 'Used';
        const msgsUsedWord = translations[currentLang]['msgsUsedMonth'] || 'messages used this month';
        
        sidebarUsageDisplay.textContent = `${usageCounts.messages} / ${usageLimits.messages} ${usedWord}`;
        usageCounter.textContent = `${usageCounts.messages} / ${usageLimits.messages} ${msgsUsedWord}`;
        
        usageProgressBar.style.width = `${percentage}%`;
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
            avatarImg.src = `https://placehold.co/32x32/E2E8F0/4A5568?text=${userInitial}`;
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
            avatarImg.src = `https://placehold.co/32x32/E2E8F0/4A5568?text=!`;
        }
    }
}

function initializeApp() {
    // CHANGED: Default theme from 'system' to 'light'
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    // Update theme button selection
    const initialThemeBtn = document.getElementById(`theme-${savedTheme}`);
    if (initialThemeBtn) {
        // Remove selected classes from all theme buttons
        themeBtns.forEach(b => b.classList.remove('border-indigo-600', 'border-2', 'ring-2', 'ring-indigo-200'));
        // Add selected classes to the correct theme button
        initialThemeBtn.classList.add('border-indigo-600', 'border-2', 'ring-2', 'ring-indigo-200');
    }
    
    applyTheme(savedTheme);

    populateLanguages();
    applyLanguage(currentLang);
    loadChatsFromDB();
    
    fetchAndDisplayUserInfo();
    
    const welcomeH1 = document.querySelector('#welcome-message-container h1');
    if (welcomeH1) {
        welcomeH1.id = 'welcome-text-animated';
        const textToType = translations[currentLang]['welcome'] || "What can I help with?";
        typeWriterEffect('welcome-text-animated', textToType);
    }
    
    const handleLogout = async () => {
        try {
            const response = await fetch('/logout', { method: 'POST' });
            if(response.ok) {
                alert('You have been logged out.');
                window.location.href = '/login.html';
            } else {
                alert('Logout failed. Please try again.');
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert('An error occurred during logout.');
        }
    };

    const handleLogoutAll = async () => {
        if (!confirm('This will log you out from all other devices and this one. Are you sure?')) {
            return;
        }
        try {
            const response = await fetch('/logout-all', { method: 'POST' });
            if(response.ok) {
                alert('Successfully logged out of all devices.');
                window.location.href = '/login.html';
            } else {
                alert('Failed to log out of all devices. Please try again.');
            }
        } catch (error) {
            console.error('Logout all error:', error);
            alert('An error occurred while logging out of all devices.');
        }
    };
    
    logoutBtn.addEventListener('click', handleLogoutAll);
    logoutMenuItem.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
    });
    
    deleteAccountBtn.addEventListener('click', async () => {
        if(confirm('Are you sure you want to delete your account? This action is permanent and cannot be undone.')) {
             try {
                const response = await fetch('/delete_account', { method: 'DELETE' });
                if(response.ok) {
                    alert('Your account has been successfully deleted.');
                    window.location.href = '/login.html';
                } else {
                     const errorData = await response.json().catch(() => ({error: 'Server error'}));
                     alert(`Failed to delete account: ${errorData.error}`);
                }
            } catch (error) {
                 console.error('Delete account error:', error);
                 alert('An error occurred while deleting your account.');
            }
        }
    });
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
        }
    }
    type();
}

initializeApp();
