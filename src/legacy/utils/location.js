// Location Utility Functions

const LOCATION_CONSENT_KEY = 'quizup:location:thirdPartyConsent';
const NOMINATIM_MIN_INTERVAL_MS = 1100;
const reverseGeocodeCache = new Map();
let lastNominatimRequestAt = 0;

const requestLocationConsent = () => {
  try {
    const stored = localStorage.getItem(LOCATION_CONSENT_KEY);
    if (stored === 'granted') return true;
    if (stored === 'denied') return false;
  } catch {
    // Continue with one-time prompt if storage is unavailable.
  }

  const accepted = window.confirm(
    'Konumunuz quiz sonucuna eklenecek. Şehir bilgisini bulmak için koordinatlar OpenStreetMap Nominatim servisine gönderilebilir. Devam edilsin mi?'
  );

  try {
    localStorage.setItem(LOCATION_CONSENT_KEY, accepted ? 'granted' : 'denied');
  } catch {
    // Ignore storage failures.
  }

  return accepted;
};

const waitForNominatimSlot = async () => {
  const elapsed = Date.now() - lastNominatimRequestAt;
  if (elapsed < NOMINATIM_MIN_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, NOMINATIM_MIN_INTERVAL_MS - elapsed));
  }
  lastNominatimRequestAt = Date.now();
};

const reverseGeocode = async (lat, lng) => {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (reverseGeocodeCache.has(cacheKey)) {
    return reverseGeocodeCache.get(cacheKey);
  }

  await waitForNominatimSlot();

  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'json');
  url.searchParams.set('accept-language', 'tr');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Nominatim request failed: ${response.status}`);
  }

  const data = await response.json();
  reverseGeocodeCache.set(cacheKey, data);
  return data;
};

// Get location from IP (fallback)
const getLocationFromIP = async () => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return {
      city: data.city || 'Bilinmiyor',
      region: data.region || '',
      country: data.country_name || 'Turkey',
      countryCode: data.country_code || 'TR',
      lat: data.latitude || 39.9334,
      lng: data.longitude || 32.8597,
      ip: data.ip || '',
      source: 'ip'
    };
  } catch (error) {
    window.devError('IP location error:', error);
    return {
      city: 'Bilinmiyor',
      region: '',
      country: 'Turkey',
      countryCode: 'TR',
      lat: 39.9334,
      lng: 32.8597,
      ip: '',
      source: 'default'
    };
  }
};

// Get location from browser geolocation API
const getLocationFromBrowser = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    if (!requestLocationConsent()) {
      reject(new Error('Location consent denied'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Reverse geocoding to get city name
        try {
          const data = await reverseGeocode(lat, lng);
          
          resolve({
            city: data.address?.city || data.address?.town || data.address?.county || 'Bilinmiyor',
            region: data.address?.state || '',
            country: data.address?.country || 'Turkey',
            countryCode: data.address?.country_code?.toUpperCase() || 'TR',
            lat: lat,
            lng: lng,
            accuracy: position.coords.accuracy,
            source: 'gps'
          });
        } catch (error) {
          // If reverse geocoding fails, still return coordinates
          resolve({
            city: 'Bilinmiyor',
            region: '',
            country: 'Turkey',
            countryCode: 'TR',
            lat: lat,
            lng: lng,
            accuracy: position.coords.accuracy,
            source: 'gps'
          });
        }
      },
      (error) => {
        window.devError('Geolocation error:', error);
        reject(error);
      },
      {
        enableHighAccuracy: true, // Daha hassas konum
        timeout: 15000, // 15 saniye timeout
        maximumAge: 60000 // 1 dakika cache
      }
    );
  });
};

// Main function to get location (GPS only, no IP fallback)
const getLocation = async () => {
  try {
    // GPS only
    const location = await getLocationFromBrowser();
    window.devLog('Location obtained from GPS:', location);
    return location;
  } catch (error) {
    window.devError('GPS location failed:', error);
    // Return null instead of IP fallback
    return {
      city: 'Konum alınamadı',
      region: '',
      country: 'Turkey',
      countryCode: 'TR',
      lat: null,
      lng: null,
      accuracy: null,
      source: 'unavailable',
      error: error.message
    };
  }
};

// Export functions
window.locationUtils = {
  getLocation,
  getLocationFromIP,
  getLocationFromBrowser
};
