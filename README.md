# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Firebase account workflow

Enable the Email/Password provider on the existing Firebase project. Install the
backend dependencies with npm install --prefix functions. In
functions/.env.<project-id>, set AUTH_WEB_API_KEY to the Web API key for that
same project. Set the REGISTRAR_SETUP_KEY Functions secret to a random value of
at least 24 characters before deploying. Use the key on the first Registrar
setup screen for a new installation. Initial setup is blocked once a Registrar
profile exists.

In Identity Platform settings, disable end-user account creation and deletion
when rolling out Registrar-only account management. This prevents direct Auth
sign-up or deletion outside the portal.

Deploy the callable functions and Firestore rules together to the same project
before publishing the React build:

    firebase deploy --only functions,firestore:rules --project <project-id>

Existing Firebase users keep the UID that links their academic records. A
Registrar can use **Set up sign-in** for a staff profile that has no Firebase
identity. If no Registrar can sign in because the original Registrar only has a
Firestore profile, an authorized Firebase project administrator must provision
an Authentication identity with that existing profile UID before using the
portal. Do not create a replacement profile or edit the UID on academic
records. Existing students who sign in by email keep that sign-in until the
Registrar resets their password, which moves sign-in to their Student ID.

Enrollment and password resets return a randomly generated temporary
password once. Share it privately. If the confirmation is lost after a
successful enrollment, use the Registrar's reset action for the existing
account.

For local testing, set VITE_USE_FIREBASE_EMULATORS=true,
VITE_FIREBASE_PROJECT_ID=demo-academiahub, and
VITE_FIREBASE_API_KEY=emulator-key in the frontend environment. Set a test-only
REGISTRAR_SETUP_KEY in functions/.secret.local. Run the integration suite
against a fresh emulator project:

    firebase emulators:exec --project demo-academiahub --only auth,firestore,functions "npm --prefix functions test"
