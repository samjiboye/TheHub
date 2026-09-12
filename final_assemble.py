import base64, json, os

parts = []
for i in range(1, 5):
    with open(f"final_part{i}.txt") as f:
        parts.append(f.read())
full_b64 = "".join(parts)
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

for i in range(1, 5):
    os.remove(f"final_part{i}.txt")

print()
print("ALL DONE")
