# Phase 1 Project Documentation

## Northern Cape National Teaching Awards Digital Management System

**School:** School of Natural and Applied Science  
**Department:** Computer Science and Information Technology (CSIT)  
**Project code:** NPRJ740  
**Qualification:** Advanced ICT Diploma — 2026  
**Student:** Siphokuhle Njova  
**Organization studied:** Northern Cape Department of Education  
**Supervisor:** Dr Tite Tuyikeze  
**Submission date:** [To be completed]

> **Fieldwork note:** This draft uses the student’s summary of a coordinator’s concerns. The interview date and method, detailed examples, and daily-process observations were not provided. Those evidence gaps are identified below and must be completed before submission; no interview findings or observations have been invented.

## Contents

1. [Introduction](#1-introduction)
2. [Business ICT assessment](#2-business-ict-assessment)
3. [Identification of ICT problems](#3-identification-of-ict-problems)
4. [System/software requirements analysis](#4-systemsoftware-requirements-analysis)
5. [Use-case diagram](#5-use-case-diagram)
6. [Solution analysis](#6-solution-analysis)
7. [Conclusion](#7-conclusion)
8. [References](#references)
9. [Appendix A — Coordinator interview questionnaire](#appendix-a--coordinator-interview-questionnaire)
10. [Appendix B — Daily-transaction observation checklist](#appendix-b--daily-transaction-observation-checklist)
11. [Appendix C — Fieldwork completion checklist](#appendix-c--fieldwork-completion-checklist)

## Executive summary

This Phase 1 investigation considers the need for a digital system to support the Northern Cape Department of Education’s National Teaching Awards coordination process. The available interview note records a coordinator’s concern that service delivery was very poor and that newer technology had not been adopted to move the process away from paper management. The note does not include a date, transcript, detailed examples, or corroborating observations.

The proposed system is a role-based web application for teacher registration and award applications, document handling, district vetting, provincial compliance review, award-cycle administration, and audit/reporting. Project documentation describes an implementation using Node.js, Express, PostgreSQL, and Prisma, with private document storage. The application is a development build, not approved for real personal or confidential data. Its documented capabilities are therefore treated as the proposed solution, not as proof of operational deployment or acceptance.

No daily-process observation notes were provided. The current-state transaction sequence and possible impacts in this report are explicitly provisional and must be verified with the coordinator and relevant staff. The immediate next step is to complete the fieldwork, confirm the official process and rules, and then update the problem analysis and requirements.

## 1. Introduction

### 1.1 Background

The National Teaching Awards process requires information and supporting documents to move between teachers and officials involved in application administration, district review, and provincial compliance. The student’s interview summary points to continued paper management and a perceived need to modernise the service. This project investigates how a digital management system could make application handling more structured, visible, and auditable.

### 1.2 Purpose and scope

The purpose of Phase 1 is to describe the business and ICT context, document available stakeholder evidence, identify the problem, analyse system requirements, consider possible solutions, and present the proposed system through a use-case diagram.

This report focuses on application and award-cycle administration. It is not an official interpretation of award policy or a completed operational process audit. The applicable directorate, process owner, approval delegations, records-management procedures, and current official award guide still need confirmation.

### 1.3 Objectives

- Describe the Department context relevant to provincial award administration, subject to confirmation of the responsible unit and its mandate.
- Separate recorded interview evidence from assumptions and unverified current-state workflow details.
- Identify functional and quality requirements for a role-based application-management system.
- Analyse possible solutions and explain the proposed digital approach.
- Provide an interview questionnaire and observation checklist for completing the remaining fieldwork.

## 2. Business ICT assessment

### 2.1 Organization and process context

The organization identified for this project is the Northern Cape Department of Education. The system is intended to support the Department’s coordination of provincial participation in the National Teaching Awards. The specific directorate, process owner, and operating procedures were not supplied and should be confirmed with the coordinator.

### 2.2 ICT usage and current state

The current-state evidence supplied is a student summary of a conversation with a coordinator. The coordinator reportedly described the services as very poor and said there was a lack of newer technology to move away from paper management. This indicates a perceived service and modernisation concern. The note does not establish the exact software currently used, transaction volumes, causes of delay, error rates, or the experiences of teachers and other officials.

The proposed solution uses a browser-based interface, server-side role and access checks, a PostgreSQL database managed through Prisma, and private document storage. These are features documented in the project codebase; they describe the solution under development, not verified ICT assets currently used by the Department [3].

### 2.3 Interview evidence and limitations

| Item | Information available |
|---|---|
| Interviewee role | Coordinator |
| Interview date and method | Not provided |
| Source | Student’s summary of the coordinator’s comments |
| Reported concern 1 | Service delivery was perceived as very poor |
| Reported concern 2 | The process had not made an effective transition from paper management to newer technology |
| Specific examples, frequency, and impact | Not provided |
| Supporting daily-process observations | Not provided |

This report paraphrases the available note and does not present it as a direct quotation. One summarized stakeholder response helps identify an area for investigation but is not sufficient to generalise across all applicants, schools, districts, or award cycles. Follow-up questions and process observation are needed to validate the detail and extent of the concerns.

## 3. Identification of ICT problems

### 3.1 Problems supported by the evidence

The available evidence supports two limited findings:

1. A coordinator reported a poor service experience. The specific service failures, affected users, and measures of impact have not been documented.
2. The coordinator’s reported view was that the process remained paper-based and lacked newer technology to support a transition.

### 3.2 Daily transactions: provisional process to validate

No direct observation log or step-by-step account of daily transactions was supplied. The following sequence is a preliminary model inferred from the intended system workflow. It is **not** presented as an observed description of current practice:

1. An award cycle and its dates or guidance are communicated to prospective applicants.
2. A teacher prepares an application, selects an award category, and supplies supporting documents.
3. The application is received and checked for completeness and the relevant school or district.
4. A district official reviews the application, records checks, and makes a permitted decision or requests further action.
5. A provincial official performs the applicable compliance review and records the outcome.
6. Officials communicate progress or decisions, retain the record, and produce authorised summaries.

For each step, fieldwork should establish who performs the action, which form or system is used, what records are created, how long the step takes, where files are stored, how errors or missing documents are handled, and how applicants are notified.

### 3.3 Potential effects and risks requiring validation

Paper-based or fragmented handling can create risks such as repeated data entry, difficulty locating documents, limited application-status visibility, inconsistent hand-offs, and slower reporting. These are plausible risks to investigate, **not verified findings** from the interview or observation. The report should not state that these problems occurred, or assign quantities or costs, without supporting evidence.

### 3.4 Problem statement

The available stakeholder note describes poor service and an insufficient transition from paper-based management to newer technology in the award-administration context. The detailed transaction steps and the causes and scale of the service problem have not yet been observed or measured. A controlled digital workflow is proposed to improve the consistency, traceability, and visibility of applications, while the remaining claims require validation through further fieldwork.

## 4. System/software requirements analysis

### 4.1 Stakeholders and user roles

- **Teacher/applicant:** registers, signs in, prepares an application, uploads documents, checks application status, and may submit a dispute.
- **District official:** accesses applications within the assigned district, performs checklist-based vetting, reviews service-tenure evidence, and records an authorised decision.
- **Provincial official:** performs compliance review, supports award-cycle and requirement configuration, and accesses authorised reporting functions.
- **System administrator:** performs authorised system-level and reference-data functions. Account provisioning and operational responsibilities must follow Department policy.

### 4.2 Functional requirements

These preliminary requirements are based on the capabilities documented in the project README and should be confirmed against approved Department procedures [3].

| ID | Requirement |
|---|---|
| FR1 — User access | Provide teacher registration and sign-in; enforce role- and district-based access on protected functions. |
| FR2 — Application lifecycle | Allow a signed-in teacher to create a draft, provide application information, submit it, and view recorded progress. |
| FR3 — Document handling | Support required and optional supporting uploads, private storage, file validation, and authorised downloads. |
| FR4 — District review | Provide a district work queue, checklist-based vetting, and permitted approve, return, or disqualify actions with recorded history. |
| FR5 — Service-tenure review | Display teacher-reported and verified service information and let a reviewer record evidence notes against the configured minimum. |
| FR6 — Provincial review and reporting | Support compliance decisions and restrict exports to authorised, provincially approved records. |
| FR7 — Award-cycle administration | Allow authorised staff to create cycles, maintain dates and guidance links, and manage active-cycle state. |
| FR8 — Readiness guidance | Allow authorised staff to configure cycle/category eligibility reminders and document lists, and let teachers see a matching checklist. Missing configured documents warn but do not by themselves block submission. |
| FR9 — Traceability | Maintain status history and audit events for important workflow actions. |

Configured readiness items are guidance and do not replace policy approval or district verification. The existing application workflow’s baseline document requirement remains separate from the warn-only behavior for configured documents.

### 4.3 Non-functional requirements

- **Security and privacy:** protect sessions and role-restricted records; store application files privately; validate uploads; use HTTPS, strong secrets, least-privilege database access, and approved access/retention procedures before real deployment.
- **Integrity and auditability:** validate data on the server and preserve a record of key workflow decisions and status changes.
- **Usability and accessibility:** provide clear forms, understandable validation, responsive pages, and status messages that help users identify their next action.
- **Reliability and recovery:** define backups, restoration tests, monitoring, and an operational support process before production use.
- **Maintainability:** document configuration, database migrations, deployment steps, and verified award-cycle policy updates.
- **Performance and capacity:** establish expected volumes and response-time targets with the process owner; no measured baseline or target was supplied.

### 4.4 Scope and constraints

The current build documents a broad application workflow but is not production-certified. Project documentation identifies outstanding items including email verification, mandatory multi-factor authentication, malware scanning, comprehensive automated testing, penetration testing, formal policy/version workflows, and fuller reporting [3].

Real personal or confidential teacher information must not be used until formal security, policy, infrastructure, privacy, and acceptance reviews are completed. Award eligibility, cycle dates, required documents, and retention periods must come from the applicable official guidance. This report does not invent them [4].

## 5. Use-case diagram

The diagram summarises the intended system boundary and principal actor interactions. It reflects the development build’s documented capabilities; final permissions and business rules must be confirmed by the Department.

```text
             NORTHERN CAPE NTA DIGITAL MANAGEMENT SYSTEM
+----------------------------------------------------------------+
| Teacher     -- (Register / sign in)                            |
|             -- (Create and submit application)                  |
|             -- (Upload documents / view status)                 |
|             -- (Submit dispute)                                 |
|                                                                |
| District    -- (Review assigned-district applications)         |
| official    -- (Check documents and service tenure)             |
|             -- (Record vetting decision)                        |
|                                                                |
| Provincial  -- (Review compliance / authorised export)         |
| official    -- (Manage award cycles and guidance)               |
|             -- (Configure cycle/category readiness items)      |
|                                                                |
| System      -- (Manage authorised system/reference data)       |
| administrator                                                     |
| All roles   -- (View permitted notifications / history)        |
+----------------------------------------------------------------+
  Actor -- (Use case) indicates an interaction with the system.
```

### 5.1 Use-case notes

- Teachers can view application details and status only for their own records.
- District access is limited to applications in the official’s assigned district.
- Provincial exports are subject to the implemented authorisation rule.
- Cycle/category readiness configuration is available to authorised system administrators and provincial officials. It does not replace policy approval or district verification.

## 6. Solution analysis

### 6.1 Alternatives considered

**Option A — Continue paper-based handling.** This involves the least immediate change, but does not directly address the coordinator’s reported concern about remaining with paper. It also retains existing limitations, whatever their measured extent.

**Option B — Use shared spreadsheets and folders.** This could improve basic central visibility with modest technical change. Access control, document handling, concurrent edits, audit history, and end-to-end status tracking would still require careful, separate controls.

**Option C — Use a role-based web application with a structured database and private document storage.** This is the approach represented by the current project. It can provide workflow queues, validation, access controls, status history, and configurable cycle guidance in one application. It has higher implementation and support needs and requires security, privacy, policy, training, and operational-readiness work before live use.

### 6.2 Recommended approach

Continue developing and evaluating Option C as a controlled prototype. Validate the real workflow with the coordinator and representative staff and teachers; map each observed step to the application; then conduct policy, privacy, security, accessibility, user-acceptance, and recovery testing before any production decision. Keep unapproved policy requirements out of the system until authorised guidance is provided.

### 6.3 Feasibility and risks

- **Technical:** an Express/PostgreSQL/Prisma development implementation exists; production hosting, monitoring, backup, and recovery arrangements remain to be established.
- **Operational:** role-specific queues and online access may support the intended workflow, but staff capacity, training, connectivity, accessibility, and change management need assessment.
- **Economic:** no cost estimates, procurement information, or quantified savings were provided; a defensible cost-benefit conclusion cannot yet be made.
- **Legal and privacy:** teacher identity, employment, and supporting-document data are sensitive. Confirm lawful authority, consent, access, retention, correction, dispute, breach-response, and records-management requirements with the Department before real-data use.
- **Policy:** official award criteria and cycle dates change and must be verified by authorised staff against the current official guide.

## 7. Conclusion

Phase 1 identifies a stakeholder-reported concern about poor service and continued paper management in the Northern Cape Department of Education’s award-administration context. The supplied notes are limited: a coordinator’s role is known, but the date, specific examples, and daily transaction observations are not. Potential problems such as missing files, repeated entry, delays, or limited tracking remain hypotheses until confirmed.

A role-based digital management system is a plausible response because the current prototype supports teacher applications, private document handling, district vetting, service-tenure checks, provincial compliance, cycle management, readiness guidance, and audit history. It is not yet a production-approved system. The immediate next step is to complete and validate the fieldwork, then refine the requirements and test the proposed workflow with its users and authorised policy owners.

## References

1. School of Natural and Applied Science, Department of Computer Science and Information Technology. *PROJECT NPRJ740 — Advanced ICT Diploma, 2026: Phase 1 Cover Page: Contents and Layout*. Assessment template supplied by the student.
2. National Teaching Awards coordinator interview. Student summary supplied for this report on 6 November 2026; interview date, method, and transcript not provided.
3. *Northern Cape National Teaching Awards Digital Management System*, project `README.md` and `docs/REAL_DATA_POLICY.md`. Project implementation notes and stated development limitations, accessed 6 November 2026.
4. Department of Basic Education / National Teaching Awards official guidance. Not supplied for this draft. Consult and cite the current applicable guide before recording eligibility, document, cycle, or retention rules.

## Appendix A — Coordinator interview questionnaire

Record the interview date, method, participant role, and permission to use notes. Record answers accurately; include the participant’s name only with permission.

1. Please describe your role in coordinating the National Teaching Awards process.
2. What are the main steps from announcing a cycle to recording the final provincial outcome?
3. Which parts of the process are currently paper-based, and what tools, if any, are used alongside paper?
4. What specific service problems have applicants or staff experienced? Can you give recent examples without sharing personal data?
5. Where do delays, incomplete submissions, document-location problems, or repeated data entry occur, if at all?
6. How are applications received, logged, assigned, checked, returned, approved, and communicated today?
7. What information and reports do you need, who may access them, and when are they needed?
8. What would a successful digital process improve? How should improvement be measured?
9. What connectivity, training, accessibility, privacy, security, or policy constraints should the system address?
10. Which official guide and departmental procedures define current eligibility, documents, approvals, deadlines, and retention?
11. Who should verify the process map and requirements, and what should be the next validation step?

## Appendix B — Daily-transaction observation checklist

Complete this checklist through an authorised, non-intrusive observation. Do not record teachers’ identity numbers, SACE numbers, personal contact details, or copies of real documents in the academic report.

- Date, location, process stage, observer, and permission/ground rules.
- Trigger for the transaction and responsible role.
- Input received (form/document/data), channel, and completeness check.
- Record created or updated, where it is stored, and how it is located later.
- Hand-offs, queue/wait points, approvals, and decision authority.
- How missing information, corrections, duplicate submissions, or disputes are handled.
- How applicants receive acknowledgement, progress updates, and outcomes.
- Time taken at each step (measure; do not estimate after the fact).
- Observed difficulty and direct supporting evidence (separate fact from interpretation).
- Questions for the process owner and validation status.

## Appendix C — Fieldwork completion checklist

Complete these items before final submission and update the analysis using verified evidence:

- [ ] Add the interview date and method.
- [ ] Record the coordinator’s specific examples of poor service and affected process stages.
- [ ] Observe and document the actual daily transaction sequence, roles, hand-offs, and records.
- [ ] Support any stated delay, error, missing record, volume, cost, or service impact with evidence; do not invent figures.
- [ ] Confirm the responsible directorate/process owner and the official procedure.
- [ ] Cite the current official National Teaching Awards guide for policy rules.
- [ ] Validate the requirements and prototype usability with relevant teachers and staff.
- [ ] Confirm the submission date and review the report with the supervisor.

This draft uses only the project information and coordinator summary supplied to date. Replace provisional workflow statements with observed facts and complete the fieldwork checklist before submission.
