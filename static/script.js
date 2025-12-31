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
const voiceVisualizer = document.getElementById('voice-visualizer'); // Now targets the <img> tag
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

contactBtn.addEventListener('click', openContactModal);
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

function updateHackingModeUI() {
    if (isEthicalHackingMode) {
        toggleHackingModeBtn.classList.remove('bg-gray-100', 'text-gray-800', 'dark:bg-gray-700', 'dark:text-white', 'hover:bg-green-600');
        toggleHackingModeBtn.classList.add('bg-green-600', 'text-white', 'hover:bg-red-600');
        hackingModeStatusText.textContent = "Disable Teacher Mode";
        const headerTitle = document.querySelector('header span');
        if (headerTitle) headerTitle.innerHTML = 'Sofia AI <span class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full ml-2">Ethical Hacker</span>';
    } else {
        toggleHackingModeBtn.classList.add('bg-gray-100', 'text-gray-800', 'dark:bg-gray-700', 'dark:text-white', 'hover:bg-green-600');
        toggleHackingModeBtn.classList.remove('bg-green-600', 'text-white', 'hover:bg-red-600');
        hackingModeStatusText.textContent = "Enable Teacher Mode";
        const headerTitle = document.querySelector('header span');
        if (headerTitle) headerTitle.textContent = 'Sofia AI';
    }
}

// --- Language and Theme Logic ---
let currentLang = 'en';
const translations = {
    'en': { /* ... existing translations ... */ },
    'hi': { /* ... existing translations ... */ },
    'bn': { /* ... existing translations ... */ }
};
const languages = { "en": "English", "hi": "हिंदी", "bn": "বাংলা" };

function applyLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (translations[lang] && translations[lang][key]) el.textContent = translations[lang][key];
    });
    // ... rest of translation logic remains same ...
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

function applyTheme(theme) {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else if (theme === 'light') document.documentElement.classList.remove('dark');
    else {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }
}

themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        themeBtns.forEach(b => b.classList.remove('border-indigo-600', 'border-2', 'ring-2', 'ring-indigo-200'));
        btn.classList.add('border-indigo-600', 'border-2', 'ring-2', 'ring-indigo-200');
        applyTheme(btn.id.replace('theme-', ''));
    });
});

// --- Core Functions ---
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    addMenu.classList.add('hidden');
    const reader = new FileReader();
    reader.onload = function(e) {
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
    previewItem.className = 'preview-item';
    if (file.type.startsWith('image/')) {
         previewItem.classList.add('image-preview');
         previewItem.innerHTML = `<img src="${fileInfoForDisplay.dataUrl}" alt="${file.name}"><button class="remove-preview-btn" onclick="removeFile()">&times;</button>`;
    } else {
         previewItem.classList.add('doc-preview');
         previewItem.innerHTML = `<div class="file-icon"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div><span class="file-name">${file.name}</span><button class="remove-preview-btn" onclick="removeFile()">&times;</button>`;
    }
    filePreviewContainer.appendChild(previewItem);
}

window.removeFile = function() {
    fileData = null; fileType = null; fileInfoForDisplay = null; fileInput.value = ''; filePreviewContainer.innerHTML = '';
    if (messageInput.value.trim() === '') {
        sendBtn.classList.add('hidden'); micBtn.classList.remove('hidden'); voiceModeBtn.classList.remove('hidden');
    }
}

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text && !fileData) return;
    
    if (!isPremium && !isAdmin && usageCounts.messages >= usageLimits.messages) {
        alert("Limit reached."); openSettingsModal(); switchSettingsTab('usage'); return;
    }

    if (document.body.classList.contains('initial-view')) {
        document.body.classList.remove('initial-view');
        welcomeMessageContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
    }
    
    const userMessage = { text, sender: 'user', fileInfo: fileInfoForDisplay, mode: currentMode };
    addMessage(userMessage); currentChat.push(userMessage);
    messageInput.value = ''; messageInput.dispatchEvent(new Event('input'));

    if (fileInfoForDisplay) uploadFileToLibrary(fileInfoForDisplay);
    
    const modeForThisMessage = currentMode;
    const currentFileData = fileData;
    const currentFileType = fileType;
    removeFile();
    
    if (modeForThisMessage !== 'voice_mode') { deactivateWebSearch(); currentMode = null; }
    const typingIndicator = addTypingIndicator();

    let textToSend = text;
    if (isEthicalHackingMode) textToSend = `[SYSTEM: Teacher Mode]\nUser: "${text}"`;

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textToSend, fileData: currentFileData, fileType: currentFileType, isTemporary: isTemporaryChatActive, mode: modeForThisMessage })
        });
        typingIndicator.remove();
        if (!response.ok) throw new Error("Server Error");

        if (!isPremium && !isAdmin) {
            usageCounts.messages++;
            fetch('/update_usage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'message' }) });
            updateUsageUI();
        }

        const result = await response.json();
        const aiResponseText = result.response || "No response.";
        const aiMessage = { text: aiResponseText, sender: 'ai' };
        addMessage(aiMessage); currentChat.push(aiMessage); saveChatSession();

        if (modeForThisMessage === 'voice_mode' && isVoiceConversationActive) speakText(aiResponseText, startListening);

    } catch (error) {
        typingIndicator.remove();
        const errorMessage = { text: "Error. Try again.", sender: 'system' };
        addMessage(errorMessage); currentChat.push(errorMessage); saveChatSession();
        if (isVoiceConversationActive) speakText(errorMessage.text, startListening);
    }
}

function addMessage({text, sender, fileInfo = null, mode = null}) {
     if (sender === 'user') {
        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble user-message ml-auto';
        messageBubble.innerHTML = `<div>${text}</div>`;
        chatContainer.appendChild(messageBubble);
    } else if (sender === 'ai') {
        const aiMessageContainer = document.createElement('div');
        aiMessageContainer.className = 'ai-message-container';
        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble ai-message';
        messageBubble.innerHTML = markdownConverter.makeHtml(text);
        aiMessageContainer.innerHTML = `<div class="ai-avatar">🌎</div>`;
        aiMessageContainer.appendChild(messageBubble);
        chatContainer.appendChild(aiMessageContainer);
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addTypingIndicator() {
    const typingIndicatorContainer = document.createElement('div');
    typingIndicatorContainer.className = 'ai-message-container typing-indicator items-center';
    typingIndicatorContainer.innerHTML = `<div class="ai-avatar-animated"><div class="orbiting-circle"></div>🌎</div><span class="ml-2">Thinking...</span>`;
    chatContainer.appendChild(typingIndicatorContainer);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return typingIndicatorContainer;
}

// --- Voice Functions ---

/**
 * UPDATED: Controls UI states using the new image icon without 
 * replacing its inner HTML with SVGs.
 */
function setVoiceUIState(state) {
    if (state === 'listening') {
        voiceStatusText.textContent = "Listening...";
        voiceVisualizer.style.transform = "scale(1.1)"; 
        voiceVisualizer.style.opacity = "1";
    } else if (state === 'thinking') {
        voiceStatusText.textContent = "Thinking...";
        voiceVisualizer.style.transform = "scale(0.9)";
        voiceVisualizer.style.opacity = "0.6";
    } else if (state === 'speaking') {
        voiceStatusText.textContent = "Sofia is speaking...";
        voiceVisualizer.style.transform = "scale(1)";
        voiceVisualizer.style.opacity = "1";
    }
}

function speakText(text, onEndCallback) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const cleanedText = text.replace(/[*_`#]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanedText);
        utterance.lang = currentLang;
        utterance.onstart = () => { if (isVoiceConversationActive) setVoiceUIState('speaking'); };
        utterance.onend = () => { if(onEndCallback) onEndCallback(); };
        window.speechSynthesis.speak(utterance);
    } else if (onEndCallback) onEndCallback();
}

function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Not supported."); return; }
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();

    try {
        recognition = new SpeechRecognition();
        recognition.continuous = false; recognition.interimResults = true; recognition.lang = currentLang;
        recognition.onstart = () => { if (isVoiceConversationActive) setVoiceUIState('listening'); };
        recognition.onend = () => {
            if (isVoiceConversationActive) {
                 const finalTranscript = voiceInterimTranscript.textContent.trim();
                 if (finalTranscript) { messageInput.value = finalTranscript; sendMessage(); setVoiceUIState('thinking'); }
                 else { try { recognition.start(); } catch(e) {} }
            }
        };
        recognition.onresult = (event) => {
            let interim = ''; let final = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) final += event.results[i][0].transcript;
                else interim += event.results[i][0].transcript;
            }
            if (!isVoiceConversationActive) messageInput.value = final || interim;
            else voiceInterimTranscript.textContent = final || interim;
        };
        recognition.start();
    } catch (e) { alert("Microphone error."); }
}

micBtn.addEventListener('click', () => { currentMode = 'mic_input'; isVoiceConversationActive = false; startListening(); });

function startVoiceConversation() {
    window.speechSynthesis.cancel(); currentMode = 'voice_mode'; isVoiceConversationActive = true;
    voiceOverlay.classList.remove('hidden'); voiceOverlay.classList.add('flex');
    voiceInterimTranscript.textContent = ''; startListening();
}

function endVoiceConversation() {
    isVoiceConversationActive = false; voiceOverlay.classList.add('hidden');
    if (recognition) recognition.abort();
    window.speechSynthesis.cancel(); currentMode = null;
}

voiceModeBtn.addEventListener('click', startVoiceConversation);
endVoiceBtn.addEventListener('click', endVoiceConversation);

// --- Chat History & Initialization ---
async function loadChatsFromDB() {
    try {
        const response = await fetch('/api/chats');
        if (response.ok) { chatHistory = await response.json(); renderChatHistorySidebar(); }
    } catch (error) { console.error('History load failed.'); }
}

function startNewChat() {
    currentChat = []; currentChatId = null;
    chatContainer.innerHTML = ''; welcomeMessageContainer.classList.remove('hidden');
    chatContainer.classList.add('hidden'); document.body.classList.add('initial-view');
    renderChatHistorySidebar();
}

// ... rest of the file (save functions, user info, library) remains identical to your project's logic ...

initializeApp();
