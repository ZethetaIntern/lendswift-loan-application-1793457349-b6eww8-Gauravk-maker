import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Login from "./Login";

const signIn = vi.fn();
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ signIn }) }));
function Destination() {
  const location = useLocation();
  return <p>Destination: {location.pathname}</p>;
}
function renderLogin(initialEntries = ["/login"]) {
  return render(<MemoryRouter initialEntries={initialEntries}><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/application" element={<Destination />} />
    <Route path="/private" element={<Destination />} />
  </Routes></MemoryRouter>);
}

describe("Login page", () => {
  beforeEach(() => signIn.mockReset());

  it("renders login fields and signup link", () => {
    renderLogin();
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute("href", "/signup");
  });

  it("trims email and navigates after successful login", async () => {
    signIn.mockResolvedValueOnce({ user: { id: "1" } });
    renderLogin();
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "  user@example.com  " } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith({ email: "user@example.com", password: "password123" }));
    expect(await screen.findByText("Destination: /application")).toBeInTheDocument();
  });

  it("returns to the originally requested route after login", async () => {
    signIn.mockResolvedValueOnce({});
    renderLogin([{ pathname: "/login", state: { from: { pathname: "/private" } } }]);
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Destination: /private")).toBeInTheDocument();
  });

  it("shows the authentication error", async () => {
    signIn.mockRejectedValueOnce(new Error("Invalid credentials"));
    renderLogin();
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrongpass" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  });
});
