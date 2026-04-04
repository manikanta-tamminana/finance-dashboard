from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import math
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel, Field, EmailStr
import bcrypt
import jwt

# ─── Configuration ──────────────────────────────────────────
JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7

# ─── MongoDB ────────────────────────────────────────────────
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ─── App ────────────────────────────────────────────────────
from fastapi import FastAPI

app = FastAPI(title="Finance Dashboard API")

@app.get("/")
def root():
    return {"message": "Finance Dashboard API is running"}
# ─── Logging ────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── CORS ───────────────────────────────────────────────────
allowed_origins = [
    os.environ.get("FRONTEND_URL", "http://localhost:3000"),
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Request Logging Middleware ─────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"{request.method} {request.url.path}")
    response = await call_next(request)
    return response

# ─── Pydantic Models ───────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: Optional[str] = "viewer"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RecordCreate(BaseModel):
    amount: float = Field(..., gt=0)
    type: str = Field(..., pattern="^(income|expense)$")
    category: str = Field(..., min_length=1)
    date: str = Field(..., min_length=10, max_length=10)
    description: Optional[str] = ""

class RecordUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    type: Optional[str] = Field(None, pattern="^(income|expense)$")
    category: Optional[str] = None
    date: Optional[str] = None
    description: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = Field(None, pattern="^(admin|analyst|viewer)$")
    status: Optional[str] = Field(None, pattern="^(active|inactive)$")

# ─── Password Hashing ──────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

# ─── JWT Tokens ─────────────────────────────────────────────
def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="lax", max_age=604800, path="/")

# ─── Serializers ────────────────────────────────────────────
def serialize_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "viewer"),
        "status": user.get("status", "active"),
        "created_at": user.get("created_at", ""),
        "updated_at": user.get("updated_at", ""),
    }

def serialize_record(record: dict, creator_name: str = "") -> dict:
    return {
        "id": str(record["_id"]),
        "amount": record.get("amount", 0),
        "type": record.get("type", ""),
        "category": record.get("category", ""),
        "date": record.get("date", ""),
        "description": record.get("description", ""),
        "created_by": record.get("created_by", ""),
        "creator_name": creator_name,
        "is_deleted": record.get("is_deleted", False),
        "created_at": record.get("created_at", ""),
        "updated_at": record.get("updated_at", ""),
    }

# ─── Auth Dependency ────────────────────────────────────────
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if user.get("status") == "inactive":
            raise HTTPException(status_code=403, detail="Account is inactive")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ─── Role-Based Access Control ──────────────────────────────
def require_roles(*roles):
    async def check_role(request: Request):
        user = await get_current_user(request)
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return check_role

# ─── Brute Force Protection ────────────────────────────────
async def check_brute_force(ip: str, email: str):
    identifier = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("locked_until"):
        locked = datetime.fromisoformat(attempt["locked_until"])
        if datetime.now(timezone.utc) < locked:
            raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")
        else:
            await db.login_attempts.delete_one({"identifier": identifier})

async def record_failed_attempt(ip: str, email: str):
    identifier = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt:
        attempts = attempt.get("attempts", 0) + 1
        update_data = {"attempts": attempts, "last_attempt": datetime.now(timezone.utc).isoformat()}
        if attempts >= 5:
            update_data["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
        await db.login_attempts.update_one({"identifier": identifier}, {"$set": update_data})
    else:
        await db.login_attempts.insert_one({
            "identifier": identifier,
            "attempts": 1,
            "last_attempt": datetime.now(timezone.utc).isoformat()
        })

async def clear_failed_attempts(ip: str, email: str):
    await db.login_attempts.delete_many({"identifier": f"{ip}:{email}"})

# ═══════════════════════════════════════════════════════════
#  ROUTERS
# ═══════════════════════════════════════════════════════════

auth_router = APIRouter(prefix="/api/auth", tags=["Auth"])
records_router = APIRouter(prefix="/api/records", tags=["Records"])
dashboard_router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])
users_router = APIRouter(prefix="/api/users", tags=["Users"])

# ─── Auth Routes ────────────────────────────────────────────

@auth_router.post("/register")
async def register(body: RegisterRequest, response: Response):
    email = body.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "name": body.name,
        "email": email,
        "password_hash": hash_password(body.password),
        "role": "viewer",
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)
    
    return {"id": user_id, "name": body.name, "email": email, "role": "viewer", "status": "active"}

@auth_router.post("/login")
async def login(body: LoginRequest, request: Request, response: Response):
    email = body.email.lower()
    client_ip = request.client.host if request.client else "unknown"
    
    await check_brute_force(client_ip, email)
    
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        await record_failed_attempt(client_ip, email)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if user.get("status") == "inactive":
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    await clear_failed_attempts(client_ip, email)
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)
    
    return serialize_user(user)

@auth_router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@auth_router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["_id"],
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "viewer"),
        "status": user.get("status", "active"),
    }

@auth_router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ─── Financial Records Routes ───────────────────────────────

@records_router.get("")
async def list_records(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    type: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user: dict = Depends(require_roles("admin", "analyst"))
):
    query = {"is_deleted": {"$ne": True}}
    if type:
        query["type"] = type
    if category:
        query["category"] = category
    if date_from:
        query.setdefault("date", {})["$gte"] = date_from
    if date_to:
        query.setdefault("date", {})["$lte"] = date_to
    if search:
        query["$or"] = [
            {"description": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}},
        ]
    
    total = await db.financial_records.count_documents(query)
    skip = (page - 1) * limit
    records = await db.financial_records.find(query).sort("date", -1).skip(skip).limit(limit).to_list(limit)
    
    # Populate creator names
    creator_ids = list(set(r.get("created_by", "") for r in records if r.get("created_by")))
    creators = {}
    if creator_ids:
        valid_ids = []
        for cid in creator_ids:
            try:
                valid_ids.append(ObjectId(cid))
            except Exception:
                pass
        if valid_ids:
            user_docs = await db.users.find({"_id": {"$in": valid_ids}}, {"name": 1}).to_list(100)
            creators = {str(u["_id"]): u["name"] for u in user_docs}
    
    serialized = [serialize_record(r, creators.get(r.get("created_by", ""), "Unknown")) for r in records]
    
    return {
        "records": serialized,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if total > 0 else 1,
    }

@records_router.get("/categories-list")
async def get_categories(user: dict = Depends(get_current_user)):
    categories = await db.financial_records.distinct("category", {"is_deleted": {"$ne": True}})
    return {"categories": sorted(categories)}

@records_router.get("/{record_id}")
async def get_record(record_id: str, user: dict = Depends(require_roles("admin", "analyst"))):
    try:
        record = await db.financial_records.find_one({"_id": ObjectId(record_id), "is_deleted": {"$ne": True}})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid record ID")
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    creator = await db.users.find_one({"_id": ObjectId(record["created_by"])}, {"name": 1}) if record.get("created_by") else None
    creator_name = creator["name"] if creator else "Unknown"
    return serialize_record(record, creator_name)

@records_router.post("/")
async def create_record(body: RecordCreate, user: dict = Depends(require_roles("admin"))):
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "amount": body.amount,
        "type": body.type,
        "category": body.category,
        "date": body.date,
        "description": body.description or "",
        "created_by": user["_id"],
        "is_deleted": False,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.financial_records.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_record(doc, user.get("name", ""))

@records_router.put("/{record_id}")
async def update_record(record_id: str, body: RecordUpdate, user: dict = Depends(require_roles("admin"))):
    try:
        record = await db.financial_records.find_one({"_id": ObjectId(record_id), "is_deleted": {"$ne": True}})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid record ID")
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.financial_records.update_one({"_id": ObjectId(record_id)}, {"$set": update_data})
    updated = await db.financial_records.find_one({"_id": ObjectId(record_id)})
    
    creator = await db.users.find_one({"_id": ObjectId(updated["created_by"])}, {"name": 1}) if updated.get("created_by") else None
    return serialize_record(updated, creator["name"] if creator else "Unknown")

@records_router.delete("/{record_id}")
async def delete_record(record_id: str, user: dict = Depends(require_roles("admin"))):
    try:
        record = await db.financial_records.find_one({"_id": ObjectId(record_id), "is_deleted": {"$ne": True}})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid record ID")
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    await db.financial_records.update_one(
        {"_id": ObjectId(record_id)},
        {"$set": {"is_deleted": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Record deleted"}

# ─── Dashboard Routes ───────────────────────────────────────

@dashboard_router.get("/summary")
async def get_summary(user: dict = Depends(get_current_user)):
    base_match = {"is_deleted": {"$ne": True}}
    
    income_pipeline = [
        {"$match": {**base_match, "type": "income"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    expense_pipeline = [
        {"$match": {**base_match, "type": "expense"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    
    income_result = await db.financial_records.aggregate(income_pipeline).to_list(1)
    expense_result = await db.financial_records.aggregate(expense_pipeline).to_list(1)
    
    total_income = income_result[0]["total"] if income_result else 0
    total_expenses = expense_result[0]["total"] if expense_result else 0
    
    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_balance": total_income - total_expenses,
    }

@dashboard_router.get("/categories")
async def get_category_breakdown(user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"is_deleted": {"$ne": True}}},
        {"$group": {
            "_id": {"category": "$category", "type": "$type"},
            "total": {"$sum": "$amount"}
        }},
        {"$sort": {"total": -1}}
    ]
    results = await db.financial_records.aggregate(pipeline).to_list(100)
    return {
        "categories": [
            {"category": r["_id"]["category"], "type": r["_id"]["type"], "total": r["total"]}
            for r in results
        ]
    }

@dashboard_router.get("/trends")
async def get_monthly_trends(user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"is_deleted": {"$ne": True}}},
        {"$group": {
            "_id": {"$substr": ["$date", 0, 7]},
            "income": {"$sum": {"$cond": [{"$eq": ["$type", "income"]}, "$amount", 0]}},
            "expenses": {"$sum": {"$cond": [{"$eq": ["$type", "expense"]}, "$amount", 0]}},
        }},
        {"$sort": {"_id": 1}}
    ]
    results = await db.financial_records.aggregate(pipeline).to_list(100)
    return {
        "trends": [
            {"month": r["_id"], "income": r["income"], "expenses": r["expenses"]}
            for r in results
        ]
    }

@dashboard_router.get("/recent")
async def get_recent_transactions(user: dict = Depends(get_current_user)):
    records = await db.financial_records.find(
        {"is_deleted": {"$ne": True}}
    ).sort("date", -1).limit(10).to_list(10)
    
    creator_ids = list(set(r.get("created_by", "") for r in records if r.get("created_by")))
    creators = {}
    if creator_ids:
        valid_ids = []
        for cid in creator_ids:
            try:
                valid_ids.append(ObjectId(cid))
            except Exception:
                pass
        if valid_ids:
            user_docs = await db.users.find({"_id": {"$in": valid_ids}}, {"name": 1}).to_list(100)
            creators = {str(u["_id"]): u["name"] for u in user_docs}
    
    return {
        "transactions": [serialize_record(r, creators.get(r.get("created_by", ""), "Unknown")) for r in records]
    }

# ─── User Management Routes (Admin) ────────────────────────

@users_router.get("")
async def list_users(user: dict = Depends(require_roles("admin"))):
    users = await db.users.find({}, {"password_hash": 0}).to_list(1000)
    return {"users": [serialize_user(u) for u in users]}

@users_router.get("/{user_id}")
async def get_user(user_id: str, user: dict = Depends(require_roles("admin"))):
    try:
        target = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_user(target)

@users_router.put("/{user_id}")
async def update_user(user_id: str, body: UserUpdate, user: dict = Depends(require_roles("admin"))):
    try:
        target = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if "email" in update_data:
        update_data["email"] = update_data["email"].lower()
        existing = await db.users.find_one({"email": update_data["email"], "_id": {"$ne": ObjectId(user_id)}})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    updated = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    return serialize_user(updated)

@users_router.delete("/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_roles("admin"))):
    if user_id == user["_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    try:
        target = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"status": "inactive", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "User deactivated"}

# ─── Health Check ───────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ─── Include Routers ────────────────────────────────────────
app.include_router(auth_router)
app.include_router(records_router)
app.include_router(dashboard_router)
app.include_router(users_router)

# ─── Startup: Indexes + Seed Data ──────────────────────────

SEED_RECORDS = [
    {"amount": 5000, "type": "income", "category": "Salary", "date": "2025-09-01", "description": "Monthly salary September"},
    {"amount": 120, "type": "expense", "category": "Utilities", "date": "2025-09-05", "description": "Electricity bill"},
    {"amount": 450, "type": "expense", "category": "Groceries", "date": "2025-09-10", "description": "Weekly grocery shopping"},
    {"amount": 1500, "type": "expense", "category": "Rent", "date": "2025-09-01", "description": "Monthly rent payment"},
    {"amount": 200, "type": "expense", "category": "Entertainment", "date": "2025-09-15", "description": "Concert tickets"},
    {"amount": 5000, "type": "income", "category": "Salary", "date": "2025-10-01", "description": "Monthly salary October"},
    {"amount": 800, "type": "income", "category": "Freelance", "date": "2025-10-10", "description": "Web design project"},
    {"amount": 1500, "type": "expense", "category": "Rent", "date": "2025-10-01", "description": "Monthly rent payment"},
    {"amount": 380, "type": "expense", "category": "Groceries", "date": "2025-10-08", "description": "Grocery shopping"},
    {"amount": 150, "type": "expense", "category": "Transportation", "date": "2025-10-12", "description": "Monthly transit pass"},
    {"amount": 5000, "type": "income", "category": "Salary", "date": "2025-11-01", "description": "Monthly salary November"},
    {"amount": 350, "type": "income", "category": "Investments", "date": "2025-11-15", "description": "Dividend payment"},
    {"amount": 1500, "type": "expense", "category": "Rent", "date": "2025-11-01", "description": "Monthly rent payment"},
    {"amount": 500, "type": "expense", "category": "Healthcare", "date": "2025-11-10", "description": "Dental checkup"},
    {"amount": 420, "type": "expense", "category": "Groceries", "date": "2025-11-12", "description": "Weekly groceries"},
    {"amount": 100, "type": "expense", "category": "Utilities", "date": "2025-11-05", "description": "Internet bill"},
    {"amount": 5000, "type": "income", "category": "Salary", "date": "2025-12-01", "description": "Monthly salary December"},
    {"amount": 2000, "type": "income", "category": "Salary", "date": "2025-12-20", "description": "Year-end bonus"},
    {"amount": 1500, "type": "expense", "category": "Rent", "date": "2025-12-01", "description": "Monthly rent payment"},
    {"amount": 600, "type": "expense", "category": "Entertainment", "date": "2025-12-25", "description": "Holiday gifts and celebrations"},
    {"amount": 350, "type": "expense", "category": "Groceries", "date": "2025-12-15", "description": "Holiday groceries"},
    {"amount": 200, "type": "expense", "category": "Education", "date": "2025-12-10", "description": "Online course subscription"},
    {"amount": 5200, "type": "income", "category": "Salary", "date": "2026-01-01", "description": "Monthly salary January"},
    {"amount": 1000, "type": "income", "category": "Freelance", "date": "2026-01-15", "description": "Logo design project"},
    {"amount": 1500, "type": "expense", "category": "Rent", "date": "2026-01-01", "description": "Monthly rent payment"},
    {"amount": 130, "type": "expense", "category": "Utilities", "date": "2026-01-07", "description": "Water and gas bill"},
    {"amount": 400, "type": "expense", "category": "Groceries", "date": "2026-01-10", "description": "Grocery shopping"},
    {"amount": 75, "type": "expense", "category": "Transportation", "date": "2026-01-20", "description": "Taxi rides"},
    {"amount": 5200, "type": "income", "category": "Salary", "date": "2026-02-01", "description": "Monthly salary February"},
    {"amount": 1500, "type": "expense", "category": "Rent", "date": "2026-02-01", "description": "Monthly rent payment"},
    {"amount": 380, "type": "expense", "category": "Groceries", "date": "2026-02-05", "description": "Weekly groceries"},
    {"amount": 250, "type": "expense", "category": "Healthcare", "date": "2026-02-10", "description": "Eye exam and glasses"},
]

@app.on_event("startup")
async def startup():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.financial_records.create_index([("date", -1)])
    await db.financial_records.create_index("type")
    await db.financial_records.create_index("category")
    
    logger.info("MongoDB indexes created")
    
    # Seed users
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    now = datetime.now(timezone.utc).isoformat()
    
    admin = await db.users.find_one({"email": admin_email})
    if not admin:
        result = await db.users.insert_one({
            "name": "Admin User", "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "admin", "status": "active",
            "created_at": now, "updated_at": now,
        })
        admin_id = str(result.inserted_id)
        logger.info(f"Admin user seeded: {admin_email}")
    else:
        admin_id = str(admin["_id"])
        if not verify_password(admin_password, admin["password_hash"]):
            await db.users.update_one({"_id": admin["_id"]}, {"$set": {"password_hash": hash_password(admin_password)}})
            logger.info("Admin password updated")
    
    analyst = await db.users.find_one({"email": "analyst@example.com"})
    if not analyst:
        await db.users.insert_one({
            "name": "Analyst User", "email": "analyst@example.com",
            "password_hash": hash_password("analyst123"),
            "role": "analyst", "status": "active",
            "created_at": now, "updated_at": now,
        })
        logger.info("Analyst user seeded")
    
    viewer = await db.users.find_one({"email": "viewer@example.com"})
    if not viewer:
        await db.users.insert_one({
            "name": "Viewer User", "email": "viewer@example.com",
            "password_hash": hash_password("viewer123"),
            "role": "viewer", "status": "active",
            "created_at": now, "updated_at": now,
        })
        logger.info("Viewer user seeded")
    
    # Seed financial records
    count = await db.financial_records.count_documents({})
    if count == 0:
        for record in SEED_RECORDS:
            record["created_by"] = admin_id
            record["is_deleted"] = False
            record["created_at"] = now
            record["updated_at"] = now
        await db.financial_records.insert_many(SEED_RECORDS)
        logger.info(f"Seeded {len(SEED_RECORDS)} financial records")
    
    # Write test credentials
    os.makedirs("memory", exist_ok=True)
    with open("memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write("## Users\n\n")
        f.write("| Role | Email | Password |\n")
        f.write("|------|-------|----------|\n")
        f.write(f"| Admin | {admin_email} | {admin_password} |\n")
        f.write("| Analyst | analyst@example.com | analyst123 |\n")
        f.write("| Viewer | viewer@example.com | viewer123 |\n\n")
        f.write("## Auth Endpoints\n\n")
        f.write("- POST /api/auth/register\n")
        f.write("- POST /api/auth/login\n")
        f.write("- POST /api/auth/logout\n")
        f.write("- GET /api/auth/me\n")
        f.write("- POST /api/auth/refresh\n\n")
        f.write("## API Endpoints\n\n")
        f.write("- GET /api/records (Admin, Analyst)\n")
        f.write("- POST /api/records (Admin)\n")
        f.write("- PUT /api/records/{id} (Admin)\n")
        f.write("- DELETE /api/records/{id} (Admin)\n")
        f.write("- GET /api/dashboard/summary (All)\n")
        f.write("- GET /api/dashboard/categories (All)\n")
        f.write("- GET /api/dashboard/trends (All)\n")
        f.write("- GET /api/dashboard/recent (All)\n")
        f.write("- GET /api/users (Admin)\n")
        f.write("- PUT /api/users/{id} (Admin)\n")
        f.write("- DELETE /api/users/{id} (Admin)\n")
    logger.info("Test credentials written")

@app.on_event("shutdown")
async def shutdown():
    client.close()
