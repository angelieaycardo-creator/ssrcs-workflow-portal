const reviewCreationSeedCase = {
  id: "SSRCS-2026-009",
  activity: "Community-Based Monitoring System Supplemental Module",
  agency: "PSA - Community-Based Statistics Service",
  assigned: { cc: "Liza Ramos", reviewer: "Tina Cruz", validator: "Victor de la Cruz", custodian: "Rina Garcia" },
  status: "Accepted for Technical Review",
  lastUpdated: "2026-05-25",
  received: "2026-05-19",
  ccOutcome: "Complete",
  decision: "Pending",
  ccApproved: true,
  ccReleased: true,
  accepted: true,
  reviewValidated: false,
  packageVersion: null,
  routedVersion: null,
  signedUploaded: false,
  signedVerified: false,
  tagged: false,
  ccWithinSla: true,
  reviewWithinSla: null,
};

function ensureReviewCreationDemonstrationCase() {
  if (!cases.some((item) => item.id === reviewCreationSeedCase.id)) {
    cases.push(JSON.parse(JSON.stringify(reviewCreationSeedCase)));
  }
}

ensureReviewCreationDemonstrationCase();

const reviewCreationBaseRestoreDemoData = restoreDemoData;
restoreDemoData = function restoreDemoDataWithEligibleReview() {
  reviewCreationBaseRestoreDemoData();
  ensureReviewCreationDemonstrationCase();
};

const reviewCreationBaseKpiDefinitions = kpiDefinitions;
kpiDefinitions = function kpiDefinitionsWithReadyQueue(role) {
  const cards = reviewCreationBaseKpiDefinitions(role);
  if (role !== "reviewer") return cards;
  const ready = visibleCases().filter((item) => item.status === "Accepted for Technical Review");
  return [{
    label: "Ready to Create Review",
    value: ready.length,
    support: "Accepted assigned applications",
    tone: "pending",
    predicate: (item) => item.status === "Accepted for Technical Review",
  }, ...cards];
};

function markCreateReviewAction(button, item) {
  if (state.role !== "reviewer" || item.status !== "Accepted for Technical Review") return;
  delete button.dataset.openCase;
  button.dataset.createReview = item.id;
  button.className = "button small primary";
  button.textContent = "Create Technical Review Form";
}

const reviewCreationBaseRenderPriority = renderPriority;
renderPriority = function renderPriorityWithCreationAction() {
  reviewCreationBaseRenderPriority();
  priorityItems().forEach((item) => {
    const button = document.querySelector(`#priority-actions [data-open-case="${item.id}"]`);
    if (button) markCreateReviewAction(button, item);
  });
};

const reviewCreationBaseApplicationsModule = renderApplicationsModule;
renderApplicationsModule = function renderApplicationsWithCreationGuide() {
  reviewCreationBaseApplicationsModule();
  if (state.role !== "reviewer") return;
  const view = document.getElementById("applications-view");
  view.querySelector(".module-stack").insertAdjacentHTML("afterbegin", `<section class="workflow-guide">
    <div>
      <p class="eyebrow">How to begin a review</p>
      <h3>Create a Technical Review Form</h3>
      <p>A reviewer does not create a review for a new application directly. The application must first be approved as complete, released, accepted for technical review, and assigned to you.</p>
    </div>
    <ol>
      <li>Find an assigned application marked <strong>Accepted for Technical Review</strong>.</li>
      <li>Select <strong>Create Technical Review Form</strong>.</li>
      <li>Complete findings and recommendations in the Technical Review tab.</li>
    </ol>
  </section>`);
  visibleCases().forEach((item) => {
    const button = view.querySelector(`[data-open-case="${item.id}"]`);
    if (button) markCreateReviewAction(button, item);
  });
};

function createTechnicalReview(id) {
  const item = cases.find((row) => row.id === id);
  if (state.role !== "reviewer" || !item || item.status !== "Accepted for Technical Review" || !visibleCases().includes(item)) {
    showToast("Technical review creation is not permitted for this application under the active role.");
    return;
  }
  if (!gatePass("technicalReview", item)) {
    logAction("Blocked action: Create Technical Review Form", item.id, "Blocked");
    persistDemoData();
    renderDashboard();
    showToast(`Blocked: ${gateFailureText("technicalReview")}`);
    return;
  }
  item.status = "Technical Review Form Created";
  item.lastUpdated = "2026-05-25";
  buildCaseWorkspace(item);
  logAction("Create Technical Review Form", item.id);
  persistDemoData();
  populateFilters();
  renderPortal();
  openCase(item.id);
  state.caseTab = "review";
  renderModalBody();
  showToast(`Technical Review Form created for ${item.id}. Complete the assessment and recommendations.`);
}

["dashboard-view", "applications-view"].forEach((id) => {
  document.getElementById(id).addEventListener("click", (event) => {
    const button = event.target.closest("[data-create-review]");
    if (!button) return;
    event.stopImmediatePropagation();
    createTechnicalReview(button.dataset.createReview);
  }, true);
});
