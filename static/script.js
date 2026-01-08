document.addEventListener('DOMContentLoaded', () => {
    
    // --- DOM Elements ---
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const chatContainer = document.getElementById('chat-container');
    
    // Modals
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const closeSettingsBtnDesktop = document.getElementById('close-settings-btn-desktop');
    const settingsMenuItem = document.getElementById('settings-menu-item');

    const contactModal = document.getElementById('contact-modal');
    const contactMenuItem = document.getElementById('contact-menu-item');
    const closeContactModal = document.getElementById('close-contact-modal');

    // Voice
    const voiceModeBtn = document.getElementById('voice-mode-btn');
    const voiceOverlay = document.getElementById('voice-overlay');
    const endVoiceBtn = document.getElementById('end-voice-btn');

    // --- NEW: Shortcuts Functionality ---
    const addShortcutBtn = document.getElementById('add-shortcut-btn');
    const shortcutModal = document.getElementById('add-shortcut-modal');
    const cancelShortcutBtn = document.getElementById('cancel-shortcut-btn');
    const saveShortcutBtn = document.getElementById('save-shortcut-btn');
    const shortcutsContainer = document.getElementById('shortcuts-container');
    const nameInput = document.getElementById('shortcut-name-input');
    const urlInput = document.getElementById('shortcut-url-input');

    // 1. Open Shortcut Modal
    if (addShortcutBtn) {
        addShortcutBtn.addEventListener('click', () => {
            shortcutModal.classList.remove('hidden');
            shortcutModal.classList.add('flex');
            nameInput.focus();
        });
    }

    // 2. Close Shortcut Modal
    function closeShortcutModal() {
        if (shortcutModal) {
            shortcutModal.classList.add('hidden');
            shortcutModal.classList.remove('flex');
            // Clear inputs
            nameInput.value = '';
            urlInput.value = '';
        }
    }

    if (cancelShortcutBtn) {
        cancelShortcutBtn.addEventListener('click', closeShortcutModal);
    }

    // Close if clicking outside the modal content
    if (shortcutModal) {
        shortcutModal.addEventListener('click', (e) => {
            if (e.target === shortcutModal) {
                closeShortcutModal();
            }
        });
    }

    // 3. Save New Shortcut
    if (saveShortcutBtn) {
        saveShortcutBtn.addEventListener('click', () => {
            const name = nameInput.value.trim();
            let url = urlInput.value.trim();

            if (name && url) {
                // Ensure URL has protocol
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://' + url;
                }

                // Create the new shortcut element (Anchor tag)
                const newShortcut = document.createElement('a');
                newShortcut.href = url;
                newShortcut.target = "_blank";
                newShortcut.rel = "noopener noreferrer"; // Security best practice
                // Apply the same classes as the styled container items
                newShortcut.className = 'shortcut-item bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
                newShortcut.innerText = name.charAt(0).toUpperCase(); // Use first letter as icon
                newShortcut.title = name; // Tooltip

                // Insert the new shortcut BEFORE the "+" button
                shortcutsContainer.insertBefore(newShortcut, addShortcutBtn);

                closeShortcutModal();
            }
        });
    }


    // --- Sidebar Logic ---
    function toggleSidebar() {
        const isClosed = sidebar.classList.contains('-translate-x-full');
        if (isClosed) {
            sidebar.classList.remove('-translate-x-full');
            sidebarOverlay.classList.remove('hidden');
        } else {
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.classList.add('hidden');
        }
    }

    if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);


    // --- Settings Modal Logic ---
    function openSettings() {
        settingsModal.classList.remove('hidden');
        settingsModal.classList.add('flex');
        if (window.innerWidth < 640) toggleSidebar(); // Close sidebar on mobile
    }

    function closeSettings() {
        settingsModal.classList.add('hidden');
        settingsModal.classList.remove('flex');
    }

    if (settingsMenuItem) settingsMenuItem.addEventListener('click', openSettings);
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettings);
    if (closeSettingsBtnDesktop) closeSettingsBtnDesktop.addEventListener('click', closeSettings);


    // --- Contact Modal Logic ---
    function openContact() {
        contactModal.classList.remove('hidden');
        contactModal.classList.add('flex');
        if (window.innerWidth < 640) toggleSidebar();
    }

    function closeContact() {
        contactModal.classList.add('hidden');
        contactModal.classList.remove('flex');
    }

    if (contactMenuItem) contactMenuItem.addEventListener('click', openContact);
    if (closeContactModal) closeContactModal.addEventListener('click', closeContact);


    // --- Voice Mode Logic ---
    if (voiceModeBtn) {
        voiceModeBtn.addEventListener('click', () => {
            voiceOverlay.classList.remove('hidden');
            voiceOverlay.classList.add('flex');
            // Logic to start voice recognition would go here
        });
    }

    if (endVoiceBtn) {
        endVoiceBtn.addEventListener('click', () => {
            voiceOverlay.classList.add('hidden');
            voiceOverlay.classList.remove('flex');
            // Logic to stop voice recognition would go here
        });
    }


    // --- Chat Input Logic ---
    // Auto-resize textarea
    if (messageInput) {
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            
            // Toggle send button visibility based on input
            if (this.value.trim().length > 0) {
                sendBtn.classList.remove('hidden');
            } else {
                sendBtn.classList.add('hidden');
            }
        });

        // Handle Enter key to send
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (this.value.trim().length > 0) {
                    // Trigger send button click
                    sendBtn.click();
                }
            }
        });
    }
    
    // --- File Upload Menus ---
    const addBtn = document.getElementById('add-btn');
    const addMenu = document.getElementById('add-menu');
    
    if (addBtn && addMenu) {
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addMenu.classList.toggle('hidden');
        });
        
        // Close menu when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!addBtn.contains(e.target) && !addMenu.contains(e.target)) {
                addMenu.classList.add('hidden');
            }
        });
    }

});
