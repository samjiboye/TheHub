import base64, json, os

with open("ev_part1.txt") as f:
    p1 = f.read()
with open("ev_part2.txt") as f:
    p2 = f.read()

full_b64 = p1 + p2
payload = json.loads(base64.b64decode(full_b64).decode("utf-8"))

for rel_path, b64_content in payload["files"].items():
    full_path = os.path.join(os.getcwd(), rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    data = base64.b64decode(b64_content)
    with open(full_path, "wb") as f:
        f.write(data)
    print(f"Wrote {rel_path} ({len(data)} bytes)")

with open("backend/db/schema.sql", "a") as f:
    f.write(payload["schema_addition"])
print("Appended schema.sql migration")

for p in ["ev_part1.txt", "ev_part2.txt"]:
    os.remove(p)

print()
print("ALL DONE")
