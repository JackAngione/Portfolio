// @vitest-environment jsdom
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AuthContext } from "../src/useAuth.jsx";
import EditModal from "../src/routes/modals/editModal.jsx";
import DeleteModal from "../src/routes/modals/deleteModal.jsx";
import userEvent from "@testing-library/user-event";

vi.mock("../src/serverInfo.jsx", () => ({
  backend_address: "http://local-api",
}));

const populated = {
  resource_id: "resource-1",
  title: "First resource",
  description: "Original description",
  source: "https://example.com/first",
  category: "Coding",
  subCategories: ["React"],
  keywords: ["ui"],
};
const empty = {
  resource_id: "resource-2",
  title: "Second resource",
  description: "",
  source: "https://example.com/second",
  category: "Photography",
  subCategories: [],
  keywords: [],
};

const auth = { loggedIn: true, token: "test-token" };
function show(ui) {
  return render(<AuthContext.Provider value={auth}>{ui}</AuthContext.Provider>);
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, options) => {
      if (url.endsWith("/categories")) {
        return {
          ok: true,
          json: async () => [
            { title: "Coding", subCategories: ["React"] },
            { title: "Photography", subCategories: [] },
          ],
        };
      }
      if (options?.method === "PUT" || options?.method === "DELETE")
        return { ok: true };
      throw new Error(`unexpected request: ${url}`);
    }),
  );
  vi.stubGlobal("alert", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("resource dialogs", () => {
  it("loads categories once and resets a cancelled draft when reopened or switched to an empty resource", async () => {
    const close = vi.fn();
    const renderDialog = (open, tutorialData) => (
      <AuthContext.Provider value={auth}>
        <EditModal open={open} tutorialData={tutorialData} onClose={close} />
      </AuthContext.Provider>
    );
    const view = render(renderDialog(true, populated));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("textbox", { name: /enter title/i }).value).toBe(
      "First resource",
    );
    fireEvent.change(screen.getByRole("textbox", { name: /enter title/i }), {
      target: { value: "Discard me" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(close).toHaveBeenCalledOnce();
    view.rerender(renderDialog(false, populated));
    view.rerender(renderDialog(true, populated));
    expect(screen.getByRole("textbox", { name: /enter title/i }).value).toBe(
      "First resource",
    );
    view.rerender(renderDialog(false, populated));
    view.rerender(renderDialog(true, empty));
    expect(screen.getByRole("textbox", { name: /enter title/i }).value).toBe(
      "Second resource",
    );
    expect(
      screen.getByRole("textbox", { name: /enter description/i }).value,
    ).toBe("");
    expect(fetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /update tutorial/i }));
    const [, emptyPut] = fetch.mock.calls.find(
      ([, options]) => options?.method === "PUT",
    );
    expect(JSON.parse(emptyPut.body)).toMatchObject({
      subCategories: [],
      keywords: [],
    });
  });

  it("updates asynchronously loaded category options and clears subcategories when the category changes", async () => {
    const user = userEvent.setup();
    show(<EditModal open tutorialData={populated} onClose={vi.fn()} />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await user.click(screen.getAllByRole("combobox")[0]);
    await user.click(screen.getByText("Photography", { exact: true }));
    await user.click(screen.getByRole("button", { name: /update tutorial/i }));
    const [, put] = fetch.mock.calls.find(
      ([, options]) => options?.method === "PUT",
    );
    expect(JSON.parse(put.body)).toMatchObject({
      category: "Photography",
      subCategories: [],
    });
  });

  it("submits the current form, reports success and failure, and refreshes only after success", async () => {
    const onClose = vi.fn();
    const onEdited = vi.fn();
    const view = show(
      <EditModal
        open
        tutorialData={populated}
        onClose={onClose}
        onEdited={onEdited}
      />,
    );
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByRole("textbox", { name: /enter title/i }), {
      target: { value: "Updated title" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update tutorial/i }));
    expect(onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(onEdited).toHaveBeenCalledOnce());
    const [, put] = fetch.mock.calls.find(
      ([, options]) => options?.method === "PUT",
    );
    expect(JSON.parse(put.body)).toMatchObject({
      title: "Updated title",
      subCategories: ["React"],
      keywords: ["ui"],
      resource_id: "resource-1",
    });
    expect(put.headers.authorization).toBe("Bearer test-token");

    fetch.mockImplementation(async (url, options) =>
      options?.method === "PUT"
        ? { ok: false }
        : { ok: true, json: async () => [] },
    );
    view.rerender(
      <AuthContext.Provider value={auth}>
        <EditModal
          open={false}
          tutorialData={populated}
          onClose={onClose}
          onEdited={onEdited}
        />
      </AuthContext.Provider>,
    );
    view.rerender(
      <AuthContext.Provider value={auth}>
        <EditModal
          open
          tutorialData={empty}
          onClose={onClose}
          onEdited={onEdited}
        />
      </AuthContext.Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /update tutorial/i }));
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith("Error editing Resource!"),
    );
    expect(onEdited).toHaveBeenCalledTimes(1);
  });

  it("resets delete confirmation and refreshes only for successful deletes", async () => {
    const onClose = vi.fn();
    const onDeleted = vi.fn();
    const dialog = (open, tutorialData) => (
      <AuthContext.Provider value={auth}>
        <DeleteModal
          open={open}
          tutorialData={tutorialData}
          onClose={onClose}
          onDeleted={onDeleted}
        />
      </AuthContext.Provider>
    );
    const view = render(dialog(true, populated));
    const checkbox = screen.getByRole("checkbox");
    const deleteButton = screen.getByRole("button", { name: "" });
    expect(deleteButton.disabled).toBe(true);
    fireEvent.click(checkbox);
    expect(deleteButton.disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    view.rerender(dialog(false, populated));
    view.rerender(dialog(true, empty));
    expect(screen.getByRole("checkbox").checked).toBe(false);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "" }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
    const [url, options] = fetch.mock.calls.find(
      ([, settings]) => settings?.method === "DELETE",
    );
    expect(url).toBe("http://local-api/tutorials/resource-2");
    expect(options.headers.authorization).toBe("Bearer test-token");

    vi.spyOn(console, "error").mockImplementation(() => {});
    fetch.mockResolvedValue({ ok: false });
    view.rerender(dialog(false, empty));
    view.rerender(dialog(true, populated));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "" }));
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });
});
