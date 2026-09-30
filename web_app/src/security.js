export function resourceUrl(source) {
  if (
    typeof source !== "string" ||
    Array.from(source).some((character) => {
      const code = character.codePointAt(0);
      return code < 32 || (code >= 127 && code <= 159);
    })
  )
    return null;
  try {
    const url = new URL(source);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function openResource(source) {
  const url = resourceUrl(source);
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}

export function sessionCookieOptions(
  mode = import.meta.env.MODE,
  location = window.location,
) {
  const localDevelopment =
    mode === "development" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) &&
    location.protocol === "http:";
  return { secure: !localDevelopment, sameSite: "strict", path: "/" };
}
