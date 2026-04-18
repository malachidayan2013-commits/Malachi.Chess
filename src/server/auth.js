const bcrypt = require("bcryptjs");
const { pool } = require("./db");

function normalizeUsername(value) {
  return String(value || "").trim();
}

async function createUser(username, password) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedPassword = String(password || "");

  if (!normalizedUsername) {
    return { ok: false, message: "יש להזין שם משתמש." };
  }

  if (normalizedUsername.length < 3) {
    return { ok: false, message: "שם המשתמש חייב להכיל לפחות 3 תווים." };
  }

  if (!normalizedPassword) {
    return { ok: false, message: "יש להזין סיסמה." };
  }

  if (normalizedPassword.length < 4) {
    return { ok: false, message: "הסיסמה חייבת להכיל לפחות 4 תווים." };
  }

  const existing = await pool.query(
    "SELECT id FROM users WHERE username = $1",
    [normalizedUsername]
  );

  if (existing.rows.length > 0) {
    return { ok: false, message: "שם המשתמש כבר קיים." };
  }

  const passwordHash = await bcrypt.hash(normalizedPassword, 10);

  await pool.query(
    "INSERT INTO users (username, password_hash) VALUES ($1, $2)",
    [normalizedUsername, passwordHash]
  );

  return { ok: true, username: normalizedUsername };
}

async function loginUser(username, password) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedPassword = String(password || "");

  if (!normalizedUsername) {
    return { ok: false, message: "יש להזין שם משתמש." };
  }

  if (!normalizedPassword) {
    return { ok: false, message: "יש להזין סיסמה." };
  }

  const result = await pool.query(
    "SELECT id, username, password_hash FROM users WHERE username = $1",
    [normalizedUsername]
  );

  if (result.rows.length === 0) {
    return { ok: false, message: "שם המשתמש לא קיים." };
  }

  const user = result.rows[0];
  const isValid = await bcrypt.compare(normalizedPassword, user.password_hash);

  if (!isValid) {
    return { ok: false, message: "הסיסמה שגויה." };
  }

  return { ok: true, username: user.username };
}

async function deleteUser(username, password) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedPassword = String(password || "");

  if (!normalizedUsername || !normalizedPassword) {
    return { ok: false, message: "יש להזין שם משתמש וסיסמה." };
  }

  const result = await pool.query(
    "SELECT id, username, password_hash FROM users WHERE username = $1",
    [normalizedUsername]
  );

  if (result.rows.length === 0) {
    return { ok: false, message: "המשתמש לא נמצא." };
  }

  const user = result.rows[0];
  const isValid = await bcrypt.compare(normalizedPassword, user.password_hash);

  if (!isValid) {
    return { ok: false, message: "הסיסמה שגויה." };
  }

  await pool.query(
    "DELETE FROM users WHERE username = $1",
    [normalizedUsername]
  );

  return { ok: true };
}

module.exports = {
  createUser,
  loginUser,
  deleteUser
};