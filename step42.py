path = "vite.config.js"
with open(path, "r") as f:
    src = f.read()

old = '''import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});'''
new = '''import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
  },
});'''

if old in src:
    assert src.count(old) == 1
    src = src.replace(old, new)
    with open(path, "w") as f:
        f.write(src)
    print("✅ vite.config.js — production source maps explicitly disabled")
else:
    print("⏭️  Already updated")
