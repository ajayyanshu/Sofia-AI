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
const contactBtn = document.getElementById('contact-btn');
const contactMenuItem = document.getElementById('contact-menu-item');
const contactModal = document.getElementById('contact-modal');
const closeContactModalBtn = document.getElementById('close-contact-modal');
const telegramLinkDisplay = document.getElementById('telegram-link-display'); // Ensure this ID exists in HTML

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

// --- Global State ---
const telegramUsername = "sofiaaigroup";
let currentLang = 'en';

const translations = {
    'en': { 
        settings: 'Settings', 
        profile: 'Profile', 
        contactUs: 'Contact Us',
        telegram: 'Telegram',
        welcome: 'What can I help with?',
        logOut: 'Log out',
        delete: 'Delete',
        usagePlan: 'Usage & Plan'
        // ... (other keys)
    },
    'hi': { 
        settings: 'सेटिंग्स', 
        profile: 'प्रोफ़ाइल', 
        contactUs: 'हमसे संपर्क करें',
        telegram: 'टेलीग्राम',
        welcome: 'मैं आपकी क्या मदद कर सकता हूँ?',
        logOut: 'लॉग आउट',
        delete: 'हटाएं',
        usagePlan: 'उपयोग और योजना'
    },
    'bn': { 
        settings: 'সেটিংস', 
        profile: 'প্রোফাইল', 
        contactUs: 'আমাদের সাথে যোগাযোগ করুন',
        telegram: 'টেলিগ্রাম',
        welcome: 'আমি আপনাকে কীভাবে সাহায্য করতে পারি?',
        logOut: 'লগ আউট',
        delete: 'মুছুন',
        usagePlan: 'ব্যবহার এবং পরিকল্পনা'
    }
};

// --- Modified Language Logic ---
function applyLanguage(lang) {
    currentLang = lang;
    
    // Update Contact Us labels
    if (contactBtn) contactBtn.textContent = translations[lang]['contactUs'];
    if (contactMenuItem) {
        const span = contactMenuItem.querySelector('span');
        if (span) span.textContent = translations[lang]['contactUs'];
    }

    // Update Telegram Display
    if (telegramLinkDisplay) {
        telegramLinkDisplay.innerHTML = `<strong>${translations[lang]['telegram']}:</strong> @${telegramUsername}`;
    }

    // ... (rest of translation logic)
}

// --- Modified Profile Logic (Removed Email Verification) ---
async function fetchAndDisplayUserInfo() {
    try {
        const response = await fetch('/get_user_info');
        if (!response.ok) {
            window.location.href = '/login.html'; 
            return;
        }
        const userData = await response.json();
       
        isAdmin = userData.isAdmin || false;
        isPremium = userData.isPremium || false;
        usageCounts = userData.usageCounts || { messages: 0, webSearches: 0 };
        
        updateUsageUI();

        let displayName = userData.name || userData.email?.split('@')[0] || 'User';
        
        document.getElementById('profile-name').textContent = displayName;
        document.getElementById('sidebar-username').textContent = displayName;
        if (menuUsername) menuUsername.textContent = displayName;
        
        if (userData.email) {
             document.getElementById('profile-email').textContent = userData.email;
        }

        // Email verification UI elements are no longer updated here
    } catch (error) {
        console.error('Failed to fetch user info:', error);
    }
}

// --- Contact Modal Logic ---
function openContactModal() {
    if (!sidebar.classList.contains('-translate-x-full')) closeSidebar();
    if (userMenu && !userMenu.classList.contains('hidden')) userMenu.classList.add('hidden');
    
    // Dynamically inject Telegram ID if modal exists
    const contactInfoDiv = contactModal.querySelector('.contact-info-container');
    if (contactInfoDiv) {
        contactInfoDiv.innerHTML = `
            <div class="flex items-center gap-3 p-3 bg-blue-50 dark:bg-gray-700 rounded-lg mb-4">
                <svg class="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.52-1.4.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.42-1.4-.88.03-.24.31-.48.83-.73 3.24-1.41 5.41-2.35 6.51-2.81 3.11-1.31 3.76-1.54 4.18-1.54.09 0 .31.02.45.14.11.1.14.23.16.33-.01.08.01.23.01.23z"/>
                </svg>
                <div>
                    <p class="text-xs text-gray-500 dark:text-gray-400">${translations[currentLang]['telegram']}</p>
                    <a href="https://t.me/${telegramUsername}" target="_blank" class="text-blue-600 font-bold hover:underline">@${telegramUsername}</a>
                </div>
            </div>
        `;
    }

    contactModal.classList.remove('hidden');
    contactModal.classList.add('flex');
}

// ... (Rest of your existing functions)
