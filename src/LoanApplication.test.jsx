import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./LoanApplication";

// Mock authentication so tests do not depend on a real login.
vi.mock("./context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      email: "test@example.com",
      user_metadata: { full_name: "Test User" },
    },
    signOut: vi.fn(),
  }),
}));

// Disable auto-save during tests.
vi.mock("./hooks/useAutoSave", () => ({
  useAutoSave: () => null,
}));

// Mock encrypted draft storage.
vi.mock("./utils/encryption", () => ({
  decryptDraft: vi.fn(),
  draftStorageKey: vi.fn(() => "test-draft"),
}));

function renderApp() {
  return render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
}

function completePersonalDetails({
  email = "test@example.com",
  alternateMobile = "",
} = {}) {
  const dob = new Date();
  dob.setFullYear(dob.getFullYear() - 25);

  const dobValue = [
    dob.getFullYear(),
    String(dob.getMonth() + 1).padStart(2, "0"),
    String(dob.getDate()).padStart(2, "0"),
  ].join("-");

  fireEvent.change(screen.getByLabelText(/Full name/i), {
    target: { value: "Test Applicant" },
  });

  fireEvent.change(screen.getByLabelText(/Date of birth/i), {
    target: { value: dobValue },
  });

  fireEvent.click(screen.getByLabelText("Male"));

  fireEvent.change(screen.getByLabelText(/Marital status/i), {
    target: { value: "Single" },
  });

  fireEvent.change(screen.getByLabelText(/Father's name/i), {
    target: { value: "Test Father" },
  });

  fireEvent.change(screen.getByLabelText(/Mother's name/i), {
    target: { value: "Test Mother" },
  });

  fireEvent.change(screen.getByLabelText(/^Email/i), {
    target: { value: email },
  });

  fireEvent.change(screen.getByLabelText(/Mobile number/i), {
    target: { value: "9876543210" },
  });

  if (alternateMobile) {
    fireEvent.change(screen.getByLabelText(/Alternate mobile/i), {
      target: { value: alternateMobile },
    });
  }
}

describe("LendSwift Loan Application UI", () => {
  it("renders the initial loan details step", () => {
    renderApp();

    expect(
      screen.getByRole("heading", { name: /Loan details/i }),
    ).toBeInTheDocument();
  });

  it("shows an error when the loan amount exceeds the allowed maximum", async () => {
    renderApp();

    fireEvent.change(screen.getByLabelText(/Loan amount/i), {
      target: { value: "2000000" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(
      await screen.findByText(/Enter an amount from/i),
    ).toBeInTheDocument();
  });

  it("does not proceed from personal information when required fields are empty", async () => {
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(
      screen.getByRole("heading", { name: /Personal information/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(
      await screen.findByRole("heading", { name: /Personal information/i }),
    ).toBeInTheDocument();
  });
  it("moves to identity verification after valid personal information", () => {
    renderApp();

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    completePersonalDetails();

    // Step 2 -> Step 3
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(
      screen.getByRole("heading", { name: /Identity verification/i }),
    ).toBeInTheDocument();
  });

  it("rejects an invalid email address", async () => {
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    completePersonalDetails({ email: "invalid-email" });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(
      await screen.findByText(/Enter a valid email address/i),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: /Personal information/i }),
    ).toBeInTheDocument();
  });

  it("rejects an alternate mobile number matching the primary number", async () => {
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    completePersonalDetails({
      alternateMobile: "9876543210",
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(
      await screen.findByText(/Enter a different valid mobile number/i),
    ).toBeInTheDocument();
  });

  it("opens the account menu and displays account links", () => {
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: /Account/i }));

    expect(screen.getByRole("menu")).toBeInTheDocument();

    expect(
      screen.getByRole("menuitem", { name: /User Profile/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("menuitem", { name: /Account Settings/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("menuitem", { name: /Security/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("menuitem", { name: /Help & Support/i }),
    ).toBeInTheDocument();
  });

  it("toggles dark theme from the account menu", () => {
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: /Account/i }));

    fireEvent.click(screen.getByRole("menuitem", { name: /Theme: Light/i }));

    expect(document.querySelector(".app-shell")).toHaveClass("dark-theme");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  describe("Additional Loan Application Tests", () => {
    it("shows default loan details from INITIAL", () => {
      renderApp();

      expect(screen.getByDisplayValue("300000")).toBeInTheDocument();
      expect(screen.getByDisplayValue("36")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Education")).toBeInTheDocument();
    });

    it("shows Personal loan as the default loan type", () => {
      renderApp();

      expect(screen.getByDisplayValue("Personal")).toBeInTheDocument();
    });

    it("shows the first step when application loads", () => {
      renderApp();

      expect(
        screen.getByRole("heading", { name: "Loan details" }),
      ).toBeInTheDocument();
    });

    it("does not show co-applicant step for default single applicant flow", () => {
      renderApp();

      expect(
        screen.queryByText(/co-applicant details/i),
      ).not.toBeInTheDocument();
    });
  });

  it("shows validation errors for an invalid loan amount", async () => {
    renderApp();

    fireEvent.change(screen.getByLabelText(/Loan amount/i), {
      target: { value: "1000" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(
      await screen.findByText(/Enter an amount from/i),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: /Loan details/i }),
    ).toBeInTheDocument();
  });

  it("does not navigate forward when step one has validation errors", async () => {
    renderApp();

    fireEvent.change(screen.getByLabelText(/Loan amount/i), {
      target: { value: "1000" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(
      await screen.findByText(/Enter an amount from/i),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("heading", { name: /Personal information/i }),
    ).not.toBeInTheDocument();
  });

  it("allows moving forward and back when the first step is valid", () => {
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(
      screen.getByRole("heading", { name: /Personal information/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Back/i }));

    expect(
      screen.getByRole("heading", { name: /Loan details/i }),
    ).toBeInTheDocument();
  });

  it("shows an error when the loan amount is below the allowed minimum", async () => {
    renderApp();

    fireEvent.change(screen.getByLabelText(/Loan amount/i), {
      target: { value: "1000" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(
      await screen.findByText(/Enter an amount from/i),
    ).toBeInTheDocument();
  });

  it("shows an error when loan tenure exceeds the applicant's age-based limit", async () => {
    renderApp();

    fireEvent.change(screen.getByLabelText(/Tenure/i), {
      target: { value: "60" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(
      screen.getByRole("heading", { name: /Personal information/i }),
    ).toBeInTheDocument();

    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 61);

    const dobValue = [
      dob.getFullYear(),
      String(dob.getMonth() + 1).padStart(2, "0"),
      String(dob.getDate()).padStart(2, "0"),
    ].join("-");

    fireEvent.change(screen.getByLabelText(/Date of birth/i), {
      target: { value: dobValue },
    });

    fireEvent.change(screen.getByLabelText(/Full name/i), {
      target: { value: "Test Applicant" },
    });

    fireEvent.click(screen.getByLabelText("Male"));

    fireEvent.change(screen.getByLabelText(/Marital status/i), {
      target: { value: "Single" },
    });

    fireEvent.change(screen.getByLabelText(/Father's name/i), {
      target: { value: "Test Father" },
    });

    fireEvent.change(screen.getByLabelText(/Mother's name/i), {
      target: { value: "Test Mother" },
    });

    fireEvent.change(screen.getByLabelText(/^Email/i), {
      target: { value: "test@example.com" },
    });

    fireEvent.change(screen.getByLabelText(/Mobile number/i), {
      target: { value: "9876543210" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(
      await screen.findByText(/maximum eligible tenure/i),
    ).toBeInTheDocument();
  });
});
