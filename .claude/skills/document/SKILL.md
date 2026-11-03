---
name: document
description: Registers as a project a piece of work the person has already done (retrospective), with its map, decisions and achievements, to build a portfolio and context. Use when the person wants to document, register as a project or "upload" something they already finished or that already exists.
argument-hint: "[description of the work already done]"
---

# Document a project that is already done

Goal: turn past work into a complete, visual project (portfolio), without repeating the phase method as if it were starting from scratch.

Write in the language set in `settings.json` (`language`, default English), or in the language the person writes in. Labels and phase names follow the language of the project files: English files use "Current phase", "Next decision I need from you" and the phases Capture … Closure; Spanish files keep "Fase actual", "Próxima decisión que necesito de ti" and Captura … Cierre.

## 1. Context
- Read `profile/profile.md`, `profile/goals.md`, `context/company.md` and `journal/achievements.md`. If there is already an achievement about this work, use it as the basis and don't duplicate it.
- Check `projects/` in case it already exists. If so, complete it instead of opening another one.

## 2. Open the project
- **If `$ARGUMENTS` starts with the id of an existing project** (the usual case: it is created from the app with the "Document a project" form), use that folder. It already has the name in `status.md`, the description in `00-need.md`, the source folders in `material/links.md` (the section listing folders with documentation) and the uploaded files in `material/`.
- If not, create `projects/YYYY-MM-short-name/` with the date **when the work was done** (if the month is unknown, use `-01`), copy `templates/<lang>/project/` (`<lang>` from `settings.json`), add `- **Type:** Already done (document)` to `status.md` (`- **Tipo:** Ya hecho (documentar)` in Spanish files) and ask for the folders or files: paths in `material/links.md`, or files in the app's Material tab.

## 3. Read the material
- **Folders given** (in `material/links.md`): read them directly where they are, **without copying them** into the project. They can be local or network folders (`\\server\...`); use the path as is.
  - First make an inventory: go through the folder recursively (ignore `node_modules`, `.git`, `venv`, temporary files and `~$*`) and list files by type, size and date.
  - If there are more than ~150 files or more than ~200 MB, show the summarized inventory and propose what to read first (requirements documents, presentations, main scripts, README, closing emails) before reading everything.
  - Read documents with the pdf, docx, pptx and xlsx skills depending on the type. For code, read the entry points and the configuration. Look at images and screenshots.
  - If a path is not accessible, say so and ask the person to upload the key files in the Material tab.
- **Uploaded files** in `material/`: read them the same way. If there is a `.zip`, extract it into `material/<name-without-extension>/` (PowerShell `Expand-Archive`). Never run anything that comes in the material.
- Save the inventory in `material/inventory.md`: which files you reviewed, where they come from and what each one contributes, in one line each. That way they are referenced without being duplicated.
- From the code and documents, deduce the architecture (inputs, transformations, outputs, systems, third parties and people), the chronology (file dates, versions) and any figures that appear.
- Only copy into `product/` the final pieces worth keeping with the project (the main script, the template), and only if the person agrees. Exclude customers' personal data.

## 4. Short interview (one or two batches, 3-5 questions)
Only what the material and the achievement log don't answer, each question with a suggested answer:
- Previous situation: how it was done, what it cost, what failed
- The person's role compared to others (what exactly they did)
- Key decisions: why that tool or approach, what was discarded
- Adoption: who uses it, how it was rolled out, resistance
- Impact with figures, and what was left pending or could be improved

## 5. Fill in the documents
Fill them in concisely and retrospectively (without inventing; whatever is missing, with ❓):
- `00-need.md`: the problem as it was.
- `02-definition.md`: the goals and scope it had.
- `03-plan.md`: the chosen solution and the alternatives.
- `05-closure.md`: results, lessons learned and bullets for the CV.
- `decisions.md`: the key decisions, with an approximate date.
- `map.md`: complete summary card, interactive diagram of how it works in a ```map block (format in the `advance` skill, "Project map" section) and table of pieces.
- You may delete `01-discovery.md` and `04-delivery.md` if they add nothing.
- `status.md`: phase `6. Closure` (`6. Cierre` in Spanish files; keep the **Type** / **Tipo** line), all phases marked `[x]`, with the approximate date on Capture and Closure if known, and the next-decision field empty or with the pending improvement.

## 6. Achievement log and wrap-up
- In `journal/achievements.md`, if the achievement already exists, add `projects/<id>` to its project field (**Project** / **Proyecto**) and expand its evidence field. If it doesn't exist, create it with the usual format.
- Update `journal/skills.md` and, if appropriate, the profile.
- Announce: `📌 Logged in achievements: ...` and end with the link to the project's Map tab.
- **Mentor:** how to tell this project in an interview (situation → action → result) and whether there is a v2 that would be a good opportunity for a gap in `goals.md`.
