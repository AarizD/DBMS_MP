# Team Contribution & Work Distribution Log

**Course:** DBMS Experiential Learning — Level 3 Project (Section 5-F)  
**Project Title:** Food Redistribution and Expiration Tracking System  
**Repository:** `food-redistribution-system`  

---

## 1. Team Profile & Work Distribution Summary

| Team Member | PRN / Roll No. | Core Functional Ownership | Approximate Effort Share |
|:---|:---|:---|:---:|
| **Aariz D** | `PES1UG24AM330` | Database Hardening, pgvector Integration, Docker Orchestration, Pessimistic Locking & ACID Stress-Testing, NextAuth RBAC Security | **50%** |
| **Shridhar G** | `PES1UG25AM814` | Relational DDL Porting, Local Embedding Pipeline (@xenova/transformers), Next.js Dashboard UI Views, SQL Analytical Views & Audit Triggers, Seed Dataset Generation | **50%** |

---

## 2. Detailed Milestone-by-Milestone Contribution Breakdown

### Milestone 0: Cross-Platform Scaffolding & Containerized Infrastructure
- **Aariz D (PES1UG24AM330)**:
  - Designed the multi-platform `docker-compose.yml` leveraging `pgvector/pgvector:pg16` on port 5432 with persistent volumes and automated SQL mount scripts.
  - Configured `.gitattributes` (`* text=auto eol=lf`) and `.gitignore` to prevent Windows CRLF line-ending corruption and cross-platform git merge conflicts.
  - Configured environment variables templates (`.env.example`, `.env.local`) for seamless macOS, Linux, and Windows WSL2 environments.
- **Shridhar G (PES1UG25AM814)**:
  - Initialized Next.js 14 App Router project with TypeScript, Tailwind CSS, Lucide icons, and PostCSS.
  - Set up PostgreSQL client connection pool singleton (`src/lib/db.ts`) with connection timeouts, health checks, and query duration logging.
  - Authored initial project setup instructions in `README.md`.

---

### Milestone 1: Relational Schema Modernization & DDL Hardening
- **Aariz D (PES1UG24AM330)**:
  - Modernized the 11 legacy MySQL tables from Lab 4 into hardened PostgreSQL 16 DDL (`database/init.sql`).
  - Added the unified `USERS` table for Role-Based Access Control (`role IN ('ADMIN', 'DONOR', 'FOOD_BANK', 'DRIVER')`).
  - Implemented database-level `CHECK` constraints on inventory quantities, storage conditions, and ratings to enforce data integrity directly in the storage engine.
  - Enabled the `vector` extension and built the native HNSW index (`idx_food_batches_embedding`) on `FOOD_BATCHES(embedding)`.
- **Shridhar G (PES1UG25AM814)**:
  - Designed the comprehensive seed script (`scripts/seed.mjs`) and portable SQL dump (`database/seed.sql`).
  - Created realistic Indian food commodities (Sona Masoori Rice, Moong Dal, Chapatis, Nandini Milk, etc.) with valid perishability rules and shelf-life metrics.
  - Generated realistic geographic entities across Bengaluru (Indiranagar, Koramangala, Whitefield, PES University Ring Road campus) for donors, food banks, and vehicle routes.
  - Encrypted seed account credentials using bcrypt (10 rounds).

---

### Milestone 2: Advanced Database Features (Stored Procedures, Triggers & Views)
- **Aariz D (PES1UG24AM330)**:
  - Engineered the atomic stored procedure `fn_claim_food_batch()` in PL/pgSQL using pessimistic row-level locking (`SELECT ... FOR UPDATE`) to prevent overselling and race conditions.
  - Engineered the automated inventory sweeper procedure `fn_process_expired_batches()` that transfers expired batches into `WASTE_AUDIT_RECORDS` and logs audit events atomically.
  - Authored the verification script `scripts/apply_m2.mjs` validating stored procedure behavior and over-claim rejection logic.
- **Shridhar G (PES1UG25AM814)**:
  - Implemented the database audit triggers:
    - `trg_log_batch_status_change`: Automates insertion of old vs. new stock and status changes into `LOGS`.
    - `trg_log_claim_status_change`: Logs claim transitions (`PENDING` $\to$ `APPROVED` $\to$ `IN_TRANSIT` $\to$ `DELIVERED`).
    - `trg_prevent_negative_inventory`: Intercepts and aborts any direct `UPDATE` attempting to write negative available quantities.
  - Designed complex analytical SQL views:
    - `view_available_batches`: Unexpired batches ready for claiming.
    - `view_expiring_soon_batches`: Distress batches expiring in $\le 48$ hours with urgency tagging.
    - `view_donor_efficiency`: Rescued vs. wasted ratios per donor using nested subqueries.
    - `view_food_bank_utilization`: Storage capacity tracking and inbound delivery queuing.

---

### Milestone 3: Next.js Full-Stack Application & Role-Based Access Control
- **Aariz D (PES1UG24AM330)**:
  - Configured NextAuth.js credentials provider (`src/lib/auth.ts`) with JWT session handling and role propagation.
  - Implemented protected API route handlers with role authorization guards:
    - `/api/donor/batches`: Secure batch creation and listing for donors.
    - `/api/food-bank/claim`: Concurrency-safe claim submission executing `fn_claim_food_batch`.
    - `/api/admin/sweep-expiry`: Manual and automated trigger runner for expired stock disposal.
- **Shridhar G (PES1UG25AM814)**:
  - Developed user-facing dashboard interfaces:
    - **Donor Dashboard** (`/donor`): Expiration countdown timers, batch status indicators, and new lot creation modal.
    - **Food Bank Dashboard** (`/food-bank`): Inventory catalogue browsing, distance filter, and 1-click batch claiming modal.
    - **Admin Dashboard** (`/admin`): Fleet management, transport routine assignments, and live trigger audit log monitor.
  - Built unified navigation bar (`src/components/Navbar.tsx`) with dynamic role badges and session controls.

---

### Milestone 4: Semantic Vector Search Engine & Smart Matching UI
- **Aariz D (PES1UG24AM330)**:
  - Integrated `@xenova/transformers` with `Xenova/all-MiniLM-L6-v2` inside Node.js for client-server local embedding generation (zero external API keys or cloud dependencies).
  - Authored the hybrid vector + relational SQL query in `/api/search`:
    - Computes cosine distance (`fb.embedding <=> $1::vector`) while simultaneously applying relational WHERE filters (`status IN ('AVAILABLE', 'PARTIALLY_CLAIMED') AND available_quantity > 0 AND expiry_date >= CURRENT_DATE`).
  - Calibrated similarity score mathematical conversion (`1.0 - distance`).
- **Shridhar G (PES1UG25AM814)**:
  - Built the interactive **Smart Matching UI** (`/smart-match`):
    - Preset distress scenario chips for rapid examiner evaluation.
    - Real-time side-by-side search comparison: **Standard SQL Keyword Search vs. AI Semantic Vector Search**.
    - High-visibility similarity score badges, nutrition tags, and direct claiming workflow.

---

### Milestone 5: Concurrency Stress-Testing, Documentation & Rubric Compliance
- **Aariz D (PES1UG24AM330)**:
  - Developed the automated CLI stress-test script (`scripts/concurrency_test.mjs` and `npm run test:concurrency`):
    - Simulates 5 parallel workers contending for 3 items simultaneously via `Promise.all()`.
    - Simulates 10-worker burst with 35 attempted claims against 12 available items.
    - Tests direct database-level constraint violations and verifies audit log fidelity.
  - Built the Interactive Database Explorer (`/explorer`) with the live in-browser **ACID Concurrency Stress Test** tab for one-click evaluation during viva.
  - Authored `docs/VECTOR_SEARCH_JUSTIFICATION.md` and `docs/ER_DIAGRAM_AND_SCHEMA.md`.
- **Shridhar G (PES1UG25AM814)**:
  - Compiled the complete Data Dictionary (`docs/DATA_DICTIONARY.md`) documenting all 12 tables, data types, constraints, and HNSW vector parameters.
  - Formulated the Rubric Compliance Matrix (`docs/RUBRIC_COMPLIANCE.md`) mapping project deliverables to syllabus criteria.
  - Maintained repository audit registry (`FILES_LOG.txt`) and final presentation documentation.

---

## 3. Git Commit Convention & Verification

All commits adhere to conventional commit standards with balanced attribution:
- `feat(m0): ...` — Cross-platform scaffolding & containerized db
- `feat(m1): ...` — PostgreSQL DDL hardening, USERS table & vector column
- `feat(m2): ...` — Stored procedures (pessimistic lock), triggers & analytical views
- `feat(m3): ...` — Next.js RBAC dashboards & API route handlers
- `feat(m4): ...` — Semantic search engine & Smart Matching UI
- `feat(m5): ...` — Concurrency stress test, database explorer & documentation

