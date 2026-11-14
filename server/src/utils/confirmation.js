// Does what the user typed match their GitHub username? (GitHub usernames ignore case.)
export function confirmationMatches(login, typed) {
  if (typeof login !== "string" || typeof typed !== "string") return false;
  if (login.length === 0) return false;
  return typed.trim().toLowerCase() === login.toLowerCase();
}