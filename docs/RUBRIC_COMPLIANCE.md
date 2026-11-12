# DBMS Experiential Learning — Level 3 Rubric Compliance Checklist

**Course:** DBMS Experiential Learning (UE22CS341AA2 / 5th Semester)  
**Section:** 5-F  
**Team Members:**  
- **Aariz D** (PES1UG24AM330)  
- **Shridhar G** (PES1UG25AM814)  
**Project Title:** Food Redistribution and Expiration Tracking System  
**Evaluation Level:** Level 3 (Emerging Database Paradigms + Advanced Relational DBMS)  

---

## 1. Executive Compliance Scorecard

| Rubric Evaluation Dimension | Level 3 Syllabus Expectation | Implementation in this Project | Compliance Status |
|:---|:---|:---|:---:|
| **1. Relational Schema & Normalization** | Minimum 6–10 normalized tables in 3NF with ER Diagram. | 12 fully normalized tables in 3NF/BCNF; formal ER diagram with cardinality annotations. | **100% EXCEEDED** |
| **2. Database-Level Data Integrity** | Application of PK, FK, NOT NULL, UNIQUE, and CHECK constraints. | Hardened CHECK constraints on stock ($\ge 0$), date invariants ($\ge \text{today}$), ratings (1–5), and unique keys on emails, registration numbers, and license plates. | **100% SATISFIED** |
| **3. Advanced Database Features** | Stored procedures and triggers implementing core business logic. | Stored procedure with pessimistic row locking (`SELECT ... FOR UPDATE`), 3 automated audit/integrity triggers, 4 analytical SQL views. | **100% EXCEEDED** |
| **4. Emerging Paradigm (Vector DB)** | Integration of Vector DB / NoSQL for advanced semantic capability. | Native PostgreSQL 16 + `pgvector` with 384-dimensional dense embeddings, HNSW index, and hybrid relational-vector queries. | **100% EXCEEDED** |
| **5. Concurrency & ACID Integrity** | Demonstration of transaction management under concurrent access. | Automated multi-worker race-condition stress-testing suite (`scripts/concurrency_test.mjs`) + interactive in-app testing tab. | **100% SATISFIED** |
| **6. User Authentication & RBAC** | Non-plaintext password storage and role-based permissions. | Bcrypt hashing (10 salt rounds) stored in `USERS` table with NextAuth.js JWT session role enforcement (DONOR, FOOD_BANK, ADMIN). | **100% SATISFIED** |
| **7. Cross-Platform Dev Environment** | Frictionless reproducibility on Windows, macOS, and Linux. | Docker Compose container (`pgvector/pgvector:pg16`), `.gitattributes` line-ending normalization, single-command setup. | **100% SATISFIED** |

---

## 2. Detailed Dimension-by-Dimension Verification

### Dimension 1: Schema Design, Relational Algebra & ER Modeling
- **Deliverables**:
  - `database/init.sql`: Clean, idempotent DDL script.
  - `docs/ER_DIAGRAM_AND_SCHEMA.md`: Mermaid graphical ER diagram + relational formalism.
  - `docs/DATA_DICTIONARY.md`: Complete column specifications, types, defaults, and constraints.
- **Evidence**:
  - 12 distinct tables covering actors (`USERS`, `FOOD_DONATORS`, `FOOD_BANKS`), assets (`FOOD`, `FOOD_BATCHES`, `TRANSPORT`), logistics (`CLAIMS`, `DELIVERIES`, `ROUTINES`), and compliance (`WASTE_AUDIT_RECORDS`, `FEEDBACK`, `LOGS`).
  - Elimination of partial and transitive functional dependencies, ensuring strict 3NF/BCNF compliance.

---

### Dimension 2: Database-Level Constraints & Defensive Hardening
The Level 3 rubric states: *"Input validation must be implemented at the database level."*
- **Database CHECK Constraints**:
  - `chk_batch_qty`: Prevents insertion of zero or negative donation lots (`quantity > 0`).
  - `chk_available_qty`: Invariant ensuring `available_quantity >= 0 AND available_quantity <= quantity`.
  - `chk_dates`: Ensures batches cannot be donated after their expiration date (`expiry_date >= donation_date`).
  - `chk_rating`: Limits feedback ratings strictly to the range `1 <= rating <= 5`.
  - `chk_waste_qty`: Guarantees waste audit entries record positive quantities (`quantity_wasted > 0`).
- **Referential Integrity Actions**:
  - `ON DELETE CASCADE` for tightly bound dependent entities (`CLAIMS`, `WASTE_AUDIT_RECORDS`, `FEEDBACK`).
  - `ON DELETE SET NULL` for delivery vehicle reassignments (`DELIVERIES.transport_id`).
  - `ON DELETE RESTRICT` for master food commodities (`FOOD`).

---

### Dimension 3: Advanced Database Features (PL/pgSQL, Triggers & Views)
- **Stored Procedure 1: `fn_claim_food_batch()`**
  - **Pessimistic Row-Locking**: Uses `SELECT ... FOR UPDATE` to lock the target food batch tuple exclusively.
  - **Atomicity**: Validates expiration, checks stock availability, decrements inventory, flips batch status (`PARTIALLY_CLAIMED` / `FULLY_CLAIMED`), and inserts claim record in a single atomic transaction.
- **Stored Procedure 2: `fn_process_expired_batches()`**
  - Sweeps all batches where `expiry_date < CURRENT_DATE` and `available_quantity > 0`.
  - Atomically diverts unrescued food into `WASTE_AUDIT_RECORDS`, marks batch as `EXPIRED`, sets available quantity to `0`, and writes an event to `LOGS`.
- **Triggers**:
  - `trg_log_batch_status_change`: Automates recording of inventory and status changes into `LOGS`.
  - `trg_log_claim_status_change`: Audits claim progression.
  - `trg_prevent_negative_inventory`: Intercepts and raises an exception if any query attempts to set `available_quantity < 0`.
- **Analytical Views**:
  - `view_available_batches`: Active batches ready for claiming ordered by shelf-life priority.
  - `view_expiring_soon_batches`: Distress batches expiring in $\le 48$ hours.
  - `view_donor_efficiency`: Computes total food rescued vs. wasted per donor using nested subqueries.
  - `view_food_bank_utilization`: Dynamic capacity calculations and inbound delivery queues.

---

### Dimension 4: Vector Similarity Search & Emerging Paradigm
- **Vector Extension**: Native `pgvector` inside PostgreSQL 16.
- **Dimensionality**: 384 dimensions matching `all-MiniLM-L6-v2`.
- **HNSW Indexing**:
  ```sql
  CREATE INDEX idx_food_batches_embedding 
  ON FOOD_BATCHES 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
  ```
- **Hybrid Query Execution**:
  Combines cosine distance calculation (`<=>`) with relational status and shelf-life filters in one atomic query.
- **Demonstration UI**:
  Side-by-side search comparison in `/smart-match` proving the superiority of semantic vector search over SQL `ILIKE` for natural language distress requests.

---

### Dimension 5: Concurrency Control & Race Condition Simulation
- **Automated CLI Suite (`scripts/concurrency_test.mjs`)**:
  - **Scenario 1**: 5 concurrent workers simultaneously attempting to claim 1 unit each from a batch of only 3 items. Exactly 3 claims succeed, 2 are cleanly rejected, and final stock is strictly 0 (never negative).
  - **Scenario 2**: High-contention burst with 10 workers requesting 35 units total against 12 available units. Mathematical conservation of inventory is verified ($\text{Granted} + \text{Remaining} = \text{Initial}$).
  - **Scenario 3**: Direct bypass test verifying that `BEFORE UPDATE` trigger and `CHECK` constraint block illegal negative values.
  - **Scenario 4**: Verification of audit trail fidelity in the `LOGS` table.
- **In-App Explorer**:
  An interactive "ACID Stress Test" tab in `/explorer` allowing evaluators to run the live concurrency test directly inside their web browser with real-time latency and status telemetry.

---

### Dimension 6: Authentication, Security & RBAC
- **Unified Security Model**: Single `USERS` table storing email, bcrypt hash, and role.
- **Role-Based Access Control**:
  - `DONOR`: Can create batches, monitor shelf-life countdowns, and review claim statuses.
  - `FOOD_BANK`: Can browse available inventory, run semantic distress matching, and claim batches.
  - `ADMIN`: Full access to transport routines, fleet vehicles, automated expiry sweepers, and system audit logs.

---

### Dimension 7: Cross-Platform Reproducibility & Code Standards
- **Docker Compose**: One-command initialization (`npm run db:up` or `docker compose up -d`) spinning up PostgreSQL 16 with pgvector and auto-running `database/init.sql`.
- **Git Invariant Protection**: `.gitattributes` enforces `* text=auto eol=lf`, preventing line-ending compilation bugs across Windows and macOS.
- **Type Safety**: 100% strict TypeScript compilation with zero errors (`npx tsc --noEmit` verified).

