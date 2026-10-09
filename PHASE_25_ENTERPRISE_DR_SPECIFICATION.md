# ASHK GHALAM SMART PRINTING & PACKAGING INDUSTRIAL ERP
## PHASE 25: ENTERPRISE BACKUP & DISASTER RECOVERY (DR) STRUCTURAL SPECIFICATION
### Document Classification: High-Availability Production Architecture Reference (Financial Grade)

This document specifies the comprehensive database replication, multi-layer physical storage caching, asset version preservation, split-brain defensive engineering, and automatic failover pipeline designed to guarantee continuous uptime and zero-loss financial accounting across the **Ashk Ghalam Smart Printing & Packaging Industrial Complex ERP Platform**.

---

## SECTION 1: MASTER BACKUP SYSTEM ARCHITECTURE

Continuous database mutations, audit logging, and WAL sequence generation operate on a strict hot-standby, multi-replica streaming topology:

```
[ Active Application / API Servers ]
                 │
                 ├──► (WRITE Transactions Only)
                 ├──► (READ Reports & BI Analytics) ──────┐
                 │                                         │
                 ▼                                         ▼
       +───────────────────+                     +───────────────────+
       |   PRIMARY RDBMS   |                     |   READ REPLICAS   |
       |  (PostgreSQL HA)  |                     |  (PostgreSQL RR)  |
       +─────────┬─────────+                     +───────────────────+
                 │
                 │ (Hot Synchronous Streaming via WAL replication)
                 ▼
       +───────────────────+
       |    HOT STANDBY    |
       |  (PostgreSQL HS)  |
       +───────────────────+
                 │
                 │ (Asynchronous WAL Archiving via pg_backrest / Wal-g)
                 ▼
       +─────────────────────────────────────────────────────────────+
       |                  IMMUTABLE REPOSITORY VAULT                 |
       |     - Layer 1: WAL Continuous Backup (PITR Granular)        |
       |     - Layer 2: Encrypted Delta Backups (Every 15 mins)      |
       |     - Layer 3: S3/MinIO WORM (Immutable Daily snapshots)     |
       +─────────────────────────────────────────────────────────────+
```

### 1.1 Replication & PITR Mechanism Flow
1. **Transaction Committal:** Every double-entry accounting posting or SAYAD cheque updates the Primary PostgreSQL instance, generating append-only binary Write-Ahead Logs (WAL).
2. **Synchronous Streaming:** Primary immediately forces WAL transaction blocks down to the Hot Standby in real time. The primary transaction completes only when Standby acknowledges storage write.
3. **Continuous Archive Delivery:** Continuous archiving agents (`pg_backrest`) bundle and push completed 16MB WAL segment files to an on-premise, air-gapped S3 storage pool, maintaining granular 1-second interval **Point-in-Time Recovery (PITR)** vectors.

---

## SECTION 2: DISASTER RECOVERY ARCHITECTURE (DR SITE DESIGN)

The enterprise infrastructure is organized across geographically isolated datacenters, guarded by latency-sensitive automatic DNS redirection:

```
                     [ Client Desktop / Factory Terminals ]
                                       │
                                       ▼ (SSL / TLS 1.3 High-Precision Request)
                        +─────────────────────────────+
                        |  Anycast DNS Cloud Routed   |
                        +──────────────┬──────────────+
                                       │
                ┌──────────────────────┴──────────────────────┐
                │ (Active Primary DNS Route)                  │ (Automatic Failover Port)
                ▼                                             ▼
+───────────────────────────────+             +───────────────────────────────+
|      PRIMARY REGION (IRAN)    |             |      REDUNDANT DR REGION      |
|  - Active Front-end Gateway   |             |  - Secondary Gateway Node     |
|  - Primary PostgreSQL Master  |             |  - Cold Standby PG Container  |
|  - Live MinIO S3 File Store   |             |  - Replicated S3 Asset Pool   |
|  - Real-time Redis Caching    |             |  - Standby Redis Instance     |
+───────────────────────────────+             +───────────────────────────────+
                │                                             ▲
                └──────(Async Cross-Region DB Replication)────┘
```

### 2.1 Regional Replication Strategies
* **Database Mirroring:** Database logs propagate asynchronously from the Tehran primary datacenter to the remote disaster recovery cluster over secure dedicated point-to-point fiber channels.
* **Storage Syncing:** Object-storage structures (Dieline vector files, CAD sheets, PDF accounts) sync unidirectionally every 60 seconds of updates.

---

## SECTION 3: STEP-BY-STEP AUTOMATIC FAILOVER PROTOCOL

When the primary database container or networking grid experiences an outage, failover processes activate automatically using the following sequencing:

```
   [ PRIMARY DB CORE ]          [ WATCHDOG AGENT ]         [ STANDBY DB CORE ]         [ API GATEWAY ]
            │                           │                           │                         │
            ❌ (CRASH / OUTAGE)         │                           │                         │
            │                           │                           │                         │
            ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒► │                           │                         │
                                        │ (Heartbeat lost for 10s)  │                         │
                                        │                           │                         │
                                        ├──────────────────────────►│                         │
                                        │                           │ (Command: Promote HS)   │
                                        │                           │                         │
                                        │                           ├─[ INVARIANT CHECK ]─┐   │
                                        │                           │   (Debit == Credit) │   │
                                        │                           │◄────────────────────┘   │
                                        │                           │                         │
                                        │◄──────────────────────────┤                         │
                                        │ (standby active as MASTER)│                         │
                                        │                           │                         │
                                        ├────────────────────────────────────────────────────►│
                                        │                                                     │ (Redirect traffic)
                                        │                                                     ▼
                                                                                      [ SERVING LIVE TRAFFIC ]
```

### 3.1 Step Breakdown:
1. **Watchdog Heartbeat Monitoring:** Automated monitoring agents (`Patroni` cluster managers backed by consul key-value state engines) poll the primary database node every 2 seconds.
2. **Outage Threshold Violation:** If heartbeats fail continuously for more than 10 seconds, the monitoring layer classifies the primary cluster as offline.
3. **Master Fencing & Isolation:** To prevent network partitions or corrupt writing states ("split-brain scenario"), the controller fires a virtualization command isolating the primary container from any persistent volume writing access.
4. **Standby Elevation & Invariant Check:** The designated Hot Standby node is promoted to Read-Write Master status. Upon elevation, it initiates internal safety checks to verify financial balance integrity.
5. **Gateway Routing Update:** The internal API load balancer updates database router parameters to direct backend requests (`/api/*`) exclusively to the newly promoted master instance. Users experience no session interruption.

---

## SECTION 4: ENTERPRISE-GRADE BACKUP STRATEGY SUMMARY

| Backup Category | Objective Target (RPO) | Recover Time Index (RTO) | Schedule Frequency | Target Destination Pool | Encryption Scheme | Retention Cycle |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Layer 1: Real-time WAL Sync** | $\le 1$ Second | $\le 1$ Minute | Continuous streaming | Standby Core Memory & Disk | AES-256 Engine | 30 Days |
| **Layer 2: Incremental Snapshots** | $\le 15$ Minutes | $\le 5$ Minutes | Every 15 minutes | On-premises MinIO Hub | AES-256 Vector | 90 Days |
| **Layer 3: Immutable Full Snap** | $\le 24$ Hours | $\le 30$ Minutes | Daily at 01:00 AM | S3 Glacier Immutable Vault | SHA-256 Sign + AES | 7 Years (Legal Standard) |
| **DMS Media Archival (CAD/AI)** | $\le 60$ Seconds | $\le 10$ Minutes | Real-time object versioning | Immutable S3 Storage Bucket | SHA-256 Checksum | Infinite Version History |

---

## SECTION 5: DATA CONSISTENCY BOUNDARY MATRIX

To maintain high throughput on production machinery without risking transactional accounting safety, the platform enforces strict consistency domains:

```
[ Consistency Management Engine ]
       │
       ├──► [ Accounting & Treasury Ledger ] ──► STRONG Consistency (SQL Foreign Keys + Single Ledger Locks)
       │
       ├──► [ Materials Stockrooms ]        ──► HYBRID Consistency (Optimistic concurrency + nightly checkups)
       │
       └──► [ MES Factory Work Orders ]     ──► EVENTUAL Consistency (Sequence ID replication clocks)
```

| Domain Subsystem | Target Consistency Rule | Primary Enforcement Code Mechanism | Conflict Reconciliation Policy |
| :--- | :--- | :--- | :--- |
| **Accounting** | **Strong Consistency** | Immediate relational ledger validation; double-entry balances must debit/credit atomically. | Double postings are instantly rejected; manual journal reconciliation is required if a transaction breaks. |
| **Treasury (SAYAD)** | **Strong Consistency** | Immutable transaction histories; serial key identifiers prevent duplicate records. | Verification checks against central bank services on every change. |
| **Inventory** | **Hybrid / Snapshot** | Material quantities are kept as dynamic ledger lines, verifying quantities on save. | Apply logical variances ($+$ or $-$ stock movements) during sync instead of absolute master overrides. |
| **MES / Production Logs**| **Eventual Consistency** | Continuous replication stream tracking machine runs and output speeds. | Log sequence IDs are kept in linear timestamps; lagging metrics are back-filled incrementally. |

---

## SECTION 6: BACKUP SECURITY AND ANTI-RANSOMWARE RESILIENCY

To safekeep system registries against threat attacks, unauthorized tampering, or malicious breaches, the platform enforces strict security defenses:

```
+─────────────────────────────────────────────────────────────────────────────+
|                          BACKUP SECURITY LAYER                              |
+─────────────────────────────────────────────────────────────────────────────+
|                                                                             |
|  - AES-256 At-rest & TLS 1.3 In-Transit: End-to-end encryption.             |
|                                                                             |
|  - Immutable WORM Storage: Write-Once-Read-Many locks prevent tampering.   |
|                                                                             |
|  - Air-Gapped Offsite Duplication: Isolated network vaults.                 |
|                                                                             |
|  - Key Rotation Protocols: Automated HSM key renewals every 90 days.        |
+─────────────────────────────────────────────────────────────────────────────+
```

1. **Write-Once-Read-Many (WORM) Compliance:** Vault directories prevent deletion or modification. Once signed daily snapshot images generate, they cannot be modified, encrypted, or edited by other containers. This provides 100% security against ransomware encryption strikes.
2. **Air-Gapped Offline Replication:** System controllers replicate encrypted snapshot archives on an independent on-premise vault network that disallows general admin access.

---

## SECTION 7: MONITORING & OBSERVABILITY SCHEMATIC

```
[ Production DB Mutators ] ──► [ Prometheus Agent ] ──► [ Alertmanager ] ──► [ Operational Slack / SMS Alerts ]
                                       │
                                       ▼
                             [ Grafana Dashboard ]
                                       │
                        ├──► (Metric: Replication Lag in bytes)
                        ├──► (Metric: IOPS storage capacity write limits)
                        └──► (Metric: Heartbeats ping status checkup)
```

Administrators track replication metrics via standard dashboards:
* **Replication Lag Analyzer:** Triggers critical high-priority alerts to the pager systems if database data transfer lag exceeds 50MB.
* **Storage Threshold Warning:** Warns system engineers if database volume capacity reaches 85% utilization metrics.

---

## SECTION 8: DEVOPS OPERATIONAL RUNBOOK (DR COMMANDS)

### 8.1 Initiating Manual Emergency Promotion of Hot Standby
```bash
# Step 1: Force isolation of client endpoints on the failed primary master db
pg_ctl -D /var/lib/postgresql/data stop -m immediate

# Step 2: Elevate the stand-by instance into prime read-write execution state
pg_ctl -D /var/lib/postgresql/data promote

# Step 3: Fast check active replication balance state across double-accounting records
psql -U admin -d ashk_ghalam_erp -c "
  SELECT SUM(debit) AS total_debits, SUM(credit) AS total_credits 
  FROM journal_entries;
"
```

### 8.2 Conducting Granular Point-in-Time Recovery (PITR) Restoration
```bash
# Step 1: Halt active PostgreSQL database service processes
sudo systemctl stop postgresql

# Step 2: Extract base system database structures from designated secure media
pgbackrest --stanza=ashk_ghalam_erp --set=20260531-150212F restore

# Step 3: Configure recovery time boundaries (Restoring to state just prior to user error)
cat <<EOF > /var/lib/postgresql/data/recovery.signal
restore_command = 'pgbackrest --stanza=ashk_ghalam_erp archive-get %f "%p"'
recovery_target_time = '2026-05-31 17:15:00 UTC'
recovery_target_action = 'promote'
EOF

# Step 4: Resume database services to verify complete restore execution
sudo systemctl start postgresql
```

These operational procedures protect our core assets, ensuring business continuity for client workflows.
