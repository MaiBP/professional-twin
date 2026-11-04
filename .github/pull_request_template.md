## What and why

<!-- One concern per PR. What does this change and which problem does it solve? Link the issue or discussion. -->

Closes #

## How to test

<!-- Steps a reviewer can follow in the app, with fictional data. -->

## Checklist

- [ ] I read [CONTRIBUTING.md](../CONTRIBUTING.md) and this fits "the one rule" (person-agnostic, local-first, Claude Code-native, usable from the app, bilingual).
- [ ] No personal data in the diff, screenshots or test data (names, emails, employers, paths with my user name).
- [ ] Private folders and `settings.json` are still in `.gitignore`.
- [ ] `npm run check` passes (privacy guard + build) and I tried the change with `npm start`.
- [ ] New or changed UI texts exist in English **and** Spanish (`L(en, es)`).
- [ ] Template changes are in both `templates/en/` and `templates/es/`.
- [ ] If I changed a file format (`status.md`, `achievements.md`, `offer.md`, ```map), the parsers, templates and skills are updated and existing files still work.
- [ ] No new external service and no new dependency without a reason explained above.
- [ ] I understand and have run all the code in this PR (including any AI-assisted parts).
