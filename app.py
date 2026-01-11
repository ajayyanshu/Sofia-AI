import base64 
import io
import os
import re
import sys
import json
import subprocess
import shlex
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

# --- Brevo (Email) Configuration ---
BREVO_API_KEY = os.environ.get("BREVO_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "admin@sofia-ai.com")

# --- API Services Configuration ---
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# --- MongoDB Configuration ---
mongo_client = None
chat_history_collection = None
users_collection = None
conversations_collection = None
library_collection = None

if MONGO_URI:
    try:
        mongo_client = MongoClient(MONGO_URI)
        db = mongo_client.get_database("ai_assistant_db")
        chat_history_collection = db.get_collection("chat_history")
        users_collection = db.get_collection("users")
        conversations_collection = db.get_collection("conversations")
        library_collection = db.get_collection("library_items")
    except Exception as e:
        print(f"CRITICAL ERROR: Could not connect to MongoDB: {e}")

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

# --- Helper: Security Tool Execution ---
def run_real_scan(target_url):
    """Executes Nuclei and Nikto for real-time vulnerability analysis."""
    clean_url = shlex.quote(target_url)
    report = []

    # 1. Run Nuclei (Fast & Modern)
    try:
        nuclei_cmd = f"nuclei -u {clean_url} -silent -severity low,medium,high"
        res = subprocess.run(shlex.split(nuclei_cmd), capture_output=True, text=True, timeout=90)
        report.append(f"--- Nuclei Results ---\n{res.stdout if res.stdout else 'No significant vulnerabilities found.'}")
    except Exception as e:
        report.append(f"Nuclei Error: {str(e)}")

    # 2. Run Nikto (Comprehensive Web Server Scan)
    try:
        nikto_cmd = f"nikto -h {clean_url} -Tuning 123b"
        res = subprocess.run(shlex.split(nikto_cmd), capture_output=True, text=True, timeout=120)
        report.append(f"--- Nikto Results ---\n{res.stdout if res.stdout else 'No server configuration issues found.'}")
    except Exception as e:
        report.append(f"Nikto Error: {str(e)}")

    return "\n\n".join(report)

# --- Routes ---
@app.route('/')
@login_required
def home():
    if not current_user.is_verified: return redirect(url_for('login_page'))
    return render_template('index.html')

@app.route('/login.html')
def login_page(): return render_template('login.html')

@app.route('/signup.html')
def signup_page(): return render_template('signup.html')

# --- Chat API with Tool Integration ---
# ... (existing imports and config)

@app.route('/chat', methods=['POST'])
@login_required
def chat():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data received"}), 400

        user_message = data.get('text', '')
        
        # Security Scan Logic (Nikto/Nuclei Trigger)
        if "[SYSTEM: Act as a Web Vulnerability Scanner." in user_message:
            url_match = re.search(r"URL: (https?://[^\s]+)", user_message)
            if url_match:
                target = url_match.group(1)
                # Call the scanning function (ensure run_real_scan is defined in your app.py)
                scan_results = run_real_scan(target) 
                user_message = f"Analyze these results: {scan_results}"

        # Gemini AI Logic
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(user_message)
        
        return jsonify({'response': response.text})

    except Exception as e:
        print(f"Chat Error: {str(e)}")
        return jsonify({'error': "Server internal error"}), 500

# MANDATORY: This allows the server to be reached from your browser
if __name__ == '__main__':
    # Use 0.0.0.0 to ensure it's accessible within Docker or on a network
    app.run(host='0.0.0.0', port=5000, debug=True)
