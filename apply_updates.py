#!/usr/bin/env python3
"""
Applies:
  1. Commission back to 15% base rate (was reduced to 10%)
  2. New salon categories: "Nails" -> "Lashes & Nails", plus new "Piercing" and "Tattoos"
  3. Skip button on onboarding
  4. Faster onboarding image loading (preload first image + prefetch the rest)

Run this from the root of your TheHub repo (same folder as backend/ and frontend/).
"""
import os, sys

def edit(path, replacements, label):
    if not os.path.exists(path):
        print(f"FAILED: {label} - file not found: {path}")
        sys.exit(1)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    for old, new in replacements:
        count = content.count(old)
        if count != 1:
            print(f"FAILED: {label} - anchor not found exactly once (found {count}) in {path}")
            print("----- anchor -----")
            print(old[:300])
            print("------------------")
            sys.exit(1)
        content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"OK: {label}")

# ---------------------------------------------------------------------------
# 1. Commission back to 15% base
# ---------------------------------------------------------------------------
edit(
    "backend/lib/commission.js",
    [(
        "const TIERS = [\n  { minCompleted: 200, rate: 0.05 },\n  { minCompleted: 0, rate: 0.10 },\n];",
        "const TIERS = [\n  { minCompleted: 200, rate: 0.05 },\n  { minCompleted: 0, rate: 0.15 },\n];",
    )],
    "commission.js: base rate 10% -> 15%",
)

# ---------------------------------------------------------------------------
# 2. Schema migration: rename Nails -> Lashes & Nails, add Piercing + Tattoos
# ---------------------------------------------------------------------------
schema_path = "backend/db/schema.sql"
with open(schema_path, "r", encoding="utf-8") as f:
    schema_content = f.read()
migration_marker = "-- Add Lashes & Nails (renamed from Nails), Piercing, and Tattoos as salon categories"
if migration_marker in schema_content:
    print("OK: schema.sql - category migration already present, skipping")
else:
    schema_content += (
        "\n\n" + migration_marker + "\n"
        "UPDATE salons SET category = 'Lashes & Nails' WHERE category = 'Nails';\n"
        "ALTER TABLE salons DROP CONSTRAINT IF EXISTS salons_category_check;\n"
        "ALTER TABLE salons ADD CONSTRAINT salons_category_check "
        "CHECK (category IN ('Barbing', 'Hairdressing', 'Lashes & Nails', 'Makeup', 'Spa', 'Piercing', 'Tattoos'));\n"
    )
    with open(schema_path, "w", encoding="utf-8") as f:
        f.write(schema_content)
    print("OK: schema.sql - category migration appended")

# ---------------------------------------------------------------------------
# 3. index.html: preload the very first onboarding image
# ---------------------------------------------------------------------------
edit(
    "frontend/index.html",
    [(
        '    <link rel="icon" type="image/png" href="/favicon.png" />',
        '    <link rel="preload" as="image" fetchpriority="high" '
        'href="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80" />\n'
        '    <link rel="icon" type="image/png" href="/favicon.png" />',
    )],
    "index.html: preload first onboarding image",
)

# ---------------------------------------------------------------------------
# 4. App.jsx: icons, categories, theme colors, sample data, skip button, preload
# ---------------------------------------------------------------------------
app_replacements = [
    (
        "  Search, MapPin, Star, Clock, Scissors, Wand2, Palette, Sparkles, Flower2,",
        "  Search, MapPin, Star, Clock, Scissors, Wand2, Palette, Sparkles, Flower2, Gem, PenTool,",
    ),
    (
        'const CATEGORIES = [\n'
        '  { name: "Barbing", icon: Scissors, photo: "https://images.pexels.com/photos/32351040/pexels-photo-32351040.jpeg" },\n'
        '  { name: "Hairdressing", icon: Wand2, photo: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&q=80" },\n'
        '  { name: "Nails", icon: Palette, photo: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80" },\n'
        '  { name: "Makeup", icon: Sparkles, photo: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=400&q=80" },\n'
        '  { name: "Spa", icon: Flower2, photo: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80" },\n'
        '];',
        'const CATEGORIES = [\n'
        '  { name: "Barbing", icon: Scissors, photo: "https://images.pexels.com/photos/32351040/pexels-photo-32351040.jpeg" },\n'
        '  { name: "Hairdressing", icon: Wand2, photo: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&q=80" },\n'
        '  { name: "Lashes & Nails", icon: Palette, photo: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80" },\n'
        '  { name: "Makeup", icon: Sparkles, photo: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=400&q=80" },\n'
        '  { name: "Spa", icon: Flower2, photo: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80" },\n'
        '  { name: "Piercing", icon: Gem, photo: null },\n'
        '  { name: "Tattoos", icon: PenTool, photo: null },\n'
        '];',
    ),
    (
        '  Nails: { gradient: "linear-gradient(160deg, #241214 0%, #6B333B 50%, #E7A9A0 100%)" },',
        '  "Lashes & Nails": { gradient: "linear-gradient(160deg, #241214 0%, #6B333B 50%, #E7A9A0 100%)" },\n'
        '  Piercing: { gradient: "linear-gradient(160deg, #1A1A1D 0%, #4A4E69 50%, #C9CBFF 100%)" },\n'
        '  Tattoos: { gradient: "linear-gradient(160deg, #1A0F0F 0%, #4A1212 50%, #C97A7A 100%)" },',
    ),
    (
        'id: 3, name: "Nailed It Studio", category: "Nails", rating: 4.7, reviews: 188,',
        'id: 3, name: "Nailed It Studio", category: "Lashes & Nails", rating: 4.7, reviews: 188,',
    ),
    (
        '              <div\n'
        '                className="w-7 h-7 rounded-full shrink-0"\n'
        '                style={{\n'
        '                  backgroundImage: `url(${c.photo})`,\n'
        '                  backgroundSize: "cover",\n'
        '                  backgroundPosition: "center",\n'
        '                  border: "2px solid rgba(255,255,255,0.8)",\n'
        '                }}\n'
        '              />\n'
        '              {c.name}',
        '              {c.photo ? (\n'
        '                <div\n'
        '                  className="w-7 h-7 rounded-full shrink-0"\n'
        '                  style={{\n'
        '                    backgroundImage: `url(${c.photo})`,\n'
        '                    backgroundSize: "cover",\n'
        '                    backgroundPosition: "center",\n'
        '                    border: "2px solid rgba(255,255,255,0.8)",\n'
        '                  }}\n'
        '                />\n'
        '              ) : (\n'
        '                <div\n'
        '                  className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center"\n'
        '                  style={{ background: colors.gold, border: "2px solid rgba(255,255,255,0.8)" }}\n'
        '                >\n'
        '                  <c.icon size={14} color="#FFFFFF" />\n'
        '                </div>\n'
        '              )}\n'
        '              {c.name}',
    ),
    (
        '  {\n'
        '    type: "categories",\n'
        '    title: "Explore what we offer",\n'
        '    photo: null,\n'
        '    categories: [\n'
        '      { name: "Braids", photo: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&q=80" },\n'
        '      { name: "Barbing", photo: "https://images.pexels.com/photos/32351040/pexels-photo-32351040.jpeg" },\n'
        '      { name: "Nails", photo: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80" },\n'
        '      { name: "Makeup", photo: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=400&q=80" },\n'
        '      { name: "Spa", photo: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80" },\n'
        '    ],\n'
        '  },',
        '  {\n'
        '    type: "categories",\n'
        '    title: "Explore what we offer",\n'
        '    photo: null,\n'
        '    categories: CATEGORIES,\n'
        '  },',
    ),
    (
        '                <div\n'
        '                    className="w-20 h-20 rounded-full shadow-lg"\n'
        '                    style={{\n'
        '                      backgroundImage: `url(${cat.photo})`,\n'
        '                      backgroundSize: "cover",\n'
        '                      backgroundPosition: "center",\n'
        '                      border: `3px solid ${colors.hairline}`,\n'
        '                    }}\n'
        '                  />',
        '                {cat.photo ? (\n'
        '                    <div\n'
        '                      className="w-20 h-20 rounded-full shadow-lg"\n'
        '                      style={{\n'
        '                        backgroundImage: `url(${cat.photo})`,\n'
        '                        backgroundSize: "cover",\n'
        '                        backgroundPosition: "center",\n'
        '                        border: `3px solid ${colors.hairline}`,\n'
        '                      }}\n'
        '                    />\n'
        '                  ) : (\n'
        '                    <div\n'
        '                      className="w-20 h-20 rounded-full shadow-lg flex items-center justify-center"\n'
        '                      style={{ background: colors.gold, border: `3px solid ${colors.hairline}` }}\n'
        '                    >\n'
        '                      <cat.icon size={28} color="#FFFFFF" />\n'
        '                    </div>\n'
        '                  )}',
    ),
    (
        "function OnboardingView({ onDone }) {\n  const [slide, setSlide] = useState(0);",
        "function OnboardingView({ onDone }) {\n"
        "  const [slide, setSlide] = useState(0);\n\n"
        "  useEffect(() => {\n"
        "    const urls = ONBOARDING_SLIDES.flatMap((s) =>\n"
        "      s.type === \"categories\" ? s.categories.map((c) => c.photo) : [s.photo]\n"
        "    ).filter(Boolean);\n"
        "    urls.forEach((url) => {\n"
        "      const img = new Image();\n"
        "      img.src = url;\n"
        "    });\n"
        "  }, []);",
    ),
    (
        '      <div className="flex justify-between items-center">\n'
        '        <div\n'
        '          className="px-5 py-4 rounded-[50%_50%_50%_10%/60%_60%_40%_40%] flex items-center justify-center shadow-lg"\n'
        '          style={{ background: "#FFFFFF" }}\n'
        '        >\n'
        '          <span\n'
        '            className="text-sm font-extrabold tracking-wide"\n'
        '            style={{ color: colors.hairline, fontFamily: FONT_DISPLAY }}\n'
        '          >\n'
        '            TheHub\n'
        '          </span>\n'
        '        </div>\n'
        '      </div>',
        '      <div className="flex justify-between items-center">\n'
        '        <div\n'
        '          className="px-5 py-4 rounded-[50%_50%_50%_10%/60%_60%_40%_40%] flex items-center justify-center shadow-lg"\n'
        '          style={{ background: "#FFFFFF" }}\n'
        '        >\n'
        '          <span\n'
        '            className="text-sm font-extrabold tracking-wide"\n'
        '            style={{ color: colors.hairline, fontFamily: FONT_DISPLAY }}\n'
        '          >\n'
        '            TheHub\n'
        '          </span>\n'
        '        </div>\n'
        '        {!isLast && (\n'
        '          <button\n'
        '            onClick={(e) => { e.stopPropagation(); onDone(); }}\n'
        '            className="text-sm font-semibold px-4 py-2 rounded-full"\n'
        '            style={{\n'
        '              color: isPlain ? colors.hairline : "#FFFFFF",\n'
        '              background: isPlain ? "rgba(217,112,46,0.12)" : "rgba(255,255,255,0.18)",\n'
        '            }}\n'
        '          >\n'
        '            Skip\n'
        '          </button>\n'
        '        )}\n'
        '      </div>',
    ),
]

edit("frontend/src/App.jsx", app_replacements, "App.jsx: categories, skip button, image preload")

print("\nALL DONE. Review with: git diff")
print("Then: git add -A && git commit -m \"15% commission, new categories, onboarding skip + faster image load\" && git push")
