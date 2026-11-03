---
name: log
description: Logs in the achievement log something the user did (task, achievement, course, recognition, problem solved). Use when the user tells something they did or asks to note it down.
argument-hint: "[what you did]"
---

# Log an achievement

Write in the language set in `settings.json` (`language`, default English), or in the language the person writes in. Keep the entry's field labels exactly as the file's format defines them (English or Spanish, whichever `journal/achievements.md` uses).

1. Take what the person told you (`$ARGUMENTS` or the message).
2. If something important is missing for the achievement to be useful in a CV, ask **at most 2 questions**, for example:
   - What was the result, or what changed thanks to it? Are there numbers (time, money, %, people)?
   - Was it your initiative? Did you lead, collaborate, execute?
3. Add the entry **at the very top** of `journal/achievements.md`, using the format described in that file's comment.
4. Update `journal/skills.md`: add the evidence, raise the level if appropriate and mark whether it is relevant to the target role in `profile/goals.md`.
5. If it was a course or a certification, also update `profile/profile.md`.
6. Confirm with `📌 Logged: {CV bullet}` and, if applicable, a mentor line: which gap it brings closer or how to make the most of it (for example, "this deserves a documented case for your portfolio").

Don't exaggerate or invent impact. If there are no numbers, write "pending measurement" ("pendiente de medir" in Spanish files) and suggest how to measure it.
