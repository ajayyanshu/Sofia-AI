import base64 
import io
import os
import re
import sys
import json
import subprocess  # Needed to run Nikto and Nuclei
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

# --- MongoDB Initialization ---
mongo_client = None
users_collection = None
conversations_collection = None
library_collection = None

if MONGO_URI:
    try:
        mongo_client = MongoClient(MONGO_URI)
        db = mongo_client.get_database("ai_assistant_db")
        users_collection = db.get_collection("users")
        conversations_collection = db.get_collection("conversations")
        library_collection = db.get_collection("library_items")
        print("✅ MongoDB Connected")
    except Exception as e:
        print(f"❌ MongoDB Error: {e}")

# --- Flask-Login Setup ---
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
        user_data = users_collection.find_one({"_id": ObjectId(user_id)})
        return User(user_data) if user_data else None

@login_manager.user_loader
def load_user(user_id):
    return User.get(user_id)

# --- Security Scanner Logic (NEW) ---

def execute_security_tools(target_url):
    """Runs Nikto and Nuclei via subprocess and returns combined output."""
    combined_results = f"Scan Report for: {target_url}\n"
    
    # 1. Run Nuclei (Template-based scanner)
    try:
        # Running with low/medium severity filters to keep scan time reasonable for web response
        nuclei_cmd = ["nuclei", "-u", target_url, "-silent", "-severity", "low,medium,high", "-timeout", "5"]
        nuclei_output = subprocess.check_output(nuclei_cmd, stderr=subprocess.STDOUT, timeout=60).decode()
        combined_results += f"\n[NUCLEI RESULTS]\n{nuclei_output if nuclei_output else 'No vulnerabilities detected by Nuclei.'}\n"
    except Exception as e:
        combined_results += f"\n[NUCLEI ERROR] Could not run Nuclei: {str(e)}\n"

    # 2. Run Nikto (Web server scanner)
    try:
        # Using specific tuning to speed up the scan (1: Interesting files, 2: Misconfigurations)
        nikto_cmd = ["nikto", "-h", target_url, "-Tuning", "1,2,3", "-Display", "1", "-timeout", "5"]
        nikto_output = subprocess.check_output(nikto_cmd, stderr=subprocess.STDOUT, timeout=90).decode()
        combined_results += f"\n[NIKTO RESULTS]\n{nikto_output if nikto_output else 'No vulnerabilities detected by Nikto.'}\n"
    except Exception as e:
        combined_results += f"\n[NIKTO ERROR] Could not run Nikto: {str(e)}\n"
        
    return combined_results

# --- Core Chat Route (Modified for Scanner) ---

@app.route('/chat', methods=['POST'])
@login_required
def chat():
    # ... [Usage limit checks remain exactly as per your source code] ...
    user_data = users_collection.find_one({'_id': ObjectId(current_user.id)})
    if not current_user.isPremium and not current_user.isAdmin:
        usage = user_data.get('usage_counts', {})
        if usage.get('messages', 0) >= 15:
            return jsonify({'error': 'Limit reached', 'upgrade_required': True}), 429
        users_collection.update_one({'_id': ObjectId(current_user.id)}, {'$inc': {'usage_counts.messages': 1}})

    try:
        data = request.json
        user_message = data.get('text', '')
        file_data = data.get('fileData')
        file_type = data.get('fileType', '')
        request_mode = data.get('mode')

        # DETECTION: Check if this is a Web Scanner request
        if "Act as a Web Vulnerability Scanner" in user_message:
            # Extract URL from the system prompt sent by script.js
            url_match = re.search(r"Analyze the provided URL: (https?://[^\s]+)", user_message)
            if url_match:
                target_url = url_match.group(1)
                
                # Run real tools
                raw_logs = execute_security_tools(target_url)
                
                # Construct a new prompt for the AI using the tool output
                analysis_prompt = f"""
                Analyze these raw security logs for {target_url} and generate a professional 'Cyber Security Report Card'.
                
                LOG DATA:
                {raw_logs}
                
                INSTRUCTIONS:
                1. Assign a Security Grade (A, B, C, D, or F).
                2. Identify specific vulnerabilities (SQLi, XSS, Headers, etc).
                3. Provide clear remediation steps.
                4. Use the requested format: 'Cyber Security Report Card'.
                """
                
                model = genai.GenerativeModel("gemini-2.0-flash") # Updated for better reasoning
                response = model.generate_content(analysis_prompt)
                return jsonify({'response': response.text})

        # ... [Rest of your existing AI logic: Groq, Gemini, Search, etc.] ...
        # Standard AI logic continues here...
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(user_message)
        return jsonify({'response': response.text})

    except Exception as e:
        print(f"CHAT_ERROR: {e}")
        return jsonify({'response': "Sorry, an internal error occurred."})

# ... [Remaining routes: Library, History, Authentication remain the same as your source] ...

if __name__ == '__main__':

@app.errorhandler(404)
def handle_404(e):
    return redirect(url_for('login_page'))
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
