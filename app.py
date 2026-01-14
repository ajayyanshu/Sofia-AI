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
import logging
from logging.handlers import RotatingFileHandler

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

# --- Enhanced Logging Configuration ---
def setup_logging():
    """Configure logging for the application"""
    # Create logs directory if it doesn't exist
    if not os.path.exists('logs'):
        os.makedirs('logs')
    
    # Configure logging format
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            RotatingFileHandler('logs/app.log', maxBytes=10000000, backupCount=10),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Create separate loggers for different components
    app.logger = logging.getLogger('sofia_ai')
    app.logger.setLevel(logging.INFO)

setup_logging()

# --- Configuration ---
SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "dev-secret-key") 
app.config['SECRET_KEY'] = SECRET_KEY
if SECRET_KEY == "dev-secret-key":
    app.logger.warning("CRITICAL WARNING: Using a default, insecure FLASK_SECRET_KEY for development.")

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
MONGO_URI = os.environ.get("MONGO_URI")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
SERPER_API_KEY = os.environ.get("SERPER_API_KEY")

# --- New Plan Configuration ---
FREE_PLAN_LIMITS = {
    "monthly_messages": 500,
    "daily_voice_commands": 5,
    "monthly_document_reads": 1,
    "daily_web_searches": 1,
    "document_pages": 5
}

# --- Brevo (Email) Configuration ---
BREVO_API_KEY = os.environ.get("BREVO_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "admin@sofia-ai.com") # Must be verified in Brevo

if not BREVO_API_KEY:
    app.logger.warning("CRITICAL WARNING: BREVO_API_KEY not found. Email features will not work.")

# --- API Services Configuration ---
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    app.logger.info(f"✅ Loaded google-generativeai version: {genai.__version__}")
else:
    app.logger.error("CRITICAL ERROR: GOOGLE_API_KEY environment variable not found.")

if YOUTUBE_API_KEY:
    app.logger.info("✅ YouTube API Key loaded.")
else:
    app.logger.warning("CRITICAL WARNING: YOUTUBE_API_KEY not found. YouTube features will be disabled.")

if SERPER_API_KEY:
    app.logger.info("✅ Serper API Key (for web search) loaded.")
else:
    app.logger.warning("CRITICAL WARNING: SERPER_API_KEY not found. AI web search will be disabled.")

# --- AI Response Tracking Collection ---
ai_logs_collection = None

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
        app.logger.info("✅ Successfully pinged MongoDB.")
        
        chat_history_collection = db.get_collection("chat_history")
        temporary_chat_collection = db.get_collection("temporary_chats")
        conversations_collection = db.get_collection("conversations")
        users_collection = db.get_collection("users")
        library_collection = db.get_collection("library_items")
        ai_logs_collection = db.get_collection("ai_response_logs")  # New collection for AI logs
        app.logger.info("✅ Successfully connected to MongoDB.")
    except Exception as e:
        app.logger.error(f"CRITICAL ERROR: Could not connect to MongoDB. Error: {e}")
else:
    app.logger.warning("CRITICAL WARNING: MONGO_URI not found. Data will not be saved.")

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
            app.logger.error(f"USER_GET_ERROR: Failed to get user {user_id}. Error: {e}")
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

# --- Helper: Log AI Responses to Database ---
def log_ai_response(user_id, user_message, ai_response, model_used, response_time, 
                   request_mode=None, has_context=False, fallback_used=False):
    """Log AI responses to database for tracking and analytics"""
    if ai_logs_collection is None:
        return
    
    try:
        log_entry = {
            "user_id": ObjectId(user_id) if isinstance(user_id, str) else user_id,
            "user_message": user_message[:500],  # Truncate long messages
            "ai_response": ai_response[:1000] if ai_response else "",  # Truncate long responses
            "model_used": model_used,
            "response_time_ms": response_time,
            "request_mode": request_mode or "chat",
            "has_context": has_context,
            "fallback_used": fallback_used,
            "timestamp": datetime.utcnow(),
            "user_plan": "premium" if current_user.isPremium else "free",
            "message_length": len(user_message) if user_message else 0,
            "response_length": len(ai_response) if ai_response else 0
        }
        
        ai_logs_collection.insert_one(log_entry)
        app.logger.info(f"📊 AI Response Logged: {model_used} | Mode: {request_mode} | Time: {response_time}ms")
        
    except Exception as e:
        app.logger.error(f"Error logging AI response: {e}")

# --- Helper: Get AI Response Statistics ---
def get_ai_stats(user_id=None, days_back=7):
    """Get statistics about AI model usage"""
    if ai_logs_collection is None:
        return None
    
    try:
        query = {}
        if user_id:
            query["user_id"] = ObjectId(user_id) if isinstance(user_id, str) else user_id
        
        # Add date filter
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        query["timestamp"] = {"$gte": cutoff_date}
        
        # Get total count by model
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": "$model_used",
                "count": {"$sum": 1},
                "avg_response_time": {"$avg": "$response_time_ms"},
                "total_messages": {"$sum": "$message_length"},
                "total_responses": {"$sum": "$response_length"}
            }},
            {"$sort": {"count": -1}}
        ]
        
        results = list(ai_logs_collection.aggregate(pipeline))
        
        # Get daily usage
        daily_pipeline = [
            {"$match": query},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                "count": {"$sum": 1},
                "gemini": {"$sum": {"$cond": [{"$eq": ["$model_used", "gemini"]}, 1, 0]}},
                "groq": {"$sum": {"$cond": [{"$eq": ["$model_used", "groq"]}, 1, 0]}},
                "fallbacks": {"$sum": {"$cond": ["$fallback_used", 1, 0]}}
            }},
            {"$sort": {"_id": 1}},
            {"$limit": 14}
        ]
        
        daily_results = list(ai_logs_collection.aggregate(daily_pipeline))
        
        # Get mode distribution
        mode_pipeline = [
            {"$match": query},
            {"$group": {
                "_id": "$request_mode",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}}
        ]
        
        mode_results = list(ai_logs_collection.aggregate(mode_pipeline))
        
        return {
            "model_stats": results,
            "daily_usage": daily_results,
            "mode_stats": mode_results,
            "total_requests": sum(item["count"] for item in results) if results else 0
        }
        
    except Exception as e:
        app.logger.error(f"Error getting AI stats: {e}")
        return None

# --- Helper: Send Email via Brevo ---
def send_brevo_email(to_email, subject, html_content):
    """Sends an email using the Brevo (Sendinblue) API."""
    if not BREVO_API_KEY:
        app.logger.warning("EMAIL SKIP: BREVO_API_KEY is not set.")
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
        response.raise_for_status() # Raise error for bad status codes
        app.logger.info(f"✅ Email sent successfully to {to_email}")
        return True
    except Exception as e:
        app.logger.error(f"❌ BREVO EMAIL ERROR: {e}")
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

# --- New: AI Analytics Dashboard ---
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

    # Generate a 6-digit OTP code
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
    app.logger.info(f"New user registered: {email}")

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

    # Find user with matching email and OTP code
    user = users_collection.find_one({"email": email, "verification_token": otp})

    if not user:
        return jsonify({'success': False, 'error': 'Invalid or incorrect OTP.'}), 400

    # Update user to verified and remove the OTP token
    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"is_verified": True}, "$unset": {"verification_token": 1}}
    )

    app.logger.info(f"User email verified: {email}")
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
        app.logger.info(f"User logged in: {email}")
        return jsonify({'success': True, 'user': {'name': user_data['name'], 'email': user_data['email']}})
    else:
        app.logger.warning(f"Failed login attempt for email: {email}")
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
    app.logger.info(f"Password reset requested for: {email}")
        
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
    
    app.logger.info(f"Password reset successful for user: {user.get('email')}")
    return jsonify({'success': True, 'message': 'Password has been reset successfully.'})

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
    
    reset_timestamps = user_data.get('reset_timestamps', {})
    
    return jsonify({
        "name": current_user.name,
        "email": current_user.email,
        "isAdmin": current_user.isAdmin,
        "isPremium": current_user.isPremium,
        "usageCounts": usage_counts,
        "planLimits": FREE_PLAN_LIMITS,
        "resetTimestamps": reset_timestamps,
        "messagesRemaining": FREE_PLAN_LIMITS["monthly_messages"] - usage_counts.get("messages", 0),
        "webSearchesRemaining": FREE_PLAN_LIMITS["daily_web_searches"] - usage_counts.get("web_searches", 0),
        "documentReadsRemaining": FREE_PLAN_LIMITS["monthly_document_reads"] - usage_counts.get("document_reads", 0),
        "documentPagesRemaining": FREE_PLAN_LIMITS["document_pages"] - usage_counts.get("document_pages_read", 0)
    })

@app.route('/logout', methods=['POST'])
@login_required
def logout():
    app.logger.info(f"User logged out: {current_user.email}")
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
        app.logger.info(f"User logged out from all devices: {current_user.email}")
        logout_user()
        return jsonify({'success': True, 'message': 'Successfully logged out of all devices.'})
    except Exception as e:
        app.logger.error(f"LOGOUT_ALL_ERROR: {e}")
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
                app.logger.info(f"Account deleted: {user_id}")
            except Exception as e:
                app.logger.error(f"LOGOUT_ERROR_ON_DELETE: {e}")
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'User not found.'}), 404
    except Exception as e:
        app.logger.error(f"MONGO_DELETE_ERROR: {e}")
        return jsonify({'success': False, 'error': 'Error deleting user details.'}), 500

@app.route('/status', methods=['GET'])
def status():
    return jsonify({'status': 'ok'}), 200

# --- New: AI Model Usage Statistics API ---
@app.route('/api/ai_stats', methods=['GET'])
@login_required
def get_ai_statistics():
    """Get AI model usage statistics for the current user"""
    if not current_user.isAdmin and not current_user.isPremium:
        return jsonify({'error': 'Access denied. Premium or Admin required.'}), 403
    
    days_back = request.args.get('days', default=7, type=int)
    user_id = None if current_user.isAdmin else current_user.id
    
    stats = get_ai_stats(user_id, days_back)
    
    if stats is None:
        return jsonify({'error': 'Failed to get AI statistics'}), 500
    
    return jsonify(stats)

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
                "messages": chat.get("messages", []),
                "timestamp": chat.get("timestamp", "").isoformat() if chat.get("timestamp") else ""
            })
        return jsonify(chats_list)
    except Exception as e:
        app.logger.error(f"Error fetching chats: {e}")
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
            app.logger.info(f"Chat saved: {new_id} by user {current_user.email}")
            return jsonify({"id": new_id, "title": title})
    except Exception as e:
        app.logger.error(f"Error saving chat: {e}")
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
        app.logger.info(f"Chat renamed: {chat_id} to '{new_title}'")
        return jsonify({"success": True})
    except Exception as e:
        app.logger.error(f"Error renaming chat: {e}")
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
        app.logger.info(f"Chat deleted: {chat_id}")
        return jsonify({"success": True})
    except Exception as e:
        app.logger.error(f"Error deleting chat: {e}")
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
        app.logger.error(f"AI_SUMMARY_ERROR: {e}")
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
                app.logger.info(f"AI summary generated for library item: {item_id}")
            except Exception as e:
                app.logger.error(f"BACKGROUND_MONGO_ERROR: {e}")

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

    # Check document read limits for free users
    if not current_user.isPremium and not current_user.isAdmin:
        user_data = users_collection.find_one({'_id': ObjectId(current_user.id)})
        current_month = datetime.utcnow().strftime('%Y-%m')
        
        # Check if we need to reset document read counter
        if user_data.get('reset_timestamps', {}).get('document_read_reset_month') != current_month:
            users_collection.update_one(
                {'_id': ObjectId(current_user.id)},
                {'$set': {
                    'usage_counts.document_reads': 0,
                    'usage_counts.document_pages_read': 0,
                    'reset_timestamps.document_read_reset_month': current_month
                }}
            )
            user_data = users_collection.find_one({'_id': ObjectId(current_user.id)})
        
        document_reads = user_data.get('usage_counts', {}).get('document_reads', 0)
        document_pages_read = user_data.get('usage_counts', {}).get('document_pages_read', 0)
        
        # Check monthly document read limit (1 per month)
        if document_reads >= FREE_PLAN_LIMITS["monthly_document_reads"]:
            return jsonify({
                'error': f'You have reached your monthly document read limit ({FREE_PLAN_LIMITS["monthly_document_reads"]} document). Please upgrade your plan for unlimited access.',
                'upgrade_required': True
            }), 429
        
        # For PDF files, check number of pages
        if 'pdf' in file.mimetype:
            try:
                pdf_content = file.read()
                pdf_document = fitz.open(stream=pdf_content, filetype="pdf")
                page_count = len(pdf_document)
                pdf_document.close()
                
                # Check if adding this document would exceed page limit
                if document_pages_read + page_count > FREE_PLAN_LIMITS["document_pages"]:
                    return jsonify({
                        'error': f'This document has {page_count} pages, which would exceed your monthly page limit ({FREE_PLAN_LIMITS["document_pages"]} pages). Please upgrade your plan.',
                        'upgrade_required': True
                    }), 429
                
                # Reset file pointer to beginning
                file.seek(0)
            except Exception as e:
                app.logger.error(f"Error checking PDF pages: {e}")
    
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
        
        # For free users, update document page count
        if not current_user.isPremium and not current_user.isAdmin:
            try:
                pdf_document = fitz.open(stream=file_content, filetype="pdf")
                page_count = len(pdf_document)
                pdf_document.close()
                
                users_collection.update_one(
                    {'_id': ObjectId(current_user.id)},
                    {'$inc': {
                        'usage_counts.document_reads': 1,
                        'usage_counts.document_pages_read': page_count
                    }}
                )
            except Exception as e:
                app.logger.error(f"Error updating page count: {e}")
    elif 'word' in file_type or file_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        extracted_text = extract_text_from_docx(file_content)
        # For free users, count document reads for Word files (count as 1 page)
        if not current_user.isPremium and not current_user.isAdmin:
            users_collection.update_one(
                {'_id': ObjectId(current_user.id)},
                {'$inc': {
                    'usage_counts.document_reads': 1,
                    'usage_counts.document_pages_read': 1
                }}
            )
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

        app.logger.info(f"Library item uploaded: {filename} by user {current_user.email}")
        return jsonify({
            "success": True, 
            "id": str(new_id),
            "filename": filename,
            "file_type": file_type,
            "timestamp": library_item["timestamp"].isoformat()
        })
    except Exception as e:
        app.logger.error(f"Error uploading library item: {e}")
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
        app.logger.error(f"Error fetching library items: {e}")
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
        app.logger.info(f"Library item deleted: {item_id}")
        return jsonify({"success": True})
    except Exception as e:
        app.logger.error(f"Error deleting library item: {e}")
        return jsonify({"error": "Could not delete library item"}), 500

# --- Chat Logic ---

def extract_text_from_pdf(pdf_bytes):
    try:
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        return "".join(page.get_text() for page in pdf_document)
    except Exception as e:
        app.logger.error(f"Error extracting PDF text: {e}")
        return ""

def extract_text_from_docx(docx_bytes):
    try:
        document = docx.Document(io.BytesIO(docx_bytes))
        return "\n".join([para.text for para in document.paragraphs])
    except Exception as e:
        app.logger.error(f"Error extracting DOCX text: {e}")
        return ""

def call_api(url, headers, json_payload, api_name):
    try:
        response = requests.post(url, headers=headers, json=json_payload)
        response.raise_for_status()
        result = response.json()
        if 'choices' in result and len(result['choices']) > 0 and 'message' in result['choices'][0] and 'content' in result['choices'][0]['message']:
             return result['choices'][0]['message']['content']
        else:
            return None
    except Exception as e:
        app.logger.error(f"Error calling {api_name} API: {e}")
        return None

def search_web(query):
    if not SERPER_API_KEY:
        return "Web search is disabled because the API key is not configured."

    url = "https://google.serper.dev/search"
    payload = json.dumps({"q": query})
    headers = {'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json'}
    try:
        response = requests.post(url, headers=headers, data=payload)
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
            if answer: return f"Direct Answer: {answer}"
        return "No relevant web results found."
    except Exception as e:
        app.logger.error(f"Error calling Serper API: {e}")
        return f"An error occurred during the web search: {e}"

def search_library(user_id, query):
    if not library_collection: return None
    try:
        keywords = re.split(r'\s+', query)
        regex_pattern = '.*'.join(f'(?=.*{re.escape(k)})' for k in keywords)
        items_cursor = library_collection.find({
            "user_id": user_id,
            "extracted_text": {"$regex": regex_pattern, "$options": "i"}
        }).limit(3)
        snippets = []
        for item in items_cursor:
            filename = item.get("filename", "Untitled")
            snippet = item.get("extracted_text", "")
            context_snippet = snippet[:300]
            snippets.append(f"Source: {filename} (from your Library)\nSnippet: {context_snippet}...")
        if snippets: return "\n\n---\n\n".join(snippets)
        else: return None
    except Exception as e:
        return None

def should_auto_search(user_message):
    msg_lower = user_message.lower().strip()
    security_keywords = ['vulnerability', 'malware', 'cybersecurity', 'sql injection', 'xss', 'mitigation', 'exploit']
    code_keywords = ['def ', 'function ', 'public class', 'SELECT *', 'import ', 'require(']
    general_search_keywords = ['what is', 'who is', 'where is', 'latest', 'news', 'in 2025']
    chat_keywords = ['hi', 'hello', 'thanks']
    if any(msg_lower.startswith(k) for k in chat_keywords): return None
    if any(k in msg_lower for k in security_keywords): return 'security_search'
    if any(k in user_message for k in code_keywords): return 'code_security_scan'
    if any(k in msg_lower for k in general_search_keywords): return 'web_search'
    if len(user_message.split()) > 6: return 'web_search'
    return None

@app.route('/chat', methods=['POST'])
@login_required
def chat():
    # Start timing the response
    start_time = datetime.utcnow()
    
    # Check for free user limits
    if not current_user.isPremium and not current_user.isAdmin:
        user_data = users_collection.find_one({'_id': ObjectId(current_user.id)})
        current_date = datetime.utcnow()
        current_month = current_date.strftime('%Y-%m')
        current_day = current_date.strftime('%Y-%m-%d')
        
        # Check if we need to reset any counters
        update_needed = False
        update_fields = {}
        
        # Reset messages if month changed
        if user_data.get('reset_timestamps', {}).get('message_reset_month') != current_month:
            update_fields['usage_counts.messages'] = 0
            update_fields['reset_timestamps.message_reset_month'] = current_month
            update_needed = True
        
        # Reset voice commands if day changed
        if user_data.get('reset_timestamps', {}).get('voice_command_reset_day') != current_day:
            update_fields['usage_counts.voice_commands'] = 0
            update_fields['reset_timestamps.voice_command_reset_day'] = current_day
            update_needed = True
        
        # Reset document reads if month changed
        if user_data.get('reset_timestamps', {}).get('document_read_reset_month') != current_month:
            update_fields['usage_counts.document_reads'] = 0
            update_fields['usage_counts.document_pages_read'] = 0
            update_fields['reset_timestamps.document_read_reset_month'] = current_month
            update_needed = True
        
        # Reset web searches if day changed
        if user_data.get('reset_timestamps', {}).get('web_search_reset_day') != current_day:
            update_fields['usage_counts.web_searches'] = 0
            update_fields['reset_timestamps.web_search_reset_day'] = current_day
            update_needed = True
        
        if update_needed:
            users_collection.update_one(
                {'_id': ObjectId(current_user.id)},
                {'$set': update_fields}
            )
            # Refresh user data after update
            user_data = users_collection.find_one({'_id': ObjectId(current_user.id)})
        
        # Get current usage
        usage = user_data.get('usage_counts', {})
        messages_used = usage.get('messages', 0)
        
        # Check monthly message limit (500 messages)
        if messages_used >= FREE_PLAN_LIMITS["monthly_messages"]:
            app.logger.warning(f"User {current_user.email} reached message limit: {messages_used}/{FREE_PLAN_LIMITS['monthly_messages']}")
            return jsonify({
                'error': f'You have reached your monthly message limit ({FREE_PLAN_LIMITS["monthly_messages"]} messages). Please upgrade your plan for unlimited access.',
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
        request_mode = data.get('mode') 
        ai_response = None
        model_used = None
        fallback_used = False
        web_search_context = None 
        library_search_context = None
        is_multimodal = bool(file_data) or "youtube.com" in user_message or "youtu.be" in user_message or any(k in user_message.lower() for k in PDF_KEYWORDS)

        app.logger.info(f"Chat request from {current_user.email}: {user_message[:50]}... | Mode: {request_mode}")

        if request_mode == 'chat' and not is_multimodal:
            auto_mode = should_auto_search(user_message)
            if auto_mode:
                request_mode = auto_mode
                if auto_mode in ['web_search', 'security_search']:
                    library_search_context = search_library(ObjectId(current_user.id), user_message)

        if (request_mode == 'web_search' or request_mode == 'security_search') and not is_multimodal and user_message.strip():
            if not current_user.isPremium and not current_user.isAdmin:
                user_data = users_collection.find_one({'_id': ObjectId(current_user.id)})
                searches_used = user_data.get('usage_counts', {}).get('web_searches', 0)
                
                # Check daily web search limit (1 per day)
                if searches_used >= FREE_PLAN_LIMITS["daily_web_searches"]:
                    web_search_context = "Web search limit reached. You have used your 1 daily web search."
                    app.logger.info(f"User {current_user.email} reached web search limit")
                else:
                    web_search_context = search_web(user_message)
                    users_collection.update_one(
                        {'_id': ObjectId(current_user.id)}, 
                        {'$inc': {'usage_counts.web_searches': 1}}
                    )
            else:
                web_search_context = search_web(user_message)
        
        gemini_history = []
        openai_history = []
        # Remember old messages (last 10 messages)
        if conversations_collection is not None and not is_temporary:
            try:
                recent_conversation = conversations_collection.find_one({"user_id": ObjectId(current_user.id)}, sort=[("timestamp", -1)])
                if recent_conversation and 'messages' in recent_conversation:
                    past_messages = recent_conversation['messages'][-10:]  # Last 10 messages
                    for msg in past_messages:
                        role = msg.get('sender')
                        content = msg.get('text', '')
                        gemini_role = 'user' if role == 'user' else 'model'
                        gemini_history.append({'role': gemini_role, 'parts': [content]})
                        openai_role = 'user' if role == 'user' else 'assistant'
                        openai_history.append({"role": openai_role, "content": content})
            except Exception as e:
                app.logger.error(f"Error fetching chat history: {e}")

        openai_history.append({"role": "user", "content": user_message})

        if not is_multimodal and user_message.strip():
            if request_mode == 'code_security_scan':
                CODE_SECURITY_PROMPT = "You are 'Sofia-Sec-L-70B', a specialized AI Code Security Analyst. Analyze the provided code for security vulnerabilities, suggest improvements, and provide secure code examples."
                code_scan_history = [{"role": "system", "content": CODE_SECURITY_PROMPT}, {"role": "user", "content": user_message}]
                ai_response = call_api("https://api.groq.com/openai/v1/chat/completions", {"Authorization": f"Bearer {GROQ_API_KEY}"}, {"model": "llama-3.1-70b-versatile", "messages": code_scan_history}, "Groq (Code Scan)")
                if ai_response:
                    model_used = "groq"
                    app.logger.info("📊 Using Groq API for code security scan")
            elif (web_search_context or library_search_context):
                SYSTEM_PROMPT = "You are 'Sofia-Sec-L', a security analyst. Answer based *only* on context provided. Cite sources clearly."
                context_parts = []
                if web_search_context: context_parts.append(f"--- WEB SEARCH RESULTS ---\n{web_search_context}")
                if library_search_context: context_parts.append(f"--- YOUR LIBRARY RESULTS ---\n{library_search_context}")
                search_augmented_history = [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": f"{'\n\n'.join(context_parts)}\n\n--- USER QUESTION ---\n{user_message}"}]
                ai_response = call_api("https://api.groq.com/openai/v1/chat/completions", {"Authorization": f"Bearer {GROQ_API_KEY}"}, {"model": "llama-3.1-8b-instant", "messages": search_augmented_history}, "Groq (Contextual Search)")
                if ai_response:
                    model_used = "groq"
                    app.logger.info("📊 Using Groq API for contextual search")
            elif GROQ_API_KEY:
                ai_response = call_api("https://api.groq.com/openai/v1/chat/completions", {"Authorization": f"Bearer {GROQ_API_KEY}"}, {"model": "llama-3.1-8b-instant", "messages": openai_history}, "Groq")
                if ai_response:
                    model_used = "groq"
                    app.logger.info("📊 Using Groq API for general chat")

        # Primary Gemini with automatic fallback to Groq
        if not ai_response:
            model = genai.GenerativeModel("gemini-2.5-flash-lite")
            prompt_parts = [user_message] if user_message else []
            if "youtube.com" in user_message or "youtu.be" in user_message:
                video_id = get_video_id(user_message)
                transcript = get_youtube_transcript(video_id) if video_id else None
                if transcript: prompt_parts = [f"Summarize this YouTube video transcript:\n\n{transcript}"]
                else: 
                    app.logger.warning("Couldn't get YouTube transcript")
                    return jsonify({'response': "Sorry, couldn't get the transcript."})
            elif file_data:
                fbytes = base64.b64decode(file_data)
                if 'pdf' in file_type: prompt_parts.append(extract_text_from_pdf(fbytes))
                elif 'word' in file_type: prompt_parts.append(extract_text_from_docx(fbytes))
                elif 'image' in file_type: prompt_parts.append(Image.open(io.BytesIO(fbytes)))

            try:
                # Try Gemini first with conversation history
                if web_search_context or library_search_context or request_mode == 'code_security_scan':
                    response = model.generate_content(prompt_parts)
                else:
                    full_prompt = gemini_history + [{'role': 'user', 'parts': prompt_parts}]
                    response = model.generate_content(full_prompt)
                ai_response = response.text
                model_used = "gemini"
                app.logger.info("✅ Using Gemini API (Primary)")
            except Exception as e:
                app.logger.error(f"Gemini API Error: {e}")
                # Fallback to Groq if Gemini fails
                if GROQ_API_KEY:
                    app.logger.warning("⚠️ Gemini failed, falling back to Groq API...")
                    fallback_used = True
                    try:
                        # Use OpenAI format history for Groq
                        fallback_history = openai_history.copy()
                        if len(fallback_history) > 0:
                            ai_response = call_api(
                                "https://api.groq.com/openai/v1/chat/completions", 
                                {"Authorization": f"Bearer {GROQ_API_KEY}"}, 
                                {"model": "llama-3.1-8b-instant", "messages": fallback_history}, 
                                "Groq (Fallback)"
                            )
                            if ai_response:
                                model_used = "groq"
                                app.logger.info("✅ Fallback to Groq API successful")
                    except Exception as groq_error:
                        app.logger.error(f"Groq Fallback Error: {groq_error}")
                
                # If both Gemini and Groq fail
                if not ai_response:
                    model_used = "error"
                    ai_response = "Sorry, I encountered an error trying to respond. Please try again."
                    app.logger.error("❌ Both Gemini and Groq APIs failed")

        # Calculate response time
        response_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        # Log the AI response to database
        has_context = bool(web_search_context or library_search_context)
        Thread(target=log_ai_response, args=(
            current_user.id, 
            user_message, 
            ai_response, 
            model_used, 
            response_time,
            request_mode,
            has_context,
            fallback_used
        )).start()
        
        # Log to console with emojis for easy tracking
        emoji = "🤖" if model_used == "gemini" else "⚡" if model_used == "groq" else "❌"
        app.logger.info(f"{emoji} AI Response: {model_used.upper()} | Time: {response_time}ms | User: {current_user.email}")

        return jsonify({
            'response': ai_response,
            'model': model_used,
            'response_time': response_time,
            'fallback_used': fallback_used
        })
        
    except Exception as e:
        app.logger.error(f"Chat endpoint error: {e}")
        return jsonify({
            'response': "Sorry, an internal error occurred.",
            'model': 'error',
            'response_time': 0
        })

@app.route('/save_chat_history', methods=['POST'])
@login_required
def save_chat_history():
    if conversations_collection is None:
        return jsonify({'success': False, 'error': 'Database not configured.'}), 500
    try:
        user_id = ObjectId(current_user.id)
        user_name = current_user.name
        history_cursor = conversations_collection.find({"user_id": user_id}).sort("timestamp", 1)
        html_content = f"<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'><title>Chat History for {user_name}</title></head><body><h1>Chat History: {user_name}</h1>"
        for conversation in history_cursor:
            conv_title = conversation.get('title', 'Untitled Chat')
            html_content += f"<h3>Conversation: {conv_title}</h3>"
            for message in conversation.get('messages', []):
                sender = "You" if message.get('sender') == 'user' else "Sofia AI"
                html_content += f"<p><strong>{sender}:</strong> {message.get('text', '')}</p>"
        html_content += "</body></html>"
        response = make_response(html_content)
        response.headers["Content-Disposition"] = "attachment; filename=chat_history.html"
        response.headers["Content-Type"] = "text/html"
        app.logger.info(f"Chat history exported by user: {current_user.email}")
        return response
    except Exception as e:
        app.logger.error(f"Error saving chat history: {e}")
        return jsonify({'success': False, 'error': 'Failed to generate chat history.'}), 500

# --- New: Real-time Log Streaming Endpoint ---
@app.route('/api/logs/stream', methods=['GET'])
@login_required
def stream_logs():
    """Stream real-time logs to the frontend"""
    if not current_user.isAdmin and not current_user.isPremium:
        return jsonify({'error': 'Access denied. Premium or Admin required.'}), 403
    
    def generate():
        # Open the log file and stream its contents
        log_file = 'logs/app.log'
        if not os.path.exists(log_file):
            yield f"data: {json.dumps({'error': 'Log file not found'})}\n\n"
            return
        
        # Send existing log content
        try:
            with open(log_file, 'r') as f:
                lines = f.readlines()[-100:]  # Last 100 lines
                for line in lines:
                    if 'AI Response:' in line or 'Using' in line:
                        yield f"data: {json.dumps({'log': line.strip()})}\n\n"
        except Exception as e:
            app.logger.error(f"Error reading log file: {e}")
    
    return app.response_class(generate(), mimetype='text/event-stream')

# --- Voice Command Endpoint (Placeholder for Future Implementation) ---
@app.route('/api/voice_command', methods=['POST'])
@login_required
def voice_command():
    """Placeholder endpoint for voice command functionality."""
    if not current_user.isPremium and not current_user.isAdmin:
        user_data = users_collection.find_one({'_id': ObjectId(current_user.id)})
        current_day = datetime.utcnow().strftime('%Y-%m-%d')
        
        # Reset voice commands if day changed
        if user_data.get('reset_timestamps', {}).get('voice_command_reset_day') != current_day:
            users_collection.update_one(
                {'_id': ObjectId(current_user.id)},
                {'$set': {
                    'usage_counts.voice_commands': 0,
                    'reset_timestamps.voice_command_reset_day': current_day
                }}
            )
            user_data = users_collection.find_one({'_id': ObjectId(current_user.id)})
        
        voice_commands_used = user_data.get('usage_counts', {}).get('voice_commands', 0)
        
        # Check daily voice command limit (5 per day)
        if voice_commands_used >= FREE_PLAN_LIMITS["daily_voice_commands"]:
            return jsonify({
                'error': f'You have reached your daily voice command limit ({FREE_PLAN_LIMITS["daily_voice_commands"]} commands). Please upgrade your plan for unlimited access.',
                'upgrade_required': True
            }), 429
        
        # Increment voice command counter
        users_collection.update_one(
            {'_id': ObjectId(current_user.id)}, 
            {'$inc': {'usage_counts.voice_commands': 1}}
        )
    
    # Placeholder response - integrate with actual voice processing service
    return jsonify({
        'success': True,
        'message': 'Voice command received. Voice features coming soon!',
        'transcript': 'This is a placeholder for voice transcription'
    })

# --- Usage Statistics Endpoint ---
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
    
    reset_timestamps = user_data.get('reset_timestamps', {})
    
    stats = {
        "messages": {
            "used": usage_counts.get("messages", 0),
            "limit": FREE_PLAN_LIMITS["monthly_messages"],
            "remaining": FREE_PLAN_LIMITS["monthly_messages"] - usage_counts.get("messages", 0),
            "reset_month": reset_timestamps.get("message_reset_month", ""),
            "percentage": min(100, int((usage_counts.get("messages", 0) / FREE_PLAN_LIMITS["monthly_messages"]) * 100))
        },
        "web_searches": {
            "used": usage_counts.get("web_searches", 0),
            "limit": FREE_PLAN_LIMITS["daily_web_searches"],
            "remaining": FREE_PLAN_LIMITS["daily_web_searches"] - usage_counts.get("web_searches", 0),
            "reset_day": reset_timestamps.get("web_search_reset_day", ""),
            "percentage": min(100, int((usage_counts.get("web_searches", 0) / FREE_PLAN_LIMITS["daily_web_searches"]) * 100))
        },
        "document_reads": {
            "used": usage_counts.get("document_reads", 0),
            "limit": FREE_PLAN_LIMITS["monthly_document_reads"],
            "remaining": FREE_PLAN_LIMITS["monthly_document_reads"] - usage_counts.get("document_reads", 0),
            "pages_read": usage_counts.get("document_pages_read", 0),
            "page_limit": FREE_PLAN_LIMITS["document_pages"],
            "pages_remaining": FREE_PLAN_LIMITS["document_pages"] - usage_counts.get("document_pages_read", 0),
            "reset_month": reset_timestamps.get("document_read_reset_month", ""),
            "percentage": min(100, int((usage_counts.get("document_reads", 0) / FREE_PLAN_LIMITS["monthly_document_reads"]) * 100))
        },
        "voice_commands": {
            "used": usage_counts.get("voice_commands", 0),
            "limit": FREE_PLAN_LIMITS["daily_voice_commands"],
            "remaining": FREE_PLAN_LIMITS["daily_voice_commands"] - usage_counts.get("voice_commands", 0),
            "reset_day": reset_timestamps.get("voice_command_reset_day", ""),
            "percentage": min(100, int((usage_counts.get("voice_commands", 0) / FREE_PLAN_LIMITS["daily_voice_commands"]) * 100))
        },
        "plan": "Free Plan" if not current_user.isPremium else "Sofia AI Pro",
        "isPremium": current_user.isPremium
    }
    
    return jsonify(stats)

# --- Upgrade Endpoint (Placeholder for Payment Integration) ---
@app.route('/api/upgrade_to_pro', methods=['POST'])
@login_required
def upgrade_to_pro():
    """Endpoint to upgrade user to premium plan."""
    data = request.get_json()
    payment_method = data.get('payment_method', 'razorpay')  # Example: razorpay, stripe, etc.
    
    # In a real implementation, integrate with payment gateway
    # For college project, we can simulate successful payment
    
    try:
        users_collection.update_one(
            {'_id': ObjectId(current_user.id)},
            {'$set': {'isPremium': True}}
        )
        
        # Send upgrade confirmation email
        user_data = users_collection.find_one({'_id': ObjectId(current_user.id)})
        email = user_data.get('email')
        name = user_data.get('name')
        
        html_content = f"""
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="text-align: center; color: #333;">🎉 Welcome to Sofia AI Pro, {name}!</h2>
            <p style="font-size: 16px; color: #555;">Thank you for upgrading to Sofia AI Pro! Your account has been successfully upgraded.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #28a745;">🎯 Pro Plan Benefits:</h3>
                <ul style="font-size: 14px; color: #555;">
                    <li>✅ Unlimited Text Messages</li>
                    <li>✅ Unlimited Voice Commands</li>
                    <li>✅ Unlimited Document Reads</li>
                    <li>✅ Unlimited Web Searches</li>
                    <li>✅ Priority Support</li>
                </ul>
            </div>
            <p style="font-size: 14px; color: #888; text-align: center;">Start exploring all the premium features now!</p>
        </div>
        """
        
        Thread(target=send_async_brevo_email, args=(app, email, "Welcome to Sofia AI Pro!", html_content)).start()
        
        app.logger.info(f"User upgraded to Pro: {current_user.email}")
        
        return jsonify({
            'success': True,
            'message': 'Successfully upgraded to Sofia AI Pro!',
            'isPremium': True
        })
    except Exception as e:
        app.logger.error(f"Upgrade error: {e}")
        return jsonify({'success': False, 'error': 'Failed to upgrade account.'}), 500

# --- New: System Health Endpoint ---
@app.route('/api/system_health', methods=['GET'])
@login_required
def system_health():
    """Get system health information"""
    if not current_user.isAdmin:
        return jsonify({'error': 'Access denied. Admin required.'}), 403
    
    health_info = {
        'timestamp': datetime.utcnow().isoformat(),
        'mongodb_connected': mongo_client is not None and mongo_client.server_info() is not None,
        'gemini_configured': GOOGLE_API_KEY is not None,
        'groq_configured': GROQ_API_KEY is not None,
        'serper_configured': SERPER_API_KEY is not None,
        'brevo_configured': BREVO_API_KEY is not None,
        'total_users': users_collection.count_documents({}) if users_collection else 0,
        'total_chats': conversations_collection.count_documents({}) if conversations_collection else 0,
        'total_ai_responses': ai_logs_collection.count_documents({}) if ai_logs_collection else 0,
        'uptime': 'N/A',  # Could be implemented with process start time
    }
    
    # Calculate model usage stats
    if ai_logs_collection:
        try:
            model_stats = ai_logs_collection.aggregate([
                {"$group": {
                    "_id": "$model_used",
                    "count": {"$sum": 1},
                    "avg_time": {"$avg": "$response_time_ms"}
                }}
            ])
            health_info['model_usage'] = list(model_stats)
        except Exception as e:
            health_info['model_usage_error'] = str(e)
    
    return jsonify(health_info)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.logger.info(f"🚀 Starting Sofia AI Server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)
