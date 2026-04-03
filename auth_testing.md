# Auth Testing Playbook

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | admin123 |
| Analyst | analyst@example.com | analyst123 |
| Viewer | viewer@example.com | viewer123 |

## Step 1: MongoDB Verification
```bash
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {password_hash: 1})
```
Verify: bcrypt hash starts with `$2b$`, indexes exist on users.email (unique), login_attempts.identifier.

## Step 2: API Testing
```bash
# Login as admin
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Check cookies
cat cookies.txt

# Get current user
curl -b cookies.txt http://localhost:8001/api/auth/me

# Get dashboard summary
curl -b cookies.txt http://localhost:8001/api/dashboard/summary

# Get records
curl -b cookies.txt http://localhost:8001/api/records

# Logout
curl -b cookies.txt -X POST http://localhost:8001/api/auth/logout
```

## Step 3: RBAC Testing
```bash
# Login as viewer
curl -c viewer_cookies.txt -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"viewer@example.com","password":"viewer123"}'

# Viewer should NOT access records
curl -b viewer_cookies.txt http://localhost:8001/api/records
# Expected: 403

# Viewer CAN access dashboard
curl -b viewer_cookies.txt http://localhost:8001/api/dashboard/summary
# Expected: 200

# Viewer should NOT access users
curl -b viewer_cookies.txt http://localhost:8001/api/users
# Expected: 403
```

## Auth Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/refresh
