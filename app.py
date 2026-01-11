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

# Note: We removed Flask-Mail imports as we are now using Brevo API directly via requests

app = Flask(__name__, template_folder='templates')
CORS(app)

# --- Configuration ---
SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "dev-secret-key") 
app.config['SECRET_KEY'] = SECRET_KEY
if SECRET_KEY == "dev-secret-key":
    print("CRITICAL WARNING: Using a default, insecure FLASK_SECRET_KEY for development.")

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
MONGO_URI = os.environ.get("MONGO_URI")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
SERPER_API_KEY = os.environ.get("SERPER_API_KEY")

# --- Brevo (Email) Configuration ---
BREVO_API_KEY = os.environ.get("BREVO_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "admin@sofia-ai.com") # Must be verified in Brevo

if not BREVO_API_KEY:
    print("CRITICAL WARNING: BREVO_API_KEY not found. Email features will not work.")

# --- API Services Configuration ---
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    print(f"✅ Loaded google-generativeai version: {genai.__version__}")
else:
    print("CRITICAL ERROR: GOOGLE_API_KEY environment variable not found.")

if YOUTUBE_API_KEY:
    print("✅ YouTube API Key loaded.")
else:
    print("CRITICAL WARNING: YOUTUBE_API_KEY not found. YouTube features will be disabled.")

if SERPER_API_KEY:
    print("✅ Serper API Key (for web search) loaded.")
else:
    print("CRITICAL WARNING: SERPER_API_KEY not found. AI web search will be disabled.")

# --- MongoDB Configuration ---
mongo_client = None
chat_history_collection = None
temporary_chat_collection = None
conversations_collection = None
users_collection = None
library_collection = None

if MONGO_URI:
    try:
        mongo_client = MongoClient(MONGO_URI)
        db = mongo_client.get_database("ai_assistant_db")
        db.command('ping')
        print("✅ Successfully pinged MongoDB.")
        
        chat_history_collection = db.get_collection("chat_history")
        temporary_chat_collection = db.get_collection("temporary_chats")
        conversations_collection = db.get_collection("conversations")
        users_collection = db.get_collection("users")
        library_collection = db.get_collection("library_items")
        print("✅ Successfully connected to MongoDB.")
    except Exception as e:
        print(f"CRITICAL ERROR: Could not connect to MongoDB. Error: {e}")
else:
    print("CRITICAL WARNING: MONGO_URI not found. Data will not be saved.")

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
        if users_collection is None:
            return None
        try:
            user_data = users_collection.find_one({"_id": ObjectId(user_id)})
            return User(user_data) if user_data else None
        except Exception as e:
            print(f"USER_GET_ERROR: Failed to get user {user_id}. Error: {e}")
            return None

@login_manager.user_loader
def load_user(user_id):
    return User.get(user_id)

@app.before_request
def before_request_callback():
    if current_user.is_authenticated:
        if session.get('session_id') != current_user.session_id:
            logout_user()
            flash("You have been logged out from another device.", "info")
            return redirect(url_for('login_page'))

# --- GitHub Configuration ---
GITHUB_USER = os.environ.get("GITHUB_USER")
GITHUB_REPO = os.environ.get("GITHUB_REPO")
GITHUB_FOLDER_PATH = os.environ.get("GITHUB_FOLDER_PATH", "")
PDF_KEYWORDS = {} # Configure your keywords here

# --- Helper: Security Tool Execution ---
def run_real_scan(target_url):
    """Executes Nuclei and Nikto for real-time vulnerability analysis."""
    clean_url = shlex.quote(target_url)
    report = []

    # 1. Run Nuclei
    try:
        nuclei_cmd = f"nuclei -u {clean_url} -silent -severity low,medium,high"
        res = subprocess.run(shlex.split(nuclei_cmd), capture_output=True, text=True, timeout=90)
        report.append(f"--- Nuclei Results ---\n{res.stdout if res.stdout else 'No significant vulnerabilities found.'}")
    except Exception as e:
        report.append(f"Nuclei Error: {str(e)}")

    # 2. Run Nikto
    try:
        nikto_cmd = f"nikto -h {clean_url} -Tuning 123b"
        res = subprocess.run(shlex.split(nikto_cmd), capture_output=True, text=True, timeout=120)
        report.append(f"--- Nikto Results ---\n{res.stdout if res.stdout else 'No server configuration issues found.'}")
    except Exception as e:
        report.append(f"Nikto Error: {str(e)}")

    return "\n\n".join(report)

# --- Helper: Send Email via Brevo ---
def send_brevo_email(to_email, subject, html_content):
    """Sends an email using the Brevo (Sendinblue) API."""
    if not BREVO_API_KEY:
        print("EMAIL SKIP: BREVO_API_KEY is not set.")
        return False

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }
    payload = {
        "sender": {"email": SENDER_EMAIL, "name": "Sofia AI"},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status() 
        print(f"✅ Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"❌ BREVO EMAIL ERROR: {e}")
        return False

def send_async_brevo_email(app, to_email, subject, html_content):
    """Wrapper to run email sending in a background thread."""
    with app.app_context():
        send_brevo_email(to_email, subject, html_content)


# --- Page Rendering Routes ---

@app.route('/')
@login_required
def home():
    """Renders the main chat application."""
    if not current_user.is_verified:
        logout_user()
        return redirect(url_for('login_page', error="Please verify your email address."))
    return render_template('index.html') 

@app.route('/login.html', methods=['GET'])
def login_page():
    """Renders the login page."""
    if current_user.is_authenticated:
        return redirect(url_for('home'))
    return render_template('login.html')

@app.route('/signup.html', methods=['GET'])
def signup_page():
    """Renders the signup page."""
    if current_user.is_authenticated:
        return redirect(url_for('home'))
    return render_template('signup.html')

@app.route('/login')
def login_redirect():
    return redirect(url_for('login_page'))

@app.route('/signup')
def signup_redirect():
    return redirect(url_for('signup_page'))
  
@app.route('/reset-password')
def reset_password_page():
    return render_template('reset_password.html')

# --- API Authentication Routes ---

@app.route('/api/signup', methods=['POST'])
def api_signup():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@example.com")

    if not all([name, email, password]):
        return jsonify({'success': False, 'error': 'Please fill out all fields.'}), 400

    if users_collection is None:
        return jsonify({'success': False, 'error': 'Database not configured.'}), 500

    if users_collection.find_one({"email": email}):
        return jsonify({'success': False, 'error': 'An account with this email already exists.'}), 409

    # Generate a 6-digit OTP code
    otp_code = str(random.randint(100000, 999999))

    new_user = {
        "name": name, 
        "email": email, 
        "password": password, 
        "isAdmin": email == ADMIN_EMAIL, 
        "isPremium": False, 
        "is_verified": False,
        "verification_token": otp_code, 
        "session_id": str(uuid.uuid4()),
        "usage_counts": { "messages": 0, "webSearches": 0 },
        "last_usage_reset": datetime.utcnow().strftime('%Y-%m-%d'),
        "timestamp": datetime.utcnow().isoformat()
    }
    users_collection.insert_one(new_user)

    # Send Verification Email with OTP
    html_content = f"""
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="text-align: center; color: #333;">Welcome to Sofia AI, {name}!</h2>
        <p style="font-size: 16px; color: #555;">Please use the following code to verify your email address and activate your account:</p>
        <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #FF4B2B; background: #f9f9f9; padding: 10px 20px; border-radius: 5px; border: 1px dashed #FF4B2B;">
                {otp_code}
            </span>
        </div>
        <p style="font-size: 14px; color: #888; text-align: center;">This code will expire shortly. If you did not request this, please ignore this email.</p>
    </div>
    """
    
    Thread(target=send_async_brevo_email, args=(app, email, "Your Sofia AI Verification Code", html_content)).start()

    return jsonify({'success': True, 'message': 'OTP sent! Please check your email.'})


@app.route('/api/verify_otp', methods=['POST'])
def api_verify_otp():
    """Endpoint to verify the 6-digit OTP code."""
    data = request.get_json()
    email = data.get('email')
    otp = data.get('otp')

    if not all([email, otp]):
        return jsonify({'success': False, 'error': 'Email and OTP are required.'}), 400

    if users_collection is None:
        return jsonify({'success': False, 'error': 'Database not configured.'}), 500

    user = users_collection.find_one({"email": email, "verification_token": otp})

    if not user:
        return jsonify({'success': False, 'error': 'Invalid or incorrect OTP.'}), 400

    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"is_verified": True}, "$unset": {"verification_token": 1}}
    )

    return jsonify({'success': True, 'message': 'Account verified successfully!'})


@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not all([email, password]):
        return jsonify({'success': False, 'error': 'Please enter both email and password.'}), 400

    if users_collection is None:
        return jsonify({'success': False, 'error': 'Database not configured.'}), 500
        
    user_data = users_collection.find_one({"email": email})

    if user_data and user_data.get('password') == password:
        if not user_data.get('is_verified', False):
             return jsonify({'success': False, 'error': 'Please verify your email address first.'}), 403

        new_session_id = str(uuid.uuid4())
        users_collection.update_one({'_id': user_data['_id']}, {'$set': {'session_id': new_session_id}})
        user_data['session_id'] = new_session_id

        user_obj = User(user_data)
        login_user(user_obj)
        session['session_id'] = new_session_id
        return jsonify({'success': True, 'user': {'name': user_data['name'], 'email': user_data['email']}})
    else:
        return jsonify({'success': False, 'error': 'Incorrect email or password.'}), 401

@app.route('/api/request_password_reset', methods=['POST'])
def request_password_reset():
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({'success': False, 'error': 'Email is required.'}), 400

    user = users_collection.find_one({"email": email})
    if not user:
        return jsonify({'success': True, 'message': 'If an account exists, a reset link has been sent.'})

    reset_token = uuid.uuid4().hex
    token_expiry = datetime.utcnow() + timedelta(hours=1)
    
    users_collection.update_one(
        {'_id': user['_id']},
        {'$set': {'password_reset_token': reset_token, 'reset_token_expires_at': token_expiry}}
    )
    
    reset_url = url_for('home', _external=True) + f'reset-password?token={reset_token}'
    
    html_content = f"""
    <h3>Password Reset Request</h3>
    <p>You requested a password reset for Sofia AI. Click the link below to reset it:</p>
    <p><a href="{reset_url}" style="color: #FF4B2B;">Reset Password</a></p>
    <p>This link expires in 1 hour.</p>
    """
    
    Thread(target=send_async_brevo_email, args=(app, email, "Reset Your Password - Sofia AI", html_content)).start()
        
    return jsonify({'success': True, 'message': 'If an account exists, a reset link has been sent.'})

@app.route('/api/reset_password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('new_password')

    if not all([token, new_password]):
        return jsonify({'success': False, 'error': 'Token and new password are required.'}), 400

    user = users_collection.find_one({
        "password_reset_token": token,
        "reset_token_expires_at": {"$gt": datetime.utcnow()}
    })

    if not user:
        return jsonify({'success': False, 'error': 'Invalid or expired token.'}), 400
        
    users_collection.update_one(
        {'_id': user['_id']},
        {
            '$set': {'password': new_password},
            '$unset': {'password_reset_token': "", 'reset_token_expires_at': ""}
        }
    )
    
    return jsonify({'success': True, 'message': 'Password has been reset successfully.'})

@app.route('/get_user_info')
@login_required
def get_user_info():
    user_data = users_collection.find_one({'_id': ObjectId(current_user.id)})
    usage_counts = user_data.get('usage_counts', {"messages": 0, "webSearches": 0})
    
    return jsonify({
        "name": current_user.name,
        "email": current_user.email,
        "isAdmin": current_user.isAdmin,
        "isPremium": current_user.isPremium,
        "usageCounts": usage_counts
    })

@app.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'success': True})

@app.route('/logout-all', methods=['POST'])
@login_required
def logout_all_devices():
    if users_collection is None:
        return jsonify({'success': False, 'error': 'Database not configured.'}), 500

    try:
        new_session_id = str(uuid.uuid4())
        users_collection.update_one({'_id': ObjectId(current_user.id)}, {'$set': {'session_id': new_session_id}})
        logout_user()
        return jsonify({'success': True, 'message': 'Successfully logged out of all devices.'})
    except Exception as e:
        print(f"LOGOUT_ALL_ERROR: {e}")
        return jsonify({'success': False, 'error': 'Server error during logout.'}), 500

@app.route('/delete_account', methods=['DELETE'])
@login_required
def delete_account():
    if users_collection is None:
        return jsonify({'success': False, 'error': 'Database not configured.'}), 500

    try:
        user_id = ObjectId(current_user.id)
        update_result = users_collection.update_one(
            {'_id': user_id},
            {
                '$set': {
                    'email': f'deleted_{user_id}@anonymous.com',
                    'password': 'deleted_password_placeholder' 
                },
                '$unset': {
                    'name': "",
                    'session_id': "",
                    'verification_token': "",
                    'is_verified': ""
                }
            }
        )

        if update_result.matched_count > 0:
            try:
                logout_user()
            except Exception as e:
                print(f"LOGOUT_ERROR_ON_DELETE: {e}")
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'User not found.'}), 404
    except Exception as e:
        print(f"MONGO_DELETE_ERROR: {e}")
        return jsonify({'success': False, 'error': 'Error deleting user details.'}), 500

@app.route('/status', methods=['GET'])
def status():
    return jsonify({'status': 'ok'}), 200

# --- Chat History CRUD API ---

@app.route('/api/chats', methods=['GET'])
@login_required
def get_chats():
    if conversations_collection is None:
        return jsonify([])
    try:
        user_id = ObjectId(current_user.id)
        chats_cursor = conversations_collection.find({"user_id": user_id}).sort("timestamp", -1)
        chats_list = []
        for chat in chats_cursor:
            chats_list.append({
                "id": str(chat["_id"]),
                "title": chat.get("title", "Untitled Chat"),
                "messages": chat.get("messages", [])
            })
        return jsonify(chats_list)
    except Exception as e:
        print(f"Error fetching chats: {e}")
        return jsonify({"error": "Could not fetch chat history"}), 500

@app.route('/api/chats', methods=['POST'])
@login_required
def save_chat():
    if conversations_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    
    data = request.get_json()
    chat_id = data.get('id')
    messages = data.get('messages', [])
    title = data.get('title')

    if not messages:
        return jsonify({"status": "empty chat, not saved"})

    if not title:
        first_user_message = next((msg.get('text') for msg in messages if msg.get('sender') == 'user'), "Untitled Chat")
        title = first_user_message[:40] if first_user_message else "Untitled Chat"

    user_id = ObjectId(current_user.id)
    
    try:
        if chat_id:
            conversations_collection.update_one(
                {"_id": ObjectId(chat_id), "user_id": user_id},
                {
                    "$set": {
                        "messages": messages,
                        "title": title,
                        "timestamp": datetime.utcnow()
                    }
                }
            )
            return jsonify({"id": chat_id})
        else:
            chat_document = {
                "user_id": user_id,
                "title": title,
                "messages": messages,
                "timestamp": datetime.utcnow()
            }
            result = conversations_collection.insert_one(chat_document)
            new_id = str(result.inserted_id)
            return jsonify({"id": new_id, "title": title})
    except Exception as e:
        print(f"Error saving chat: {e}")
        return jsonify({"error": "Could not save chat"}), 500

@app.route('/api/chats/<chat_id>', methods=['PUT'])
@login_required
def rename_chat(chat_id):
    if conversations_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    
    data = request.get_json()
    new_title = data.get('title')
    if not new_title:
        return jsonify({"error": "New title not provided"}), 400

    try:
        result = conversations_collection.update_one(
            {"_id": ObjectId(chat_id), "user_id": ObjectId(current_user.id)},
            {"$set": {"title": new_title}}
        )
        if result.matched_count == 0:
            return jsonify({"error": "Chat not found or permission denied"}), 404
        return jsonify({"success": True})
    except Exception as e:
        print(f"Error renaming chat: {e}")
        return jsonify({"error": "Could not rename chat"}), 500

@app.route('/api/chats/<chat_id>', methods=['DELETE'])
@login_required
def delete_chat_by_id(chat_id):
    if conversations_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    
    try:
        result = conversations_collection.delete_one(
            {"_id": ObjectId(chat_id), "user_id": ObjectId(current_user.id)}
        )
        if result.deleted_count == 0:
            return jsonify({"error": "Chat not found or permission denied"}), 404
        return jsonify({"success": True})
    except Exception as e:
        print(f"Error deleting chat: {e}")
        return jsonify({"error": "Could not delete chat"}), 500

# --- Library CRUD API ---

def get_ai_summary(text_content):
    if not GOOGLE_API_KEY:
        return "Summary generation skipped: AI not configured."
    if not text_content or text_content.isspace():
        return "No text content to summarize."
    try:
        model = genai.GenerativeModel("gemini-2.5-flash-lite") 
        max_length = 80000 
        if len(text_content) > max_length:
            text_content = text_content[:max_length]
        prompt = (
            "You are an expert summarizer. Please provide a concise, one-paragraph summary "
            "of the following document. Focus on the main ideas and key takeaways.\n\n"
            f"--- DOCUMENT START ---\n{text_content}\n--- DOCUMENT END ---"
        )
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"AI_SUMMARY_ERROR: {e}")
        return f"Could not generate summary. Error: {e}"

def run_ai_summary_in_background(app, item_id, text_content):
    with app.app_context():
        summary = get_ai_summary(text_content)
        if library_collection:
            try:
                library_collection.update_one(
                    {"_id": ObjectId(item_id)},
                    {"$set": {"ai_summary": summary, "ai_summary_status": "completed"}}
                )
            except Exception as e:
                print(f"BACKGROUND_MONGO_ERROR: {e}")

@app.route('/library/upload', methods=['POST'])
@login_required
def upload_library_item():
    if library_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    filename = file.filename
    file_content = file.read()
    file_type = file.mimetype
    file_size = len(file_content)
    encoded_file_content = base64.b64encode(file_content).decode('utf-8')

    extracted_text = ""
    if 'image' in file_type:
        extracted_text = "Image file."
    elif 'pdf' in file_type:
        extracted_text = extract_text_from_pdf(file_content)
    elif 'word' in file_type or file_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        extracted_text = extract_text_from_docx(file_content)
    elif 'text' in file_type:
        try:
            extracted_text = file_content.decode('utf-8')
        except UnicodeDecodeError:
            extracted_text = file_content.decode('latin-1', errors='ignore')
    
    library_item = {
        "user_id": ObjectId(current_user.id),
        "filename": filename,
        "file_type": file_type,
        "file_size": file_size,
        "file_data": encoded_file_content,
        "extracted_text": extracted_text[:1000],
        "ai_summary": "Processing...",
        "ai_summary_status": "pending",
        "timestamp": datetime.utcnow()
    }

    try:
        result = library_collection.insert_one(library_item)
        new_id = result.inserted_id

        if extracted_text and extracted_text != "Image file.":
            Thread(target=run_ai_summary_in_background, args=(app, new_id, extracted_text)).start()
        else:
             library_collection.update_one(
                {"_id": new_id},
                {"$set": {"ai_summary": "Not applicable.", "ai_summary_status": "completed"}}
            )

        return jsonify({
            "success": True, 
            "id": str(new_id),
            "filename": filename,
            "file_type": file_type,
            "timestamp": library_item["timestamp"].isoformat()
        })
    except Exception as e:
        print(f"Error uploading library item: {e}")
        return jsonify({"error": "Could not save file to library"}), 500

@app.route('/library/files', methods=['GET'])
@login_required
def get_library_items():
    if library_collection is None:
        return jsonify([])
    try:
        user_id = ObjectId(current_user.id)
        items_cursor = library_collection.find({"user_id": user_id}).sort("timestamp", -1)
        items_list = []
        for item in items_cursor:
            items_list.append({
                "_id": str(item["_id"]),
                "fileName": item["filename"],
                "fileType": item["file_type"],
                "fileSize": item["file_size"],
                "fileData": item["file_data"],
                "aiSummary": item.get("ai_summary", "Not processed."),
                "aiSummaryStatus": item.get("ai_summary_status", "unknown"),
                "timestamp": item["timestamp"].isoformat()
            })
        return jsonify(items_list)
    except Exception as e:
        print(f"Error fetching library items: {e}")
        return jsonify({"error": "Could not fetch library items"}), 500

@app.route('/library/files/<item_id>', methods=['DELETE'])
@login_required
def delete_library_item(item_id):
    if library_collection is None:
        return jsonify({"error": "Database not configured"}), 500
    try:
        result = library_collection.delete_one(
            {"_id": ObjectId(item_id), "user_id": ObjectId(current_user.id)}
        )
        if result.deleted_count == 0:
            return jsonify({"error": "Item not found or permission denied"}), 404
        return jsonify({"success": True})
    except Exception as e:
        print(f"Error deleting library item: {e}")
        return jsonify({"error": "Could not delete library item"}), 500

# --- Chat Logic ---

def extract_text_from_pdf(pdf_bytes):
    try:
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        return "".join(page.get_text() for page in pdf_document)
    except Exception as e:
        print(f"Error extracting PDF text: {e}")
        return ""

def extract_text_from_docx(docx_bytes):
    try:
        document = docx.Document(io.BytesIO(docx_bytes))
        return "\n".join([para.text for para in document.paragraphs])
    except Exception as e:
        print(f"Error extracting DOCX text: {e}")
        return ""

@app.route('/chat', methods=['POST'])
@login_required
def chat():
    # Usage Limit Logic for Free Users
    if not current_user.isPremium and not current_user.isAdmin:
        user_data = users_collection.find_one({'_id': ObjectId(current_user.id)})
        last_reset_str = user_data.get('last_usage_reset', '1970-01-01')
        last_reset_date = datetime.strptime(last_reset_str, '%Y-%m-%d').date()
        today = datetime.utcnow().date()

        if last_reset_date < today:
            users_collection.update_one(
                {'_id': ObjectId(current_user.id)},
                {'$set': {
                    'usage_counts': {'messages': 0, 'webSearches': 0},
                    'last_usage_reset': today.strftime('%Y-%m-%d')
                }}
            )
            user_data = users_collection.find_one({'_id': ObjectId(current_user.id)})
        
        usage = user_data.get('usage_counts', {})
        messages_used = usage.get('messages', 0)
        
        if messages_used >= 15:
            return jsonify({
                'error': 'Daily message limit reached. Please upgrade.',
                'upgrade_required': True
            }), 429
            
        users_collection.update_one({'_id': ObjectId(current_user.id)}, {'$inc': {'usage_counts.messages': 1}})

    def get_file_from_github(filename):
        if not all([GITHUB_USER, GITHUB_REPO]): return None
        url = f"https://raw.githubusercontent.com/{GITHUB_USER}/{GITHUB_REPO.replace(' ', '%20')}/main/{GITHUB_FOLDER_PATH.replace(' ', '%20')}/{filename.replace(' ', '%20')}"
        try:
            response = requests.get(url)
            response.raise_for_status()
            return response.content
        except requests.exceptions.RequestException as e: return None

    def get_video_id(video_url):
        match = re.search(r"(?:v=|\/|youtu\.be\/)([a-zA-Z0-9_-]{11})", video_url)
        return match.group(1) if match else None

    def get_youtube_transcript(video_id):
        try: return " ".join([d['text'] for d in YouTubeTranscriptApi.get_transcript(video_id)])
        except: return None

    def call_api(url, headers, json_payload, api_name):
        try:
            response = requests.post(url, headers=headers, json=json_payload)
            response.raise_for_status()
            result = response.json()
            if 'choices' in result and result['choices']:
                 return result['choices'][0]['message']['content']
            return None
        except: return None

    def search_web(query):
        if not SERPER_API_KEY: return "Web search disabled."
        url = "https://google.serper.dev/search"
        headers = {'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json'}
        try:
            response = requests.post(url, headers=headers, json={"q": query})
            response.raise_for_status()
            results = response.json()
            snippets = [f"Title: {i.get('title')}\nSnippet: {i.get('snippet')}\nSource: {i.get('link')}" for i in results.get("organic", [])[:5]]
            return "\n\n---\n\n".join(snippets) if snippets else "No results."
        except: return "Search failed."

    def search_library(user_id, query):
        if not library_collection: return None
        try:
            keywords = re.split(r'\s+', query)
            regex_pattern = '.*'.join(f'(?=.*{re.escape(k)})' for k in keywords)
            items = library_collection.find({
                "user_id": user_id, "extracted_text": {"$regex": regex_pattern, "$options": "i"}
            }).limit(3)
            snippets = [f"Source: {i.get('filename')}\nSnippet: {i.get('extracted_text', '')[:300]}..." for i in items]
            return "\n\n---\n\n".join(snippets) if snippets else None
        except: return None
    
    def should_auto_search(user_message):
        msg_lower = user_message.lower().strip()
        if any(msg_lower.startswith(k) for k in ['hi', 'hello', 'thanks']): return None
        if any(k in msg_lower for k in ['vulnerability', 'sql injection', 'mitigation']): return 'security_search'
        if any(k in user_message for k in ['def ', 'public class', 'import ']): return 'code_security_scan'
        if any(k in msg_lower for k in ['what is', 'latest', 'news']): return 'web_search'
        if len(user_message.split()) > 6: return 'web_search'
        return None

    try:
        data = request.json
        user_message = data.get('text', '')
        file_data = data.get('fileData')
        file_type = data.get('fileType', '')
        is_temporary = data.get('isTemporary', False)
        request_mode = data.get('mode') 
        ai_response = None
        web_search_context = None 
        library_search_context = None

        # --- REAL VULNERABILITY SCAN TRIGGER ---
        if "[SYSTEM: Act as a Web Vulnerability Scanner." in user_message:
            url_match = re.search(r"URL: (https?://[^\s\.]+\.[^\s]+)", user_message)
            if url_match:
                target = url_match.group(1)
                raw_tool_output = run_real_scan(target)
                user_message = (
                    f"You are a Security Analyst. Raw scan results for {target}:\n\n{raw_tool_output}\n\n"
                    "Generate a 'Cyber Security Report Card' with Score (0-100), vulnerabilities, and fixes."
                )

        is_multimodal = bool(file_data) or "youtube.com" in user_message or "youtu.be" in user_message
        if request_mode == 'chat' and not is_multimodal:
            auto_mode = should_auto_search(user_message)
            if auto_mode:
                request_mode = auto_mode
                if auto_mode in ['web_search', 'security_search']:
                    library_search_context = search_library(ObjectId(current_user.id), user_message)

        if (request_mode == 'web_search' or request_mode == 'security_search') and not is_multimodal and user_message.strip():
            if not current_user.isPremium and not current_user.isAdmin:
                user_data = users_collection.find_one({'_id': ObjectId(current_user.id)})
                if user_data.get('usage_counts', {}).get('webSearches', 0) < 1:
                    web_search_context = search_web(user_message)
                    users_collection.update_one({'_id': ObjectId(current_user.id)}, {'$inc': {'usage_counts.webSearches': 1}})
                else: web_search_context = "Search limit reached."
            else: web_search_context = search_web(user_message)
        
        # Build History for Context
        gemini_history = []
        openai_history = []
        if not is_temporary and conversations_collection:
            recent = conversations_collection.find_one({"user_id": ObjectId(current_user.id)}, sort=[("timestamp", -1)])
            if recent and 'messages' in recent:
                for msg in recent['messages'][-10:]:
                    role = msg.get('sender')
                    content = msg.get('text', '')
                    gemini_history.append({'role': 'user' if role == 'user' else 'model', 'parts': [content]})
                    openai_history.append({"role": 'user' if role == 'user' else 'assistant', "content": content})

        openai_history.append({"role": "user", "content": user_message})

        # Process via Groq if available and not multimodal
        if not is_multimodal and user_message.strip():
            if request_mode == 'code_security_scan' and GROQ_API_KEY:
                ai_response = call_api("https://api.groq.com/openai/v1/chat/completions", {"Authorization": f"Bearer {GROQ_API_KEY}"}, {"model": "llama-3.1-70b-versatile", "messages": openai_history}, "Groq (Sec)")
            elif (web_search_context or library_search_context) and GROQ_API_KEY:
                context = f"Web: {web_search_context}\nLibrary: {library_search_context}"
                payload = [{"role": "system", "content": "Security Analyst mode."}, {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {user_message}"}]
                ai_response = call_api("https://api.groq.com/openai/v1/chat/completions", {"Authorization": f"Bearer {GROQ_API_KEY}"}, {"model": "llama-3.1-8b-instant", "messages": payload}, "Groq (Search)")
            elif GROQ_API_KEY:
                ai_response = call_api("https://api.groq.com/openai/v1/chat/completions", {"Authorization": f"Bearer {GROQ_API_KEY}"}, {"model": "llama-3.1-8b-instant", "messages": openai_history}, "Groq")

        # Fallback to Gemini
        if not ai_response:
            model = genai.GenerativeModel("gemini-2.5-flash-lite")
            prompt_parts = [user_message]
            if "youtube.com" in user_message or "youtu.be" in user_message:
                transcript = get_youtube_transcript(get_video_id(user_message))
                prompt_parts = [f"Summarize this: {transcript}"] if transcript else [user_message]
            elif file_data:
                fbytes = base64.b64decode(file_data)
                if 'pdf' in file_type: prompt_parts.append(extract_text_from_pdf(fbytes))
                elif 'word' in file_type: prompt_parts.append(extract_text_from_docx(fbytes))
                elif 'image' in file_type: prompt_parts.append(Image.open(io.BytesIO(fbytes)))

            try:
                if web_search_context or library_search_context or request_mode == 'code_security_scan':
                    response = model.generate_content(prompt_parts)
                else:
                    full_prompt = gemini_history + [{'role': 'user', 'parts': prompt_parts}]
                    response = model.generate_content(full_prompt)
                ai_response = response.text
            except: ai_response = "Encountered an error."

        return jsonify({'response': ai_response})
    except: return jsonify({'response': "Internal error."})

@app.route('/save_chat_history', methods=['POST'])
@login_required
def save_chat_history():
    if not conversations_collection: return jsonify({'error': 'DB Error'}), 500
    try:
        user_name = current_user.name
        history = conversations_collection.find({"user_id": ObjectId(current_user.id)}).sort("timestamp", 1)
        html = f"<html><body><h1>History: {user_name}</h1>"
        for c in history:
            html += f"<h3>{c.get('title')}</h3>"
            for m in c.get('messages', []):
                html += f"<p><strong>{m.get('sender')}:</strong> {m.get('text')}</p>"
        html += "</body></html>"
        res = make_response(html)
        res.headers["Content-Disposition"] = "attachment; filename=chat_history.html"
        res.headers["Content-Type"] = "text/html"
        return res
    except: return jsonify({'error': 'Failed'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
