
import requests

def test_register():
    url = "http://localhost:8000/api/auth/register"
    data = {
        "name": "Test User",
        "email": "test_sms_integration@example.com",
        "phone_number": "+919876543210",
        "password": "password123",
        "role": "individual"
    }
    try:
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_register()
