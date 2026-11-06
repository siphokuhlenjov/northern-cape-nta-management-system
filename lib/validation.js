"use strict";
// Pure validation helpers (no database access) so they can be unit-tested and reused.

const TITLES = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Prof", "Other"];
const CITIZENSHIP = ["South African citizen", "Permanent resident", "Other"];
const NAME_RE = /^[\p{L}][\p{L}\p{M}'’\-. ]{0,58}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const str = x => (x === undefined || x === null ? "" : String(x).trim());

function passwordProblems(password, email = "") {
  const p = typeof password === "string" ? password : "";
  const problems = [];
  if (p.length < 12) problems.push("at least 12 characters");
  if (Buffer.byteLength(p, "utf8") > 72) problems.push("no more than 72 characters");
  if (!/[A-Za-z]/.test(p)) problems.push("at least one letter");
  if (!/[0-9]/.test(p)) problems.push("at least one number");
  const local = String(email).split("@")[0].toLowerCase();
  if (local.length >= 4 && p.toLowerCase().includes(local)) problems.push("must not contain your email name");
  return problems;
}

function intInRange(value, min, max) {
  const s = str(value);
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n >= min && n <= max ? n : null;
}

function validateRegistration(body = {}) {
  const errors = {};
  const v = {};

  v.title = str(body.title);
  if (v.title && !TITLES.includes(v.title)) errors.title = "Choose a title from the list.";

  v.firstName = str(body.firstName).replace(/\s+/g, " ");
  if (!v.firstName) errors.firstName = "Enter your first name.";
  else if (!NAME_RE.test(v.firstName)) errors.firstName = "Use letters only (spaces, hyphens and apostrophes are allowed).";

  v.surname = str(body.surname).replace(/\s+/g, " ");
  if (!v.surname) errors.surname = "Enter your surname.";
  else if (!NAME_RE.test(v.surname)) errors.surname = "Use letters only (spaces, hyphens and apostrophes are allowed).";

  v.email = str(body.email).toLowerCase();
  if (!v.email) errors.email = "Enter your email address.";
  else if (v.email.length > 254 || !EMAIL_RE.test(v.email)) errors.email = "Enter a valid email address, e.g. name@example.com.";

  const problems = passwordProblems(body.password, v.email);
  if (!body.password) errors.password = "Create a password.";
  else if (problems.length) errors.password = "Password needs: " + problems.join(", ") + ".";
  if (body.confirmPassword !== undefined && body.confirmPassword !== body.password) {
    errors.confirmPassword = "The two passwords do not match.";
  }
  v.password = typeof body.password === "string" ? body.password : "";

  v.saceNumber = str(body.saceNumber).replace(/[\s-]/g, "").toUpperCase();
  if (!v.saceNumber) errors.saceNumber = "Enter your SACE number.";
  else if (!/^[A-Z0-9]{5,15}$/.test(v.saceNumber)) errors.saceNumber = "SACE number must be 5–15 letters or digits (no spaces or symbols).";

  v.citizenship = str(body.citizenship);
  if (!v.citizenship) errors.citizenship = "Select your citizenship / registration status.";
  else if (v.citizenship.length > 60) errors.citizenship = "Keep this under 60 characters.";

  const yt = intInRange(body.yearsTeaching, 0, 60);
  if (yt === null) errors.yearsTeaching = "Enter whole years between 0 and 60.";
  v.yearsTeaching = yt;
  const ys = intInRange(body.yearsAtCurrentSchool, 0, 60);
  if (ys === null) errors.yearsAtCurrentSchool = "Enter whole years between 0 and 60.";
  else if (yt !== null && ys > yt) errors.yearsAtCurrentSchool = "Years at your current school cannot be more than total years teaching.";
  v.yearsAtCurrentSchool = ys;

  const rawPhone = str(body.phone);
  if (rawPhone) {
    const cleaned = rawPhone.replace(/[\s\-()]/g, "");
    if (!/^\+?\d{9,15}$/.test(cleaned)) errors.phone = "Enter a valid phone number, e.g. 069 133 1839 or +27 69 133 1839.";
    v.phone = cleaned;
  } else v.phone = null;

  const c = body.consent;
  v.consent = c === true || c === "on" || c === "true";
  if (!v.consent) errors.consent = "You must agree to the processing of your information to register.";

  return { ok: Object.keys(errors).length === 0, errors, values: v };
}

module.exports = { validateRegistration, passwordProblems, TITLES, CITIZENSHIP };
