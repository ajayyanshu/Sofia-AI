# models.py
import os
import random
import requests
from threading import Thread
from bson.objectid import ObjectId
from flask_login import UserMixin
from pymongo import MongoClient

# MongoDB Setup
MONGO_URI = os.environ.get("MONGO_URI")
client = MongoClient(MONGO_URI) if MONGO_URI else None
db = client.get_database("ai_assistant_db") if client else None
users_collection = db.get_collection("users") if db is not None else None

# Helper for sending emails (standalone version for models.py)
def send_brevo_email(to_email, subject, html_content):
    api_key = os.environ.get("BREVO_API_KEY")
    sender = os.environ.get("SENDER_EMAIL", "admin@sofia-ai.com")
    if not api_key:
        return False
    
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {"api-key": api_key, "content-type": "application/json", "accept": "application/json"}
    payload = {
        "sender": {"email": sender, "name": "Sofia AI"},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content
    }
    try:
        r = requests.post(url, headers=headers, json=payload)
        return r.status_code < 300
    except Exception as e:
        print(f"Email Error: {e}")
        return False

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
    def get_by_id(user_id):
        if users_collection is None: return None
        try:
            user_data = users_collection.find_one({"_id": ObjectId(user_id)})
            return User(user_data) if user_data else None
        except:
            return None

    # --- NEW: Resend OTP Logic ---
    @staticmethod
    def resend_otp_logic(email):
        """Generates a new OTP, updates the DB, and sends the email."""
        if users_collection is None:
            return False, "Database connection error."

        user_data = users_collection.find_one({"email": email})
        if not user_data:
            return False, "Account not found."
        
        if user_data.get('is_verified'):
            return False, "Account is already verified."

        # 1. Generate new 6-digit OTP
        new_otp = str(random.randint(100000, 999999))

        # 2. Update database
        users_collection.update_one(
            {"_id": user_data["_id"]},
            {"$set": {"verification_token": new_otp}}
        )

        # 3. Prepare Email Content
        user_name = user_data.get('name', 'User')
        html_content = f"""
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2>Your New Sofia AI Verification Code</h2>
            <p>Hello {user_name}, here is your requested code:</p>
            <h1 style="color: #FF4B2B; letter-spacing: 5px;">{new_otp}</h1>
            <p>If you didn't request this, please ignore this email.</p>
        </div>
        """

        # 4. Send Email in Background
        Thread(target=send_brevo_email, args=(email, "New Verification Code", html_content)).start()
        
        return True, "Success"
