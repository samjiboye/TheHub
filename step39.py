path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

changes = []

old_spa = '  { name: "Spa", icon: Flower2, photo: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80" },'
new_spa = '  { name: "Spa & Massage Therapy", icon: Flower2, photo: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80" },'
if old_spa in src:
    assert src.count(old_spa) == 1
    src = src.replace(old_spa, new_spa)
    changes.append("✅ Renamed 'Spa' to 'Spa & Massage Therapy'")
else:
    changes.append("⏭️  Spa already renamed")

old_massage_cat = '\n  { name: "Massage Therapy", icon: Heart, photo: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80" },'
if old_massage_cat in src:
    assert src.count(old_massage_cat) == 1
    src = src.replace(old_massage_cat, "")
    changes.append("✅ Removed standalone 'Massage Therapy' category")
else:
    changes.append("⏭️  Massage Therapy category already removed")

old_spa_theme = '  Spa: { gradient: "linear-gradient(160deg, #0D1C19 0%, #274F49 50%, #8FC9BE 100%)" },'
new_spa_theme = '  "Spa & Massage Therapy": { gradient: "linear-gradient(160deg, #0D1C19 0%, #274F49 50%, #8FC9BE 100%)" },'
if old_spa_theme in src:
    assert src.count(old_spa_theme) == 1
    src = src.replace(old_spa_theme, new_spa_theme)
    changes.append("✅ Renamed Spa theme key")
else:
    changes.append("⏭️  Spa theme already renamed")

old_massage_theme = '\n  "Massage Therapy": { gradient: "linear-gradient(160deg, #170D20 0%, #3E2154 50%, #B99CD9 100%)" },'
if old_massage_theme in src:
    assert src.count(old_massage_theme) == 1
    src = src.replace(old_massage_theme, "")
    changes.append("✅ Removed standalone Massage Therapy theme")
else:
    changes.append("⏭️  Massage Therapy theme already removed")

with open(path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
