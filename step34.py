changes = []

schema_path = "backend/db/schema.sql"
with open(schema_path, "r") as f:
    schema = f.read()
new_sql = "\nALTER TABLE salons ADD COLUMN IF NOT EXISTS neighborhood TEXT;\n"
if "salons ADD COLUMN IF NOT EXISTS neighborhood" not in schema:
    schema = schema.rstrip("\n") + "\n" + new_sql
    with open(schema_path, "w") as f:
        f.write(schema)
    changes.append("✅ schema.sql — added neighborhood column to salons")
else:
    changes.append("⏭️  neighborhood column already added")

salons_path = "backend/routes/salons.js"
with open(salons_path, "r") as f:
    salons = f.read()

old_create = '''router.post("/", requireAuth, async (req, res) => {
  const { name, category, bio, address, lat, lng, hours, service_type, state, city } = req.body;
  if (!name || !category) return res.status(400).json({ error: "name and category are required" });
  try {
    let finalLat = lat || null;
    let finalLng = lng || null;
    const fullAddress = [address, city, state].filter(Boolean).join(", ");
    if ((!finalLat || !finalLng) && fullAddress) {
      const geocoded = await geocodeAddress(fullAddress);
      finalLat = geocoded.lat;
      finalLng = geocoded.lng;
    }
    const { rows } = await db.query(
      `INSERT INTO salons (owner_id, name, category, bio, address, lat, lng, hours, service_type, state, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [req.user.id, name, category, bio || null, address || null, finalLat, finalLng, hours || null, service_type || 'unisex', state || null, city || null]
    );
    res.status(201).json({ id: rows[0].id });'''
new_create = '''router.post("/", requireAuth, async (req, res) => {
  const { name, category, bio, address, lat, lng, hours, service_type, state, city, neighborhood } = req.body;
  if (!name || !category) return res.status(400).json({ error: "name and category are required" });
  try {
    let finalLat = lat || null;
    let finalLng = lng || null;
    const fullAddress = [address, neighborhood, city, state].filter(Boolean).join(", ");
    if ((!finalLat || !finalLng) && fullAddress) {
      const geocoded = await geocodeAddress(fullAddress);
      finalLat = geocoded.lat;
      finalLng = geocoded.lng;
    }
    const { rows } = await db.query(
      `INSERT INTO salons (owner_id, name, category, bio, address, lat, lng, hours, service_type, state, city, neighborhood)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [req.user.id, name, category, bio || null, address || null, finalLat, finalLng, hours || null, service_type || 'unisex', state || null, city || null, neighborhood || null]
    );
    res.status(201).json({ id: rows[0].id });'''
if old_create in salons:
    assert salons.count(old_create) == 1
    salons = salons.replace(old_create, new_create)
    changes.append("✅ salons.js — salon creation now accepts a neighborhood")
else:
    changes.append("⏭️  Create route already updated")

old_update = '''    const { name, category, address, service_type, state, city, bio, hours } = req.body;
    if (!name || !category) return res.status(400).json({ error: "name and category are required" });

    let finalLat = salon.lat;
    let finalLng = salon.lng;
    const addressChanged = address !== salon.address || state !== salon.state || city !== salon.city;
    const fullAddress = [address, city, state].filter(Boolean).join(", ");
    if (addressChanged && fullAddress) {
      const geocoded = await geocodeAddress(fullAddress);
      finalLat = geocoded.lat;
      finalLng = geocoded.lng;
    }

    const { rows } = await db.query(
      `UPDATE salons SET name = $1, category = $2, address = $3, service_type = $4, state = $5, city = $6,
        bio = $7, hours = $8, lat = $9, lng = $10
       WHERE id = $11 RETURNING *`,
      [name, category, address || null, service_type || salon.service_type, state || null, city || null,
        bio ?? salon.bio, hours ?? salon.hours, finalLat, finalLng, salon.id]
    );'''
new_update = '''    const { name, category, address, service_type, state, city, neighborhood, bio, hours } = req.body;
    if (!name || !category) return res.status(400).json({ error: "name and category are required" });

    let finalLat = salon.lat;
    let finalLng = salon.lng;
    const addressChanged = address !== salon.address || state !== salon.state || city !== salon.city || neighborhood !== salon.neighborhood;
    const fullAddress = [address, neighborhood, city, state].filter(Boolean).join(", ");
    if (addressChanged && fullAddress) {
      const geocoded = await geocodeAddress(fullAddress);
      finalLat = geocoded.lat;
      finalLng = geocoded.lng;
    }

    const { rows } = await db.query(
      `UPDATE salons SET name = $1, category = $2, address = $3, service_type = $4, state = $5, city = $6,
        neighborhood = $7, bio = $8, hours = $9, lat = $10, lng = $11
       WHERE id = $12 RETURNING *`,
      [name, category, address || null, service_type || salon.service_type, state || null, city || null,
        neighborhood || null, bio ?? salon.bio, hours ?? salon.hours, finalLat, finalLng, salon.id]
    );'''
if old_update in salons:
    assert salons.count(old_update) == 1
    salons = salons.replace(old_update, new_update)
    changes.append("✅ salons.js — salon update now accepts a neighborhood")
else:
    changes.append("⏭️  Update route already updated")

with open(salons_path, "w") as f:
    f.write(salons)

app_path = "frontend/src/App.jsx"
with open(app_path, "r") as f:
    src = f.read()

old_anchor = "function SalonCard({ salon, onClick }) {"
new_anchor = '''const STATE_ABBREVIATIONS = {
  "Abia": "AB", "Adamawa": "AD", "Akwa Ibom": "AKW", "Anambra": "AN",
  "Bauchi": "BA", "Bayelsa": "BAY", "Benue": "BEN", "Borno": "BOR",
  "Cross River": "CRS", "Delta": "DEL", "Ebonyi": "EBO", "Edo": "EDO",
  "Ekiti": "EKI", "Enugu": "ENU", "Gombe": "GOM", "Imo": "IMO",
  "Jigawa": "JIG", "Kaduna": "KAD", "Kano": "KAN", "Katsina": "KTS",
  "Kebbi": "KEB", "Kogi": "KOG", "Kwara": "KWA", "Lagos": "LAG",
  "Nasarawa": "NAS", "Niger": "NIG", "Ogun": "OGU", "Ondo": "OND",
  "Osun": "OSU", "Oyo": "OY", "Plateau": "PLA", "Rivers": "RIV",
  "Sokoto": "SOK", "Taraba": "TAR", "Yobe": "YOB", "Zamfara": "ZAM",
  "FCT (Abuja)": "ABJ",
};
const CITY_ABBREVIATIONS = {
  "Ibadan": "IB", "Lagos Island": "LAG", "Ikeja": "IKJ", "Lekki": "LEK",
  "Surulere": "SUR", "Ajah": "AJH", "Yaba": "YBA", "Abuja": "ABJ",
  "Port Harcourt": "PH", "Kano": "KAN", "Kaduna": "KAD", "Enugu": "ENU",
  "Benin City": "BEN", "Owerri": "OWR", "Calabar": "CAL", "Warri": "WAR",
};
function locationTag(salon) {
  if (salon.city && salon.neighborhood) {
    const cityCode = CITY_ABBREVIATIONS[salon.city] || salon.city.slice(0, 3).toUpperCase();
    return `${cityCode}/${salon.neighborhood}`;
  }
  if (!salon.state && !salon.city) return null;
  const stateCode = STATE_ABBREVIATIONS[salon.state] || (salon.state ? salon.state.slice(0, 3).toUpperCase() : "");
  if (stateCode && salon.city) return `${stateCode}/${salon.city}`;
  return stateCode || salon.city || null;
}

function SalonCard({ salon, onClick }) {'''
if old_anchor in src:
    assert src.count(old_anchor) == 1
    src = src.replace(old_anchor, new_anchor)
    changes.append("✅ App.jsx — added city/state abbreviation helpers, prefers neighborhood when set")
else:
    changes.append("⏭️  Location helpers already added")

old_row = '''        <div className="flex items-center justify-between gap-2">
          <h3 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }} className="text-2xl leading-tight">
            {salon.name}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <TierStars fiveStarCount={salon.fiveStarCount} size={16} />
          </div>
        </div>
        {salon.services && salon.services.length > 0 && ('''
new_row = '''        <div className="flex items-center justify-between gap-2">
          <h3 style={{ fontFamily: FONT_DISPLAY, color: colors.cream, fontWeight: 700 }} className="text-2xl leading-tight">
            {salon.name}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <TierStars fiveStarCount={salon.fiveStarCount} size={16} />
          </div>
        </div>
        {locationTag(salon) && (
          <p className="text-xs mt-0.5" style={{ color: colors.creamDim }}>
            {locationTag(salon)}
          </p>
        )}
        {salon.services && salon.services.length > 0 && ('''
if old_row in src:
    assert src.count(old_row) == 1
    src = src.replace(old_row, new_row)
    changes.append("✅ App.jsx — added location tag under the stars on each salon card")
else:
    changes.append("⏭️  Location tag already added")

old_state = '''  const [salonState, setSalonState] = useState("");
  const [salonCity, setSalonCity] = useState("");'''
new_state = '''  const [salonState, setSalonState] = useState("");
  const [salonCity, setSalonCity] = useState("");
  const [salonNeighborhood, setSalonNeighborhood] = useState("");'''
if old_state in src:
    assert src.count(old_state) == 1
    src = src.replace(old_state, new_state)
    changes.append("✅ App.jsx — CreateSalonView tracks a neighborhood field")
else:
    changes.append("⏭️  CreateSalonView state already added")

old_create_body = '''        body: JSON.stringify({ name, category, address, service_type: serviceType, state: salonState, city: salonCity }),'''
new_create_body = '''        body: JSON.stringify({ name, category, address, service_type: serviceType, state: salonState, city: salonCity, neighborhood: salonNeighborhood }),'''
if old_create_body in src:
    assert src.count(old_create_body) == 1
    src = src.replace(old_create_body, new_create_body)
    changes.append("✅ App.jsx — CreateSalonView sends the neighborhood on submit")
else:
    changes.append("⏭️  CreateSalonView submit already updated")

old_city_select = '''                <option value="">Select city</option>
                {(NIGERIA_LOCATIONS.find((s) => s.state === salonState)?.cities || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
          {error && <p className="text-sm text-center" style={{ color: colors.creamDim }}>{error}</p>}'''
new_city_select = '''                <option value="">Select city</option>
                {(NIGERIA_LOCATIONS.find((s) => s.state === salonState)?.cities || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
          <input value={salonNeighborhood} onChange={(e) => setSalonNeighborhood(e.target.value)} placeholder="Neighborhood / area (e.g. Akobo)"
            className="pb-2 text-base outline-none" style={inputStyle} />
          {error && <p className="text-sm text-center" style={{ color: colors.creamDim }}>{error}</p>}'''
if old_city_select in src:
    assert src.count(old_city_select) == 1
    src = src.replace(old_city_select, new_city_select)
    changes.append("✅ App.jsx — added neighborhood input to salon setup form")
else:
    changes.append("⏭️  CreateSalonView neighborhood input already added")

old_start_edit = '''  const startEditDetails = () => {
    setDetailsForm({
      name: salon.name, category: salon.category, service_type: salon.service_type || "unisex",
      address: salon.address || "", state: salon.state || "", city: salon.city || "",
    });'''
new_start_edit = '''  const startEditDetails = () => {
    setDetailsForm({
      name: salon.name, category: salon.category, service_type: salon.service_type || "unisex",
      address: salon.address || "", state: salon.state || "", city: salon.city || "",
      neighborhood: salon.neighborhood || "",
    });'''
if old_start_edit in src:
    assert src.count(old_start_edit) == 1
    src = src.replace(old_start_edit, new_start_edit)
    changes.append("✅ App.jsx — edit-salon form now loads the current neighborhood")
else:
    changes.append("⏭️  Edit-salon form load already updated")

old_edit_city = '''                  <select value={detailsForm.city} onChange={(e) => setDetailsForm({ ...detailsForm, city: e.target.value })}
                    disabled={!detailsForm.state} className="pb-2 text-base outline-none" style={inputStyle}>
                    <option value="">Select city</option>
                    {(NIGERIA_LOCATIONS.find((s) => s.state === detailsForm.state)?.cities || []).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {detailsError && <p className="text-sm" style={{ color: "#E07A5F" }}>{detailsError}</p>}'''
new_edit_city = '''                  <select value={detailsForm.city} onChange={(e) => setDetailsForm({ ...detailsForm, city: e.target.value })}
                    disabled={!detailsForm.state} className="pb-2 text-base outline-none" style={inputStyle}>
                    <option value="">Select city</option>
                    {(NIGERIA_LOCATIONS.find((s) => s.state === detailsForm.state)?.cities || []).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input value={detailsForm.neighborhood || ""} onChange={(e) => setDetailsForm({ ...detailsForm, neighborhood: e.target.value })}
                    placeholder="Neighborhood / area (e.g. Akobo)" className="pb-2 text-base outline-none" style={inputStyle} />
                  {detailsError && <p className="text-sm" style={{ color: "#E07A5F" }}>{detailsError}</p>}'''
if old_edit_city in src:
    assert src.count(old_edit_city) == 1
    src = src.replace(old_edit_city, new_edit_city)
    changes.append("✅ App.jsx — added neighborhood input to edit-salon-details form")
else:
    changes.append("⏭️  Edit-salon-details neighborhood input already added")

with open(app_path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
