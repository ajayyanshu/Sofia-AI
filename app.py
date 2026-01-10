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

# --- MongoDB Configuration ---
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

# --- Flask-Login Configuration ---
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

# --- FIX: Robust Session Check ---
@app.before_request
def before_request_callback():
    if current_user.is_authenticated:
        # Exclude static files and auth routes from session verification
        if request.endpoint in ['static', 'logout', 'login_page', 'api_login']:
            return
            
        stored_session = session.get('session_id')
        if not stored_session or stored_session != current_user.session_id:
            logout_user()
            # Return JSON for API calls instead of redirecting to fix logout error
            if request.path.startswith('/chat') or request.path.startswith('/api/'):
                return jsonify({'error': 'Session expired'}), 401
            return redirect(url_for('login_page'))

# --- Security Scanner Logic (Nuclei & Nikto Integration) ---
def run_vulnerability_scan(target_url):
    """Executes Nuclei and Nikto scans and returns a raw report."""
    report = f"Scan Results for: {target_url}\n\n"
    
    # 1. Run Nuclei (Critical/High/Medium only)
    try:
        # Note: 'nuclei' and 'nikto' must be installed on your server environment
        nuclei_cmd = ["nuclei", "-target", target_url, "-silent", "-severity", "critical,high,medium", "-no-color"]
        nuclei_output = subprocess.check_output(nuclei_cmd, stderr=subprocess.STDOUT, timeout=300).decode('utf-8')
        report += f"--- Nuclei Findings ---\n{nuclei_output if nuclei_output.strip() else 'No high-risk vulnerabilities detected by Nuclei.'}\n\n"
    except Exception as e:
        report += f"Nuclei Scan Error: {str(e)}\n\n"

    # 2. Run Nikto (Limited tuning for speed)
    try:
        nikto_cmd = ["nikto", "-h", target_url, "-Tuning", "1,2,3,b", "-nointeractive"]
        nikto_output = subprocess.check_output(nikto_cmd, stderr=subprocess.STDOUT, timeout=300).decode('utf-8')
        report += f"--- Nikto Findings ---\n{nikto_output if nikto_output.strip() else 'No issues found by Nikto.'}\n"
    except Exception as e:
        report += f"Nikto Scan Error: {str(e)}\n"

    return report

# --- Chat & API Routes ---

@app.route('/')
@login_required
def home():
    if not current_user.is_verified:
        logout_user()
        return redirect(url_for('login_page'))
    return render_template('index.html')

@app.route('/login.html')
def login_page(): return render_template('login.html')

@app.route('/chat', methods=['POST'])
@login_required
def chat():
    data = request.json
    user_message = data.get('text', '')
    
    # Check if this is a Web Vulnerability Scan request
    if "[SYSTEM: Act as a Web Vulnerability Scanner." in user_message:
        url_match = re.search(r'User Link: (https?://[^\s]+)', user_message)
        if url_match:
            target_url = url_match.group(1)
            # 1. Execute Nuclei and Nikto
            raw_data = run_vulnerability_scan(target_url)
            
            # 2. Use Gemini to format the security report
            model = genai.GenerativeModel("gemini-1.5-flash")
            prompt = f"Analyze these security scanner results and provide a clean, educational report for an Ethical Hacking student. Suggest remediation steps.\n\nRaw Data:\n{raw_data}"
            response = model.generate_content(prompt)
            return jsonify({'response': response.text})

    # Standard Chat with Gemini
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(user_message)
        
        # Increment message usage
        if not current_user.isPremium and not current_user.isAdmin:
            users_collection.update_one({'_id': ObjectId(current_user.id)}, {'$inc': {'usage_counts.messages': 1}})
            
        return jsonify({'response': response.text})
    except Exception as e:
        return jsonify({'response': "Error processing request."}), 500

@app.route('/get_user_info')
@login_required
def get_user_info():
    user_data = users_collection.find_one({'_id': ObjectId(current_user.id)})
    return jsonify({
        "name": user_data.get("name"),
        "email": user_data.get("email"),
        "isAdmin": user_data.get("isAdmin", False),
        "isPremium": user_data.get("isPremium", False),
        "usageCounts": user_data.get("usage_counts", {"messages": 0, "webSearches": 0})
    })

@app.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
