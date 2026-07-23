const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const router = express.Router();
const DEMO_OWNER_EMAIL = "owner@thehub.demo";
const DEMO_OWNER_PASSWORD = "demo1234";
const SALONS = [
  {
    name: "Cutting Room", category: "Barbing", address: "14 Kelso Ave",
    lat: 40.73, lng: -73.99, hours: "9:00 AM – 7:00 PM",
    bio: "Sharp fades and old-school straight-razor lineups in a no-fuss space built for regulars.",
    services: [
      { name: "Skin Fade", duration_min: 30, price: 25 },
      { name: "Beard Trim", duration_min: 15, price: 12 },
      { name: "Classic Cut", duration_min: 25, price: 20 },
    ],
  },
  {
    name: "Bloom & Brush", category: "Hairdressing", address: "88 Vireo Street",
    lat: 40.74, lng: -73.98, hours: "10:00 AM – 8:00 PM",
    bio: "Colour specialists and precision cuts, with a consult before every chemical service.",
    services: [
      { name: "Cut & Style", duration_min: 60, price: 55 },
      { name: "Silk Press", duration_min: 90, price: 85 },
      { name: "Full Colour", duration_min: 150, price: 150 },
    ],
  },
  {
    name: "Nailed It Studio", category: "Nails", address: "21 Marchmont Rd",
    lat: 40.72, lng: -74.0, hours: "10:00 AM –
