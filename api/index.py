import sys
import os

# Ensure root directory is accessible by Python interpreter on Vercel
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from app import app

# Vercel looks for the 'app' WSGI callable in api/index.py
if __name__ == "__main__":
    app.run()
