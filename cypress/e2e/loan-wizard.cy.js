/* global cy */

describe("LendSwift loan wizard", () => {
  beforeEach(() => cy.visit("/"));

  it("renders loan type choices and progress", () => {
    cy.contains("One step closer to your goals.");
    cy.contains("Personal").should("exist");
    cy.contains("Home").should("exist");
    cy.contains("Business").should("exist");
    cy.contains("Application progress");
  });

  it("blocks moving forward when required loan details are missing", () => {
    cy.get("#loanAmount").clear();
    cy.contains("Continue").click();
    cy.contains("Loan amount is required.").should("be.visible");
  });

  it("updates loan amount limit when loan type changes", () => {
    cy.contains("Home", { matchCase: false }).first().click();
    cy.get("#loanAmount").clear().type("20000000");
    cy.contains("Continue").click();
    cy.contains("Enter an amount from").should("be.visible");
  });

  it("allows the applicant to go back without losing the current draft in memory", () => {
    cy.get("#loanAmount").clear().type("300000");
    cy.contains("Continue").click();
    cy.contains("Personal information");
    cy.contains("← Back").click();
    cy.get("#loanAmount").should("have.value", "300000");
  });

  it("shows the privacy demo disclaimer", () => {
    cy.contains("Use fictional test data only.");
    cy.contains("does not submit your application to a lender");
  });
});