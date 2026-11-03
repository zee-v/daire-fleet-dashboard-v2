# dAIRE Asset Management (v3)

React (Create React App) front end. No backend: all data is bundled (`public/data/shipData.json`) or generated in `src/data/portfolio.js`.

## Run locally
    npm install
    npm start

## Build
    npm run build
(On Node v25 `react-scripts` fails via npm; use `node node_modules/react-scripts/bin/react-scripts.js build`.)

## Deploy (Firebase Hosting)
`firebase.json` serves `build/`. Check the `site` value before deploying: `daire-fleet-v2` is the live v2 site, so deploying with it replaces v2.

    firebase login
    firebase deploy --only hosting
(On Node v25 `npx firebase` fails; run `node <global firebase-tools>/lib/bin/firebase.js deploy --only hosting`.)
