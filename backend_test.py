#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class FinanceDashboardTester:
    def __init__(self, base_url: str = "https://fiscal-control-sys.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test credentials from /app/memory/test_credentials.md
        self.credentials = {
            'admin': {'email': 'admin@example.com', 'password': 'admin123'},
            'analyst': {'email': 'analyst@example.com', 'password': 'analyst123'},
            'viewer': {'email': 'viewer@example.com', 'password': 'viewer123'}
        }

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            'name': name,
            'success': success,
            'details': details,
            'response_data': response_data
        })

    def make_request(self, method: str, endpoint: str, data: Dict = None, expected_status: int = 200, 
                    use_session: bool = True) -> tuple[bool, Dict]:
        """Make HTTP request and validate response"""
        url = f"{self.base_url}/api{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if use_session:
                if method == 'GET':
                    response = self.session.get(url, headers=headers)
                elif method == 'POST':
                    response = self.session.post(url, json=data, headers=headers)
                elif method == 'PUT':
                    response = self.session.put(url, json=data, headers=headers)
                elif method == 'DELETE':
                    response = self.session.delete(url, headers=headers)
            else:
                # Use requests without session for non-authenticated calls
                if method == 'GET':
                    response = requests.get(url, headers=headers)
                elif method == 'POST':
                    response = requests.post(url, json=data, headers=headers)
                elif method == 'PUT':
                    response = requests.put(url, json=data, headers=headers)
                elif method == 'DELETE':
                    response = requests.delete(url, headers=headers)
            
            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            return success, response_data
            
        except Exception as e:
            return False, {"error": str(e)}

    def test_health_check(self):
        """Test health endpoint"""
        success, data = self.make_request('GET', '/health', use_session=False)
        self.log_test("Health Check", success and data.get('status') == 'healthy', 
                     f"Status: {data.get('status', 'unknown')}", data)

    def test_login(self, role: str) -> bool:
        """Test login for specific role"""
        creds = self.credentials[role]
        success, data = self.make_request('POST', '/auth/login', creds, use_session=False)
        
        if success and 'id' in data and 'role' in data:
            # Copy cookies to session for subsequent requests
            login_response = requests.post(f"{self.base_url}/api/auth/login", json=creds)
            if login_response.status_code == 200:
                self.session.cookies.update(login_response.cookies)
            
            self.log_test(f"Login as {role}", True, f"User ID: {data.get('id')}, Role: {data.get('role')}", data)
            return True
        else:
            self.log_test(f"Login as {role}", False, f"Response: {data}", data)
            return False

    def test_auth_me(self, expected_role: str):
        """Test /auth/me endpoint"""
        success, data = self.make_request('GET', '/auth/me')
        role_match = data.get('role') == expected_role
        self.log_test(f"Auth Me ({expected_role})", success and role_match, 
                     f"Expected role: {expected_role}, Got: {data.get('role')}", data)

    def test_logout(self):
        """Test logout"""
        success, data = self.make_request('POST', '/auth/logout')
        self.log_test("Logout", success and data.get('message') == 'Logged out', 
                     f"Message: {data.get('message')}", data)

    def test_dashboard_endpoints(self, role: str):
        """Test dashboard endpoints (accessible to all roles)"""
        endpoints = [
            ('/dashboard/summary', 'Dashboard Summary'),
            ('/dashboard/categories', 'Dashboard Categories'),
            ('/dashboard/trends', 'Dashboard Trends'),
            ('/dashboard/recent', 'Dashboard Recent')
        ]
        
        for endpoint, name in endpoints:
            success, data = self.make_request('GET', endpoint)
            self.log_test(f"{name} ({role})", success, f"Data keys: {list(data.keys()) if isinstance(data, dict) else 'Invalid response'}", data)

    def test_records_access(self, role: str, should_have_access: bool):
        """Test records endpoint access based on role"""
        success, data = self.make_request('GET', '/records/', expected_status=200 if should_have_access else 403)
        
        if should_have_access:
            has_records = success and 'records' in data
            self.log_test(f"Records Access ({role})", has_records, 
                         f"Records count: {len(data.get('records', []))}", data)
        else:
            # For access denied, we expect success=True when we get the expected 403 status
            access_denied = success and data.get('detail') == 'Insufficient permissions'
            self.log_test(f"Records Access Denied ({role})", access_denied, 
                         f"Got 403 with detail: {data.get('detail')}", data)

    def test_users_access(self, role: str, should_have_access: bool):
        """Test users endpoint access (admin only)"""
        success, data = self.make_request('GET', '/users/', expected_status=200 if should_have_access else 403)
        
        if should_have_access:
            has_users = success and 'users' in data
            self.log_test(f"Users Access ({role})", has_users, 
                         f"Users count: {len(data.get('users', []))}", data)
        else:
            # For access denied, we expect success=True when we get the expected 403 status
            access_denied = success and data.get('detail') == 'Insufficient permissions'
            self.log_test(f"Users Access Denied ({role})", access_denied, 
                         f"Got 403 with detail: {data.get('detail')}", data)

    def test_record_crud_operations(self):
        """Test CRUD operations for records (admin only)"""
        # Test create record
        new_record = {
            "amount": 100.50,
            "type": "expense",
            "category": "Testing",
            "date": "2026-01-15",
            "description": "Test record for automation"
        }
        
        success, data = self.make_request('POST', '/records/', new_record, expected_status=200)
        record_id = data.get('id') if success else None
        self.log_test("Create Record", success and record_id is not None, 
                     f"Created record ID: {record_id}", data)
        
        if record_id:
            # Test get specific record
            success, data = self.make_request('GET', f'/records/{record_id}')
            self.log_test("Get Record", success and data.get('id') == record_id, 
                         f"Retrieved record: {data.get('description')}", data)
            
            # Test update record
            update_data = {"description": "Updated test record"}
            success, data = self.make_request('PUT', f'/records/{record_id}', update_data)
            self.log_test("Update Record", success and data.get('description') == update_data['description'], 
                         f"Updated description: {data.get('description')}", data)
            
            # Test delete record (soft delete)
            success, data = self.make_request('DELETE', f'/records/{record_id}')
            self.log_test("Delete Record", success and data.get('message') == 'Record deleted', 
                         f"Delete message: {data.get('message')}", data)

    def test_user_management_operations(self):
        """Test user management operations (admin only)"""
        # Get all users first
        success, data = self.make_request('GET', '/users/')
        if not success or 'users' not in data:
            self.log_test("Get Users for Management", False, "Could not retrieve users list")
            return
        
        users = data['users']
        test_user = None
        
        # Find a non-admin user to test with
        for user in users:
            if user['role'] != 'admin':
                test_user = user
                break
        
        if test_user:
            user_id = test_user['id']
            original_role = test_user['role']
            
            # Test update user role
            new_role = 'viewer' if original_role != 'viewer' else 'analyst'
            update_data = {"role": new_role}
            success, data = self.make_request('PUT', f'/users/{user_id}', update_data)
            self.log_test("Update User Role", success and data.get('role') == new_role, 
                         f"Changed role from {original_role} to {data.get('role')}", data)
            
            # Restore original role
            restore_data = {"role": original_role}
            success, data = self.make_request('PUT', f'/users/{user_id}', restore_data)
            self.log_test("Restore User Role", success and data.get('role') == original_role, 
                         f"Restored role to {data.get('role')}", data)

    def test_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime("%H%M%S")
        new_user = {
            "name": f"Test User {timestamp}",
            "email": f"test{timestamp}@example.com",
            "password": "testpass123"
        }
        
        success, data = self.make_request('POST', '/auth/register', new_user, use_session=False)
        self.log_test("User Registration", success and data.get('role') == 'viewer', 
                     f"Registered user: {data.get('email')} with role: {data.get('role')}", data)

    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🚀 Starting Finance Dashboard API Tests")
        print("=" * 50)
        
        # Test health check
        self.test_health_check()
        
        # Test registration
        self.test_registration()
        
        # Test each role
        for role in ['admin', 'analyst', 'viewer']:
            print(f"\n📋 Testing {role.upper()} role:")
            
            # Login
            if not self.test_login(role):
                continue
            
            # Test auth/me
            self.test_auth_me(role)
            
            # Test dashboard endpoints (all roles should have access)
            self.test_dashboard_endpoints(role)
            
            # Test records access
            should_access_records = role in ['admin', 'analyst']
            self.test_records_access(role, should_access_records)
            
            # Test users access (admin only)
            should_access_users = role == 'admin'
            self.test_users_access(role, should_access_users)
            
            # Test CRUD operations (admin only)
            if role == 'admin':
                print(f"\n🔧 Testing CRUD operations:")
                self.test_record_crud_operations()
                self.test_user_management_operations()
            
            # Logout
            self.test_logout()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = FinanceDashboardTester()
    return tester.run_comprehensive_test()

if __name__ == "__main__":
    sys.exit(main())