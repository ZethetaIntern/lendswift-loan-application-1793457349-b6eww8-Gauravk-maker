import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Signup from "./Signup";

const signUp = vi.fn();
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ signUp }) }));
function Destination() { const location = useLocation(); return <p>Destination: {location.pathname}</p>; }
function renderSignup() { return render(<MemoryRouter initialEntries={["/signup"]}><Routes>
  <Route path="/signup" element={<Signup />} /><Route path="/application" element={<Destination />} />
</Routes></MemoryRouter>); }
function fillForm() {
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: " Test User " } });
  fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: " user@example.com " } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
}

describe("Signup page", () => {
  beforeEach(() => signUp.mockReset());
  it("renders signup fields and login link", () => {
    renderSignup();
    expect(screen.getByRole("heading", { name: /create your lendswift account/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute("href", "/login");
  });
  it("rejects passwords shorter than eight characters", () => {
    renderSignup();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Test User" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(screen.getByText("Password must contain at least 8 characters.")).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });
  it("navigates when signup immediately creates a session", async () => {
    signUp.mockResolvedValueOnce({ session: { access_token: "token" } });
    renderSignup(); fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(await screen.findByText("Destination: /application")).toBeInTheDocument();
    expect(signUp).toHaveBeenCalledWith({ name: "Test User", email: "user@example.com", password: "password123" });
  });
  it("shows email verification instructions when no session is returned", async () => {
    signUp.mockResolvedValueOnce({ session: null });
    renderSignup(); fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(await screen.findByText(/check your email to verify/i)).toBeInTheDocument();
  });
  it("shows signup errors", async () => {
    signUp.mockRejectedValueOnce(new Error("Email already registered"));
    renderSignup(); fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(await screen.findByText("Email already registered")).toBeInTheDocument();
  });
});
