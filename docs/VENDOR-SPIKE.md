# Dynamics 365 Business Central Vendor & Toolchain Spike (docs/VENDOR-SPIKE.md)
*Mirrors Overlay (CognitronTechnologies / john-walter-munene) Vendor Spike Architecture*

## 1. Executive Summary
This document provides an engineering evaluation of the Microsoft Dynamics 365 Business Central API ecosystem, cloud automation capabilities, AL compiler toolchain, and automated browser test execution drivers. It establishes the technical criteria used by the autonomous agent to select execution pathways.

---

## 2. API Toolchain Evaluation

| Channel / Interface | Protocol | Latency | Authorization | Schema Extensibility | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Automation APIs** (`/api/microsoft/automation/v2.0`) | REST / JSON | ~250ms | Entra ID (OAuth2 Client Credentials) | High (supports extension upload, package install) | **PRIMARY (Deployment)** |
| **Standard OData v4 APIs** (`/ODataV4/Company('...')`) | OData v4 / JSON | ~120ms | Entra ID Bearer | Moderate (read/write table records) | **SECONDARY (Data Queries)** |
| **Custom API Pages** (`PageType = API`) | REST / JSON | ~95ms | Entra ID Bearer | Maximum (custom AL fields, filters, keys) | **PRIMARY (Client Bridge)** |
| **SOAP Web Services** | XML / SOAP | ~400ms | Basic / Legacy | Low (deprecated in BC Cloud) | **REJECTED** |

### Evaluation Verdict: Custom API Pages + Automation v2.0
- **Automation v2.0**: The agent uses Automation v2.0 to query sandboxes, upload `.app` extension files, and poll installation status asynchronously.
- **Custom API Pages**: The agent generates `PageType = API` with `APIPublisher = 'autonomousAgent'`, `APIGroup = 'integrations'`, and `APIVersion = 'v2.0'` so that Next.js client applications consume typed JSON without OData XML overhead.

---

## 3. AL Compilation & Verification Spike

| Toolchain / Runtime | Footprint | Startup Time | Compilation Speed | Autonomous Suitability |
| :--- | :--- | :--- | :--- | :--- |
| **AL Language VS Code CLI (`alc.exe`)** | ~85MB | <1 sec | 1.8 sec | **Selected for Cloud Agents (Linux/Wine or Native)** |
| **BcContainerHelper (Docker)** | ~18GB | 4-8 mins | 3.5 sec | Best for Heavy Local CI, Heavy for Microservices |
| **AL-Go GitHub Actions** | GitHub Hosted | ~2 mins | 2.1 sec | High for GitOps, Not Interactive Real-Time |
| **AST In-Memory Linter (`src/utils/alLinter.ts`)** | <1MB | <10ms | Instant | **Selected for Turn-by-Turn Pre-Flight Checks** |

### Decision:
1. **Pre-flight Phase**: Fast in-memory AST tokenization and syntax check validates keywords, ID bounds (`50100..50149`), bracket matching, and trigger placements in milliseconds.
2. **Package Sealing Phase**: Generates standard `app.json` manifest with GUID and computes deterministic SHA-256 fingerprint matching Overlay's cryptographic lock pattern.

---

## 4. Browser Automation Spike (Playwright vs Selenium vs Cypress)

| Dimension | Playwright | Cypress | Selenium |
| :--- | :--- | :--- | :--- |
| **Shadow DOM & iFrame Piercing** | Native automatic piercing | Plugin required | Difficult |
| **Modern Auth (Entra ID 2FA / Session)** | StorageState cookies / headless | Limited iframe auth | Flaky session restore |
| **Execution Speed** | Extremely fast (DevTools protocol) | Fast | Slow (WebDriver) |
| **Dynamic Wait & Network Idle** | Built-in auto-waiting | Custom wait assertions | Manual sleep / wait loops |
| **Verdict** | **SELECTED** | Rejected | Rejected |

### Decision:
Playwright is adopted as the browser driver. Microsoft Dynamics 365 Business Central web client is a complex Single Page Application built with Web Components and virtualized grids; Playwright's locator engine seamlessly targets `controlname` attributes and handles BC's async UI redraws.
