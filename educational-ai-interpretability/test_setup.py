import os
from dotenv import load_dotenv
import openai

# Load environment variables
load_dotenv()

# Check API key
api_key = os.getenv("OPENAI_API_KEY")
if api_key:
    print("✅ API key loaded successfully")
else:
    print("❌ API key not found. Check your .env file")

# Test OpenAI connection
try:
    client = openai.OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": "Say 'Setup successful!' in one word."}],
        max_tokens=10
    )
    print(f"✅ OpenAI API works: {response.choices[0].message.content}")
except Exception as e:
    print(f"❌ OpenAI API error: {e}")

# Test imports
try:
    import textstat
    import nltk
    import pandas
    import matplotlib
    import seaborn
    print("✅ All required packages installed")
except ImportError as e:
    print(f"❌ Missing package: {e}")
