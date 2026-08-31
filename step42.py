changes = []

app_path = "frontend/src/App.jsx"
with open(app_path, "r") as f:
    src = f.read()

old_import = '''import { NIGERIA_LOCATIONS } from "./nigeriaLocations";
import MarketplaceView from "./Marketplace";'''
new_import = '''import { NIGERIA_LOCATIONS } from "./nigeriaLocations";'''
if old_import in src:
    assert src.count(old_import) == 1
    src = src.replace(old_import, new_import)
    with open(app_path, "w") as f:
        f.write(src)
    changes.append("✅ App.jsx — removed unused MarketplaceView import (719 lines of dead weight)")
else:
    changes.append("⏭️  Already removed")

vite_path = "frontend/vite.config.js"
with open(vite_path, "r") as f:
    vite_src = f.read()

old_config = '''export default defineConfig({
  plugins: [react()],
});'''
new_config = '''export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
        },
      },
    },
  },
});'''
if old_config in vite_src:
    assert vite_src.count(old_config) == 1
    vite_src = vite_src.replace(old_config, new_config)
    with open(vite_path, "w") as f:
        f.write(vite_src)
    changes.append("✅ vite.config.js — vendor chunk splitting added, source maps disabled")
else:
    changes.append("⏭️  Already updated")

for c in changes:
    print(c)
