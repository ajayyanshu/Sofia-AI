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
const micBtn = document.getElementById('mic-btn');
const voiceModeBtn = document.getElementById('voice-mode-btn');
const voiceOverlay = document.getElementById('voice-overlay');
const voiceStatusText = document.getElementById('voice-status-text');
const voiceInterimTranscript = document.getElementById('voice-interim-transcript');
const voiceVisualizer = document.getElementById('voice-visualizer');
const endVoiceBtn = document.getElementById('end-voice-btn');
const fileInput = document.getElementById('file-input');
const filePreviewContainer = document.getElementById('file-preview-container');
const uploadFileBtn = document.getElementById('upload-file-btn');
const uploadCodeBtn = document.getElementById('upload-code-btn');
const addBtn = document.getElementById('add-btn');
const addMenu = document.getElementById('add-menu');
const webSearchToggleBtn = document.getElementById('web-search-toggle-btn');
const modeIndicatorContainer = document.getElementById('mode-indicator-container');

// Cyber Elements
const cyberTrainingBtn = document.getElementById('cyber-training-btn');
const cyberModal = document.getElementById('cyber-modal');
const closeCyberModalBtn = document.getElementById('close-cyber-modal');
const levelBtns = document.querySelectorAll('.level-btn');
const learnCyberBtn = document.getElementById('learn-cyber-btn'); // NEW Feature

// Settings & User Menu
const userMenuBtn = document.getElementById('user-menu-btn');
const userMenu = document.getElementById('user-menu');
const settingsMenuItem = document.getElementById('settings-menu-item');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const closeSettingsBtnDesktop = document.getElementById('close-settings-btn-desktop');

// --- Global State ---
const markdownConverter = new showdown.Converter();
let fileData = null;
let fileInfoForDisplay = null;
let currentMode = null; 
let recognition;
let isVoiceConversationActive = false;
let currentChat = [];
let currentChatId = null;
let chatHistory = [];

// --- Sidebar Logic ---
function openSidebar() { sidebar.classList.remove('-translate-x-full'); sidebarOverlay.classList.remove('hidden'); }
function closeSidebar() { sidebar.classList.add('-translate-x-full'); sidebarOverlay.classList.add('hidden'); }

menuBtn.addEventListener('click', (e) => { 
    e.stopPropagation(); 
    if(sidebar.classList.contains('-translate-x-full')) openSidebar(); 
    else closeSidebar(); 
});
sidebarOverlay.addEventListener('click', closeSidebar);

// --- Chat & File Upload ---
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => { 
    if (e.key === 'Enter' && !e.shiftKey) { 
        e.preventDefault(); 
        sendMessage(); 
    } 
});
messageInput.addEventListener('input', () => {
    // Auto-resize textarea
    messageInput.style.height = 'auto';
    messageInput.style.height = (messageInput.scrollHeight) + 'px';
    // Show/Hide buttons based on input
    if (messageInput.value.trim() !== '') {
        sendBtn.classList.remove('hidden');
        micBtn.classList.add('hidden');
        voiceModeBtn.classList.add('hidden');
    } else {
        sendBtn.classList.add('hidden');
        micBtn.classList.remove('hidden');
        voiceModeBtn.classList.remove('hidden');
    }
});

// File Upload Handlers
uploadFileBtn.addEventListener('click', () => { fileInput.accept="image/*,.pdf,.doc,.docx"; fileInput.click(); });
uploadCodeBtn.addEventListener('click', () => { fileInput.accept=".py,.js,.html,.css,.txt"; fileInput.click(); });
fileInput.addEventListener('change', handleFileSelect);

// Toggle Add Menu
addBtn.addEventListener('click', (e) => { e.stopPropagation(); addMenu.classList.toggle('hidden'); });
window.addEventListener('click', (e) => { if(!addMenu.contains(e.target) && e.target !== addBtn) addMenu.classList.add('hidden'); });

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    addMenu.classList.add('hidden');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        fileData = e.target.result.split(',')[1];
        // CRITICAL FIX: Save full DataURL so images load in history later
        fileInfoForDisplay = { name: file.name, type: file.type, dataUrl: e.target.result }; 
        showFilePreview(file);
        sendBtn.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function showFilePreview(file) {
    filePreviewContainer.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 bg-gray-100 p-2 rounded-lg';
    div.innerHTML = `<span class="text-sm font-medium truncate max-w-[150px]">${file.name}</span> <button onclick="removeFile()" class="text-red-500 hover:text-red-700">×</button>`;
    filePreviewContainer.appendChild(div);
}

window.removeFile = function() { 
    fileData = null; 
    fileInfoForDisplay = null; 
    filePreviewContainer.innerHTML = ''; 
    fileInput.value = '';
    // Reset buttons if text is also empty
    if(messageInput.value.trim() === '') {
        sendBtn.classList.add('hidden');
        micBtn.classList.remove('hidden');
        voiceModeBtn.classList.remove('hidden');
    }
}

// --- Main Chat Function ---
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text && !fileData) return;

    if (document.body.classList.contains('initial-view')) {
        document.body.classList.remove('initial-view');
        welcomeMessageContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
    }

    // 1. Prepare User Message (Save file info for history)
    const userMessage = { text, sender: 'user', fileInfo: fileInfoForDisplay, mode: currentMode };
    addMessage(userMessage);
    currentChat.push(userMessage); 

    // 2. Clear Input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // 3. Prepare Payload
    const currentFileData = fileData;
    const currentFileType = fileInfoForDisplay ? fileInfoForDisplay.type : null;
    const modeForThisMessage = currentMode;
    
    removeFile(); 
    
    // Reset modes unless in persistent session like Voice/Cyber
    if (modeForThisMessage !== 'voice_mode' && modeForThisMessage !== 'cyber_theory') {
        currentMode = null;
        modeIndicatorContainer.innerHTML = '';
        webSearchToggleBtn.classList.remove('text-blue-600');
    }

    // 4. Send to Backend
    addTypingIndicator();
    
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                text, 
                fileData: currentFileData, 
                fileType: currentFileType, 
                mode: modeForThisMessage 
            })
        });
        
        removeTypingIndicator();
        const data = await response.json();
        
        const aiMessage = { text: data.response, sender: 'ai' };
        addMessage(aiMessage);
        currentChat.push(aiMessage); 
        
        saveChatSession(); // Auto-save to DB

        // Voice Feedback
        if (modeForThisMessage === 'voice_mode' && isVoiceConversationActive) {
            speakText(data.response, startListening);
        }

    } catch (e) {
        removeTypingIndicator();
        addMessage({ text: "Error connecting to Sofia. Please check your connection.", sender: 'system' });
    }
}

// --- Message Rendering ---
function addMessage({text, sender, fileInfo = null}) {
    const bubble = document.createElement('div');
    
    if (sender === 'user') {
        bubble.className = 'message-bubble user-message ml-auto';
        let content = '';
        
        // FIX: Display Image from History
        if (fileInfo && fileInfo.dataUrl) {
            if (fileInfo.type.startsWith('image/')) {
                content += `<img src="${fileInfo.dataUrl}" alt="uploaded" class="rounded-lg mb-2 max-w-xs block border border-white/20">`;
            } else {
                content += `<div class="bg-white/20 text-white p-2 rounded mb-2 text-xs flex items-center gap-2">📄 ${fileInfo.name}</div>`;
            }
        }
        content += `<div>${text}</div>`;
        bubble.innerHTML = content;
        chatContainer.appendChild(bubble);

    } else if (sender === 'ai') {
        const container = document.createElement('div');
        container.className = 'ai-message-container';
        
        bubble.className = 'message-bubble ai-message';
        bubble.innerHTML = markdownConverter.makeHtml(text);
        
        // FIX: Like/Dislike Buttons Added
        const actionsHtml = `
            <div class="message-actions mt-2 flex gap-3 border-t border-gray-200 pt-2 opacity-50 hover:opacity-100 transition-opacity">
                <button class="action-btn like-btn text-gray-500 hover:text-green-600 transition-colors" title="Helpful">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                </button>
                <button class="action-btn dislike-btn text-gray-500 hover:text-red-600 transition-colors" title="Not Helpful">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" /></svg>
                </button>
                <button class="action-btn copy-btn text-gray-500 hover:text-blue-600 transition-colors ml-auto text-xs">Copy</button>
            </div>`;
        bubble.insertAdjacentHTML('beforeend', actionsHtml);
        
        // Attach Event Listeners
        bubble.querySelector('.like-btn').addEventListener('click', (e) => {
            sendFeedback(text, 'like');
            e.currentTarget.classList.add('text-green-600');
        });
        bubble.querySelector('.dislike-btn').addEventListener('click', (e) => {
            sendFeedback(text, 'dislike');
            e.currentTarget.classList.add('text-red-600');
        });
        bubble.querySelector('.copy-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(text);
            alert('Copied to clipboard');
        });

        container.innerHTML = `<div class="ai-avatar text-2xl">🌎</div>`;
        container.appendChild(bubble);
        chatContainer.appendChild(container);
        
        // Highlight Code
        if (window.Prism) Prism.highlightAll();
    } else if (sender === 'system') {
        const div = document.createElement('div');
        div.className = 'text-center text-xs text-gray-500 my-2';
        div.innerText = text;
        chatContainer.appendChild(div);
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addTypingIndicator() {
    const div = document.createElement('div');
    div.id = 'typing-indicator';
    div.className = 'ai-message-container';
    div.innerHTML = `<div class="ai-avatar text-2xl">🌎</div><div class="message-bubble ai-message text-gray-400 italic">Thinking...</div>`;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function removeTypingIndicator() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}

// --- Feedback Logic ---
async function sendFeedback(text, type) {
    try {
        await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, type: type })
        });
    } catch (e) { console.error("Feedback failed", e); }
}

// --- Voice & Mic Features (FIXED) ---
function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Mic not supported in this browser.");
    
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;

    recognition.onstart = () => {
        if(isVoiceConversationActive) {
            voiceStatusText.textContent = "Listening...";
            // Animation REMOVED per request
        } else {
            micBtn.classList.add('text-red-500', 'animate-pulse');
        }
    };

    recognition.onend = () => {
        micBtn.classList.remove('text-red-500', 'animate-pulse');
        
        // FIX: Check if we have text from simple mic click
        const transcript = voiceInterimTranscript.textContent.trim();
        
        if (isVoiceConversationActive) {
             if (transcript) sendMessage(); 
             else startListening(); // Keep listening if in Voice Mode
        }
    };

    recognition.onresult = (event) => {
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) final += event.results[i][0].transcript;
        }
        
        if (isVoiceConversationActive) {
            voiceInterimTranscript.textContent = final;
            if(final) messageInput.value = final;
        } else {
            // FIX: Mic Button Mode - Append directly to input
            if(final) {
                messageInput.value = messageInput.value ? messageInput.value + ' ' + final : final;
                // Trigger input event to resize/show buttons
                messageInput.dispatchEvent(new Event('input'));
            }
        }
    };
    recognition.start();
}

// Simple Mic Button Click
micBtn.addEventListener('click', () => {
    isVoiceConversationActive = false;
    startListening();
});

// Voice Mode Button Click
voiceModeBtn.addEventListener('click', () => {
    isVoiceConversationActive = true;
    currentMode = 'voice_mode';
    voiceOverlay.classList.remove('hidden');
    voiceOverlay.classList.add('flex');
    startListening();
});

endVoiceBtn.addEventListener('click', () => {
    isVoiceConversationActive = false;
    voiceOverlay.classList.add('hidden');
    if(recognition) recognition.stop();
    window.speechSynthesis.cancel();
});

function speakText(text, callback) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_]/g, ''));
        utterance.onend = callback;
        window.speechSynthesis.speak(utterance);
    }
}

// --- Contact Us (Replaced Help) ---
const helpLink = document.querySelector('a[href*="website.html"]');
if(helpLink) {
    helpLink.innerHTML = `
    <svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
    <span class="text-sm font-medium text-gray-700">Contact Us</span>`;
    
    helpLink.href = "#";
    helpLink.addEventListener('click', (e) => {
        e.preventDefault();
        alert("📞 Contact Us:\n\n📧 Email: ajayyanshu@gmail.com\n✈️ Telegram: @AjayYanshu");
    });
}

// --- Web Search Toggle ---
webSearchToggleBtn.addEventListener('click', () => {
    if (currentMode === 'web_search') {
        currentMode = null;
        modeIndicatorContainer.innerHTML = '';
        webSearchToggleBtn.classList.remove('text-blue-600');
    } else {
        currentMode = 'web_search';
        modeIndicatorContainer.innerHTML = '<div class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded inline-block">Web Search Active</div>';
        webSearchToggleBtn.classList.add('text-blue-600');
    }
});

// --- Cyber Security Challenge (UPDATED) ---
cyberTrainingBtn.addEventListener('click', () => { 
    closeSidebar(); 
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
        startCyberGame(level);
    });
});

// NEW: Learn Cyber Security (A-Z)
if(learnCyberBtn) {
    learnCyberBtn.addEventListener('click', () => {
        cyberModal.classList.add('hidden');
        startNewChat();
        currentMode = 'cyber_theory';
        
        // Send initial hidden prompt
        const introMsg = { text: "I want to learn Cyber Security from A to Z. Please start with Chapter 1.", sender: 'user' };
        addMessage(introMsg);
        
        // Trigger backend
        fetch('/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ text: introMsg.text, mode: 'cyber_theory' })
        })
        .then(r => r.json())
        .then(d => {
            addMessage({ text: d.response, sender: 'ai' });
            currentChat.push(introMsg);
            currentChat.push({ text: d.response, sender: 'ai' });
        });
    });
}

function startCyberGame(level) {
    cyberModal.classList.add('hidden');
    startNewChat();
    
    // UI Notification
    addMessage({text: `🏁 **Cyber Challenge: ${level} Level**\nSofia is now acting as a hacker. Defend yourself!`, sender: 'system'});
    
    // Backend Trigger
    const prompt = `[SYSTEM: Start Simulation. Level: ${level}. Act as the hacker immediately.]`;
    
    fetch('/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text: prompt})
    })
    .then(r => r.json())
    .then(d => {
        addMessage({text: d.response, sender: 'ai'});
        // Save initial context
        currentChat.push({text: prompt, sender: 'user', mode: 'simulation'}); 
        currentChat.push({text: d.response, sender: 'ai'});
    });
}

// --- History & Persistence ---
async function saveChatSession() {
    if (!currentChat.length) return;
    
    // Determine title if new
    const title = currentChat.find(m => m.sender === 'user')?.text.substring(0,30) || "New Chat";
    
    const res = await fetch('/api/chats', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id: currentChatId, messages: currentChat, title })
    });
    
    const data = await res.json();
    currentChatId = data.id;
}

async function loadChatsFromDB() {
    try {
        const res = await fetch('/api/chats');
        chatHistory = await res.json();
        renderChatHistory();
    } catch(e) { console.error("History load failed", e); }
}

function loadChat(id) {
    const chat = chatHistory.find(c => c.id === id);
    if (!chat) return;
    
    currentChatId = id;
    currentChat = chat.messages || [];
    
    // UI Reset
    chatContainer.innerHTML = '';
    welcomeMessageContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    document.body.classList.remove('initial-view');
    
    // Render full history (Images included via dataUrl check in addMessage)
    currentChat.forEach(msg => addMessage(msg));
    
    if(window.innerWidth < 768) closeSidebar();
}

function startNewChat() {
    currentChat = [];
    currentChatId = null;
    chatContainer.innerHTML = '';
    welcomeMessageContainer.classList.remove('hidden');
    chatContainer.classList.add('hidden');
    document.body.classList.add('initial-view');
    messageInput.value = '';
    modeIndicatorContainer.innerHTML = '';
    currentMode = null;
}

function renderChatHistory() {
    const container = document.getElementById('chat-history-container');
    container.innerHTML = '';
    
    if (chatHistory.length === 0) {
        container.innerHTML = `<div class="p-4 text-sm text-gray-500 text-center">No history yet.</div>`;
        return;
    }

    chatHistory.forEach(c => {
        const div = document.createElement('div');
        div.className = 'chat-history-item p-3 hover:bg-gray-100 cursor-pointer rounded-lg text-sm text-gray-700 truncate';
        div.innerText = c.title;
        div.onclick = () => loadChat(c.id);
        container.appendChild(div);
    });
}

// --- Initialization ---
// Menu & Modal Toggles
userMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); userMenu.classList.toggle('hidden'); });
window.addEventListener('click', () => userMenu.classList.add('hidden'));

settingsMenuItem.addEventListener('click', (e) => {
    e.preventDefault();
    settingsModal.classList.remove('hidden');
    settingsModal.classList.add('flex');
});

[closeSettingsBtn, closeSettingsBtnDesktop].forEach(btn => {
    if(btn) btn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
        settingsModal.classList.remove('flex');
    });
});

headerNewChatBtn.addEventListener('click', startNewChat);
newChatBtn.addEventListener('click', () => { startNewChat(); closeSidebar(); });

// Start Up
loadChatsFromDB();
