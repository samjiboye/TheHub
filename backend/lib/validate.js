// Small shared validation helpers. Kept deliberately simple -- these catch
// obviously malformed input (typos, empty passwords, garbage emails) without
// being so strict that real people with unusual-but-valid emails get blocked.

function isValidEmail(email) {
  if (typeof email !== "string") return false;
  // Not a full RFC 5322 email validator on purpose -- just enough to catch
  // "clearly not an email" input like "asdf" or "test@".
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPassword(password) {
  if (typeof password !== "string") return false;
  return password.length >= 8;
}

module.exports = { isValidEmail, isValidPassword };
