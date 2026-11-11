# NAMING.md: Branding, Terminology & Domain Dictionary
## Architectural Taxonomy Adapted from Overlay

> **Reference Structure**: Adapted from [`john-walter-munene/overlay/docs/NAMING.md`](https://github.com/john-walter-munene/overlay)  
> **Brand Identity**: ALchemy 365 (Dynamics 365 Business Central Autonomous Agent)

---

### 1. Brand Identity & Product Names

| Identifier | Context | Definition |
| :--- | :--- | :--- |
| **ALchemy 365** | Primary Brand | The autonomous engineering agent and developer workbench for Microsoft Dynamics 365 Business Central. |
| **ALchemy Core** | Subsystem | The central TypeScript orchestration engine coordinating documentation RAG, AL code synthesis, and browser testing. |
| **ALchemy Bridge** | Subsystem | The Next.js 14/15 App Router & React SDK layer consuming Business Central OData V4 API Pages. |
| **ALchemy Verifier** | Subsystem | The automated settlement and cryptographic build certification engine (Overlay pattern). |

---

### 2. Domain Terminology Dictionary

#### Microsoft Dynamics 365 Business Central Concepts
- **AL (Application Language)**: Microsoft's domain-specific programming language for Business Central extensions.
- **TableExtension**: AL object that extends an existing Microsoft base table (e.g. Customer 18) with custom fields and triggers without modifying base source.
- **PageExtension**: AL object that adds custom FastTab groups, controls, or action buttons to an existing page.
- **API Page (`PageType = API`)**: Specialized AL page exposed via REST / OData V4 with universal GUID key fields (`ODataKeyFields = SystemId;`).
- **Tell Me (`Alt+Q`)**: The universal search launcher in the Business Central Web Client.
- **In-Client Designer (`/design`)**: Business Central's interactive WYSIWYG personalization and field-placement environment.
- **Page Inspector (`Ctrl+Alt+F1`)**: Diagnostic drawer showing table IDs, extension names, and underlying database field values.

#### Overlay-Inspired Agent Architecture Concepts
- **Verifiable Build Record**: An immutable manifest sealed with a deterministic SHA-256 fingerprint proving the exact code, tests, and requirements that produced the build.
- **Automated Settlement**: The deterministic verification process that validates every user story in a Functional Requirement Document against Playwright assertions and compiler outputs.
- **Episodic Rule Memory**: The persistent knowledge bank where lessons learned from compiler diagnostics and Playwright failures are saved as condition-remedy pairs.
- **Autonomous Reflexion**: The 3-step feedback loop (Criticism → Doc Retrieval → Remediation) executed when an agent encounters an error.
