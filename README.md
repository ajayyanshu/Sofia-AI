# Sofia AI 🤖 — Security-Focused Multimodal Assistant

> **A robust, multimodal AI assistant designed for cybersecurity education, real-time web intelligence, and secure code analysis.**

![Python](https://img.shields.io/badge/Python-3.10%2B-blue) ![Flask](https://img.shields.io/badge/Backend-Flask-lightgrey) ![MongoDB](https://img.shields.io/badge/Database-MongoDB-green) ![Security](https://img.shields.io/badge/Focus-Cybersecurity-red)

**Sofia AI** goes beyond standard chatbots by integrating **Ethical Hacking education**, **Real-time Web Search**, and **Multimodal capabilities** (Voice, Image, File) into a secure, full-stack application. It leverages **Google Gemini** and **Groq** for high-performance inference and includes production-grade security features like **Brevo-verified authentication**.

---

## 🚀 Key Features

### 🛡️ Security & Education
* **Teacher Mode (Ethical Hacking Instructor):** A specialized mode that transforms Sofia into an expert instructor, guiding users through penetration testing methodologies, defense strategies, and safety protocols.
* **Secure Code Analysis:** Upload code files for instant vulnerability scanning and security recommendations.
* **Threat Mitigation:** Built-in input validation to protect against prompt injection and jailbreak attempts.

### 🧠 Multimodal Intelligence
* **Voice-to-Voice Interaction:** Full duplex voice communication with microphone integration and text-to-speech response.
* **Image & File Vision:** Analyze uploaded images, PDFs, and documents for content extraction and summarization.
* **Real-Time Web Search:** Fetches live data from the web (via Serper.dev) to provide up-to-date answers with citations.

### 🔐 Robust Architecture
* **Secure Authentication:** User signup/login system integrated with **Brevo API** for email verification (OTP/Links) to prevent bot accounts.
* **Multi-Model Routing:** Dynamically switches between **Google Gemini** (for reasoning/multimodal) and **Groq** (for speed) based on the task.

---

## 🛠️ Tech Stack

* **Backend:** Python (Flask), Werkzeug Security
* **Frontend:** Vanilla JavaScript, HTML5, CSS3 (Responsive Design)
* **Database:** MongoDB (User data & Chat history)
* **AI Models:** Google Gemini Pro, Groq (Llama 3 / Mixtral)
* **APIs:** Serper.dev (Search), Brevo (Email Auth)

---

## ⚙️ Installation & Setup

Follow these steps to set up Sofia AI locally:

### 1. Clone the Repository
```bash
git clone https://github.com/ajayyanshu/Sofia-AI.git
cd Sofia-AI
```

### 2. Create a Virtual Environment
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```
### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Create a .env file in the root directory and add your API keys:
```bash
# Database
MONGO_URI=your_mongodb_connection_string

# AI Models
GOOGLE_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# Tools
SERPER_API_KEY=your_serper_api_key (for Web Search)
BREVO_API_KEY=your_brevo_api_key (for Email Verification)

# Security
SECRET_KEY=your_flask_secret_key
```
### 5. Run the Application
```bash
python app.py
```
Visit http://127.0.0.1:5000 in your browser.
---

## 📸 Interface & Demo

*(Add your main dashboard or chat interface screenshot here to grab attention immediately)*

![Sofia AI Dashboard](https://via.placeholder.com/800x400?text=Upload+Your+Main+Dashboard+Screenshot+Here)

> *Featuring Dark Mode, Code Highlighting, and Real-time Voice Interaction.*
> ---


### 🔮 Future Roadmap

[ ] Integration with local LLMs (Ollama) for offline privacy.

[ ] Advanced report generation for vulnerability scans.

[ ] Docker support for easy deployment.

### 📩 Contact
Ajay Kumar Security Engineer & Developer
