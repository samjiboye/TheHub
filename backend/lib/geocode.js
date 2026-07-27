// Free geocoding via OpenStreetMap Nominatim (no API key required).
// Usage policy requires a descriptive User-Agent and reasonable rate limits.
async function geocodeAddress(address) {
  if (!address) return { lat: null, lng: null };
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TheHub-App/1.0 (contact: samjiboye01@gmail.com)' },
    });
    if (!res.ok) return { lat: null, lng: null };
    const data = await res.json();
    if (!data || data.length === 0) return { lat: null, lng: null };
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (err) {
    console.error('Geocoding failed:', err.message);
    return { lat: null, lng: null };
  }
}

module.exports = { geocodeAddress };
