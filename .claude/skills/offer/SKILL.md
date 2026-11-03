---
name: offer
description: Analyzes a job offer against the person's profile (fit, requirements covered and missing, how to adjust the CV) and supports the application with a tailored CV, cover letter and interview preparation. Use when the person pastes or mentions a job offer, a vacancy or a position they want to apply for.
argument-hint: "[offer id | offer text] [request: CV, cover letter, interview]"
---

# Analyze a job offer and prepare the application

Everything about an offer lives in `offers/YYYY-MM-company-position/`: `offer.md` (text and tracking), `analysis.md`, `cv-<language>.md` (+ `.pdf`), `cover-letter.md`, `interview.md` and `sources/` (PDF or screenshots of the offer).

Write in the language set in `settings.json` (`language`, default English), or in the language the person writes in; the CV and the cover letter go in the offer's language. Field labels and states follow the language of `offer.md`: English files use the states New, Analyzed, Applied, Interview, Offer, Discarded; Spanish files keep Nueva, Analizada, Postulada, Entrevista, Oferta, Descartada. Never change the labels of an existing file.

## 1. Locate or create the offer
- If `$ARGUMENTS` starts with an id from `offers/`, use that folder and carry out the request that follows (if there is no request and `analysis.md` doesn't exist, analyze).
- If it contains the text of an offer (or a link), create the folder with the current date and the name `company-position` in lowercase with hyphens, copy `templates/<lang>/offer/offer.md` (`<lang>` from `settings.json`) and fill in the fields and text. If it is a link, try to read it; if you can't, ask for the text.
- Also read whatever is in `sources/` (PDF, screenshots).

## 2. Context
Read `profile/profile.md`, `profile/criteria.md`, `profile/goals.md`, `journal/achievements.md`, `journal/skills.md`, the `map.md` and `05-closure.md` files in `projects/` (portfolio evidence) and the most recent CV in `cv/versions/`.

## 3. Analyze (`analysis.md`, from `templates/<lang>/offer/analysis.md`)
1. **Requirements:** extract all of them (responsibilities, mandatory, nice-to-have, languages, location, experience). For each one: type (Mandatory/Nice-to-have, or the equivalent labels of the file's language), your concrete evidence (achievement, project, certification, with its figure) and fit ✅ covered · 🟡 partial or transferable · ❌ not covered.
2. **Fit:** weighted percentage (mandatory ×2, nice-to-have ×1; ✅ = 1, 🟡 = 0.5, ❌ = 0). Adjust it with judgement if a ❌ is a deal-breaker (language, required degree, location) and explain it.
3. **Verdict:** `Apply now` (≥ 75% and no deal-breakers) · `Apply with adjustments` (50-74%, or gaps that can be presented as transferable) · `Not worth it` (< 50% or a deal-breaker). In Spanish files: `Postular ya` · `Postular ajustando` · `No vale la pena`. Say why in 2-3 lines.
4. **What's missing:** for each ❌ or 🟡, how to present it honestly (transferable experience, personal project, ongoing training) or how to close it, linking to the gap in `goals.md` if it exists.
5. **Keywords** from the offer that should appear in the CV, only if they are true.
6. **How to adjust the application:** headline, summary, which achievements to move up, what to remove, which project to highlight.
7. **Likely interview questions** (5-8), with the achievement or project to use for each one (situation → action → result structure).
8. **Signals about the company or the role** worth asking about or researching (if applicable).

Update `offer.md`: status field set to `Analyzed` (`Analizada` in Spanish files), fit (e.g. `72%`), verdict and next step. Summarize in the chat: fit, verdict, the 3 strengths, the 2-3 gaps and the suggested next step.

## 4. Follow-up requests
- **Tailored CV:** follow the `cv` skill with the offer as the target, but save it in this folder (`cv-en.md` / `cv-es.md`, in the offer's language) and generate the PDF with `npm run pdf -- <file.md>`. Also copy the final PDF to `cv/versions/YYYY-MM-DD-<company-position>.pdf`.
- **Cover letter** (`cover-letter.md` + PDF): 3 short paragraphs (why this company, 2 achievements with figures connected to their needs, closing), in the offer's tone and language.
- **Interview** (`interview.md`): the questions from the analysis developed with STAR-format answers based on real achievements, questions to ask the company and weak points to prepare.
- When the person says they applied, have an interview or got a result, update the status (`Applied`, `Interview`, `Offer`, `Discarded`, or the Spanish equivalents) and the next step, and add the date and what happened to the notes section of `offer.md` (`## Notes` / `## Notas`, whichever the file uses).

## 5. Rules
- **Never** invent experience, figures, degrees or certifications. If something might be true but isn't in the achievement log, ask.
- If several offers repeat the same gap, say so in a **Mentor** block and propose adding it or raising its priority in `profile/goals.md`.
- If the person gets an offer or a role change, log it in `journal/achievements.md`.
