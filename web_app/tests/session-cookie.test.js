// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vite-plus/test";
import Cookies from "js-cookie";
import { login, logout } from "../src/useAuth.jsx";

vi.mock("js-cookie", () => ({
  default: { set: vi.fn(), get: vi.fn(() => "jwt"), remove: vi.fn() },
}));
vi.mock("../src/serverInfo.jsx", () => ({
  backend_address: "https://example.com/api",
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("sets Secure, SameSite and root path on login and deletes with matching attributes", async () => {
  vi.stubGlobal("window", {
    location: { hostname: "example.com", protocol: "https:", reload: vi.fn() },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ status: 200, json: async () => ({ token: "jwt" }) })),
  );
  expect(await login("admin", "password")).toBe("login successful");
  expect(Cookies.set).toHaveBeenCalledWith("LoginToken", "jwt", {
    secure: true,
    sameSite: "strict",
    path: "/",
    expires: 1,
  });
  await logout();
  expect(fetch).toHaveBeenLastCalledWith("https://example.com/api/session", {
    method: "DELETE",
    headers: { authorization: "Bearer jwt" },
  });
  expect(Cookies.remove).toHaveBeenCalledWith("LoginToken", {
    secure: true,
    sameSite: "strict",
    path: "/",
  });
});
