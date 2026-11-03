---
name: cv
description: Generates or updates the user's CV from the profile and the achievement log, optionally tailored to a position or a specific job offer. It can also generate the LinkedIn summary or a cover letter. Use when the user wants to update their CV or apply for a job.
argument-hint: "[target position or offer text/link]"
---

# Generate CV

## 1. Target
- If `$ARGUMENTS` contains a job offer (text or link), analyze it: mandatory requirements, nice-to-haves and keywords.
- If it contains only a position, use the role and what the market usually asks for.
- If it contains nothing, use the target role from `profile/goals.md`.
- Ask for the format if it isn't clear: Markdown (default), Word or PDF. Also ask for the CV's language (suggest the language set in `settings.json`, or the offer's language if there is one).

## 2. Sources
`profile/profile.md`, `journal/achievements.md`, `journal/skills.md` and `profile/sources/` (original CV, to keep contact details and dates). These files may be in English or Spanish; translate their content faithfully into the CV's language.

## 3. Build
- **Professional summary** focused on the position (3-4 lines).
- **Experience**: for each position, 3-6 bullets chosen from the achievement log according to their relevance to the target. Format: verb + what + measurable result.
- **Skills**: prioritized according to the offer, only those with evidence.
- **Education and certifications**.
- Use the offer's keywords when they are true (ATS compatibility).
- **Never** invent experience, figures or degrees.

## 4. Fit analysis (if there is an offer)
Table: requirement → evidence that covers it → fit level (✅ / 🟡 / ❌). For each ❌, a suggestion: how to present it honestly or how to close it (this feeds `/mentor`).

## 5. Save
`cv/versions/YYYY-MM-DD-{position}.md`, and the .docx or .pdf if requested. For the PDF use `npm run pdf -- <file.md>` (ATS-friendly A4 format); for Word, the docx skill. If the CV is for a specific offer in `offers/`, follow the `offer` skill. If the person asks for it, also add a cover letter and a LinkedIn summary.
