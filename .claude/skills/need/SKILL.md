---
name: need
description: Captures a business need or problem the user describes, opens a project and starts discovery with questions. Use when the user describes a problem, an improvement opportunity or a request from their job.
argument-hint: "[description of the need]"
---

# New need → new project

The person describes a need in natural language (it may come in `$ARGUMENTS` or in the message). Turn it into a structured project.

Write in the language set in `settings.json` (`language`, default English), or in the language the person writes in. Labels and phase names follow the language of the project files: English files use "Current phase" and the phases Capture, Discovery, Definition…; Spanish files keep "Fase actual" and Captura, Descubrimiento, Definición…

## 1. Context
Read `profile/profile.md`, `profile/criteria.md`, `profile/goals.md` and `context/company.md`. Check `projects/` in case something related already exists (if so, propose continuing it instead of opening another one).

## 2. Open the project
- **If the project already exists** (the app creates it when the person tells a need, and tells you so), work in that folder: it already has the templates copied and the person's own account in the corresponding section of `00-need.md` ("Lo que contaste" in Spanish files). Adjust the title in `status.md` to a short, clear name if needed.
- If not, folder name: `projects/YYYY-MM-short-name/` (current date, name in lowercase with hyphens), and copy all of `templates/<lang>/project/` into it (`<lang>` from `settings.json`).
- Fill in the sections of `00-need.md`, keeping the headings the file already has (Spanish files: "Lo que contaste", "Lo que entiendo", "Primera lectura", "Relación con la proyección"):
  - **The person's account**: the person's text, unchanged.
  - **What I understand**: problem, who is affected, why it matters, symptoms.
  - **First reading**: classify the initiative and list the solutions that usually work for this kind of problem according to good practice in the field (frameworks, standards, common approaches).
  - **Link to the career path**: which skills from `goals.md` it lets the person demonstrate or develop.
- Fill in the **Summary card** in `map.md` with what you already know (the rest with ❓) and draft a first diagram of the current situation, how it is done today, if it can be deduced.
- Update `status.md` → Phase 1. Discovery (`1. Descubrimiento` in Spanish files) and mark `- [x] 0. Capture · YYYY-MM-DD` (`- [x] 0. Captura · YYYY-MM-DD` in Spanish files).
- If the person has existing documents, presentations or code, invite them to upload them in the project's **Material** tab in the app (`material/`), and read them before asking.

## 3. Reply and ask
Reply with:
1. **What I understood** in 3-5 bullets: the person corrects it if needed.
2. **How this is usually approached** in 2-4 lines: the typical approach, so the person sees where you are heading.
3. **First discovery batch** (3-6 questions): the ones that change the solution the most. For each one, a suggested answer.

Discovery topics depending on the case (pick the relevant ones; don't ask all of them):
- **Users**: who will use the result, how many, technical level, what decisions they make with it
- **Current situation**: how it is done today, what fails, concrete examples
- **Data**: sources, access, quality, frequency, possible exports
- **Definitions**: what each metric or concept means, whether the company has a standard
- **Success**: how we will know it worked, what would change day to day
- **Constraints**: allowed tools, deadlines, approvals, budget
- **Stakeholders**: who sponsors it, who can block it, who needs to be convinced

Record questions and answers in `01-discovery.md` as they come in.

## 4. When to move to Definition
When the critical questions are answered (✅) or explicitly assumed (🟡), propose: "I have enough to write the definition. Shall I go ahead?". Continue with `/advance`.

## Reference example
> "I'm in charge of telephony. Each manager looks at the metrics differently and interprets them according to what they think is right. Genesys Cloud doesn't offer good charts or clear definitions."

Expected first reading: a **KPI standardization + visualization tool** initiative. Typical approach: (1) an agreed metrics dictionary (AHT, ASA, service level, abandonment, FCR, occupancy…), with formula, source and threshold; (2) a single data source (Genesys Cloud API or exports); (3) a dashboard per audience (real-time operational, weekly tactical, monthly executive); (4) adoption: a session with managers and a review ritual. Initial questions: which metrics each manager uses today and with what formula, what decisions they make with them, what Genesys data can be accessed (API, exports, Performance Views), which BI tool is allowed, who must validate the definitions.
