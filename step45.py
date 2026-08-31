path = "frontend/src/App.jsx"
with open(path, "r") as f:
    src = f.read()

changes = []

old_signup_btn = '''          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : mode === "login" ? (
            <><LogIn size={18} /> Log in</>
          ) : (
            <><UserPlus size={18} /> Sign up</>
          )}
        </button>
      </form>'''
new_signup_btn = '''          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : mode === "login" ? (
            <><LogIn size={18} /> Log in</>
          ) : (
            <><UserPlus size={18} /> Sign up</>
          )}
        </button>
        {mode === "signup" && (
          <p className="text-xs text-center mt-2" style={{ color: colors.creamDim }}>
            By signing up, you agree to TheHub's{" "}
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" style={{ color: colors.hairline, textDecoration: "underline" }}>
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={{ color: colors.hairline, textDecoration: "underline" }}>
              Privacy Policy
            </a>
            .
          </p>
        )}
      </form>'''
if old_signup_btn in src:
    assert src.count(old_signup_btn) == 1
    src = src.replace(old_signup_btn, new_signup_btn)
    changes.append("✅ Added Terms/Privacy notice to the signup form")
else:
    changes.append("⏭️  Already added")

old_settings = '''        {onWatchIntro && (
          <button
            onClick={onWatchIntro}
            className="px-4 py-3 rounded-xl text-sm font-semibold text-left tap-glass"
            style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
          >
            Watch intro again
          </button>
        )}'''
new_settings = '''        {onWatchIntro && (
          <button
            onClick={onWatchIntro}
            className="px-4 py-3 rounded-xl text-sm font-semibold text-left tap-glass"
            style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
          >
            Watch intro again
          </button>
        )}
        <a
          href="/terms.html"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-3 rounded-xl text-sm font-semibold text-left tap-glass"
          style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
        >
          Terms of Service
        </a>
        <a
          href="/privacy.html"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-3 rounded-xl text-sm font-semibold text-left tap-glass"
          style={{ background: colors.panelLight, border: `2px solid ${colors.hairline}`, color: colors.cream }}
        >
          Privacy Policy
        </a>'''
if old_settings in src:
    assert src.count(old_settings) == 1
    src = src.replace(old_settings, new_settings)
    changes.append("✅ Added Terms/Privacy links to Settings")
else:
    changes.append("⏭️  Already added")

with open(path, "w") as f:
    f.write(src)

for c in changes:
    print(c)
