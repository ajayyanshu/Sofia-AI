import base64 
import io
import os
import re
import sys
import json
import subprocess
from datetime import datetime, date, timedelta
import uuid
import random
from threading import Thread

import docx
import fitz  # PyMuPDF
import google.generativeai as genai
import requests
from flask import (Flask, jsonify, render_template, request, session, redirect,
                   url_for, flash, make_response)
from flask_cors import CORS
from PIL import Image
from pymongo import MongoClient
from bson.objectid import ObjectId
from youtube_transcript_api import YouTubeTranscriptApi
from flask_login import (LoginManager, UserMixin, login_user, logout_user,
                         login_required, current_user)

app = Flask(__name__, template_folder='templates')
CORS(app)

# --- Configuration ---
SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "dev-secret-key") 
app.config['SECRET_KEY'] = SECRET_KEY

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
MONGO_URI = os.environ.get("MONGO_URI")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
SERPER_API_KEY = os.environ.get("SERPER_API_KEY")
BREVO_API_KEY = os.environ.get("BREVO_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "admin@sofia-ai.com")

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# --- MongoDB Setup ---
mongo_client = None
users_collection = None
conversations_collection = None
library_collection = None

if MONGO_URI:
    mongo_client = MongoClient(MONGO_URI)
    db = mongo_client.get_database("ai_assistant_db")
    users_collection = db.get_collection("users")
    conversations_collection = db.get_collection("conversations")
    library_collection = db.get_collection("library_items")

# --- Flask-Login ---
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login_page'

class User(UserMixin):
    def __init__(self, user_data):
        self.id = str(user_data["_id"])
        self.email = user_data.get("email")
        self.name = user_data.get("name")
        self.isAdmin = user_data.get("isAdmin", False)
        self.isPremium = user_data.get("isPremium", False)
        self.session_id = user_data.get("session_id")
        self.is_verified = user_data.get("is_verified", False)

    @staticmethod
    def get(user_id):
        if users_collection is None: return None
        user_data = users_collection.find_one({"_id": ObjectId(user_id)})
        return User(user_data) if user_data else None

@login_manager.user_loader
def load_user(user_id):
    return User.get(user_id)

# --- Security Scanner Logic (Nuclei & Nikto) ---
def run_vulnerability_scan(target_url):
    """Executes Nuclei and Nikto scans and returns a combined report."""
    report = f"### 🛡️ Security Scan Report for: {target_url}\n\n"
    
    # 1. Run Nuclei (Filtered for critical/high/medium)
    try:
        nuclei_cmd = ["nuclei", "-target", target_url, "-silent", "-severity", "critical,high,medium", "-no-color"]
        nuclei_output = subprocess.check_output(nuclei_cmd, stderr=subprocess.STDOUT, timeout=300).decode('utf-8')
        report += "#### 🔍 Nuclei Findings:\n"
        report += f"```\n{nuclei_output if nuclei_output.strip() else 'No critical/high vulnerabilities found by Nuclei.'}\n```\n\n"
    except Exception as e:
        report += f"❌ Nuclei Scan Failed: {str(e)}\n\n"

    # 2. Run Nikto
    try:
        # We limit nikto to a quick scan to avoid timeouts
        nikto_cmd = ["nikto", "-h", target_url, "-Tuning", "1,2,3,b"]
        nikto_output = subprocess.check_output(nikto_cmd, stderr=subprocess.STDOUT, timeout=300).decode('utf-8')
        # Simple cleanup of nikto output
        clean_nikto = re.sub(r'\+ ', '', nikto_output)
        report += "#### 🕵️ Nikto Findings:\n"
        report += f"```\n{clean_nikto if clean_nikto.strip() else 'No issues found by Nikto.'}\n```\n\n"
    except Exception as e:
        report += f"❌ Nikto Scan Failed: {str(e)}\n\n"

    report += "---\n**Disclaimer:** This scan is for educational purposes. Unauthorized scanning is illegal."
    return report

# --- Helper: Email via Brevo ---
def send_brevo_email(to_email, subject, html_content):
    if not BREVO_API_KEY: return False
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {"accept": "application/json", "api-key": BREVO_API_KEY, "content-type": "application/json"}
    payload = {"sender": {"email": SENDER_EMAIL, "name": "Sofia AI"}, "to": [{"email": to_email}], "subject": subject, "htmlContent": html_content}
    try:
        response = requests.post(url, headers=headers, json=payload)
        return response.status_code == 201
    except: return False

def send_async_brevo_email(app, to_email, subject, html_content):
    with app.app_context(): send_brevo_email(to_email, subject, html_content)

# --- Core Routes ---
@app.route('/')
@login_required
def home():
    if not current_user.is_verified:
        logout_user()
        return redirect(url_for('login_page', error="Please verify your email."))
    return render_template('index.html')

@app.route('/login.html')
def login_page(): return render_template('login.html')

@app.route('/signup.html')
def signup_page(): return render_template('signup.html')

@app.route('/api/signup', methods=['POST'])
def api_signup():
    data = request.get_json()
    otp_code = str(random.randint(100000, 999999))
    new_user = {
        "name": data.get('name'), "email": data.get('email'), "password": data.get('password'),
        "isAdmin": False, "isPremium": False, "is_verified": False, "verification_token": otp_code,
        "session_id": str(uuid.uuid4()), "usage_counts": {"messages": 0, "webSearches": 0},
        "last_usage_reset": datetime.utcnow().strftime('%Y-%m-%d'), "timestamp": datetime.utcnow().isoformat()
    }
    users_collection.insert_one(new_user)
    html = f"<h2>Welcome!</h2><p>Your OTP is: <b>{otp_code}</b></p>"
    Thread(target=send_async_brevo_email, args=(app, data.get('email'), "Verify Account", html)).start()
    return jsonify({'success': True})

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    user_data = users_collection.find_one({"email": data.get('email'), "password": data.get('password')})
    if user_data and user_data.get('is_verified'):
        user_obj = User(user_data)
        login_user(user_obj)
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Invalid credentials or unverified email.'}), 401

@app.route('/chat', methods=['POST'])
@login_required
def chat():
    data = request.json
    user_message = data.get('text', '')
    request_mode = data.get('mode')
    
    # --- 1. Detect Web Vulnerability Scan Trigger ---
    # The frontend sends a specific system prompt for URL scanning.
    if "[SYSTEM: Act as a Web Vulnerability Scanner." in user_message:
        # Extract the URL from the message
        url_match = re.search(r'User Link: (https?://[^\s]+)', user_message)
        if url_match:
            target_url = url_match.group(1)
            # Run the actual tools
            raw_scan_results = run_vulnerability_scan(target_url)
            
            # Now, pass the raw results to Gemini to make them pretty/readable
            model = genai.GenerativeModel("gemini-1.5-flash")
            formatted_prompt = f"Summarize these vulnerability scan results professionally. Explain what the user should fix.\n\nRaw Data:\n{raw_scan_results}"
            response = model.generate_content(formatted_prompt)
            
            return jsonify({'response': response.text})

    # --- 2. Standard Chat Logic ---
    model = genai.GenerativeModel("gemini-1.5-flash")
    try:
        response = model.generate_content(user_message)
        return jsonify({'response': response.text})
    except Exception as e:
        return jsonify({'response': "Error: " + str(e)})

@app.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'success': True})

@app.route('/api/chats', methods=['GET'])
@login_required
def get_chats():
    chats = list(conversations_collection.find({"user_id": ObjectId(current_user.id)}))
    return jsonify([{"id": str(c["_id"]), "title": c.get("title"), "messages": c.get("messages")} for c in chats])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
