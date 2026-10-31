
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./LoanApplication";

const { auth, fieldsByStep } = vi.hoisted(() => ({
  auth: {
    signOut: vi.fn().mockResolvedValue(undefined),
  },
  fieldsByStep: {
    1: [
      "loanType",
      "loanAmount",
      "tenure",
      "loanPurpose",
      "dob",
      "referralCode",
    ],
    2: [
      "fullName",
      "dob",
      "gender",
      "maritalStatus",
      "fatherName",
      "motherName",
      "email",
      "mobile",
      "alternateMobile",
    ],
    3: ["pan", "aadhaar", "aadhaarConsent"],
    4: [
      "currentAddress1",
      "currentAddress2",
      "pinCode",
      "city",
      "state",
      "residenceType",
      "yearsAtAddress",
      "rentAmount",
      "previousAddress",
      "samePermanentAddress",
      "permanentAddress1",
      "permanentPin",
      "permanentCity",
      "permanentState",
    ],
    5: [
      "employmentType",
      "experienceYears",
      "companyName",
      "designation",
      "monthlySalary",
      "businessName",
      "businessType",
      "annualTurnover",
      "yearsInBusiness",
      "monthlyIncome",
      "gstNumber",
      "businessAddress",
    ],
    6: [
      "coApplicantName",
      "coApplicantRelationship",
      "coApplicantPan",
      "coApplicantIncome",
      "coApplicantConsent",
    ],
    8: [
      "consentAccuracy",
      "consentCredit",
      "consentTerms",
      "consentCommunications",
      "affordabilityConsent",
    ],
  },
}));

vi.mock("./context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      email: "coverage@example.com",
      user_metadata: {
        full_name: "Coverage User",
      },
    },
    signOut: auth.signOut,
  }),
}));

vi.mock("./hooks/useAutoSave", () => ({
  useAutoSave: () => null,
}));

vi.mock("./utils/encryption", () => ({
  decryptDraft: vi.fn(),
  draftStorageKey: (type) => `draft-${type}`,
}));

vi.mock("./components/common/SignaturePad", () => ({
  default: ({ onChange }) => (
    <button
      type="button"
      aria-label="Capture signature"
      onClick={() => onChange("data:image/png;base64,dGVzdA==")}
    >
      Capture signature
    </button>
  ),
}));

vi.mock("./components/steps/StepFields", () => ({
  default: ({ step, data, setValue, onVerify, verification }) => (
    <div data-testid="mock-fields">
      {(fieldsByStep[step] || []).map((name) => {
        const isCheckbox =
          name.toLowerCase().includes("consent") ||
          name === "samePermanentAddress";

        return (
          <label key={name}>
            {name}
            <input
              aria-label={name}
              type={isCheckbox ? "checkbox" : "text"}
              checked={isCheckbox ? Boolean(data[name]) : undefined}
              value={!isCheckbox ? (data[name] ?? "") : undefined}
              onChange={(event) =>
                setValue(
                  name,
                  event.target.type === "checkbox"
                    ? event.target.checked
                    : event.target.value,
                )
              }
            />
          </label>
        );
      })}

      {step === 3 && (
        <>
          <button type="button" onClick={() => onVerify("pan")}>
            Verify PAN
          </button>

          <button type="button" onClick={() => onVerify("aadhaar")}>
            Verify Aadhaar
          </button>

          <span>{verification.pan}</span>
          <span>{verification.aadhaar}</span>
        </>
      )}
    </div>
  ),
}));

function renderApp() {
  return render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
}

function change(name, value) {
  fireEvent.change(screen.getByLabelText(name), {
    target: { value },
  });
}

function check(name) {
  const checkbox = screen.getByLabelText(name);

  if (!checkbox.checked) {
    fireEvent.click(checkbox);
  }

  expect(screen.getByLabelText(name)).toBeChecked();
}

function uncheck(name) {
  const checkbox = screen.getByLabelText(name);

  if (checkbox.checked) {
    fireEvent.click(checkbox);
  }

  expect(screen.getByLabelText(name)).not.toBeChecked();
}

function next() {
  fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
}

function back() {
  fireEvent.click(screen.getByRole("button", { name: /Back/i }));
}

function expectValidationErrors() {
  const alerts = screen.queryAllByRole("alert");
  const statuses = screen.queryAllByRole("status");

  expect(alerts.length + statuses.length).toBeGreaterThan(0);
}

function fillPersonalDetails(maritalStatus = "Single") {
  change("fullName", "Test Applicant");
  change("dob", "1995-01-01");
  change("gender", "Male");
  change("maritalStatus", maritalStatus);
  change("fatherName", "Test Father");
  change("motherName", "Test Mother");
  change("email", "test@example.com");
  change("mobile", "9876543210");
}

function fillIdentityDetails() {
  change("pan", "ABCPD1234F");
  change("aadhaar", "234567890124");
  check("aadhaarConsent");
}

async function verifyIdentity() {
  fireEvent.click(screen.getByRole("button", { name: "Verify PAN" }));

  await waitFor(
    () => {
      expect(screen.getByText("Verified")).toBeInTheDocument();
    },
    { timeout: 3000 },
  );

  fireEvent.click(screen.getByRole("button", { name: "Verify Aadhaar" }));

  await waitFor(
    () => {
      expect(screen.getAllByText("Verified")).toHaveLength(2);
    },
    { timeout: 3000 },
  );
}

async function goToIdentity() {
  next();
  fillPersonalDetails();
  next();
  fillIdentityDetails();
  await verifyIdentity();
}

async function goToAddress() {
  await goToIdentity();
  next();
}

async function goToEmployment() {
  await goToAddress();

  change("currentAddress1", "12 Main Road");
  change("pinCode", "380001");
  change("city", "Ahmedabad");
  change("state", "Gujarat");
  change("residenceType", "Owned");
  change("yearsAtAddress", "2");

  next();
}

async function goToCoApplicant() {
  await goToEmployment();

  change("employmentType", "Salaried");
  change("experienceYears", "2");
  change("companyName", "Test Company");
  change("designation", "Engineer");
  change("monthlySalary", "50000");

  next();
}

async function goToDocuments() {
  await goToCoApplicant();

  // Single applicant: leave co-applicant details empty.
  next();

  expect(
    screen.getByRole("heading", {
      name: /Documents & signature/i,
    }),
  ).toBeInTheDocument();
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("LoanApplication additional branch and workflow coverage", () => {
  it("validates loan tenure and referral code", async () => {
  renderApp();

  change("tenure", "5");
  change("referralCode", "bad");

  next();

  await waitFor(() => {
    expectValidationErrors();
  });

  expect(
    screen.getByLabelText("tenure")
  ).toHaveValue("5");

  expect(
    screen.getByLabelText("referralCode")
  ).toHaveValue("bad");
});

  it("validates personal details and invalid mobile numbers", async () => {
    renderApp();

    next();

    change("fullName", "X");
    change("dob", "2010-01-01");
    change("gender", "Male");
    change("maritalStatus", "Single");
    change("fatherName", "Father");
    change("motherName", "Mother");
    change("email", "bad@");
    change("mobile", "123");
    change("alternateMobile", "123");

    next();

    await waitFor(() => {
      expectValidationErrors();
    });
  });

it("rejects invalid PAN, Aadhaar and identity consent", async () => {
  renderApp();

  next();
  fillPersonalDetails();
  next();

  change("pan", "INVALID");
  change("aadhaar", "111111111111");
  check("aadhaarConsent");

  next();

  await waitFor(() => {
    expectValidationErrors();
  });

  expect(screen.getByLabelText("pan")).toHaveValue("INVALID");

  expect(screen.getByLabelText("aadhaar")).toHaveValue("111111111111");

  expect(screen.getByLabelText("aadhaarConsent")).toBeChecked();

  expect(
    screen.getByRole("heading", {
      name: /Identity verification/i,
    })
  ).toBeInTheDocument();
});

  it("runs simulated PAN verification and invalidates it after identity changes", async () => {
    vi.useFakeTimers();

    try {
      renderApp();

      next();
      fillPersonalDetails();
      next();

      change("pan", "ABCPD1234F");
      change("aadhaar", "234567890124");
      check("aadhaarConsent");

      fireEvent.click(screen.getByRole("button", { name: "Verify PAN" }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });

      expect(screen.getByText("Verified")).toBeInTheDocument();

      change("pan", "ABCPD1235F");

      expect(screen.queryByText("Verified")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("validates rented address, rent and previous address", async () => {
    renderApp();

    await goToAddress();

    change("currentAddress1", "12 Main Road");
    change("pinCode", "380001");
    change("city", "Wrong City");
    change("state", "Delhi");
    change("residenceType", "Rented");
    change("yearsAtAddress", "0");
    change("rentAmount", "-1");

    next();

    await waitFor(() => {
      expectValidationErrors();
    });
  });

  it("validates permanent address fields", async () => {
    renderApp();

    await goToAddress();

    change("currentAddress1", "Current address");
    change("pinCode", "123");
    change("city", "Ahmedabad");
    change("state", "Gujarat");
    change("residenceType", "Owned");
    change("yearsAtAddress", "2");

    // Switch to a separate permanent address.
    uncheck("samePermanentAddress");

    change("permanentAddress1", "");
    change("permanentPin", "12");

    next();

    await waitFor(() => {
      expectValidationErrors();
    });
  });

  it("validates minimum salary for salaried applicants", async () => {
    renderApp();

    await goToEmployment();

    change("employmentType", "Salaried");
    change("experienceYears", "2");
    change("companyName", "Company");
    change("designation", "Engineer");
    change("monthlySalary", "10000");

    next();

    await waitFor(() => {
      expectValidationErrors();
    });
  });

  it("validates business turnover, experience and GST details", async () => {
    renderApp();

    await goToEmployment();

    change("employmentType", "Business Owner");
    change("experienceYears", "2");
    change("businessName", "Shop");
    change("businessType", "Retail");
    change("annualTurnover", "100000");
    change("yearsInBusiness", "1");
    change("monthlyIncome", "50000");
    change("gstNumber", "bad");

    next();

    await waitFor(() => {
      expectValidationErrors();
    });
  });

  it("requires co-applicant consent and validates relationship for married applicants", async () => {
    renderApp();

    next();
    fillPersonalDetails("Married");
    next();

    fillIdentityDetails();
    await verifyIdentity();

    next();

    change("currentAddress1", "Road");
    change("pinCode", "380001");
    change("city", "Ahmedabad");
    change("state", "Gujarat");
    change("residenceType", "Owned");
    change("yearsAtAddress", "2");

    next();

    change("employmentType", "Salaried");
    change("experienceYears", "2");
    change("companyName", "Company");
    change("designation", "Developer");
    change("monthlySalary", "50000");

    next();

    expect(
      screen.getByRole("heading", { name: /Co-applicant/i }),
    ).toBeInTheDocument();

    // Fill co-applicant details with an invalid relationship.
    change("coApplicantName", "Partner");
    change("coApplicantRelationship", "Friend");
    change("coApplicantPan", "ABCPD1234F");
    change("coApplicantIncome", "20000");

    // First attempt: consent is missing.
    next();

    expect(
      await screen.findByText(/required consents are missing/i),
    ).toBeInTheDocument();

    // Provide consent exactly once.
    check("coApplicantConsent");

    // Second attempt: relationship validation should be tested.
    next();

    expect(
      await screen.findByText(/Please fix the highlighted fields/i),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: /Co-applicant/i }),
    ).toBeInTheDocument();
  });

  it("shows document and signature validation errors", async () => {
    renderApp();

    await goToDocuments();

    next();

    const alerts = await screen.findAllByRole("alert");

    expect(alerts.length).toBeGreaterThan(0);

    expect(
      screen.getByText(/Aadhaar card.*front is required/i),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Please capture your signature/i),
    ).toBeInTheDocument();
  });

  it("does not allow review to be reached without completing document requirements", async () => {
    renderApp();

    await goToDocuments();

    next();

    expect(
      screen.getByRole("heading", {
        name: /Documents & signature/i,
      }),
    ).toBeInTheDocument();
  });

  it("opens account menu and handles logout", async () => {
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: /Account/i }));

    fireEvent.click(screen.getByRole("menuitem", { name: /Log out/i }));

    await waitFor(() => {
      expect(auth.signOut).toHaveBeenCalledTimes(1);
    });
  });
  
  it("rejects an unsupported document extension", async () => {
    renderApp();
    await goToDocuments();

    const file = new File(["invalid"], "statement.txt", {
      type: "text/plain",
    });

    fireEvent.change(
      screen.getByLabelText(/Upload Bank statements/i),
      { target: { files: [file] } },
    );

    expect(
      await screen.findByText(/Unsupported file format/i),
    ).toBeInTheDocument();
  });

  it("rejects a PDF with an incorrect MIME type", async () => {
    renderApp();
    await goToDocuments();

    const file = new File(["content"], "statement.pdf", {
      type: "text/plain",
    });

    fireEvent.change(
      screen.getByLabelText(/Upload Bank statements/i),
      { target: { files: [file] } },
    );

    expect(
      await screen.findByText(/file content type does not match/i),
    ).toBeInTheDocument();
  });

  it("rejects an empty document", async () => {
    renderApp();
    await goToDocuments();

    const file = new File([], "statement.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(
      screen.getByLabelText(/Upload Bank statements/i),
      { target: { files: [file] } },
    );

    expect(
      await screen.findByText(/selected file is empty/i),
    ).toBeInTheDocument();
  });

  it("rejects a document exceeding its maximum size", async () => {
    renderApp();
    await goToDocuments();

    const file = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      "statement.pdf",
      { type: "application/pdf" },
    );

    fireEvent.change(
      screen.getByLabelText(/Upload Bank statements/i),
      { target: { files: [file] } },
    );

    expect(
      await screen.findByText(/File must be 10 MB/i),
    ).toBeInTheDocument();
  });

  it("uploads and removes a valid PDF document", async () => {
    renderApp();
    await goToDocuments();

    const file = new File(["valid PDF content"], "statement.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(
      screen.getByLabelText(/Upload Bank statements/i),
      { target: { files: [file] } },
    );

    expect(
      await screen.findByText("statement.pdf"),
    ).toBeInTheDocument();

    fireEvent.click(
  screen.getByRole("button", {
    name: /Remove.*Bank statements/i,
  }),
);

    await waitFor(() => {
      expect(screen.queryByText("statement.pdf")).not.toBeInTheDocument();
    });
  });
});
