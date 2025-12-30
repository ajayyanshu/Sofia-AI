import base64 
import io
import os
import re
import sys
import json
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

# --- API & MongoDB Initialization ---
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

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
    except Exception as e:
        print(f"MongoDB Error: {e}")

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

# --- Email Helper ---
def send_brevo_email(to_email, subject, html_content):
    if not BREVO_API_KEY: return False
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {"accept": "application/json", "api-key": BREVO_API_KEY, "content-type": "application/json"}
    payload = {
        "sender": {"email": SENDER_EMAIL, "name": "Sofia AI"},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content
    }
    try:
        response = requests.post(url, headers=headers, json=payload)
        return response.status_code == 201
    except:
        return False

def send_async_brevo_email(app, to_email, subject, html_content):
    with app.app_context():
        send_brevo_email(to_email, subject, html_content)

# --- Auth Routes ---

@app.route('/api/signup', methods=['POST'])
def api_signup():
    data = request.get_json()
    name, email, password = data.get('name'), data.get('email'), data.get('password')
    if users_collection.find_one({"email": email}):
        return jsonify({'success': False, 'error': 'Email already exists.'}), 409

    otp_code = str(random.randint(100000, 999999))
    users_collection.insert_one({
        "name": name, "email": email, "password": password, "is_verified": False,
        "verification_token": otp_code, "session_id": str(uuid.uuid4()),
        "usage_counts": {"messages": 0, "webSearches": 0},
        "last_usage_reset": datetime.utcnow().strftime('%Y-%m-%d'),
        "timestamp": datetime.utcnow().isoformat()
    })
    
    html = f"<h2>Welcome {name}</h2><p>Your OTP: <b>{otp_code}</b></p>"
    Thread(target=send_async_brevo_email, args=(app, email, "Verify Your Account", html)).start()
    return jsonify({'success': True, 'message': 'OTP sent!'})

@app.route('/api/verify_otp', methods=['POST'])
def api_verify_otp():
    data = request.get_json()
    email, otp = data.get('email'), data.get('otp')
    user = users_collection.find_one({"email": email, "verification_token": otp})
    if not user:
        return jsonify({'success': False, 'error': 'Invalid OTP.'}), 400
    users_collection.update_one({"_id": user["_id"]}, {"$set": {"is_verified": True}, "$unset": {"verification_token": 1}})
    return jsonify({'success': True})

@app.route('/api/resend_otp', methods=['POST'])
def api_resend_otp():
    """Generates and sends a new OTP for verification."""
    data = request.get_json()
    email = data.get('email')
    user = users_collection.find_one({"email": email})
    
    if not user:
        return jsonify({'success': False, 'error': 'User not found.'}), 404
    if user.get('is_verified'):
        return jsonify({'success': False, 'error': 'Already verified.'}), 400

    new_otp = str(random.randint(100000, 999999))
    users_collection.update_one({"_id": user["_id"]}, {"$set": {"verification_token": new_otp}})
    
    html = f"<h3>New Code</h3><p>Your new verification code is: <b>{new_otp}</b></p>"
    Thread(target=send_async_brevo_email, args=(app, email, "New Verification Code", html)).start()
    return jsonify({'success': True, 'message': 'New OTP sent!'})

# --- UI & Other API Routes (Summary) ---
@app.route('/')
@login_required
def home():
    if not current_user.is_verified:
        logout_user()
        return redirect(url_for('login_page', error="Verify your email."))
    return render_template('index.html')

@app.route('/login.html')
def login_page(): return render_template('login.html')

@app.route('/signup.html')
def signup_page(): return render_template('signup.html')

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    user_data = users_collection.find_one({"email": data.get('email'), "password": data.get('password')})
    if user_data:
        if not user_data.get('is_verified'): return jsonify({'success': False, 'error': 'Verify email first.'}), 403
        user_obj = User(user_data)
        login_user(user_obj)
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Invalid credentials.'}), 401

# --- Render Deployment Start ---
if __name__ == '__main__':
    # Render uses the PORT environment variable
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
