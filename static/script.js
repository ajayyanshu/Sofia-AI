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

// Cyber Training Elements
const cyberTrainingBtn = document.getElementById('cyber-training-btn');
const cyberModal = document.getElementById('cyber-modal');
const closeCyberModalBtn = document.getElementById('close-cyber-modal');
const levelBtns = document.querySelectorAll('.level-btn');
const cyberGameControls = document.getElementById('cyber-game-controls');
const endCyberGameBtn = document.getElementById('end-cyber-game-btn');

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

// Cyber Game State
let isCyberGameActive = false;
let currentCyberLevel = 'Basic';

// Plan & Usage State
let usageCounts = { messages: 0, webSearches: 0 };
const usageLimits = { messages: 15, webSearches: 1 };
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

    if (tab === 'general') {
        generalTabBtn.classList.add('active', 'bg-gray-100', 'text-gray-800', 'font-semibold');
        generalTabBtn.classList.remove('text-gray-600', 'hover:bg-gray-100');
        generalSettingsContent.classList.remove('hidden');
    } else if (tab === 'profile') {
        profileTabBtn.classList.add('active', 'bg-gray-100', 'text-gray-800', 'font-semibold');
        profileTabBtn.classList.remove('text-gray-600', 'hover:bg-gray-100');
        profileSettingsContent.classList.remove('hidden');
    } else if (tab === 'usage') {
        usageTabBtn.classList.add('active', 'bg-gray-100', 'text-gray-800', 'font-semibold');
        usageTabBtn.classList.remove('text-gray-600', 'hover:bg-gray-100');
        usageSettingsContent.classList.remove('hidden');
    }
}

generalTabBtn.addEventListener('click', (e) => { e.preventDefault(); switchSettingsTab('general'); });
profileTabBtn.addEventListener('click', (e) => { e.preventDefault(); switchSettingsTab('profile'); });
usageTabBtn.addEventListener('click', (e) => { e.preventDefault(); switchSettingsTab('usage'); });

// --- Cyber Security Training Logic (UPDATED) ---
cyberTrainingBtn.addEventListener('click', () => {
    if (!sidebar.classList.contains('-translate-x-full')) closeSidebar();
    cyberModal.classList.remove('hidden');
    cyberModal.classList.add('flex');
});

closeCyberModalBtn.addEventListener('click', () => {
    cyberModal.classList.add('hidden');
    cyberModal.classList.remove('flex');
});

levelBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const level = btn.getAttribute('data-level');

        // Expert Level - Coming Soon Check
        if (level === 'Expert') {
            alert("⚠️ Expert Level is Coming Soon! Stay tuned.");
            return;
        }

        // New "Learn" Level Logic
        if (level === 'Learn') {
             startNewChat();
             cyberModal.classList.add('hidden');
             cyberModal.classList.remove('flex');
             const prompt = "Teach me Cyber Security theory from A to Z, step by step. Start with the basics and explain concepts clearly.";
             messageInput.value = prompt;
             sendMessage(); // Triggers the chat automatically
             return;
        }

        // Basic & Intermediate Levels
        startCyberGame(level);
    });
});

endCyberGameBtn.addEventListener('click', endCyberGame);

function startCyberGame(level) {
    cyberModal.classList.add('hidden');
    cyberModal.classList.remove('flex');
    startNewChat(); 
    
    isCyberGameActive = true;
    currentCyberLevel = level;
    cyberGameControls.classList.remove('hidden');
    
    let personaPrompt = "";
    if (level === 'Basic') {
        personaPrompt = "Act as a naive scammer (e.g., Nigerian Prince or Lottery winner). Use slightly poor grammar, make obvious demands for money. Do not break character. Keep responses short.";
    } else if (level === 'Intermediate') {
        personaPrompt = "Act as a somewhat convincing scammer posing as 'Amazon Support'. Use urgent language claiming a transaction was authorized. Do not break character. Keep responses short.";
    } 
    
    const introMsg = {
        text: `[SYSTEM: SIMULATION STARTED - LEVEL: ${level}]\n${personaPrompt}\n\nStart the conversation now by greeting the victim.`,
        sender: 'user', 
        mode: 'chat'
    };
    
    const startMsg = { 
        text: `🏁 **Cyber Security Challenge Started: ${level} Level**\n\nThe AI is now a scammer. Defend yourself!\nWhen you think you've caught them, click **Analyze & End**.`, 
        sender: 'system' 
    };
    addMessage(startMsg);
    
    fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(introMsg)
    })
    .then(res => res.json())
    .then(data => {
        const aiMsg = { text: data.response, sender: 'ai' };
        addMessage(aiMsg);
        currentChat.push(introMsg); 
        currentChat.push(aiMsg);
    })
    .catch(err => console.error("Game start error", err));
}

async function endCyberGame() {
    if (!confirm("Are you sure you want to end the simulation and get your report?")) return;

    endCyberGameBtn.textContent = "Analyzing...";
    endCyberGameBtn.disabled = true;

    try {
        const response = await fetch('/api/cyber/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: currentChat, level: currentCyberLevel })
        });
        const report = await response.json(); // Assuming backend logic exists or mocked
        
        // Mocking report if endpoint missing in this context
        const mockReport = report.score ? report : { score: 85, verdict: "Good Job", analysis: "You stopped the scammer.", tips: ["Check URLs"] };

        renderCyberReport(mockReport);

        const resetMessage = {
            text: "[SYSTEM COMMAND: The simulation is successfully finished. STOP roleplaying as a scammer. RESET your persona to 'Sofia AI'.]",
            sender: 'user', 
            mode: 'chat'
        };

        const resetResponse = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resetMessage)
        });
        const resetData = await resetResponse.json();
        const aiResetMsg = { text: resetData.response, sender: 'ai' };
        addMessage(aiResetMsg);
        currentChat.push(aiResetMsg);
        saveChatSession();

    } catch (error) {
        console.error("Evaluation or Reset failed", error);
        addMessage({ text: "Error generating report.", sender: 'system' });
    } finally {
        isCyberGameActive = false;
        cyberGameControls.classList.add('hidden');
        endCyberGameBtn.textContent = "Analyze & End";
        endCyberGameBtn.disabled = false;
    }
}

function renderCyberReport(report) {
    let colorClass = 'score-low';
    if (report.score >= 80) colorClass = 'score-high';
    else if (report.score >= 50) colorClass = 'score-med';

    const tipsHtml = report.tips ? report.tips.map(tip => `<li class="mb-1">💡 ${tip}</li>`).join('') : '<li>No specific tips.</li>';

    const html = `
        <div class="cyber-report-card">
            <h3 class="text-xl font-bold text-center mb-4 border-b pb-2">🛡️ Security Analysis Report</h3>
            <div class="report-score-circle ${colorClass}">${report.score}</div>
            <div class="text-center font-bold text-lg mb-4">Verdict: ${report.verdict}</div>
            <div class="mb-4">
                <h4 class="font-semibold text-gray-700 dark:text-gray-300">Analysis:</h4>
                <p class="text-sm text-gray-600 dark:text-gray-400">${report.analysis}</p>
            </div>
            <div>
                <h4 class="font-semibold text-gray-700 dark:text-gray-300">How to Improve:</h4>
                <ul class="text-sm text-gray-600 dark:text-gray-400 list-none pl-0 mt-2">${tipsHtml}</ul>
            </div>
        </div>
    `;

    const messageBubble = document.createElement('div');
    messageBubble.innerHTML = html;
    messageBubble.className = 'message-bubble ai-message w-full';
    chatContainer.appendChild(messageBubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    currentChat.push({ text: `**Security Report:** Score ${report.score}/100`, sender: 'ai' });
}

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
    
    if (file.type && file.type.startsWith('image/')) {
         previewItem.classList.add('image-preview');
         previewItem.innerHTML = `<img src="${fileInfoForDisplay.dataUrl}" alt="${file.name}"><button class="remove-preview-btn" onclick="removeFile()">&times;</button>`;
    } else {
         previewItem.classList.add('doc-preview');
         previewItem.innerHTML = `<div class="file-icon">📄</div><span class="file-name">${file.name}</span><button class="remove-preview-btn" onclick="removeFile()">&times;</button>`;
    }
    filePreviewContainer.appendChild(previewItem);
}

window.removeFile = function() {
    fileData = null;
    fileType = null;
    fileInfoForDisplay = null;
    fileInput.value = '';
    filePreviewContainer.innerHTML = '';
    if (messageInput.value.trim() === '') {
        sendBtn.classList.add('hidden');
        micBtn.classList.remove('hidden');
        voiceModeBtn.classList.remove('hidden');
    }
}

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text && !fileData) return;
    
    if (document.body.classList.contains('initial-view')) {
        document.body.classList.remove('initial-view');
        welcomeMessageContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
    }
    
    const userMessage = {
        text,
        sender: 'user',
        fileInfo: fileInfoForDisplay, // Passing file info for local rendering
        mode: currentMode
    };
    
    // Pass 'true' to save, but save happens at end of flow
    addMessage(userMessage); 
    currentChat.push(userMessage);

    messageInput.value = '';
    messageInput.dispatchEvent(new Event('input'));

    const currentFileData = fileData;
    const currentFileType = fileType;
    removeFile();
    
    const typingIndicator = addTypingIndicator();

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                fileData: currentFileData, 
                fileType: currentFileType,
                isTemporary: isTemporaryChatActive,
                mode: currentMode 
            })
        });
        
        typingIndicator.remove();

        if (!response.ok) throw new Error('Network error');
        
        const result = await response.json();
        const aiResponseText = result.response || "Sorry, I couldn't get a response.";
        
        const aiMessage = { text: aiResponseText, sender: 'ai' };
        addMessage(aiMessage);
        currentChat.push(aiMessage);
        saveChatSession(); // Save after AI response

        if (currentMode === 'voice_mode' && isVoiceConversationActive) {
            speakText(aiResponseText, startListening);
        }

    } catch (error) {
        typingIndicator.remove();
        console.error("Chat error:", error);
        addMessage({ text: "Sorry, I encountered an error.", sender: 'system' });
    }
}

// --- Message Rendering & Feedback (FIXED IMAGE LOADING & FEEDBACK) ---
function addMessage({text, sender, fileInfo = null, mode = null}) {
     if (sender === 'user') {
        const messageBubble = document.createElement('div');
        let fileHtml = '';
        
        // Handle Image rendering even from history
        if (fileInfo && fileInfo.dataUrl) {
            if (fileInfo.type.startsWith('image/')) {
                 fileHtml = `<img src="${fileInfo.dataUrl}" alt="User upload" class="rounded-lg mb-2 max-w-xs block">`;
            } else {
                fileHtml = `<div class="flex items-center bg-blue-100 rounded-lg p-2 mb-2"><span class="text-sm text-blue-800">📄 ${fileInfo.name}</span></div>`;
            }
        }
        
        messageBubble.innerHTML = fileHtml + `<div>${text}</div>`;
        messageBubble.className = 'message-bubble user-message ml-auto';
        chatContainer.appendChild(messageBubble);

    } else if (sender === 'ai') {
        const aiMessageContainer = document.createElement('div');
        aiMessageContainer.className = 'ai-message-container';
        const avatar = `<div class="ai-avatar"><span class="text-2xl">🌎</span></div>`;
        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble ai-message';
        
        let contentHtml = markdownConverter.makeHtml(text);
        
        // --- Added Like/Dislike Buttons ---
        const actionsHtml = `
            <div class="message-actions mt-2 flex gap-2 opacity-100">
                <button class="action-btn copy-btn" title="Copy text">📋</button>
                <button class="action-btn like-btn" title="Helpful">👍</button>
                <button class="action-btn dislike-btn" title="Not Helpful">👎</button>
                <button class="action-btn speak-btn" title="Speak">🔊</button>
            </div>
        `;

        messageBubble.innerHTML = contentHtml + actionsHtml;
        aiMessageContainer.innerHTML = avatar;
        aiMessageContainer.appendChild(messageBubble);
        chatContainer.appendChild(aiMessageContainer);

        // Feedback Event Listeners
        messageBubble.querySelector('.like-btn').addEventListener('click', () => submitFeedback(text, 'like'));
        messageBubble.querySelector('.dislike-btn').addEventListener('click', () => submitFeedback(text, 'dislike'));
        
        messageBubble.querySelector('.copy-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(text);
            alert("Copied!");
        });
        
        messageBubble.querySelector('.speak-btn').addEventListener('click', () => {
             speakText(text);
        });
    } else if (sender === 'system') {
        const messageBubble = document.createElement('div');
        messageBubble.textContent = text;
        messageBubble.className = 'message-bubble system-message';
        chatContainer.appendChild(messageBubble);
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// --- New Feedback Function ---
async function submitFeedback(messageText, type) {
    try {
        await fetch('/api/feedback', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ message_text: messageText, type: type })
        });
        alert(`Thanks for your feedback! (${type})`);
    } catch (e) {
        console.error("Feedback error", e);
    }
}

function addTypingIndicator() {
    const typingIndicatorContainer = document.createElement('div');
    typingIndicatorContainer.className = 'ai-message-container typing-indicator items-center';
    typingIndicatorContainer.innerHTML = `
        <div class="ai-avatar-animated"><div class="orbiting-circle"></div><span class="globe text-2xl">🌎</span></div>
        <span class="text-gray-600 font-medium ml-2">Sofia is thinking...</span>
    `;
    chatContainer.appendChild(typingIndicatorContainer);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return typingIndicatorContainer;
}

// --- Voice Functions (FIXED MIC & REMOVED ANIMATION) ---
function setVoiceUIState(state) {
    // Removed all visualizer animation classes logic
    if (state === 'listening') {
        voiceStatusText.textContent = "Listening...";
        voiceVisualizer.innerHTML = `<div class="text-white text-4xl">🎤</div>`;
    } else if (state === 'thinking') {
        voiceStatusText.textContent = "Thinking...";
        voiceVisualizer.innerHTML = `<div class="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>`;
    } else if (state === 'speaking') {
        voiceStatusText.textContent = "Sofia is speaking...";
        voiceVisualizer.innerHTML = `<div class="text-white text-4xl">🔊</div>`;
    }
}

function speakText(text, onEndCallback) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.replace(/[*_`#]/g, ''));
        utterance.onstart = () => { if (isVoiceConversationActive) setVoiceUIState('speaking'); };
        utterance.onend = () => { if(onEndCallback) onEndCallback(); };
        window.speechSynthesis.speak(utterance);
    } else {
        alert("Text-to-speech not supported.");
        if (onEndCallback) onEndCallback();
    }
}

function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Browser does not support voice input.");
        return;
    }

    if (recognition) recognition.stop();
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
        micBtn.classList.add('text-red-600', 'animate-pulse'); // UI feedback for button
        if (isVoiceConversationActive) setVoiceUIState('listening');
        messageInput.placeholder = "Listening...";
    };

    recognition.onend = () => {
        micBtn.classList.remove('text-red-600', 'animate-pulse');
        messageInput.placeholder = "Ask anything";
        if (isVoiceConversationActive && !messageInput.value) {
             // If in voice mode and silence, maybe restart or wait
        }
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (isVoiceConversationActive) {
            voiceInterimTranscript.textContent = transcript;
        }
        messageInput.value = transcript;
        sendMessage();
    };
    
    recognition.start();
}

micBtn.addEventListener('click', () => {
    currentMode = 'mic_input';
    isVoiceConversationActive = false;
    startListening();
});

voiceModeBtn.addEventListener('click', () => {
    currentMode = 'voice_mode';
    isVoiceConversationActive = true;
    voiceOverlay.classList.remove('hidden');
    voiceOverlay.classList.add('flex');
    startListening();
});

endVoiceBtn.addEventListener('click', () => {
    isVoiceConversationActive = false;
    voiceOverlay.classList.add('hidden');
    if (recognition) recognition.abort();
    window.speechSynthesis.cancel();
});


// --- Chat History Functions (FIXED LOADING) ---
async function saveChatSession() {
    if (isTemporaryChatActive || currentChat.length === 0) return;

    try {
        const response = await fetch('/api/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: currentChatId,
                title: currentChat[0]?.text.substring(0, 30) || 'Untitled',
                messages: currentChat
            })
        });
        if (response.ok) {
            const data = await response.json();
            if (!currentChatId) {
                currentChatId = data.id;
                loadChatsFromDB(); // Refresh sidebar to show new chat
            }
        }
    } catch (error) { console.error('Save error:', error); }
}

async function loadChatsFromDB() {
    try {
        const response = await fetch('/api/chats');
        if (response.ok) {
            chatHistory = await response.json();
            renderChatHistorySidebar();
        }
    } catch (e) { console.error('Load chats error', e); }
}

function renderChatHistorySidebar() {
    chatHistoryContainer.innerHTML = '';
    if (chatHistory.length === 0) {
         chatHistoryContainer.innerHTML = `<div class="p-2 text-sm text-gray-500">No history found.</div>`;
         return;
    }

    chatHistory.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'chat-history-item';
        if (chat.id === currentChatId) item.classList.add('active');
        
        item.innerHTML = `
            <span class="chat-title truncate">${chat.title}</span>
            <button class="text-xs text-red-400 hover:text-red-600 ml-2" onclick="deleteChat('${chat.id}', event)">✕</button>
        `;
        item.onclick = (e) => {
            if(e.target.tagName !== 'BUTTON') loadChat(chat.id);
        };
        chatHistoryContainer.appendChild(item);
    });
}

async function deleteChat(chatId, event) {
    event.stopPropagation();
    if (!confirm("Delete this chat?")) return;
    await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
    if (currentChatId === chatId) startNewChat();
    loadChatsFromDB();
}

function loadChat(chatId) {
    const chat = chatHistory.find(c => c.id === chatId);
    if (!chat) return;
    
    currentChatId = chatId;
    currentChat = chat.messages || [];

    // Reset UI
    chatContainer.innerHTML = '';
    welcomeMessageContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    document.body.classList.remove('initial-view');
    
    // Render all messages
    currentChat.forEach(message => addMessage(message));
    
    // Close sidebar on mobile
    if (!sidebar.classList.contains('-translate-x-full')) closeSidebar();
}

function startNewChat() {
    currentChat = [];
    currentChatId = null;
    chatContainer.innerHTML = '';
    welcomeMessageContainer.classList.remove('hidden');
    chatContainer.classList.add('hidden');
    document.body.classList.add('initial-view');
    messageInput.value = '';
    renderChatHistorySidebar();
}

// --- Contact Us (Replaces Help) ---
// Find the element that was "Help" in HTML and replace its text/logic dynamically
const helpMenuLink = document.querySelector('a[href*="website.html"]'); 
if (helpMenuLink) {
    // Replace element entirely to remove old href
    const contactBtn = document.createElement('button');
    contactBtn.className = "menu-item w-full text-left flex items-center gap-2 px-4 py-2 hover:bg-gray-100";
    contactBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span class="text-sm font-medium text-gray-700">Contact Us</span>
    `;
    contactBtn.onclick = () => {
        alert("📧 Email: ajayyanshu@gmail.com\n✈️ Telegram: @ajayyanshu");
    };
    helpMenuLink.parentNode.replaceChild(contactBtn, helpMenuLink);
}

// --- Initializations ---
function initializeApp() {
    loadChatsFromDB();
    
    // Initialize user info
    fetch('/get_user_info').then(r => r.json()).then(user => {
        document.getElementById('sidebar-username').textContent = user.name || 'User';
        document.getElementById('profile-name').textContent = user.name || 'User';
        document.getElementById('profile-email').textContent = user.email || 'No Email';
        isPremium = user.isPremium;
        isAdmin = user.isAdmin;
        usageCounts = user.usageCounts;
        
        if (isPremium || isAdmin) {
            sidebarUserPlan.textContent = "Premium";
            sidebarUserPlan.className = "text-xs text-green-600 font-bold";
        }
    }).catch(e => console.error("Auth check failed"));
    
    logoutBtn.addEventListener('click', async () => {
        await fetch('/logout', { method: 'POST' });
        window.location.href = '/login.html';
    });
}

initializeApp();
