@AGENTS.md

Reminder for BauBook work:

- Default UI validation: `./baubook.ps1 -Mode web`.
- Android validation: `./baubook.ps1 -Mode android-build` then `./baubook.ps1 -Mode android-dev`.
- Supabase preparation: `./baubook.ps1 -Mode supabase-doctor` and `docs/SUPABASE_SETUP.md`.
- Do not use Expo Go as the main Android workflow.
- Do not commit `.env`, `node_modules`, `.expo`, `android`, `ios`, or registry-internal lockfiles.
