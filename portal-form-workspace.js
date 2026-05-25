const formWorkspaceBaseRenderPortal = renderPortal;
const formWorkspaceBaseBuildCaseWorkspace = buildCaseWorkspace;
const formWorkspaceBaseFilteredCases = filteredCases;
const formWorkspaceBaseNextAction = nextAction;
const formWorkspaceBaseRenderNav = renderNav;
const formWorkspaceBaseApplicationsModule = renderApplicationsModule;
const formWorkspaceBaseRenderCaseTab = renderCaseTab;
const formWorkspaceBaseRenderCompletenessTab = renderCompletenessTab;
const formWorkspaceBaseRenderReviewTab = renderReviewTab;
const formWorkspaceBaseSaveReviewForm = saveReviewForm;
const formWorkspaceBaseExecuteTransition = executeTransition;
const formWorkspaceBaseRestoreDemoData = restoreDemoData;
const formWorkspaceBaseCreateTechnicalReview = createTechnicalReview;

state.formWorkspace = null;
state.formReturnView = "applications";
state.formDirty = false;

buildCaseWorkspace = function buildCaseWorkspaceWithBlankAssessments(item) {
  const record = formWorkspaceBaseBuildCaseWorkspace(item);
  if (["CC Form Created", "Under Completeness Check", "Completion Submission Received"].includes(item.status)
    && !item.ccApproved && !record.ccAssessmentInitialized) {
    record.completeness.forEach((row) => {
      if (row.applicable) {
        row.level = "Not Assessed";
        row.remarks = "";
      }
    });
    record.ccAssessmentInitialized = true;
  }
  if (["Accepted for Technical Review", "Technical Review Form Created"].includes(item.status)
    && !item.reviewValidated && !record.reviewAssessmentInitialized) {
    record.findings.forEach((row) => {
      row.rating = "Not Assessed";
      row.observation = "";
      row.recommendation = "";
    });
    record.reviewAssessmentInitialized = true;
  }
  return record;
};

filteredCases = function filteredActiveCases() {
  return formWorkspaceBaseFilteredCases().filter((item) => item.status !== "Closed");
};

nextAction = function neutralDecisionPrompt(item) {
  if (state.role === "manager" && item.status === "For Team Manager / Supervisor Review") return "Review package and decide";
  if (state.role === "chief" && item.status === "For Division Chief Approval") return "Review completeness outcome and decide";
  return formWorkspaceBaseNextAction(item);
};

renderNav = function renderRoleSpecificNav() {
  formWorkspaceBaseRenderNav();
  const assignmentButton = document.querySelector('#nav-menu [data-nav="applications"]');
  if (!assignmentButton) return;
  if (state.role === "reviewer") assignmentButton.textContent = "Review Assignments";
  if (state.role === "cc") assignmentButton.textContent = "Completeness Checks";
};

renderApplicationsModule = function renderRoleSpecificApplications() {
  formWorkspaceBaseApplicationsModule();
  const heading = document.querySelector("#applications-view .module-header h2");
  if (!heading) return;
  if (state.role === "reviewer") heading.textContent = "Review Assignments";
  if (state.role === "cc") heading.textContent = "Completeness Check Assignments";
};

restoreDemoData = function restoreDemoDataWithAssessmentMigration() {
  formWorkspaceBaseRestoreDemoData();
  cases.forEach((item) => {
    const record = caseWorkspaces[item.id];
    if (!record) return;
    if (item.ccOutcome === "Pending Assessment" && !item.ccApproved) {
      record.completeness.forEach((row) => {
        if (row.applicable && row.level === "Full") row.level = "Not Assessed";
      });
    }
    if (["Accepted for Technical Review", "Technical Review Form Created"].includes(item.status) && !item.reviewValidated) {
      record.findings.forEach((row) => {
        row.rating = "Not Assessed";
        row.observation = "";
        row.recommendation = "";
      });
    }
  });
};

function stageAwareChecks(item) {
  const stage = phaseMap[item.status];
  const technicalRelevant = ["Formal Review", "Package Preparation", "Package Review", "Routing", "Final Documentation", "Closure"].includes(stage);
  const packageRelevant = ["Package Preparation", "Package Review", "Routing", "Final Documentation", "Closure"].includes(stage);
  const signedRelevant = ["Final Documentation", "Closure"].includes(stage);
  return [
    { label: "Technical review requires CC approval, complete outcome, release and acceptance", state: technicalRelevant ? (item.ccApproved && item.ccOutcome === "Complete" && item.ccReleased && item.accepted ? "satisfied" : "pending") : "not-applicable" },
    { label: "Package generation requires validated technical review", state: packageRelevant ? (item.reviewValidated ? "satisfied" : "pending") : "not-applicable" },
    { label: "Signed package must match routed version", state: signedRelevant ? (item.signedUploaded && Boolean(item.routedVersion) && item.packageVersion === item.routedVersion ? "satisfied" : "pending") : "not-applicable" },
    { label: "Closure requires verified signed upload and metadata tagging", state: stage === "Closure" ? (item.signedUploaded && item.signedVerified && item.tagged && item.packageVersion === item.routedVersion ? "satisfied" : "pending") : "not-applicable" },
  ];
}

renderCaseTab = function renderStageAwareOverview(item) {
  if (state.caseTab !== "overview") return formWorkspaceBaseRenderCaseTab(item);
  const checks = stageAwareChecks(item);
  const allowed = (transitions[item.status] || []).filter((action) => action.role === state.role);
  return `<section class="record-sheet">
    <section class="detail-grid">
      <div class="detail-item"><span>Current Phase</span><strong>${escapeHtml(phaseMap[item.status])}</strong></div>
      <div class="detail-item"><span>Current Status</span><strong>${escapeHtml(item.status)}</strong></div>
      <div class="detail-item"><span>Aging</span><strong>${dateDays(item.lastUpdated)} days</strong></div>
      <div class="detail-item"><span>Agency / Office</span><strong>${escapeHtml(item.agency)}</strong></div>
      <div class="detail-item"><span>CC Outcome</span><strong>${escapeHtml(item.ccOutcome)}</strong></div>
      <div class="detail-item"><span>Decision Outcome</span><strong>${escapeHtml(item.decision)}</strong></div>
      <div class="detail-item"><span>Package Version</span><strong>${item.packageVersion ? `v${item.packageVersion}` : "Not generated"}</strong></div>
      <div class="detail-item"><span>Routed Version</span><strong>${item.routedVersion ? `v${item.routedVersion}` : "Not routed"}</strong></div>
      <div class="detail-item"><span>Next Action</span><strong>${escapeHtml(nextAction(item))}</strong></div>
    </section>
    <section class="gate-box">
      <h3>Mandatory Control Gates</h3>
      <div class="check-list">${checks.map((check) => {
        const className = check.state === "satisfied" ? "check-pass" : check.state === "pending" ? "check-fail" : "check-neutral";
        const status = check.state === "satisfied" ? "SATISFIED" : check.state === "pending" ? "PENDING" : "NOT YET APPLICABLE";
        return `<div class="${className}">${status} - ${escapeHtml(check.label)}</div>`;
      }).join("")}</div>
    </section>
    <section class="modal-section">
      <h3>Permitted Actions Under Active Role</h3>
      <div class="action-buttons">${allowed.length ? allowed.map((action, index) => `<button class="button ${action.kind === "risk" ? "danger" : "primary"} small" data-transition="${index}">${escapeHtml(action.label)}</button>`).join("") : `<p class="muted">No workflow transition is permitted for the active role at the current status.</p>`}</div>
    </section>
  </section>`;
};

renderPortal = function renderPortalWithFormWorkspace() {
  formWorkspaceBaseRenderPortal();
  const open = state.view === "form" && state.formWorkspace && state.selectedCase;
  document.getElementById("form-workspace-view").classList.toggle("hidden", !open);
  if (!open) return;
  ["dashboard-view", "applications-view", "reports-view", "audit-view", "security-view", "admin-view"].forEach((id) => {
    document.getElementById(id).classList.add("hidden");
  });
  renderFullFormWorkspace();
};

function openFullFormWorkspace(item, formType) {
  state.selectedCase = item;
  state.formWorkspace = formType;
  state.formReturnView = state.view === "form" ? state.formReturnView : state.view;
  state.formDirty = false;
  state.view = "form";
  document.getElementById("case-modal").classList.add("hidden");
  renderPortal();
}

function leaveFullFormWorkspace() {
  if (state.formDirty && !window.confirm("You have unsaved form changes. Leave this workspace and discard them?")) return;
  state.formDirty = false;
  state.formWorkspace = null;
  state.view = state.formReturnView || "applications";
  renderPortal();
}

function completionProgress(rows, key) {
  const applicable = rows.filter((row) => row.applicable !== false);
  const complete = applicable.filter((row) => row[key] && row[key] !== "Not Assessed").length;
  return { complete, total: applicable.length, percentage: applicable.length ? Math.round((complete / applicable.length) * 100) : 0 };
}

function renderFullFormWorkspace() {
  const item = state.selectedCase;
  const record = buildCaseWorkspace(item);
  const isCC = state.formWorkspace === "completeness";
  const formTitle = isCC ? "Completeness Check Form" : "Technical Review Form";
  const progress = completionProgress(isCC ? record.completeness : record.findings, isCC ? "level" : "rating");
  const workspace = document.getElementById("form-workspace-view");
  workspace.innerHTML = `<div class="form-workspace">
    <header class="form-workspace-header">
      <div>
        <p class="eyebrow">${escapeHtml(item.id)} | Official form workspace</p>
        <h2>${formTitle}</h2>
        <p class="form-workspace-meta">${escapeHtml(item.activity)} | Status: ${escapeHtml(item.status)}</p>
      </div>
      <div class="form-workspace-actions">
        <span class="save-state">${state.formDirty ? "Unsaved changes" : "Saved draft state"}</span>
        <button class="button ghost" data-exit-form>Back to Cases</button>
        <button class="button subtle" data-save-full-form>Save Draft</button>
        ${renderFormTransitionButton(item)}
      </div>
    </header>
    <div class="form-workspace-grid">
      <section class="official-form">
        <div class="official-form-intro">
          <h3>${formTitle}</h3>
          <p>${isCC
            ? "Assess every applicable documentary requirement before sending this form for manager review. No requirement is assumed complete."
            : "Assess all seven critical areas. Findings rated Partial or Non require an observation and a PSA recommendation before submission."}</p>
        </div>
        <div class="form-progress">
          <div class="form-progress-line"><span>Assessment completion</span><span>${progress.complete} of ${progress.total} assessed</span></div>
          <div class="bar"><span style="width:${progress.percentage}%"></span></div>
        </div>
        <div id="form-validation-summary" class="form-error-summary hidden" role="alert"></div>
        ${isCC ? renderFullCompletenessFields(record) : renderFullReviewFields(record)}
      </section>
      <aside class="form-context">
        <section class="panel">
          <p class="eyebrow">Case Context</p>
          <div class="context-list">
            <div><span>Agency / Office</span>${escapeHtml(item.agency)}</div>
            <div><span>Current Phase</span>${escapeHtml(phaseMap[item.status])}</div>
            <div><span>Required Next Action</span>${escapeHtml(nextAction(item))}</div>
            <div><span>Last Updated</span>${displayDate(item.lastUpdated)}</div>
            <div><span>Aging</span>${dateDays(item.lastUpdated)} days</div>
          </div>
        </section>
        <section class="panel">
          <p class="eyebrow">Record Discipline</p>
          <p class="muted">Save a draft before leaving. Submission locks this stage for internal review unless formally returned for revision.</p>
        </section>
      </aside>
    </div>
  </div>`;
}

function renderFormTransitionButton(item) {
  const actions = (transitions[item.status] || []).filter((action) => action.role === state.role);
  const index = actions.findIndex((action) => {
    if (state.formWorkspace === "completeness") return ["Begin Completeness Check", "Submit for Manager Review", "Restart Completeness Check"].includes(action.label);
    return ["Start Technical Review", "Submit for Validation"].includes(action.label);
  });
  return index < 0 ? "" : `<button class="button primary" data-full-form-transition="${index}">${escapeHtml(actions[index].label)}</button>`;
}

function renderFullCompletenessFields(record) {
  return `<div class="assessment-list">${record.completeness.map((row, index) => `<section class="assessment-card">
    <div class="assessment-card-head">
      <h4><span class="assessment-code">Requirement ${escapeHtml(row.code)}</span>${escapeHtml(row.description)}<small class="muted">${row.applicable ? ` Evidence code: ${escapeHtml(row.proof)}` : " Not applicable to this case"}</small></h4>
      <label>Completeness Level
        <select data-cc-level="${index}" ${row.applicable ? "" : "disabled"}>
          ${["Not Assessed", "Full", "Partial", "Not Submitted", "Not Applicable"].map((level) => `<option ${level === row.level ? "selected" : ""}>${level}</option>`).join("")}
        </select>
      </label>
    </div>
    <label>PSA Remarks<textarea data-cc-remarks="${index}" ${row.applicable ? "" : "disabled"}>${escapeHtml(row.remarks)}</textarea></label>
  </section>`).join("")}
  <section class="assessment-card"><label>Clarifications for the applicant<textarea data-cc-clarification>${escapeHtml(record.clarifications.join("\n"))}</textarea></label></section></div>`;
}

function renderFullReviewFields(record) {
  return `<div class="assessment-list">${record.findings.map((row, index) => `<section class="assessment-card">
    <div class="assessment-card-head">
      <h4><span class="assessment-code">${escapeHtml(row.code)}</span>${escapeHtml(row.area)}</h4>
      <label>Level of Adherence
        <select data-rating="${index}">
          ${["Not Assessed", "Full", "Partial", "Non"].map((level) => `<option ${level === row.rating ? "selected" : ""}>${level}</option>`).join("")}
        </select>
      </label>
    </div>
    <div class="assessment-fields">
      <label>Supporting Proof / Observation<textarea data-observation="${index}">${escapeHtml(row.observation)}</textarea></label>
      <label>PSA Recommendation<textarea data-recommendation="${index}">${escapeHtml(row.recommendation)}</textarea></label>
    </div>
  </section>`).join("")}</div>`;
}

function validateFullForm(formType) {
  const record = buildCaseWorkspace(state.selectedCase);
  const errors = [];
  if (formType === "completeness") {
    record.completeness.filter((row) => row.applicable).forEach((row) => {
      if (row.level === "Not Assessed") errors.push(`${row.code}: select a completeness level.`);
      if (["Partial", "Not Submitted"].includes(row.level) && !row.remarks.trim()) errors.push(`${row.code}: provide PSA remarks for incomplete documentation.`);
    });
  } else {
    record.findings.forEach((row) => {
      if (row.rating === "Not Assessed") errors.push(`${row.code}: select a level of adherence.`);
      if (["Partial", "Non"].includes(row.rating) && !row.observation.trim()) errors.push(`${row.code}: provide a supporting observation.`);
      if (["Partial", "Non"].includes(row.rating) && !row.recommendation.trim()) errors.push(`${row.code}: provide a PSA recommendation.`);
    });
  }
  const summary = document.getElementById("form-validation-summary");
  if (errors.length) {
    if (summary) {
      summary.innerHTML = `<strong>Submission blocked.</strong> ${escapeHtml(errors.slice(0, 4).join(" "))}${errors.length > 4 ? ` ${errors.length - 4} additional item(s) require completion.` : ""}`;
      summary.classList.remove("hidden");
    } else {
      showToast("Submission blocked: complete all required form assessments and findings in the official workspace.");
    }
    return false;
  }
  if (summary) summary.classList.add("hidden");
  return true;
}

renderCompletenessTab = function renderCompletenessDrawerSummary(item, record) {
  const editable = state.role === "cc" && ["CC Form Created", "Under Completeness Check", "Completion Submission Received"].includes(item.status);
  if (!editable) return formWorkspaceBaseRenderCompletenessTab(item, record);
  const progress = completionProgress(record.completeness, "level");
  return `<section class="record-sheet"><div class="drawer-form-launch">
    <div><h3>Completeness Check Form</h3><p>${progress.complete} of ${progress.total} applicable requirements assessed. Complete official assessment work in the full workspace.</p></div>
    <button class="button primary" data-open-full-form="completeness">Open Completeness Check Workspace</button>
  </div></section>`;
};

renderReviewTab = function renderReviewDrawerSummary(item, record) {
  const editable = state.role === "reviewer" && ["Technical Review Form Created", "Under Technical Review"].includes(item.status);
  if (!editable) return formWorkspaceBaseRenderReviewTab(item, record);
  const progress = completionProgress(record.findings, "rating");
  return `<section class="record-sheet"><div class="drawer-form-launch">
    <div><h3>Technical Review Form</h3><p>${progress.complete} of ${progress.total} critical areas assessed. Observations and recommendations are completed in the official form workspace.</p></div>
    <button class="button primary" data-open-full-form="review">Open Technical Review Workspace</button>
  </div></section>`;
};

saveCompletenessForm = function saveCompletenessWorkspace() {
  const item = state.selectedCase;
  const record = buildCaseWorkspace(item);
  record.completeness.forEach((row, index) => {
    const level = document.querySelector(`[data-cc-level="${index}"]`);
    const remarks = document.querySelector(`[data-cc-remarks="${index}"]`);
    if (level && !level.disabled) row.level = level.value;
    if (remarks && !remarks.disabled) row.remarks = remarks.value;
  });
  const clarification = document.querySelector("[data-cc-clarification]");
  record.clarifications = clarification ? clarification.value.split("\n").filter(Boolean) : record.clarifications;
  const hasUnassessed = record.completeness.some((row) => row.applicable && row.level === "Not Assessed");
  item.ccOutcome = hasUnassessed ? "Pending Assessment"
    : record.completeness.some((row) => row.applicable && ["Partial", "Not Submitted"].includes(row.level))
      ? "Incomplete - Deficiencies / Clarifications"
      : "Complete";
  item.lastUpdated = "2026-05-25";
  logAction("Saved completeness-check findings", item.id);
  persistDemoData();
  renderDashboard();
  showToast("Completeness-check draft saved and included in the audit trail.");
  state.formDirty = false;
  if (state.view === "form") renderFullFormWorkspace();
};

saveReviewForm = function saveReviewWorkspace() {
  formWorkspaceBaseSaveReviewForm();
  state.formDirty = false;
  if (state.view === "form") renderFullFormWorkspace();
};

executeTransition = function executeValidatedTransition(index) {
  const item = state.selectedCase;
  const action = (transitions[item.status] || []).filter((transition) => transition.role === state.role)[index];
  if (!action) return;
  const requiresValidatedForm = action.label === "Submit for Manager Review" || action.label === "Submit for Validation";
  if (state.view === "form" && state.formDirty) {
    if (state.formWorkspace === "completeness") saveCompletenessForm();
    else saveReviewForm();
  }
  if (requiresValidatedForm && !validateFullForm(action.label === "Submit for Manager Review" ? "completeness" : "review")) {
    logAction(`Blocked action: ${action.label} - incomplete form`, item.id, "Blocked");
    persistDemoData();
    renderDashboard();
    return;
  }
  formWorkspaceBaseExecuteTransition(index);
  populateFilters();
  renderPortal();
};

createTechnicalReview = function createTechnicalReviewInWorkspace(id) {
  formWorkspaceBaseCreateTechnicalReview(id);
  const item = cases.find((row) => row.id === id);
  if (item && item.status === "Technical Review Form Created" && state.role === "reviewer") {
    openFullFormWorkspace(item, "review");
  }
};

document.getElementById("case-modal").addEventListener("click", (event) => {
  const launch = event.target.closest("[data-open-full-form]");
  if (!launch || !state.selectedCase) return;
  openFullFormWorkspace(state.selectedCase, launch.dataset.openFullForm);
});

document.getElementById("form-workspace-view").addEventListener("input", () => {
  state.formDirty = true;
  const label = document.querySelector(".save-state");
  if (label) label.textContent = "Unsaved changes";
});

document.getElementById("form-workspace-view").addEventListener("click", (event) => {
  if (event.target.closest("[data-exit-form]")) {
    leaveFullFormWorkspace();
    return;
  }
  if (event.target.closest("[data-save-full-form]")) {
    if (state.formWorkspace === "completeness") saveCompletenessForm();
    else saveReviewForm();
    return;
  }
  const transition = event.target.closest("[data-full-form-transition]");
  if (transition) executeTransition(Number(transition.dataset.fullFormTransition));
});

document.getElementById("nav-menu").addEventListener("click", (event) => {
  if (state.view !== "form" || !event.target.closest("[data-nav]")) return;
  if (state.formDirty && !window.confirm("You have unsaved form changes. Leave this workspace and discard them?")) {
    event.stopImmediatePropagation();
    event.preventDefault();
    return;
  }
  state.formDirty = false;
  state.formWorkspace = null;
}, true);

document.getElementById("notification-button").addEventListener("click", () => {
  state.view = "dashboard";
  renderPortal();
  document.getElementById("priority-actions").scrollIntoView({ behavior: "smooth", block: "center" });
});

window.addEventListener("beforeunload", (event) => {
  if (!state.formDirty) return;
  event.preventDefault();
  event.returnValue = "";
});
