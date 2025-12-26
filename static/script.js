@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* General Styling */
::selection { background-color: #3b82f6; color: #ffffff; }
html { overscroll-behavior: none; }
body { overflow: hidden; overscroll-behavior: none; font-family: 'Inter', sans-serif; background-color: #f8fafc; transition: background 0.3s ease; }

.chat-container { flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 1rem; scrollbar-width: none; }
.chat-container::-webkit-scrollbar { display: none; }

/* Messages */
.message-bubble { max-width: 85%; padding: 0.75rem 1.25rem; border-radius: 1.5rem; margin-bottom: 0.75rem; word-wrap: break-word; line-height: 1.6; position: relative; }
.user-message { background-color: #3b82f6; color: white; align-self: flex-end; border-bottom-right-radius: 0.5rem; }
.ai-message { background-color: #e5e7eb; color: #1f2937; align-self: flex-start; border-bottom-left-radius: 0.5rem; padding-bottom: 2.5rem; }

/* Input Bar & Icons */
#message-input { resize: none; overflow-y: hidden; max-height: 150px; }

/* Breathing Welcome Screen Gradient */
body.initial-view {
    background: linear-gradient(-45deg, #f8fafc, #e0e7ff, #f3e8ff, #e0f2fe);
    background-size: 400% 400%;
    animation: gradientBG 15s ease infinite;
}

@keyframes gradientBG {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}

/* Updated Voice Button Design */
#voice-mode-btn {
    transition: all 0.2s ease-in-out;
}
#voice-mode-btn:hover {
    transform: scale(1.05);
}

/* Dark Mode Overrides */
.dark body { background-color: #000000; }
.dark #sidebar { background-color: #111111; border-color: #292929; }
.dark header, .dark footer { background-color: #000000; border-color: #292929; }
.dark footer > div { background-color: #1c1c1c; border-color: #333333; }
.dark .ai-message { background-color: #222222; color: #e0e0e0; }
.dark #message-input { color: #f0f0f0; }

/* Waveform Background for Dark Mode */
.dark #voice-mode-btn {
    background-color: #1f2937;
}
.dark #voice-mode-btn:hover {
    background-color: #374151;
}

/* Animation for typing cursor */
.typing-cursor::after {
    content: '|';
    margin-left: 5px;
    color: #4f46e5;
    animation: blink 1s step-start infinite;
}
@keyframes blink { 50% { opacity: 0; } }

/* Sidebar Logic */
#sidebar { transition: transform 0.3s ease-in-out; }
.sidebar-item:hover { background-color: #e5e7eb; }
.dark .sidebar-item:hover { background-color: #252525; }
