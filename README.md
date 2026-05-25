# SSRCS Workflow Portal - Phase 1 MVP

This is a runnable browser-based MVP build for the PSA Statistical Standards
Division SSRCS workflow. It implements:

- internal user login and active-role dashboard selection;
- role-filtered case visibility and task queues;
- completeness-check, technical-review, package-routing, and final-record
  statuses;
- KPI cards, filters, priority actions and recent activity;
- required workflow gates and package-version controls;
- completeness-check and technical-review case workspaces based on the source
  templates;
- package-document and routing/metadata workspaces;
- role-controlled registry, reporting, audit, CS-SQA and administration views.

## Run The Portal

No dependencies are required. With Node.js available:

```bash
npm start
```

Then open `http://127.0.0.1:4173`.

For a static preview, open [index.html](./index.html) directly in a browser.

Application behavior is organized across the browser-loaded portal source
scripts: `portal-data.js`, `portal-dashboard.js`, `portal-views.js`,
`portal-case.js`, `portal-review-creation.js`, and `portal-events.js`.

## Demo Accounts

All passwords are `demo123`.

| Username | Role |
| --- | --- |
| `encoder` | Encoder / Receiving Staff |
| `ccstaff` | SSD Technical Staff / CC Preparer |
| `manager` | Team Manager / Supervisor |
| `chief` | Division Chief |
| `reviewer` | Technical Reviewer |
| `validator` | Internal Validator |
| `records` | Document Custodian / Records Officer |
| `executive` | Authorized Executive / ANS |
| `sqa` | CS-SQA |
| `admin` | System Administrator |
| `multi` | Technical Reviewer and Document Custodian |

## Enforced Workflow Controls

Technical Review Form creation is gated by approved, complete and released
completeness-check results plus formal acceptance for review.

Case closure is gated by a signed-package upload, verification against the
routed package version, and completed metadata tagging.

Form workspaces implement:

- the core Completeness Check documentary requirement list and clarification
  record;
- the seven critical areas for technical findings and recommendations;
- the decision-package component register;
- the external routing, signed-file verification and tagging evidence record.

The build retains changes in browser `localStorage` for walkthrough purposes.
Production implementation requires a database, PSA-managed identity or SSO,
server-enforced authorization, secure file storage, immutable audit logs,
effective-dated SLA configuration and VAPT clearance before deployment.

## Deployment Note

This repository contains the Phase 1 MVP frontend and local server. Production
deployment requires replacing demonstration credentials and browser storage
with authorized identity, backend persistence, secure document storage, audit
retention and cleared VAPT findings.
