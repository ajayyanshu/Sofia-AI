# models.py
import os, random, requests
from threading import Thread
from bson.objectid import ObjectId
from flask_login import UserMixin
from pymongo import MongoClient

# MongoDB Setup
MONGO_URI = os.environ.get("MONGO_URI")
client = MongoClient(MONGO_URI) if MONGO_URI else None
db = client.get_database("ai_assistant_db") if client else None
users_collection = db.get_collection("users") if db is not None else None

def send_brevo_email(to_email, subject, html_content):
    api_key = os.environ.get("BREVO_API_KEY")
    sender = os.environ.get("SENDER_EMAIL", "admin@sofia-ai.com")
    if not api_key: return False
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
    except: return False

class User(UserMixin):
    def __init__(self, user_data):
        self.id = str(user_data["_id"])
        self.email = user_data.get("email")
        self.name = user_data.get("name")
        self.session_id = user_data.get("session_id")
        self.is_verified = user_data.get("is_verified", False)

    @staticmethod
    def get_by_id(user_id):
        if users_collection is None: return None
        user_data = users_collection.find_one({"_id": ObjectId(user_id)})
        return User(user_data) if user_data else None

    @staticmethod
    def resend_otp_logic(email):
        """Generates new OTP and sends email."""
        user_data = users_collection.find_one({"email": email})
        if not user_data: return False, "User not found"
        
        new_otp = str(random.randint(100000, 999999))
        users_collection.update_one({"_id": user_data["_id"]}, {"$set": {"verification_token": new_otp}})
        
        html = f"<h3>Your new Sofia AI code: {new_otp}</h3>"
        Thread(target=send_brevo_email, args=(email, "New Verification Code", html)).start()
        return True, "Sent"
