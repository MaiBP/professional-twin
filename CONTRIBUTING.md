# Contributing to Professional Twin

Thanks for your interest. Professional Twin is open source under the MIT license, and it is built to be **owned**: clone it, run it on your own PC, change anything you like and make it yours. You don't need anyone's permission for that.

Contributing *back* to this repository is different. Everything that gets merged is reviewed first, and this project has a deliberately narrow scope. Please read this page before opening a pull request — a well-built PR can still be declined if it doesn't fit the rules below.

---

## The one rule everything follows from

**This repository is a universal, private-by-design template that anyone can run locally and adapt to their own career.**

Upstream stays:

- **Person-agnostic and company-agnostic** — no real names, employers, CVs, job offers or industry-specific content. Templates ship empty.
- **Local-first and private** — the user's content lives only on their PC; the app listens only on `127.0.0.1`; nothing is sent anywhere except what Claude Code needs for a task, under the user's own account.
- **Claude Code-native** — the twin is Claude Code with this repo's `CLAUDE.md` and skills. The app is a window on top of it, not a replacement.
- **Friendly to non-technical people** — every feature must be usable from the app without typing commands.
- **Bilingual** — English by default, Spanish as a full option.

A contribution is judged first on whether it fits this rule, and only then on the quality of the code.

---

## Make it yours (fork and run locally)

You are encouraged to fork and customise freely. Typical things people change in their own copy:

- The working method in `CLAUDE.md` (how many questions, tone, phases).
- The skills in `.claude/skills/` (add your own commands).
- The templates in `templates/<lang>/` (your own documents and formats).
- New sections in the app (`app/client/src/sections.jsx`).

```bash
git clone https://github.com/<your-user>/professional-twin.git
cd professional-twin
npm install
npm run init        # creates your private folders from the templates
npm start           # http://localhost:3210
npm run dev         # development mode with hot reload (server + client)
```

Your private folders (`profile/`, `context/`, `journal/`, `projects/`, `cv/`, `offers/`, `backups/`) and `settings.json` are in `.gitignore`. **Keep them there**, also in your fork — they contain personal data.

Customisations that only make sense for you, your company or your country belong in your fork. That's not a lesser outcome: it's how the project is meant to be used.

---

## What gets merged

- **Bug fixes**, with the failing case described step by step (and fictional data to reproduce it).
- **Robustness and correctness**: parsers that break on valid input, encoding or path problems on Windows/macOS/Linux, backups that don't restore, maps that don't render.
- **Privacy and security improvements** of the local server (see *Security* below for how to report vulnerabilities).
- **Accessibility, usability and clarity** of the app for non-technical users.
- **Translations and language quality** — fixes to English or Spanish texts, and proposals for a new language (open a discussion first: it touches the UI, templates, parsers and `CLAUDE.md`).
- **Documentation** that closes a real gap: installation on a platform, unclear steps, outdated references.
- **Generic improvements to the twin's method** (skills, `CLAUDE.md`, templates) that help *any* person, in *any* role.

## What gets declined

- **Personal or company-specific content**: real CVs, profiles, offers, employer names, sector-specific skills, screenshots with real data.
- **Anything that sends user data to a new external service** (analytics, telemetry, cloud storage, third-party APIs) or exposes the server beyond `127.0.0.1`.
- **Ports to other AI runtimes or a parallel copy of the skills** for another tool. Claude Code is the reference runtime; do that in a fork.
- **Features that only work from the terminal** with no way to use them from the app.
- **Big new dependencies or frameworks** without a clear problem they solve. Small is a feature.
- **Speculative infrastructure** — complexity for a problem that doesn't exist yet.
- **Kitchen-sink PRs** — one PR, one concern. Refactors and features go in separate PRs.
- **Changes that break existing users' data** without a migration (file names, field labels, the ```map format).

## The bar for new commands and sections

The core journey (`/onboarding`, `/need`, `/document`, `/advance`, `/log`, `/mentor`, `/cv`, `/offer`, `/status`) is considered complete, so new commands have a high bar. **Open a discussion before building one.** A good proposal connects pieces that already exist rather than adding a parallel workflow.

If it is accepted, a new capability is only complete when it is wired end to end:

1. The skill in `.claude/skills/<name>/SKILL.md`.
2. Its mention in `CLAUDE.md` (*Available commands*).
3. Its action in `ACTIONS` (`app/server/twin.mjs`) and its button in the page's twin panel.
4. Its entry in `app/client/src/commands.js` and, if relevant, in the Help page.
5. Templates in **both** `templates/en/` and `templates/es/`.
6. UI texts in both languages.

---

## Privacy rules for contributors

These apply to issues, discussions, pull requests, commits, screenshots and test data:

- **Never** include anything from your private folders, even "just a small example".
- Use **fictional data** (fictional person, fictional companies such as *Contoso* or *Northwind*, `@example.com` emails).
- Check screenshots and logs for names, emails, file paths with your user name, or company names before posting them.
- Don't commit `settings.json`, backups (`.zip`) or anything under `backups/`.
- Don't remove private folders from `.gitignore`. PRs that do are closed.

---

## Conventions

- **Code in English**: identifiers, file names, comments, routes, JSON keys and commit messages.
- **UI texts are always bilingual**: in the client use `L('English', 'Español')` from `app/client/src/i18n.js`; in the server, `L()` from `app/server/i18n.mjs`. Never add a text in only one language.
- **Templates in both languages** with the same file names (`templates/en/…` and `templates/es/…`).
- **File formats are a contract.** The app parses `status.md`, `achievements.md`, `skills.md`, `offer.md` and the ```map block in `map.md`, in English *and* Spanish labels. If you change a format, update `app/server/parsers.mjs`, both templates and the skills, and keep existing files working.
- **Server safety**: the server listens on `127.0.0.1`, every write request requires the `X-Twin: 1` header, and every file path goes through `safePath()` so it can't leave the private folders. Keep it that way.
- **No credentials in the app.** Login is handled by Claude Code (`claude auth`).
- **Keep it lightweight**: plain Express + React + Vite, no database, files on disk. Prefer what's already in `package.json`.
- **Commit messages / PR titles** follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`… One line summary, details in the body.

## AI-assisted contributions

This project is built with Claude Code, and using AI to contribute is welcome. You are still the author: you must understand every line you submit, have run it, and be able to explain it in review. Unreviewed bulk output (large rewrites, generated docs nobody read) will be declined.

---

## Before opening a pull request

1. **Open an issue or discussion first** for anything bigger than a small fix, so we can agree on the approach before you spend time on it.
2. Create a branch in your fork from `main`.
3. Check locally:
   ```bash
   npm run build                      # the client must build without errors
   node --check app/server/*.mjs      # server files must parse
   npm start                          # try your change in the app, in English and Spanish, light and dark theme
   ```
4. If you touched the twin (skills, `CLAUDE.md`, actions), run the affected command at least once on a workspace with **fictional data** and check that the app still reads the files it produces.
5. Check that no personal data entered your diff (`git diff main` — names, emails, paths).
6. Fill in the pull request template.

When opening the PR from your fork, make sure the **base repository** is `MaiBP/professional-twin` and the base branch is `main`.

## How review works

- Every PR is reviewed by the maintainer before merging. There is no guaranteed timeline — this is a personal open-source project.
- Reviews are practical: the bug is reproduced on `main`, then the fix is tested; features are tried in the app as a non-technical user would.
- The maintainer may ask for changes, take parts of a PR, or decline it with a reason. Declining a PR is not a judgement of the contributor.
- Merged work credits you: the commit keeps you as author, or adds a `Co-authored-by:` line when the change was adapted.

---

## Security

Don't open a public issue for a vulnerability (for example, a way to read files outside the private folders, or to reach the server from another machine). Use GitHub's **Report a vulnerability** (Security tab → *Advisories*) to report it privately.

## Questions and ideas

Use **Discussions** for questions, ideas and proposals, and **Issues** for confirmed bugs. Please search first — your question may already have an answer.

Be kind and constructive. Treat everyone with respect; harassment or discrimination of any kind is not tolerated.
