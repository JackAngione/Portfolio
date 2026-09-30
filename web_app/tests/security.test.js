// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vite-plus/test";
import { CookieJar } from "jsdom";
import {
  openResource,
  resourceUrl,
  sessionCookieOptions,
} from "../src/security.js";

afterEach(() => vi.restoreAllMocks());

it("blocks executable and malformed resource URLs, including existing indexed values", () => {
  const open = vi.spyOn(window, "open").mockImplementation(() => null);
  for (const url of [
    "javascript:alert(1)",
    " JaVaScRiPt:alert(1)",
    "java\nscript:alert(1)",
    "data:text/html,test",
    "vbscript:msgbox(1)",
    "//example.com",
    "/relative",
    "https://",
    "https://example.com/\npath",
    null,
  ]) {
    expect(resourceUrl(url)).toBeNull();
    openResource(url);
  }
  expect(open).not.toHaveBeenCalled();
});

it("opens parsed HTTP(S) destinations with opener isolation", () => {
  const open = vi.spyOn(window, "open").mockImplementation(() => null);
  for (const source of [
    "https://example.com/a?q=one#two",
    "HTTP://example.com",
    " https://example.com ",
    "https://例え.jp",
  ]) {
    openResource(source);
    expect(open).toHaveBeenLastCalledWith(
      new URL(source).href,
      "_blank",
      "noopener,noreferrer",
    );
  }
});

it("confines cleartext cookies to localhost development", () => {
  for (const mode of ["production", "development"]) {
    for (const hostname of [
      "example.com",
      "192.168.0.2",
      "localhost",
      "127.0.0.1",
      "[::1]",
    ]) {
      for (const protocol of ["http:", "https:"]) {
        const options = sessionCookieOptions(mode, { hostname, protocol });
        expect(options).toEqual({
          path: "/",
          sameSite: "strict",
          secure: !(
            mode === "development" &&
            protocol === "http:" &&
            ["localhost", "127.0.0.1", "[::1]"].includes(hostname)
          ),
        });
      }
    }
  }
});

it("does not send the production session cookie over HTTP and supports deletion", () => {
  const jar = new CookieJar();
  const options = sessionCookieOptions("production", {
    hostname: "example.com",
    protocol: "https:",
  });
  const attributes = `Path=${options.path}; SameSite=${options.sameSite}; ${options.secure ? "Secure" : ""}`;
  jar.setCookieSync(`LoginToken=jwt; ${attributes}`, "https://example.com");
  expect(jar.getCookieStringSync("https://example.com/api/session")).toBe(
    "LoginToken=jwt",
  );
  expect(jar.getCookieStringSync("http://example.com/")).toBe("");
  jar.setCookieSync(
    `LoginToken=; Max-Age=0; ${attributes}`,
    "https://example.com",
  );
  expect(jar.getCookieStringSync("https://example.com/")).toBe("");
});
