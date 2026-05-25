document.getElementById("login-form").addEventListener("submit", login);
document.getElementById("logout-button").addEventListener("click", () => window.location.reload());
document.getElementById("role-select").addEventListener("change", (event) => {
  state.role = event.target.value;
  state.cardFilter = null;
  state.view = "dashboard";
  logAction("Selected active role", "-");
  persistDemoData();
  populateFilters();
  renderPortal();
});
document.getElementById("nav-menu").addEventListener("click", (event) => {
  const nav = event.target.closest("[data-nav]");
  if (!nav) return;
  state.view = nav.dataset.nav;
  renderPortal();
});
document.getElementById("kpi-cards").addEventListener("click", (event) => {
  const card = event.target.closest("[data-card]");
  if (!card) return;
  const index = Number(card.dataset.card);
  const definition = kpiDefinitions(state.role)[index];
  state.cardFilter = state.cardFilter?.index === index ? null : { index, predicate: definition.predicate };
  renderDashboard();
});
document.querySelectorAll("#filter-search, #filter-phase, #filter-status, #filter-agency, #filter-staff, #filter-period").forEach((field) => {
  field.addEventListener("input", () => {
    state.filters = {
      search: document.getElementById("filter-search").value,
      phase: document.getElementById("filter-phase").value,
      status: document.getElementById("filter-status").value,
      agency: document.getElementById("filter-agency").value,
      staff: document.getElementById("filter-staff").value,
      period: document.getElementById("filter-period").value,
    };
    renderTable();
  });
});
document.getElementById("clear-filters").addEventListener("click", () => {
  state.cardFilter = null;
  state.filters = { search: "", phase: "", status: "", agency: "", staff: "", period: "" };
  ["filter-search", "filter-phase", "filter-status", "filter-agency", "filter-staff", "filter-period"].forEach((id) => (document.getElementById(id).value = ""));
  renderDashboard();
});
document.getElementById("dashboard-view").addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-case]");
  if (button) openCase(button.dataset.openCase);
});
document.getElementById("applications-view").addEventListener("click", (event) => {
  const open = event.target.closest("[data-open-case]");
  if (open) openCase(open.dataset.openCase);
  if (event.target.closest("[data-create-case]")) createApplication();
});
document.getElementById("case-modal").addEventListener("click", (event) => {
  if (event.target.closest("[data-close-modal]")) {
    document.getElementById("case-modal").classList.add("hidden");
    state.selectedCase = null;
    return;
  }
  const transition = event.target.closest("[data-transition]");
  if (transition) executeTransition(Number(transition.dataset.transition));
  const tabButton = event.target.closest("[data-case-tab]");
  if (tabButton) {
    state.caseTab = tabButton.dataset.caseTab;
    renderModalBody();
  }
  if (event.target.closest("[data-save-cc]")) saveCompletenessForm();
  if (event.target.closest("[data-save-review]")) saveReviewForm();
  if (event.target.closest("[data-save-routing]")) saveRoutingForm();
  const packageDocument = event.target.closest("[data-package-document]");
  if (packageDocument) previewPackageDocument(Number(packageDocument.dataset.packageDocument));
});
restoreDemoData();
renderLoginAccounts();
