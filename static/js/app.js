/**
 * SkyPulse Weather App - Frontend Controller
 * Pure Vanilla JavaScript with HTML5 Geolocation API & Canvas Visualizations
 */

// Application State
const state = {
  currentLat: null,
  currentLon: null,
  currentLocationName: 'Detecting...',
  tempUnit: localStorage.getItem('skypulse_temp_unit') || 'celsius',
  windUnit: localStorage.getItem('skypulse_wind_unit') || 'kmh',
  isGpsActive: false,
  isWatchMode: false,
  watchId: null,
  weatherData: null,
  hourlyView: 'cards', // 'cards' | 'chart'
  favorites: JSON.parse(localStorage.getItem('skypulse_favorites') || '[]'),
};

// DOM Elements
const elements = {
  // Navigation & Header
  searchInput: document.getElementById('citySearchInput'),
  searchDropdown: document.getElementById('searchDropdown'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  searchSpinner: document.getElementById('searchSpinner'),
  gpsBtn: document.getElementById('gpsLocationBtn'),
  watchBtn: document.getElementById('gpsWatchToggleBtn'),
  watchDot: document.getElementById('watchStatusDot'),
  unitToggle: document.getElementById('unitToggle'),
  refreshBtn: document.getElementById('refreshBtn'),
  refreshIcon: document.getElementById('refreshIcon'),

  // Banners & Chips
  gpsBanner: document.getElementById('gpsStatusBanner'),
  bannerTitle: document.getElementById('bannerTitle'),
  bannerDesc: document.getElementById('bannerDesc'),
  bannerGrantBtn: document.getElementById('bannerGrantBtn'),
  bannerDismissBtn: document.getElementById('bannerDismissBtn'),
  quickChipsContainer: document.getElementById('quickChipsContainer'),
  savedFavoritesContainer: document.getElementById('savedFavoritesContainer'),

  // Hero Card
  locationName: document.getElementById('currentLocationName'),
  coordsDisplay: document.getElementById('coordsDisplay'),
  accuracyTag: document.getElementById('gpsAccuracyTag'),
  gpsSignal: document.getElementById('gpsSignalIndicator'),
  saveFavBtn: document.getElementById('saveFavoriteBtn'),
  favoriteIcon: document.getElementById('favoriteIcon'),
  localTime: document.getElementById('localTimeDisplay'),
  lastUpdated: document.getElementById('lastUpdatedDisplay'),
  currentTemp: document.getElementById('currentTemp'),
  tempUnitSymbol: document.getElementById('tempUnitSymbol'),
  weatherIconContainer: document.getElementById('weatherIconContainer'),
  conditionLabel: document.getElementById('currentConditionLabel'),
  feelsLikeTemp: document.getElementById('feelsLikeTemp'),
  todayHigh: document.getElementById('todayHigh'),
  todayLow: document.getElementById('todayLow'),
  heroWind: document.getElementById('heroWind'),
  heroHumidity: document.getElementById('heroHumidity'),
  heroPressure: document.getElementById('heroPressure'),
  heroAQI: document.getElementById('heroAQI'),

  // Hourly Section
  viewHourlyCards: document.getElementById('viewHourlyCards'),
  viewHourlyChart: document.getElementById('viewHourlyChart'),
  hourlyCardsWrapper: document.getElementById('hourlyCardsWrapper'),
  hourlyCardsContainer: document.getElementById('hourlyCardsContainer'),
  hourlyChartWrapper: document.getElementById('hourlyChartWrapper'),
  tempChartCanvas: document.getElementById('tempChartCanvas'),
  chartTooltip: document.getElementById('chartTooltip'),

  // Bento Highlights
  aqiNumber: document.getElementById('aqiNumber'),
  aqiStatusTag: document.getElementById('aqiStatusTag'),
  aqiMarker: document.getElementById('aqiIndicatorMarker'),
  pm25: document.getElementById('pollutantPM25'),
  pm10: document.getElementById('pollutantPM10'),
  o3: document.getElementById('pollutantO3'),
  no2: document.getElementById('pollutantNO2'),
  uvValue: document.getElementById('uvValue'),
  uvCategoryTag: document.getElementById('uvCategoryTag'),
  uvProgressBar: document.getElementById('uvProgressBar'),
  uvAdvice: document.getElementById('uvAdvice'),
  compassNeedle: document.getElementById('compassNeedle'),
  windSpeedVal: document.getElementById('windSpeedVal'),
  windSpeedUnit: document.getElementById('windSpeedUnit'),
  windDirectionText: document.getElementById('windDirectionText'),
  windGustsVal: document.getElementById('windGustsVal'),
  solarProgress: document.getElementById('solarProgressPath'),
  sunOrb: document.getElementById('sunPositionOrb'),
  sunriseTime: document.getElementById('sunriseTime'),
  sunsetTime: document.getElementById('sunsetTime'),
  humidityVal: document.getElementById('humidityVal'),
  humidityBarFill: document.getElementById('humidityBarFill'),
  humidityStatusTag: document.getElementById('humidityStatusTag'),
  dewPointVal: document.getElementById('dewPointVal'),
  visibilityVal: document.getElementById('visibilityVal'),
  visibilityUnit: document.getElementById('visibilityUnit'),
  visibilityDesc: document.getElementById('visibilityDesc'),
  cloudCoverDesc: document.getElementById('cloudCoverDesc'),

  // Daily Outlook
  dailyList: document.getElementById('dailyForecastList'),

  // General
  loadingSkeleton: document.getElementById('loadingSkeleton'),
  weatherDashboard: document.getElementById('weatherDashboard'),
  toastContainer: document.getElementById('toastContainer'),
  weatherCanvas: document.getElementById('weatherCanvas'),
};

// Lucide icon mapping dictionary
const ICON_MAP = {
  'sun': 'sun',
  'moon': 'moon',
  'sun-cloud': 'cloud-sun',
  'cloud-sun': 'cloud-sun',
  'cloud-moon': 'cloud-moon',
  'cloud': 'cloud',
  'fog': 'cloud-fog',
  'cloud-drizzle': 'cloud-drizzle',
  'cloud-rain': 'cloud-rain',
  'cloud-heavy-rain': 'cloud-rain-wind',
  'cloud-sleet': 'cloud-snow',
  'snowflake': 'snowflake',
  'cloud-snow': 'cloud-snow',
  'cloud-lightning': 'cloud-lightning',
  'cloud-lightning-rain': 'cloud-lightning',
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  renderLucide();
  initUnitButtons();
  initEventListeners();
  renderFavoritesChips();
  initAtmosphericCanvas();

  // Try GPS Geolocation on load or fall back to last saved / default city
  checkInitialLocation();
});

// Helper: Refresh Lucide Icons safely
function renderLucide() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// Check initial location permission or last stored location
function checkInitialLocation() {
  if (navigator.geolocation) {
    // Show banner requesting GPS permission if not granted yet
    navigator.permissions?.query({ name: 'geolocation' }).then(result => {
      if (result.state === 'granted') {
        requestGpsLocation(false);
      } else if (result.state === 'prompt') {
        showGpsBanner();
        // Fallback to New York initially while user considers permission
        loadWeather(40.7128, -74.0060, 'New York, United States');
      } else {
        // Denied
        loadDefaultFallbackLocation();
      }

      result.onchange = () => {
        if (result.state === 'granted') {
          hideGpsBanner();
          requestGpsLocation(true);
        }
      };
    }).catch(() => {
      // Permission API not supported, request directly
      requestGpsLocation(false);
    });
  } else {
    loadDefaultFallbackLocation();
  }
}

function loadDefaultFallbackLocation() {
  const savedLat = localStorage.getItem('skypulse_last_lat');
  const savedLon = localStorage.getItem('skypulse_last_lon');
  const savedName = localStorage.getItem('skypulse_last_name');

  if (savedLat && savedLon) {
    loadWeather(parseFloat(savedLat), parseFloat(savedLon), savedName || 'Saved Location');
  } else {
    loadWeather(40.7128, -74.0060, 'New York, United States');
  }
}

// Request Live GPS Location using HTML5 Geolocation API
function requestGpsLocation(isUserInitiated = true) {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser', 'error');
    return;
  }

  elements.gpsBtn.classList.add('active');
  if (isUserInitiated) {
    showToast('Acquiring precise GPS location...', 'info');
  }

  const geoOptions = {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 0,
  };

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const accuracy = Math.round(position.coords.accuracy);

      state.currentLat = lat;
      state.currentLon = lon;
      state.isGpsActive = true;

      elements.gpsBtn.classList.add('active');
      elements.gpsSignal.classList.add('live');
      elements.accuracyTag.textContent = `± ${accuracy}m`;
      elements.coordsDisplay.textContent = `GPS: ${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;

      hideGpsBanner();

      // Reverse geocode coordinates to human-readable address
      try {
        const revRes = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
        if (revRes.ok) {
          const revData = await revRes.json();
          state.currentLocationName = revData.display_name || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
        }
      } catch (e) {
        state.currentLocationName = `GPS Location (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`;
      }

      await loadWeather(lat, lon, state.currentLocationName);
      if (isUserInitiated) {
        showToast('GPS position locked!', 'success');
      }
    },
    (error) => {
      elements.gpsBtn.classList.remove('active');
      elements.gpsSignal.classList.remove('live');
      elements.accuracyTag.textContent = 'GPS Off';

      let msg = 'Unable to retrieve your location.';
      if (error.code === error.PERMISSION_DENIED) {
        msg = 'Location permission was denied. You can still search for any city.';
        showGpsBanner(
          'Location Permission Denied',
          'Enable location permissions in your browser bar to unlock instant GPS live tracking.'
        );
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        msg = 'GPS signal is currently unavailable.';
      } else if (error.code === error.TIMEOUT) {
        msg = 'GPS location request timed out.';
      }

      showToast(msg, 'error');
      if (!state.currentLat) {
        loadDefaultFallbackLocation();
      }
    },
    geoOptions
  );
}

// Toggle Live GPS Watch Mode (Continuous Tracking)
function toggleGpsWatchMode() {
  if (!navigator.geolocation) {
    showToast('Continuous GPS tracking not supported by browser', 'error');
    return;
  }

  if (state.isWatchMode) {
    // Disable watch
    if (state.watchId !== null) {
      navigator.geolocation.clearWatch(state.watchId);
      state.watchId = null;
    }
    state.isWatchMode = false;
    elements.watchBtn.classList.remove('active');
    showToast('GPS live tracking disabled', 'info');
  } else {
    // Enable continuous watch
    state.isWatchMode = true;
    elements.watchBtn.classList.add('active');
    showToast('Live GPS tracking activated. Moving position will auto-update weather.', 'success');

    state.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);

        elements.accuracyTag.textContent = `± ${accuracy}m`;
        elements.coordsDisplay.textContent = `GPS: ${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;

        // Only reload if moved by more than ~100 meters
        if (state.currentLat && state.currentLon) {
          const distance = calculateDistance(state.currentLat, state.currentLon, lat, lon);
          if (distance > 0.1) {
            // > 100 meters
            state.currentLat = lat;
            state.currentLon = lon;
            loadWeather(lat, lon, state.currentLocationName, false);
            showToast('GPS position updated as you moved', 'info');
          }
        } else {
          state.currentLat = lat;
          state.currentLon = lon;
          loadWeather(lat, lon, state.currentLocationName, false);
        }
      },
      (err) => {
        console.warn('GPS watch error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
  }
}

// Haversine formula to calculate distance between coordinates in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Load Weather Data from Flask Backend API
async function loadWeather(lat, lon, locationName = null, showSkeleton = true) {
  state.currentLat = lat;
  state.currentLon = lon;
  if (locationName) {
    state.currentLocationName = locationName;
  }

  // Save as last loaded location in localStorage
  localStorage.setItem('skypulse_last_lat', lat);
  localStorage.setItem('skypulse_last_lon', lon);
  if (locationName) {
    localStorage.setItem('skypulse_last_name', locationName);
  }

  if (showSkeleton) {
    elements.loadingSkeleton.style.display = 'flex';
    elements.weatherDashboard.style.opacity = '0.3';
  }

  // Spin refresh icon
  elements.refreshIcon.classList.add('animate-spin');

  try {
    const url = `/api/weather?lat=${lat}&lon=${lon}&temp_unit=${state.tempUnit}&wind_unit=${state.windUnit}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const data = await res.json();
    state.weatherData = data;
    renderWeather(data);
  } catch (error) {
    console.error('Weather load error:', error);
    showToast(`Error loading weather: ${error.message}`, 'error');
  } finally {
    elements.loadingSkeleton.style.display = 'none';
    elements.weatherDashboard.style.opacity = '1';
    elements.refreshIcon.classList.remove('animate-spin');
  }
}

// Render Weather Data into Dashboard DOM
function renderWeather(data) {
  const current = data.current;
  const units = data.units;
  const wmo = current.weather;

  // 1. Update Hero Location & Times
  elements.locationName.textContent = state.currentLocationName || 'Selected Location';
  updateFavoriteIconState();

  if (!state.isGpsActive) {
    elements.coordsDisplay.textContent = `${data.coordinates.latitude.toFixed(2)}°, ${data.coordinates.longitude.toFixed(2)}°`;
    elements.accuracyTag.textContent = data.timezone || 'UTC';
  }

  // Current Local Time
  if (current.time) {
    const timePart = current.time.split('T')[1];
    elements.localTime.textContent = timePart ? timePart.slice(0, 5) : '--:--';
  }
  elements.lastUpdated.textContent = 'Updated just now';

  // 2. Hero Primary Temperature & Condition
  elements.currentTemp.textContent = Math.round(current.temp);
  elements.tempUnitSymbol.textContent = units.temp;
  elements.conditionLabel.textContent = wmo.label;
  elements.feelsLikeTemp.textContent = `${Math.round(current.apparent_temp)}${units.temp}`;
  elements.todayHigh.textContent = current.temp_max !== null ? `${Math.round(current.temp_max)}°` : '--°';
  elements.todayLow.textContent = current.temp_min !== null ? `${Math.round(current.temp_min)}°` : '--°';

  // Weather Icon Container
  const iconName = ICON_MAP[wmo.icon] || 'cloud';
  elements.weatherIconContainer.innerHTML = `<i data-lucide="${iconName}"></i>`;

  // Dynamic Theme update on body
  updateWeatherTheme(wmo.theme, current.is_day);

  // Hero Quick Stats
  elements.heroWind.textContent = `${Math.round(current.wind_speed)} ${units.wind}`;
  elements.heroHumidity.textContent = `${current.humidity}%`;
  elements.heroPressure.textContent = `${Math.round(current.pressure)} hPa`;

  const aqiVal = data.air_quality ? data.air_quality.us_aqi : null;
  elements.heroAQI.textContent = aqiVal !== null && aqiVal !== undefined ? `AQI ${aqiVal}` : 'AQI --';
  if (data.air_quality && data.air_quality.details) {
    elements.heroAQI.style.color = data.air_quality.details.color;
  }

  // 3. Render 24-Hour Forecast Cards & Chart
  renderHourlyCards(data.hourly, units);
  renderHourlyChart(data.hourly, units);

  // 4. Render Bento Highlights
  renderBentoHighlights(data);

  // 5. Render 7-Day Outlook
  renderDailyForecast(data.daily, units);

  // Refresh Lucide SVGs
  renderLucide();
}

// Update Theme Class on Body
function updateWeatherTheme(theme, isDay) {
  document.body.className = '';
  if (theme === 'clear') {
    document.body.classList.add(isDay ? 'theme-clear' : 'theme-clear-night');
  } else if (theme === 'rain') {
    document.body.classList.add('theme-rain');
  } else if (theme === 'thunderstorm') {
    document.body.classList.add('theme-thunderstorm');
  } else if (theme === 'snow') {
    document.body.classList.add('theme-snow');
  } else {
    document.body.classList.add(isDay ? 'theme-default' : 'theme-clear-night');
  }
}

// Render 24-Hour Hourly Forecast Carousel
function renderHourlyCards(hourlyList, units) {
  elements.hourlyCardsContainer.innerHTML = '';
  if (!hourlyList || hourlyList.length === 0) return;

  hourlyList.forEach((hour, index) => {
    const card = document.createElement('div');
    card.className = `hourly-card ${index === 0 ? 'current-hour' : ''}`;

    const timeStr = hour.time.split('T')[1]?.slice(0, 5) || '--:--';
    const iconName = ICON_MAP[hour.weather.icon] || 'cloud';
    const tempVal = hour.temp !== null ? Math.round(hour.temp) : '--';
    const precipProb = hour.precip_prob || 0;

    card.innerHTML = `
      <span class="hourly-time">${index === 0 ? 'Now' : timeStr}</span>
      <div class="hourly-icon">
        <i data-lucide="${iconName}"></i>
      </div>
      <span class="hourly-temp">${tempVal}°</span>
      <div class="hourly-precip">
        <i data-lucide="droplet"></i>
        <span>${precipProb}%</span>
      </div>
    `;

    elements.hourlyCardsContainer.appendChild(card);
  });
}

// Render Hourly Interactive Temperature Chart Canvas
function renderHourlyChart(hourlyList, units) {
  if (!hourlyList || hourlyList.length === 0) return;

  const canvas = elements.tempChartCanvas;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const padding = { top: 30, right: 30, bottom: 40, left: 30 };

  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;

  // Extract temperatures
  const points = hourlyList.map((h, i) => ({
    x: padding.left + (i / (hourlyList.length - 1)) * usableWidth,
    temp: h.temp !== null ? h.temp : 0,
    time: h.time.split('T')[1]?.slice(0, 5) || '',
    precip: h.precip_prob || 0,
    weather: h.weather.label,
  }));

  const temps = points.map(p => p.temp);
  const minTemp = Math.floor(Math.min(...temps) - 2);
  const maxTemp = Math.ceil(Math.max(...temps) + 2);
  const tempRange = Math.max(1, maxTemp - minTemp);

  // Compute Y coordinate
  points.forEach(p => {
    p.y = padding.top + usableHeight - ((p.temp - minTemp) / tempRange) * usableHeight;
  });

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw smooth gradient area under line
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height);
  gradient.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
  gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const cpX = (points[i].x + points[i + 1].x) / 2;
    ctx.bezierCurveTo(cpX, points[i].y, cpX, points[i + 1].y, points[i + 1].x, points[i + 1].y);
  }
  ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
  ctx.lineTo(points[0].x, height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw curve stroke line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const cpX = (points[i].x + points[i + 1].x) / 2;
    ctx.bezierCurveTo(cpX, points[i].y, cpX, points[i + 1].y, points[i + 1].x, points[i + 1].y);
  }
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw points & labels every 3 hours
  points.forEach((p, idx) => {
    if (idx % 3 === 0 || idx === 0 || idx === points.length - 1) {
      // Circle point
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Temperature label above
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(p.temp)}°`, p.x, p.y - 10);

      // Time label below
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 11px Plus Jakarta Sans, sans-serif';
      ctx.fillText(idx === 0 ? 'Now' : p.time, p.x, height - 15);
    }
  });

  // Hover Tooltip interaction on chart
  canvas.onmousemove = (e) => {
    const mouseX = e.offsetX;
    let closest = points[0];
    let minDist = Math.abs(mouseX - points[0].x);

    points.forEach(p => {
      const dist = Math.abs(mouseX - p.x);
      if (dist < minDist) {
        minDist = dist;
        closest = p;
      }
    });

    if (minDist < 30) {
      elements.chartTooltip.style.display = 'block';
      elements.chartTooltip.style.left = `${closest.x}px`;
      elements.chartTooltip.style.top = `${closest.y}px`;
      elements.chartTooltip.innerHTML = `
        <strong>${closest.time}</strong>: ${Math.round(closest.temp)}${units.temp}<br>
        <span style="color: #38bdf8">${closest.weather}</span> • Rain: ${closest.precip}%
      `;
    } else {
      elements.chartTooltip.style.display = 'none';
    }
  };

  canvas.onmouseleave = () => {
    elements.chartTooltip.style.display = 'none';
  };
}

// Render Bento Highlights Cards
function renderBentoHighlights(data) {
  const current = data.current;
  const aq = data.air_quality || {};
  const units = data.units;

  // 1. Air Quality
  const usAqi = aq.us_aqi;
  if (usAqi !== null && usAqi !== undefined) {
    elements.aqiNumber.textContent = usAqi;
    elements.aqiStatusTag.textContent = aq.details?.status || 'Moderate';
    elements.aqiStatusTag.style.color = aq.details?.color || '#10b981';
    elements.aqiStatusTag.style.borderColor = aq.details?.color || '#10b981';

    // Marker percent (0 to 300)
    const markerPercent = Math.min(100, Math.max(0, (usAqi / 300) * 100));
    elements.aqiMarker.style.left = `${markerPercent}%`;
  } else {
    elements.aqiNumber.textContent = '--';
    elements.aqiStatusTag.textContent = 'Unavailable';
  }

  elements.pm25.textContent = aq.pm2_5 !== undefined ? `${aq.pm2_5} µg/m³` : '--';
  elements.pm10.textContent = aq.pm10 !== undefined ? `${aq.pm10} µg/m³` : '--';
  elements.o3.textContent = aq.o3 !== undefined ? `${aq.o3} µg/m³` : '--';
  elements.no2.textContent = aq.no2 !== undefined ? `${aq.no2} µg/m³` : '--';

  // 2. UV Index
  const uv = current.uv_index;
  elements.uvValue.textContent = uv !== null && uv !== undefined ? Math.round(uv) : '--';
  elements.uvCategoryTag.textContent = current.uv_details?.category || 'Low';
  elements.uvAdvice.textContent = current.uv_details?.advice || 'No protection required.';

  const uvPercent = Math.min(100, ((uv || 0) / 11) * 100);
  elements.uvProgressBar.style.width = `${uvPercent}%`;

  // 3. Wind & Compass
  const windSpeed = current.wind_speed || 0;
  const windDir = current.wind_direction || 0;
  elements.windSpeedVal.textContent = Math.round(windSpeed);
  elements.windSpeedUnit.textContent = units.wind;
  elements.windDirectionText.textContent = getCardinalDirection(windDir);
  elements.windGustsVal.textContent = current.wind_gusts ? `${Math.round(current.wind_gusts)} ${units.wind}` : '--';
  elements.compassNeedle.style.transform = `rotate(${windDir}deg)`;

  // 4. Sunrise & Sunset Solar Arc
  if (current.sunrise && current.sunset) {
    const sunriseStr = current.sunrise.split('T')[1]?.slice(0, 5) || '--:--';
    const sunsetStr = current.sunset.split('T')[1]?.slice(0, 5) || '--:--';
    elements.sunriseTime.textContent = sunriseStr;
    elements.sunsetTime.textContent = sunsetStr;

    // Calculate solar progress
    calculateSolarArc(current.sunrise, current.sunset, current.time);
  }

  // 5. Humidity & Dew Point
  const hum = current.humidity || 0;
  elements.humidityVal.textContent = hum;
  elements.humidityBarFill.style.width = `${hum}%`;
  elements.dewPointVal.textContent = current.dew_point !== null ? `${Math.round(current.dew_point)}${units.temp}` : '--°';
  if (hum < 30) {
    elements.humidityStatusTag.textContent = 'Dry';
  } else if (hum <= 60) {
    elements.humidityStatusTag.textContent = 'Comfortable';
  } else {
    elements.humidityStatusTag.textContent = 'Humid';
  }

  // 6. Atmospheric Clarity (Visibility)
  const vis = current.visibility;
  elements.visibilityVal.textContent = vis !== null ? vis : '--';
  elements.visibilityUnit.textContent = units.visibility;
  elements.cloudCoverDesc.textContent = `Cloud Cover: ${current.cloud_cover || 0}%`;

  if (vis === null) {
    elements.visibilityDesc.textContent = 'Standard Horizon';
  } else if (vis >= 10) {
    elements.visibilityDesc.textContent = 'Crystal Clear Horizon';
  } else if (vis >= 5) {
    elements.visibilityDesc.textContent = 'Moderate Atmospheric Haze';
  } else {
    elements.visibilityDesc.textContent = 'Restricted Fog / Mist';
  }
}

// Calculate Solar Arc Sun Orb Position along SVG arc
function calculateSolarArc(sunriseIso, sunsetIso, currentIso) {
  try {
    const sunrise = new Date(sunriseIso).getTime();
    const sunset = new Date(sunsetIso).getTime();
    const current = currentIso ? new Date(currentIso).getTime() : Date.now();

    let progress = (current - sunrise) / (sunset - sunrise);
    progress = Math.max(0, Math.min(1, progress));

    // SVG arc runs from angle PI (left) to 0 (right)
    const angle = Math.PI - progress * Math.PI;
    const cx = 100;
    const cy = 90;
    const r = 80;

    const orbX = cx + r * Math.cos(angle);
    const orbY = cy - r * Math.sin(angle);

    elements.sunOrb.setAttribute('cx', orbX);
    elements.sunOrb.setAttribute('cy', orbY);

    // Offset for arc stroke
    const totalLength = 260;
    const offset = totalLength * (1 - progress);
    elements.solarProgress.setAttribute('stroke-dashoffset', offset);
  } catch (e) {
    console.warn('Solar calculation error:', e);
  }
}

// Helper: Cardinal direction converter from degrees
function getCardinalDirection(angle) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((angle % 360) / 22.5);
  return `${directions[index % 16]} (${angle}°)`;
}

// Render 7-Day Extended Forecast Outlook
function renderDailyForecast(dailyList, units) {
  elements.dailyList.innerHTML = '';
  if (!dailyList || dailyList.length === 0) return;

  // Determine weekly min and max to draw relative spectrum bars
  const allMins = dailyList.map(d => d.temp_min).filter(v => v !== null);
  const allMaxs = dailyList.map(d => d.temp_max).filter(v => v !== null);
  const weekMin = Math.min(...allMins);
  const weekMax = Math.max(...allMaxs);
  const weekRange = Math.max(1, weekMax - weekMin);

  dailyList.forEach((day, index) => {
    const row = document.createElement('div');
    row.className = 'daily-row';

    const dateObj = new Date(day.date + 'T00:00:00');
    let weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    if (index === 0) weekday = 'Today';
    else if (index === 1) weekday = 'Tomorrow';

    const monthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const iconName = ICON_MAP[day.weather.icon] || 'cloud';

    const minT = day.temp_min !== null ? Math.round(day.temp_min) : '--';
    const maxT = day.temp_max !== null ? Math.round(day.temp_max) : '--';

    // Calculate spectrum bar offset & width
    const leftPercent = Math.max(0, ((day.temp_min - weekMin) / weekRange) * 100);
    const rightPercent = Math.min(100, ((day.temp_max - weekMin) / weekRange) * 100);
    const barWidth = Math.max(6, rightPercent - leftPercent);

    row.innerHTML = `
      <div class="daily-day-group">
        <span class="daily-weekday">${weekday}</span>
        <span class="daily-date">${monthDay}</span>
      </div>
      <div class="daily-weather-group">
        <div class="daily-icon"><i data-lucide="${iconName}"></i></div>
        <span class="daily-condition-text">${day.weather.label}</span>
      </div>
      <div class="daily-range-wrapper">
        <span class="temp-min-label">${minT}°</span>
        <div class="temp-range-track">
          <div class="temp-range-bar" style="left: ${leftPercent}%; width: ${barWidth}%"></div>
        </div>
        <span class="temp-max-label">${maxT}°</span>
      </div>
      <div class="daily-extra-stats">
        <span class="rain-chance-badge" title="Precipitation Probability">
          <i data-lucide="cloud-rain"></i> ${day.precip_prob}%
        </span>
        <span class="wind-badge" title="Max Wind Speed">
          <i data-lucide="wind"></i> ${Math.round(day.wind_speed_max)}
        </span>
      </div>
    `;

    elements.dailyList.appendChild(row);
  });
}

// City Search Autocomplete with Debounce
let searchDebounceTimeout = null;
function initSearch() {
  elements.searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    if (query.length > 0) {
      elements.clearSearchBtn.style.display = 'flex';
    } else {
      elements.clearSearchBtn.style.display = 'none';
      elements.searchDropdown.style.display = 'none';
      return;
    }

    if (query.length < 2) {
      elements.searchDropdown.style.display = 'none';
      return;
    }

    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(() => {
      fetchCitySuggestions(query);
    }, 280);
  });

  elements.clearSearchBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    elements.clearSearchBtn.style.display = 'none';
    elements.searchDropdown.style.display = 'none';
    elements.searchInput.focus();
  });

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!elements.searchInput.contains(e.target) && !elements.searchDropdown.contains(e.target)) {
      elements.searchDropdown.style.display = 'none';
    }
  });

  // Enter key selection on first item
  elements.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const firstItem = elements.searchDropdown.querySelector('.dropdown-item');
      if (firstItem) {
        firstItem.click();
      }
    }
  });
}

async function fetchCitySuggestions(query) {
  elements.searchSpinner.style.display = 'block';

  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to fetch cities');
    const results = await res.json();
    renderSearchDropdown(results);
  } catch (e) {
    console.warn('Geocoding search error:', e);
  } finally {
    elements.searchSpinner.style.display = 'none';
  }
}

function renderSearchDropdown(results) {
  elements.searchDropdown.innerHTML = '';

  if (!results || results.length === 0) {
    elements.searchDropdown.innerHTML = `
      <div class="dropdown-empty">No matching cities found. Try another spelling.</div>
    `;
    elements.searchDropdown.style.display = 'block';
    return;
  }

  results.forEach(city => {
    const item = document.createElement('div');
    item.className = 'dropdown-item';

    item.innerHTML = `
      <i data-lucide="map-pin"></i>
      <div class="item-text">
        <span class="item-title">${city.name}${city.country ? ', ' + city.country : ''}</span>
        <span class="item-sub">${city.admin1 ? city.admin1 + ' • ' : ''}Lat: ${city.latitude.toFixed(2)}, Lon: ${city.longitude.toFixed(2)}</span>
      </div>
    `;

    item.addEventListener('click', () => {
      elements.searchInput.value = city.display_name;
      elements.searchDropdown.style.display = 'none';
      state.isGpsActive = false;
      elements.gpsBtn.classList.remove('active');
      elements.gpsSignal.classList.remove('live');
      elements.accuracyTag.textContent = city.country || 'City';
      elements.coordsDisplay.textContent = `Lat: ${city.latitude.toFixed(2)}°, Lon: ${city.longitude.toFixed(2)}°`;

      loadWeather(city.latitude, city.longitude, city.display_name);
    });

    elements.searchDropdown.appendChild(item);
  });

  elements.searchDropdown.style.display = 'block';
  renderLucide();
}

// Unit Switcher (°C / °F)
function initUnitButtons() {
  const btns = elements.unitToggle.querySelectorAll('.unit-btn');
  btns.forEach(btn => {
    if (btn.dataset.unit === state.tempUnit) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }

    btn.addEventListener('click', () => {
      const selected = btn.dataset.unit;
      if (selected === state.tempUnit) return;

      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      state.tempUnit = selected;
      state.windUnit = selected === 'fahrenheit' ? 'mph' : 'kmh';
      localStorage.setItem('skypulse_temp_unit', state.tempUnit);
      localStorage.setItem('skypulse_wind_unit', state.windUnit);

      if (state.currentLat && state.currentLon) {
        loadWeather(state.currentLat, state.currentLon, state.currentLocationName, false);
      }
    });
  });
}

// Favorites System
function updateFavoriteIconState() {
  const isFav = state.favorites.some(f => f.name === state.currentLocationName);
  if (isFav) {
    elements.saveFavBtn.classList.add('active');
    elements.favoriteIcon.setAttribute('data-lucide', 'bookmark-check');
  } else {
    elements.saveFavBtn.classList.remove('active');
    elements.favoriteIcon.setAttribute('data-lucide', 'bookmark');
  }
  renderLucide();
}

function toggleFavorite() {
  if (!state.currentLat || !state.currentLon || !state.currentLocationName) return;

  const existingIdx = state.favorites.findIndex(f => f.name === state.currentLocationName);
  if (existingIdx >= 0) {
    state.favorites.splice(existingIdx, 1);
    showToast('Removed from saved favorites', 'info');
  } else {
    state.favorites.push({
      name: state.currentLocationName,
      lat: state.currentLat,
      lon: state.currentLon,
    });
    showToast('Saved to quick favorites!', 'success');
  }

  localStorage.setItem('skypulse_favorites', JSON.stringify(state.favorites));
  updateFavoriteIconState();
  renderFavoritesChips();
}

function renderFavoritesChips() {
  elements.savedFavoritesContainer.innerHTML = '';
  if (!state.favorites || state.favorites.length === 0) return;

  state.favorites.forEach(fav => {
    const chip = document.createElement('button');
    chip.className = 'location-chip';
    chip.innerHTML = `<i data-lucide="star" style="width:12px;height:12px;color:#fbbf24;margin-right:3px"></i> ${fav.name.split(',')[0]}`;
    chip.addEventListener('click', () => {
      state.isGpsActive = false;
      elements.gpsBtn.classList.remove('active');
      elements.gpsSignal.classList.remove('live');
      loadWeather(fav.lat, fav.lon, fav.name);
    });
    elements.savedFavoritesContainer.appendChild(chip);
  });
  renderLucide();
}

// Location Permission Banner Actions
function showGpsBanner(title = null, desc = null) {
  if (title) elements.bannerTitle.textContent = title;
  if (desc) elements.bannerDesc.textContent = desc;
  elements.gpsBanner.style.display = 'flex';
  renderLucide();
}

function hideGpsBanner() {
  elements.gpsBanner.style.display = 'none';
}

// Toast Notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-triangle';

  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${message}</span>
  `;

  elements.toastContainer.appendChild(toast);
  renderLucide();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Event Listeners Binding
function initEventListeners() {
  // GPS Detection button
  elements.gpsBtn.addEventListener('click', () => {
    requestGpsLocation(true);
  });

  // GPS Watch Tracking toggle
  elements.watchBtn.addEventListener('click', () => {
    toggleGpsWatchMode();
  });

  // Refresh button
  elements.refreshBtn.addEventListener('click', () => {
    if (state.currentLat && state.currentLon) {
      loadWeather(state.currentLat, state.currentLon, state.currentLocationName, false);
      showToast('Weather updated', 'info');
    }
  });

  // Favorite button
  elements.saveFavBtn.addEventListener('click', toggleFavorite);

  // Banner buttons
  elements.bannerGrantBtn.addEventListener('click', () => {
    requestGpsLocation(true);
  });
  elements.bannerDismissBtn.addEventListener('click', hideGpsBanner);

  // Quick Chips
  elements.quickChipsContainer.querySelectorAll('.location-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const lat = parseFloat(chip.dataset.lat);
      const lon = parseFloat(chip.dataset.lon);
      const name = chip.dataset.name;

      state.isGpsActive = false;
      elements.gpsBtn.classList.remove('active');
      elements.gpsSignal.classList.remove('live');

      loadWeather(lat, lon, name);
    });
  });

  // Hourly Section Toggle (Cards vs Chart)
  elements.viewHourlyCards.addEventListener('click', () => {
    elements.viewHourlyCards.classList.add('active');
    elements.viewHourlyChart.classList.remove('active');
    elements.hourlyCardsWrapper.style.display = 'block';
    elements.hourlyChartWrapper.style.display = 'none';
  });

  elements.viewHourlyChart.addEventListener('click', () => {
    elements.viewHourlyChart.classList.add('active');
    elements.viewHourlyCards.classList.remove('active');
    elements.hourlyCardsWrapper.style.display = 'none';
    elements.hourlyChartWrapper.style.display = 'block';
    if (state.weatherData) {
      renderHourlyChart(state.weatherData.hourly, state.weatherData.units);
    }
  });

  // Window resize handler for canvas charts
  window.addEventListener('resize', () => {
    if (elements.viewHourlyChart.classList.contains('active') && state.weatherData) {
      renderHourlyChart(state.weatherData.hourly, state.weatherData.units);
    }
  });

  initSearch();
}

// Atmospheric Canvas Particles (Rain, Snow, Stars, Ambient Glow)
function initAtmosphericCanvas() {
  const canvas = elements.weatherCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Particles pool
  const particles = [];
  const maxParticles = 60;

  for (let i = 0; i < maxParticles; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 1,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: Math.random() * 0.8 + 0.3,
      alpha: Math.random() * 0.5 + 0.2,
      pulse: Math.random() * 0.02,
    });
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.alpha += p.pulse;

      if (p.alpha <= 0.1 || p.alpha >= 0.7) {
        p.pulse = -p.pulse;
      }

      if (p.y > height) {
        p.y = 0;
        p.x = Math.random() * width;
      }
      if (p.x > width) p.x = 0;
      if (p.x < 0) p.x = width;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(animate);
  }

  animate();
}
