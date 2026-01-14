import base64 
import io
import os
import re
import sys
import json
import traceback
from datetime import datetime, date, timedelta
import uuid
import random
from threading import Thread
import logging
from logging.handlers import RotatingFileHandler
import time

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

# --- Enhanced Logging Configuration ---
def setup_logging():
    """Configure comprehensive logging for the application"""
    if not os.path.exists('logs'):
        os.makedirs('logs')
    
    class ColoredFormatter(logging.Formatter):
        COLORS = {
            'DEBUG': '\033[36m',
            'INFO': '\033[32m',
            'WARNING': '\033[33m',
            'ERROR': '\033[31m',
            'CRITICAL': '\033[41m',
            'RESET': '\033[0m'
        }
        
        def format(self, record):
            if record.levelno >= logging.ERROR:
                record.emoji = '❌'
            elif record.levelno >= logging.WARNING:
                record.emoji = '⚠️'
            elif 'Gemini' in record.getMessage():
                if 'failed' in record.getMessage().lower() or 'error' in record.getMessage().lower():
                    record.emoji = '🤖💥'
                else:
                    record.emoji = '🤖'
            elif 'Groq' in record.getMessage():
                if 'failed' in record.getMessage().lower() or 'error' in record.getMessage().lower():
                    record.emoji = '⚡💥'
                else:
                    record.emoji = '⚡'
            elif 'fallback' in record.getMessage().lower():
                record.emoji = '🔄'
            elif 'success' in record.getMessage().lower():
                record.emoji = '✅'
            elif 'limit' in record.getMessage().lower():
                record.emoji = '⛔'
            else:
                record.emoji = '📝'
            
            levelname = record.levelname
            if levelname in self.COLORS:
                colored_levelname = f"{self.COLORS[levelname]}{levelname}{self.COLORS['RESET']}"
                record.levelname = colored_levelname
            
            return super().format(record)
    
    console_formatter = ColoredFormatter(
        '%(asctime)s - %(emoji)s %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    file_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(console_formatter)
    console_handler.setLevel(logging.INFO)
    
    file_handler = RotatingFileHandler(
        'logs/app.log', 
        maxBytes=10000000, 
        backupCount=10,
        encoding='utf-8'
    )
    file_handler.setFormatter(file_formatter)
    file_handler.setLevel(logging.INFO)
    
    error_handler = RotatingFileHandler(
        'logs/error.log',
        maxBytes=5000000,
        backupCount=5,
        encoding='utf-8'
    )
    error_handler.setFormatter(file_formatter)
    error_handler.setLevel(logging.ERROR)
    
    api_handler = RotatingFileHandler(
        'logs/api.log',
        maxBytes=5000000,
        backupCount=5,
        encoding='utf-8'
    )
    api_handler.setFormatter(file_formatter)
    api_handler.setLevel(logging.INFO)
    
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.handlers = []
    
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(error_handler)
    
    api_logger = logging.getLogger('api')
    api_logger.setLevel(logging.INFO)
    api_logger.addHandler(api_handler)
    
    ai_logger = logging.getLogger('ai')
    ai_logger.setLevel(logging.INFO)
    
    return root_logger, api_logger, ai_logger

root_logger, api_logger, ai_logger = setup_logging()

# --- Configuration ---
SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "dev-secret-key") 
app.config['SECRET_KEY'] = SECRET_KEY
if SECRET_KEY == "dev-secret-key":
    root_logger.warning("CRITICAL WARNING: Using a default, insecure FLASK_SECRET_KEY for development.")

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
MONGO_URI = os.environ.get("MONGO_URI")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
SERPER_API_KEY = os.environ.get("SERPER_API_KEY")
BREVO_API_KEY = os.environ.get("BREVO_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "admin@sofia-ai.com")

# --- College Project Configuration ---
FREE_PLAN_LIMITS = {
    "monthly_messages": 500,
    "daily_voice_commands": 5,
    "monthly_document_reads": 1,
    "daily_web_searches": 1,
    "document_pages": 5
}

# --- API Services Configuration ---
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    root_logger.info(f"✅ Loaded google-generativeai version: {genai.__version__}")
else:
    root_logger.error("CRITICAL ERROR: GOOGLE_API_KEY environment variable not found.")

if GROQ_API_KEY:
    root_logger.info("✅ Groq API Key loaded.")
else:
    root_logger.warning("GROQ_API_KEY not found. Fallback will be disabled.")

# --- MongoDB Configuration ---
mongo_client = None
chat_history_collection = None
conversations_collection = None
users_collection = None
library_collection = None
ai_logs_collection = None

if MONGO_URI:
    try:
        mongo_client = MongoClient(MONGO_URI)
        db = mongo_client.get_database("ai_assistant_db")
        db.command('ping')
        root_logger.info("✅ Successfully pinged MongoDB.")
        
        chat_history_collection = db.get_collection("chat_history")
        conversations_collection = db.get_collection("conversations")
        users_collection = db.get_collection("users")
        library_collection = db.get_collection("library_items")
        ai_logs_collection = db.get_collection("ai_response_logs")
        
        ai_logs_collection.create_index([("timestamp", -1)])
        ai_logs_collection.create_index([("user_id", 1)])
        ai_logs_collection.create_index([("model_used", 1)])
        
        root_logger.info("✅ Successfully connected to MongoDB.")
    except Exception as e:
        root_logger.error(f"CRITICAL ERROR: Could not connect to MongoDB. Error: {e}")
else:
    root_logger.warning("CRITICAL WARNING: MONGO_URI not found. Data will not be saved.")

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
            root_logger.error(f"USER_GET_ERROR: Failed to get user {user_id}. Error: {e}")
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

# --- Helper Functions ---

def get_video_id(url):
    """Extract video ID from YouTube URL"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=)([\w-]+)',
        r'(?:youtu\.be\/)([\w-]+)',
        r'(?:youtube\.com\/embed\/)([\w-]+)'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def get_youtube_transcript(video_id):
    """Get transcript from YouTube video"""
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        return " ".join([entry['text'] for entry in transcript])
    except Exception as e:
        root_logger.error(f"YouTube transcript error: {e}")
        return None

def extract_text_from_pdf(pdf_bytes):
    """Extract text from PDF bytes"""
    try:
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        return "".join(page.get_text() for page in pdf_document)
    except Exception as e:
        root_logger.error(f"Error extracting PDF text: {e}")
        return ""

def extract_text_from_docx(docx_bytes):
    """Extract text from DOCX bytes"""
    try:
        document = docx.Document(io.BytesIO(docx_bytes))
        return "\n".join([para.text for para in document.paragraphs])
    except Exception as e:
        root_logger.error(f"Error extracting DOCX text: {e}")
        return ""

def send_brevo_email(to_email, subject, html_content):
    """Sends an email using the Brevo API."""
    if not BREVO_API_KEY:
        root_logger.warning("EMAIL SKIP: BREVO_API_KEY is not set.")
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
        root_logger.info(f"✅ Email sent successfully to {to_email}")
        return True
    except Exception as e:
        root_logger.error(f"❌ BREVO EMAIL ERROR: {e}")
        return False

def send_async_brevo_email(app, to_email, subject, html_content):
    """Wrapper to run email sending in a background thread."""
    with app.app_context():
        send_brevo_email(to_email, subject, html_content)

def log_ai_response(user_id, user_message, ai_response, model_used, response_time, 
                   request_mode=None, has_context=False, fallback_used=False, 
                   error_details=None, retry_count=0):
    """Log AI responses to database for tracking"""
    if ai_logs_collection is None:
        return
    
    try:
        log_entry = {
            "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
            "user_message": user_message[:500],
            "ai_response": ai_response[:1000] if ai_response else "",
            "model_used": model_used,
            "response_time_ms": response_time,
            "request_mode": request_mode or "chat",
            "has_context": has_context,
            "fallback_used": fallback_used,
            "error_details": error_details,
            "retry_count": retry_count,
            "timestamp": datetime.utcnow(),
            "user_plan": "premium" if current_user.isPremium else "free"
        }
        
        ai_logs_collection.insert_one(log_entry)
        
        if model_used == "gemini" and not fallback_used:
            ai_logger.info(f"🤖 Gemini responded in {response_time}ms")
        elif model_used == "groq" and fallback_used:
            ai_logger.warning(f"🔄 Gemini failed, using Groq fallback: {response_time}ms")
        elif model_used == "groq":
            ai_logger.info(f"⚡ Groq responded in {response_time}ms")
        
    except Exception as e:
        root_logger.error(f"Error logging AI response: {e}")

def track_api_error(api_name, error, user_email, context=None, fallback_triggered=False):
    """Track API errors with detailed information"""
    try:
        if api_name == "Gemini":
            if fallback_triggered:
                root_logger.error(f"🤖💥 GEMINI API FAILED - Fallback triggered for {user_email}")
            else:
                root_logger.warning(f"🤖⚠️ Gemini API warning for {user_email}")
        else:
            root_logger.error(f"⚡💥 {api_name} API failed for {user_email}")
        
    except Exception as e:
        root_logger.error(f"Error tracking API error: {e}")

# --- COLLEGE PROJECT: Enhanced AI Response with Fallback ---
def get_ai_response_with_fallback(user_message, history=None, context=None, 
                                 mode="chat", max_retries=2):
    """
    🎓 COLLEGE PROJECT: Primary-Fallback AI System
    Primary: Gemini API
    Fallback: Groq API (if Gemini fails)
    """
    ai_response = None
    model_used = None
    fallback_used = False
    error_details = None
    response_time = 0
    retry_count = 0
    
    start_time = time.time()
    
    # COLLEGE PROJECT: Try Gemini Primary (with retries)
    for attempt in range(max_retries):
        try:
            root_logger.info(f"🎓 COLLEGE PROJECT: Attempt {attempt + 1} - Using Gemini API (Primary)")
            
            # Configure Gemini model
            model = genai.GenerativeModel("gemini-2.5-flash-lite")
            
            # Prepare prompt with context if available
            prompt_parts = []
            if context:
                prompt_parts.append(f"Context: {context}")
            prompt_parts.append(f"User: {user_message}")
            
            # Use history if available
            if history and len(history) > 0:
                # Convert history to Gemini format
                gemini_history = []
                for msg in history[-5:]:  # Last 5 messages for context
                    if msg.get('sender') == 'user':
                        gemini_history.append({'role': 'user', 'parts': [msg.get('text', '')]})
                    else:
                        gemini_history.append({'role': 'model', 'parts': [msg.get('text', '')]})
                
                # Add current message
                gemini_history.append({'role': 'user', 'parts': prompt_parts})
                response = model.generate_content(gemini_history)
            else:
                response = model.generate_content("\n".join(prompt_parts))
            
            ai_response = response.text
            model_used = "gemini"
            fallback_used = False
            response_time = int((time.time() - start_time) * 1000)
            
            root_logger.info(f"✅ COLLEGE PROJECT: Gemini Primary SUCCESS in {response_time}ms (Attempt {attempt + 1})")
            break
            
        except Exception as e:
            retry_count = attempt + 1
            error_details = f"Attempt {retry_count}: {type(e).__name__}: {str(e)[:200]}"
            
            root_logger.warning(f"🎓 COLLEGE PROJECT: Gemini Attempt {retry_count} failed: {type(e).__name__}")
            
            if attempt < max_retries - 1:
                # Wait before retry (exponential backoff)
                wait_time = 2 ** attempt
                root_logger.info(f"⏳ Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                root_logger.error(f"🤖💥 COLLEGE PROJECT: All Gemini attempts failed. Activating fallback...")
    
    # COLLEGE PROJECT: If Gemini fails, try Groq Fallback
    if not ai_response and GROQ_API_KEY:
        try:
            root_logger.info(f"🎓 COLLEGE PROJECT: Activating Groq Fallback System")
            fallback_start = time.time()
            
            headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
            
            # Prepare messages for Groq
            messages = []
            
            # Add system prompt based on mode
            if mode == 'code_security_scan':
                messages.append({
                    "role": "system", 
                    "content": "You are 'Sofia-Sec-L-70B', a specialized AI Code Security Analyst. Analyze the provided code for security vulnerabilities, suggest improvements, and provide secure code examples."
                })
            elif context:
                messages.append({
                    "role": "system",
                    "content": f"You are 'Sofia-Sec-L', a security analyst. Answer based *only* on context provided. Cite sources clearly.\n\nContext: {context}"
                })
            
            # Add history if available
            if history:
                for msg in history[-5:]:
                    role = "user" if msg.get('sender') == 'user' else "assistant"
                    messages.append({"role": role, "content": msg.get('text', '')})
            
            # Add current message
            messages.append({"role": "user", "content": user_message})
            
            payload = {
                "model": "llama-3.1-8b-instant",
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 1000
            }
            
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result['choices'][0]['message']['content']
                model_used = "groq"
                fallback_used = True
                response_time = int((time.time() - start_time) * 1000)
                
                root_logger.info(f"⚡ COLLEGE PROJECT: Groq Fallback SUCCESS in {response_time}ms")
            else:
                error_details = f"Groq API Error: {response.status_code} - {response.text[:200]}"
                root_logger.error(f"⚡💥 COLLEGE PROJECT: Groq Fallback failed: {error_details}")
                
        except Exception as e:
            error_details = f"Groq Exception: {type(e).__name__}: {str(e)[:200]}"
            root_logger.error(f"⚡💥 COLLEGE PROJECT: Groq Fallback exception: {error_details}")
    
    # If both fail
    if not ai_response:
        model_used = "error"
        ai_response = "I apologize, but I'm having trouble connecting to the AI services. Please try again in a moment."
        response_time = int((time.time() - start_time) * 1000)
        root_logger.error(f"❌❌ COLLEGE PROJECT: Both Gemini and Groq failed")
    
    return ai_response, model_used, fallback_used, error_details, response_time, retry_count

def search_web(query):
    """Search the web using Serper API"""
    if not SERPER_API_KEY:
        return "Web search is disabled because the API key is not configured."
    
    url = "https://google.serper.dev/search"
    payload = json.dumps({"q": query})
    headers = {'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json'}
    
    try:
        response = requests.post(url, headers=headers, data=payload, timeout=10)
        response.raise_for_status()
        results = response.json()
        
        snippets = []
        if "organic" in results:
            for item in results.get("organic", [])[:5]:
                title = item.get("title", "No Title")
                snippet = item.get("snippet", "No Snippet")
                link = item.get("link", "No Link")
                snippets.append(f"Title: {title}\nSnippet: {snippet}\nSource: {link}")
        
        if snippets:
            return "\n\n---\n\n".join(snippets)
        elif "answerBox" in results:
            answer = results["answerBox"].get("snippet") or results["answerBox"].get("answer")
            if answer: 
                return f"Direct Answer: {answer}"
        
        return "No relevant web results found."
        
    except Exception as e:
        return f"An error occurred during the web search: {e}"

def should_auto_search(user_message):
    """Determine if automatic web search is needed"""
    msg_lower = user_message.lower().strip()
    security_keywords = ['vulnerability', 'malware', 'cybersecurity', 'sql injection', 'xss', 'mitigation', 'exploit']
    code_keywords = ['def ', 'function ', 'public class', 'SELECT *', 'import ', 'require(']
    general_search_keywords = ['what is', 'who is', 'where is', 'latest', 'news', 'in 2025']
    chat_keywords = ['hi', 'hello', 'thanks']
    
    if any(msg_lower.startswith(k) for k in chat_keywords):
        return None
    if any(k in msg_lower for k in security_keywords):
        return 'security_search'
    if any(k in user_message for k in code_keywords):
        return 'code_security_scan'
    if any(k in msg_lower for k in general_search_keywords):
        return 'web_search'
    if len(user_message.split()) > 6:
        return 'web_search'
    return None

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

@app.route('/analytics')
@login_required
def analytics_dashboard():
    """Renders the analytics dashboard page"""
    if not current_user.isAdmin and not current_user.isPremium:
        return redirect(url_for('home'))
    return render_template('analytics.html')

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

    otp_code = str(random.randint(100000, 999999))
    current_date = datetime.utcnow()
    current_month = current_date.strftime('%Y-%m')
    current_day = current_date.strftime('%Y-%m-%d')

    new_user = {
        "name": name, 
        "email": email, 
        "password": password, 
        "isAdmin": email == ADMIN_EMAIL, 
        "isPremium": False, 
        "is_verified": False,
        "verification_token": otp_code,
        "session_id": str(uuid.uuid4()),
        "usage_counts": { 
            "messages": 0, 
            "voice_commands": 0,
            "document_reads": 0,
            "web_searches": 0,
            "document_pages_read": 0
        },
        "reset_timestamps": {
            "message_reset_month": current_month,
            "voice_command_reset_day": current_day,
            "document_read_reset_month": current_month,
            "web_search_reset_day": current_day
        },
        "timestamp": current_date.isoformat()
    }
    
    users_collection.insert_one(new_user)
    root_logger.info(f"New user registered: {email}")

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

    root_logger.info(f"User email verified: {email}")
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
        root_logger.info(f"User logged in: {email}")
        return jsonify({'success': True, 'user': {'name': user_data['name'], 'email': user_data['email']}})
    else:
        root_logger.warning(f"Failed login attempt for email: {email}")
        return jsonify({'success': False, 'error': 'Incorrect email or password.'}), 401

@app.route('/logout', methods=['POST'])
@login_required
def logout():
    root_logger.info(f"User logged out: {current_user.email}")
    logout_user()
    return jsonify({'success': True})

# --- COLLEGE PROJECT: Enhanced Chat Endpoint with Primary-Fallback ---
@app.route('/chat', methods=['POST'])
@login_required
def chat():
    """🎓 COLLEGE PROJECT: Primary (Gemini) + Fallback (Groq) AI System"""
    start_time = time.time()
    
    root_logger.info(f"🎓 COLLEGE PROJECT: Chat request from {current_user.email}")
    
    # Check for free user limits
    if not current_user.isPremium and not current_user.isAdmin:
        user_data = users_collection.find_one({'_id': ObjectId(current_user.id)})
        current_date = datetime.utcnow()
        current_month = current_date.strftime('%Y-%m')
        current_day = current_date.strftime('%Y-%m-%d')
        
        update_needed = False
        update_fields = {}
        
        # Reset counters if needed
        if user_data.get('reset_timestamps', {}).get('message_reset_month') != current_month:
            update_fields['usage_counts.messages'] = 0
            update_fields['reset_timestamps.message_reset_month'] = current_month
            update_needed = True
        
        if update_needed:
            users_collection.update_one(
                {'_id': ObjectId(current_user.id)},
                {'$set': update_fields}
            )
            user_data = users_collection.find_one({'_id': ObjectId(current_user.id)})
        
        # Check message limit
        usage = user_data.get('usage_counts', {})
        messages_used = usage.get('messages', 0)
        
        if messages_used >= FREE_PLAN_LIMITS["monthly_messages"]:
            root_logger.warning(f"⛔ User {current_user.email} reached message limit")
            return jsonify({
                'error': f'You have reached your monthly message limit ({FREE_PLAN_LIMITS["monthly_messages"]} messages).',
                'upgrade_required': True,
                'current_usage': messages_used,
                'limit': FREE_PLAN_LIMITS["monthly_messages"]
            }), 429
            
        # Increment message counter
        users_collection.update_one(
            {'_id': ObjectId(current_user.id)}, 
            {'$inc': {'usage_counts.messages': 1}}
        )

    try:
        data = request.json
        user_message = data.get('text', '')
        file_data = data.get('fileData')
        file_type = data.get('fileType', '')
        is_temporary = data.get('isTemporary', False)
        request_mode = data.get('mode', 'chat')
        
        root_logger.info(f"💬 User message: {user_message[:100]}... | Mode: {request_mode}")
        
        # Check for multimodal content
        is_multimodal = bool(file_data) or "youtube.com" in user_message or "youtu.be" in user_message
        
        # Handle multimodal with Gemini only
        if is_multimodal:
            root_logger.info("🎨 Handling multimodal request with Gemini")
            
            try:
                model = genai.GenerativeModel("gemini-2.5-flash-lite")
                prompt_parts = []
                
                if "youtube.com" in user_message or "youtu.be" in user_message:
                    video_id = get_video_id(user_message)
                    transcript = get_youtube_transcript(video_id) if video_id else None
                    if transcript:
                        prompt_parts = [f"Summarize this YouTube video transcript:\n\n{transcript}"]
                    else:
                        return jsonify({'response': "Sorry, couldn't get the transcript."})
                elif file_data:
                    fbytes = base64.b64decode(file_data)
                    if 'pdf' in file_type:
                        text_content = extract_text_from_pdf(fbytes)
                        prompt_parts = [f"Analyze this PDF document:\n\n{text_content[:3000]}"]
                    elif 'image' in file_type:
                        image = Image.open(io.BytesIO(fbytes))
                        prompt_parts = [image, "Describe this image in detail."]
                
                response = model.generate_content(prompt_parts)
                ai_response = response.text
                model_used = "gemini"
                fallback_used = False
                error_details = None
                response_time = int((time.time() - start_time) * 1000)
                
                root_logger.info(f"🤖🎨 Gemini multimodal response in {response_time}ms")
                
            except Exception as e:
                error_details = f"{type(e).__name__}: {str(e)[:200]}"
                root_logger.error(f"🤖💥 Multimodal Gemini failed: {error_details}")
                ai_response = "Sorry, I couldn't process the file. Please try again."
                model_used = "error"
                fallback_used = False
                response_time = int((time.time() - start_time) * 1000)
        
        # Handle text messages with Primary-Fallback system
        else:
            # Determine if web search is needed
            web_search_context = None
            if request_mode in ['web_search', 'security_search'] and user_message.strip():
                if not current_user.isPremium and not current_user.isAdmin:
                    user_data = users_collection.find_one({'_id': ObjectId(current_user.id)})
                    searches_used = user_data.get('usage_counts', {}).get('web_searches', 0)
                    
                    if searches_used >= FREE_PLAN_LIMITS["daily_web_searches"]:
                        web_search_context = "Web search limit reached."
                    else:
                        web_search_context = search_web(user_message)
                        users_collection.update_one(
                            {'_id': ObjectId(current_user.id)}, 
                            {'$inc': {'usage_counts.web_searches': 1}}
                        )
                else:
                    web_search_context = search_web(user_message)
            
            # Auto-detect mode if not specified
            if request_mode == 'chat':
                auto_mode = should_auto_search(user_message)
                if auto_mode:
                    request_mode = auto_mode
            
            # Get conversation history
            history = []
            if conversations_collection is not None and not is_temporary:
                try:
                    recent_conversation = conversations_collection.find_one(
                        {"user_id": ObjectId(current_user.id)}, 
                        sort=[("timestamp", -1)]
                    )
                    if recent_conversation and 'messages' in recent_conversation:
                        history = recent_conversation['messages'][-10:]  # Last 10 messages
                except Exception as e:
                    root_logger.error(f"Error fetching chat history: {e}")
            
            # 🎓 COLLEGE PROJECT: Use Primary-Fallback system
            ai_response, model_used, fallback_used, error_details, response_time, retry_count = get_ai_response_with_fallback(
                user_message=user_message,
                history=history,
                context=web_search_context,
                mode=request_mode,
                max_retries=2
            )
        
        # Log the response
        has_context = web_search_context is not None if 'web_search_context' in locals() else False
        Thread(target=log_ai_response, args=(
            current_user.id, 
            user_message, 
            ai_response, 
            model_used, 
            response_time,
            request_mode,
            has_context,
            fallback_used,
            error_details,
            retry_count if 'retry_count' in locals() else 0
        )).start()
        
        # Log final status
        if model_used == "gemini" and not fallback_used:
            root_logger.info(f"🎓✅ FINAL: Gemini Primary used ({response_time}ms)")
        elif model_used == "groq" and fallback_used:
            root_logger.warning(f"🎓🔄 FINAL: Groq Fallback used ({response_time}ms)")
        elif model_used == "error":
            root_logger.error(f"🎓❌ FINAL: Both APIs failed ({response_time}ms)")
        
        return jsonify({
            'response': ai_response,
            'model': model_used,
            'response_time': response_time,
            'fallback_used': fallback_used,
            'error_details': error_details if current_user.isAdmin else None,
            'system_info': "🎓 College Project: Gemini Primary + Groq Fallback System"
        })
        
    except Exception as e:
        response_time = int((time.time() - start_time) * 1000)
        root_logger.error(f"💥 CHAT ENDPOINT ERROR: {str(e)[:200]}")
        
        return jsonify({
            'response': "Sorry, an internal error occurred.",
            'model': 'error',
            'response_time': response_time
        })

# --- Chat History Management ---
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
                "messages": chat.get("messages", []),
                "timestamp": chat.get("timestamp", "").isoformat() if chat.get("timestamp") else ""
            })
        return jsonify(chats_list)
    except Exception as e:
        root_logger.error(f"Error fetching chats: {e}")
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
            root_logger.info(f"Chat saved: {new_id}")
            return jsonify({"id": new_id, "title": title})
    except Exception as e:
        root_logger.error(f"Error saving chat: {e}")
        return jsonify({"error": "Could not save chat"}), 500

# --- Library Management ---
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
        "timestamp": datetime.utcnow()
    }

    try:
        result = library_collection.insert_one(library_item)
        new_id = result.inserted_id

        root_logger.info(f"Library item uploaded: {filename}")
        return jsonify({
            "success": True, 
            "id": str(new_id),
            "filename": filename,
            "file_type": file_type,
            "timestamp": library_item["timestamp"].isoformat()
        })
    except Exception as e:
        root_logger.error(f"Error uploading library item: {e}")
        return jsonify({"error": "Could not save file to library"}), 500

# --- User Info Endpoint ---
@app.route('/get_user_info')
@login_required
def get_user_info():
    user_data = users_collection.find_one({'_id': ObjectId(current_user.id)})
    usage_counts = user_data.get('usage_counts', {
        "messages": 0, 
        "voice_commands": 0,
        "document_reads": 0,
        "web_searches": 0,
        "document_pages_read": 0
    })
    
    return jsonify({
        "name": current_user.name,
        "email": current_user.email,
        "isAdmin": current_user.isAdmin,
        "isPremium": current_user.isPremium,
        "usageCounts": usage_counts,
        "planLimits": FREE_PLAN_LIMITS,
        "messagesRemaining": FREE_PLAN_LIMITS["monthly_messages"] - usage_counts.get("messages", 0)
    })

# --- COLLEGE PROJECT: System Status Endpoint ---
@app.route('/api/system_status', methods=['GET'])
@login_required
def system_status():
    """🎓 COLLEGE PROJECT: System status with Primary-Fallback info"""
    if not current_user.isAdmin:
        return jsonify({'error': 'Access denied. Admin required.'}), 403
    
    # Test Gemini API
    gemini_status = "not_configured"
    gemini_response_time = 0
    if GOOGLE_API_KEY:
        try:
            start = time.time()
            model = genai.GenerativeModel("gemini-2.5-flash-lite")
            response = model.generate_content("Test")
            gemini_response_time = int((time.time() - start) * 1000)
            gemini_status = "healthy"
        except Exception as e:
            gemini_status = f"unhealthy: {str(e)[:100]}"
    
    # Test Groq API
    groq_status = "not_configured"
    groq_response_time = 0
    if GROQ_API_KEY:
        try:
            start = time.time()
            headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
            response = requests.get("https://api.groq.com/openai/v1/models", headers=headers, timeout=5)
            groq_response_time = int((time.time() - start) * 1000)
            groq_status = "healthy" if response.status_code == 200 else f"unhealthy: {response.status_code}"
        except Exception as e:
            groq_status = f"unhealthy: {str(e)[:100]}"
    
    # Get AI stats
    total_requests = 0
    gemini_success = 0
    groq_fallback = 0
    if ai_logs_collection:
        total_requests = ai_logs_collection.count_documents({})
        gemini_success = ai_logs_collection.count_documents({"model_used": "gemini", "fallback_used": False})
        groq_fallback = ai_logs_collection.count_documents({"model_used": "groq", "fallback_used": True})
    
    status_info = {
        'system': '🎓 Sofia AI College Project',
        'architecture': 'Primary-Fallback System',
        'primary_api': 'Google Gemini',
        'fallback_api': 'Groq',
        'timestamp': datetime.utcnow().isoformat(),
        'apis': {
            'gemini': {
                'status': gemini_status,
                'response_time_ms': gemini_response_time,
                'configured': bool(GOOGLE_API_KEY)
            },
            'groq': {
                'status': groq_status,
                'response_time_ms': groq_response_time,
                'configured': bool(GROQ_API_KEY)
            }
        },
        'statistics': {
            'total_ai_requests': total_requests,
            'gemini_primary_success': gemini_success,
            'groq_fallback_used': groq_fallback,
            'fallback_rate': f"{round((groq_fallback/total_requests*100), 2) if total_requests > 0 else 0}%"
        },
        'mongodb_connected': mongo_client is not None,
        'total_users': users_collection.count_documents({}) if users_collection else 0,
        'total_chats': conversations_collection.count_documents({}) if conversations_collection else 0
    }
    
    return jsonify(status_info)

# --- COLLEGE PROJECT: Fallback Statistics ---
@app.route('/api/fallback_stats', methods=['GET'])
@login_required
def fallback_stats():
    """🎓 COLLEGE PROJECT: Get fallback system statistics"""
    if not current_user.isAdmin:
        return jsonify({'error': 'Access denied. Admin required.'}), 403
    
    if ai_logs_collection is None:
        return jsonify({'error': 'AI logs not available'}), 500
    
    try:
        # Last 7 days
        cutoff_date = datetime.utcnow() - timedelta(days=7)
        
        # Overall stats
        total_requests = ai_logs_collection.count_documents({"timestamp": {"$gte": cutoff_date}})
        gemini_success = ai_logs_collection.count_documents({
            "model_used": "gemini", 
            "fallback_used": False,
            "timestamp": {"$gte": cutoff_date}
        })
        groq_fallback = ai_logs_collection.count_documents({
            "model_used": "groq", 
            "fallback_used": True,
            "timestamp": {"$gte": cutoff_date}
        })
        
        # Daily breakdown
        pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": cutoff_date}
                }
            },
            {
                "$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                    "total": {"$sum": 1},
                    "gemini_success": {"$sum": {"$cond": [{"$and": [
                        {"$eq": ["$model_used", "gemini"]},
                        {"$eq": ["$fallback_used", False]}
                    ]}, 1, 0]}},
                    "groq_fallback": {"$sum": {"$cond": [{"$and": [
                        {"$eq": ["$model_used", "groq"]},
                        {"$eq": ["$fallback_used", True]}
                    ]}, 1, 0]}}
                }
            },
            {
                "$sort": {"_id": 1}
            }
        ]
        
        daily_results = list(ai_logs_collection.aggregate(pipeline))
        
        # Error analysis
        error_pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": cutoff_date},
                    "error_details": {"$ne": None},
                    "model_used": "gemini"
                }
            },
            {
                "$group": {
                    "_id": {"$substr": ["$error_details", 0, 100]},
                    "count": {"$sum": 1},
                    "latest": {"$max": "$timestamp"}
                }
            },
            {
                "$sort": {"count": -1}
            },
            {
                "$limit": 10
            }
        ]
        
        error_results = list(ai_logs_collection.aggregate(error_pipeline))
        
        return jsonify({
            'system': '🎓 College Project Fallback Statistics',
            'time_period': '7 days',
            'overall': {
                'total_requests': total_requests,
                'gemini_primary_success': gemini_success,
                'groq_fallback_used': groq_fallback,
                'fallback_rate': f"{round((groq_fallback/total_requests*100), 2) if total_requests > 0 else 0}%",
                'success_rate': f"{round((gemini_success/total_requests*100), 2) if total_requests > 0 else 0}%"
            },
            'daily_breakdown': daily_results,
            'common_errors': error_results,
            'recommendation': 'Primary (Gemini) → Fallback (Groq) system is working properly.' if groq_fallback < (total_requests * 0.1) else 'High fallback rate detected. Check Gemini API.'
        })
        
    except Exception as e:
        root_logger.error(f"Error getting fallback stats: {e}")
        return jsonify({'error': str(e)}), 500

# --- Usage Statistics ---
@app.route('/api/usage_stats', methods=['GET'])
@login_required
def get_usage_stats():
    user_data = users_collection.find_one({'_id': ObjectId(current_user.id)})
    usage_counts = user_data.get('usage_counts', {
        "messages": 0, 
        "voice_commands": 0,
        "document_reads": 0,
        "web_searches": 0,
        "document_pages_read": 0
    })
    
    stats = {
        "messages": {
            "used": usage_counts.get("messages", 0),
            "limit": FREE_PLAN_LIMITS["monthly_messages"],
            "remaining": FREE_PLAN_LIMITS["monthly_messages"] - usage_counts.get("messages", 0),
            "percentage": min(100, int((usage_counts.get("messages", 0) / FREE_PLAN_LIMITS["monthly_messages"]) * 100))
        },
        "plan": "Free Plan" if not current_user.isPremium else "Sofia AI Pro",
        "isPremium": current_user.isPremium
    }
    
    return jsonify(stats)

# --- Application Entry Point ---
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    
    # College Project Banner
    banner = """
    ╔══════════════════════════════════════════════════════════════════╗
    ║                                                                  ║
    ║                     🎓 SOFIA AI COLLEGE PROJECT                 ║
    ║                                                                  ║
    ║             🤖 AI Assistant with Primary-Fallback System        ║
    ║                                                                  ║
    ║                 PRIMARY: Google Gemini API                      ║
    ║                 FALLBACK: Groq API                              ║
    ║                                                                  ║
    ╚══════════════════════════════════════════════════════════════════╝
    
    🎯 SYSTEM ARCHITECTURE:
    ✅ Primary: Gemini API (gemini-2.5-flash-lite)
    🔄 Fallback: Groq API (llama-3.1-8b-instant)
    📊 Monitoring: Detailed logging with emojis
    
    📈 LOG INDICATORS:
    🤖 = Gemini Primary working
    🤖💥 = Gemini Primary failed
    ⚡ = Groq Fallback working
    ⚡💥 = Groq Fallback failed
    🔄 = Fallback activated
    ✅ = Success
    ❌ = Error
    ⚠️ = Warning
    
    🚀 Starting server on port: {}
    """.format(port)
    
    print(banner)
    root_logger.info("🎓 Starting Sofia AI College Project with Primary-Fallback System")
    
    # Test APIs
    if GOOGLE_API_KEY:
        root_logger.info("✅ Gemini API configured (Primary)")
    else:
        root_logger.error("❌ Gemini API not configured - Primary system disabled")
    
    if GROQ_API_KEY:
        root_logger.info("✅ Groq API configured (Fallback)")
    else:
        root_logger.warning("⚠️ Groq API not configured - Fallback system disabled")
    
    app.run(host='0.0.0.0', port=port, debug=True)
