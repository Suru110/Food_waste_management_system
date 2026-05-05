
import asyncio
import httpx
import os
import sys

# Add the backend path to sys.path so we can import app
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.sms import send_sms

async def test_sms():
    print("Testing SMS...")
    # You might want to use a real phone number here if you want to test for real
    # But for now, let's just see if the API responds correctly
    result = await send_sms(["+911234567890"], "Test message from Food Waste app")
    print(f"SMS result: {result}")

if __name__ == "__main__":
    asyncio.run(test_sms())
