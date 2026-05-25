const transitions = {
  "Submitted / Encoded": [
    { label: "Create CC Form", role: "encoder", to: "CC Form Created" },
  ],
  "CC Form Created": [
    { label: "Begin Completeness Check", role: "cc", to: "Under Completeness Check" },
  ],
  "Under Completeness Check": [
    { label: "Submit for Manager Review", role: "cc", to: "For Team Manager Review" },
  ],
  "For Team Manager Review": [
    { label: "Return for Revision", role: "manager", to: "Under Completeness Check", kind: "risk" },
    { label: "Endorse to Division Chief", role: "manager", to: "For Division Chief Approval" },
  ],
  "For Division Chief Approval": [
    { label: "Return for Revision", role: "chief", to: "Under Completeness Check", kind: "risk" },
    { label: "Approve - Complete", role: "chief", to: "CC Approved - Complete", update: { ccApproved: true, ccOutcome: "Complete" } },
    { label: "Approve - Deficient", role: "chief", to: "CC Approved - Deficient", kind: "risk", update: { ccApproved: true, ccOutcome: "Incomplete - Deficiencies / Clarifications" } },
  ],
  "CC Approved - Complete": [
    { label: "Release CC Form", role: "custodian", to: "CC Form Released to Applicant", update: { ccReleased: true } },
  ],
  "CC Approved - Deficient": [
    { label: "Release Deficiency Form", role: "custodian", to: "CC Deficiency Form Released to Applicant", update: { ccReleased: true } },
  ],
  "CC Deficiency Form Released to Applicant": [
    { label: "Mark Awaiting Submission", role: "custodian", to: "Awaiting Completion Submission" },
  ],
  "Awaiting Completion Submission": [
    { label: "Record Applicant Submission", role: "encoder", to: "Completion Submission Received" },
  ],
  "Completion Submission Received": [
    { label: "Restart Completeness Check", role: "cc", to: "Under Completeness Check", update: { ccApproved: false, ccReleased: false } },
  ],
  "CC Form Released to Applicant": [
    { label: "Accept for Technical Review", role: "manager", to: "Accepted for Technical Review", update: { accepted: true } },
  ],
  "Accepted for Technical Review": [
    { label: "Create Technical Review Form", role: "reviewer", to: "Technical Review Form Created", gate: "technicalReview" },
  ],
  "Technical Review Form Created": [
    { label: "Start Technical Review", role: "reviewer", to: "Under Technical Review" },
  ],
  "Under Technical Review": [
    { label: "Submit for Validation", role: "reviewer", to: "Under Internal Validation" },
  ],
  "Under Internal Validation": [
    { label: "Return for Revision", role: "validator", to: "Under Technical Review", kind: "risk" },
    { label: "Validate and Generate Package", role: "validator", to: "Review Package Generated", update: { reviewValidated: true, packageVersion: 1 } },
  ],
  "Review Package Generated": [
    { label: "Submit Package for Manager Review", role: "custodian", to: "For Team Manager / Supervisor Review" },
  ],
  "For Team Manager / Supervisor Review": [
    { label: "Return Review for Revision", role: "manager", to: "Under Technical Review", kind: "risk", update: { reviewValidated: false } },
    { label: "Clear for External Routing", role: "manager", to: "Cleared for External Routing" },
  ],
  "Cleared for External Routing": [
    { label: "Export / Print Package", role: "custodian", to: "Package Exported / Printed", gate: "routing" },
  ],
  "Package Exported / Printed": [
    { label: "Record External Routing", role: "custodian", to: "Externally Routed for Signature", updateFromCase: "routeActiveVersion" },
  ],
  "Externally Routed for Signature": [
    { label: "Upload Signed Package", role: "custodian", to: "Signed Package Uploaded", update: { signedUploaded: true } },
    { label: "Return for Correction", role: "custodian", to: "Returned from External Routing - For Correction", kind: "risk" },
  ],
  "Returned from External Routing - For Correction": [
    { label: "Return to Technical Revision", role: "manager", to: "Under Technical Review", kind: "risk", updateFromCase: "supersedePackage" },
  ],
  "Signed Package Uploaded": [
    { label: "Submit for Verification", role: "custodian", to: "Signed Package Verification" },
  ],
  "Signed Package Verification": [
    { label: "Verify Matching Package", role: "manager", action: "verifySigned" },
    { label: "Request Re-upload", role: "manager", to: "Signed Package Re-upload Required", kind: "risk", update: { signedVerified: false } },
    { label: "Complete Metadata Tagging", role: "custodian", to: "Tagged and Documented", gate: "tagging", update: { tagged: true } },
  ],
  "Signed Package Re-upload Required": [
    { label: "Upload Corrected Signed Package", role: "custodian", to: "Signed Package Uploaded", update: { signedUploaded: true } },
  ],
  "Tagged and Documented": [
    { label: "Close Case", role: "chief", to: "Closed", gate: "closure" },
  ],
};

const navByRole = {
  encoder: ["dashboard", "applications"],
  cc: ["dashboard", "applications"],
  manager: ["dashboard", "applications", "reports"],
  chief: ["dashboard", "applications", "reports", "audit"],
  reviewer: ["dashboard", "applications"],
  validator: ["dashboard", "applications"],
  custodian: ["dashboard", "applications"],
  executive: ["dashboard", "reports"],
  sqa: ["dashboard", "security", "audit"],
  admin: ["dashboard", "admin", "audit"],
};

const navLabels = {
  dashboard: "Dashboard",
  applications: "Applications",
  reports: "Reports",
  audit: "Audit Log",
  security: "Security QA",
  admin: "Administration",
};

function dateDays(dateString) {
  return Math.max(0, Math.floor((today - new Date(`${dateString}T00:00:00+08:00`)) / DAY_MS));
}

function roleLabel(role) {
  return roles[role].label;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function statusClass(caseItem) {
  if (caseItem.status === "Closed" || caseItem.status === "Tagged and Documented") return "closed";
  if (dateDays(caseItem.lastUpdated) > 7 || caseItem.status.includes("Deficient") || caseItem.status.includes("Re-upload")) return "risk";
  if (caseItem.status.includes("For ") || caseItem.status.includes("Awaiting") || caseItem.status.includes("Routed")) return "pending";
  return "";
}

function visibleCases() {
  if (!state.user || !state.role) return [];
  const role = state.role;
  const name = state.user.name;
  if (["manager", "chief", "executive", "admin"].includes(role)) return cases;
  if (role === "sqa") return cases;
  if (role === "encoder") return cases.filter((item) => ["Submitted / Encoded", "CC Form Created", "Awaiting Completion Submission", "Completion Submission Received"].includes(item.status));
  if (role === "cc") return cases.filter((item) => item.assigned.cc === name && [
    "CC Form Created",
    "Under Completeness Check",
    "For Team Manager Review",
    "For Division Chief Approval",
    "CC Approved - Complete",
    "CC Approved - Deficient",
    "CC Form Released to Applicant",
    "CC Deficiency Form Released to Applicant",
    "Awaiting Completion Submission",
    "Completion Submission Received",
  ].includes(item.status));
  if (role === "reviewer") return cases.filter((item) => item.assigned.reviewer === name && [
    "Accepted for Technical Review",
    "Technical Review Form Created",
    "Under Technical Review",
    "Under Internal Validation",
    "Review Package Generated",
    "For Team Manager / Supervisor Review",
    "Returned from External Routing - For Correction",
    "Signature Declined / Decision Reconsideration",
  ].includes(item.status));
  if (role === "validator") return cases.filter((item) => item.assigned.validator === name && ["Under Internal Validation", "Review Package Generated"].includes(item.status));
  if (role === "custodian") return cases.filter((item) => item.assigned.custodian === name && [
    "CC Approved - Complete",
    "CC Approved - Deficient",
    "CC Form Released to Applicant",
    "CC Deficiency Form Released to Applicant",
    "Review Package Generated",
    "Cleared for External Routing",
    "Package Exported / Printed",
    "Externally Routed for Signature",
    "Returned from External Routing - For Correction",
    "Signed Package Uploaded",
    "Signed Package Verification",
    "Signed Package Re-upload Required",
    "Tagged and Documented",
  ].includes(item.status));
  return [];
}

function filteredCases() {
  let rows = visibleCases();
  const filter = state.filters;
  if (state.cardFilter) rows = rows.filter(state.cardFilter.predicate);
  if (filter.search) {
    const search = filter.search.toLowerCase();
    rows = rows.filter((row) => `${row.id} ${row.activity}`.toLowerCase().includes(search));
  }
  if (filter.phase) rows = rows.filter((row) => phaseMap[row.status] === filter.phase);
  if (filter.status) rows = rows.filter((row) => row.status === filter.status);
  if (filter.agency) rows = rows.filter((row) => row.agency === filter.agency);
  if (filter.staff) rows = rows.filter((row) => Object.values(row.assigned).includes(filter.staff));
  if (filter.period) rows = rows.filter((row) => row.received.startsWith(filter.period));
  return rows.sort((a, b) => dateDays(b.lastUpdated) - dateDays(a.lastUpdated));
}

function activeCases(list) {
  return list.filter((row) => row.status !== "Closed");
}

function ratio(numerator, denominator) {
  return denominator ? `${Math.round((numerator / denominator) * 100)}%` : "--";
}

function kpiDefinitions(role) {
  const data = visibleCases();
  const received = data.filter((row) => row.received.startsWith("2026-05"));
  const cc = data.filter((row) => phaseMap[row.status] === "Completeness Check");
  const review = data.filter((row) => ["Technical Review Form Created", "Under Technical Review", "Under Internal Validation"].includes(row.status));
  const ccComplete = data.filter((row) => row.ccApproved);
  const reviewComplete = data.filter((row) => row.reviewValidated);
  const routed = data.filter((row) => row.routedVersion);
  const pendingSignature = data.filter((row) => row.status === "Externally Routed for Signature");
  const closed = data.filter((row) => row.status === "Closed");
  const common = {
    received: { label: "Applications Received", value: received.length, support: "Encoded this month", predicate: (c) => c.received.startsWith("2026-05") },
    cc: { label: "Applications Under CC", value: cc.length, support: "Active completeness controls", predicate: (c) => phaseMap[c.status] === "Completeness Check" },
    review: { label: "Under Technical Review", value: review.length, support: "Review or validation active", predicate: (c) => ["Technical Review Form Created", "Under Technical Review", "Under Internal Validation"].includes(c.status) },
    ccSla: { label: "CC Within SLA", value: ratio(ccComplete.filter((c) => c.ccWithinSla).length, ccComplete.length), support: "Approved CC forms", tone: "good", predicate: (c) => c.ccApproved },
    reviewSla: { label: "Review Within SLA", value: ratio(reviewComplete.filter((c) => c.reviewWithinSla).length, reviewComplete.length), support: "Validated reviews", tone: "good", predicate: (c) => c.reviewValidated },
    signatures: { label: "Pending Signatures", value: pendingSignature.length, support: "Externally routed packages", tone: pendingSignature.length ? "risk" : "good", predicate: (c) => c.status === "Externally Routed for Signature" },
    signedRate: { label: "Signed Upload Completion", value: ratio(routed.filter((c) => c.signedUploaded).length, routed.length), support: "Routed packages", tone: "good", predicate: (c) => Boolean(c.routedVersion) },
    taggedRate: { label: "Tagged Closure Rate", value: ratio(closed.filter((c) => c.tagged).length, closed.length), support: "Closed records", tone: "good", predicate: (c) => c.status === "Closed" },
  };
  if (role === "cc") return [common.cc, { label: "For Revision", value: 0, support: "Returned internally", tone: "pending", predicate: (c) => c.status === "Under Completeness Check" }, common.ccSla, common.received];
  if (role === "reviewer") return [common.review, { label: "Under Validation", value: data.filter((c) => c.status === "Under Internal Validation").length, support: "Awaiting validation", tone: "pending", predicate: (c) => c.status === "Under Internal Validation" }, common.reviewSla, { label: "Overdue Reviews", value: review.filter((c) => dateDays(c.lastUpdated) > 7).length, support: "SLA attention", tone: "risk", predicate: (c) => phaseMap[c.status] === "Formal Review" && dateDays(c.lastUpdated) > 7 }];
  if (role === "manager") return [common.cc, common.review, { label: "Packages for Review", value: data.filter((c) => c.status === "For Team Manager / Supervisor Review").length, support: "Manager action", tone: "pending", predicate: (c) => c.status === "For Team Manager / Supervisor Review" }, common.signatures, common.ccSla, common.reviewSla];
  if (role === "chief" || role === "executive") return [common.received, common.cc, common.review, common.ccSla, common.reviewSla, common.signatures, common.signedRate, common.taggedRate];
  if (role === "custodian") return [{ label: "For Package Generation", value: data.filter((c) => c.status === "Review Package Generated").length, support: "Validated cases", tone: "pending", predicate: (c) => c.status === "Review Package Generated" }, common.signatures, { label: "Uploaded Untagged", value: data.filter((c) => c.signedUploaded && !c.tagged).length, support: "Closure blockers", tone: "risk", predicate: (c) => c.signedUploaded && !c.tagged }, common.taggedRate];
  if (role === "sqa") return [{ label: "Open Vulnerabilities", value: vulnerabilities.filter((v) => v.status !== "Closed").length, support: "VAPT issues", tone: "risk", predicate: () => true }, { label: "Blocked Gate Attempts", value: activities.filter((a) => a[5] === "Blocked").length, support: "Control events", tone: "risk", predicate: () => true }, common.signedRate, common.taggedRate];
  if (role === "admin") return [{ label: "Active Users", value: Object.keys(users).length, support: "Configured accounts", predicate: () => true }, { label: "Template Versions", value: templateVersions.length, support: "Controlled artifacts", tone: "pending", predicate: () => true }, common.received, common.taggedRate];
  return [common.received, common.cc, common.review, common.signatures];
}

function nextAction(caseItem) {
  const items = transitions[caseItem.status] || [];
  const roleTransition = items.find((item) => item.role === state.role);
  if (roleTransition) return roleTransition.label;
  const labels = {
    "For Division Chief Approval": "Await Division Chief approval",
    "Under Internal Validation": "Await validator action",
    "For Team Manager / Supervisor Review": "Await manager clearance",
    "Externally Routed for Signature": "Await signed return",
    "Signed Package Verification": "Verify and tag signed package",
    Closed: "Completed",
  };
  return labels[caseItem.status] || "Monitor current status";
}

function priorityItems() {
  const allowed = visibleCases();
  return allowed
    .filter((caseItem) => {
      const ownTransition = (transitions[caseItem.status] || []).some((action) => action.role === state.role);
      return ownTransition || (state.role === "sqa" && dateDays(caseItem.lastUpdated) > 7);
    })
    .sort((a, b) => dateDays(b.lastUpdated) - dateDays(a.lastUpdated))
    .slice(0, 5);
}

function displayDate(value) {
  return new Date(`${value}T00:00:00+08:00`).toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" });
}
