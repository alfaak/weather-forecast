import os
import requests
from flask import Flask, render_template, request, jsonify

# Configure base directory for Vercel / local compatibility
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, 'templates'),
    static_folder=os.path.join(BASE_DIR, 'static')
)

# Open-Meteo WMO Weather interpretation codes
WMO_CODES = {
    0: {"label": "Clear Sky", "icon": "sun", "theme": "clear"},
    1: {"label": "Mainly Clear", "icon": "sun-cloud", "theme": "partly-cloudy"},
    2: {"label": "Partly Cloudy", "icon": "cloud-sun", "theme": "partly-cloudy"},
    3: {"label": "Overcast", "icon": "cloud", "theme": "cloudy"},
    45: {"label": "Foggy", "icon": "fog", "theme": "fog"},
    48: {"label": "Depositing Rime Fog", "icon": "fog", "theme": "fog"},
    51: {"label": "Light Drizzle", "icon": "cloud-drizzle", "theme": "rain"},
    53: {"label": "Moderate Drizzle", "icon": "cloud-drizzle", "theme": "rain"},
    55: {"label": "Dense Drizzle", "icon": "cloud-drizzle", "theme": "rain"},
    56: {"label": "Freezing Drizzle", "icon": "cloud-sleet", "theme": "snow"},
    57: {"label": "Dense Freezing Drizzle", "icon": "cloud-sleet", "theme": "snow"},
    61: {"label": "Slight Rain", "icon": "cloud-rain", "theme": "rain"},
    63: {"label": "Moderate Rain", "icon": "cloud-rain", "theme": "rain"},
    65: {"label": "Heavy Rain", "icon": "cloud-heavy-rain", "theme": "rain"},
    66: {"label": "Light Freezing Rain", "icon": "cloud-sleet", "theme": "snow"},
    67: {"label": "Heavy Freezing Rain", "icon": "cloud-sleet", "theme": "snow"},
    71: {"label": "Slight Snow", "icon": "snowflake", "theme": "snow"},
    73: {"label": "Moderate Snow", "icon": "snowflake", "theme": "snow"},
    75: {"label": "Heavy Snow", "icon": "snowflake", "theme": "snow"},
    77: {"label": "Snow Grains", "icon": "snowflake", "theme": "snow"},
    80: {"label": "Slight Rain Showers", "icon": "cloud-rain", "theme": "rain"},
    81: {"label": "Moderate Rain Showers", "icon": "cloud-rain", "theme": "rain"},
    82: {"label": "Violent Rain Showers", "icon": "cloud-lightning-rain", "theme": "rain"},
    85: {"label": "Slight Snow Showers", "icon": "cloud-snow", "theme": "snow"},
    86: {"label": "Heavy Snow Showers", "icon": "cloud-snow", "theme": "snow"},
    95: {"label": "Thunderstorm", "icon": "cloud-lightning", "theme": "thunderstorm"},
    96: {"label": "Thunderstorm with Slight Hail", "icon": "cloud-lightning", "theme": "thunderstorm"},
    99: {"label": "Thunderstorm with Heavy Hail", "icon": "cloud-lightning", "theme": "thunderstorm"},
}

def get_wmo_details(code, is_day=1):
    details = WMO_CODES.get(code, {"label": "Unknown", "icon": "cloud", "theme": "cloudy"})
    icon = details["icon"]
    theme = details["theme"]

    # Adjust icon and theme for night
    if not is_day:
        if icon == "sun":
            icon = "moon"
            theme = "clear-night"
        elif icon in ("sun-cloud", "cloud-sun"):
            icon = "cloud-moon"
            theme = "cloudy-night"

    return {
        "code": code,
        "label": details["label"],
        "icon": icon,
        "theme": theme
    }

def get_aqi_descriptor(us_aqi):
    if us_aqi is None:
        return {"status": "Unknown", "color": "#94a3b8", "level": "N/A"}
    if us_aqi <= 50:
        return {"status": "Good", "color": "#10b981", "level": "Low"}
    elif us_aqi <= 100:
        return {"status": "Moderate", "color": "#f59e0b", "level": "Moderate"}
    elif us_aqi <= 150:
        return {"status": "Unhealthy for Sensitive Groups", "color": "#f97316", "level": "High"}
    elif us_aqi <= 200:
        return {"status": "Unhealthy", "color": "#ef4444", "level": "Very High"}
    elif us_aqi <= 300:
        return {"status": "Very Unhealthy", "color": "#8b5cf6", "level": "Severe"}
    else:
        return {"status": "Hazardous", "color": "#7c2d12", "level": "Hazardous"}

def get_uv_descriptor(uv):
    if uv is None:
        return {"category": "Unknown", "advice": "No advisory available"}
    if uv <= 2:
        return {"category": "Low", "advice": "No protection required."}
    elif uv <= 5:
        return {"category": "Moderate", "advice": "Wear sunglasses & sunscreen."}
    elif uv <= 7:
        return {"category": "High", "advice": "Cover up, hat & sunglasses."}
    elif uv <= 10:
        return {"category": "Very High", "advice": "Avoid sun during midday hours."}
    else:
        return {"category": "Extreme", "advice": "Take full precautions, stay indoors."}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/weather")
def weather():
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)
    temperature_unit = request.args.get("temp_unit", default="celsius").lower()
    wind_speed_unit = request.args.get("wind_unit", default="kmh").lower()

    if lat is None or lon is None:
        return jsonify({"error": "Latitude and Longitude query parameters are required"}), 400

    if temperature_unit not in ("celsius", "fahrenheit"):
        temperature_unit = "celsius"
    if wind_speed_unit not in ("kmh", "mph"):
        wind_speed_unit = "kmh"

    # 1. Fetch Forecast from Open-Meteo
    weather_url = "https://api.open-meteo.com/v1/forecast"
    weather_params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
        "hourly": "temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,surface_pressure,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,uv_index,is_day",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max",
        "timezone": "auto",
        "temperature_unit": temperature_unit,
        "wind_speed_unit": wind_speed_unit,
    }

    try:
        w_res = requests.get(weather_url, params=weather_params, timeout=8)
        w_res.raise_for_status()
        weather_data = w_res.json()
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve weather data: {str(e)}"}), 502

    # 2. Fetch Air Quality
    air_quality_data = {}
    try:
        aq_url = "https://air-quality-api.open-meteo.com/v1/air-quality"
        aq_params = {
            "latitude": lat,
            "longitude": lon,
            "current": "european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone",
            "timezone": "auto"
        }
        aq_res = requests.get(aq_url, params=aq_params, timeout=5)
        if aq_res.ok:
            air_quality_data = aq_res.json().get("current", {})
    except Exception:
        # Air quality is non-blocking fallback
        air_quality_data = {}

    current_raw = weather_data.get("current", {})
    hourly_raw = weather_data.get("hourly", {})
    daily_raw = weather_data.get("daily", {})

    is_day = current_raw.get("is_day", 1)
    weather_code = current_raw.get("weather_code", 0)
    wmo_info = get_wmo_details(weather_code, is_day)

    # Calculate Current UV from hourly data matching current hour
    current_uv = None
    if "hourly" in weather_data and "time" in hourly_raw and "uv_index" in hourly_raw:
        current_time_str = current_raw.get("time")
        if current_time_str:
            times = hourly_raw.get("time", [])
            for i, t in enumerate(times):
                if t.startswith(current_time_str[:13]):  # match YYYY-MM-DDTHH
                    current_uv = hourly_raw.get("uv_index", [])[i]
                    break
        if current_uv is None and daily_raw.get("uv_index_max"):
            current_uv = daily_raw["uv_index_max"][0]

    # Structure Clean Hourly (Next 24 hours)
    hourly_list = []
    if "time" in hourly_raw:
        times = hourly_raw["time"]
        temps = hourly_raw.get("temperature_2m", [])
        precip_prob = hourly_raw.get("precipitation_probability", [])
        codes = hourly_raw.get("weather_code", [])
        is_day_list = hourly_raw.get("is_day", [])
        winds = hourly_raw.get("wind_speed_10m", [])
        wind_dirs = hourly_raw.get("wind_direction_10m", [])

        # Find current hour index
        current_hour_prefix = current_raw.get("time", "")[:13]
        start_idx = 0
        for idx, t in enumerate(times):
            if t.startswith(current_hour_prefix):
                start_idx = idx
                break

        for i in range(start_idx, min(start_idx + 24, len(times))):
            h_code = codes[i] if i < len(codes) else 0
            h_day = is_day_list[i] if i < len(is_day_list) else 1
            hourly_list.append({
                "time": times[i],
                "temp": temps[i] if i < len(temps) else None,
                "precip_prob": precip_prob[i] if i < len(precip_prob) else 0,
                "wind_speed": winds[i] if i < len(winds) else 0,
                "wind_direction": wind_dirs[i] if i < len(wind_dirs) else 0,
                "weather": get_wmo_details(h_code, h_day)
            })

    # Structure Clean Daily (7-10 Days)
    daily_list = []
    if "time" in daily_raw:
        d_times = daily_raw["time"]
        max_temps = daily_raw.get("temperature_2m_max", [])
        min_temps = daily_raw.get("temperature_2m_min", [])
        d_codes = daily_raw.get("weather_code", [])
        sunrises = daily_raw.get("sunrise", [])
        sunsets = daily_raw.get("sunset", [])
        d_precip_prob = daily_raw.get("precipitation_probability_max", [])
        d_precip_sum = daily_raw.get("precipitation_sum", [])
        d_uv_max = daily_raw.get("uv_index_max", [])
        d_wind_max = daily_raw.get("wind_speed_10m_max", [])

        for i in range(len(d_times)):
            d_code = d_codes[i] if i < len(d_codes) else 0
            daily_list.append({
                "date": d_times[i],
                "temp_max": max_temps[i] if i < len(max_temps) else None,
                "temp_min": min_temps[i] if i < len(min_temps) else None,
                "weather": get_wmo_details(d_code, 1),
                "sunrise": sunrises[i] if i < len(sunrises) else None,
                "sunset": sunsets[i] if i < len(sunsets) else None,
                "precip_prob": d_precip_prob[i] if i < len(d_precip_prob) else 0,
                "precip_sum": d_precip_sum[i] if i < len(d_precip_sum) else 0,
                "uv_max": d_uv_max[i] if i < len(d_uv_max) else 0,
                "wind_speed_max": d_wind_max[i] if i < len(d_wind_max) else 0
            })

    # Air quality breakdown
    us_aqi = air_quality_data.get("us_aqi")
    aqi_info = get_aqi_descriptor(us_aqi)

    # Current Visibility from hourly at start_idx
    visibility_m = None
    if "visibility" in hourly_raw and len(hourly_raw["visibility"]) > 0:
        visibility_m = hourly_raw["visibility"][0]

    # Current Dew Point from hourly
    dew_point = None
    if "dew_point_2m" in hourly_raw and len(hourly_raw["dew_point_2m"]) > 0:
        dew_point = hourly_raw["dew_point_2m"][0]

    response_payload = {
        "coordinates": {"latitude": lat, "longitude": lon},
        "elevation": weather_data.get("elevation", 0),
        "timezone": weather_data.get("timezone", "UTC"),
        "timezone_abbreviation": weather_data.get("timezone_abbreviation", ""),
        "units": {
            "temp": "°C" if temperature_unit == "celsius" else "°F",
            "wind": "km/h" if wind_speed_unit == "kmh" else "mph",
            "pressure": "hPa",
            "humidity": "%",
            "visibility": "km" if wind_speed_unit == "kmh" else "mi"
        },
        "current": {
            "time": current_raw.get("time"),
            "temp": current_raw.get("temperature_2m"),
            "apparent_temp": current_raw.get("apparent_temperature"),
            "humidity": current_raw.get("relative_humidity_2m"),
            "pressure": current_raw.get("pressure_msl") or current_raw.get("surface_pressure"),
            "cloud_cover": current_raw.get("cloud_cover"),
            "precipitation": current_raw.get("precipitation"),
            "wind_speed": current_raw.get("wind_speed_10m"),
            "wind_direction": current_raw.get("wind_direction_10m"),
            "wind_gusts": current_raw.get("wind_gusts_10m"),
            "is_day": is_day,
            "weather": wmo_info,
            "uv_index": current_uv,
            "uv_details": get_uv_descriptor(current_uv),
            "visibility": round(visibility_m / 1000, 1) if visibility_m is not None else None,
            "dew_point": dew_point,
            "temp_max": daily_list[0]["temp_max"] if daily_list else None,
            "temp_min": daily_list[0]["temp_min"] if daily_list else None,
            "sunrise": daily_list[0]["sunrise"] if daily_list else None,
            "sunset": daily_list[0]["sunset"] if daily_list else None
        },
        "air_quality": {
            "us_aqi": us_aqi,
            "european_aqi": air_quality_data.get("european_aqi"),
            "pm2_5": air_quality_data.get("pm2_5"),
            "pm10": air_quality_data.get("pm10"),
            "co": air_quality_data.get("carbon_monoxide"),
            "no2": air_quality_data.get("nitrogen_dioxide"),
            "o3": air_quality_data.get("ozone"),
            "so2": air_quality_data.get("sulphur_dioxide"),
            "details": aqi_info
        },
        "hourly": hourly_list,
        "daily": daily_list
    }

    return jsonify(response_payload)

@app.route("/api/geocode")
def geocode():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify([])

    geocode_url = "https://geocoding-api.open-meteo.com/v1/search"
    params = {
        "name": query,
        "count": 8,
        "language": "en",
        "format": "json"
    }

    try:
        res = requests.get(geocode_url, params=params, timeout=6)
        res.raise_for_status()
        data = res.json()
        results = []
        for item in data.get("results", []):
            name = item.get("name")
            admin1 = item.get("admin1", "")
            country = item.get("country", "")
            country_code = item.get("country_code", "")

            # Format descriptive label
            parts = [name]
            if admin1 and admin1 != name:
                parts.append(admin1)
            if country:
                parts.append(country)
            display_name = ", ".join(parts)

            results.append({
                "id": item.get("id"),
                "name": name,
                "admin1": admin1,
                "country": country,
                "country_code": country_code,
                "display_name": display_name,
                "latitude": item.get("latitude"),
                "longitude": item.get("longitude"),
                "timezone": item.get("timezone", "UTC"),
                "elevation": item.get("elevation", 0)
            })
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": f"Geocoding failed: {str(e)}"}), 502

@app.route("/api/reverse-geocode")
def reverse_geocode():
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)

    if lat is None or lon is None:
        return jsonify({"error": "Latitude and Longitude are required"}), 400

    # Try BigDataCloud free client reverse geocoder first
    try:
        url = "https://api.bigdatacloud.net/data/reverse-geocode-client"
        params = {"latitude": lat, "longitude": lon, "localityLanguage": "en"}
        res = requests.get(url, params=params, timeout=5)
        if res.ok:
            data = res.json()
            city = data.get("locality") or data.get("city") or data.get("principalSubdivision") or "Current Location"
            subdivision = data.get("principalSubdivision", "")
            country = data.get("countryName", "")
            country_code = data.get("countryCode", "")

            parts = [city]
            if subdivision and subdivision != city:
                parts.append(subdivision)
            if country:
                parts.append(country)

            return jsonify({
                "city": city,
                "state": subdivision,
                "country": country,
                "country_code": country_code,
                "display_name": ", ".join(parts),
                "latitude": lat,
                "longitude": lon
            })
    except Exception:
        pass

    # Fallback response
    return jsonify({
        "city": f"{lat:.2f}°, {lon:.2f}°",
        "state": "",
        "country": "",
        "country_code": "",
        "display_name": f"Coordinates: {lat:.3f}, {lon:.3f}",
        "latitude": lat,
        "longitude": lon
    })

@app.route("/api/health")
def health():
    return jsonify({"status": "healthy", "service": "SkyPulse Weather API"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
