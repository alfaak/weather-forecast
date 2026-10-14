# 🌦️ SkyPulse — Precision GPS Weather Forecasting Platform

A weather forecasting web application built with pure **Python Flask**, featuring real-time **HTML5 GPS tracking**, interactive atmospheric telemetry, hourly and 7-day forecasts, air quality index, and **Vercel Serverless ready** deployment.

---

## ✨ Features

- 🛰️ **Live GPS Location Tracking**:
  - HTML5 Geolocation API with user permission prompts and permission denial handling.
  - Reverse geocoding of coordinates into human-readable City, State/Province, and Country.
  - Real-time GPS accuracy display (e.g. `± 8m accuracy`) and pulsing radar indicator.
  - **Live GPS Watch Mode**: Continuously monitors device movement and automatically updates forecast telemetry as you move.
- 🔍 **Global City Search with Autocomplete**:
  - Instant fuzzy search across any city or region in the world with state and country labels.
  - Keyboard navigation (arrows + Enter) for quick lookup.
- 📊 **24-Hour Timeline & Interactive Chart**:
  - Switch between a scrollable hourly card carousel and a smooth temperature & precipitation probability spline chart.
- 📅 **7-Day Extended Outlook**:
  - Day-by-day forecast with custom weather condition badges, rain chance indicators, and relative thermal spectrum bars.
- 🧩 **Atmospheric Highlights Matrix (Bento Box)**:
  - **Air Quality Index (US AQI)**: Color-coded rating with PM2.5, PM10, Ozone (O₃), and NO₂ breakdown.
  - **UV Radiation Meter**: Real-time UV intensity dial and sun protection guidance.
  - **Wind & Compass Radar**: Live compass dial pointing towards exact wind direction, with speed and wind gusts.
  - **Solar Arc**: Sunrise, sunset, and solar progress curve visualization.
  - **Humidity & Dew Point**: Visual droplet meter and comfort zone classification.
  - **Atmospheric Clarity**: Visibility distance and cloud cover percentage.
- ⚡ **Dynamic Weather Themes & Canvas**:
  - Animated canvas backdrop that reacts to current weather conditions (sunny clear day, starry night sky, rain showers, snowfall, thunderstorm).
- 🌡️ **Unit Switcher & Saved Favorites**:
  - 1-click toggle between Celsius (°C) and Fahrenheit (°F).
  - Bookmark locations to your saved favorites bar stored in `localStorage`.

---

## 📁 Project Structure

```text
weather-app/
├── .venv/                 # Dedicated Python virtual environment
├── api/
│   └── index.py           # Vercel Serverless Function entry point
├── static/
│   ├── css/
│   │   └── style.css      # Modern Glassmorphic design system & themes
│   └── js/
│       └── app.js         # Geolocation, GPS watch, Chart & UI controller
├── templates/
│   └── index.html         # Semantic HTML5 dashboard template
├── app.py                 # Core Flask backend with API routes
├── requirements.txt       # Python dependencies (Flask, requests)
├── vercel.json            # Vercel deployment & build configuration
├── .vercelignore          # Excludes .venv and cache from deployment
├── .gitignore             # Standard git ignore
└── README.md              # Project documentation
```

---

## 🚀 Local Development (Using Dedicated `.venv`)

A dedicated virtual environment has already been created in `.venv/`.

### 1. Activate the Virtual Environment

**Windows (PowerShell):**
```powershell
.\.venv\Scripts\Activate.ps1
```

**Windows (Command Prompt):**
```cmd
.\.venv\Scripts\activate.bat
```

**macOS / Linux:**
```bash
source .venv/bin/activate
```

### 2. Install Dependencies (if not already installed)
```bash
pip install -r requirements.txt
```

### 3. Run the Flask Development Server
```bash
python app.py
```

Open your browser and navigate to:
```text
http://127.0.0.1:5000
```

When prompted, click **"Allow"** on the browser location permission pop-up to test live GPS tracking!

---

## ☁️ Vercel Deployment

This project is configured out-of-the-box for **Vercel Serverless Functions**.

### Option A: Deploy via Vercel CLI

1. Install the Vercel CLI (if not already installed):
   ```bash
   npm install -g vercel
   ```
2. Run deployment from the project root:
   ```bash
   vercel
   ```
3. For production release:
   ```bash
   vercel --prod
   ```

### Option B: Deploy via GitHub & Vercel Dashboard

1. Push this project repository to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of SkyPulse Weather App"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Vercel will automatically detect `vercel.json` and deploy `api/index.py` with static assets bundled.
5. Click **Deploy** — your live weather web app will be live on `https://<your-project>.vercel.app` in under 60 seconds!

---

## 📡 API Reference

| Endpoint | Method | Parameters | Description |
|---|---|---|---|
| `/` | `GET` | — | Serves the main web dashboard |
| `/api/weather` | `GET` | `lat`, `lon`, `temp_unit`, `wind_unit` | Fetches current, hourly, 7-day forecast, and air quality |
| `/api/geocode` | `GET` | `q` | Real-time city search autocomplete |
| `/api/reverse-geocode` | `GET` | `lat`, `lon` | Resolves GPS coordinates into city & country |
| `/api/health` | `GET` | — | Health check endpoint for uptime monitoring |

---

## 🔒 Privacy & Permissions

- Location permissions requested via the HTML5 Geolocation API are processed entirely on client request to look up localized weather coordinates.
- No personal user location data is persistently stored on any external database.
