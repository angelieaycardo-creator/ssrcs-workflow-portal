const directActionReadyCase = {
  ...reviewCreationSeedCase,
  id: "SSRCS-2026-011",
  activity: "Household Digital Access Survey Module",
  agency: "Department of Information and Communications Technology",
};

const directActionBaseEnsureReviewCase = ensureReviewCreationDemonstrationCase;
ensureReviewCreationDemonstrationCase = function ensureReadyReviewAction() {
  directActionBaseEnsureReviewCase();
  const hasReadyCase = cases.some((item) => item.status === "Accepted for Technical Review" && item.assigned.reviewer === "Tina Cruz");
  const hasSeededReadyCase = cases.some((item) => item.id === directActionReadyCase.id);
  if (!hasReadyCase && !hasSeededReadyCase) cases.push(JSON.parse(JSON.stringify(directActionReadyCase)));
};

const directActionBaseRenderPriority = renderPriority;
renderPriority = function renderPriorityWithDirectForms() {
  directActionBaseRenderPriority();
  decorateDirectFormButtons(document.getElementById("priority-actions"));
};

const directActionBaseRenderTable = renderTable;
renderTable = function renderTableWithDirectForms() {
  directActionBaseRenderTable();
  decorateDirectFormButtons(document.getElementById("applications-body"));
};

const directActionBaseRenderApplicationsModule = renderApplicationsModule;
renderApplicationsModule = function renderApplicationsWithDirectForms() {
  directActionBaseRenderApplicationsModule();
  decorateDirectFormButtons(document.getElementById("applications-view"));
};

function formTypeForAction(item) {
  if (state.role === "reviewer" && ["Technical Review Form Created", "Under Technical Review"].includes(item.status)) return "review";
  if (state.role === "cc" && ["CC Form Created", "Under Completeness Check", "Completion Submission Received"].includes(item.status)) return "completeness";
  return null;
}

function decorateDirectFormButtons(container) {
  if (!container) return;
  visibleCases().forEach((item) => {
    const formType = formTypeForAction(item);
    if (!formType) return;
    const button = container.querySelector(`[data-open-case="${item.id}"]`);
    if (!button) return;
    delete button.dataset.openCase;
    button.dataset.openFullFormCase = item.id;
    button.dataset.formType = formType;
    button.className = "button small primary";
    button.textContent = formType === "review" ? "Continue Technical Review" : "Open Completeness Check Form";
  });
}

["dashboard-view", "applications-view"].forEach((id) => {
  document.getElementById(id).addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-full-form-case]");
    if (!button) return;
    event.stopImmediatePropagation();
    const item = cases.find((row) => row.id === button.dataset.openFullFormCase);
    if (!item || !visibleCases().includes(item)) {
      showToast("This form is outside the current role scope.");
      return;
    }
    openFullFormWorkspace(item, button.dataset.formType);
  }, true);
});
