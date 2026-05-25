# SSRCS Portal Usability and Web Red-Team Remediation Register

Date: 25 May 2026

## Implemented In The MVP Frontend

| Finding | Risk | Implemented correction |
| --- | --- | --- |
| Editable official forms rendered in a narrow side drawer | Horizontal scrolling, incomplete writing, low task focus | Added full-page Completeness Check and Technical Review workspaces; drawer now launches authoring work |
| New CC form implicitly assessed as complete | Default/approval bias and invalid completeness outcome | Added `Not Assessed` initialization and progress tracking |
| Review findings can be submitted incomplete | Incomplete review package and weak validation | Submission blocks unassessed areas and missing observations/recommendations for adverse ratings |
| CC assessment can be forwarded incomplete | Unreviewed documents treated as complete | Submission blocks unassessed requirements and missing remarks for deficient items |
| Users can leave edited forms without warning | Loss of work and re-entry burden | Added dirty-state display and leave/unload confirmation |
| Status table remains stale after workflow transitions | Conflicting operational status and trust failure | Workflow transitions now refresh all portal views |
| Manager action text anchors user toward revision | Biased decision framing | Replaced forced correction wording with neutral decision prompt |
| Mandatory gates display PASS before relevant stage | False assurance | Added `NOT YET APPLICABLE`, `PENDING`, and `SATISFIED` gate states |
| Closed cases appear in active queue | Monitoring clutter | Excluded closed cases from the default active dashboard table |
| Reviewer navigation remains intake-oriented | Role/task mental model mismatch | Added `Review Assignments` and `Completeness Checks` role labels |
| Notifications badge has no action | False affordance | Badge now directs users to the priority action queue |

## Production Architecture Requirements

The static GitHub Pages MVP cannot securely implement these controls:

| Requirement | Reason it remains outside the static MVP |
| --- | --- |
| PSA identity integration or secure authenticated login | Browser JavaScript cannot protect credentials or sessions |
| Server-side role authorization and transition gates | Client-side state can be edited by a browser user |
| Shared database persistence and versioning | `localStorage` is device-specific and modifiable |
| Immutable audit log and server timestamps | Client-generated audit events are not evidentiary records |
| Secure document upload/storage and malware scanning | Static hosting provides no controlled records service |
| Formal VAPT and deployment clearance | Requires the implemented production stack and hosting environment |
