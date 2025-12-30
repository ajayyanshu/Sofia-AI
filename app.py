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
from flask_login import (LoginManager, login_user, logout_user,
                         login_required, current_user)

# --- NEW: Import from your models.py ---
from models import User, users_collection, db

app = Flask(__name__, template_folder='templates')
CORS(app)

# --- Configuration ---
SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "dev-secret-key") 
app.config['SECRET_KEY'] = SECRET_KEY
# Required for persistent sessions on Render (HTTPS)
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
SERPER_API_KEY = os.environ.get("SERPER_API_KEY")
BREVO_API_KEY = os.environ.get("BREVO_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "admin@sofia-ai.com")

# --- Initialize Other Collections (using the DB from models.py) ---
chat_history_collection = db.get_collection("chat_history") if db is not None else None
conversations_collection = db.get_collection("conversations") if db is not None else None
library_collection = db.get_collection("library_items") if db is not None else None

# --- AI Configuration ---
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# --- Flask-Login Configuration ---
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login_page'

@login_manager.user_loader
def load_user(user_id):
    # Use the static method from your new models.py
    return User.get_by_id(user_id)

# --- FIX: Automatic Logout & Session Sync ---
@app.before_request
def before_request_callback():
    if current_user.is_authenticated:
        user_session_id = session.get('session_id')
        # If the session cookie is missing but user is logged in, re-sync it
        if user_session_id is None:
            session['session_id'] = current_user.session_id
            session.permanent = True
        # Only log out if there is a real mismatch (multi-device protection)
        elif user_session_id != current_user.session_id:
            logout_user()
            flash("Logged out from another device.", "info")
            return redirect(url_for('login_page'))

# --- Helper: Send Email via Brevo ---
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
        return response.status_code < 300
    except: return False

def send_async_brevo_email(app, to_email, subject, html_content):
    with app.app_context():
        send_brevo_email(to_email, subject, html_content)

# --- UI Routes ---
@app.route('/')
@login_required
def home():
    if not current_user.is_verified:
        logout_user()
        return redirect(url_for('login_page', error="Please verify your email."))
    return render_template('index.html')

@app.route('/login')
@app.route('/login.html')
def login_page():
    if current_user.is_authenticated: return redirect(url_for('home'))
    return render_template('login.html')

@app.route('/signup')
@app.route('/signup.html')
def signup_page():
    if current_user.is_authenticated: return redirect(url_for('home'))
    return render_template('signup.html')

# --- Authentication APIs ---

@app.route('/api/signup', methods=['POST'])
def api_signup():
    data = request.get_json()
    email = data.get('email')
    if users_collection.find_one({"email": email}):
        return jsonify({'success': False, 'error': 'Email exists.'}), 409

    otp_code = str(random.randint(100000, 999999))
    users_collection.insert_one({
        "name": data.get('name'), "email": email, "password": data.get('password'),
        "is_verified": False, "verification_token": otp_code, "session_id": str(uuid.uuid4()),
        "usage_counts": {"messages": 0, "webSearches": 0},
        "last_usage_reset": datetime.utcnow().strftime('%Y-%m-%d'),
        "timestamp": datetime.utcnow().isoformat()
    })
    
    html = f"<h2>Verify Sofia AI</h2><p>Your code: <b>{otp_code}</b></p>"
    Thread(target=send_async_brevo_email, args=(app, email, "Verification Code", html)).start()
    return jsonify({'success': True})

@app.route('/api/verify_otp', methods=['POST'])
def api_verify_otp():
    data = request.get_json()
    user = users_collection.find_one({"email": data.get('email'), "verification_token": data.get('otp')})
    if not user: return jsonify({'success': False, 'error': 'Invalid OTP.'}), 400
    users_collection.update_one({"_id": user["_id"]}, {"$set": {"is_verified": True}, "$unset": {"verification_token": 1}})
    return jsonify({'success': True})

# --- SOLVED: Resend OTP Route (Calls models.py) ---
@app.route('/api/resend_otp', methods=['POST'])
def api_resend_otp():
    data = request.get_json()
    email = data.get('email')
    
    # Use the logic you just added to models.py
    success, message = User.resend_otp_logic(email)
    
    if success:
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': message}), 400

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    user_data = users_collection.find_one({"email": data.get('email'), "password": data.get('password')})
    if user_data:
        if not user_data.get('is_verified'): return jsonify({'success': False, 'error': 'Verify email first.'}), 403
        
        new_sid = str(uuid.uuid4())
        users_collection.update_one({'_id': user_data['_id']}, {'$set': {'session_id': new_sid}})
        
        user_obj = User.get_by_id(str(user_data['_id']))
        login_user(user_obj, remember=True)
        session['session_id'] = new_sid
        session.permanent = True
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Invalid login.'}), 401

@app.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    session.clear()
    return jsonify({'success': True})

# --- (Keep all your existing chat/library routes below this line) ---
# ... [Omitted for brevity, keep the rest of your original code here] ...

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
