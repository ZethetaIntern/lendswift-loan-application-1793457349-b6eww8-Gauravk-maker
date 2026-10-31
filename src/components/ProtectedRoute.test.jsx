import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

const auth = vi.hoisted(() => ({ user: null, loading: false }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth }));

function renderRoute(initial = "/private") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/private" element={<ProtectedRoute><h1>Private page</h1></ProtectedRoute>} />
        <Route path="/login" element={<h1>Login page</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("shows a loading message while session is being checked", () => {
    auth.user = null;
    auth.loading = true;
    renderRoute();
    expect(screen.getByText("Checking your session...")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to login", () => {
    auth.user = null;
    auth.loading = false;
    renderRoute();
    expect(screen.getByRole("heading", { name: "Login page" })).toBeInTheDocument();
  });

  it("renders protected content for authenticated users", () => {
    auth.user = { id: "user-1" };
    auth.loading = false;
    renderRoute();
    expect(screen.getByRole("heading", { name: "Private page" })).toBeInTheDocument();
  });
});
