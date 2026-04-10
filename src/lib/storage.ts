"use client";

const USERNAME_KEY = "chess-site-username";
const THEME_KEY = "chess-site-theme";
const ALL_USERS_KEY = "chess-site-all-users";

export function getStoredUsername(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(USERNAME_KEY) || "";
}

export function setStoredUsername(username: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERNAME_KEY, username);
}

export function clearStoredUsername(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USERNAME_KEY);
}

export function getStoredTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const theme = localStorage.getItem(THEME_KEY);
  return theme === "dark" ? "dark" : "light";
}

export function setStoredTheme(theme: "light" | "dark"): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, theme);
}

export function getAllUsers(): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(ALL_USERS_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function userExists(username: string): boolean {
  const normalized = username.trim();
  if (!normalized) return false;

  return getAllUsers().includes(normalized);
}

export function addUser(username: string): void {
  if (typeof window === "undefined") return;

  const normalized = username.trim();
  if (!normalized) return;

  const users = getAllUsers();

  if (!users.includes(normalized)) {
    users.push(normalized);
    localStorage.setItem(ALL_USERS_KEY, JSON.stringify(users));
  }
}

export function removeUser(username: string): void {
  if (typeof window === "undefined") return;

  const normalized = username.trim();
  const users = getAllUsers().filter((user) => user !== normalized);
  localStorage.setItem(ALL_USERS_KEY, JSON.stringify(users));
}