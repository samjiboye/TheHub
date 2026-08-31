path = "frontend/vercel.json"
with open(path, "r") as f:
    src = f.read()

old = '''{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}'''
new = '''{
  "rewrites": [
    { "source": "/((?!terms\\\\.html|privacy\\\\.html|robots\\\\.txt|sitemap\\\\.xml|manifest\\\\.json|favicon\\\\.png|apple-touch-icon\\\\.png|icon-.*\\\\.png|sw\\\\.js).*)", "destination": "/index.html" }
  ]
}'''

if old in src:
    assert src.count(old) == 1
    src = src.replace(old, new)
    with open(path, "w") as f:
        f.write(src)
    print("✅ vercel.json — legal pages and static files no longer caught by the app's catch-all routing")
else:
    print("⏭️  Already updated")
