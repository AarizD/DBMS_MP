<<<<<<< HEAD
# Food Redistribution and Expiration Tracking System

> **DBMS Experiential Learning — Level 3 Project**  
> **Section**: 5-F  
> **Team Members**:  
> - **Aariz D** (`PES1UG24AM330`)  
> - **Shridhar G** (`PES1UG25AM814`)  

---

## 📌 Project Overview
A multi-paradigm database system designed to minimize food waste by connecting food donors (supermarkets, bakeries, restaurants) with food banks and shelters. The platform automates expiry tracking, manages delivery routines, enforces atomic concurrency control during batch claiming, and leverages AI vector embeddings for semantic distress request matching.

### Core Database Architecture:
* **Relational Core**: PostgreSQL 16 (11 Normalized Tables + RBAC Users Table)
* **Vector Database**: `pgvector` extension for 384-dimensional dense semantic vector search
* **Application Framework**: Next.js 14 (App Router) + TypeScript + Tailwind CSS

---

## 🚀 Quick Start (Cross-Platform)

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (macOS / Windows / Linux)

### 1. Clone & Set Environment Variables
```bash
git clone <repository-url>
cd mini_project_local

# Copy environment variables
cp .env.example .env.local
```

### 2. Start PostgreSQL + pgvector Database
```bash
# Start container in detached mode
docker compose up -d

# Check database container status & logs
docker compose logs -f db
```
The database will automatically initialize all 12 tables, constraints, vector indexes, and triggers from `database/init.sql`.

### 3. Install Dependencies & Run Next.js App
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Database Management Shortcuts

| Command | Action |
| :--- | :--- |
| `npm run db:up` | Spin up PostgreSQL + pgvector Docker container |
| `npm run db:down` | Stop and tear down the database container |
| `npm run db:logs` | View real-time PostgreSQL database logs |
| `npm run db:seed` | Seed database with realistic Indian food catalog, batches, and embeddings |
| `npm run db:m2` | Apply & verify Milestone 2 stored procedures, triggers, and views |
| `npm run test:concurrency` | **Run Milestone 5 ACID race-condition & pessimistic locking stress test** |
| `docker exec -it food_redistribution_db psql -U postgres -d food_redistribution` | Open interactive PostgreSQL CLI prompt inside Docker |

---

## 🧪 Milestone 5: Concurrency Stress-Testing & Verification

To verify transaction isolation, pessimistic row-locking (`SELECT ... FOR UPDATE`), and prevent negative inventory under heavy concurrency:

```bash
# Execute the automated multi-worker stress test suite
npm run test:concurrency
```

### What the Concurrency Test Proves:
1. **Scenario 1 (The 5-to-3 Contention)**: 5 parallel workers simultaneously attempt to claim 1 unit each from a batch with only 3 units. Exactly 3 succeed, 2 are cleanly rejected, and stock strictly reaches 0 without negative overselling.
2. **Scenario 2 (High Contention Burst)**: 10 workers requesting 35 units total against 12 available units. Stock conservation is mathematically guaranteed ($\text{Granted} + \text{Remaining} = \text{Initial}$).
3. **Scenario 3 (Database-Level Invariant Enforcement)**: Bypassing application code to force `available_quantity = -5` is intercepted and aborted by PostgreSQL `BEFORE UPDATE` trigger and `CHECK` constraints.
4. **Scenario 4 (Audit Trail Fidelity)**: Verifies that every batch transition is recorded in the `LOGS` table with timestamps and actor telemetry.

> **In-App Evaluation Tool**: You can also run this test interactively with 1 click inside the web browser by logging in and navigating to the **[Interactive Database Explorer](/explorer)** $\to$ **ACID Stress Test** tab.

---

## 📚 Level 3 Documentation Suite

| Document | Location | Contents |
| :--- | :--- | :--- |
| **Relational Schema & ER Diagram** | [`docs/ER_DIAGRAM_AND_SCHEMA.md`](docs/ER_DIAGRAM_AND_SCHEMA.md) | Mermaid ER diagram, cardinalities, relational algebra, and 3NF/BCNF normalization proof. |
| **Data Dictionary** | [`docs/DATA_DICTIONARY.md`](docs/DATA_DICTIONARY.md) | Complete specifications for all 12 tables, attributes, constraints, defaults, and HNSW vector index. |
| **Vector Search Justification** | [`docs/VECTOR_SEARCH_JUSTIFICATION.md`](docs/VECTOR_SEARCH_JUSTIFICATION.md) | Mathematical formulation of Cosine Distance (`<=>`), HNSW graph indexing, and why pgvector was selected over MySQL + ChromaDB. |
| **Team Contribution Log** | [`docs/CONTRIBUTION_LOG.md`](docs/CONTRIBUTION_LOG.md) | 50/50 work distribution log for Aariz D (`PES1UG24AM330`) and Shridhar G (`PES1UG25AM814`). |
| **Rubric Compliance Matrix** | [`docs/RUBRIC_COMPLIANCE.md`](docs/RUBRIC_COMPLIANCE.md) | Comprehensive checklist mapping project features to the Level 3 evaluation criteria. |

---

## ⚙️ Native Mac Alternative (Without Docker)
If you prefer running PostgreSQL natively on macOS via Homebrew:
```bash
# Install postgresql 16 and pgvector
brew install postgresql@16 pgvector

# Start service
brew services start postgresql@16

# Create database and apply schema
createdb food_redistribution
psql -d food_redistribution -f database/init.sql
```
Update `DATABASE_URL` in `.env.local` with your local PostgreSQL credentials.

---

## 👥 Role-Based Access Control (RBAC)
* **DONOR**: Supermarkets, bakeries, and restaurants posting food batches and monitoring avoided waste.
* **FOOD_BANK**: Shelters and charities searching available food, performing semantic queries, and claiming batches.
* **ADMIN**: University evaluators / system administrators managing users, routine logistics, and audit trails.
* **DRIVER**: Logistics personnel handling transport vehicle assignments and delivery updates.
=======
# DBMS_MP
>>>>>>> 9223fc5dfbe4510d09b0ad96f3d2aa8096763d86
