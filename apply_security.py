#!/usr/bin/env python3
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


edit(
    "backend/package.json",
    [(
        '  "dependencies": {\n'
        '    "bcryptjs": "^2.4.3",',
        '  "dependencies": {\n'
        '    "bcryptjs": "^2.4.3",\n'
        '    "helmet": "^7.1.0",\n'
        '    "express-rate-limit": "^7.4.1",',
    )],
    "package.json: add helmet + express-rate-limit",
)

edit(
    "backend/server.js",
    [
        (
            'require("dotenv").config();\n'
            'const express = require("express");\n'
            'const cors = require("cors");',
            'require("dotenv").config();\n'
            'const express = require("express");\n'
            'const cors = require("cors");\n'
            'const helmet = require("helmet");',
        ),
        (
            'const corsOrigin = process.env.CORS_ORIGIN || "*";\n'
            'app.use(cors({ origin: corsOrigin }));',
            '// Security headers - safe defaults for a JSON-only API (no HTML pages\n'
            '// served here, so the default Content-Security-Policy has nothing to\n'
            '// conflict with).\n'
            'app.use(helmet());\n\n'
            'const corsOrigin = process.env.CORS_ORIGIN || "*";\n'
            'app.use(cors({ origin: corsOrigin }));',
        ),
    ],
    "server.js: add helmet security headers",
)

rl_path = "backend/middleware/rateLimiters.js"
if os.path.exists(rl_path):
    print("OK: rateLimiters.js already exists, skipping")
else:
    with open(rl_path, "w", encoding="utf-8") as f:
        f.write(
'''const rateLimit = require("express-rate-limit");

// Login is the classic brute-force target - keep this tight. 10 attempts
// per 15 minutes per IP is enough for a real person who mistypes their
// password a few times, but not enough to meaningfully guess one.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Please try again in a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Signup / forgot-password / reset-password: looser since these aren't a
// brute-force target the same way, but still capped to stop spam account
// creation (e.g. farming referral welcome bonuses) and email-bombing abuse.
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter, authLimiter };
'''
        )
    print("OK: created backend/middleware/rateLimiters.js")

edit(
    "backend/routes/auth.js",
    [
        (
            'const { JWT_SECRET } = require("../middleware/auth");\n'
            'const router = express.Router();',
            'const { JWT_SECRET } = require("../middleware/auth");\n'
            'const { loginLimiter, authLimiter } = require("../middleware/rateLimiters");\n'
            'const router = express.Router();',
        ),
        (
            'router.post("/signup", async (req, res) => {',
            'router.post("/signup", authLimiter, async (req, res) => {',
        ),
        (
            'router.post("/login", async (req, res) => {',
            'router.post("/login", loginLimiter, async (req, res) => {',
        ),
        (
            'router.post("/forgot-password", async (req, res) => {',
            'router.post("/forgot-password", authLimiter, async (req, res) => {',
        ),
        (
            'router.post("/reset-password", async (req, res) => {',
            'router.post("/reset-password", authLimiter, async (req, res) => {',
        ),
    ],
    "auth.js: apply rate limiters to signup/login/forgot-password/reset-password",
)

print("\nALL DONE. Review with: git diff")
print('Then: git add -A && git commit -m "Add security headers and rate limiting on auth endpoints" && git push')
