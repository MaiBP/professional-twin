---
name: advance
description: Moves an existing project to its next step or phase (discovery, definition, plan, build, delivery, closure). Use when the user approves something, answers questions or says "let's continue", "let's move on", "approved".
argument-hint: "[project name] [comments or approval]"
---

# Move a project forward

Write in the language set in `settings.json` (`language`, default English), or in the language the person writes in. When editing a project file, keep its labels, headings and phase names in the language the file already uses: English files use "Current phase", "Last updated", "Next decision I need from you" and the phases Capture, Discovery, Definition, Plan, Build, Delivery & adoption, Closure; Spanish files keep "Fase actual", "Última actualización", "Próxima decisión que necesito de ti" and Captura, Descubrimiento, Definición, Plan, Construcción, Entrega y adopción, Cierre.

## 1. Locate the project
- If `$ARGUMENTS` names a project, use it. If not, take the most recently modified `status.md` in `projects/` and confirm in one line which one it is.
- Read `status.md`, `decisions.md` and the document for the current phase.
- Read the shared material in `material/` (and `material/links.md`) that you haven't read yet. If there is a `.zip`, extract it into `material/<name>/` without running anything that comes inside it. Summarize in one line what it contributed.

## 2. Incorporate what the person said
- Answers → `01-discovery.md` (mark ✅).
- Approvals → date and "Approved" ("Aprobado" in Spanish files) in the phase document; mark the phase in `status.md` with its closing date: `- [x] 2. Definition · YYYY-MM-DD` (`- [x] 2. Definición · YYYY-MM-DD` in Spanish files).
- Changes of direction → `decisions.md`.
- Lasting preferences → `profile/criteria.md`.

## 3. Run the corresponding phase

**Phase 1 → 2. Definition** (`02-definition.md`)
Write the problem, goals with metrics, users, scope (included / not included), prioritized requirements (MoSCoW) and business rules or definitions. Mark assumptions with 🟡. Present a summary and ask for approval.

**Phase 2 → 3. Plan** (`03-plan.md`)
Recommend a viable solution using the company's real tools, compare 1-2 alternatives, split it into phases with deliverables and effort, list risks and define the adoption plan. Ask for approval.

**Phase 3 → 4. Build** (`product/`)
- Build in small iterations and show each one before continuing.
- Choose the format according to the plan and the person's criteria: document, Excel spreadsheet, HTML dashboard, presentation, code, guide. Use the available skills (xlsx, docx, pptx, pdf, dataviz, artifacts).
- If real data is missing, create realistic sample data and mark it as such.
- Ask for concrete feedback: "Are the definitions right? Is any view missing?".

**Phase 4 → 5. Delivery & adoption** (`04-delivery.md`)
Validation checklist against the requirements, short user guide, message or presentation for stakeholders, training plan.

**Phase 5 → 6. Closure** (`05-closure.md`)
Results against goals (ask for the real numbers), lessons learned and 1-3 bullets for the CV. Log them in `journal/achievements.md` and `journal/skills.md`. Check whether it closed any gap in `profile/goals.md` and update it.

## Project map (`map.md`)
It is the project's main view in the app. Keep it alive:
- **Summary card:** update it when the problem, the solution, the tools or the impact change.
- **How it works:** an interactive diagram anyone can understand in 10 seconds, written as a ```map block with valid JSON (the app draws it with icons, colors by type and animated arrows). The JSON keys and the `type` values are fixed and stay exactly as shown, in English, whatever the file language (they are parsed by the app); the texts (`title`, `detail`, `description`, `label`) go in the file's language:
  ```map
  {
    "direction": "LR",
    "groups": [{ "id": "ours", "title": "Our side" }, { "id": "vendor", "title": "External agency" }],
    "nodes": [
      { "id": "db1", "type": "data", "title": "Customer database", "detail": "Contract data", "group": "ours", "description": "Longer text shown on click (optional)" },
      { "id": "script", "type": "process", "title": "Python script", "detail": "Merges and validates", "group": "ours" },
      { "id": "agency", "type": "external", "title": "Collections agency", "group": "vendor" }
    ],
    "flows": [{ "from": "db1", "to": "script" }, { "from": "script", "to": "agency", "label": "Daily CSV · SFTP" }]
  }
  ```
  - **Types** (each with its own icon and color): `person`, `area` (team or department), `system`, `app`, `data` (database or data source), `file`, `process` (script, automation, manual step), `ai`, `external` (company or third party), `email`, `dashboard` (panel or report), `cloud`, `decision`.
  - `direction`: `LR` (left to right, the usual one) or `TB` (top to bottom, for long processes). Between 4 and 12 nodes; titles of 1-4 words and `detail` of 2-6 words, in business language. `groups` are optional and serve to separate "our side" from third parties or areas. A flow's `label` says what travels or how often.
  - Phases 0-2: the current situation (how it is done today; mark manual steps with `"detail": "Manual"`). Phase 3: the proposed solution (you can add a second ```map "Before" block under a `### Before` heading — `### Antes` in Spanish files). Phases 4-6: the actual architecture built.
  - Older maps (Mermaid diagrams, or the legacy Spanish ```mapa block with `nodos`/`flujos`) are still displayed, but when you update the map, convert them to this format.
- **Pieces:** a table with each component (script, template, dashboard, document), what it does and where it is.
- Decisions go in `decisions.md` with a date (`YYYY-MM-DD`): the app shows them in the project's timeline together with the closed phases and the achievements whose project field (**Project** / **Proyecto**) contains `projects/<id>`.

## 4. Always, at the end of each step
1. Update `status.md` (phase, pending items, assumptions, next decision).
2. If a phase was closed or a deliverable finished, log the achievement (`📌 Logged in achievements: ...`).
3. If it adds value, add a **Mentor:** block.
4. End with **one single clear question or decision** for the person.
