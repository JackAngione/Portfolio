// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import MusicPlayer from "../src/skills/MUSIC/musicPlayer.jsx";

const player = vi.hoisted(() => ({
  setOptions: vi.fn(),
  playPause: vi.fn(),
  getDuration: () => 120,
  setVolume: vi.fn(),
  setTime: vi.fn(),
}));

vi.mock("@wavesurfer/react", () => ({
  useWavesurfer: () => ({
    wavesurfer: player,
    isReady: true,
    isPlaying: false,
    currentTime: 30,
  }),
}));
vi.mock("../src/serverInfo.jsx", () => ({
  backend_address: "http://local-api",
}));
vi.mock("../src/theme.jsx", () => ({
  themeColor: () => "#ffffff",
  useResolvedTheme: () => "dark",
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ peaks: [0.5, 1], duration: 120 }),
    })),
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it.each([1024, 375])(
  "preserves accessible seek and volume controls at %ipx",
  async (width) => {
    vi.stubGlobal("innerWidth", width);
    render(
      <MusicPlayer
        song={{ artist_id: "artist", song_id: "track", song_title: "Track" }}
      />,
    );
    const seek = await screen.findByRole("slider", {
      name: "song position slider",
    });
    const volume = screen.getByRole("slider", { name: "volume slider" });
    await waitFor(() => expect(seek.getAttribute("max")).toBe("120"));
    expect(seek.value).toBe("30");
    expect(volume.value).toBe("0.25");

    fireEvent.keyDown(seek, { key: "ArrowRight" });
    expect(player.setTime).toHaveBeenLastCalledWith(30.01);
    fireEvent.keyDown(volume, { key: "ArrowUp" });
    expect(player.setVolume).toHaveBeenLastCalledWith(0.26 ** 2);
    expect(
      volume.closest("[data-orientation]").getAttribute("data-orientation"),
    ).toBe(width < 640 ? "vertical" : "horizontal");

    fireEvent.click(screen.getByRole("button", { name: "play" }));
    expect(player.playPause).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: " ", code: "Space" });
    expect(player.playPause).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(volume, { key: " ", code: "Space" });
    expect(player.playPause).toHaveBeenCalledTimes(2);
  },
);
