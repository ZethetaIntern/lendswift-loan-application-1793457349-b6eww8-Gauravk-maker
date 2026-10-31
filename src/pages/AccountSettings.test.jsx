import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AccountSettings from "./AccountSettings";

const auth = vi.hoisted(() => ({
  user: { email: "user@example.com", user_metadata: { full_name: "Test User" } },
  updateProfile: vi.fn(), updatePassword: vi.fn(), signOut: vi.fn(),
}));
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth }));
function renderSettings(path = "/settings") {
  return render(<MemoryRouter initialEntries={[path]}><AccountSettings /></MemoryRouter>);
}

beforeEach(() => {
  auth.updateProfile.mockReset(); auth.updatePassword.mockReset(); auth.signOut.mockReset();
  localStorage.clear(); document.documentElement.dataset.theme = "";
});

describe("AccountSettings", () => {
  it("renders profile information from the authenticated user", () => {
    renderSettings();
    expect(screen.getByRole("heading", { name: "User Profile" })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toHaveValue("user@example.com");
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Test User");
  });

  it("validates an empty profile name", () => {
    renderSettings();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));
    expect(screen.getByText("Please enter your full name.")).toBeInTheDocument();
    expect(auth.updateProfile).not.toHaveBeenCalled();
  });

  it("saves profile changes", async () => {
    auth.updateProfile.mockResolvedValueOnce({});
    renderSettings();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: " New Name " } });
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));
    expect(await screen.findByText("Profile updated successfully.")).toBeInTheDocument();
    expect(auth.updateProfile).toHaveBeenCalledWith({ name: "New Name" });
  });

  it("validates password length before calling updatePassword", () => {
    renderSettings("/settings?tab=security");
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: /change password/i }));
    expect(screen.getByText("Password must contain at least 8 characters.")).toBeInTheDocument();
    expect(auth.updatePassword).not.toHaveBeenCalled();
  });

  it("updates a valid password", async () => {
    auth.updatePassword.mockResolvedValueOnce({});
    renderSettings("/settings?tab=security");
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "newpassword123" } });
    fireEvent.click(screen.getByRole("button", { name: /change password/i }));
    expect(await screen.findByText("Password changed successfully.")).toBeInTheDocument();
    expect(auth.updatePassword).toHaveBeenCalledWith("newpassword123");
    await waitFor(() => expect(screen.getByLabelText(/new password/i)).toHaveValue(""));
  });

  it("persists theme preference", () => {
    renderSettings("/settings?tab=appearance");
    fireEvent.click(screen.getByRole("checkbox", { name: /enable dark theme/i }));
    expect(localStorage.getItem("lendswift-theme")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("saves notification preferences locally", async () => {
    renderSettings("/settings?tab=notifications");
    fireEvent.click(screen.getByLabelText(/email notifications/i));
    fireEvent.click(screen.getByLabelText(/product updates/i));
    fireEvent.click(screen.getByRole("button", { name: /save notification preferences/i }));
    expect(localStorage.getItem("lendswift-email-notifications")).toBe("off");
    expect(localStorage.getItem("lendswift-product-updates")).toBe("on");
    expect(screen.getByRole("status")).toHaveTextContent("Notification preferences saved");
  });

  it("calls signOut from the logout action", async () => {
    auth.signOut.mockResolvedValueOnce();
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: /log out/i }));
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledOnce());
  });
});
