path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

changes = []

old_import = '''  Users, ArrowRight, ShieldCheck, Loader2, WifiOff, User, LogIn, UserPlus, Store, Plus, Eye, EyeOff, Image, Video, Play, Trash2, Upload, Menu, Settings, LogOut, CalendarCheck,
  UserCircle, Bell, Wallet, ShoppingBag,
} from "lucide-react";'''
new_import = '''  Users, ArrowRight, ShieldCheck, Loader2, WifiOff, User, LogIn, UserPlus, Store, Plus, Eye, EyeOff, Image, Video, Play, Trash2, Upload, Menu, Settings, LogOut, CalendarCheck,
  UserCircle, Bell, Wallet, ShoppingBag, Crown, Layers, Droplet, Flame, Smile, Heart,
} from "lucide-react";'''
if old_import in src:
    assert src.count(old_import) == 1
    src = src.replace(old_import, new_import)
    changes.append("✅ Added new category icons to imports")
else:
    changes.append("⏭️  Icons already imported")

old_categories = '''const CATEGORIES = [
  { name: "Barbing", icon: Scissors, photo: "https://images.pexels.com/photos/32351040/pexels-photo-32351040.jpeg" },
  { name: "Hairdressing", icon: Wand2, photo: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&q=80" },
  { name: "Lashes & Nails", icon: Palette, photo: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80" },
  { name: "Makeup", icon: Sparkles, photo: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=400&q=80" },
  { name: "Spa", icon: Flower2, photo: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80" },
  { name: "Piercing", icon: Gem, photo: "https://images.pexels.com/photos/10005259/pexels-photo-10005259.jpeg" },
  { name: "Tattoos", icon: PenTool, photo: "https://images.pexels.com/photos/35714996/pexels-photo-35714996.jpeg" },
];'''
new_categories = '''const CATEGORIES = [
  { name: "Barbing", icon: Scissors, photo: "https://images.pexels.com/photos/32351040/pexels-photo-32351040.jpeg" },
  { name: "Hairdressing", icon: Wand2, photo: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&q=80" },
  { name: "Lashes & Nails", icon: Palette, photo: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80" },
  { name: "Bridal & Event Makeup", icon: Sparkles, photo: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=400&q=80" },
  { name: "Spa", icon: Flower2, photo: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80" },
  { name: "Piercing", icon: Gem, photo: "https://images.pexels.com/photos/10005259/pexels-photo-10005259.jpeg" },
  { name: "Tattoos", icon: PenTool, photo: "https://images.pexels.com/photos/35714996/pexels-photo-35714996.jpeg" },
  { name: "Wig Making & Installation", icon: Crown, photo: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&q=80" },
  { name: "Gele & Head-tie Styling", icon: Layers, photo: "https://images.pexels.com/photos/32351040/pexels-photo-32351040.jpeg" },
  { name: "Skincare & Facials", icon: Droplet, photo: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80" },
  { name: "Waxing & Hair Removal", icon: Flame, photo: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80" },
  { name: "Teeth Whitening", icon: Smile, photo: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=400&q=80" },
  { name: "Massage Therapy", icon: Heart, photo: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80" },
];'''
if old_categories in src:
    assert src.count(old_categories) == 1
    src = src.replace(old_categories, new_categories)
    changes.append("✅ Renamed Makeup to Bridal & Event Makeup, added 6 new categories")
else:
    changes.append("⏭️  Categories already updated")

old_themes = '''const CATEGORY_THEMES = {
  Barbing: { gradient: "linear-gradient(160deg, #0D1B2A 0%, #1B4965 50%, #A9D6E5 100%)" },
  Hairdressing: { gradient: "linear-gradient(160deg, #241019 0%, #5C2740 50%, #D98CA6 100%)" },
  "Lashes & Nails": { gradient: "linear-gradient(160deg, #241214 0%, #6B333B 50%, #E7A9A0 100%)" },
  Piercing: { gradient: "linear-gradient(160deg, #1A1A1D 0%, #4A4E69 50%, #C9CBFF 100%)" },
  Tattoos: { gradient: "linear-gradient(160deg, #1A0F0F 0%, #4A1212 50%, #C97A7A 100%)" },
  Makeup: { gradient: "linear-gradient(160deg, #180E20 0%, #451D54 50%, #C9A0DC 100%)" },
  Spa: { gradient: "linear-gradient(160deg, #0D1C19 0%, #274F49 50%, #8FC9BE 100%)" },
};'''
new_themes = '''const CATEGORY_THEMES = {
  Barbing: { gradient: "linear-gradient(160deg, #0D1B2A 0%, #1B4965 50%, #A9D6E5 100%)" },
  Hairdressing: { gradient: "linear-gradient(160deg, #241019 0%, #5C2740 50%, #D98CA6 100%)" },
  "Lashes & Nails": { gradient: "linear-gradient(160deg, #241214 0%, #6B333B 50%, #E7A9A0 100%)" },
  Piercing: { gradient: "linear-gradient(160deg, #1A1A1D 0%, #4A4E69 50%, #C9CBFF 100%)" },
  Tattoos: { gradient: "linear-gradient(160deg, #1A0F0F 0%, #4A1212 50%, #C97A7A 100%)" },
  "Bridal & Event Makeup": { gradient: "linear-gradient(160deg, #180E20 0%, #451D54 50%, #C9A0DC 100%)" },
  Spa: { gradient: "linear-gradient(160deg, #0D1C19 0%, #274F49 50%, #8FC9BE 100%)" },
  "Wig Making & Installation": { gradient: "linear-gradient(160deg, #201510 0%, #5C3A24 50%, #D9AE8C 100%)" },
  "Gele & Head-tie Styling": { gradient: "linear-gradient(160deg, #241905 0%, #6B4E14 50%, #E7C25A 100%)" },
  "Skincare & Facials": { gradient: "linear-gradient(160deg, #0D1A1C 0%, #1E4A4F 50%, #9AD6D9 100%)" },
  "Waxing & Hair Removal": { gradient: "linear-gradient(160deg, #200D0D 0%, #6B241E 50%, #E79A8C 100%)" },
  "Teeth Whitening": { gradient: "linear-gradient(160deg, #0F1A20 0%, #29505C 50%, #A9D8E0 100%)" },
  "Massage Therapy": { gradient: "linear-gradient(160deg, #170D20 0%, #3E2154 50%, #B99CD9 100%)" },
};'''
if old_themes in src:
    assert src.count(old_themes) == 1
    src = src.replace(old_themes, new_themes)
    changes.append("✅ Updated category theme gradients (renamed + added 6 new)")
else:
    changes.append("⏭️  Category themes already updated")

with open(path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
