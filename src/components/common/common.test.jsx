import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Field from "./Field";
import SignaturePad from "./SignaturePad";

describe("Field component", () => {
  it("renders a label and input", () => {
    render(<Field label="Full name" name="fullName" />);

    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
  });

  it("renders required state and an asterisk", () => {
    render(<Field label="Email" name="email" required onChange={vi.fn()} />);

    expect(screen.getByLabelText(/Email/)).toBeRequired();
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders a hint and connects it to the input", () => {
    render(
      <Field
        label="Mobile"
        name="mobile"
        hint="Enter your 10-digit mobile number"
      />,
    );

    const input = screen.getByLabelText("Mobile");

    expect(
      screen.getByText("Enter your 10-digit mobile number"),
    ).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-describedby", "mobile-hint");
  });

  it("shows an accessible validation error", () => {
    render(<Field label="PAN" name="pan" value="" error="Enter a valid PAN" />);

    const input = screen.getByLabelText("PAN");

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid PAN");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "pan-error");
  });

  it("calls onChange when the user types", () => {
    const onChange = vi.fn();

    render(
      <Field
        label="Loan purpose"
        name="loanPurpose"
        value=""
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Loan purpose"), {
      target: { value: "Education" },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("uses the supplied input type and id", () => {
    render(
      <Field
        label="Email"
        name="email"
        id="applicant-email"
        type="email"
        value="test@example.com"
      />,
    );

    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "id",
      "applicant-email",
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
  });
});

describe("SignaturePad component", () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      scale: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
      set lineWidth(value) {},
      set lineCap(value) {},
      set strokeStyle(value) {},
    }));

    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 600,
      height: 160,
      right: 600,
      bottom: 160,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));

    HTMLCanvasElement.prototype.toDataURL = vi.fn(
      () => "data:image/png;base64,test-signature",
    );
  });

  it("renders the canvas and initial instructions", () => {
    render(<SignaturePad value="" onChange={vi.fn()} />);

    expect(
      screen.getByLabelText("Draw your signature here"),
    ).toBeInTheDocument();
    expect(screen.getByText("Use mouse or touch to sign")).toBeInTheDocument();
  });

  it("captures a signature after pointer drawing", () => {
    const onChange = vi.fn();

    render(<SignaturePad value="" onChange={onChange} />);

    const canvas = screen.getByLabelText("Draw your signature here");

    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 20, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 40, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 40, clientY: 50, pointerId: 1 });

    expect(onChange).toHaveBeenCalledWith(
      "data:image/png;base64,test-signature",
    );
  });

  it("clears the signature when Clear signature is clicked", () => {
    const onChange = vi.fn();

    render(<SignaturePad value="existing-signature" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Clear signature" }));

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("shows the captured state when a signature exists", () => {
    render(
      <SignaturePad value="data:image/png;base64,saved" onChange={vi.fn()} />,
    );

    expect(screen.getByText("Signature captured")).toBeInTheDocument();
  });
});
