#!/usr/bin/env python3
"""
Quick smoke test for chat endpoint - verifies broken pipe is fixed
"""
import requests
import json

def test_chat_endpoint():
    """Test that chat endpoint works with simple query"""
    url = "http://127.0.0.1:8012/api/chat"
    payload = {
        "question": "hello",
        "repo": "agro"
    }

    print(f"Testing {url} with payload: {json.dumps(payload, indent=2)}")

    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            answer = data.get("answer", "")
            event_id = data.get("event_id")

            print(f"✅ Chat endpoint working!")
            print(f"Answer preview: {answer[:200]}...")
            print(f"Event ID: {event_id}")

            # Check for error messages in answer
            if "Error" in answer or "Broken pipe" in answer or "[Errno" in answer:
                print(f"❌ Error in answer: {answer}")
                return False
            return True
        else:
            print(f"❌ HTTP {response.status_code}: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

if __name__ == "__main__":
    success = test_chat_endpoint()
    exit(0 if success else 1)
