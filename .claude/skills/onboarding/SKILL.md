---
name: onboarding
description: Builds or updates the user's professional profile from their CV, certificates and company context. Use at the start, or when the user uploads new documents about their career or their company.
---

# Twin onboarding

Goal: for the twin to understand who the person is, how they work, where they work and where they want to go.

Write in the language set in `settings.json` (`language`, default English), or in the language the person writes in. If a source document (CV, certificate) is in another language, translate its content faithfully. Keep the headings and labels of the profile files as they are.

## Step 1: Read the sources
1. List and read everything in `profile/sources/` and `context/sources/` (PDF, DOCX, images, text). Use the PDF/DOCX skills if needed to extract the text.
2. If the folders are empty, ask the person to put their CV and certificates there, or to paste the text in the chat. You can continue with what they tell you verbally.

If the profile files don't exist yet, run `npm run init` (it creates them from `templates/<lang>/` without overwriting anything).

## Step 2: Fill in the profile
Fill in `profile/profile.md` with what comes out of the sources. Don't invent anything: leave `❓` where information is missing.
When you finish each file (`profile.md`, `criteria.md`, `goals.md`, `company.md`), delete its first line `<!-- TEMPLATE ... -->` (older files may use `<!-- PLANTILLA ... -->`): the interface uses it to know what is still to be filled in.

## Step 3: Short interview (3 batches at most)
Ask only what the sources don't answer. Offer a suggested answer when you can.

**Batch A: role and company** (→ `context/company.md`)
- Company, sector, what your area does and how its success is measured
- Main stakeholders and what they care about
- Tools you use and what you can install or deploy (licenses, cloud, Excel, Power BI, etc.)

**Batch B: how you work** (→ `profile/criteria.md`)
- How you prefer deliverables (format, length, tone)
- What you value in a good solution; what bothers you in other people's work
- A project you are proud of and why

**Batch C: where you're heading** (→ `profile/goals.md`)
- Target role in 1-2 years and aspirational role in 3-5 years
- What you think you're missing to get there
- Desired sector or type of company

## Step 4: First diagnosis
When finished, deliver:
1. **Profile summary** in 4-5 lines, so the person confirms you understood them.
2. **First gaps** relative to the target role (fill in the table in `goals.md`).
3. **Previous achievements** that appear in the CV: move them into `journal/achievements.md` with an approximate date and CV as the evidence (`Evidence: CV` / `Evidencia: CV`, following the file's language), and fill in `journal/skills.md`.
4. **Suggested next step**, for example: "Tell me about a need with `/need`".

If it is an update (the profile already existed), integrate the new information without deleting the previous one and summarize what changed.
