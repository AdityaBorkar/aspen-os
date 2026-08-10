# HR Module — Phase 3: Talent Management & Operations

> Scope of Work derived from [Frappe HR](https://docs.frappe.io/hr/introduction) — the open-source HRMS reference implementation.

## Overview

Phase 3 completes the HRMS by adding the talent management and operational capabilities: performance appraisals with goal tracking, end-to-end recruitment pipeline, training program management, and fleet/vehicle management. These modules depend on the employee master and organizational structure from Phase 1, and leverage salary data from Phase 2 for compensation-linked performance outcomes.

---

## 1. Performance Management

### 1.1 Goal

- Employees and managers create and track goals.
- **Fields**: goal name, description, parent goal (hierarchy), employee, start/end date, progress (%), status (Pending, In Progress, Completed, Archived).
- Goals can be aligned to **KRAs** (Key Result Areas) defined in Appraisal Templates.
- Progress updates cascade: parent goal completion auto-calculated from child goals.
- Goals are linked to Appraisal Cycles for evaluation.

### 1.2 Appraisal Template

- Defines the evaluation framework:
  - **KRA list** with weightages (e.g., Development 30%, Communication 20%, Delivery 50%).
  - **Feedback Criteria** for self-appraisal and peer feedback (with weightages).
  - **Evaluation method**: Automated (based on goal progress) or Manual Rating.
- Reusable across employees and cycles.

### 1.3 Appraisal Cycle

- Defines the time period for performance evaluation (e.g., H1 2026, Annual 2026).
- **Employees child table**: list of participating employees with their assigned Appraisal Template.
- **KRA Evaluation Method**: Automated Based on Goal Progress OR Manual Rating.
- **Bulk create Appraisals**: generates individual Appraisal records for all employees in the cycle.

### 1.4 Appraisal

- Individual employee performance evaluation record.
- **KRA Evaluation**:
  - **Automated**: KRA vs. Goals table auto-populated. Goal Completion (%) computed from linked goal progress. Goal Score (weighted) calculated from completion × KRA weightage. Total Goal Score (out of 5).
  - **Manual**: manager rates each KRA 0-5. Score Earned = rating × weightage. Total Score (out of 5).
- **Feedback tab**: history of all Employee Performance Feedback received in the cycle — reviewer name, designation, rating, feedback text, timestamp. Permission-sensitive visibility.
- **Self Appraisal tab**: employee self-rates against feedback criteria with reflections. Total Self Score computed.
- **Final Score**: average of Goal Score, Avg Feedback Score, and Self Appraisal Score.
- **View Goals button**: navigate to employee's goals for the cycle.
- **Workflow support**: configurable approval chain before submission.

### 1.5 Employee Performance Feedback

- Standalone feedback record submitted by peers, managers, or cross-functional reviewers.
- Fields: employee, reviewer, rating (1-5 stars), feedback text, linked Appraisal Cycle.
- Feedback aggregates visible in the Appraisal document.

### 1.6 Appraisal Overview Report

- Dashboard report showing appraisal scores across the organization.
- Filterable by cycle, department, branch, designation.
- Useful for HR and leadership to identify high performers and underperformers.

---

## 2. Recruitment

### 2.1 Staffing Plan

- Strategic manpower planning at the group/company level.
- Defines: department, designation, number of vacancies, estimated cost per hire, planned budget.
- Subsidiary companies create Job Openings validated against the Staffing Plan.
- Prevents over-hiring: new Job Openings are checked against available positions.

### 2.2 Job Requisition

- Formal request from a department head to fill a position.
- Fields: designation, department, number of positions, job description, urgency, expected salary range, justification.
- Approval workflow before a Job Opening is created.

### 2.3 Job Opening

- Published vacancy linked to a Staffing Plan or Job Requisition.
- Fields: job title, designation, department, location, employment type, salary range, description, requirements, application deadline.
- Status: Open, Closed, Cancelled.
- Can be published to the **Job Portal** for external applicants.

### 2.4 Job Portal

- Public-facing careers page where Job Openings are listed.
- Applicants can browse openings and submit applications directly.
- Configurable branding and description.

### 2.5 Job Applicant

- Record of a candidate who has applied for a Job Opening.
- Captures: name, email, phone, resume/CV, cover letter, source (portal, referral, agency).
- Status tracking: Open, Replied, Shortlisted, Interviewed, Offered, Rejected, Hold.
- Linked to Job Opening.

### 2.6 Interview Management

#### 2.6.1 Interview Type

- Define types of interviews: Technical, HR, Cultural Fit, Case Study, etc.

#### 2.6.2 Interview Round

- Define sequential rounds in the hiring process (e.g., Round 1: Phone Screen, Round 2: Technical, Round 3: HR).
- Each round has a type, interviewer(s), and evaluation criteria.

#### 2.6.3 Interview

- Scheduled interview session for a Job Applicant.
- Fields: applicant, job opening, interview round, scheduled date/time, interviewers, designation.
- Status: Pending, Completed, Canceled.
- Calendar view for interviewer scheduling.
- Conflict detection: warns if interviewer has overlapping interviews.

#### 2.6.4 Interview Feedback

- Interviewer submits feedback after an interview.
- Fields: interview, interviewer, rating (1-5), strengths, weaknesses, comments, recommendation (Strong Hire / Hire / No Hire / Strong No Hire).
- Aggregated feedback visible on the Interview record.

### 2.7 Job Offer

- Formal offer extended to a candidate.
- Fields: applicant, job opening, designation, offered salary (with component breakdown), offer date, expected joining date, status (Awaiting Response, Accepted, Rejected, Withdrawn).
- On acceptance, can trigger Employee Onboarding (from Phase 1).

### 2.8 Appointment Letter

- Formal document generated from an accepted Job Offer.
- Configurable template with merge fields (employee name, designation, salary, joining date, etc.).
- Printable/downloadable PDF.

### 2.9 Employee Referral

- Employees can refer candidates for Job Openings.
- Tracks: referrer, applicant, job opening, referral bonus (if applicable).
- Status tracking aligned with the applicant pipeline.

---

## 3. Training

### 3.1 Training Program

- Defines a training curriculum or course.
- Fields: program name, description, training type (online, in-person, hybrid), provider, duration, cost.
- Status: Active, Inactive, Completed.

### 3.2 Training Event

- Scheduled instance of a Training Program (seminar, workshop, conference).
- Fields: event name, event type, event level (Beginner, Intermediate, Expert), trainer details (name, email, phone), course, start/end time, location.
- **Has Certificate** flag for certified courses.
- **Employee invitation table**: select employees to invite; default status "Open".
- On submission, email notification sent to invited employees via "Training Scheduled" Email Alert.

### 3.3 Training Result

- Records the outcome of an employee's participation in a Training Event.
- Fields: employee, training event, grade/score, attendance status, hours completed, certificate issued.
- Useful for compliance tracking and skill development records.

### 3.4 Training Feedback

- Employees provide feedback on completed Training Events.
- Fields: employee, training event, rating (1-5), comments, suggestions.
- Aggregated for training quality assessment.

---

## 4. Fleet Management

### 4.1 Vehicle

- Vehicle master record for company-owned or managed vehicles.
- **Fields**:
  - License Plate, Make (Brand), Model, Odometer Value (Last).
  - Fuel Type, Fuel UOM.
  - Chassis No., Acquisition Date, Vehicle Value, Location.
  - **Employee** managing the vehicle.
  - Insurance details (insurer, policy number, expiry).
- **Vehicle Attributes**: Color, Wheels, Doors, Last Carbon Check.

### 4.2 Vehicle Log

- Log of trips and usage for each vehicle.
- **Fields**: vehicle, employee (driver), date, odometer start/end, distance traveled, fuel consumed, fuel cost, purpose of trip.
- Used for expense tracking and maintenance scheduling.

### 4.3 Vehicle Expense Claims

- Vehicle-related expenses (fuel, maintenance, tolls, parking) are submitted as Expense Claims (from Phase 2) with the vehicle reference.
- Expense reports can be filtered by vehicle for fleet cost analysis.

### 4.4 Fleet Reports

- Vehicle expense summary per vehicle.
- Fuel consumption trends.
- Maintenance schedule tracking.
- Cost-per-kilometer analysis.

---

## Data Model Summary (Phase 3 Doctypes)

| Module | Key Doctypes |
|---|---|
| Performance | Goal, Appraisal Template, Appraisal Cycle, Appraisal, Employee Performance Feedback |
| Recruitment | Staffing Plan, Job Requisition, Job Opening, Job Portal, Job Applicant, Interview Type, Interview Round, Interview, Interview Feedback, Job Offer, Appointment Letter, Employee Referral |
| Training | Training Program, Training Event, Training Result, Training Feedback |
| Fleet | Vehicle, Vehicle Log |

---

## Dependencies on Phase 1 & 2

| Prior Phase Output | Phase 3 Usage |
|---|---|
| Employee Master | Referenced by goals, appraisals, training records, vehicle assignments. |
| Department / Designation / Branch | Used in staffing plan, job opening, appraisal filters. |
| Employee Onboarding | Triggered on Job Offer acceptance. |
| Employee Skill Map | Informs training needs analysis. |
| Salary Structure / Salary Slip | CTC data used in Job Offer salary configuration. |
| Expense Claim | Used for vehicle expense and training cost claims. |

## Cross-Module Integrations

| Integration | Flow |
|---|---|
| Recruitment → Lifecycle | Accepted Job Offer triggers Employee Onboarding workflow. |
| Performance → Salary | Appraisal outcomes can inform salary revisions and promotions. |
| Training → Skill Map | Training Results update employee skill proficiency. |
| Fleet → Expense | Vehicle logs generate Expense Claims for reimbursement. |
| Goals → Appraisal | Goal completion percentage feeds automated KRA evaluation. |

---

## Implementation Notes

### Phase Sequencing

Phase 3 modules can be developed independently of each other but share common dependencies:

- **Performance** and **Recruitment** are fully independent and can be parallelized.
- **Training** is lightweight and can be delivered at any point.
- **Fleet Management** is the most isolated module with minimal cross-dependencies.

### Estimated Effort (Relative)

| Module | Complexity | Notes |
|---|---|---|
| Performance | High | Goal hierarchy, automated scoring, feedback aggregation, cycle management. |
| Recruitment | High | Multi-stage pipeline, portal, interview scheduling, offer management. |
| Training | Low | Straightforward CRUD with event invitations and feedback. |
| Fleet | Low | Vehicle master + log + expense integration. |

### Testing Focus Areas

- **Performance**: goal progress cascade calculation, automated vs. manual scoring, final score averaging, feedback visibility permissions.
- **Recruitment**: staffing plan validation, interview conflict detection, offer-to-onboarding handoff.
- **Training**: email notification delivery, certificate flag handling.
- **Fleet**: odometer validation (end > start), expense claim linkage.
