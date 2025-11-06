const { useEffect, useRef } = React;

const LocationMap = ({ results }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    // Filter results with location data
    const locatedResults = results.filter(r => r.location?.lat && r.location?.lng);
    
    if (locatedResults.length === 0) return;

    // Initialize map if not already done
    if (!mapInstanceRef.current) {
      // Center on Turkey with wide country-level view
      mapInstanceRef.current = L.map(mapRef.current).setView([39.0, 35.0], 6);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
        minZoom: 2
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;
    
    // Clear existing markers
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Group by location
    const locationGroups = {};
    locatedResults.forEach(r => {
      const key = `${r.location.lat.toFixed(2)},${r.location.lng.toFixed(2)}`;
      if (!locationGroups[key]) {
        locationGroups[key] = {
          lat: r.location.lat,
          lng: r.location.lng,
          city: r.location.city,
          country: r.location.country || 'Turkey',
          results: []
        };
      }
      locationGroups[key].results.push(r);
    });

    // Add markers
    Object.values(locationGroups).forEach(group => {
      const avgScore = Math.round(
        group.results.reduce((sum, r) => sum + (r.score?.percent || 0), 0) / group.results.length
      );
      
      const color = avgScore >= 70 ? '#5EC5B6' : avgScore >= 50 ? '#FF6B4A' : '#dc2626';
      
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background: ${color};
            width: 40px;
            height: 40px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 3px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="
              color: white;
              font-weight: bold;
              transform: rotate(45deg);
              font-size: 14px;
            ">${group.results.length}</span>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40]
      });

      const marker = L.marker([group.lat, group.lng], { icon }).addTo(map);
      
      marker.bindPopup(`
        <div style="font-family: Inter, sans-serif;">
          <h3 style="font-weight: bold; margin-bottom: 8px; color: #1A2332;">
            ${group.city}${group.country !== 'Turkey' ? ', ' + group.country : ''}
          </h3>
          <p style="color: #47576B; font-size: 14px; margin: 4px 0;">
            <strong>${group.results.length}</strong> test
          </p>
          <p style="color: #47576B; font-size: 14px; margin: 4px 0;">
            Ortalama: <strong style="color: ${color};">${avgScore}%</strong>
          </p>
        </div>
      `);
    });

    // Fit bounds to show all markers, keep at country-level zoom
    if (locatedResults.length > 0) {
      const bounds = L.latLngBounds(locatedResults.map(r => [r.location.lat, r.location.lng]));
      map.fitBounds(bounds, { 
        padding: [50, 50],
        maxZoom: 6  // Keep at country level - wide view
      });
    } else {
      // Default to Turkey view
      map.setView([39.0, 35.0], 6);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [results]);

  const locatedResults = results.filter(r => r.location?.lat && r.location?.lng);

  if (locatedResults.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-6xl mb-4">🗺️</div>
        <p className="text-dark-500 text-lg">Henüz lokasyon verisi yok</p>
        <p className="text-dark-400 text-sm mt-2">Yeni testler tamamlandıkça haritada gösterilecek</p>
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div 
        ref={mapRef} 
        style={{ 
          height: '500px',
          width: '100%',
          borderRadius: '16px'
        }}
      ></div>
    </div>
  );
};

window.LocationMap = LocationMap;
