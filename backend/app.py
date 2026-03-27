# app.py - Complete Production-Ready Backend with JWT Blacklist, IP Blocking & Suspicious Activity Detection
# =============================================================================
# IMPORTS
# =============================================================================
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_jwt_extended import get_jwt
from werkzeug.utils import secure_filename
import os
import pandas as pd
import numpy as np
from datetime import datetime, timezone, timedelta
import json
from bson import ObjectId, json_util
from pymongo import MongoClient
from functools import wraps
import uuid
import io
import traceback
import logging
import random
import hashlib
from rapidfuzz import fuzz
from dotenv import load_dotenv
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import pagesizes
import base64
from flask import send_from_directory
from twilio.rest import Client
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logging.getLogger("pymongo").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

# =============================================================================
# ENVIRONMENT VARIABLES
# =============================================================================
load_dotenv()

# =============================================================================
# FLASK APP INITIALIZATION
# =============================================================================
app = Flask(__name__)

# =============================================================================
# CORS CONFIGURATION
# =============================================================================
CORS(
    app,
    resources={r"/api/*": {"origins": "http://localhost:5173"}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization", "X-Workspace-Id", "X-Client"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)

# =============================================================================
# APP CONFIGURATION
# =============================================================================
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here-change-in-production')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-jwt-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', './uploads')
app.config['PROFILE_UPLOAD_FOLDER'] = os.getenv('PROFILE_UPLOAD_FOLDER', './profile_uploads')
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
app.config['ALLOWED_EXTENSIONS'] = {'xlsx', 'xls', 'csv', 'json'}

# =============================================================================
# JWT INITIALIZATION
# =============================================================================
jwt = JWTManager(app)

# =============================================================================
# TWILIO & SENDGRID CONFIGURATION
# =============================================================================
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM")


twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# =============================================================================
# NOTIFICATION FUNCTIONS
# =============================================================================

def send_sms_otp(to_number, otp):
    """Send OTP via SMS using Twilio"""
    if not twilio_client:
        raise Exception("Twilio not configured")

    message = twilio_client.messages.create(
        body=f"Your Nutmeg BI OTP is: {otp}",
        from_=TWILIO_PHONE_NUMBER,
        to=to_number
    )

    return message.sid

def send_email_otp(to_email, otp):
    """Send OTP via Email using SendGrid"""
    message = Mail(
        from_email=EMAIL_FROM,
        to_emails=to_email,
        subject="Nutmeg BI - Your OTP Code",
        html_content=f"""
        <div style="font-family:Arial;padding:20px">
            <h2>Nutmeg BI Verification</h2>
            <p>Your One Time Password is:</p>
            <h1 style="color:#4f46e5">{otp}</h1>
            <p>This code will expire in 5 minutes.</p>
        </div>
        """
    )

    sg = SendGridAPIClient(SENDGRID_API_KEY)
    response = sg.send(message)

    logger.info(f"SendGrid status: {response.status_code}")
    return response.status_code

def send_email_generic(to_email, subject, html_content):
    """Generic email sender for notifications"""
    if not SENDGRID_API_KEY:
        logger.warning("SendGrid not configured")
        return

    try:
        message = Mail(
            from_email=EMAIL_FROM,
            to_emails=to_email,
            subject=subject,
            html_content=f"""
            <div style="font-family:Arial;padding:20px">
                <h2>{subject}</h2>
                <p>{html_content}</p>
            </div>
            """
        )

        sg = SendGridAPIClient(SENDGRID_API_KEY)
        sg.send(message)
        logger.info(f"Email sent to {to_email}")
    except Exception as e:
        logger.error(f"Email sending failed: {e}")

def send_sms_generic(to_number, message):
    """Generic SMS sender for notifications"""
    if not twilio_client:
        logger.warning("Twilio not configured")
        return

    try:
        twilio_client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=to_number
        )
        logger.info(f"SMS sent to {to_number}")
    except Exception as e:
        logger.error(f"SMS sending failed: {e}")

# =============================================================================
# CENTRALIZED NOTIFICATION DISPATCHER WITH CATEGORY SUPPORT
# =============================================================================
def send_notification(user, subject, message, sms_message=None, category="notifications"):
    """
    Sends notification based on global deliveryChannel (from notifications section).
    Security section only controls alert toggles — not delivery channel.
    """
    try:
        preferences = user.get("preferences", {})
        
        # 🔹 Always get delivery channel from notifications section
        notifications_section = preferences.get("notifications", {})
        delivery_channel = notifications_section.get("deliveryChannel")

        if delivery_channel not in ["email", "sms", "both"]:
            logger.info("No valid delivery channel set. Skipping notification.")
            return

        email = user.get("email")
        mobile = user.get("mobile")

        # ================= EMAIL =================
        if delivery_channel in ["email", "both"]:
            if email and user.get("email_verified"):
                try:
                    send_email_generic(email, subject, message)
                    logger.info(f"Email sent to {email} [{category}]")
                except Exception as e:
                    logger.error(f"Email send failed: {e}")

        # ================= SMS =================
        if delivery_channel in ["sms", "both"]:
            if mobile and user.get("mobile_verified"):
                try:
                    send_sms_generic(mobile, sms_message or message)
                    logger.info(f"SMS sent to {mobile} [{category}]")
                except Exception as e:
                    logger.error(f"SMS send failed: {e}")

    except Exception as e:
        logger.error(f"Notification dispatch error: {e}")

def get_geo_location(ip):
    # Temporary safe version
    return "Unknown"
# =============================================================================
# MONGODB CONNECTION
# =============================================================================
def get_mongo_client():
    try:
        mongodb_uri = os.getenv(
            'MONGODB_URI',
            'mongodb://localhost:27017/nutmeg_bi'
        )
        client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        logger.info("Successfully connected to MongoDB")
        return client
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise

mongo_client = get_mongo_client()
db = mongo_client.get_database("nutmeg_bi")

# Collections
users_collection = db.users
workspaces_collection = db.workspaces
datasets_collection = db.datasets
reports_collection = db.reports
dashboards_collection = db.dashboards
templates_collection = db.visualization_templates
otp_collection = db.otp_codes
audit_logs_collection = db.audit_logs
sessions_collection = db.user_sessions
token_blacklist_collection = db.token_blacklist
ip_block_collection = db.ip_blocks
security_events_collection = db.security_events

# =============================================================================
# DATABASE INDEXES
# =============================================================================
# OTP Collection indexes
otp_collection.create_index("expires_at", expireAfterSeconds=0)
otp_collection.create_index("identifier")
otp_collection.create_index([("user_id", 1), ("type", 1), ("value", 1)])

# Token blacklist index (auto expire when token expires)
token_blacklist_collection.create_index("expires_at", expireAfterSeconds=0)
token_blacklist_collection.create_index("jti")

# IP Block indexes
ip_block_collection.create_index("blocked_until", expireAfterSeconds=0)
ip_block_collection.create_index("ip")

# Security Events indexes
security_events_collection.create_index("user_id")
security_events_collection.create_index("created_at")
security_events_collection.create_index("event_type")
security_events_collection.create_index([("user_id", 1), ("created_at", -1)])

# Performance indexes
datasets_collection.create_index("workspace_id")
datasets_collection.create_index("created_by")
reports_collection.create_index("workspace_id")
dashboards_collection.create_index("workspace_id")
workspaces_collection.create_index("owner_id")
workspaces_collection.create_index("members.user_id")

# User unique indexes
try:
    users_collection.create_index("email", unique=True, sparse=True)
    users_collection.create_index("mobile", unique=True, sparse=True)
except Exception as e:
    logger.warning(f"User index warning: {e}")

# Workspace unique index
try:
    workspaces_collection.create_index(
        [("owner_id", 1), ("name", 1)],
        unique=True,
        partialFilterExpression={"is_deleted": False}
    )
except Exception as e:
    logger.warning(f"Workspace unique index warning: {e}")

# Sessions index
sessions_collection.create_index("user_id")
sessions_collection.create_index([("user_id", 1), ("last_active", -1)])
sessions_collection.create_index("device_fingerprint")

# =============================================================================
# SYSTEM WORKSPACES CONFIGURATION
# =============================================================================
SYSTEM_WORKSPACES = [
    {
        "key": "general",
        "name": "General Workspace",
        "description": "Central workspace for all datasets",
        "icon": "Home",
        "color": "#6b7280",
        "type": "general"
    },
    {
        "key": "sales",
        "name": "Sales Workspace",
        "description": "Sales performance and revenue analytics",
        "icon": "DollarSign",
        "color": "#4f46e5",
        "type": "default"
    },
    {
        "key": "logistics",
        "name": "Logistics Workspace",
        "description": "Supply chain and logistics analysis",
        "icon": "Truck",
        "color": "#0891b2",
        "type": "default"
    },
    {
        "key": "manufacturing",
        "name": "Manufacturing Workspace",
        "description": "Manufacturing and production efficiency",
        "icon": "Factory",
        "color": "#ea580c",
        "type": "default"
    },
    {
        "key": "retail",
        "name": "Retail Workspace",
        "description": "Retail sales and customer behavior",
        "icon": "ShoppingCart",
        "color": "#059669",
        "type": "default"
    },
    {
        "key": "production",
        "name": "Production Workspace",
        "description": "Production planning and output tracking",
        "icon": "Package",
        "color": "#9333ea",
        "type": "default"
    },
    {
        "key": "telecom",
        "name": "Telecom Workspace",
        "description": "Telecom network and usage analytics",
        "icon": "Wifi",
        "color": "#2563eb",
        "type": "default"
    },
    {
        "key": "healthcare",
        "name": "Healthcare Workspace",
        "description": "Healthcare operations and insights",
        "icon": "HeartPulse",
        "color": "#dc2626",
        "type": "default"
    },
    {
        "key": "employee",
        "name": "Employee Productivity Workspace",
        "description": "Employee performance and productivity",
        "icon": "Users",
        "color": "#9333ea",
        "type": "default"
    }
]

# =============================================================================
# WORKSPACE DOMAIN RULES
# =============================================================================
WORKSPACE_DOMAIN_RULES = {

    "sales": [
        "sales","revenue","order","order_id","price","amount","customer",
        "client","buyer","product","item","quantity","discount","profit"
    ],

    "healthcare": [
        "patient","hospital","diagnosis","treatment","doctor","nurse",
        "medical","clinic","medicine","appointment","disease"
    ],

    "logistics": [
        "shipment","shipping","warehouse","delivery","transport",
        "tracking","dispatch","route","driver","freight"
    ],

    "manufacturing": [
        "machine","manufacture","manufacturing","factory",
        "assembly","production","component","defect","batch"
    ],

    "production": [
        "production","output","units","capacity","downtime",
        "efficiency","machine","process"
    ],

    "retail": [
        "retail","store","inventory","sku","stock","barcode",
        "store_id","sales","counter","shop"
    ],

    "employee": [
        "employee","staff","worker","department","salary",
        "designation","payroll","attendance","manager"
    ],

    "telecom": [
        "subscriber","sim","network","call","data",
        "bandwidth","signal","tower","usage","imei"
    ]
}

DOMAIN_RECORD_MAP = {
    "sales": "sales",
   "healthcare": "healthcare",
    "telecom": "telecom",
    "logistics": "logistics",
    "manufacturing": "manufacturing",
    "retail": "retail",
    "production": "production",
    "employee": "employee"
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def get_user_id():
    return get_jwt_identity()

def generate_otp():
    return str(random.randint(100000, 999999))

def hash_otp(otp):
    return hashlib.sha256(otp.encode()).hexdigest()

def mask_identifier(identifier):
    if "@" in identifier:
        name, domain = identifier.split("@")
        return name[:2] + "***@" + domain
    return identifier[:2] + "******" + identifier[-2:]

def sanitize_value(v):
    if v is None:
        return None
    if isinstance(v, float) and np.isnan(v):
        return None
    return v

def ensure_utc(dt):
    """
    Convert naive datetime to UTC aware datetime.
    Safe for production.
    """
    if dt is None:
        return None

    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)

    return dt  

def validate_dataset_domain(df, workspace_key):
    """
    Strictly validate dataset columns against workspace domain rules
    """

    # Skip validation for general workspace
    if workspace_key == "general":
        return True, 0

    keywords = WORKSPACE_DOMAIN_RULES.get(workspace_key, [])

    if not keywords:
        return True, 0

    # Normalize column names
    columns = [
        col.lower().replace("_", " ").strip()
        for col in df.columns
    ]

    match_count = 0

    for keyword in keywords:
        for col in columns:
            if keyword in col:
                match_count += 1
                break

    # Require minimum matches
    if match_count >= 2:
        return True, match_count

    return False, match_count     

# =============================================================================
# SECURITY HELPER FUNCTIONS
# =============================================================================

def get_device_fingerprint():
    """
    Creates stable fingerprint for device detection
    """
    user_agent = request.headers.get("User-Agent", "unknown")
    raw = f"{user_agent}-{request.remote_addr}"
    return hashlib.sha256(raw.encode()).hexdigest()

def is_new_device(user_id):
    """
    Returns True if device has never logged in before
    """
    fingerprint = get_device_fingerprint()
    
    existing = sessions_collection.find_one({
        "user_id": user_id,
        "device_fingerprint": fingerprint
    })
    
    return existing is None

def mark_old_sessions_inactive(user_id):
    """
    Marks all previous sessions as inactive
    """
    sessions_collection.update_many(
        {"user_id": user_id},
        {"$set": {"is_current": False}}
    )

def is_ip_blocked(ip):
    """
    Check if IP is currently blocked
    """
    block = ip_block_collection.find_one({
        "ip": ip,
        "blocked_until": {"$gt":datetime.now(timezone.utc)}
    })
    return block is not None

def record_ip_failure(ip):
    """
    Record failed attempt for IP and block if threshold reached
    """
    record = ip_block_collection.find_one({"ip": ip})
    
    if not record:
        ip_block_collection.insert_one({
            "ip": ip,
            "fail_count": 1,
            "created_at":datetime.now(timezone.utc)
        })
        return
    
    fail_count = record.get("fail_count", 0) + 1
    
    # Block after 10 failures
    if fail_count >= 10:
        blocked_until =datetime.now(timezone.utc) + timedelta(minutes=15)
        ip_block_collection.update_one(
            {"ip": ip},
            {
                "$set": {
                    "fail_count": fail_count,
                    "blocked_until": blocked_until
                }
            }
        )
        logger.warning(f"IP {ip} blocked for 15 minutes due to {fail_count} failures")
    else:
        ip_block_collection.update_one(
            {"ip": ip},
            {"$set": {"fail_count": fail_count}}
        )

def reset_ip_failures(ip):
    """
    Reset failure count for IP after successful login
    """
    ip_block_collection.delete_one({"ip": ip})

def evaluate_suspicious_activity(user_id, ip, device_fingerprint):
    """
    Evaluate if current activity is suspicious based on patterns
    Returns risk level or None
    """
    recent_events = list(security_events_collection.find({
        "user_id": user_id,
        "created_at": {"$gte":datetime.now(timezone.utc) - timedelta(minutes=30)}
    }))
    
    # Rule 1: Too many device changes in short time
    unique_devices = set([e["device_fingerprint"] for e in recent_events])
    if len(unique_devices) >= 5:
        return "MULTIPLE_DEVICE_ANOMALY"
    
    # Rule 2: Too many IP changes in short time
    unique_ips = set([e["ip"] for e in recent_events])
    if len(unique_ips) >= 5:
        return "MULTIPLE_IP_ANOMALY"
    
    return None

def validate_delivery_channel(channel, email_verified, mobile_verified):
    """
    Validate if delivery channel is allowed based on verification status
    """
    if channel == "sms" and not mobile_verified:
        return False
    if channel == "email" and not email_verified:
        return False
    if channel == "both" and not (email_verified and mobile_verified):
        return False
    return True

# =============================================================================
# JWT BLACKLIST CONFIGURATION
# =============================================================================

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload["jti"]
    token = token_blacklist_collection.find_one({"jti": jti})
    return token is not None

# =============================================================================
# DOMAIN FILTER ENGINE
# =============================================================================
def apply_domain_filter(df, workspace_key, workspace_type):
    """
    Smart domain filter for production.
    - Matches keywords
    - Allows flexible column naming
    - Never breaks visualization
    """

    DOMAIN_KEYWORDS = {
        "sales": [
            "order","customer","product","price","quantity","revenue","discount","sale"
        ],
        "healthcare": [
            "patient","hospital","doctor","diagnosis","treatment","medical"
        ],
        "logistics": [
            "shipment","warehouse","delivery","transport","route"
        ],
        "production": [
            "machine","production","output","units","capacity","factory"
        ],
        "manufacturing": [
            "machine","production","defect","factory","component"
        ],
        "retail": [
            "product","sku","category","price","stock","inventory","qty","margin","sales"
        ],
        "employee": [
            "employee","department","salary","staff","payroll"
        ],
        "telecom": [
            "subscriber","network","data","call","usage","bandwidth"
        ]
    }

    keywords = DOMAIN_KEYWORDS.get(workspace_key, [])

    if not keywords:
        return df

    filtered_columns = []

    for col in df.columns:
        col_lower = col.lower()

        if any(keyword in col_lower for keyword in keywords):
            filtered_columns.append(col)

    # 🚨 IMPORTANT: fallback for unknown datasets
    if len(filtered_columns) < 2:
        return df

    return df[filtered_columns]

def smart_filter_columns_by_workspace(df, workspace_key, threshold=70):
    """
    Return dataframe with columns relevant to workspace domain
    using fuzzy matching.
    """

    keywords = WORKSPACE_DOMAIN_RULES.get(workspace_key, [])

    if not keywords:
        return df

    filtered_columns = []

    for col in df.columns:

        col_lower = col.lower()

        for keyword in keywords:

            score = fuzz.partial_ratio(col_lower, keyword)

            if score >= threshold:
                filtered_columns.append(col)
                break

    if not filtered_columns:
        return df

    return df[filtered_columns]    

# =============================================================================
# DASHBOARD FILTER ENGINE
# =============================================================================
def apply_dashboard_filters(df, filters):
    """
    Apply dashboard-level filters to dataframe.
    filters = {
        "region": "South",
        "year": 2024,
        "date_range": {
            "start": "2024-01-01",
            "end": "2024-12-31"
        }
    }
    """
    if not filters:
        return df

    for column, value in filters.items():
        if value is None or value == "":
            continue

        if column not in df.columns:
            continue

        # Date Range Filter
        if isinstance(value, dict) and "start" in value and "end" in value:
            try:
                df[column] = pd.to_datetime(df[column], errors="coerce")
                start = pd.to_datetime(value["start"])
                end = pd.to_datetime(value["end"])
                df = df[(df[column] >= start) & (df[column] <= end)]
            except Exception:
                continue

        # Multi-select filter (list)
        elif isinstance(value, list):
            df = df[df[column].isin(value)]

        # Exact match
        else:
            df = df[df[column] == value]

    return df

# =============================================================================
# CENTRALIZED CHART QUERY ENGINE
# =============================================================================
def generate_chart_data(df, config):
    """
    config example:
    {
        "x": "region",
        "y": ["sales"],
        "aggregation": "SUM",
        "series": "category"
    }
    """
    x = config.get("x")
    y_measures = config.get("y", [])
    agg = config.get("aggregation", "SUM")
    series = config.get("series")

    if not x or x not in df.columns:
        raise ValueError("INVALID_X_AXIS")

    if not isinstance(y_measures, list):
        y_measures = [y_measures]

    for y in y_measures:
        if y not in df.columns:
            raise ValueError(f"INVALID_MEASURE: {y}")

    agg_map = {
        "SUM": "sum",
        "AVG": "mean",
        "COUNT": "count",
        "MIN": "min",
        "MAX": "max"
    }

    if agg not in agg_map:
        raise ValueError("INVALID_AGGREGATION")

    group_cols = [x]
    if series and series in df.columns:
        group_cols.append(series)

    grouped = (
        df.groupby(group_cols)[y_measures]
        .agg(agg_map[agg])
        .reset_index()
    )

    labels = grouped[x].astype(str).unique().tolist()
    series_output = []

    if series:
        for s_val in grouped[series].unique():
            subset = grouped[grouped[series] == s_val]
            for y in y_measures:
                series_output.append({
                    "name": f"{y} ({s_val})",
                    "data": [
                        float(subset[subset[x] == label][y].values[0])
                        if label in subset[x].values else 0
                        for label in labels
                    ]
                })
    else:
        for y in y_measures:
            series_output.append({
                "name": y,
                "data": [
                    float(grouped[grouped[x] == label][y].values[0])
                    if label in grouped[x].values else 0
                    for label in labels
                ]
            })

    return {
        "labels": labels,
        "series": series_output
    }

# =============================================================================
# CENTRALIZED DATA ACCESS LAYER
# =============================================================================
def get_filtered_dataframe(dataset_id, user_id, max_rows=500_000):
    """
    Fetch dataset + validate workspace access + apply domain filter.
    Returns:
        df (filtered DataFrame)
        workspace (workspace document)
    Raises:
        ValueError with appropriate message if something fails.
    """

    # Fetch dataset
    dataset = datasets_collection.find_one({"_id": dataset_id})
    if not dataset:
        raise ValueError("DATASET_NOT_FOUND")

    workspace_id = dataset.get("workspace_id")

    if not workspace_id:
        raise ValueError("INVALID_WORKSPACE_ID")

    # Support both ObjectId AND SYSTEM KEY
    if ObjectId.is_valid(workspace_id):
        workspace = workspaces_collection.find_one({
            "_id": ObjectId(workspace_id),
            "is_deleted": {"$ne": True},
            "$or": [
                {"owner_id": user_id},
                {"members.user_id": user_id}
            ]
        })
    else:
        workspace = workspaces_collection.find_one({
            "key": workspace_id,
            "owner_id": user_id,
            "is_deleted": {"$ne": True}
        })

    if not workspace:
        raise ValueError("WORKSPACE_ACCESS_DENIED")

    # Load Data
    file_path = dataset.get("file_path")

    if not file_path or not os.path.exists(file_path):
        raise ValueError("DATA_FILE_NOT_FOUND")

    df = pd.read_parquet(file_path)

    if df.empty:
        raise ValueError("NO_DATA")

    # Apply row limit safely
    df = df.head(max_rows)

    # ================= WORKSPACE COLUMN FILTER =================
    workspace_key = workspace.get("key")

    df = smart_filter_columns_by_workspace(df, workspace_key)
    # ===========================================================

    # Apply Domain Isolation (row-level if needed)
    df = apply_domain_filter(
        df,
        workspace.get("key"),
        workspace.get("type")
    )

    # Remove empty columns
    df = df.dropna(axis=1, how="all")

    if df.empty:
        return pd.DataFrame(), workspace

    return df, workspace

# =============================================================================
# SYSTEM WORKSPACES CREATOR
# =============================================================================
def ensure_system_workspaces(user_id, user_email):
    """Create system workspaces for a new user"""
    try:
        existing = list(workspaces_collection.find({
            "owner_id": user_id,
            "is_system": True
        }))

        existing_keys = {w.get("key") for w in existing}

        for ws in SYSTEM_WORKSPACES:
            if ws["key"] in existing_keys:
                continue

            workspaces_collection.insert_one({
                "key": ws["key"],
                "name": ws["name"],
                "description": ws["description"],
                "icon": ws["icon"],
                "color": ws["color"],
                "type": ws["type"],
                "is_system": True,
                "is_deleted": False,
                "owner_id": user_id,
                "created_at":datetime.now(timezone.utc),
                "updated_at":datetime.now(timezone.utc),
                "members": [{
                    "user_id": user_id,
                    "email": user_email,
                    "role": "owner",
                    "joined_at":datetime.now(timezone.utc)
                }],
                "stats": {
                    "datasets": 0,
                    "members": 1
                }
            })
            logger.info(f"Created system workspace: {ws['name']} for user {user_email}")
    except Exception as e:
        logger.error(f"Error ensuring system workspaces: {e}")

# =============================================================================
# VISUALIZATION TEMPLATES SEEDER
# =============================================================================
def seed_visualization_templates():
    if templates_collection.count_documents({}) > 0:
        return

    templates = [
        {
            "_id": "bar_basic",
            "name": "Basic Bar Chart",
            "chart_type": "bar",
            "category": "cartesian",
            "config": {
                "x": None,
                "y": [],
                "aggregation": "SUM",
                "series": None
            },
            "supports": {
                "multi_measure": True,
                "series": True
            }
        },
        {
            "_id": "line_multi",
            "name": "Multi Line Chart",
            "chart_type": "line",
            "category": "cartesian",
            "config": {
                "x": None,
                "y": [],
                "aggregation": "AVG",
                "series": None
            },
            "supports": {
                "multi_measure": True,
                "series": True
            }
        },
        {
            "_id": "treemap",
            "name": "Treemap",
            "chart_type": "treemap",
            "category": "hierarchy",
            "config": {
                "dimensions": [],
                "measure": None
            },
            "supports": {
                "hierarchy": True
            }
        },
        {
            "_id": "sunburst",
            "name": "Sunburst",
            "chart_type": "sunburst",
            "category": "hierarchy",
            "config": {
                "dimensions": [],
                "measure": None
            },
            "supports": {
                "hierarchy": True
            }
        }
    ]

    templates_collection.insert_many(templates)
    logger.info("Visualization templates seeded")

# =============================================================================
# WORKSPACE ACCESS DECORATOR
# =============================================================================
def workspace_access_required(f):
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        workspace_param = (
            kwargs.get('workspace_id')
            or request.args.get('workspace_id')
        )

        # Try to get from JSON body for POST/PUT requests
        if not workspace_param and request.method in ["POST", "PUT"]:
            if request.is_json:
                workspace_param = request.json.get("workspace_id")
            else:
                workspace_param = request.form.get("workspace_id")

        if not workspace_param or workspace_param == "undefined":
            logger.error(f"Workspace ID is missing or invalid from user {user_id}")
            return jsonify({
                "error": "Workspace ID is missing or invalid",
                "code": "WORKSPACE_ID_INVALID",
                "details": "Please provide a valid workspace ID"
            }), 400

        workspace = None

        # Try ObjectId (custom workspace) with soft delete filter
        if ObjectId.is_valid(workspace_param):
            workspace = workspaces_collection.find_one({
                '_id': ObjectId(workspace_param),
                "is_deleted": {"$ne": True},
                '$or': [
                    {'owner_id': user_id},
                    {'members.user_id': user_id}
                ]
            })

        # Try system workspace by key
        if not workspace:
            workspace = workspaces_collection.find_one({
                'key': workspace_param,
                'owner_id': user_id,
                "is_deleted": {"$ne": True},
                'is_system': True
            })

        if not workspace:
            logger.warning(f"Workspace access denied: user {user_id} tried to access {workspace_param}")
            return jsonify({
                'error': 'Workspace not found or access denied',
                'details': f'You do not have access to workspace "{workspace_param}"',
                'code': 'WORKSPACE_ACCESS_DENIED'
            }), 403

        kwargs['resolved_workspace_id'] = str(workspace['_id'])
        kwargs['workspace_key'] = workspace.get('key', 'general')
        kwargs['workspace_type'] = workspace.get('type', 'custom')
        
        return f(*args, **kwargs)

    return decorated_function

# =============================================================================
# PREFLIGHT HANDLER
# =============================================================================
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = app.make_response("")
        response.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Workspace-Id, X-Client"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

# =============================================================================
# ROOT ROUTE
# =============================================================================
@app.route("/", methods=["GET"])
def root():
    return jsonify({
        "message": "NutMeg BI Analytics Backend is running",
        "status": "OK",
        "version": "1.0.0",
        "timestamp":datetime.now(timezone.utc).isoformat(),
        "features": [
            "Production-ready BI backend",
            "System workspaces (general, sales, logistics, etc.)",
            "Dataset management with workspace isolation",
            "Dataset metadata management",
            "User authentication with JWT",
            "JWT Blacklist for token revocation",
            "IP-based login blocking",
            "Suspicious activity detection",
            "File upload (CSV, XLSX, JSON)",
            "CORS configured for frontend",
            "Centralized notification dispatcher with category support",
            "Security alerts with separate delivery channel"
        ]
    }), 200

# =============================================================================
# AUTHENTICATION ROUTES
# =============================================================================

@app.route("/api/home/stats", methods=["GET"])
@jwt_required()
def get_home_stats():

    user_id = get_jwt_identity()

    # Get user's workspaces
    workspaces = list(
        workspaces_collection.find(
            {
                "$or": [
                    {"owner_id": user_id},
                    {"members.user_id": user_id}
                ],
                "is_deleted": {"$ne": True}
            },
            {"_id": 1}
        )
    )

    workspace_ids = [str(ws["_id"]) for ws in workspaces]

    # Workspace count
    workspace_count = len(workspace_ids)

    # Count datasets belonging to those workspaces
    dataset_count = datasets_collection.count_documents({
        "workspace_id": {"$in": workspace_ids}
    })

    # Count reports
    chart_count = reports_collection.count_documents({
        "workspace_id": {"$in": workspace_ids}
    })

    # Count dashboards
    dashboard_count = dashboards_collection.count_documents({
        "workspace_id": {"$in": workspace_ids}
    })

    return jsonify({
        "workspaces": workspace_count,
        "datasets": dataset_count,
        "charts": chart_count,
        "dashboards": dashboard_count
    }), 200

@app.route("/api/workspaces/recent", methods=["GET"])
@jwt_required()
def get_recent_workspaces():
    try:

        user_id = get_jwt_identity()

        cursor = workspaces_collection.find(
            {
                "$or": [
                    {"owner_id": user_id},
                    {"members.user_id": user_id}
                ],
                "is_deleted": {"$ne": True}
            },
            {
                "_id": 1,
                "name": 1,
                "description": 1,
                "updated_at": 1,
                "created_at": 1
            }
        )

        workspaces = list(cursor)

        # Normalize fields
        for ws in workspaces:

            ws["_id"] = str(ws["_id"])

            # if updated_at missing, use created_at
            if not ws.get("updated_at"):
                ws["updated_at"] = ws.get("created_at")

        # Sort by updated_at descending
        workspaces.sort(
            key=lambda x: x.get("updated_at", ""),
            reverse=True
        )

        # Only return latest 5
        workspaces = workspaces[:5]

        return jsonify(workspaces), 200

    except Exception as e:
        logger.error(str(e))
        return jsonify({"error": "FAILED_TO_FETCH_RECENT_WORKSPACES"}), 500
       

@app.route('/api/auth/request-otp', methods=['POST'])
def request_otp():
    try:
        data = request.get_json(silent=True) or {}


        print("REQUEST DATA:", data)   # 👈 ADD THIS LINE
        
        identifier = (data.get("identifier") or "").strip()

        if not identifier:
            return jsonify({"error": "IDENTIFIER_REQUIRED"}), 400

        identifier = identifier.lower()

        # Email / Mobile Validation
        is_email = "@" in identifier

        if is_email:
            if "." not in identifier.split("@")[-1]:
                return jsonify({"error": "INVALID_EMAIL"}), 400
        else:
            # Allow 10-digit Indian numbers and auto-convert
            if identifier.isdigit() and len(identifier) == 10:
                identifier = "+91" + identifier

            # Validate final format must be E.164
            if not identifier.startswith("+") or not identifier[1:].isdigit():
                return jsonify({"error": "INVALID_MOBILE_FORMAT"}), 400

        # Rate Limiting (Max 3 per 10 min)
        recent_count = otp_collection.count_documents({
            "identifier": identifier,
            "created_at": {
                "$gte":datetime.now(timezone.utc) - timedelta(minutes=10)
            }
        })

        if recent_count >= 3:
            return jsonify({
                "error": "OTP_RATE_LIMIT",
                "message": "Too many OTP requests. Try again later."
            }), 429

        # Remove old OTPs
        otp_collection.delete_many({
            "identifier": identifier
        })

        # Generate OTP
        otp = generate_otp()
        otp_hash = hash_otp(otp)

        otp_collection.insert_one({
            "identifier": identifier,
            "otp_hash": otp_hash,
            "expires_at":datetime.now(timezone.utc) + timedelta(minutes=5),
            "attempts": 0,
            "created_at":datetime.now(timezone.utc)
        })

        # Send OTP
        try:
            if not is_email:
                send_sms_otp(identifier, otp)
            else:
                send_email_otp(identifier, otp)

        except Exception as sms_error:
            logger.error(f"SMS sending failed: {sms_error}")
            return jsonify({
                "error": "SMS_SEND_FAILED"
            }), 500

        return jsonify({
            "message": "OTP sent successfully",
            "masked": mask_identifier(identifier)
        }), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "OTP_REQUEST_FAILED"
        }), 500

@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    try:
        # ================= READ REQUEST =================
        data = request.get_json(silent=True) or {}
        identifier = (data.get("identifier") or "").strip().lower()
        otp = (data.get("otp") or "").strip()

        # ================= BASIC VALIDATION =================
        if not identifier or not otp:
            return jsonify({"error": "INVALID_REQUEST"}), 400

        # ================= NORMALIZE IDENTIFIER =================
        is_email = "@" in identifier

        if not is_email:
            if identifier.isdigit() and len(identifier) == 10:
                identifier = "+91" + identifier

        # ================= GET CLIENT INFO =================
        ip = request.remote_addr
        location = get_geo_location(ip)

        # ================= FETCH USER =================
        user = users_collection.find_one({
            "$or": [{"email": identifier}, {"mobile": identifier}]
        })


        # ================= IP BLOCK CHECK =================
        if is_ip_blocked(ip):
            logger.warning(f"Blocked IP {ip} attempted OTP verification")
            return jsonify({
                "error": "IP_BLOCKED",
                "message": "Too many failed attempts. Try again later."
            }), 403

        # ================= FETCH LATEST OTP =================
        record = otp_collection.find_one(
            {"identifier": identifier},
            sort=[("created_at", -1)]
        )

        if not record:
            return jsonify({"error": "OTP_NOT_FOUND"}), 400

        # ================= CHECK EXPIRY =================
        expires_at = ensure_utc(record["expires_at"])

        if expires_at < datetime.now(timezone.utc):
            otp_collection.delete_many({"identifier": identifier})
            return jsonify({"error": "OTP_EXPIRED"}), 400

        # ================= ATTEMPT LIMIT =================
        if record.get("attempts", 0) >= 5:
            otp_collection.delete_many({"identifier": identifier})
            record_ip_failure(ip)

            security_events_collection.insert_one({
                "user_id": str(user["_id"]) if user else None,
                "event_type": "LOGIN_LOCKED_TOO_MANY_ATTEMPTS",
                "ip": ip,
                "device_fingerprint": get_device_fingerprint(),
                "created_at":datetime.now(timezone.utc)
            })

            return jsonify({"error": "TOO_MANY_ATTEMPTS"}), 403

        # 🧱 STEP 2 — Add Lock Check at TOP of verify_otp
        # ================= ACCOUNT LOCK CHECK =================
        if user and user.get("locked_until"):
            locked_until = ensure_utc(user["locked_until"])

            if locked_until > datetime.now(timezone.utc):
                remaining = int((locked_until - datetime.now(timezone.utc)).total_seconds())
                return jsonify({
                    "error": "ACCOUNT_LOCKED",
                    "message": f"Account locked. Try again in {remaining} seconds."
                }), 403
            else:
                # Lock expired → clear it
                users_collection.update_one(
                    {"_id": user["_id"]},
                    {"$unset": {"locked_until": ""}}
                )

        # ================= VERIFY OTP =================
        if hash_otp(otp) != record["otp_hash"]:

            # Increment attempt count
            otp_collection.update_one(
                {"_id": record["_id"]},
                {"$inc": {"attempts": 1}}
            )

            updated_record = otp_collection.find_one({"_id": record["_id"]})
            attempts = updated_record.get("attempts", 0)

            record_ip_failure(ip)

            if user:
                prefs = user.get("preferences", {})
                notifications_prefs = prefs.get("notifications", {})
                security_prefs = prefs.get("security", {})

                master_enabled = notifications_prefs.get("securityAlerts", True)
                wrong_otp_enabled = security_prefs.get("wrongOtpAlert", True)

                # ⚠️ 3rd attempt warning
                if master_enabled and wrong_otp_enabled and attempts == 3:
                    send_notification(
                        user,
                        subject="Multiple Wrong OTP Attempts",
                        message="There have been 3 failed OTP attempts on your Nutmeg BI account. If this wasn't you, please secure your account immediately.",
                        sms_message="Nutmeg BI: 3 failed OTP attempts detected.",
                        category="security"
                    )

                # 🔒 5th attempt → LOCK ACCOUNT
                if attempts == 5:
                    lock_until =datetime.now(timezone.utc) + timedelta(minutes=5)

                    users_collection.update_one(
                        {"_id": user["_id"]},
                        {"$set": {"locked_until": lock_until}}
                    )

                    # Respect master security toggle
                    prefs = user.get("preferences", {})
                    notifications_prefs = prefs.get("notifications", {})
                    master_enabled = notifications_prefs.get("securityAlerts", True)

                    if master_enabled:
                        send_notification(
                            user,
                            subject="Account Locked",
                            message="Your account has been locked for 5 minutes due to multiple failed OTP attempts.",
                            sms_message="Nutmeg BI: Account locked for 5 minutes.",
                            category="security"
                        )

                    return jsonify({
                        "error": "ACCOUNT_LOCKED",
                        "message": "Account locked for 5 minutes."
                    }), 403

            return jsonify({"error": "INVALID_OTP"}), 400

        # ================= OTP SUCCESS =================
        # 🧹 STEP 4 — Clear Attempts on Success
        otp_collection.delete_many({"identifier": identifier})
        reset_ip_failures(ip)

        # Reset lock and attempts
        if user:
            users_collection.update_one(
                {"_id": user["_id"]},
                {"$unset": {"locked_until": ""}}
            )

        # ================= CHECK USER =================
        user = users_collection.find_one({
            "$or": [{"email": identifier}, {"mobile": identifier}]
        })

        is_new_user = False

        if not user:
            is_new_user = True

            # Determine default delivery channel based on registration method
            delivery_default = "email" if "@" in identifier else "sms"

            user_doc = {
                "email": identifier if "@" in identifier else None,
                "mobile": identifier if "@" not in identifier else None,
                "email_verified": True if "@" in identifier else False,
                "mobile_verified": True if "@" not in identifier else False,
                "name": None,
                "company": None,
                "dob": None,
                "jobTitle": None,
                "bio": None,
                "profile_image": None,
                "preferences": {
                    "notifications": {
                        "securityAlerts": True,
                        "subscriptionAlerts": True,
                        "paymentAlerts": True,
                        "deliveryChannel": delivery_default
                    },
                    "security": {
                        "monitorNewLogin": True,
                        "suspiciousActivity": True,
                        "wrongOtpAlert": True,
                        # deliveryChannel removed from security as per architecture
                    }
                },
                "role": "user",
                "created_at":datetime.now(timezone.utc),
                "updated_at":datetime.now(timezone.utc)
            }

            result = users_collection.insert_one(user_doc)
            user_id = str(result.inserted_id)

            # Reload full user document
            user = users_collection.find_one({"_id": result.inserted_id})

            # Send welcome notification
            send_notification(
                user,
                subject="Welcome to Nutmeg BI 🎉",
                message=f"""
Hi,

Thank you for registering with Nutmeg BI Analytics.

Registered Email: {user.get('email')}
Registered Mobile: {user.get('mobile')}

– Nutmeg BI Team
""",
                sms_message="Welcome to Nutmeg BI! Registration successful.",
                category="notifications"
            )

            # Create system workspaces
            ensure_system_workspaces(user_id, user.get("email"))

        else:
            user_id = str(user["_id"])

        # ================= LOAD SECURITY PREFS =================
        security_prefs = user.get("preferences", {}).get("security", {})

        # ================= DEVICE CHECK =================
        device_is_new = is_new_device(user_id)
        device_fingerprint = get_device_fingerprint()

        # ================= LOG SECURITY EVENT =================
        security_events_collection.insert_one({
            "user_id": user_id,
            "event_type": "LOGIN_SUCCESS",
            "ip": ip,
            "device_fingerprint": device_fingerprint,
            "created_at":datetime.now(timezone.utc)
        })

        # ================= SUSPICIOUS ACTIVITY =================
        notifications_prefs = user.get("preferences", {}).get("notifications", {})
        master_enabled = notifications_prefs.get("securityAlerts", True)

        if master_enabled and security_prefs.get("suspiciousActivity", True):
            risk = evaluate_suspicious_activity(user_id, ip, device_fingerprint)
            if risk:
                send_notification(
                    user,
                    subject="Suspicious Activity Detected",
                    message=f"Security anomaly detected: {risk}. Please review your account activity.",
                    sms_message="Nutmeg BI: Suspicious activity detected.",
                    category="security"
                )

        # ================= MARK OLD SESSIONS INACTIVE =================
        mark_old_sessions_inactive(user_id)

        # ================= CREATE NEW SESSION =================
        session_id = str(uuid.uuid4())
        sessions_collection.insert_one({
            "_id": session_id,
            "user_id": user_id,
            "device": request.headers.get("User-Agent", "Unknown"),
            "ip": ip,
            "location": location, 
            "device_fingerprint": device_fingerprint,
            "is_current": True,
            "created_at":datetime.now(timezone.utc),
            "last_active":datetime.now(timezone.utc)
        })

        # ================= GENERATE JWT =================
        token = create_access_token(identity=user_id)

        # ================= NEW DEVICE ALERT =================
        notifications_prefs = user.get("preferences", {}).get("notifications", {})
        master_enabled = notifications_prefs.get("securityAlerts", True)

        if (
            device_is_new
            and not is_new_user
            and master_enabled
            and security_prefs.get("monitorNewLogin", True)
        ):
            send_notification(
                user,
                subject="New Device Login Alert",
                message="A new device login was detected in your Nutmeg BI account.",
                sms_message="Nutmeg BI: New device login detected.",
                category="security"
            )

        return jsonify({
            "token": token,
            "isNewUser": is_new_user
        }), 200

    except Exception as e:
        import traceback
        print("VERIFY OTP ERROR:")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    try:
        jwt_data = get_jwt()
        jti = jwt_data["jti"]
        exp_timestamp = jwt_data["exp"]

        # Blacklist the token
        token_blacklist_collection.insert_one({
            "jti": jti,
            "expires_at": datetime.fromtimestamp(exp_timestamp, timezone.utc),
            "created_at":datetime.now(timezone.utc)
        })

        # Mark current session as inactive
        user_id = get_jwt_identity()
        sessions_collection.update_many(
            {"user_id": user_id, "is_current": True},
            {"$set": {"is_current": False}}
        )

        return jsonify({"message": "Logged out successfully"}), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "LOGOUT_FAILED"}), 500

@app.route('/api/auth/request-profile-otp', methods=['POST'])
@jwt_required()
def request_profile_otp():
    try:
        user_id = get_jwt_identity()
        data = request.json or {}

        otp_type = data.get("type")
        value = (data.get("value") or "").strip()

        if otp_type not in ["email", "mobile"]:
            return jsonify({"error": "INVALID_TYPE"}), 400

        if not value:
            return jsonify({"error": "VALUE_REQUIRED"}), 400

        # EMAIL VALIDATION
        if otp_type == "email":
            value = value.lower()

            if "@" not in value or "." not in value.split("@")[-1]:
                return jsonify({"error": "INVALID_EMAIL"}), 400

            existing = users_collection.find_one({
                "email": value,
                "_id": {"$ne": ObjectId(user_id)}
            })
            if existing:
                return jsonify({"error": "EMAIL_ALREADY_USED"}), 400

        # MOBILE VALIDATION (E.164 REQUIRED)
        if otp_type == "mobile":
            if not value.startswith("+") or not value[1:].isdigit():
                return jsonify({"error": "INVALID_MOBILE_FORMAT"}), 400

            existing = users_collection.find_one({
                "mobile": value,
                "_id": {"$ne": ObjectId(user_id)}
            })
            if existing:
                return jsonify({"error": "MOBILE_ALREADY_USED"}), 400

        # GENERATE OTP
        otp = generate_otp()
        otp_hash = hash_otp(otp)

        # Remove previous unused OTP for same type
        otp_collection.delete_many({
            "user_id": user_id,
            "type": otp_type
        })

        otp_collection.insert_one({
            "user_id": user_id,
            "type": otp_type,
            "value": value,
            "otp_hash": otp_hash,
            "expires_at":datetime.now(timezone.utc) + timedelta(minutes=5),
            "attempts": 0,
            "created_at":datetime.now(timezone.utc)
        })

        # SEND OTP
        try:
            if otp_type == "mobile":
                send_sms_otp(value, otp)
            else:
                send_email_otp(value, otp)

        except Exception as sms_error:
            logger.error(f"Profile OTP send failed: {sms_error}")
            return jsonify({"error": "OTP_SEND_FAILED"}), 500

        return jsonify({
            "message": "OTP sent successfully"
        }), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "PROFILE_OTP_REQUEST_FAILED"}), 500

@app.route('/api/auth/verify-profile-otp', methods=['POST'])
@jwt_required()
def verify_profile_otp():
    try:
        user_id = get_jwt_identity()
        data = request.json or {}

        otp_type = data.get("type")
        value = (data.get("value") or "").strip().lower() if otp_type == "email" else (data.get("value") or "").strip()
        otp = (data.get("otp") or "").strip()

        ip = request.remote_addr
        device_fingerprint = get_device_fingerprint()

        if otp_type not in ["email", "mobile"]:
            return jsonify({"error": "INVALID_TYPE"}), 400

        if not value or not otp:
            return jsonify({"error": "MISSING_DATA"}), 400

        # Find OTP record
        record = otp_collection.find_one({
            "user_id": user_id,
            "type": otp_type,
            "value": value
        })

        if not record:
            return jsonify({"error": "OTP_NOT_FOUND"}), 400

        # Check expiry
        expires_at = ensure_utc(record["expires_at"])

        if expires_at < datetime.now(timezone.utc):
            otp_collection.delete_one({"_id": record["_id"]})
            return jsonify({"error": "OTP_EXPIRED"}), 400

        # Check attempts
        if record.get("attempts", 0) >= 5:
            return jsonify({"error": "TOO_MANY_ATTEMPTS"}), 403

        # Validate OTP
        if hash_otp(otp) != record["otp_hash"]:

            otp_collection.update_one(
                {"_id": record["_id"]},
                {"$inc": {"attempts": 1}}
            )

            # ✅ Log FAILED_OTP
            security_events_collection.insert_one({
                "user_id": user_id,
                "event_type": "FAILED_OTP",
                "ip": ip,
                "device_fingerprint": device_fingerprint,
                "created_at":datetime.now(timezone.utc),
                "metadata": {
                    "type": otp_type,
                    "value": value,
                    "attempt_number": record.get("attempts", 0) + 1
                }
            })

            return jsonify({"error": "INVALID_OTP"}), 400

        # Fetch existing user
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "USER_NOT_FOUND"}), 404

        old_value = user.get(otp_type)

        # Update user field
        update_fields = {
            otp_type: value,
            f"{otp_type}_verified": True,
            "updated_at":datetime.now(timezone.utc)
        }

        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_fields}
        )

        # ✅ Log EMAIL_CHANGED only if email updated
        if otp_type == "email":
            security_events_collection.insert_one({
                "user_id": user_id,
                "event_type": "EMAIL_CHANGED",
                "ip": ip,
                "device_fingerprint": device_fingerprint,
                "created_at":datetime.now(timezone.utc),
                "metadata": {
                    "old_email": old_value,
                    "new_email": value
                }
            })

        # Insert audit log
        audit_logs_collection.insert_one({
            "user_id": user_id,
            "action": f"{otp_type}_change",
            "old_value": old_value,
            "new_value": value,
            "timestamp":datetime.now(timezone.utc),
            "ip_address": ip,
            "user_agent": request.headers.get("User-Agent")
        })

        # Delete OTP record
        otp_collection.delete_one({"_id": record["_id"]})

        # Auto-upgrade delivery channels to "both" if both verified
        updated_user = users_collection.find_one({"_id": ObjectId(user_id)})

        if updated_user.get("email_verified") and updated_user.get("mobile_verified"):
            current_notif_channel = updated_user.get("preferences", {}).get("notifications", {}).get("deliveryChannel")
            current_sec_channel = updated_user.get("preferences", {}).get("security", {}).get("deliveryChannel")

            if current_notif_channel in ["email", "sms"]:
                users_collection.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$set": {"preferences.notifications.deliveryChannel": "both"}}
                )

            if current_sec_channel in ["email", "sms"]:
                users_collection.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$set": {"preferences.security.deliveryChannel": "both"}}
                )

        # Send profile update notification
        try:
            send_notification(
                updated_user,
                subject="Profile Updated",
                message=f"Your {otp_type} was successfully updated in your Nutmeg BI account.",
                sms_message="Nutmeg BI: Your profile was updated.",
                category="notifications"
            )
        except Exception:
            logger.warning("Profile update notification failed")

        # Force logout if email changed
        if otp_type == "email":
            jwt_data = get_jwt()
            jti = jwt_data["jti"]
            exp_timestamp = jwt_data["exp"]

            token_blacklist_collection.insert_one({
                "jti": jti,
                "expires_at": datetime.fromtimestamp(exp_timestamp, timezone.utc),
                "created_at":datetime.now(timezone.utc)
            })

            sessions_collection.update_many(
                {"user_id": user_id},
                {"$set": {"is_current": False}}
            )

            return jsonify({
                "message": "EMAIL_CHANGED_RELOGIN_REQUIRED"
            }), 200

        return jsonify({"message": "Verified successfully"}), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "PROFILE_OTP_VERIFY_FAILED"}), 500

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        user_id = get_user_id()
        user = users_collection.find_one({'_id': ObjectId(user_id)})
        
        if not user:
            return jsonify({
                'error': 'User not found',
                'code': 'USER_NOT_FOUND'
            }), 404
        
        # Get user's workspaces (excluding deleted ones)
        workspaces = list(workspaces_collection.find({
            "is_deleted": {"$ne": True},
            '$or': [
                {'owner_id': user_id},
                {'members.user_id': user_id}
            ]
        }))
        
        # Get active sessions count
        active_sessions = sessions_collection.count_documents({
            "user_id": user_id,
            "is_current": True
        })
        
        # Check if IP is blocked (for display)
        ip_blocked = is_ip_blocked(request.remote_addr)
        
        return jsonify({
            'id': user_id,
            'email': user.get('email'),
            'mobile': user.get('mobile'),
            'email_verified': user.get('email_verified', False),
            'mobile_verified': user.get('mobile_verified', False),
            'name': user.get('name'),
            'company': user.get('company'),
            'dob': user.get('dob'),
            'jobTitle': user.get('jobTitle'),
            'bio': user.get('bio'),
            'role': user.get('role', 'user'),
            'profile_image': user.get('profile_image'),
            'preferences': user.get('preferences', {
                "notifications": {
                    "securityAlerts": True,
                    "subscriptionAlerts": True,
                    "paymentAlerts": True,
                    "deliveryChannel": "both"
                },
                "security": {
                    "monitorNewLogin": True,
                    "suspiciousActivity": True,
                    "wrongOtpAlert": True,
                    "deliveryChannel": "both"
                }
            }),
            'active_sessions': active_sessions,
            'ip_blocked': ip_blocked,
            'workspaces': [{
                'id': str(w['_id']),
                'key': w.get('key'),
                'name': w['name'],
                'type': w.get('type', 'general'),
                'role': 'owner' if w['owner_id'] == user_id else 'member',
                'icon': w.get('icon', 'Settings'),
                'color': w.get('color', '#4f46e5'),
                'isGeneral': w.get('type') == 'general',
                'isSystem': w.get('is_system', False)
            } for w in workspaces]
        }), 200
        
    except Exception as e:
        logger.error(f"Get current user error: {e}")
        return jsonify({
            'error': 'Failed to get user information',
            'code': 'USER_INFO_ERROR'
        }), 500

@app.route('/profile_uploads/<path:filename>')
def serve_profile_image(filename):
    return send_from_directory(
        app.config['PROFILE_UPLOAD_FOLDER'],
        filename
    )

@app.route('/api/auth/update-profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = get_jwt_identity()
        data = request.json or {}

        # ================= LOAD EXISTING USER =================
        existing_user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not existing_user:
            return jsonify({"error": "USER_NOT_FOUND"}), 404

        ip = request.remote_addr
        device = request.headers.get("User-Agent", "Unknown")

        changed_fields = {}
        sensitive_fields_changed = False

        update_fields = {
            "updated_at":datetime.now(timezone.utc)
        }

        # ================= BASIC PROFILE FIELDS =================
        allowed_fields = [
            "name",
            "company",
            "dob",
            "jobTitle",
            "bio",
            "profile_image"
        ]

        for field in allowed_fields:
            if field in data:
                old_value = existing_user.get(field)
                new_value = data[field]

                if old_value != new_value:
                    changed_fields[field] = {
                        "old": old_value,
                        "new": new_value
                    }

                update_fields[field] = new_value

        # ================= DEEP MERGE PREFERENCES =================
        if "preferences" in data:
            existing_preferences = existing_user.get("preferences", {})

            existing_notifications = existing_preferences.get("notifications", {})
            new_notifications = data["preferences"].get("notifications", {})

            merged_notifications = {
                **existing_notifications,
                **new_notifications
            }

            existing_security = existing_preferences.get("security", {})
            new_security = data["preferences"].get("security", {})

            merged_security = {
                **existing_security,
                **new_security
            }

            # ================= DELIVERY CHANNEL VALIDATION =================
            email_verified = existing_user.get("email_verified", False)
            mobile_verified = existing_user.get("mobile_verified", False)

            notif_channel = merged_notifications.get("deliveryChannel")
            sec_channel = merged_security.get("deliveryChannel")

            if notif_channel and not validate_delivery_channel(notif_channel, email_verified, mobile_verified):
                return jsonify({"error": "INVALID_NOTIFICATION_CHANNEL"}), 400

            if sec_channel and not validate_delivery_channel(sec_channel, email_verified, mobile_verified):
                return jsonify({"error": "INVALID_SECURITY_CHANNEL"}), 400

            merged_preferences = {
                **existing_preferences,
                **data["preferences"],
                "notifications": merged_notifications,
                "security": merged_security
            }

            update_fields["preferences"] = merged_preferences

            changed_fields["preferences"] = {
                "old": "Previous settings",
                "new": "Updated settings"
            }

        # ================= SENSITIVE FIELD CHECK =================
        sensitive_fields = ["email", "mobile"]

        for field in sensitive_fields:
            if field in changed_fields:
                sensitive_fields_changed = True

        # ================= UPDATE DATABASE =================
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_fields}
        )

        # Reload updated user
        updated_user = users_collection.find_one({"_id": ObjectId(user_id)})

        # ================= BUILD CHANGE SUMMARY =================
        change_summary = ""
        for field, values in changed_fields.items():
            change_summary += f"{field}: {values['old']} → {values['new']}\n"

        # ================= SEND SECURITY NOTIFICATION =================
        send_notification(
            updated_user,
            subject="Profile Updated Successfully",
            message=f"""
Hi {updated_user.get('name') or ''},

Your profile has been updated.

Changed Fields:
{change_summary if change_summary else "No major fields changed."}

Updated From:
IP Address: {ip}
Device: {device}
Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC

If you did not perform this change, secure your account immediately.

– Nutmeg BI Security Team
""",
            sms_message="Your Nutmeg BI profile was updated.",
            category="security"
        )

        # ================= FORCE LOGOUT IF SENSITIVE CHANGE =================
        if sensitive_fields_changed:
            jwt_data = get_jwt()
            jti = jwt_data["jti"]
            exp_timestamp = jwt_data["exp"]

            token_blacklist_collection.insert_one({
                "jti": jti,
                "expires_at": datetime.fromtimestamp(exp_timestamp, timezone.utc),
                "created_at":datetime.now(timezone.utc)
            })

            sessions_collection.update_many(
                {"user_id": user_id},
                {"$set": {"is_current": False}}
            )

            return jsonify({
                "message": "Sensitive information changed. Please login again."
            }), 200

        return jsonify({
            "message": "Profile updated successfully"
        }), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "PROFILE_UPDATE_FAILED"
        }), 500
    
@app.route('/api/auth/upload-profile', methods=['POST'])
@jwt_required()
def upload_profile_image():
    try:
        user_id = get_jwt_identity()

        if 'file' not in request.files:
            return jsonify({"error": "NO_FILE"}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({"error": "NO_FILE_SELECTED"}), 400

        allowed_extensions = {'png', 'jpg', 'jpeg', 'webp'}

        ext = file.filename.rsplit('.', 1)[-1].lower()
        if ext not in allowed_extensions:
            return jsonify({"error": "INVALID_FILE_TYPE"}), 400

        filename = f"{user_id}.{ext}"
        filepath = os.path.join(app.config['PROFILE_UPLOAD_FOLDER'], filename)

        os.makedirs(app.config['PROFILE_UPLOAD_FOLDER'], exist_ok=True)

        file.save(filepath)

        image_url = f"/profile_uploads/{filename}"

        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"profile_image": image_url}}
        )

        return jsonify({
            "message": "Profile image updated",
            "profile_image": image_url
        }), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "PROFILE_UPLOAD_FAILED"}), 500

# =============================================================================
# SECURITY SESSIONS ROUTES
# =============================================================================

@app.route("/api/auth/request-security-otp", methods=["POST"])
@jwt_required()
def request_security_otp():
    try:
        user_id = get_jwt_identity()
        data = request.json or {}
        channels = data.get("channels", [])
        ip = request.remote_addr

        if is_ip_blocked(ip):
            return jsonify({"error": "IP_BLOCKED"}), 403

        if not channels or not isinstance(channels, list):
            return jsonify({"error": "INVALID_CHANNELS"}), 400

        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "USER_NOT_FOUND"}), 404

        email_verified = user.get("email_verified", False)
        mobile_verified = user.get("mobile_verified", False)

        # HARD BACKEND VALIDATION
        for channel in channels:
            if channel == "email" and not email_verified:
                return jsonify({"error": "EMAIL_NOT_VERIFIED"}), 400
            if channel == "sms" and not mobile_verified:
                return jsonify({"error": "MOBILE_NOT_VERIFIED"}), 400
            if channel not in ["email", "sms"]:
                return jsonify({"error": "INVALID_CHANNEL"}), 400

        # Rate limit per user
        recent_count = otp_collection.count_documents({
            "user_id": user_id,
            "purpose": "SECURITY_UPDATE",
            "created_at": {"$gte":datetime.now(timezone.utc) - timedelta(minutes=10)}
        })

        if recent_count >= 3:
            return jsonify({"error": "OTP_RATE_LIMIT"}), 429

        # Remove previous security OTPs
        otp_collection.delete_many({
            "user_id": user_id,
            "purpose": "SECURITY_UPDATE"
        })

        otp = generate_otp()
        otp_hash = hash_otp(otp)

        otp_collection.insert_one({
            "user_id": user_id,
            "purpose": "SECURITY_UPDATE",
            "otp_hash": otp_hash,
            "channels": channels,
            "attempts": 0,
            "expires_at":datetime.now(timezone.utc) + timedelta(minutes=5),
            "created_at":datetime.now(timezone.utc)
        })

        # SEND SAME OTP TO ALL CHANNELS
        if "email" in channels:
            send_email_otp(user["email"], otp)

        if "sms" in channels:
            send_sms_otp(user["mobile"], otp)

        return jsonify({"message": "OTP_SENT"}), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "SECURITY_OTP_FAILED"}), 500
    
@app.route("/api/auth/verify-security-otp", methods=["POST"])
@jwt_required()
def verify_security_otp():
    try:
        user_id = get_jwt_identity()
        data = request.json or {}
        otp = data.get("otp", "").strip()
        ip = request.remote_addr

        if not otp:
            return jsonify({"error": "OTP_REQUIRED"}), 400

        if is_ip_blocked(ip):
            return jsonify({"error": "IP_BLOCKED"}), 403

        record = otp_collection.find_one({
            "user_id": user_id,
            "purpose": "SECURITY_UPDATE"
        }, sort=[("created_at", -1)])

        if not record:
            return jsonify({"error": "OTP_NOT_FOUND"}), 400

        expires_at = ensure_utc(record["expires_at"])

        if expires_at < datetime.now(timezone.utc):
            otp_collection.delete_one({"_id": record["_id"]})
            return jsonify({"error": "OTP_EXPIRED"}), 400

        if record.get("attempts", 0) >= 5:
            record_ip_failure(ip)
            otp_collection.delete_one({"_id": record["_id"]})
            return jsonify({"error": "TOO_MANY_ATTEMPTS"}), 403

        if hash_otp(otp) != record["otp_hash"]:
            otp_collection.update_one(
                {"_id": record["_id"]},
                {"$inc": {"attempts": 1}}
            )
            record_ip_failure(ip)
            return jsonify({"error": "INVALID_OTP"}), 400

        # SUCCESS
        otp_collection.delete_one({"_id": record["_id"]})
        reset_ip_failures(ip)

        security_events_collection.insert_one({
            "user_id": user_id,
            "event_type": "SECURITY_SETTINGS_VERIFIED",
            "ip": ip,
            "device_fingerprint": get_device_fingerprint(),
            "created_at":datetime.now(timezone.utc)
        })

        return jsonify({"message": "OTP_VERIFIED"}), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "VERIFY_SECURITY_OTP_FAILED"}), 500


@app.route("/api/security/sessions", methods=["GET"])
@jwt_required()
def get_sessions():
    try:
        user_id = get_jwt_identity()

        sessions = list(
            sessions_collection.find({"user_id": user_id})
            .sort("last_active", -1)
        )

        return jsonify([
            {
                "id": s["_id"],
                "device": s.get("device"),
                "ip": s.get("ip"),
                "location": s.get("location", "Unknown"),
                "last_active": s.get("last_active").isoformat(),
                "is_current": s.get("is_current", False),
                "created_at": s.get("created_at").isoformat()
            }
            for s in sessions
        ]), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "SESSIONS_FETCH_FAILED"}), 500

@app.route("/api/security/sessions/<session_id>", methods=["DELETE"])
@jwt_required()
def revoke_session(session_id):
    try:
        user_id = get_jwt_identity()
        ip = request.remote_addr
        device_fingerprint = get_device_fingerprint()

        # Delete session belonging to user
        result = sessions_collection.delete_one({
            "_id": session_id,
            "user_id": user_id
        })

        if result.deleted_count == 0:
            return jsonify({"error": "SESSION_NOT_FOUND"}), 404

        # ✅ Log security event
        security_events_collection.insert_one({
            "user_id": user_id,
            "event_type": "SESSION_REVOKED",
            "ip": ip,
            "device_fingerprint": device_fingerprint,
            "created_at":datetime.now(timezone.utc),
            "metadata": {
                "session_id": session_id
            }
        })

        return jsonify({"message": "Session revoked"}), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "SESSION_REVOKE_FAILED"}), 500

@app.route("/api/security/sessions", methods=["DELETE"])
@jwt_required()
def revoke_all_sessions():
    try:
        user_id = get_jwt_identity()

        result = sessions_collection.delete_many({
            "user_id": user_id,
            "is_current": {"$ne": True}
        })

        return jsonify({
            "message": f"All other sessions revoked",
            "count": result.deleted_count
        }), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "SESSIONS_REVOKE_FAILED"}), 500

# =============================================================================
# WORKSPACE ROUTES
# =============================================================================

@app.route('/api/workspaces', methods=['GET'])
@jwt_required()
def get_workspaces():
    try:
        user_id = get_user_id()
        
        workspaces = list(workspaces_collection.find({
            "is_deleted": {"$ne": True},
            '$or': [
                {'owner_id': user_id},
                {'members.user_id': user_id}
            ]
        }).sort([('is_system', -1), ('type', 1), ('name', 1)]))
        
        workspaces_data = []
        for workspace in workspaces:
            datasets_count = datasets_collection.count_documents({
                'workspace_id': str(workspace['_id'])
            })
            
            workspace_type = workspace.get('type', 'custom')
            
            workspaces_data.append({
                'id': str(workspace['_id']),
                'key': workspace.get('key'),
                'name': workspace['name'],
                'description': workspace.get('description', ''),
                'type': workspace_type,
                'icon': workspace.get('icon', 'Settings'),
                'color': workspace.get('color', '#4f46e5'),
                'owner_id': workspace['owner_id'],
                'created_at': workspace['created_at'].isoformat() if hasattr(workspace['created_at'], 'isoformat') else workspace['created_at'],
                'isGeneral': workspace_type == 'general',
                'isDefault': workspace_type == 'default',
                'isCustom': workspace_type == 'custom',
                'isSystem': workspace.get('is_system', False),
                'stats': {
                    'datasets': datasets_count,
                    'members': len(workspace.get('members', []))
                },
                'member_count': len(workspace.get('members', [])),
                'role': 'owner' if workspace['owner_id'] == user_id else 'member'
            })
        
        return jsonify(workspaces_data), 200
        
    except Exception as e:
        logger.error(f"Get workspaces error: {e}")
        return jsonify({
            'error': 'Failed to get workspaces',
            'code': 'WORKSPACES_ERROR'
        }), 500

@app.route('/api/workspaces', methods=['POST'])
@jwt_required()
def create_workspace():
    try:
        user_id = get_user_id()
        data = request.json
        
        if not data.get('name'):
            return jsonify({
                'error': 'Workspace name is required',
                'code': 'VALIDATION_ERROR'
            }), 400
        
        # Duplicate Name Check
        existing = workspaces_collection.find_one({
            "owner_id": user_id,
            "name": data["name"],
            "is_deleted": {"$ne": True}
        })

        if existing:
            return jsonify({
                "error": "Workspace name already exists",
                "code": "DUPLICATE_WORKSPACE"
            }), 400
        
        user = users_collection.find_one({'_id': ObjectId(user_id)})
        if not user:
            return jsonify({
                'error': 'User not found',
                'code': 'USER_NOT_FOUND'
            }), 404
        
        workspace = {
            'name': data['name'],
            'description': data.get('description', ''),
            'icon': data.get('icon', 'Settings'),
            'color': data.get('color', '#4f46e5'),
            'type': 'custom',
            'is_system': False,
            'is_deleted': False,
            'owner_id': user_id,
            'created_at':datetime.now(timezone.utc),
            'updated_at':datetime.now(timezone.utc),
            'members': [{
                'user_id': user_id,
                'email': user['email'],
                'role': 'owner',
                'joined_at':datetime.now(timezone.utc)
            }],
            'stats': {
                'datasets': 0,
                'members': 1
            },
            'settings': data.get('settings', {})
        }
        
        result = workspaces_collection.insert_one(workspace)
        workspace_id = str(result.inserted_id)

        # Send workspace creation notification
        try:
            send_notification(
                user,
                subject="Workspace Created",
                message=f"Workspace '{workspace['name']}' created successfully in your Nutmeg BI account.",
                sms_message=f"Nutmeg BI: Workspace created.",
                category="notifications"
            )
        except Exception:
            logger.warning("Workspace creation notification failed")
        
        return jsonify({
            'id': workspace_id,
            'name': workspace['name'],
            'description': workspace['description'],
            'type': workspace['type'],
            'icon': workspace['icon'],
            'color': workspace['color'],
            'isGeneral': False,
            'isDefault': False,
            'isCustom': True,
            'isSystem': False,
            'createdAt': workspace['created_at'].isoformat(),
            'message': 'Workspace created successfully'
        }), 201
        
    except Exception as e:
        logger.error(f"Create workspace error: {e}")
        return jsonify({
            'error': 'Failed to create workspace',
            'code': 'WORKSPACE_CREATE_ERROR'
        }), 500

@app.route('/api/workspaces/<workspace_id>', methods=['GET'])
@workspace_access_required
def get_workspace(workspace_id, resolved_workspace_id, workspace_key, workspace_type):
    try:
        workspace = workspaces_collection.find_one({'_id': ObjectId(resolved_workspace_id)})
        
        if not workspace:
            return jsonify({
                'error': 'Workspace not found',
                'code': 'WORKSPACE_NOT_FOUND'
            }), 404
        
        datasets_count = datasets_collection.count_documents({'workspace_id': resolved_workspace_id})
        reports_count = reports_collection.count_documents({'workspace_id': resolved_workspace_id})
        dashboards_count = dashboards_collection.count_documents({'workspace_id': resolved_workspace_id})
        
        workspace_type = workspace.get('type', 'custom')
        
        return jsonify({
            'id': str(workspace['_id']),
            'key': workspace_key,
            'name': workspace['name'],
            'description': workspace.get('description', ''),
            'type': workspace_type,
            'icon': workspace.get('icon', 'Settings'),
            'color': workspace.get('color', '#4f46e5'),
            'owner_id': workspace['owner_id'],
            'created_at': workspace['created_at'].isoformat() if hasattr(workspace['created_at'], 'isoformat') else workspace['created_at'],
            'isGeneral': workspace_type == 'general',
            'isDefault': workspace_type == 'default',
            'isCustom': workspace_type == 'custom',
            'isSystem': workspace.get('is_system', False),
            'settings': workspace.get('settings', {}),
            'config': workspace.get('config', {}),
            'stats': {
                'datasets': datasets_count,
                'reports': reports_count,
                'dashboards': dashboards_count,
                'members': len(workspace.get('members', []))
            },
            'members': workspace.get('members', [])
        }), 200
        
    except Exception as e:
        logger.error(f"Get workspace error: {e}")
        return jsonify({
            'error': 'Failed to get workspace',
            'code': 'WORKSPACE_GET_ERROR'
        }), 500

@app.route('/api/workspaces/<workspace_id>', methods=['PUT'])
@workspace_access_required
def update_workspace(workspace_id, resolved_workspace_id, workspace_key, workspace_type):
    try:
        user_id = get_user_id()
        data = request.json or {}

        workspace = workspaces_collection.find_one({'_id': ObjectId(resolved_workspace_id)})

        if not workspace:
            return jsonify({
                'error': 'Workspace not found',
                'code': 'WORKSPACE_NOT_FOUND'
            }), 404

        # Only owner can update workspace metadata
        if workspace['owner_id'] != user_id:
            return jsonify({
                'error': 'Only workspace owner can update',
                'code': 'NOT_OWNER'
            }), 403

        update_fields = {
            "updated_at":datetime.now(timezone.utc)
        }

        allowed_fields = ["name", "description", "icon", "color"]

        for field in allowed_fields:
            if field in data:
                update_fields[field] = data[field]

        # Prevent duplicate name for same owner
        if "name" in update_fields:
            existing = workspaces_collection.find_one({
                "owner_id": user_id,
                "name": update_fields["name"],
                "_id": {"$ne": ObjectId(resolved_workspace_id)},
                "is_deleted": {"$ne": True}
            })
            if existing:
                return jsonify({
                    "error": "Workspace name already exists",
                    "code": "DUPLICATE_WORKSPACE"
                }), 400

        workspaces_collection.update_one(
            {"_id": ObjectId(resolved_workspace_id)},
            {"$set": update_fields}
        )

        return jsonify({
            "message": "Workspace updated successfully"
        }), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "WORKSPACE_UPDATE_FAILED"
        }), 500

@app.route('/api/workspaces/<workspace_id>', methods=['DELETE'])
@workspace_access_required
def delete_workspace(workspace_id, resolved_workspace_id, workspace_key, workspace_type):
    try:
        workspace = workspaces_collection.find_one({'_id': ObjectId(resolved_workspace_id)})
        
        if not workspace:
            return jsonify({
                'error': 'Workspace not found',
                'code': 'WORKSPACE_NOT_FOUND'
            }), 404
        
        # Check if it's a system workspace (cannot delete)
        if workspace.get('is_system'):
            return jsonify({
                'error': 'System workspaces cannot be deleted',
                'code': 'SYSTEM_WORKSPACE'
            }), 403
        
        # Check if user is the owner
        user_id = get_user_id()
        if workspace['owner_id'] != user_id:
            return jsonify({
                'error': 'Only the workspace owner can delete it',
                'code': 'NOT_OWNER'
            }), 403
        
        # Soft delete workspace instead of hard delete
        workspaces_collection.update_one(
            {"_id": ObjectId(resolved_workspace_id)},
            {
                "$set": {
                    "is_deleted": True,
                    "deleted_at":datetime.now(timezone.utc)
                }
            }
        )
        
        return jsonify({
            'message': 'Workspace deleted successfully',
            'workspace_id': resolved_workspace_id
        }), 200
        
    except Exception as e:
        logger.error(f"Delete workspace error: {e}")
        return jsonify({
            'error': 'Failed to delete workspace',
            'code': 'WORKSPACE_DELETE_ERROR'
        }), 500

# =============================================================================
# DATASET METADATA ROUTES
# =============================================================================

@app.route('/api/datasets/<dataset_id>/metadata', methods=['GET'])
@jwt_required()
def get_dataset_metadata(dataset_id):
    try:
        user_id = get_user_id()

        try:
            df, workspace = get_filtered_dataframe(
                dataset_id,
                user_id,
                max_rows=500
            )
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        column_metadata = {}

        for col in df.columns:
            values = df[col].dropna().head(100).tolist()

            if pd.api.types.is_numeric_dtype(df[col]):
                col_type = "number"
                role = "measure"
            else:
                col_type = "string"
                role = "dimension"

            column_metadata[col] = {
                "type": col_type,
                "role": role,
                "unique_values": len(set(values)),
                "sample_values": values[:5]
            }

        return jsonify(column_metadata), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "METADATA_FAILED"}), 500

# =============================================================================
# DATASET PREVIEW ROUTE
# =============================================================================

@app.route("/api/datasets/<dataset_id>/preview", methods=["GET"])
@jwt_required()
def preview_dataset(dataset_id):
    try:
        user_id = get_jwt_identity()

        df, workspace = get_filtered_dataframe(
            dataset_id,
            user_id,
            max_rows=200
        )

        return jsonify({
            "columns": list(df.columns),  # IMPORTANT
            "rows": df.head(50).to_dict("records"),
            "total_rows": len(df)
        }), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "DATASET_PREVIEW_FAILED"
        }), 500    

# =============================================================================
# VISUALIZATION TEMPLATES ROUTES
# =============================================================================

@app.route("/api/visualization-templates", methods=["GET"])
@jwt_required()
def get_visualization_templates():
    templates = list(templates_collection.find({}))
    return jsonify([
        {
            "id": t["_id"],
            "name": t["name"],
            "chart_type": t["chart_type"],
            "category": t["category"],
            "supports": t.get("supports", {})
        }
        for t in templates
    ]), 200

# =============================================================================
# FILE UPLOAD ROUTES
# =============================================================================

@app.route('/api/upload', methods=['POST'])
@jwt_required()
def upload_file():
    """Upload file to user's workspace"""
    try:
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        os.makedirs("./data", exist_ok=True)

        user_id = get_user_id()

        if 'file' not in request.files:
            return jsonify({'error': 'No file provided', 'code': 'NO_FILE'}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({'error': 'No file selected', 'code': 'NO_FILE_SELECTED'}), 400

        if not allowed_file(file.filename):
            return jsonify({
                'error': 'File type not allowed. Use CSV, XLSX, or JSON',
                'code': 'INVALID_FILE_TYPE'
            }), 400

        filename = secure_filename(file.filename)
        file_id = str(uuid.uuid4())

        workspace_id = request.form.get('workspace_id')

        if not workspace_id or workspace_id in ["undefined", "null", ""]:
            general_workspace = workspaces_collection.find_one({
                "owner_id": user_id,
                "key": "general",
                "is_system": True,
                "is_deleted": {"$ne": True}
            })

            if not general_workspace:
                return jsonify({
                    "error": "No valid workspace found for upload",
                    "code": "NO_WORKSPACE"
                }), 400

            workspace_id = str(general_workspace["_id"])

        workspace = workspaces_collection.find_one({
            '_id': ObjectId(workspace_id),
            "is_deleted": {"$ne": True}
        })

        if not workspace:
            return jsonify({'error': 'Workspace not found', 'code': 'WORKSPACE_NOT_FOUND'}), 404

        # Save uploaded file temporarily
        file_ext = filename.rsplit('.', 1)[1].lower()
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.{file_ext}")
        file.save(temp_path)

        # Read file into DataFrame
        try:
            if file_ext == 'csv':
                df = pd.read_csv(temp_path)
            elif file_ext in ['xlsx', 'xls']:
                df = pd.read_excel(temp_path)
            elif file_ext == 'json':
                df = pd.read_json(temp_path)
            else:
                os.remove(temp_path)
                return jsonify({
                    'error': 'Unsupported file format',
                    'code': 'UNSUPPORTED_FORMAT'
                }), 400

        except Exception as read_error:
            os.remove(temp_path)
            return jsonify({
                'error': f'Error reading file: {str(read_error)}',
                'code': 'FILE_READ_ERROR'
            }), 400


        # ================= DOMAIN VALIDATION =================
        workspace_key = workspace.get("key")

        is_valid, matches = validate_dataset_domain(df, workspace_key)

        if not is_valid:
            os.remove(temp_path)

            return jsonify({
                "error": "DATASET_DOMAIN_MISMATCH",
                "message": f"Dataset does not match '{workspace_key}' workspace domain",
                "matches_found": matches,
                "required_matches": 2
            }), 400
        # =====================================================


        # Save as Parquet
        file_storage_path = f"./data/{file_id}.parquet"
        df.to_parquet(file_storage_path, index=False)

        # Remove temporary file
        os.remove(temp_path)

        dataset_document = {
            "_id": file_id,
            "workspace_id": workspace_id,
            "name": request.form.get("name", filename.rsplit(".", 1)[0]),
            "description": request.form.get("description", ""),
            "file_type": file_ext,
            "storage_format": "parquet",
            "file_path": file_storage_path,
            "row_count": len(df),
            "columns": [
                {
                    "name": col,
                    "dtype": str(df[col].dtype),
                    "role": "measure" if pd.api.types.is_numeric_dtype(df[col]) else "dimension"
                }
                for col in df.columns
            ],
            "sample_rows": df.head(20).to_dict("records"),
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc)
        }

        datasets_collection.insert_one(dataset_document)

        return jsonify({
            'id': file_id,
            'name': dataset_document['name'],
            'rows': len(df),
            'columns': len(df.columns),
            'column_names': list(df.columns),
            'workspace_id': workspace_id,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'message': 'File uploaded successfully'
        }), 201

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({
            'error': 'File upload failed',
            'code': 'UPLOAD_ERROR'
        }), 500

@app.route('/api/workspaces/<workspace_id>/datasets', methods=['POST'])
@workspace_access_required
def upload_dataset(workspace_id, resolved_workspace_id, workspace_key, workspace_type):
    """Upload file to specific workspace"""
    try:
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        os.makedirs("./data", exist_ok=True)

        if 'file' not in request.files:
            return jsonify({'error': 'No file provided','code': 'NO_FILE'}), 400
        
        file = request.files['file']

        if file.filename == '':
            return jsonify({'error': 'No file selected','code': 'NO_FILE_SELECTED'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed','code': 'INVALID_FILE_TYPE'}), 400
        
        filename = secure_filename(file.filename)
        file_id = str(uuid.uuid4())

        workspace = workspaces_collection.find_one({'_id': ObjectId(resolved_workspace_id)})
        if not workspace:
            return jsonify({'error': 'Workspace not found','code': 'WORKSPACE_NOT_FOUND'}), 404

        file_ext = filename.rsplit('.', 1)[1].lower()
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.{file_ext}")
        file.save(temp_path)

        try:
            if file_ext == 'csv':
                df = pd.read_csv(temp_path)
            elif file_ext in ['xlsx', 'xls']:
                df = pd.read_excel(temp_path)
            elif file_ext == 'json':
                df = pd.read_json(temp_path)
            else:
                os.remove(temp_path)
                return jsonify({'error': 'Unsupported file format','code': 'UNSUPPORTED_FORMAT'}), 400

        except Exception as read_error:
            os.remove(temp_path)
            return jsonify({'error': f'Error reading file: {str(read_error)}','code': 'FILE_READ_ERROR'}), 400


        # ================= DOMAIN VALIDATION =================
        workspace_key = workspace.get("key")

        is_valid, matches = validate_dataset_domain(df, workspace_key)

        if not is_valid:
            os.remove(temp_path)

            return jsonify({
                "error": "DATASET_DOMAIN_MISMATCH",
                "message": f"Dataset does not match '{workspace_key}' workspace domain",
                "matches_found": matches,
                "required_matches": 2
            }), 400
        # =====================================================


        file_storage_path = f"./data/{file_id}.parquet"
        df.to_parquet(file_storage_path, index=False)

        os.remove(temp_path)

        dataset_document = {
            "_id": file_id,
            "workspace_id": resolved_workspace_id,
            "name": request.form.get("name", filename.rsplit(".", 1)[0]),
            "description": request.form.get("description", ""),
            "file_type": file_ext,
            "storage_format": "parquet",
            "file_path": file_storage_path,
            "row_count": len(df),
            "columns": [
                {
                    "name": col,
                    "dtype": str(df[col].dtype),
                    "role": "measure" if pd.api.types.is_numeric_dtype(df[col]) else "dimension"
                }
                for col in df.columns
            ],
            "sample_rows": df.head(20).to_dict("records"),
            "created_by": get_user_id(),
            "created_at": datetime.now(timezone.utc)
        }

        datasets_collection.insert_one(dataset_document)

        return jsonify({
            'id': file_id,
            'name': dataset_document['name'],
            'rows': len(df),
            'columns': len(df.columns),
            'column_names': list(df.columns),
            'workspace_id': resolved_workspace_id,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'message': 'Dataset uploaded successfully'
        }), 201

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Dataset upload failed','code': 'DATASET_UPLOAD_ERROR'}), 500
    
@app.route('/api/workspaces/<workspace_id>/datasets', methods=['GET'])
@workspace_access_required
def get_datasets(workspace_id, resolved_workspace_id, workspace_key, workspace_type):
    try:
        workspace = workspaces_collection.find_one(
            {'_id': ObjectId(resolved_workspace_id)}
        )
        if not workspace:
            return jsonify({
                'error': 'Workspace not found',
                'code': 'WORKSPACE_NOT_FOUND'
            }), 404

        query = {"workspace_id": resolved_workspace_id}

        datasets = list(
            datasets_collection.find(query)
            .sort("created_at", -1)
        )

        return jsonify([
            {
                "id": str(d.get("_id")),
                "name": d.get("name", "Dataset"),
                "description": d.get("description", ""),
                "row_count": d.get("row_count", 0),
                "columns": d.get("columns", []),
                "file_type": d.get("file_type", "csv"),
                "created_at": (
                    d["created_at"].isoformat()
                    if hasattr(d.get("created_at"), "isoformat")
                    else d.get("created_at")
                ),
                "created_by": d.get("created_by", "")
            }
            for d in datasets
        ]), 200

    except Exception as e:
        logger.error(f"Get datasets error: {e}")
        return jsonify({
            'error': 'Failed to get datasets',
            'code': 'DATASETS_ERROR'
        }), 500
    
@app.route('/api/datasets/<dataset_id>', methods=['DELETE'])
@jwt_required()
def delete_dataset(dataset_id):
    try:
        user_id = get_jwt_identity()

        # Find dataset
        dataset = datasets_collection.find_one({"_id": dataset_id})
        if not dataset:
            return jsonify({"error": "DATASET_NOT_FOUND"}), 404

        # Validate workspace access
        workspace = workspaces_collection.find_one({
            "_id": ObjectId(dataset["workspace_id"]),
            "is_deleted": {"$ne": True},
            "$or": [
                {"owner_id": user_id},
                {"members.user_id": user_id}
            ]
        })

        if not workspace:
            return jsonify({"error": "ACCESS_DENIED"}), 403

        # Delete physical file
        file_path = dataset.get("file_path")
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

        # Find related reports
        reports = list(reports_collection.find({
            "dataset_id": dataset_id
        }))
        report_ids = [r["_id"] for r in reports]

        # Delete reports
        reports_collection.delete_many({
            "dataset_id": dataset_id
        })

        # Remove widgets from dashboards
        dashboards_collection.update_many(
            {"workspace_id": dataset["workspace_id"]},
            {
                "$pull": {
                    "layout": {
                        "report_id": {"$in": report_ids}
                    }
                }
            }
        )

        # Delete dataset
        datasets_collection.delete_one({"_id": dataset_id})

        return jsonify({
            "message": "Dataset deleted successfully"
        }), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "DATASET_DELETE_FAILED"
        }), 500

# =============================================================================
# REPORTS ROUTES
# =============================================================================

@app.route('/api/workspaces/<workspace_id>/reports', methods=['POST'])
@workspace_access_required
def create_report(workspace_id, resolved_workspace_id, workspace_key, workspace_type):
    try:
        user_id = get_user_id()
        data = request.json

        report_id = str(uuid.uuid4())

        report = {
            "_id": report_id,
            "workspace_id": resolved_workspace_id,
            "dataset_id": data["dataset_id"],
            "name": data.get("name", "Untitled Report"),
            "chart_type": data.get("chart_type", "bar"),
            "config": data.get("config", {}),
            "preview_data": data.get("preview_data"),
            "created_by": user_id,
            "created_at":datetime.now(timezone.utc),
            "updated_at":datetime.now(timezone.utc)
        }

        reports_collection.insert_one(report)

        return jsonify({
            "id": report_id,
            "message": "Report created successfully"
        }), 201

    except Exception as e:
        logger.error(f"Create report error: {e}")
        return jsonify({"error": "REPORT_CREATE_FAILED"}), 500

@app.route('/api/workspaces/<workspace_id>/reports', methods=['GET'])
@workspace_access_required
def list_reports(workspace_id, resolved_workspace_id, workspace_key, workspace_type):
    reports = list(reports_collection.find({
        "workspace_id": resolved_workspace_id
    }))

    return jsonify([
        {
            "id": r["_id"],
            "name": r["name"],
            "chart_type": r["chart_type"],
            "dataset_id": r["dataset_id"],
            "created_at": r["created_at"].isoformat()
        }
        for r in reports
    ]), 200

@app.route('/api/reports/<report_id>', methods=['GET'])
@jwt_required()
def get_report(report_id):
    try:
        user_id = get_jwt_identity()

        # 1️⃣ Fetch report
        report = reports_collection.find_one({"_id": report_id})
        if not report:
            return jsonify({"error": "REPORT_NOT_FOUND"}), 404

        # 2️⃣ Validate workspace ownership / membership
        workspace = workspaces_collection.find_one({
            "_id": ObjectId(report["workspace_id"]),
            "is_deleted": {"$ne": True},
            "$or": [
                {"owner_id": user_id},
                {"members.user_id": user_id}
            ]
        })

        if not workspace:
            return jsonify({"error": "ACCESS_DENIED"}), 403

        # 3️⃣ Return report safely
        return jsonify({
            "id": report["_id"],
            "workspace_id": report["workspace_id"],
            "dataset_id": report["dataset_id"],
            "name": report["name"],
            "chart_type": report["chart_type"],
            "config": report.get("config", {}),
            "preview_data": report.get("preview_data")
        }), 200

    except Exception as e:
        logger.error(f"Get report error: {e}")
        return jsonify({"error": "REPORT_FETCH_FAILED"}), 500
        
@app.route('/api/reports/<report_id>', methods=['PUT'])
@jwt_required()
def update_report(report_id):
    try:
        user_id = get_user_id()
        data = request.json or {}

        # Load report
        report = reports_collection.find_one({"_id": report_id})
        if not report:
            return jsonify({"error": "REPORT_NOT_FOUND"}), 404

        # Validate workspace access
        workspace = workspaces_collection.find_one({
            "_id": ObjectId(report["workspace_id"]),
            "is_deleted": {"$ne": True},
            "$or": [
                {"owner_id": user_id},
                {"members.user_id": user_id}
            ]
        })

        if not workspace:
            return jsonify({"error": "ACCESS_DENIED"}), 403

        # Update report safely
        update_fields = {
            "updated_at":datetime.now(timezone.utc)
        }

        if "name" in data:
            update_fields["name"] = data["name"]

        if "chart_type" in data:
            update_fields["chart_type"] = data["chart_type"]

        if "config" in data:
            update_fields["config"] = data["config"]

        if "preview_data" in data:
            update_fields["preview_data"] = data["preview_data"]

        reports_collection.update_one(
            {"_id": report_id},
            {"$set": update_fields}
        )

        return jsonify({"message": "Report updated"}), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "REPORT_UPDATE_FAILED"}), 500

@app.route('/api/reports/<report_id>', methods=['DELETE'])
@jwt_required()
def delete_report(report_id):
    try:
        user_id = get_user_id()

        # Load report
        report = reports_collection.find_one({"_id": report_id})
        if not report:
            return jsonify({"error": "REPORT_NOT_FOUND"}), 404

        # Validate workspace access
        workspace = workspaces_collection.find_one({
            "_id": ObjectId(report["workspace_id"]),
            "is_deleted": {"$ne": True},
            "$or": [
                {"owner_id": user_id},
                {"members.user_id": user_id}
            ]
        })

        if not workspace:
            return jsonify({"error": "ACCESS_DENIED"}), 403

        # Delete report
        reports_collection.delete_one({"_id": report_id})

        return jsonify({"message": "Report deleted"}), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "REPORT_DELETE_FAILED"}), 500

# =============================================================================
# REPORT EXPORT ROUTES
# =============================================================================

@app.route('/api/reports/<report_id>/export', methods=['GET'])
@jwt_required()
def export_report(report_id):
    try:
        user_id = get_jwt_identity()
        export_format = request.args.get("format", "csv")

        # 1️⃣ Fetch report
        report = reports_collection.find_one({"_id": report_id})
        if not report:
            return jsonify({"error": "REPORT_NOT_FOUND"}), 404

        # 2️⃣ Validate workspace access
        workspace = workspaces_collection.find_one({
            "_id": ObjectId(report["workspace_id"]),
            "is_deleted": {"$ne": True},
            "$or": [
                {"owner_id": user_id},
                {"members.user_id": user_id}
            ]
        })

        if not workspace:
            return jsonify({"error": "ACCESS_DENIED"}), 403

        # 3️⃣ Load dataset safely
        dataset_id = report.get("dataset_id")

        try:
            df, _ = get_filtered_dataframe(dataset_id, user_id)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        filename = report.get("name", "report")

        # CSV Export
        if export_format == "csv":
            output = io.StringIO()
            df.to_csv(output, index=False)
            output.seek(0)

            return send_file(
                io.BytesIO(output.getvalue().encode()),
                mimetype="text/csv",
                as_attachment=True,
                download_name=f"{filename}.csv"
            )

        # Excel Export
        if export_format == "excel":
            output = io.BytesIO()
            df.to_excel(output, index=False, engine="openpyxl")
            output.seek(0)

            return send_file(
                output,
                mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                as_attachment=True,
                download_name=f"{filename}.xlsx"
            )

        return jsonify({"error": "INVALID_EXPORT_FORMAT"}), 400

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "EXPORT_FAILED"}), 500
    
@app.route('/api/reports/<report_id>/export/pdf', methods=['GET'])
@jwt_required()
def export_report_pdf(report_id):
    try:
        user_id = get_jwt_identity()

        # 1️⃣ Fetch report
        report = reports_collection.find_one({"_id": report_id})
        if not report:
            return jsonify({"error": "REPORT_NOT_FOUND"}), 404

        # 2️⃣ Validate workspace access
        workspace = workspaces_collection.find_one({
            "_id": ObjectId(report["workspace_id"]),
            "is_deleted": {"$ne": True},
            "$or": [
                {"owner_id": user_id},
                {"members.user_id": user_id}
            ]
        })

        if not workspace:
            return jsonify({"error": "ACCESS_DENIED"}), 403

        # 3️⃣ Load dataset safely
        dataset_id = report.get("dataset_id")

        try:
            df, _ = get_filtered_dataframe(dataset_id, user_id)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=pagesizes.A4)
        elements = []

        styles = getSampleStyleSheet()
        elements.append(Paragraph(report["name"], styles["Title"]))
        elements.append(Spacer(1, 12))

        data = [df.columns.tolist()] + df.head(100).values.tolist()
        table = Table(data)
        table.setStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
        ])

        elements.append(table)
        doc.build(elements)

        buffer.seek(0)

        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"{report['name']}.pdf",
            mimetype="application/pdf"
        )

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "PDF_EXPORT_FAILED"}), 500

@app.route('/api/reports/<report_id>/export/png', methods=['POST'])
@jwt_required()
def export_chart_png(report_id):
    try:
        user_id = get_jwt_identity()

        # 1️⃣ Fetch report
        report = reports_collection.find_one({"_id": report_id})
        if not report:
            return jsonify({"error": "REPORT_NOT_FOUND"}), 404

        # 2️⃣ Validate workspace access
        workspace = workspaces_collection.find_one({
            "_id": ObjectId(report["workspace_id"]),
            "is_deleted": {"$ne": True},
            "$or": [
                {"owner_id": user_id},
                {"members.user_id": user_id}
            ]
        })

        if not workspace:
            return jsonify({"error": "ACCESS_DENIED"}), 403

        # 3️⃣ Validate image
        data = request.json or {}
        image_base64 = data.get("image")

        if not image_base64:
            return jsonify({"error": "NO_IMAGE_PROVIDED"}), 400

        image_bytes = base64.b64decode(image_base64.split(",")[1])

        return send_file(
            io.BytesIO(image_bytes),
            mimetype="image/png",
            as_attachment=True,
            download_name=f"{report_id}.png"
        )

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "PNG_EXPORT_FAILED"}), 500        

# =============================================================================
# REPORT RUN ROUTE
# =============================================================================

@app.route("/api/reports/run", methods=["POST"])
@jwt_required()
def run_report():
    try:
        user_id = get_jwt_identity()
        data = request.json or {}

        report_id = data.get("report_id")
        filters = data.get("filters", {})

        if not report_id:
            return jsonify({"error": "REPORT_ID_REQUIRED"}), 400

        report = reports_collection.find_one({"_id": report_id})
        if not report:
            return jsonify({"error": "REPORT_NOT_FOUND"}), 404

        chart_type = report.get("chart_type") or report.get("config", {}).get("chartType")

        if not chart_type:
            return jsonify({"error": "CHART_TYPE_MISSING"}), 400

        # If preview_data exists → return directly
        if report.get("preview_data"):
            return jsonify({
                "config": {
                    "chartType": chart_type
                },
                "data": report.get("preview_data")
            }), 200

        # Otherwise generate dynamically
        dataset_id = report.get("dataset_id")
        config = report.get("config", {})

        df, workspace = get_filtered_dataframe(dataset_id, user_id)
        df = apply_dashboard_filters(df, filters)

        if df.empty:
            return jsonify({
                "config": {
                    "chartType": chart_type
                },
                "data": {
                    "labels": [],
                    "series": []
                }
            }), 200

        chart_data = generate_chart_data(df, config)

        return jsonify({
            "config": {
                "chartType": chart_type
            },
            "data": chart_data
        }), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "REPORT_RUN_FAILED"}), 500

# =============================================================================
# DASHBOARDS ROUTES
# =============================================================================

@app.route('/api/workspaces/<workspace_id>/dashboards', methods=['GET'])
@workspace_access_required
def list_dashboards(workspace_id, resolved_workspace_id, workspace_key, workspace_type):
    dashboards = list(dashboards_collection.find({
        "workspace_id": resolved_workspace_id
    }))

    return jsonify([
        {
            "id": d["_id"],
            "name": d["name"],
            "workspace_id": d.get("workspace_id"),
            "layout_count": len(d.get("layout", [])),
            "updated_at": d.get("updated_at")
        }
        for d in dashboards
    ]), 200

@app.route('/api/workspaces/<workspace_id>/dashboards', methods=['POST'])
@workspace_access_required
def create_dashboard(workspace_id, resolved_workspace_id, workspace_key, workspace_type):
    try:
        data = request.json or {}
        dashboard_id = str(uuid.uuid4())

        dashboard = {
            "_id": dashboard_id,
            "workspace_id": resolved_workspace_id,
            "name": data.get("name", "New Dashboard"),
            "layout": data.get("layout", []),
            "global_filters": data.get("global_filters", []),
            "created_by": get_user_id(),
            "created_at":datetime.now(timezone.utc),
            "updated_at":datetime.now(timezone.utc)
        }

        dashboards_collection.insert_one(dashboard)

        return jsonify({
            "id": dashboard_id,
            "message": "Dashboard created"
        }), 201

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "DASHBOARD_CREATE_FAILED"}), 500

@app.route('/api/dashboards/<dashboard_id>', methods=['GET'])
@jwt_required()
def get_dashboard(dashboard_id):
    try:
        user_id = get_jwt_identity()

        dashboard = dashboards_collection.find_one({"_id": dashboard_id})

        if not dashboard:
            return jsonify({
                "error": "DASHBOARD_NOT_FOUND",
                "code": "NOT_FOUND"
            }), 404

        # Workspace validation
        workspace = workspaces_collection.find_one({
            "_id": ObjectId(dashboard["workspace_id"]),
            "is_deleted": {"$ne": True},
            "$or": [
                {"owner_id": user_id},
                {"members.user_id": user_id}
            ]
        })

        if not workspace:
            return jsonify({
                "error": "ACCESS_DENIED",
                "code": "FORBIDDEN"
            }), 403

        return jsonify({
            "id": dashboard["_id"],
            "name": dashboard["name"],
            "workspace_id": dashboard["workspace_id"],
            "layout": dashboard.get("layout", []),
            "global_filters": dashboard.get("global_filters", [])
        }), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "DASHBOARD_FETCH_FAILED"
        }), 500

@app.route('/api/dashboards/<dashboard_id>', methods=['PUT'])
@jwt_required()
def update_dashboard(dashboard_id):
    try:
        user_id = get_user_id()
        data = request.json or {}

        # Load dashboard
        dashboard = dashboards_collection.find_one({"_id": dashboard_id})
        if not dashboard:
            return jsonify({"error": "DASHBOARD_NOT_FOUND"}), 404

        # Validate workspace access
        workspace = workspaces_collection.find_one({
            "_id": ObjectId(dashboard["workspace_id"]),
            "is_deleted": {"$ne": True},
            "$or": [
                {"owner_id": user_id},
                {"members.user_id": user_id}
            ]
        })

        if not workspace:
            return jsonify({"error": "ACCESS_DENIED"}), 403

        # Build safe update payload
        update_fields = {
            "updated_at":datetime.now(timezone.utc)
        }

        if "name" in data and data["name"] is not None:
            update_fields["name"] = data["name"]

        if "layout" in data and isinstance(data["layout"], list):
            update_fields["layout"] = data["layout"]

        if "global_filters" in data and isinstance(data["global_filters"], list):
            update_fields["global_filters"] = data["global_filters"]

        dashboards_collection.update_one(
            {"_id": dashboard_id},
            {"$set": update_fields}
        )

        return jsonify({
            "message": "Dashboard updated successfully"
        }), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "DASHBOARD_UPDATE_FAILED"
        }), 500

@app.route('/api/dashboards/<dashboard_id>', methods=['DELETE'])
@jwt_required()
def delete_dashboard(dashboard_id):
    try:
        user_id = get_user_id()

        # Load dashboard
        dashboard = dashboards_collection.find_one({"_id": dashboard_id})
        if not dashboard:
            return jsonify({"error": "DASHBOARD_NOT_FOUND"}), 404

        # Validate workspace access
        workspace = workspaces_collection.find_one({
            "_id": ObjectId(dashboard["workspace_id"]),
            "is_deleted": {"$ne": True},
            "$or": [
                {"owner_id": user_id},
                {"members.user_id": user_id}
            ]
        })

        if not workspace:
            return jsonify({"error": "ACCESS_DENIED"}), 403

        dashboards_collection.delete_one({"_id": dashboard_id})

        return jsonify({"message": "Dashboard deleted"}), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "DASHBOARD_DELETE_FAILED"}), 500

@app.route('/api/dashboards/<dashboard_id>/duplicate', methods=['POST'])
@jwt_required()
def duplicate_dashboard(dashboard_id):
    original = dashboards_collection.find_one({"_id": dashboard_id})
    if not original:
        return jsonify({"error": "NOT_FOUND"}), 404

    new_id = str(uuid.uuid4())

    dashboards_collection.insert_one({
        "_id": new_id,
        "workspace_id": original["workspace_id"],
        "name": original["name"] + " (Copy)",
        "layout": original.get("layout", []),
        "global_filters": original.get("global_filters", []),
        "created_by": get_jwt_identity(),
        "created_at":datetime.now(timezone.utc),
        "updated_at":datetime.now(timezone.utc)
    })

    return jsonify({"id": new_id}), 201

@app.route('/api/dashboards/<dashboard_id>/export', methods=['GET'])
@jwt_required()
def export_dashboard(dashboard_id):
    try:
        user_id = get_jwt_identity()

        dashboard = dashboards_collection.find_one({"_id": dashboard_id})
        if not dashboard:
            return jsonify({"error": "DASHBOARD_NOT_FOUND"}), 404

        output = io.BytesIO()

        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            for item in dashboard.get("layout", []):
                report_id = item.get("report_id")

                report = reports_collection.find_one({"_id": report_id})
                if not report:
                    continue

                df, _ = get_filtered_dataframe(report["dataset_id"], user_id)
                df.head(1000).to_excel(writer, sheet_name=report["name"][:31], index=False)

        output.seek(0)

        return send_file(
            output,
            as_attachment=True,
            download_name=f"{dashboard['name']}_dashboard.xlsx",
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "DASHBOARD_EXPORT_FAILED"}), 500

# =============================================================================
# VISUALIZATION PREVIEW ROUTES
# =============================================================================

@app.route('/api/visualize/preview', methods=['POST'])
@jwt_required()
def visualize_preview():
    try:
        user_id = get_jwt_identity()
        data = request.json or {}

        dataset_id = data.get("dataset_id")
        chart_type = data.get("chart_type", "bar")

        if not dataset_id:
            return jsonify({"error": "DATASET_ID_REQUIRED"}), 400

        try:
            df, workspace = get_filtered_dataframe(dataset_id, user_id)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        x = data.get("x")
        y_measures = data.get("y", [])
        series_dim = data.get("series")
        agg = data.get("aggregation", "SUM")

        if not isinstance(y_measures, list):
            y_measures = [y_measures]

        if not x or x not in df.columns:
            return jsonify({"error": "INVALID_X_AXIS"}), 400

        for y in y_measures:
            if y not in df.columns or not pd.api.types.is_numeric_dtype(df[y]):
                return jsonify({"error": f"INVALID_MEASURE: {y}"}), 400

        agg_map = {
            "SUM": "sum",
            "AVG": "mean",
            "COUNT": "count",
            "MIN": "min",
            "MAX": "max"
        }

        if agg not in agg_map:
            return jsonify({"error": "INVALID_AGGREGATION"}), 400

        group_cols = [x]
        if series_dim and series_dim in df.columns:
            group_cols.append(series_dim)

        grouped = (
            df.groupby(group_cols)[y_measures]
            .agg(agg_map[agg])
            .reset_index()
        )

        labels = sorted(grouped[x].dropna().unique().tolist())[:50]
        series_output = []

        if series_dim:
            for s_val in grouped[series_dim].dropna().unique():
                subset = grouped[grouped[series_dim] == s_val]
                for y in y_measures:
                    series_output.append({
                        "name": f"{y} ({s_val})",
                        "data": [
                            float(subset[subset[x] == label][y].values[0])
                            if label in subset[x].values else 0
                            for label in labels
                        ]
                    })
        else:
            for y in y_measures:
                series_output.append({
                    "name": y,
                    "data": [
                        float(grouped[grouped[x] == label][y].values[0])
                        if label in grouped[x].values else 0
                        for label in labels
                    ]
                })

        return jsonify({
            "chartType": chart_type,
            "data": {
                "labels": labels,
                "series": series_output
            }
        }), 200

    except Exception:
        logger.error(f"Preview error: {traceback.format_exc()}")
        return jsonify({"error": "PREVIEW_GENERATION_FAILED"}), 500

@app.route("/api/visualize/kpi", methods=["POST"])
@jwt_required()
def visualize_kpi():
    try:
        user_id = get_jwt_identity()
        data = request.json or {}

        dataset_id = data.get("dataset_id")
        measure = data.get("measure")
        agg = data.get("aggregation", "SUM")

        if not dataset_id or not measure:
            return jsonify({"error": "INVALID_REQUEST"}), 400

        try:
            df, workspace = get_filtered_dataframe(dataset_id, user_id)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        if measure not in df.columns or not pd.api.types.is_numeric_dtype(df[measure]):
            return jsonify({"error": "INVALID_MEASURE"}), 400

        agg_map = {
            "SUM": df[measure].sum,
            "AVG": df[measure].mean,
            "COUNT": df[measure].count,
            "MIN": df[measure].min,
            "MAX": df[measure].max
        }

        if agg not in agg_map:
            return jsonify({"error": "INVALID_AGGREGATION"}), 400

        return jsonify({
            "value": float(agg_map[agg]())
        }), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "KPI_FAILED"}), 500

@app.route("/api/visualize/waterfall", methods=["POST"])
@jwt_required()
def visualize_waterfall():
    try:
        user_id = get_jwt_identity()
        data = request.json or {}

        dataset_id = data.get("dataset_id")
        x = data.get("x")
        y = data.get("y")

        if not dataset_id or not x or not y:
            return jsonify({"error": "INVALID_REQUEST"}), 400

        try:
            df, workspace = get_filtered_dataframe(dataset_id, user_id)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        if x not in df.columns or y not in df.columns:
            return jsonify({"error": "INVALID_AXES"}), 400

        df = df.sort_values(x)
        df["running_total"] = df[y].cumsum()

        return jsonify({
            "labels": df[x].astype(str).tolist(),
            "values": df["running_total"].tolist()
        }), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "WATERFALL_FAILED"}), 500

@app.route("/api/visualize/scatter", methods=["POST"])
@jwt_required()
def visualize_scatter():
    try:
        user_id = get_jwt_identity()
        data = request.json or {}

        dataset_id = data.get("dataset_id")
        x = data.get("x")
        y = data.get("y")
        size = data.get("size")

        if isinstance(y, list):
            y = y[0]

        if not dataset_id or not x or not y:
            return jsonify({"error": "INVALID_REQUEST"}), 400

        try:
            df, workspace = get_filtered_dataframe(dataset_id, user_id)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        if x not in df.columns or y not in df.columns:
            return jsonify({"error": "INVALID_AXES"}), 400

        points = []
        for _, row in df.dropna(subset=[x, y]).iterrows():
            points.append([
                float(row[x]),
                float(row[y]),
                float(row[size]) if size and size in df.columns else 10
            ])

        return jsonify({
            "data": points[:5000]
        }), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "SCATTER_FAILED"}), 500

@app.route("/api/visualize/matrix", methods=["POST"])
@jwt_required()
def visualize_matrix():
    try:
        user_id = get_jwt_identity()
        data = request.json or {}

        dataset_id = data.get("dataset_id")
        x_dim = data.get("x")
        y_dim = data.get("y")
        measure = data.get("measure")
        agg = data.get("aggregation", "SUM")

        if not dataset_id:
            return jsonify({"error": "INVALID_REQUEST"}), 400

        try:
            df, workspace = get_filtered_dataframe(dataset_id, user_id)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        if x_dim not in df.columns or y_dim not in df.columns:
            return jsonify({"error": "INVALID_DIMENSIONS"}), 400

        if measure not in df.columns:
            return jsonify({"error": "INVALID_MEASURE"}), 400

        agg_map = {
            "SUM": "sum",
            "AVG": "mean",
            "COUNT": "count",
            "MIN": "min",
            "MAX": "max"
        }

        matrix = (
            df.groupby([x_dim, y_dim])[measure]
            .agg(agg_map[agg])
            .reset_index()
        )

        return jsonify({
            "xLabels": matrix[x_dim].unique().tolist(),
            "yLabels": matrix[y_dim].unique().tolist(),
            "values": matrix.to_dict("records")
        }), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "MATRIX_FAILED"}), 500

@app.route("/api/visualize/hierarchy", methods=["POST"])
@jwt_required()
def visualize_hierarchy():
    try:
        user_id = get_jwt_identity()
        data = request.json or {}

        dataset_id = data.get("dataset_id")
        chart_type = data.get("chart_type", "treemap")
        dimensions = data.get("dimensions", [])
        measure = data.get("measure")
        agg = data.get("aggregation", "SUM")

        if not dataset_id or not dimensions or not measure:
            return jsonify({"error": "INVALID_REQUEST"}), 400

        try:
            df, workspace = get_filtered_dataframe(dataset_id, user_id)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        for dim in dimensions:
            if dim not in df.columns:
                return jsonify({"error": f"INVALID_DIMENSION: {dim}"}), 400

        if measure not in df.columns or not pd.api.types.is_numeric_dtype(df[measure]):
            return jsonify({"error": f"INVALID_MEASURE: {measure}"}), 400

        agg_map = {
            "SUM": "sum",
            "AVG": "mean",
            "COUNT": "count",
            "MIN": "min",
            "MAX": "max"
        }

        if agg not in agg_map:
            return jsonify({"error": "INVALID_AGGREGATION"}), 400

        grouped = (
            df.groupby(dimensions)[measure]
            .agg(agg_map[agg])
            .reset_index()
        )

        def build_tree(dataframe, dims, level=0):
            result = []
            current_dim = dims[level]

            for key in dataframe[current_dim].dropna().unique():
                sub_df = dataframe[dataframe[current_dim] == key]

                if level == len(dims) - 1:
                    result.append({
                        "name": str(key),
                        "value": float(sub_df[measure].sum())
                    })
                else:
                    result.append({
                        "name": str(key),
                        "children": build_tree(sub_df, dims, level + 1)
                    })

            return result

        hierarchy = build_tree(grouped, dimensions)

        return jsonify({
            "chart_type": chart_type,
            "meta": {
                "dimensions": dimensions,
                "measure": measure,
                "aggregation": agg,
                "family": "hierarchy"
            },
            "data": hierarchy
        }), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "HIERARCHY_FAILED"}), 500

# =============================================================================
# DATASET ROWS ROUTES
# =============================================================================

@app.route("/api/datasets/<dataset_id>/rows", methods=["GET"])
@jwt_required()
def get_dataset_rows(dataset_id):
    try:
        user_id = get_jwt_identity()

        page = int(request.args.get("page", 1))
        limit = min(int(request.args.get("limit", 100)), 1000)
        skip = (page - 1) * limit

        try:
            df, workspace = get_filtered_dataframe(dataset_id, user_id)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        total = len(df)

        return jsonify({
            "page": page,
            "limit": limit,
            "total": total,
            "rows": df.iloc[skip: skip + limit].to_dict("records")
        }), 200

    except Exception:
        logger.error(traceback.format_exc())
        return jsonify({"error": "ROWS_FETCH_FAILED"}), 500

@app.route("/api/datasets/<dataset_id>/row/<int:row_index>", methods=["PUT"])
@jwt_required()
def update_dataset_row(dataset_id, row_index):

    try:
        user_id = get_jwt_identity()
        data = request.json or {}

        # 1️⃣ Fetch dataset
        dataset = datasets_collection.find_one({"_id": dataset_id})

        if not dataset:
            return jsonify({"error": "DATASET_NOT_FOUND"}), 404

        # 2️⃣ Validate workspace access
        workspace = workspaces_collection.find_one({
            "_id": ObjectId(dataset["workspace_id"]),
            "is_deleted": {"$ne": True},
            "$or": [
                {"owner_id": user_id},
                {"members.user_id": user_id}
            ]
        })

        if not workspace:
            return jsonify({"error": "ACCESS_DENIED"}), 403

        # 3️⃣ Validate file
        file_path = dataset.get("file_path")

        if not file_path or not os.path.exists(file_path):
            return jsonify({"error": "DATA_FILE_NOT_FOUND"}), 404

        # 4️⃣ Load dataset
        df = pd.read_parquet(file_path)

        if row_index >= len(df):
            return jsonify({"error": "ROW_OUT_OF_RANGE"}), 400

        # 5️⃣ Update row
        for column, value in data.items():

            if column not in df.columns:
                continue

            try:
                dtype = df[column].dtype

                if pd.api.types.is_numeric_dtype(dtype):
                    value = float(value) if value != "" else None

                df.at[row_index, column] = value

            except Exception:
                return jsonify({
                    "error": f"INVALID_VALUE_FOR_COLUMN_{column}"
                }), 400

        # 6️⃣ Save dataset
        df.to_parquet(file_path, index=False)

        return jsonify({
            "message": "Row updated successfully"
        }), 200

    except Exception as e:
        logger.error(traceback.format_exc())

        return jsonify({
            "error": "ROW_UPDATE_FAILED",
            "details": str(e)
        }), 500
    
@app.route("/api/datasets/<dataset_id>/row", methods=["POST"])
@jwt_required()
def add_dataset_row(dataset_id):
    try:
        user_id = get_jwt_identity()
        data = request.json or {}

        # 1️⃣ Fetch dataset
        dataset = datasets_collection.find_one({"_id": dataset_id})

        if not dataset:
            return jsonify({"error": "DATASET_NOT_FOUND"}), 404

        # 2️⃣ Validate workspace access
        workspace = workspaces_collection.find_one({
            "_id": ObjectId(dataset["workspace_id"]),
            "is_deleted": {"$ne": True},
            "$or": [
                {"owner_id": user_id},
                {"members.user_id": user_id}
            ]
        })

        if not workspace:
            return jsonify({"error": "ACCESS_DENIED"}), 403

        # 3️⃣ Validate file path
        file_path = dataset.get("file_path")

        if not file_path or not os.path.exists(file_path):
            return jsonify({"error": "DATA_FILE_NOT_FOUND"}), 404

        # 4️⃣ Load dataset safely
        df = pd.read_parquet(file_path)

        # 5️⃣ Build new row
        new_row = {}

        for col in df.columns:
            new_row[col] = data.get(col, None)

        # 6️⃣ Append row
        df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)

        # 7️⃣ Save dataset
        df.to_parquet(file_path, index=False)

        return jsonify({
            "message": "Row added successfully"
        }), 200

    except Exception as e:
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "ROW_ADD_FAILED",
            "details": str(e)
        }), 500


@app.route("/api/datasets/<dataset_id>/row/<int:row_index>", methods=["DELETE"])
@jwt_required()
def delete_dataset_row(dataset_id, row_index):

    try:
        user_id = get_jwt_identity()

        # 1️⃣ Fetch dataset
        dataset = datasets_collection.find_one({"_id": dataset_id})

        if not dataset:
            return jsonify({"error": "DATASET_NOT_FOUND"}), 404

        # 2️⃣ Validate workspace access
        workspace = workspaces_collection.find_one({
            "_id": ObjectId(dataset["workspace_id"]),
            "is_deleted": {"$ne": True},
            "$or": [
                {"owner_id": user_id},
                {"members.user_id": user_id}
            ]
        })

        if not workspace:
            return jsonify({"error": "ACCESS_DENIED"}), 403

        # 3️⃣ Validate file
        file_path = dataset.get("file_path")

        if not file_path or not os.path.exists(file_path):
            return jsonify({"error": "DATA_FILE_NOT_FOUND"}), 404

        # 4️⃣ Load dataset
        df = pd.read_parquet(file_path)

        if row_index >= len(df):
            return jsonify({"error": "ROW_OUT_OF_RANGE"}), 400

        # 5️⃣ Delete row
        df = df.drop(index=row_index).reset_index(drop=True)

        # 6️⃣ Save dataset
        df.to_parquet(file_path, index=False)

        return jsonify({
            "message": "Row deleted successfully"
        }), 200

    except Exception as e:
        logger.error(traceback.format_exc())

        return jsonify({
            "error": "ROW_DELETE_FAILED",
            "details": str(e)
        }), 500
    
@app.route("/api/datasets/<dataset_id>/column/rename", methods=["PUT"])
@jwt_required()
def rename_dataset_column(dataset_id):

    try:
        user_id = get_jwt_identity()
        data = request.json or {}

        old_name = data.get("old")
        new_name = data.get("new")

        if not old_name or not new_name:
            return jsonify({"error": "INVALID_REQUEST"}), 400

        # 1️⃣ Fetch dataset
        dataset = datasets_collection.find_one({"_id": dataset_id})

        if not dataset:
            return jsonify({"error": "DATASET_NOT_FOUND"}), 404

        # 2️⃣ Validate workspace access
        workspace = workspaces_collection.find_one({
            "_id": ObjectId(dataset["workspace_id"]),
            "is_deleted": {"$ne": True},
            "$or": [
                {"owner_id": user_id},
                {"members.user_id": user_id}
            ]
        })

        if not workspace:
            return jsonify({"error": "ACCESS_DENIED"}), 403

        # 3️⃣ Validate file
        file_path = dataset.get("file_path")

        if not file_path or not os.path.exists(file_path):
            return jsonify({"error": "DATA_FILE_NOT_FOUND"}), 404

        # 4️⃣ Load dataset
        df = pd.read_parquet(file_path)

        if old_name not in df.columns:
            return jsonify({"error": "COLUMN_NOT_FOUND"}), 400

        if new_name in df.columns:
            return jsonify({"error": "COLUMN_ALREADY_EXISTS"}), 400

        # 5️⃣ Rename column
        df = df.rename(columns={old_name: new_name})

        # 6️⃣ Save dataset
        df.to_parquet(file_path, index=False)

        return jsonify({
            "message": "Column renamed successfully"
        }), 200

    except Exception as e:
        logger.error(traceback.format_exc())

        return jsonify({
            "error": "COLUMN_RENAME_FAILED",
            "details": str(e)
        }), 500


# =============================================================================
# MIGRATION ROUTE (ADMIN ONLY)
# =============================================================================

@app.route('/api/migrate/fix-workspace-ids', methods=['POST'])
@jwt_required()
def migrate_fix_workspace_ids():
    try:
        user_id = get_user_id()
        
        user = users_collection.find_one({'_id': ObjectId(user_id)})
        if not user or user.get("role") != "admin":
            return jsonify({
                "error": "Admin only operation",
                "code": "ADMIN_REQUIRED"
            }), 403
        
        system_workspaces = list(workspaces_collection.find({
            'owner_id': user_id,
            'is_system': True,
            "is_deleted": {"$ne": True}
        }))
        
        workspace_map = {}
        for ws in system_workspaces:
            key = ws.get('key')
            if key:
                workspace_map[key] = str(ws['_id'])
        
        datasets_to_fix = list(datasets_collection.find({
            'workspace_id': {'$in': list(workspace_map.keys())}
        }))
        
        updated_count = 0
        for dataset in datasets_to_fix:
            old_ws_id = dataset['workspace_id']
            if old_ws_id in workspace_map:
                new_ws_id = workspace_map[old_ws_id]
                datasets_collection.update_one(
                    {'_id': dataset['_id']},
                    {'$set': {'workspace_id': new_ws_id}}
                )
                updated_count += 1
        
        return jsonify({
            'success': True,
            'message': f'Migration completed: {updated_count} datasets updated',
            'updated_count': updated_count,
            'workspace_map': workspace_map
        }), 200
        
    except Exception as e:
        logger.error(f"Migration error: {traceback.format_exc()}")
        return jsonify({
            'error': 'Migration failed',
            'code': 'MIGRATION_ERROR',
            'details': str(e) if app.debug else None
        }), 500

# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.route('/api/health', methods=['GET'])
def health():
    try:
        mongo_client.admin.command('ping')
        
        health_status = {
            'status': 'healthy',
            'timestamp':datetime.now(timezone.utc).isoformat(),
            'services': {
                'mongodb': 'connected',
            },
            'version': '1.0.0',
            'fixes_applied': [
                'JWT Blacklist for token revocation',
                'IP-based login blocking',
                'Suspicious activity detection',
                'Device fingerprinting',
                'Session management',
                'Security event logging',
                'Delivery channel validation',
                'Auto-upgrade delivery channel on both verified',
                'Force logout on email change with token blacklist',
                'SMS notification simplification'
            ]
        }
        return jsonify(health_status), 200
        
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'code': 'HEALTH_CHECK_FAILED',
            'timestamp':datetime.now(timezone.utc).isoformat()
        }), 500

# =============================================================================
# ERROR HANDLERS
# =============================================================================

@app.errorhandler(404)
def not_found(e):
    return jsonify({
        'error': 'Resource not found',
        'code': 'NOT_FOUND',
        'path': request.path
    }), 404

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal server error: {e}")
    return jsonify({
        'error': 'Internal server error',
        'code': 'INTERNAL_ERROR',
        'details': str(e) if app.debug else ''
    }), 500

@app.errorhandler(413)
def too_large(e):
    return jsonify({
        'error': 'File too large. Maximum size is 100MB',
        'code': 'FILE_TOO_LARGE',
        'max_size': '100MB'
    }), 413

@app.errorhandler(400)
def bad_request(e):
    return jsonify({
        'error': 'Bad request',
        'code': 'BAD_REQUEST',
        'details': str(e)
    }), 400

@app.errorhandler(401)
def unauthorized(e):
    return jsonify({
        'error': 'Unauthorized. Please log in',
        'code': 'UNAUTHORIZED'
    }), 401

@app.errorhandler(403)
def forbidden(e):
    return jsonify({
        'error': 'Forbidden. You do not have permission to access this resource',
        'code': 'FORBIDDEN'
    }), 403

# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

os.makedirs("./data", exist_ok=True)

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['PROFILE_UPLOAD_FOLDER'], exist_ok=True)
    
    seed_visualization_templates()
    
    logger.info("=" * 80)
    logger.info("🚀 NUTMEG BI ANALYTICS BACKEND - ENTERPRISE PRODUCTION READY")
    logger.info("=" * 80)
    logger.info(f"📡 Server running on: http://localhost:8000")
    logger.info(f"🔐 Authentication: JWT with 24-hour tokens + Blacklist")
    logger.info(f"🛡️ Security: IP Blocking, Device Fingerprinting, Suspicious Activity Detection")
    logger.info(f"💾 Upload folder: {app.config['UPLOAD_FOLDER']}")
    logger.info("")
    logger.info("✅ ENTERPRISE SECURITY FEATURES:")
    logger.info("1. ✅ JWT Blacklist - Real token invalidation on logout")
    logger.info("2. ✅ IP-based Login Blocking - 10 failures = 15min block")
    logger.info("3. ✅ Suspicious Activity Detection - Multi-device/IP anomalies")
    logger.info("4. ✅ Device Fingerprinting - Track unique devices")
    logger.info("5. ✅ Session Management - View and revoke sessions")
    logger.info("6. ✅ Security Event Logging - Audit trail")
    logger.info("7. ✅ Delivery Channel Validation - Backend enforced")
    logger.info("8. ✅ Auto-upgrade to 'both' when both verified")
    logger.info("9. ✅ Force logout on email change with token blacklist")
    logger.info("10. ✅ Simplified SMS notifications")
    logger.info("")
    logger.info("🎯 KEY ENDPOINTS:")
    logger.info("• POST   /api/auth/verify-otp                  - Verify OTP (with IP blocking)")
    logger.info("• POST   /api/auth/logout                      - Logout (blacklists token)")
    logger.info("• POST   /api/auth/update-profile              - Update profile with validation")
    logger.info("• POST   /api/auth/verify-profile-otp          - Verify profile OTP with auto-upgrade")
    logger.info("• GET    /api/security/sessions                - List active sessions")
    logger.info("• DELETE /api/security/sessions/<id>           - Revoke specific session")
    logger.info("")
    logger.info("=" * 80)
    
    debug_mode = os.getenv("FLASK_DEBUG", "True") == "True"
    app.run(host='0.0.0.0', port=8000, debug=debug_mode)