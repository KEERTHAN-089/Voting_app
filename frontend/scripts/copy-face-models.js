// Copies the face-recognition library and its model files out of node_modules
// into public/models, where the browser loads them only for face-match sessions.
// Runs before `npm start` and `npm run build`, so these 8MB of files do not have
// to be committed to git or bundled into the main app.
const fs = require('fs');
const path = require('path');

const MODELS = ['tiny_face_detector_model', 'face_landmark_68_model', 'face_recognition_model'];

const packageDir = path.join(__dirname, '..', 'node_modules', '@vladmandic', 'face-api');
const target = path.join(__dirname, '..', 'public', 'models');

fs.mkdirSync(target, { recursive: true });
fs.copyFileSync(path.join(packageDir, 'dist', 'face-api.js'), path.join(target, 'face-api.js'));
for (const model of MODELS) {
  for (const file of [`${model}-weights_manifest.json`, `${model}.bin`]) {
    fs.copyFileSync(path.join(packageDir, 'model', file), path.join(target, file));
  }
}
console.log(`Face library and models copied to ${path.relative(process.cwd(), target)}`);
