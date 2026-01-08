@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

/* --- Global Settings --- */
body {
    font-family: 'Inter', sans-serif;
    -webkit-tap-highlight-color: transparent;
}

/* --- Scrollbar Styling --- */
/* For Webkit browsers (Chrome, Safari) */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: transparent;
}

::-webkit-scrollbar-thumb {
    background-color: #cbd5e1; /* gray-300 */
    border-radius: 4px;
}

.dark ::-webkit-scrollbar-thumb {
    background-color: #475569; /* gray-600 */
}

::-webkit-scrollbar-thumb:hover {
    background-color: #94a3b8; /* gray-400 */
}

.dark ::-webkit-scrollbar-thumb:hover {
    background-color: #64748b; /* gray-500 */
}

/* --- Loading Overlay & Spinner --- */
#loading-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(255, 255, 255, 0.9);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(5px);
}

.dark #loading-overlay {
    background-color: rgba(17, 24, 39, 0.9);
    color: white;
}

.loader-content {
    text-align: center;
}

.spinner {
    width: 50px;
    height: 50px;
    border: 5px solid #e2e8f0;
    border-top: 5px solid #4f46e5; /* indigo-600 */
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px auto;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* --- New Shortcut Icons (Added Feature) --- */
.shortcut-item {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 600;
    text-transform: uppercase;
    text-decoration: none;
    transition: transform 0.2s, box-shadow 0.2s;
    /* Default colors handled by Tailwind classes in HTML, 
       but we add base styles here to be safe */
    position: relative;
}

.shortcut-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* --- Voice Mode Visualizer --- */
.listening-bar {
    width: 4px;
    background-color: #6366f1; /* indigo-500 */
    border-radius: 2px;
    animation: bounce 1s infinite ease-in-out;
}

.listening-bar:nth-child(1) { animation-delay: 0s; }
.listening-bar:nth-child(2) { animation-delay: 0.2s; height: 16px; }
.listening-bar:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
    0%, 100% { height: 8px; }
    50% { height: 20px; }
}

/* --- Markdown Content Styling --- */
/* This ensures the bot's responses are styled correctly */
.prose {
    max-width: none;
    color: #374151; /* gray-700 */
}

.dark .prose {
    color: #d1d5db; /* gray-300 */
}

.prose p {
    margin-bottom: 1em;
    line-height: 1.6;
}

.prose h1, .prose h2, .prose h3 {
    color: #111827; /* gray-900 */
    font-weight: 600;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
}

.dark .prose h1, .dark .prose h2, .dark .prose h3 {
    color: #f3f4f6; /* gray-100 */
}

.prose ul {
    list-style-type: disc;
    padding-left: 1.5em;
    margin-bottom: 1em;
}

.prose ol {
    list-style-type: decimal;
    padding-left: 1.5em;
    margin-bottom: 1em;
}

.prose pre {
    background-color: #1e293b; /* slate-800 */
    color: #e2e8f0;
    padding: 1em;
    border-radius: 0.5em;
    overflow-x: auto;
    margin-bottom: 1em;
}

.prose code {
    background-color: #f3f4f6; /* gray-100 */
    padding: 0.2em 0.4em;
    border-radius: 0.25em;
    font-size: 0.875em;
    font-family: monospace;
}

.dark .prose code {
    background-color: #374151; /* gray-700 */
    color: #e5e7eb;
}

.prose pre code {
    background-color: transparent;
    padding: 0;
    color: inherit;
}

.prose a {
    color: #4f46e5; /* indigo-600 */
    text-decoration: underline;
}

.dark .prose a {
    color: #818cf8; /* indigo-400 */
}

/* --- Utilities --- */
.hidden {
    display: none !important;
}

/* Add specific override for dark mode modals if needed */
.dark .modal-box {
    background-color: #1f2937;
    border-color: #374151;
}
