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
    "backend/routes/salons.js",
    [
        (
            "const router = express.Router();",
            "const router = express.Router();\n\n"
            "// Strip payout details before sending a salon to the public - these are\n"
            "// only ever needed internally when firing a payout, never by anyone\n"
            "// browsing salons or viewing a booking.\n"
            "function sanitizeSalon(salon) {\n"
            "  const { bank_code, account_number, paystack_recipient_code, paystack_subaccount_code, ...safe } = salon;\n"
            "  return safe;\n"
            "}",
        ),
        (
            "        return {\n"
            "          ...s,\n"
            "          services,\n"
            "          rating: reviewStats.avg ? Math.round(Number(reviewStats.avg) * 10) / 10 : null,\n"
            "          reviewCount: Number(reviewStats.count),\n"
            "          fiveStarCount: Number(reviewStats.five_star_count),\n"
            "        completedCount,\n"
            "          distance: lat && lng ? Math.round(distanceMiles(+lat, +lng, s.lat, s.lng) * 10) / 10 : null,\n"
            "        };",
            "        return {\n"
            "          ...sanitizeSalon(s),\n"
            "          services,\n"
            "          rating: reviewStats.avg ? Math.round(Number(reviewStats.avg) * 10) / 10 : null,\n"
            "          reviewCount: Number(reviewStats.count),\n"
            "          fiveStarCount: Number(reviewStats.five_star_count),\n"
            "        completedCount,\n"
            "          distance: lat && lng ? Math.round(distanceMiles(+lat, +lng, s.lat, s.lng) * 10) / 10 : null,\n"
            "        };",
        ),
        (
            "    res.json({\n"
            "      ...salon,\n"
            "      services,\n"
            "      reviews,\n"
            "      rating: reviewStats.avg ? Math.round(Number(reviewStats.avg) * 10) / 10 : null,\n"
            "      reviewCount: Number(reviewStats.count),\n"
            "      fiveStarCount: Number(reviewStats.five_star_count),\n"
            "    });",
            "    res.json({\n"
            "      ...sanitizeSalon(salon),\n"
            "      services,\n"
            "      reviews,\n"
            "      rating: reviewStats.avg ? Math.round(Number(reviewStats.avg) * 10) / 10 : null,\n"
            "      reviewCount: Number(reviewStats.count),\n"
            "      fiveStarCount: Number(reviewStats.five_star_count),\n"
            "    });",
        ),
    ],
    "salons.js: stop leaking bank details on public salon endpoints",
)

edit(
    "backend/routes/media.js",
    [(
        'const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });',
        'const upload = multer({\n'
        '  storage: multer.memoryStorage(),\n'
        '  limits: { fileSize: 50 * 1024 * 1024 },\n'
        '  fileFilter: (req, file, cb) => {\n'
        '    cb(null, file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/"));\n'
        '  },\n'
        '});',
    )],
    "media.js: restrict uploads to image/video files",
)

edit(
    "backend/routes/bookings.js",
    [(
        'const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });',
        'const upload = multer({\n'
        '  storage: multer.memoryStorage(),\n'
        '  limits: { fileSize: 50 * 1024 * 1024 },\n'
        '  fileFilter: (req, file, cb) => {\n'
        '    cb(null, file.mimetype.startsWith("image/"));\n'
        '  },\n'
        '});',
    )],
    "bookings.js: restrict completion photo uploads to images only",
)

edit(
    "backend/routes/users.js",
    [(
        'const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });',
        'const upload = multer({\n'
        '  storage: multer.memoryStorage(),\n'
        '  limits: { fileSize: 10 * 1024 * 1024 },\n'
        '  fileFilter: (req, file, cb) => {\n'
        '    cb(null, file.mimetype.startsWith("image/"));\n'
        '  },\n'
        '});',
    )],
    "users.js: restrict profile photo uploads to images only",
)

print("\nALL DONE. Review with: git diff")
print('Then: git add -A && git commit -m "Fix salon bank details leak on public endpoints + restrict upload file types" && git push')
