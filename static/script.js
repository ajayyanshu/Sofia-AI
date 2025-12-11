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
const addBtn = document.getElementById('add-btn');
const addMenu = document.getElementById('add-menu');

// Cyber Elements
const cyberTrainingBtn = document.getElementById('cyber-training-btn');
const cyberModal = document.getElementById('cyber-modal');
const closeCyberModalBtn = document.getElementById('close-cyber-modal');
const levelBtns = document.querySelectorAll('.level-btn');
const learnCyberBtn = document.getElementById('learn-cyber-btn'); // NEW

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

// --- Sidebar ---
function openSidebar() { sidebar.classList.remove('-translate-x-full'); sidebarOverlay.classList.remove('hidden'); }
function closeSidebar() { sidebar.classList.add('-translate-x-full'); sidebarOverlay.classList.add('hidden'); }
menuBtn.addEventListener('click', (e) => { e.stopPropagation(); if(sidebar.classList.contains('-translate-x-full')) openSidebar(); else closeSidebar(); });
sidebarOverlay.addEventListener('click', closeSidebar);

// --- Chat & File ---
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

uploadFileBtn.addEventListener('click', () => { fileInput.click(); });
fileInput.addEventListener('change', handleFileSelect);

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    addMenu.classList.add('hidden');
    const reader = new FileReader();
    reader.onload = function(e) {
        fileData = e.target.result.split(',')[1];
        // Ensure we save the DataURL for history loading
        fileInfoForDisplay = { name: file.name, type: file.type, dataUrl: e.target.result }; 
        showFilePreview(file);
        sendBtn.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function showFilePreview(file) {
    filePreviewContainer.innerHTML = `<div class="p-2 bg-gray-100 rounded">${file.name} <button onclick="removeFile()" class="text-red-500 ml-2">x</button></div>`;
}
window.removeFile = function() { fileData = null; fileInfoForDisplay = null; filePreviewContainer.innerHTML = ''; }

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text && !fileData) return;

    if (document.body.classList.contains('initial-view')) {
        document.body.classList.remove('initial-view');
        welcomeMessageContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
    }

    // 1. Construct User Message Object (Include fileInfo with dataUrl for history)
    const userMessage = { text, sender: 'user', fileInfo: fileInfoForDisplay, mode: currentMode };
    addMessage(userMessage);
    currentChat.push(userMessage); // Save to local state

    messageInput.value = '';
    const currentFileData = fileData;
    const currentFileType = fileInfoForDisplay ? fileInfoForDisplay.type : null;
    const modeForThisMessage = currentMode;
    removeFile(); 
    
    // Reset standard modes
    if (modeForThisMessage !== 'voice_mode' && modeForThisMessage !== 'cyber_theory') {
        currentMode = null;
    }

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, fileData: currentFileData, fileType: currentFileType, mode: modeForThisMessage })
        });
        const data = await response.json();
        
        const aiMessage = { text: data.response, sender: 'ai' };
        addMessage(aiMessage);
        currentChat.push(aiMessage); // Save AI response
        saveChatSession(); // Persist to MongoDB

        if (modeForThisMessage === 'voice_mode' && isVoiceConversationActive) {
            speakText(data.response, startListening);
        }
    } catch (e) {
        addMessage({ text: "Error connecting to Sofia.", sender: 'system' });
    }
}

// --- Message Rendering (Fixing Image Load) ---
function addMessage({text, sender, fileInfo = null}) {
    const bubble = document.createElement('div');
    
    if (sender === 'user') {
        bubble.className = 'message-bubble user-message ml-auto';
        let content = '';
        // Check if fileInfo exists AND has dataUrl (loaded from history)
        if (fileInfo && fileInfo.dataUrl) {
            if (fileInfo.type.startsWith('image/')) {
                content += `<img src="${fileInfo.dataUrl}" alt="uploaded" class="rounded-lg mb-2 max-w-xs block">`;
            } else {
                content += `<div class="bg-blue-800 text-white p-2 rounded mb-2 text-xs">📄 ${fileInfo.name}</div>`;
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
        
        // --- Feedback Buttons ---
        const actionsHtml = `
            <div class="message-actions mt-2 flex gap-2">
                <button class="action-btn like-btn text-gray-400 hover:text-green-500" title="Like">👍</button>
                <button class="action-btn dislike-btn text-gray-400 hover:text-red-500" title="Dislike">👎</button>
            </div>`;
        bubble.insertAdjacentHTML('beforeend', actionsHtml);
        
        // Feedback Logic
        bubble.querySelector('.like-btn').addEventListener('click', () => sendFeedback(text, 'like'));
        bubble.querySelector('.dislike-btn').addEventListener('click', () => sendFeedback(text, 'dislike'));

        container.innerHTML = `<div class="ai-avatar text-2xl">🌎</div>`;
        container.appendChild(bubble);
        chatContainer.appendChild(container);
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// --- Feedback Function ---
async function sendFeedback(text, type) {
    try {
        await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, type: type })
        });
        alert(`Thanks for your ${type}!`);
    } catch (e) { console.error("Feedback failed", e); }
}

// --- Voice & Mic (Fixes) ---
function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Mic not supported");
    
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;

    recognition.onstart = () => {
        if(isVoiceConversationActive) {
            voiceStatusText.textContent = "Listening...";
            // Animation removed per request
        } else {
            micBtn.classList.add('text-red-500');
        }
    };

    recognition.onend = () => {
        micBtn.classList.remove('text-red-500');
        // FIX: Handle Mic Button Input
        const transcript = voiceInterimTranscript.textContent.trim() || messageInput.value.trim(); // Fallback logic
        
        if (!isVoiceConversationActive && transcript) {
            // If just using mic button, put text in input
            // (Note: onresult usually handles filling input for simple mic)
        } 
        
        if (isVoiceConversationActive && transcript) {
             sendMessage(); 
        } else if (isVoiceConversationActive) {
             startListening(); // Restart if silent in Voice Mode
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
            // Mic Mode: Update input box directly
            if(final) messageInput.value += final + ' '; 
        }
    };
    recognition.start();
}

micBtn.addEventListener('click', () => {
    isVoiceConversationActive = false; // Ensure not in full voice mode
    startListening();
});

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
});

// --- Contact Us ---
// Replaced Help Logic
const contactBtn = document.querySelector('a[href*="website.html"]'); // Selector for old Help link
if(contactBtn) {
    contactBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
    <span class="text-sm font-medium text-gray-700">Contact Us</span>`;
    contactBtn.href = "#";
    contactBtn.addEventListener('click', (e) => {
        e.preventDefault();
        alert("📧 Email: ajayyanshu@gmail.com\n✈️ Telegram: @AjayYanshu");
    });
}

// --- Cyber Security (Fixes & Features) ---
cyberTrainingBtn.addEventListener('click', () => { closeSidebar(); cyberModal.classList.remove('hidden'); cyberModal.classList.add('flex'); });
closeCyberModalBtn.addEventListener('click', () => { cyberModal.classList.add('hidden'); cyberModal.classList.remove('flex'); });

levelBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const level = btn.getAttribute('data-level');
        startCyberGame(level);
    });
});

learnCyberBtn.addEventListener('click', () => {
    // Start A-Z Learning Mode
    cyberModal.classList.add('hidden');
    startNewChat();
    currentMode = 'cyber_theory';
    const intro = { text: "I want to learn Cyber Security from A to Z. Start with Chapter 1: Introduction to Cyber Security.", sender: 'user' };
    addMessage(intro);
    sendMessage(); // Triggers the mode in Python
});

function startCyberGame(level) {
    cyberModal.classList.add('hidden');
    startNewChat();
    const prompt = `[SYSTEM: Act as a ${level} Level Scammer. Goal: Trick the user.]`;
    // ... (Existing Game Logic)
    addMessage({text: `⚠️ **Cyber Challenge: ${level}**\nThe AI is now a hacker. Defend yourself!`, sender: 'system'});
    fetch('/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text: prompt + " Start now."})
    }).then(r=>r.json()).then(d=> addMessage({text: d.response, sender: 'ai'}));
}

// --- History Save/Load ---
async function saveChatSession() {
    if (!currentChat.length) return;
    const title = currentChat[0].text.substring(0,30);
    const res = await fetch('/api/chats', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id: currentChatId, messages: currentChat, title })
    });
    const data = await res.json();
    currentChatId = data.id;
}

async function loadChatsFromDB() {
    const res = await fetch('/api/chats');
    chatHistory = await res.json();
    renderChatHistory();
}

function loadChat(id) {
    const chat = chatHistory.find(c => c.id === id);
    if (!chat) return;
    currentChatId = id;
    currentChat = chat.messages || []; // Load messages
    
    // Clear UI
    chatContainer.innerHTML = '';
    welcomeMessageContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    document.body.classList.remove('initial-view');

    // Render Messages (this will use the saved fileInfo.dataUrl)
    currentChat.forEach(msg => addMessage(msg));
}

function startNewChat() {
    currentChat = [];
    currentChatId = null;
    chatContainer.innerHTML = '';
    welcomeMessageContainer.classList.remove('hidden');
    chatContainer.classList.add('hidden');
    document.body.classList.add('initial-view');
}

function renderChatHistory() {
    const container = document.getElementById('chat-history-container');
    container.innerHTML = '';
    chatHistory.forEach(c => {
        const div = document.createElement('div');
        div.className = 'chat-history-item p-2 hover:bg-gray-200 cursor-pointer';
        div.innerText = c.title;
        div.onclick = () => loadChat(c.id);
        container.appendChild(div);
    });
}

// Init
loadChatsFromDB();
