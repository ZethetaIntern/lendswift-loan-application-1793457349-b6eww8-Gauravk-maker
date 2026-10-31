import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StepFields from "./StepFields";

const pinMocks = vi.hoisted(() => ({
  lookupPinCode: vi.fn(),
  setError: vi.fn(),
  isLoading: false,
  error: "",
}));

vi.mock("../../hooks/usePinCodeLookup", () => ({
  usePinCodeLookup: () => ({
    lookupPinCode: pinMocks.lookupPinCode,
    isLoading: pinMocks.isLoading,
    error: pinMocks.error,
    setError: pinMocks.setError,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  pinMocks.isLoading = false;
  pinMocks.error = "";
});

const defaultData = {
  loanType: "Personal",
  loanAmount: "300000",
  tenure: "36",
  loanPurpose: "Education",
  employmentType: "Salaried",
  yearsAtAddress: "2",
  experienceYears: "2",
  samePermanentAddress: true,
  documents: {},
};

function renderStep(step, data = {}) {
  const setValue = vi.fn();

  render(
    <StepFields
      step={step}
      data={{ ...defaultData, ...data }}
      setValue={setValue}
      errors={{}}
      onVerify={vi.fn()}
      verification={{}}
      affordability={null}
    />,
  );

  return setValue;
}

describe("StepFields Component Tests", () => {
  it("renders loan details fields in step 1", () => {
    renderStep(1);

    expect(screen.getByText("Choose loan type")).toBeInTheDocument();
    expect(screen.getByLabelText(/loan amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tenure/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/loan purpose/i)).toBeInTheDocument();
  });

  it("allows selecting a different loan type", () => {
    const setValue = renderStep(1);

    fireEvent.click(screen.getByLabelText("Home"));

    expect(setValue).toHaveBeenCalledWith("loanType", "Home");
  });

  it("renders personal information fields in step 2", () => {
    renderStep(2);

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mobile number/i)).toBeInTheDocument();
  });

  it("renders identity verification fields in step 3", () => {
    renderStep(3);

    expect(screen.getByLabelText(/pan number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/aadhaar number/i)).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Verify PAN" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Verify Aadhaar" }),
    ).toBeInTheDocument();
  });

  it("calls PAN verification callback", () => {
    const onVerify = vi.fn();

    render(
      <StepFields
        step={3}
        data={defaultData}
        setValue={vi.fn()}
        errors={{}}
        onVerify={onVerify}
        verification={{}}
        affordability={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Verify PAN" }));

    expect(onVerify).toHaveBeenCalledWith("pan");
  });

  it("shows passport field for high-value home loans", () => {
    renderStep(3, {
      loanType: "Home",
      loanAmount: "6000000",
    });

    expect(screen.getByLabelText(/passport number/i)).toBeInTheDocument();
  });

  it("renders address fields in step 4", () => {
    renderStep(4);

    expect(
      screen.getByLabelText(/current address line 1/i),
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/pin code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
  });

  it("shows rent field for rented residence", () => {
    renderStep(4, { residenceType: "Rented" });

    expect(screen.getByLabelText(/monthly rent/i)).toBeInTheDocument();
  });

  it("shows previous address when residence period is below one year", () => {
    renderStep(4, { yearsAtAddress: "0" });

    expect(screen.getByLabelText(/previous address/i)).toBeInTheDocument();
  });

  it("renders salaried employment fields in step 5", () => {
    renderStep(5, { employmentType: "Salaried" });

    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/designation/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/monthly net salary/i)).toBeInTheDocument();
  });

  it("renders business fields for self-employed applicants", () => {
    renderStep(5, { employmentType: "Self-Employed" });

    expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/annual turnover/i)).toBeInTheDocument();
  });

  it("shows GST field for business owners", () => {
    renderStep(5, { employmentType: "Business Owner" });

    expect(screen.getByLabelText(/gst number/i)).toBeInTheDocument();
  });

  it("renders co-applicant fields in step 6", () => {
    renderStep(6);

    expect(screen.getByLabelText(/co-applicant name/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/co-applicant pan/i)).toBeInTheDocument();
  });

  it("renders document instructions in step 7", () => {
    renderStep(7);

    expect(
      screen.getByText(/upload required documents below/i),
    ).toBeInTheDocument();
  });

  it("renders consent checkboxes in step 8", () => {
    renderStep(8);

    expect(screen.getByText(/review consents/i)).toBeInTheDocument();

    expect(
      screen.getByText(/information entered is accurate/i),
    ).toBeInTheDocument();
  });

  it("returns null for an unknown step", () => {
    const { container } = render(
      <StepFields step={99} data={defaultData} setValue={vi.fn()} />,
    );

    expect(container.firstChild).toBeNull();
  });
  
  it("shows the maximum loan amount warning", () => {
    renderStep(1, {
      loanType: "Personal",
      loanAmount: "2000000",
    });

    expect(
      screen.getByText(/Maximum amount for a personal loan/i)
    ).toBeInTheDocument();
  });

  it("shows home loan purpose options after selecting Home loan", () => {
    renderStep(1, { loanType: "Home" });

    expect(
      screen.getByRole("option", { name: "Purchase property" })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("option", { name: "Construction" })
    ).toBeInTheDocument();
  });

  it("shows business loan purpose options", () => {
    renderStep(1, { loanType: "Business" });

    expect(
      screen.getByRole("option", { name: "Working capital" })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("option", { name: "Equipment" })
    ).toBeInTheDocument();
  });

  it("resets tenure and loan purpose when loan type changes", () => {
    const setValue = renderStep(1);

    fireEvent.click(screen.getByLabelText("Home"));

    expect(setValue).toHaveBeenCalledWith("loanType", "Home");
    expect(setValue).toHaveBeenCalledWith("tenure", "");
    expect(setValue).toHaveBeenCalledWith("loanPurpose", "");
  });

  it("displays field validation errors", () => {
    render(
      <StepFields
        step={2}
        data={defaultData}
        setValue={vi.fn()}
        errors={{ fullName: "Full name is required" }}
      />
    );

    expect(
      screen.getByText("Full name is required")
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/Full name/i)
    ).toHaveAttribute("aria-invalid", "true");
  });

  it("calls Aadhaar verification callback", () => {
    const onVerify = vi.fn();

    render(
      <StepFields
        step={3}
        data={defaultData}
        setValue={vi.fn()}
        onVerify={onVerify}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Verify Aadhaar" })
    );

    expect(onVerify).toHaveBeenCalledWith("aadhaar");
  });

  it("displays verification status", () => {
    render(
      <StepFields
        step={3}
        data={defaultData}
        setValue={vi.fn()}
        verification={{
          pan: "Verified",
          aadhaar: "Verifying...",
        }}
      />
    );

    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Verifying...")).toBeInTheDocument();
  });

  it("updates Aadhaar consent checkbox", () => {
    const setValue = vi.fn();

    render(
      <StepFields
        step={3}
        data={defaultData}
        setValue={setValue}
      />
    );

    fireEvent.click(
      screen.getByLabelText(/Aadhaar verification simulation/i)
    );

    expect(setValue).toHaveBeenCalledWith("aadhaarConsent", true);
  });

  it("copies current address when permanent address checkbox is selected", () => {
    const setValue = vi.fn();

    render(
      <StepFields
        step={4}
        data={{
          ...defaultData,
          currentAddress1: "Street 1",
          currentAddress2: "Area 2",
          pinCode: "362001",
          city: "Jamnagar",
          state: "Gujarat",
          samePermanentAddress: false,
        }}
        setValue={setValue}
      />
    );

    fireEvent.click(
      screen.getByLabelText(/Permanent address is the same/i)
    );

    expect(setValue).toHaveBeenCalledWith("samePermanentAddress", true);
    expect(setValue).toHaveBeenCalledWith("permanentAddress1", "Street 1");
    expect(setValue).toHaveBeenCalledWith("permanentAddress2", "Area 2");
    expect(setValue).toHaveBeenCalledWith("permanentPin", "362001");
    expect(setValue).toHaveBeenCalledWith("permanentCity", "Jamnagar");
    expect(setValue).toHaveBeenCalledWith("permanentState", "Gujarat");
  });

  it("shows permanent address fields when addresses are different", () => {
    renderStep(4, { samePermanentAddress: false });

    expect(
      screen.getByLabelText(/Permanent address line 1/i)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/Permanent PIN code/i)
    ).toBeInTheDocument();
  });

  it("updates PIN code and clears the previous PIN lookup error", () => {
    const setValue = vi.fn();

    render(
      <StepFields
        step={4}
        data={defaultData}
        setValue={setValue}
      />
    );

    fireEvent.change(screen.getByLabelText(/PIN code/i), {
      target: { value: "362001" },
    });

    expect(setValue).toHaveBeenCalledWith("pinCode", "362001");
    expect(setValue).toHaveBeenCalledWith("pinLookupError", "");
  });

  it("updates address fields after successful PIN lookup", async () => {
    pinMocks.lookupPinCode.mockResolvedValue({
      city: "Jamnagar",
      state: "Gujarat",
      postOffice: "Jamnagar HO",
    });

    const setValue = vi.fn();

    render(
      <StepFields
        step={4}
        data={{ ...defaultData, pinCode: "362001" }}
        setValue={setValue}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Lookup PIN code/i })
    );

    await waitFor(() => {
      expect(setValue).toHaveBeenCalledWith("city", "Jamnagar");
      expect(setValue).toHaveBeenCalledWith("state", "Gujarat");
      expect(setValue).toHaveBeenCalledWith(
        "postOffice",
        "Jamnagar HO"
      );
    });

    expect(pinMocks.setError).toHaveBeenCalledWith("");
  });

  it("shows the PIN lookup error", () => {
    pinMocks.error = "Invalid PIN code";

    renderStep(4);

    expect(
      screen.getByText("Invalid PIN code")
    ).toBeInTheDocument();
  });

  it("shows post office information", () => {
    renderStep(4, { postOffice: "Jamnagar HO" });

    expect(
      screen.getByText(/Post office: Jamnagar HO/i)
    ).toBeInTheDocument();
  });

  it("shows state mismatch warning", () => {
    renderStep(4, {
      state: "Rajasthan",
      pinLookupState: "Gujarat",
    });

    expect(
      screen.getByText(/Selected state does not match/i)
    ).toBeInTheDocument();
  });

  it("shows business loan warning for salaried applicants", () => {
    renderStep(5, {
      loanType: "Business",
      employmentType: "Salaried",
    });

    expect(
      screen.getByText(/Business loan applicants must choose/i)
    ).toBeInTheDocument();
  });

  it("shows business address for business loan applicants", () => {
    renderStep(5, {
      loanType: "Business",
      employmentType: "Self-Employed",
    });

    expect(
      screen.getByLabelText(/Office\/business address/i)
    ).toBeInTheDocument();
  });

  it("updates co-applicant consent", () => {
    const setValue = vi.fn();

    render(
      <StepFields
        step={6}
        data={defaultData}
        setValue={setValue}
      />
    );

    fireEvent.click(
      screen.getByLabelText(/Co-applicant consents/i)
    );

    expect(setValue).toHaveBeenCalledWith("coApplicantConsent", true);
  });

  it("shows affordability warning when EMI ratio exceeds 50 percent", () => {
    render(
      <StepFields
        step={8}
        data={defaultData}
        setValue={vi.fn()}
        affordability={0.65}
      />
    );

    expect(
      screen.getByText(/more than 50% of your combined monthly income/i)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/acknowledge the affordability warning/i)
    ).toBeInTheDocument();
  });

  it("shows affordability consent validation error", () => {
    render(
      <StepFields
        step={8}
        data={defaultData}
        setValue={vi.fn()}
        errors={{
          affordabilityConsent: "Please acknowledge the warning",
        }}
        affordability={0.65}
      />
    );

    expect(
      screen.getByText("Please acknowledge the warning")
    ).toBeInTheDocument();
  });

  it("shows captured signature preview", () => {
    renderStep(8, {
      signature: "data:image/png;base64,dGVzdA==",
    });

    expect(
      screen.getByAltText("Applicant's captured signature")
    ).toBeInTheDocument();
  });

  it("shows post office lookup message stored in form data", () => {
    renderStep(4, {
      pinLookupError: "Please verify your PIN",
    });

    expect(
      screen.getByText("Please verify your PIN")
    ).toBeInTheDocument();
  });

});
