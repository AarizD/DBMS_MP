# Comprehensive Database Data Dictionary

**Course:** DBMS Experiential Learning — Level 3 Project (Section 5-F)  
**Team Members:**  
- **Aariz D** (PES1UG24AM330)  
- **Shridhar G** (PES1UG25AM814)  
**Database Engine:** PostgreSQL 16 with `pgvector`  
**Database Name:** `food_redistribution`  

---

## 1. Table Registry & Row Cardinality

| Table Name | Entity Classification | Primary Key | Total Attributes | Purpose |
|:---|:---|:---|:---:|:---|
| **USERS** | Security & Auth | `user_id` | 6 | Authentication credentials and Role-Based Access Control (RBAC). |
| **FOOD_DONATORS** | Strong Entity | `donator_id` | 8 | Profiles of registered food donors (restaurants, supermarkets, bakeries). |
| **FOOD** | Strong Catalog Entity | `food_id` | 7 | Master directory of standardized food items, units, and storage tiers. |
| **FOOD_BANKS** | Strong Entity | `food_bank_id` | 10 | Non-profit food shelters, rescue banks, and redistribution hubs. |
| **TRANSPORT** | Strong Entity | `transport_id` | 8 | Fleet of logistics vehicles (trucks, vans, refrigerated vans). |
| **FOOD_BATCHES** | Hybrid Transactional & Vector | `batch_id` | 11 | Donated inventory batches with physical counts, expiry, and 384-d embeddings. |
| **CLAIMS** | Associative Transactional | `claim_id` | 8 | Redistribution claims placed by food banks on specific food batches. |
| **DELIVERIES** | Logistics Entity | `delivery_id` | 7 | Real-time dispatch, transit, and delivery fulfillment tracking. |
| **ROUTINES** | Operational Entity | `routine_id` | 7 | Scheduled recurring routes assigned to transport vehicles. |
| **WASTE_AUDIT_RECORDS**| Compliance & ESG Entity | `waste_id` | 8 | Quantitative audit of spoiled/expired food diverted to composting/waste. |
| **FEEDBACK** | Quality Assurance Entity | `feedback_id` | 5 | Post-delivery ratings (1–5) and remarks submitted by food banks. |
| **LOGS** | System Audit Trail | `log_id` | 8 | Automated trigger-generated audit ledger for state transitions. |

---

## 2. Detailed Attribute Data Dictionary

### 2.1 Table: `USERS`
Stores application user accounts, role memberships, and links to institutional profiles.

| Column Name | Data Type | Nullable | Default | Constraints | Description |
|:---|:---|:---:|:---:|:---|:---|
| `user_id` | `SERIAL` | **NO** | Auto-increment | `PRIMARY KEY` | Unique surrogate identifier for user. |
| `email` | `VARCHAR(100)` | **NO** | None | `UNIQUE` | User login email address. |
| `password_hash` | `VARCHAR(255)` | **NO** | None | None | Bcrypt hashed password (10 salt rounds). |
| `role` | `VARCHAR(20)` | **NO** | None | `CHECK (role IN ('ADMIN', 'DONOR', 'FOOD_BANK', 'DRIVER'))` | Role-Based Access Control classification. |
| `reference_id` | `INT` | YES | `NULL` | None | Polymorphic pointer to `donator_id`, `food_bank_id`, or `transport_id`. |
| `created_at` | `TIMESTAMP` | YES | `CURRENT_TIMESTAMP` | None | System timestamp of account creation. |

---

### 2.2 Table: `FOOD_DONATORS`
Stores physical and legal details of donating organizations.

| Column Name | Data Type | Nullable | Default | Constraints | Description |
|:---|:---|:---:|:---:|:---|:---|
| `donator_id` | `SERIAL` | **NO** | Auto-increment | `PRIMARY KEY` | Unique surrogate key for donor. |
| `name` | `VARCHAR(100)` | **NO** | None | None | Legal organization or contact person name. |
| `organization_name`| `VARCHAR(100)` | YES | `NULL` | None | Commercial trading name (e.g., 'FreshBake Supermarket'). |
| `email` | `VARCHAR(100)` | **NO** | None | `UNIQUE` | Official corporate email address. |
| `phone` | `VARCHAR(20)` | **NO** | None | None | Contact telephone number. |
| `address` | `TEXT` | **NO** | None | None | Street and facility dispatch address. |
| `city` | `VARCHAR(50)` | **NO** | None | None | Metropolitan city (e.g., 'Bengaluru'). |
| `donator_type` | `VARCHAR(30)` | **NO** | None | `CHECK (donator_type IN ('RESTAURANT', 'SUPERMARKET', 'BAKERY', 'HOTEL', 'EVENT_ORGANIZER', 'INDIVIDUAL', 'OTHER'))` | Institutional classification of donor. |
| `created_at` | `TIMESTAMP` | YES | `CURRENT_TIMESTAMP` | None | Registration timestamp. |

---

### 2.3 Table: `FOOD`
Master item catalog defining food commodities, measurement units, and preservation criteria.

| Column Name | Data Type | Nullable | Default | Constraints | Description |
|:---|:---|:---:|:---:|:---|:---|
| `food_id` | `SERIAL` | **NO** | Auto-increment | `PRIMARY KEY` | Unique catalog identifier. |
| `food_name` | `VARCHAR(100)` | **NO** | None | None | Common item name (e.g., 'Sona Masoori Rice'). |
| `category` | `VARCHAR(50)` | **NO** | None | None | High-level food group (e.g., 'Grains', 'Produce', 'Dairy'). |
| `unit` | `VARCHAR(20)` | **NO** | None | None | Standard unit of metric measure (`KG`, `LITERS`, `PACKETS`, `MEALS`). |
| `storage_requirement`| `VARCHAR(50)` | **NO** | `'AMBIENT'` | None | Preservation tier (`AMBIENT`, `CHILLED`, `FROZEN`, `HEATED`). |
| `is_perishable` | `BOOLEAN` | **NO** | `FALSE` | None | Flag indicating susceptibility to rapid spoilage. |
| `created_at` | `TIMESTAMP` | YES | `CURRENT_TIMESTAMP` | None | Catalog entry creation timestamp. |

---

### 2.4 Table: `FOOD_BANKS`
Recipient organizations operating community pantries and food shelters.

| Column Name | Data Type | Nullable | Default | Constraints | Description |
|:---|:---|:---:|:---:|:---|:---|
| `food_bank_id` | `SERIAL` | **NO** | Auto-increment | `PRIMARY KEY` | Unique surrogate key. |
| `name` | `VARCHAR(100)` | **NO** | None | None | Operating title of NGO or pantry. |
| `email` | `VARCHAR(100)` | **NO** | None | `UNIQUE` | Official agency email. |
| `phone` | `VARCHAR(20)` | **NO** | None | None | Primary emergency contact number. |
| `address` | `TEXT` | **NO** | None | None | Physical drop-off location and warehouse. |
| `city` | `VARCHAR(50)` | **NO** | None | None | Operational city municipality. |
| `registration_no` | `VARCHAR(50)` | **NO** | None | `UNIQUE` | Government registration or non-profit certification number. |
| `storage_capacity_kg`| `INT` | **NO** | `1000` | `CHECK (storage_capacity_kg > 0)` | Maximum cold/dry warehouse capacity in kilograms. |
| `status` | `VARCHAR(20)` | **NO** | `'ACTIVE'` | `CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED'))` | Verification status of recipient center. |
| `created_at` | `TIMESTAMP` | YES | `CURRENT_TIMESTAMP` | None | Onboarding date and time. |

---

### 2.5 Table: `TRANSPORT`
Logistics and vehicular fleet assigned to transfer food claims.

| Column Name | Data Type | Nullable | Default | Constraints | Description |
|:---|:---|:---:|:---:|:---|:---|
| `transport_id` | `SERIAL` | **NO** | Auto-increment | `PRIMARY KEY` | Fleet vehicle identifier. |
| `vehicle_number` | `VARCHAR(20)` | **NO** | None | `UNIQUE` | Official motor vehicle license plate number. |
| `vehicle_type` | `VARCHAR(30)` | **NO** | None | None | Category (`REFRIGERATED_VAN`, `ELECTRIC_MINI_TRUCK`, `VAN`, `BIKE`). |
| `capacity_kg` | `INT` | **NO** | `500` | `CHECK (capacity_kg > 0)` | Maximum payload capacity in kilograms. |
| `driver_name` | `VARCHAR(100)` | **NO** | None | None | Primary assigned transport driver. |
| `driver_phone` | `VARCHAR(20)` | **NO** | None | None | Driver mobile contact number. |
| `status` | `VARCHAR(20)` | **NO** | `'AVAILABLE'`| `CHECK (status IN ('AVAILABLE', 'IN_TRANSIT', 'MAINTENANCE', 'OFF_DUTY'))` | Real-time operational dispatch state. |
| `created_at` | `TIMESTAMP` | YES | `CURRENT_TIMESTAMP` | None | Fleet registry timestamp. |

---

### 2.6 Table: `FOOD_BATCHES` (Hybrid Relational & Vector)
Central table holding donated lots, inventory counts, expiry boundaries, and dense vector embeddings.

| Column Name | Data Type | Nullable | Default | Constraints | Description |
|:---|:---|:---:|:---:|:---|:---|
| `batch_id` | `SERIAL` | **NO** | Auto-increment | `PRIMARY KEY` | Unique batch lot number. |
| `food_id` | `INT` | **NO** | None | `FOREIGN KEY REFERENCES FOOD(food_id)` | Catalog commodity link. |
| `donator_id` | `INT` | **NO** | None | `FOREIGN KEY REFERENCES FOOD_DONATORS(donator_id) ON DELETE CASCADE` | Source donor entity. |
| `quantity` | `INT` | **NO** | None | `CHECK (quantity > 0)` | Total initial quantity donated in item units. |
| `available_quantity`| `INT` | **NO** | None | `CHECK (available_quantity >= 0 AND available_quantity <= quantity)` | Current unreserved quantity ready for claiming. |
| `donation_date` | `DATE` | **NO** | `CURRENT_DATE` | None | Calendar date food was registered. |
| `expiry_date` | `DATE` | **NO** | None | `CHECK (expiry_date >= donation_date)` | Strict deadline date after which consumption is unsafe. |
| `storage_condition`| `VARCHAR(50)` | **NO** | `'AMBIENT'` | None | Specific environment required during warehouse staging. |
| `status` | `VARCHAR(20)` | **NO** | `'AVAILABLE'`| `CHECK (status IN ('AVAILABLE', 'PARTIALLY_CLAIMED', 'FULLY_CLAIMED', 'EXPIRED'))` | Lifecycle stage of batch. |
| `embedding` | `vector(384)` | YES | `NULL` | `HNSW Index (vector_cosine_ops)` | **384-dimensional dense semantic embedding vector** generated from item title, category, and remarks. |
| `created_at` | `TIMESTAMP` | YES | `CURRENT_TIMESTAMP` | None | Audit creation timestamp. |

---

### 2.7 Table: `CLAIMS`
Represents an atomic reservation of stock from a food batch by a verified food bank.

| Column Name | Data Type | Nullable | Default | Constraints | Description |
|:---|:---|:---:|:---:|:---|:---|
| `claim_id` | `SERIAL` | **NO** | Auto-increment | `PRIMARY KEY` | Unique requisition order number. |
| `batch_id` | `INT` | **NO** | None | `FOREIGN KEY REFERENCES FOOD_BATCHES(batch_id) ON DELETE CASCADE` | Target food batch reserved. |
| `food_bank_id` | `INT` | **NO** | None | `FOREIGN KEY REFERENCES FOOD_BANKS(food_bank_id) ON DELETE CASCADE` | Claiming agency. |
| `claim_date` | `DATE` | **NO** | `CURRENT_DATE` | None | Date claim reservation was recorded. |
| `quantity_claimed` | `INT` | **NO** | None | `CHECK (quantity_claimed > 0)` | Number of units allocated to this claim. |
| `status` | `VARCHAR(20)` | **NO** | `'PENDING'` | `CHECK (status IN ('PENDING', 'APPROVED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'))` | Fulfillment status. |
| `pickup_required` | `BOOLEAN` | **NO** | `FALSE` | None | If TRUE, food bank provides own pickup; if FALSE, platform transport handles delivery. |
| `created_at` | `TIMESTAMP` | YES | `CURRENT_TIMESTAMP` | None | Creation timestamp. |

---

### 2.8 Table: `DELIVERIES`
Logistics fulfillment tracking for active claims.

| Column Name | Data Type | Nullable | Default | Constraints | Description |
|:---|:---|:---:|:---:|:---|:---|
| `delivery_id` | `SERIAL` | **NO** | Auto-increment | `PRIMARY KEY` | Delivery manifest number. |
| `claim_id` | `INT` | **NO** | None | `UNIQUE`, `FOREIGN KEY REFERENCES CLAIMS(claim_id) ON DELETE CASCADE` | Associated claim (1:1 relationship). |
| `transport_id` | `INT` | YES | `NULL` | `FOREIGN KEY REFERENCES TRANSPORT(transport_id) ON DELETE SET NULL` | Assigned transport unit. |
| `dispatched_at` | `TIMESTAMP` | YES | `NULL` | None | Timestamp vehicle departed donor pickup point. |
| `delivered_at` | `TIMESTAMP` | YES | `NULL` | None | Timestamp delivery was confirmed received by food bank. |
| `status` | `VARCHAR(20)` | **NO** | `'SCHEDULED'`| `CHECK (status IN ('SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'FAILED'))` | Delivery progress. |
| `created_at` | `TIMESTAMP` | YES | `CURRENT_TIMESTAMP` | None | Dispatch record generation time. |

---

### 2.9 Table: `ROUTINES`
Defines operational route templates for fleet optimization.

| Column Name | Data Type | Nullable | Default | Constraints | Description |
|:---|:---|:---:|:---:|:---|:---|
| `routine_id` | `SERIAL` | **NO** | Auto-increment | `PRIMARY KEY` | Route template code. |
| `transport_id` | `INT` | **NO** | None | `FOREIGN KEY REFERENCES TRANSPORT(transport_id) ON DELETE CASCADE` | Assigned logistics carrier. |
| `start_location` | `VARCHAR(100)` | **NO** | None | None | Origin hub or neighborhood. |
| `end_location` | `VARCHAR(100)` | **NO** | None | None | Destination sector. |
| `scheduled_day` | `VARCHAR(20)` | **NO** | None | None | Day of weekly schedule (`MONDAY`, `DAILY`, etc.). |
| `estimated_duration_mins` | `INT` | **NO** | None | `CHECK (estimated_duration_mins > 0)` | Expected traversal duration in minutes. |
| `created_at` | `TIMESTAMP` | YES | `CURRENT_TIMESTAMP` | None | Entry creation timestamp. |

---

### 2.10 Table: `WASTE_AUDIT_RECORDS`
Tracks unavoidable spoilage, expired batches, and eco-disposal compliance.

| Column Name | Data Type | Nullable | Default | Constraints | Description |
|:---|:---|:---:|:---:|:---|:---|
| `waste_id` | `SERIAL` | **NO** | Auto-increment | `PRIMARY KEY` | Environmental waste record ID. |
| `batch_id` | `INT` | **NO** | None | `FOREIGN KEY REFERENCES FOOD_BATCHES(batch_id) ON DELETE CASCADE` | Source expired lot. |
| `quantity_wasted` | `INT` | **NO** | None | `CHECK (quantity_wasted > 0)` | Number of units lost to spoilage/expiry. |
| `waste_date` | `DATE` | **NO** | `CURRENT_DATE` | None | Date loss was certified. |
| `reason` | `VARCHAR(100)` | **NO** | None | None | Cause of expiration or contamination. |
| `disposal_method` | `VARCHAR(50)` | **NO** | None | `CHECK (disposal_method IN ('COMPOST', 'ANIMAL_FEED', 'BIOGAS', 'LANDFILL', 'INCINERATION'))` | Ecological diversion method. |
| `remarks` | `TEXT` | YES | `NULL` | None | Auditor commentary. |
| `recorded_at` | `TIMESTAMP` | YES | `CURRENT_TIMESTAMP` | None | Audit transaction timestamp. |

---

### 2.11 Table: `FEEDBACK`
Quality assurance reviews submitted by receiving food pantries.

| Column Name | Data Type | Nullable | Default | Constraints | Description |
|:---|:---|:---:|:---:|:---|:---|
| `feedback_id` | `SERIAL` | **NO** | Auto-increment | `PRIMARY KEY` | Feedback identifier. |
| `claim_id` | `INT` | **NO** | None | `FOREIGN KEY REFERENCES CLAIMS(claim_id) ON DELETE CASCADE` | Requisition evaluated. |
| `rating` | `INT` | **NO** | None | `CHECK (rating BETWEEN 1 AND 5)` | Likert rating score (1 = Poor, 5 = Excellent). |
| `comments` | `TEXT` | YES | `NULL` | None | Qualitative remarks on freshness and packaging. |
| `feedback_date` | `DATE` | **NO** | `CURRENT_DATE` | None | Date feedback was lodged. |

---

### 2.12 Table: `LOGS`
Immutable audit log automatically generated by database triggers.

| Column Name | Data Type | Nullable | Default | Constraints | Description |
|:---|:---|:---:|:---:|:---|:---|
| `log_id` | `SERIAL` | **NO** | Auto-increment | `PRIMARY KEY` | Monotonically increasing audit counter. |
| `action` | `VARCHAR(50)` | **NO** | None | None | Machine action code (`BATCH_UPDATE`, `CLAIM_STATUS_UPDATE`, `AUTO_WASTE_AUDIT`). |
| `description` | `TEXT` | **NO** | None | None | Human-readable explanation of transition. |
| `entity_type` | `VARCHAR(50)` | **NO** | None | None | Table name affected (e.g., `'FOOD_BATCHES'`, `'CLAIMS'`). |
| `entity_reference` | `INT` | YES | `NULL` | None | Primary key ID of the entity modified. |
| `old_status` | `VARCHAR(50)` | YES | `NULL` | None | Previous state string before update. |
| `new_status` | `VARCHAR(50)` | YES | `NULL` | None | New state string after update. |
| `timestamp` | `TIMESTAMP` | YES | `CURRENT_TIMESTAMP` | None | High-precision server event timestamp. |

---

## 3. Vector Column & Index Technical Specifications

### 3.1 The `embedding` Column
- **Data Type**: `vector(384)` (pgvector native type).
- **Dimension Count**: 384 dimensions.
- **Embedding Source**: Generated via `@xenova/transformers` running the `Xenova/all-MiniLM-L6-v2` ONNX sentence transformer model locally in Node.js.
- **Normalized Vector Space**: Embeddings have unit norm ($\|v\|_2 = 1.0$), allowing cosine distance to be calculated efficiently via dot products.

### 3.2 The HNSW Vector Index (`idx_food_batches_embedding`)
```sql
CREATE INDEX idx_food_batches_embedding 
ON FOOD_BATCHES 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```
- **Index Type**: **HNSW (Hierarchical Navigable Small World)** graph index.
- **Distance Operator**: `<=>` (Cosine Distance, where $\text{Cosine Distance} = 1 - \cos(\theta)$).
- **Parameter `m = 16`**: Maximum number of bidirectional links connected to each node in the graph. Provides the optimal balance between index size and query recall.
- **Parameter `ef_construction = 64`**: Size of dynamic candidate list examined when constructing the graph. Guarantees high-precision nearest-neighbor recall ($\ge 98\%$) during real-time queries.

