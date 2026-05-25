function renderModalBody() {
  const item = state.selectedCase;
  if (!item) return;
  const tabs = [
    ["overview", "Overview"],
    ["completeness", "Completeness Check"],
    ["review", "Technical Review"],
    ["package", "Decision Package"],
    ["routing", "Routing and Records"],
    ["history", "History"],
  ];
  document.getElementById("modal-body").innerHTML = `
    <nav class="record-tabs">${tabs.map(([key, label]) => `<button class="record-tab ${state.caseTab === key ? "active" : ""}" data-case-tab="${key}">${label}</button>`).join("")}</nav>
    ${renderCaseTab(item)}`;
}

function renderCaseTab(item) {
  const record = buildCaseWorkspace(item);
  if (state.caseTab === "completeness") return renderCompletenessTab(item, record);
  if (state.caseTab === "review") return renderReviewTab(item, record);
  if (state.caseTab === "package") return renderPackageTab(item, record);
  if (state.caseTab === "routing") return renderRoutingTab(item, record);
  if (state.caseTab === "history") return renderHistoryTab(item);
  const checks = gateChecks(item);
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
      <div class="check-list">${checks.map((check) => `<div class="${check.pass ? "check-pass" : "check-fail"}">${check.pass ? "PASS" : "NOT MET"} - ${escapeHtml(check.label)}</div>`).join("")}</div>
    </section>
    <section class="modal-section">
      <h3>Permitted Actions Under Active Role</h3>
      <div class="action-buttons">${allowed.length ? allowed.map((action, index) => `<button class="button ${action.kind === "risk" ? "danger" : "primary"} small" data-transition="${index}">${escapeHtml(action.label)}</button>`).join("") : `<p class="muted">No workflow transition is permitted for the active role at the current status.</p>`}</div>
    </section>
  </section>`;
}

function renderCompletenessTab(item, record) {
  const editable = state.role === "cc" && ["CC Form Created", "Under Completeness Check", "Completion Submission Received"].includes(item.status);
  return `<section class="record-sheet">
    <div class="record-note"><strong>Completeness Check Form.</strong> Only an approved outcome of <strong>Complete</strong>, released to the applicant, may enable technical review creation.</div>
    <section class="form-grid">
      <label>Proponent Agency<input value="${escapeHtml(record.profile.proponent)}" disabled></label>
      <label>Conducting Agency<input value="${escapeHtml(record.profile.conducting)}" disabled></label>
      <label class="wide">Title of Statistical Activity<input value="${escapeHtml(record.profile.title)}" disabled></label>
      <label>Date Received by SS-SSD<input value="${escapeHtml(record.profile.receivedDate)}" disabled></label>
      <label>Previously Cleared Survey<input value="${escapeHtml(record.profile.previouslyCleared)}" disabled></label>
    </section>
    <section>
      <h3>Core Documentary Requirements</h3>
      <table class="matrix-table">
        <thead><tr><th>Code</th><th>Document Description</th><th>Requirement Codes</th><th>Completeness Level</th><th>PSA Remarks</th></tr></thead>
        <tbody>${record.completeness.map((row, index) => `<tr><td>${row.code}</td><td>${escapeHtml(row.description)}${!row.applicable ? `<small class="muted"> Not applicable to this case</small>` : ""}</td><td>${escapeHtml(row.proof)}</td><td><select data-cc-level="${index}" ${editable && row.applicable ? "" : "disabled"}>${["Full", "Partial", "Not Submitted", "Not Applicable"].map((level) => `<option ${level === row.level ? "selected" : ""}>${level}</option>`).join("")}</select></td><td><textarea data-cc-remarks="${index}" ${editable && row.applicable ? "" : "disabled"}>${escapeHtml(row.remarks)}</textarea></td></tr>`).join("")}</tbody>
      </table>
    </section>
    <section class="evidence-box"><h4>Clarifications</h4><textarea data-cc-clarification ${editable ? "" : "disabled"}>${escapeHtml(record.clarifications.join("\n"))}</textarea></section>
    ${editable ? `<div class="form-actions"><button class="button primary" data-save-cc>Save Completeness Findings</button></div>` : ""}
  </section>`;
}

function renderReviewTab(item, record) {
  const editable = state.role === "reviewer" && ["Technical Review Form Created", "Under Technical Review"].includes(item.status);
  const disabledReason = !item.accepted ? "Technical review remains locked until completeness controls pass." : "Review ratings are editable only by the assigned technical reviewer during active review.";
  return `<section class="record-sheet">
    <div class="record-note"><strong>Technical Review Form.</strong> Seven critical areas capture adherence, observations and recommendations. ${editable ? "Complete the findings before submitting for internal validation." : escapeHtml(disabledReason)}</div>
    <table class="matrix-table">
      <thead><tr><th>Critical Area</th><th>Assessment Focus</th><th>Level of Adherence</th><th>Supporting Proof / Observation</th><th>PSA Recommendation</th></tr></thead>
      <tbody>${record.findings.map((row, index) => `<tr><td><strong>${row.code}</strong></td><td>${escapeHtml(row.area)}</td><td><select data-rating="${index}" ${editable ? "" : "disabled"}>${["Full", "Partial", "Non"].map((level) => `<option ${level === row.rating ? "selected" : ""}>${level}</option>`).join("")}</select></td><td><textarea data-observation="${index}" ${editable ? "" : "disabled"}>${escapeHtml(row.observation)}</textarea></td><td><textarea data-recommendation="${index}" ${editable ? "" : "disabled"}>${escapeHtml(row.recommendation)}</textarea></td></tr>`).join("")}</tbody>
    </table>
    ${editable ? `<div class="form-actions"><button class="button primary" data-save-review>Save Technical Findings</button></div>` : ""}
  </section>`;
}

function renderPackageTab(item, record) {
  syncWorkspaceDocuments(item, record);
  return `<section class="record-sheet">
    <div class="detail-grid">
      <div class="detail-item"><span>Decision Outcome</span><strong>${escapeHtml(item.decision)}</strong></div>
      <div class="detail-item"><span>Package Version</span><strong>${item.packageVersion ? `Version ${item.packageVersion}` : "Not yet generated"}</strong></div>
      <div class="detail-item"><span>Approval State</span><strong>${item.reviewValidated ? "Technical review validated" : "Pending validation"}</strong></div>
    </div>
    <div class="record-note">The issued package contains Form 3 and applicable annexes, together with an external applicant letter or internal PSA clearance memorandum. Form 4 may be issued as an attachment; online monitoring is outside Phase 1 scope.</div>
    <section class="document-list">${record.documents.map((doc, index) => `<div class="document-row"><div><strong>${escapeHtml(doc.name)}</strong><small>${doc.required ? "Required package component" : "Conditional / issued where applicable"}</small></div><span class="status-chip ${item.packageVersion ? "closed" : "pending"}">${escapeHtml(doc.status)}</span><button class="button small subtle" data-package-document="${index}" ${item.packageVersion ? "" : "disabled"}>Preview</button></div>`).join("")}</section>
  </section>`;
}

function renderRoutingTab(item, record) {
  const routing = record.routing;
  const mayUpdate = state.role === "custodian";
  return `<section class="record-sheet">
    <div class="record-note"><strong>Records control.</strong> The signed uploaded package must be checked against the routed package version and fully tagged before closure.</div>
    <section class="inline-form">
      <label>Routed Package Version<input value="${item.routedVersion ? `Version ${item.routedVersion}` : ""}" disabled></label>
      <label>Export / Print Date<input value="${escapeHtml(routing.exportedDate)}" ${mayUpdate ? "" : "disabled"} data-routing="exportedDate"></label>
      <label>External Routing Date<input value="${escapeHtml(routing.routingDate)}" ${mayUpdate ? "" : "disabled"} data-routing="routingDate"></label>
      <label>Signed Package Return Date<input value="${escapeHtml(routing.returnedDate)}" ${mayUpdate ? "" : "disabled"} data-routing="returnedDate"></label>
      <label class="wide">Signed Package File Name<input value="${escapeHtml(routing.fileName)}" ${mayUpdate ? "" : "disabled"} data-routing="fileName"></label>
      <label class="wide">Metadata Tags<textarea ${mayUpdate ? "" : "disabled"} data-routing="metadataTags">${escapeHtml(routing.metadataTags)}</textarea></label>
    </section>
    <section class="gate-box"><h3>Verification Evidence</h3><p class="${item.signedVerified ? "check-pass" : "check-fail"}">${item.signedVerified ? escapeHtml(routing.versionHash || "Signed package verified.") : "No package-version verification recorded."}</p></section>
    ${mayUpdate ? `<div class="form-actions"><button class="button primary" data-save-routing>Save Routing Metadata</button></div>` : ""}
  </section>`;
}

function renderHistoryTab(item) {
  return `<section class="record-sheet"><section class="modal-section"><h3>Case Audit Activity</h3><div class="timeline">${activities.filter((event) => event[3] === item.id).slice(0, 12).map((event) => `<div class="timeline-entry"><strong>${escapeHtml(event[2])}</strong><p>${escapeHtml(event[0])} - ${escapeHtml(event[1])} | ${escapeHtml(event[4])} | ${escapeHtml(event[5])}</p></div>`).join("") || `<p class="muted">No activity shown.</p>`}</div></section></section>`;
}

function syncWorkspaceDocuments(item, record) {
  record.documents.forEach((document) => {
    if (!item.packageVersion) {
      document.status = "Pending generation";
    } else if (document.name.includes("Form 4")) {
      document.status = "Included for issuance";
    } else {
      document.status = document.name.includes("Form 3") ? `Version ${item.packageVersion}` : "Generated";
    }
  });
}

function saveCompletenessForm() {
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
  item.ccOutcome = record.completeness.some((row) => row.applicable && ["Partial", "Not Submitted"].includes(row.level))
    ? "Incomplete - Deficiencies / Clarifications"
    : "Complete";
  item.lastUpdated = "2026-05-25";
  logAction("Saved completeness-check findings", item.id);
  persistDemoData();
  renderModalBody();
  renderDashboard();
  showToast("Completeness-check findings saved and included in the audit trail.");
}

function saveReviewForm() {
  const item = state.selectedCase;
  const record = buildCaseWorkspace(item);
  record.findings.forEach((row, index) => {
    row.rating = document.querySelector(`[data-rating="${index}"]`).value;
    row.observation = document.querySelector(`[data-observation="${index}"]`).value;
    row.recommendation = document.querySelector(`[data-recommendation="${index}"]`).value;
  });
  item.lastUpdated = "2026-05-25";
  logAction("Saved technical review findings and recommendations", item.id);
  persistDemoData();
  renderModalBody();
  renderDashboard();
  showToast("Technical findings saved. Submit for internal validation from Overview when ready.");
}

function saveRoutingForm() {
  const item = state.selectedCase;
  const routing = buildCaseWorkspace(item).routing;
  document.querySelectorAll("[data-routing]").forEach((field) => {
    routing[field.dataset.routing] = field.value;
  });
  item.lastUpdated = "2026-05-25";
  logAction("Updated routing and records metadata", item.id);
  persistDemoData();
  renderModalBody();
  renderDashboard();
  showToast("Routing metadata saved.");
}

function previewPackageDocument(index) {
  const item = state.selectedCase;
  const documentItem = buildCaseWorkspace(item).documents[index];
  if (!item.packageVersion || !documentItem) return;
  logAction(`Opened package preview: ${documentItem.name}`, item.id);
  persistDemoData();
  renderDashboard();
  showToast(`${documentItem.name} is included in package version ${item.packageVersion}. Formal DOCX/PDF generation is a production integration task.`);
}

function createApplication() {
  if (state.role !== "encoder") return;
  const sequence = String(cases.length + 1).padStart(3, "0");
  const item = {
    id: `SSRCS-2026-${sequence}`,
    activity: "New Statistical Activity Application",
    agency: "New Proponent Agency",
    assigned: { cc: "Liza Ramos", reviewer: "Tina Cruz", validator: "Victor de la Cruz", custodian: "Rina Garcia" },
    status: "Submitted / Encoded",
    lastUpdated: "2026-05-25",
    received: "2026-05-25",
    ccOutcome: "Pending Assessment",
    decision: "Pending",
    ccApproved: false,
    ccReleased: false,
    accepted: false,
    reviewValidated: false,
    packageVersion: null,
    routedVersion: null,
    signedUploaded: false,
    signedVerified: false,
    tagged: false,
    ccWithinSla: null,
    reviewWithinSla: null,
  };
  cases.push(item);
  buildCaseWorkspace(item);
  logAction("Encoded new SSRCS application", item.id);
  persistDemoData();
  populateFilters();
  renderPortal();
  openCase(item.id);
}

function logAction(action, caseId, result = "Completed") {
  activities.unshift([state.user.name, roleLabel(state.role), action, caseId, "25 May 2026, 09:15", result]);
}

function persistDemoData() {
  try {
    window.localStorage.setItem("ssrcsPortalDemo", JSON.stringify({ cases, activities, caseWorkspaces }));
  } catch (error) {
    // Prototype remains functional when local storage is disabled.
  }
}

function restoreDemoData() {
  try {
    const saved = JSON.parse(window.localStorage.getItem("ssrcsPortalDemo") || "null");
    if (!saved) return;
    cases.splice(0, cases.length, ...saved.cases);
    activities = saved.activities;
    Object.assign(caseWorkspaces, saved.caseWorkspaces);
  } catch (error) {
    // Use seeded records if saved prototype data cannot be parsed.
  }
}
function gateChecks(item) {
  return [
    { label: "Technical review requires CC approval, complete outcome, release and acceptance", pass: !["Accepted for Technical Review", "Technical Review Form Created"].includes(item.status) || (item.ccApproved && item.ccOutcome === "Complete" && item.ccReleased && item.accepted) },
    { label: "Package generation requires validated technical review", pass: !["Review Package Generated", "For Team Manager / Supervisor Review", "Cleared for External Routing", "Package Exported / Printed", "Externally Routed for Signature", "Signed Package Uploaded", "Signed Package Verification", "Tagged and Documented", "Closed"].includes(item.status) || item.reviewValidated },
    { label: "Signed package must match routed version", pass: !item.signedUploaded || (Boolean(item.routedVersion) && item.packageVersion === item.routedVersion) },
    { label: "Closure requires verified signed upload and metadata tagging", pass: item.status !== "Closed" || (item.signedUploaded && item.signedVerified && item.tagged && item.packageVersion === item.routedVersion) },
  ];
}

function executeTransition(index) {
  const item = state.selectedCase;
  const action = (transitions[item.status] || []).filter((transition) => transition.role === state.role)[index];
  if (!action) return;
  if (action.gate && !gatePass(action.gate, item)) {
    logAction(`Blocked action: ${action.label}`, item.id, "Blocked");
    persistDemoData();
    showToast(`Blocked: ${gateFailureText(action.gate)}`);
    renderModalBody();
    renderDashboard();
    return;
  }
  if (action.action === "verifySigned") {
    item.signedVerified = true;
    item.lastUpdated = "2026-05-25";
    logAction("Verified signed package against routed version", item.id);
    showToast("Signed package verification recorded. Records staff may now complete metadata tagging.");
  } else {
    item.status = action.to;
    item.lastUpdated = "2026-05-25";
    Object.assign(item, action.update || {});
    if (action.updateFromCase === "routeActiveVersion") item.routedVersion = item.packageVersion;
    if (action.updateFromCase === "supersedePackage") {
      item.packageVersion = (item.packageVersion || 0) + 1;
      item.routedVersion = null;
      item.signedUploaded = false;
      item.signedVerified = false;
      item.tagged = false;
    }
    logAction(action.label, item.id);
    showToast(`${action.label} completed for ${item.id}.`);
  }
  persistDemoData();
  populateFilters();
  renderModalBody();
  renderDashboard();
}

function gatePass(gate, item) {
  if (gate === "technicalReview") return item.ccApproved && item.ccOutcome === "Complete" && item.ccReleased && item.accepted;
  if (gate === "routing") return item.reviewValidated && Boolean(item.packageVersion);
  if (gate === "tagging") return item.signedUploaded && item.signedVerified && item.packageVersion === item.routedVersion;
  if (gate === "closure") return item.signedUploaded && item.signedVerified && item.tagged && item.packageVersion === item.routedVersion;
  return true;
}

function gateFailureText(gate) {
  const messages = {
    technicalReview: "technical review requires a complete, approved and released CC form and acceptance for review.",
    routing: "only a validated active package version may be routed.",
    tagging: "the signed file must be verified against its routed version before tagging.",
    closure: "signed upload verification, version match and completed tagging are mandatory before closure.",
  };
  return messages[gate];
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.add("hidden"), 4000);
}
