import sys, os

# Resolve paths relative to this file's location
BASE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(BASE, "backend")

os.chdir(BACKEND)
sys.path.insert(0, BACKEND)

from app import app
app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
