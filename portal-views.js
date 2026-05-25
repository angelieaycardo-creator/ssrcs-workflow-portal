function renderLoginAccounts() {
  document.getElementById("demo-account-list").innerHTML = Object.entries(users)
    .map(([username, user]) => `<div><code>${username}</code><br><small>${escapeHtml(user.roles.map(roleLabel).join(", "))}</small></div>`)
    .join("");
}

function login(event) {
  event.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const user = users[username];
  const error = document.getElementById("login-error");
  if (!user || user.password !== password) {
    error.textContent = "Sign-in failed. Use a listed demonstration account and password.";
    error.classList.remove("hidden");
    return;
  }
  error.classList.add("hidden");
  state.user = { username, ...user };
  state.role = user.roles[0];
  state.view = "dashboard";
  state.cardFilter = null;
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("portal").classList.remove("hidden");
  activities.unshift([user.name, roleLabel(state.role), "Successful portal login", "-", "25 May 2026, 09:00", "Completed"]);
  persistDemoData();
  setupPortal();
}

function setupPortal() {
  document.getElementById("user-name").textContent = state.user.name;
  document.getElementById("user-office").textContent = state.user.office;
  const roleSelect = document.getElementById("role-select");
  roleSelect.innerHTML = state.user.roles.map((role) => `<option value="${role}">${escapeHtml(roleLabel(role))}</option>`).join("");
  roleSelect.disabled = state.user.roles.length === 1;
  roleSelect.value = state.role;
  populateFilters();
  renderPortal();
}

function renderPortal() {
  renderNav();
  renderDashboard();
  renderApplicationsModule();
  renderReports();
  renderAudit();
  renderSecurity();
  renderAdmin();
  document.getElementById("dashboard-view").classList.toggle("hidden", state.view !== "dashboard");
  document.getElementById("applications-view").classList.toggle("hidden", state.view !== "applications");
  document.getElementById("reports-view").classList.toggle("hidden", state.view !== "reports");
  document.getElementById("audit-view").classList.toggle("hidden", state.view !== "audit");
  document.getElementById("security-view").classList.toggle("hidden", state.view !== "security");
  document.getElementById("admin-view").classList.toggle("hidden", state.view !== "admin");
}

function renderNav() {
  document.getElementById("nav-menu").innerHTML = (navByRole[state.role] || ["dashboard"])
    .map((item) => {
      const active = state.view === item;
      return `<button class="nav-item ${active ? "active" : ""}" data-nav="${item}">${navLabels[item]}</button>`;
    })
    .join("");
}

function renderDashboard() {
  const role = roles[state.role];
  const banner = document.getElementById("role-banner");
  banner.innerHTML = `<div><p class="eyebrow">Active role context</p><h2>${escapeHtml(role.title)}</h2><p class="description">${escapeHtml(role.description)}</p></div><div class="banner-meta"><span>Access scope</span><strong>${escapeHtml(accessScopeText())}</strong><span>Reporting date</span><strong>25 May 2026</strong></div>`;
  renderKpis();
  renderPriority();
  renderSnapshot();
  renderTable();
  renderActivity();
  document.getElementById("notification-count").textContent = priorityItems().length;
}

function accessScopeText() {
  if (["manager", "chief", "executive", "admin"].includes(state.role)) return state.role === "manager" ? "Team-wide applications" : "Authorized division-wide records";
  if (state.role === "sqa") return "Security and control records";
  return "Assigned workflow cases";
}

function renderKpis() {
  const definitions = kpiDefinitions(state.role);
  document.getElementById("kpi-cards").innerHTML = definitions
    .map((card, index) => `<button class="kpi-card ${card.tone || ""} ${state.cardFilter?.index === index ? "active" : ""}" data-card="${index}"><span class="label">${escapeHtml(card.label)}</span><span class="value">${escapeHtml(card.value)}</span><span class="support">${escapeHtml(card.support)}</span></button>`)
    .join("");
}

function renderPriority() {
  const items = priorityItems();
  document.getElementById("priority-count").textContent = `${items.length} items`;
  document.getElementById("priority-actions").innerHTML = items.length
    ? items.map((item) => `<article class="priority-item ${dateDays(item.lastUpdated) > 7 ? "risk" : ""}"><div><span class="status-chip ${statusClass(item)}">${escapeHtml(item.status)}</span><h3>${escapeHtml(item.id)} - ${escapeHtml(item.activity)}</h3><p>Required Action: ${escapeHtml(nextAction(item))}<br>Last updated: ${displayDate(item.lastUpdated)} | Aging: ${dateDays(item.lastUpdated)} days</p></div><button class="button small subtle" data-open-case="${item.id}">Open Case</button></article>`).join("")
    : `<p class="empty-state">No immediate actions in your current queue.</p>`;
}

function renderSnapshot() {
  const visible = activeCases(visibleCases());
  const groups = ["Completeness Check", "Formal Review", "Package Review", "Routing", "Final Documentation"];
  document.getElementById("monitor-title").textContent = state.role === "reviewer" || state.role === "cc" ? "My Workload Snapshot" : "Workflow Snapshot";
  document.getElementById("monitor-panel").innerHTML = `<div class="snapshot-list">${groups.map((group) => {
    const value = visible.filter((item) => phaseMap[item.status] === group).length;
    const percentage = visible.length ? Math.max(4, (value / visible.length) * 100) : 0;
    return `<div class="snapshot-row"><div><span>${group}</span><span>${value}</span></div><div class="bar"><span style="width:${percentage}%"></span></div></div>`;
  }).join("")}</div>`;
}

function populateFilters() {
  const rows = visibleCases();
  fillSelect("filter-phase", "All phases", [...new Set(rows.map((row) => phaseMap[row.status]))]);
  fillSelect("filter-status", "All statuses", [...new Set(rows.map((row) => row.status))]);
  fillSelect("filter-agency", "All agencies", [...new Set(rows.map((row) => row.agency))]);
  fillSelect("filter-staff", "All staff", [...new Set(rows.flatMap((row) => Object.values(row.assigned)))]);
  fillSelect("filter-period", "All periods", [...new Set(rows.map((row) => row.received.slice(0, 7)))]);
}

function fillSelect(id, emptyLabel, choices) {
  const element = document.getElementById(id);
  const current = element.value;
  element.innerHTML = `<option value="">${emptyLabel}</option>${choices.sort().map((choice) => `<option value="${escapeHtml(choice)}">${escapeHtml(choice)}</option>`).join("")}`;
  if (choices.includes(current)) element.value = current;
}

function renderTable() {
  const rows = filteredCases();
  document.getElementById("applications-body").innerHTML = rows.length
    ? rows.map((item) => `<tr><td><strong>${escapeHtml(item.id)}</strong></td><td>${escapeHtml(item.activity)}</td><td>${escapeHtml(item.agency)}</td><td>${escapeHtml(currentAssignee(item))}</td><td>${escapeHtml(phaseMap[item.status])}</td><td><span class="status-chip ${statusClass(item)}">${escapeHtml(item.status)}</span></td><td>${displayDate(item.lastUpdated)}</td><td class="${dateDays(item.lastUpdated) > 7 ? "aging-risk" : "aging-normal"}">${dateDays(item.lastUpdated)} days</td><td>${escapeHtml(nextAction(item))}</td><td><button class="button small subtle" data-open-case="${item.id}">View</button></td></tr>`).join("")
    : `<tr><td class="empty-state" colspan="10">No applications match the selected filters.</td></tr>`;
}

function currentAssignee(caseItem) {
  if (phaseMap[caseItem.status] === "Completeness Check") return caseItem.assigned.cc;
  if (caseItem.status === "Under Internal Validation") return caseItem.assigned.validator;
  if (["Routing", "Final Documentation"].includes(phaseMap[caseItem.status])) return caseItem.assigned.custodian;
  return caseItem.assigned.reviewer;
}

function renderActivity() {
  const accessibleIds = new Set(visibleCases().map((row) => row.id));
  const visibleActivity = activities.filter((entry) => entry[3] === "-" || accessibleIds.has(entry[3]) || ["chief", "admin", "sqa"].includes(state.role)).slice(0, 6);
  document.getElementById("activity-list").innerHTML = visibleActivity
    .map((entry) => `<div class="activity-row"><div><strong>${escapeHtml(entry[0])}</strong><span class="activity-role">${escapeHtml(entry[1])}</span></div><div>${escapeHtml(entry[3])}</div><div>${escapeHtml(entry[2])}</div><div>${escapeHtml(entry[4])}</div><div><span class="status-chip ${entry[5] === "Blocked" ? "risk" : entry[5] === "Pending" ? "pending" : "closed"}">${entry[5]}</span></div></div>`)
    .join("");
}

function renderApplicationsModule() {
  const view = document.getElementById("applications-view");
  const rows = visibleCases().slice().sort((a, b) => a.id.localeCompare(b.id));
  const mayCreate = state.role === "encoder";
  view.innerHTML = `<div class="module-stack">
    <section class="panel">
      <div class="module-header">
        <div><p class="eyebrow">Case registry</p><h2>SSRCS Applications</h2><p class="muted">Open permitted cases to work on forms, technical findings, package records and routing evidence.</p></div>
        <div class="module-actions">${mayCreate ? `<button class="button primary" data-create-case>Create Application</button>` : ""}</div>
      </div>
      <table class="module-table">
        <thead><tr><th>Reference</th><th>Statistical Activity</th><th>Agency / Office</th><th>Phase</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>${rows.length ? rows.map((item) => `<tr><td><strong>${escapeHtml(item.id)}</strong></td><td>${escapeHtml(item.activity)}</td><td>${escapeHtml(item.agency)}</td><td>${escapeHtml(phaseMap[item.status])}</td><td><span class="status-chip ${statusClass(item)}">${escapeHtml(item.status)}</span></td><td><button class="button small subtle" data-open-case="${item.id}">Open Workspace</button></td></tr>`).join("") : `<tr><td class="empty-state" colspan="6">No applications are available under this role.</td></tr>`}</tbody>
      </table>
    </section>
  </div>`;
}

function renderReports() {
  const view = document.getElementById("reports-view");
  const data = visibleCases();
  const overdue = data.filter((item) => item.status !== "Closed" && dateDays(item.lastUpdated) > 7).length;
  view.innerHTML = `<div class="module-stack">
    <section class="panel">
      <div class="module-header">
        <div><p class="eyebrow">Operational reporting</p><h2>Reports and KPI Definitions</h2><p class="muted">Phase 1 reporting focuses on workload, SLA performance, routing and records governance.</p></div>
      </div>
      <div class="metrics-row">
        <div class="kpi-card pending"><span class="label">Open Records in Scope</span><span class="value">${activeCases(data).length}</span><span class="support">Role-filtered cases</span></div>
        <div class="kpi-card ${overdue ? "risk" : "good"}"><span class="label">Aging Exceptions</span><span class="value">${overdue}</span><span class="support">Over seven elapsed days in current state</span></div>
        <div class="kpi-card good"><span class="label">Governance Baseline</span><span class="value">13</span><span class="support">Mandatory Phase 1 KPIs</span></div>
      </div>
    </section>
    <section class="panel">
      <div class="panel-heading"><h2>Core KPI Register</h2></div>
      ${[
        ["Average Completeness Check Processing Time", "Application Intake to CC Approval, excluding recorded applicant waiting periods.", "Active CC processing days / approved CC cases"],
        ["CC Within SLA", "Completed completeness assessments that meet the configured SLA.", "Within SLA / completed CC cases"],
        ["Average Technical Review Processing Time", "Review form creation through clearance for external routing.", "Active review days / completed reviews"],
        ["Pending Signature Packages", "Externally routed packages without a verified signed return.", "Count of pending routed packages"],
        ["Tagged Closure Rate", "Closed cases with required metadata completed.", "Tagged closed / total closed cases"],
      ].map((row) => `<div class="report-definition"><strong>${row[0]}</strong><span>${row[1]}</span><code>${row[2]}</code></div>`).join("")}
    </section>
  </div>`;
}

function renderAudit() {
  const view = document.getElementById("audit-view");
  const permitted = ["chief", "admin", "sqa", "manager"].includes(state.role);
  if (!permitted) {
    view.innerHTML = `<section class="panel"><p class="empty-state">Audit-log access is not permitted under the active role.</p></section>`;
    return;
  }
  view.innerHTML = `<div class="module-stack">
    <section class="panel">
      <div class="module-header"><div><p class="eyebrow">Immutable event trail</p><h2>Audit Log</h2><p class="muted">Status transitions, document actions, selected active roles and blocked control attempts.</p></div></div>
      <table class="module-table">
        <thead><tr><th>User</th><th>Active Role</th><th>Action</th><th>Case</th><th>Timestamp</th><th>Result</th></tr></thead>
        <tbody>${activities.map((entry) => `<tr><td>${escapeHtml(entry[0])}</td><td>${escapeHtml(entry[1])}</td><td>${escapeHtml(entry[2])}</td><td>${escapeHtml(entry[3])}</td><td>${escapeHtml(entry[4])}</td><td><span class="status-chip ${entry[5] === "Blocked" ? "risk" : entry[5] === "Pending" ? "pending" : "closed"}">${entry[5]}</span></td></tr>`).join("")}</tbody>
      </table>
    </section>
  </div>`;
}

function renderSecurity() {
  const view = document.getElementById("security-view");
  if (state.role !== "sqa") {
    view.innerHTML = "";
    return;
  }
  view.innerHTML = `<div class="view-page"><div class="role-banner"><div><p class="eyebrow">System assurance</p><h2>VAPT and Control Validation</h2><p class="description">Track vulnerabilities, retesting and prohibited workflow bypass attempts.</p></div></div><div class="security-cards"><div class="kpi-card risk"><span class="label">High Findings</span><span class="value">1</span><span class="support">Must close before deployment</span></div><div class="kpi-card pending"><span class="label">For Retest</span><span class="value">1</span><span class="support">Remediation supplied</span></div><div class="kpi-card risk"><span class="label">Blocked Gate Attempts</span><span class="value">1</span><span class="support">Audit logged</span></div><div class="kpi-card good"><span class="label">Last VAPT Date</span><span class="value" style="font-size:1.22rem">22 May</span><span class="support">2026 test cycle</span></div></div><section class="panel"><div class="panel-heading"><h2>Vulnerability Register</h2></div><table class="security-table"><thead><tr><th>ID</th><th>Severity</th><th>Module</th><th>Finding</th><th>Status</th></tr></thead><tbody>${vulnerabilities.map((item) => `<tr><td>${item.id}</td><td><span class="status-chip ${item.severity === "High" ? "risk" : "pending"}">${item.severity}</span></td><td>${item.module}</td><td>${item.finding}</td><td>${item.status}</td></tr>`).join("")}</tbody></table></section></div>`;
}

function renderAdmin() {
  const view = document.getElementById("admin-view");
  if (state.role !== "admin") {
    view.innerHTML = "";
    return;
  }
  view.innerHTML = `<div class="view-page"><div class="role-banner"><div><p class="eyebrow">Controlled configuration</p><h2>Administration Console</h2><p class="description">Manage portal accounts, active templates, workflow references and effective-dated SLA controls.</p></div></div><div class="admin-cards"><div class="kpi-card"><span class="label">Active User Accounts</span><span class="value">${Object.keys(users).length}</span><span class="support">Internal demonstration users</span></div><div class="kpi-card pending"><span class="label">Templates for Approval</span><span class="value">3</span><span class="support">Corrected artifacts</span></div><div class="kpi-card"><span class="label">Configured Roles</span><span class="value">${Object.keys(roles).length}</span><span class="support">Permission sets</span></div><div class="kpi-card good"><span class="label">SLA Rules</span><span class="value">2</span><span class="support">Effective-dated metrics</span></div></div><section class="panel"><div class="panel-heading"><h2>Template Version Status</h2></div><table class="security-table"><thead><tr><th>Template</th><th>Version</th><th>Status</th></tr></thead><tbody>${templateVersions.map((item) => `<tr><td>${item[0]}</td><td>${item[1]}</td><td><span class="status-chip pending">${item[2]}</span></td></tr>`).join("")}</tbody></table></section></div>`;
}

function openCase(id) {
  const item = cases.find((row) => row.id === id);
  if (!item || !visibleCases().includes(item)) {
    showToast("Access denied. This record is outside the current role scope.");
    return;
  }
  state.selectedCase = item;
  state.caseTab = "overview";
  buildCaseWorkspace(item);
  const modal = document.getElementById("case-modal");
  document.getElementById("modal-reference").textContent = item.id;
  document.getElementById("case-modal-title").textContent = item.activity;
  renderModalBody();
  modal.classList.remove("hidden");
}
