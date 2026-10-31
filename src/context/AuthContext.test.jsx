import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  act,
  renderHook,
} from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";

const api = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  updateUser: vi.fn(),
  callback: null,
  unsubscribe: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({ supabase: { auth: api } }));
function Consumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="email">{auth.user?.email || "none"}</span>
      <button
        onClick={() =>
          auth.signUp({
            name: "Test",
            email: "test@example.com",
            password: "password123",
          })
        }
      >
        signup
      </button>
      <button
        onClick={() =>
          auth.signIn({ email: "test@example.com", password: "password123" })
        }
      >
        signin
      </button>
      <button onClick={() => auth.signOut()}>signout</button>
      <button onClick={() => auth.updateProfile({ name: "Updated" })}>
        profile
      </button>
      <button onClick={() => auth.updatePassword("newpassword123")}>
        password
      </button>
    </div>
  );
}
function renderAuth() {
  return render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>,
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    Object.values(api).forEach((value) => {
      if (typeof value?.mockReset === "function") value.mockReset();
    });
    api.unsubscribe = vi.fn();
    api.getSession.mockResolvedValue({ data: { session: null }, error: null });
    api.onAuthStateChange.mockImplementation((callback) => {
      api.callback = callback;
      return { data: { subscription: { unsubscribe: api.unsubscribe } } };
    });
  });

  it("loads the current session and exposes the user", async () => {
    api.getSession.mockResolvedValueOnce({
      data: { session: { user: { email: "user@example.com" } } },
      error: null,
    });
    renderAuth();
    expect(await screen.findByTestId("email")).toHaveTextContent(
      "user@example.com",
    );
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("updates the user when an auth state event arrives", async () => {
    renderAuth();
    await waitFor(() => expect(api.callback).toBeTypeOf("function"));
    act(() =>
      api.callback("SIGNED_IN", { user: { email: "signed@example.com" } }),
    );
    expect(screen.getByTestId("email")).toHaveTextContent("signed@example.com");
  });

  it("forwards signup details and full name metadata", async () => {
    api.signUp.mockResolvedValueOnce({
      data: { user: { id: "1" } },
      error: null,
    });
    renderAuth();
    await screen.findByTestId("loading");
    await act(async () => screen.getByText("signup").click());
    expect(api.signUp).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
      options: { data: { full_name: "Test" } },
    });
  });

  it("forwards sign-in credentials", async () => {
    api.signInWithPassword.mockResolvedValueOnce({
      data: { session: {} },
      error: null,
    });
    renderAuth();
    await act(async () => screen.getByText("signin").click());
    expect(api.signInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
  });

  it("throws errors returned by Supabase auth methods", async () => {
    api.signOut.mockResolvedValueOnce({
      error: new Error("Signout failed"),
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await expect(result.current.signOut()).rejects.toThrow("Signout failed");
  });

  it("updates profile and password through Supabase", async () => {
    api.updateUser.mockResolvedValue({
      data: { user: { email: "updated@example.com" } },
      error: null,
    });
    renderAuth();
    await act(async () => screen.getByText("profile").click());
    expect(api.updateUser).toHaveBeenCalledWith({
      data: { full_name: "Updated" },
    });
    await act(async () => screen.getByText("password").click());
    expect(api.updateUser).toHaveBeenLastCalledWith({
      password: "newpassword123",
    });
  });

  it("unsubscribes from auth state changes on unmount", async () => {
    const view = renderAuth();
    await waitFor(() => expect(api.callback).toBeTypeOf("function"));
    view.unmount();
    expect(api.unsubscribe).toHaveBeenCalledOnce();
  });
});
