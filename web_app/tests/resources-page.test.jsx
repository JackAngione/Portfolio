// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AuthContext } from "../src/useAuth.jsx";
import ResourcesPage from "../src/routes/resourcesPage.jsx";

const state = vi.hoisted(() => ({
  highlightsMounted: 0,
  highlightsUnmounted: 0,
  refresh: vi.fn(),
  adapter: vi.fn(() => ({ searchClient: {} })),
}));
vi.mock("../src/serverInfo.jsx", () => ({
  backend_address: "http://local-api",
  search_server: "http://local-search",
}));
vi.mock("../src/API_Keys", () => ({
  meiliSearch_Search_Key: "test-search-key",
}));
vi.mock("@meilisearch/instant-meilisearch", () => ({
  instantMeiliSearch: state.adapter,
}));
vi.mock("react-instantsearch", async () => {
  const React = await import("react");
  const hit = {
    objectID: "resource-1",
    resource_id: "resource-1",
    title: "First resource",
    description: "Description",
    source: "https://example.com/first",
    category: "Coding",
    subCategories: ["React"],
    keywords: ["ui"],
  };
  return {
    InstantSearch: ({ children }) => <>{children}</>,
    Hits: ({ hitComponent: Hit }) => <Hit hit={hit} />,
    Highlight: ({ hit }) => {
      React.useEffect(() => {
        state.highlightsMounted += 1;
        return () => {
          state.highlightsUnmounted += 1;
        };
      }, []);
      return hit.title;
    },
    SearchBox: () => {
      const [query, setQuery] = React.useState("");
      return (
        <input
          aria-label="Search resources"
          className="ais-SearchBox-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      );
    },
    RefinementList: () => null,
    ClearRefinements: () => null,
    useInstantSearch: () => ({ refresh: state.refresh }),
  };
});

beforeEach(() => {
  state.highlightsMounted = 0;
  state.highlightsUnmounted = 0;
  state.refresh.mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, options) =>
      url.endsWith("/categories")
        ? {
            ok: true,
            json: async () => [{ title: "Coding", subCategories: ["React"] }],
          }
        : options?.method === "PUT"
          ? { ok: true }
          : Promise.reject(new Error("unexpected request")),
    ),
  );
  vi.stubGlobal("alert", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("keeps search hits and search input mounted while opening and closing edit, then refreshes after a successful edit", async () => {
  render(
    <AuthContext.Provider value={{ loggedIn: true, token: "test-token" }}>
      <ResourcesPage />
    </AuthContext.Provider>,
  );
  expect(fetch).not.toHaveBeenCalled();
  expect(state.adapter).toHaveBeenCalledWith(
    "http://local-search",
    "test-search-key",
    {
      placeholderSearch: false,
      primaryKey: "resource_id",
    },
  );
  const search = screen.getByRole("textbox", { name: "Search resources" });
  fireEvent.change(search, { target: { value: "react" } });
  fireEvent.click(screen.getByRole("button", { name: "EDIT" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("textbox", { name: /enter title/i }).value).toBe(
    "First resource",
  );
  expect(state.highlightsMounted).toBe(1);
  expect(state.highlightsUnmounted).toBe(0);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByRole("textbox", { name: "Search resources" })).toBe(
    search,
  );
  expect(search.value).toBe("react");
  fireEvent.click(screen.getByRole("button", { name: "EDIT" }));
  fireEvent.change(screen.getByRole("textbox", { name: /enter title/i }), {
    target: { value: "Edited" },
  });
  fireEvent.click(screen.getByRole("button", { name: /update tutorial/i }));
  await waitFor(() => expect(state.refresh).toHaveBeenCalledOnce());
  expect(state.highlightsMounted).toBe(1);
  expect(state.highlightsUnmounted).toBe(0);
  expect(
    fetch.mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(1);
});
