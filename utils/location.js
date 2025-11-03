// Location Utility Functions

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
    console.error('IP location error:', error);
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

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Reverse geocoding to get city name
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await response.json();
          
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
        console.error('Geolocation error:', error);
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
    console.log('Location obtained from GPS:', location);
    return location;
  } catch (error) {
    console.error('GPS location failed:', error);
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
