import {
  Scissors, Wand2, Palette, Sparkles, Flower2, Gem, PenTool, Crown, Layers, Droplet, Flame, Smile,
} from "lucide-react";

const colors = {
  bg: "#FFFFFF",
  panel: "#FFFFFF",
  panelLight: "#F2F2F2",
  hairline: "#D9702E",
  cream: "#241B14",
  creamDim: "#7A6F63",
  gold: "#D9702E",
  goldDim: "#A6532A",
  rose: "#4FA89C",
  green: "#4FA89C",
};

const FONT_DISPLAY = "'Baloo 2', sans-serif";
const FONT_BODY = "'Baloo 2', sans-serif";
const FONT_MONO = "'Baloo 2', sans-serif";

// Typical booking on TheHub runs about ₦3,000, so these buckets are
// centered around that rather than generic round numbers.
const PRICE_BUCKETS = [
  { id: "u2k", label: "Under ₦2,000", min: 0, max: 2000 },
  { id: "2to5k", label: "₦2,000–₦5,000", min: 2000, max: 5000 },
  { id: "5to10k", label: "₦5,000–₦10,000", min: 5000, max: 10000 },
  { id: "10kplus", label: "₦10,000+", min: 10000, max: Infinity },
];

const CATEGORIES = [
  { name: "Barbing", icon: Scissors, photo: "https://images.pexels.com/photos/32351040/pexels-photo-32351040.jpeg" },
  { name: "Hairdressing", icon: Wand2, photo: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&q=80" },
  { name: "Lashes & Nails", icon: Palette, photo: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80" },
  { name: "Bridal & Event Makeup", icon: Sparkles, photo: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=400&q=80" },
  { name: "Spa & Massage Therapy", icon: Flower2, photo: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80" },
  { name: "Piercing", icon: Gem, photo: "https://images.pexels.com/photos/10005259/pexels-photo-10005259.jpeg" },
  { name: "Tattoos", icon: PenTool, photo: "https://images.pexels.com/photos/35714996/pexels-photo-35714996.jpeg" },
  { name: "Wig Making & Installation", icon: Crown, photo: "https://images.pexels.com/photos/6923351/pexels-photo-6923351.jpeg" },
  { name: "Gele & Head-tie Styling", icon: Layers, photo: "https://images.pexels.com/photos/39266140/pexels-photo-39266140.jpeg" },
  { name: "Skincare & Facials", icon: Droplet, photo: "https://images.pexels.com/photos/7446658/pexels-photo-7446658.jpeg" },
  { name: "Waxing & Hair Removal", icon: Flame, photo: "https://images.pexels.com/photos/6763618/pexels-photo-6763618.jpeg" },
  { name: "Teeth Whitening", icon: Smile, photo: "https://images.pexels.com/photos/5622257/pexels-photo-5622257.jpeg" },
];

// Category-specific hero background treatments — used behind the search screen
// and salon profile pages so each service type feels distinct. No external
// images are loaded here (kept to CSS gradients + a large watermark icon) so
// there's nothing to break if network access to an image host is unavailable.
const CATEGORY_THEMES = {
  Barbing: { gradient: "linear-gradient(160deg, #0D1B2A 0%, #1B4965 50%, #A9D6E5 100%)" },
  Hairdressing: { gradient: "linear-gradient(160deg, #241019 0%, #5C2740 50%, #D98CA6 100%)" },
  "Lashes & Nails": { gradient: "linear-gradient(160deg, #241214 0%, #6B333B 50%, #E7A9A0 100%)" },
  Piercing: { gradient: "linear-gradient(160deg, #1A1A1D 0%, #4A4E69 50%, #C9CBFF 100%)" },
  Tattoos: { gradient: "linear-gradient(160deg, #1A0F0F 0%, #4A1212 50%, #C97A7A 100%)" },
  "Bridal & Event Makeup": { gradient: "linear-gradient(160deg, #180E20 0%, #451D54 50%, #C9A0DC 100%)" },
  "Spa & Massage Therapy": { gradient: "linear-gradient(160deg, #0D1C19 0%, #274F49 50%, #8FC9BE 100%)" },
  "Wig Making & Installation": { gradient: "linear-gradient(160deg, #201510 0%, #5C3A24 50%, #D9AE8C 100%)" },
  "Gele & Head-tie Styling": { gradient: "linear-gradient(160deg, #241905 0%, #6B4E14 50%, #E7C25A 100%)" },
  "Skincare & Facials": { gradient: "linear-gradient(160deg, #0D1A1C 0%, #1E4A4F 50%, #9AD6D9 100%)" },
  "Waxing & Hair Removal": { gradient: "linear-gradient(160deg, #200D0D 0%, #6B241E 50%, #E79A8C 100%)" },
  "Teeth Whitening": { gradient: "linear-gradient(160deg, #0F1A20 0%, #29505C 50%, #A9D8E0 100%)" },
};
const NEUTRAL_HERO_GRADIENT = "linear-gradient(160deg, #FBEEE3 0%, #F6DCC4 55%, #F2C79E 100%)";
// A distinct, muted "business dashboard" gradient for the owner side of the app —
// deliberately different in tone from the customer discovery screens above.
const OWNER_THEME_GRADIENT = "linear-gradient(160deg, #F4F1EA 0%, #E4D9C4 50%, #C9AD7C 100%)";

const SALONS = [
  {
    id: 1, name: "Cutting Room", category: "Barbing", rating: 4.8, reviews: 212,
    distance: 0.8, priceRange: "$15–35", hue: 32, address: "14 Kelso Ave",
    hours: "9:00 AM – 7:00 PM",
    bio: "Sharp fades and old-school straight-razor lineups in a no-fuss space built for regulars.",
    services: [
      { name: "Skin Fade", duration: 30, price: 25 },
      { name: "Beard Trim", duration: 15, price: 12 },
      { name: "Classic Cut", duration: 25, price: 20 },
    ],
  },
  {
    id: 2, name: "Bloom & Brush", category: "Hairdressing", rating: 4.9, reviews: 340,
    distance: 1.2, priceRange: "$40–150", hue: 340, address: "88 Vireo Street",
    hours: "10:00 AM – 8:00 PM",
    bio: "Colour specialists and precision cuts, with a consult before every chemical service.",
    services: [
      { name: "Cut & Style", duration: 60, price: 55 },
      { name: "Silk Press", duration: 90, price: 85 },
      { name: "Full Colour", duration: 150, price: 150 },
    ],
  },
  {
    id: 3, name: "Nailed It Studio", category: "Lashes & Nails", rating: 4.7, reviews: 188,
    distance: 0.5, priceRange: "$20–60", hue: 350, address: "21 Marchmont Rd",
    hours: "10:00 AM – 6:30 PM",
    bio: "Hand-painted sets and long-wear gel, done by appointment so you're never rushed.",
    services: [
      { name: "Gel Manicure", duration: 45, price: 35 },
      { name: "Classic Pedicure", duration: 40, price: 30 },
      { name: "Full Set Acrylic", duration: 75, price: 55 },
    ],
  },
  {
    id: 4, name: "Aura Makeup Co.", category: "Makeup", rating: 4.9, reviews: 97,
    distance: 2.1, priceRange: "$45–150", hue: 300, address: "5 Halden Court",
    hours: "By appointment",
    bio: "Editorial-trained artists for everyday glam, events, and bridal trials.",
    services: [
      { name: "Everyday Glam", duration: 45, price: 65 },
      { name: "Full Glam", duration: 60, price: 85 },
      { name: "Bridal Trial", duration: 90, price: 120 },
    ],
  },
  {
    id: 5, name: "The Fade Lounge", category: "Barbing", rating: 4.6, reviews: 156,
    distance: 1.5, priceRange: "$10–30", hue: 40, address: "102 Corrie Rd",
    hours: "8:00 AM – 6:00 PM",
    bio: "Fast, clean lineups and fades — walk-ins welcome but booking skips the wait.",
    services: [
      { name: "Skin Fade", duration: 30, price: 22 },
      { name: "Line Up", duration: 10, price: 10 },
    ],
  },
  {
    id: 6, name: "Serenity Spa & Wellness", category: "Spa", rating: 4.8, reviews: 265,
    distance: 3.0, priceRange: "$50–180", hue: 150, address: "9 Thistle Row",
    hours: "9:00 AM – 9:00 PM",
    bio: "Massage, facials, and quiet rooms — a reset built into your week, not just a treat.",
    services: [
      { name: "Facial", duration: 45, price: 75 },
      { name: "Swedish Massage", duration: 60, price: 90 },
      { name: "Deep Tissue", duration: 60, price: 110 },
    ],
  },
];

const TIME_SLOTS = ["9:00 AM", "10:30 AM", "12:00 PM", "1:30 PM", "3:00 PM", "4:30 PM", "6:00 PM"];
const BOOKING_FEE = 0; // set above 0 to reintroduce a booking fee later — the UI already discloses it if so

const inputStyle = {
  border: "none",
  borderBottom: `3px solid ${colors.hairline}`,
  borderRadius: 0,
  color: colors.cream,
  fontFamily: FONT_BODY,
  background: "transparent",
  paddingLeft: 0,
};
const CUSTOMER_CANCEL_REASONS = [
  "Schedule conflict",
  "Found another appointment",
  "No longer needed",
  "Booked by mistake",
  "Change of plans",
  "Other",
];
export {
  colors, BOOKING_FEE, inputStyle, CUSTOMER_CANCEL_REASONS, FONT_DISPLAY, FONT_BODY, FONT_MONO, PRICE_BUCKETS, CATEGORIES, CATEGORY_THEMES,
  NEUTRAL_HERO_GRADIENT, OWNER_THEME_GRADIENT, SALONS, TIME_SLOTS,
};
