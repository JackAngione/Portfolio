// @vitest-environment jsdom
import { Profiler } from "react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import AlbumArtPixelAnimation from "../src/skills/MUSIC/albumArtPixelAnimation.jsx";

vi.mock("../src/serverInfo.jsx", () => ({
  backend_address: "http://local-api",
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("skips renders inside the same tile threshold and updates for resize or orientation changes", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ["cover.jpg"] })),
  );
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: 950,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    writable: true,
    value: 750,
  });
  let renders = 0;
  const view = render(
    <Profiler
      id="grid"
      onRender={() => {
        renders += 1;
      }}
    >
      <AlbumArtPixelAnimation />
    </Profiler>,
  );
  await waitFor(() =>
    expect(view.container.querySelector("img")).not.toBeNull(),
  );
  const grid = view.container.querySelector('[style*="grid-template-columns"]');
  expect(grid.style.gridTemplateColumns).toBe("repeat(11, 100px)");
  expect(grid.children).toHaveLength(99);
  const settledRenders = renders;
  window.innerWidth = 960;
  window.innerHeight = 760;
  act(() => window.dispatchEvent(new Event("resize")));
  expect(renders).toBe(settledRenders);
  expect(grid.children).toHaveLength(99);

  window.innerWidth = 1050;
  act(() => window.dispatchEvent(new Event("resize")));
  expect(renders).toBe(settledRenders + 1);
  expect(grid.style.gridTemplateColumns).toBe("repeat(12, 100px)");

  window.innerWidth = 650;
  window.innerHeight = 950;
  act(() => window.dispatchEvent(new Event("orientationchange")));
  expect(grid.style.gridTemplateColumns).toBe("repeat(8, 100px)");
  expect(grid.children).toHaveLength(88);
});
