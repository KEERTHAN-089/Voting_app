/*
 * Puts the app on Azure App Service using the Azure CLI (az).
 *
 *   npm run azure:setup -- <app-name> [--location indiasouthcentral]   once
 *   npm run azure:deploy                                           every update
 *
 * Sign in first with `az login`. The app ends up at https://<app-name>.azurewebsites.net
 */
const { spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STATE_FILE = path.join(ROOT, '.azure-app.json');
const RESOURCE_GROUP = 'voting-app-rg';
const PLAN = 'voting-app-plan';
const RUNTIME = 'NODE:24-lts';
const START_COMMAND = 'node backend/server.js';

const fail = (message) => {
  console.error(`\n${message}`);
  process.exit(1);
};

// Only simple values are ever put on the command line; secrets go through a file
const quote = (arg) => (/^[\w@./:=,-]+$/.test(arg) ? arg : `"${arg}"`);

const run = (command, options = {}) =>
  spawnSync(command, { shell: true, encoding: 'utf8', maxBuffer: 100 * 1024 * 1024, ...options });

// Runs an az command and returns its JSON output, or null when allowFail is set and it fails
const az = (args, { allowFail = false } = {}) => {
  const result = run(`az ${args.map(quote).join(' ')} --only-show-errors -o json`);
  if (result.status !== 0) {
    if (allowFail) return null;
    throw new Error((result.stderr || result.stdout || '').trim() || `az ${args.slice(0, 2).join(' ')} failed`);
  }
  try {
    return JSON.parse(result.stdout || 'null');
  } catch (error) {
    return null;
  }
};

const step = (text) => console.log(`- ${text}`);
const sameLocation = (a, b) => a.replace(/\s+/g, '').toLowerCase() === b.replace(/\s+/g, '').toLowerCase();

const requireSignIn = () => {
  if (run('az version -o none').status !== 0) {
    fail('The Azure CLI (az) is not installed. Get it from https://aka.ms/installazurecliwindows');
  }
  // `account show` only reads the saved profile; getting a token proves the sign-in still works
  const account = az(['account', 'show'], { allowFail: true });
  const token = account && az(['account', 'get-access-token', '--query', 'expiresOn'], { allowFail: true });
  if (!token) fail('You are not signed in to Azure (or the sign-in has expired). Run `az login`, finish the sign-in in the browser, then try again.');
  step(`Azure subscription: ${account.name}`);
};

const readBackendEnv = () => {
  const file = path.join(ROOT, 'backend', '.env');
  if (!fs.existsSync(file)) fail('backend/.env was not found. It holds the database and email settings to copy to Azure.');
  const dotenv = require(path.join(ROOT, 'backend', 'node_modules', 'dotenv'));
  return dotenv.parse(fs.readFileSync(file));
};

// The settings the live app needs, taken from backend/.env (JWT_SECRET is added separately)
const liveSettings = (env) => {
  const settings = {
    NODE_ENV: 'production',
    // The uploaded package is ready to run; Azure must not try to build it
    SCM_DO_BUILD_DURING_DEPLOYMENT: 'false'
  };
  for (const key of ['MONGODB_URI', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM', 'FACE_MATCH_THRESHOLD']) {
    if (env[key]) settings[key] = env[key];
  }
  return settings;
};

// Azure for Students only allows some regions; show which ones when a region is refused
const explainRegionRefusal = (location, error) => {
  if (!/RequestDisallowedByPolicy|disallowed by policy|not allowed/i.test(error.message)) throw error;
  const allowed = az(
    ['policy', 'assignment', 'list', '--query', '[].parameters.listOfAllowedLocations.value'],
    { allowFail: true }
  );
  const regions = [...new Set((allowed || []).flat().filter(Boolean))];
  fail(`Your subscription does not allow the region "${location}".` +
    (regions.length ? `\nAllowed regions: ${regions.join(', ')}` : '') +
    '\nRun setup again with one of them, for example:  npm run azure:setup -- <app-name> --location <region>');
};

const setup = (appName, location) => {
  if (!appName || !/^[a-z0-9][a-z0-9-]{0,58}[a-z0-9]$/.test(appName)) {
    fail('Give the app a name of 2-60 lowercase letters, digits and hyphens. It becomes https://<name>.azurewebsites.net\n' +
      'Example:  npm run azure:setup -- nnm-voting-app');
  }
  requireSignIn();
  const env = readBackendEnv();
  for (const key of ['MONGODB_URI']) {
    if (!env[key]) fail(`${key} is empty in backend/.env`);
  }

  // Resource group: reuse it if it already exists, wherever it is
  let group = az(['group', 'show', '--name', RESOURCE_GROUP], { allowFail: true });
  if (!group) {
    try {
      group = az(['group', 'create', '--name', RESOURCE_GROUP, '--location', location]);
    } catch (error) {
      explainRegionRefusal(location, error);
    }
  }
  const region = group.location;
  step(`Resource group ${RESOURCE_GROUP} in ${region}`);

  // Azure allows only one free Linux plan per region, so reuse one if it exists
  const plans = az(['appservice', 'plan', 'list']) || [];
  let plan = plans.find((p) => p.sku && p.sku.name === 'F1' && p.reserved && sameLocation(p.location, region));
  if (plan) {
    step(`Reusing your free plan ${plan.name} (resource group ${plan.resourceGroup})`);
  } else {
    try {
      plan = az(['appservice', 'plan', 'create', '--name', PLAN, '--resource-group', RESOURCE_GROUP,
        '--sku', 'F1', '--is-linux', '--location', region]);
    } catch (error) {
      explainRegionRefusal(region, error);
    }
    step(`Created free plan ${PLAN}`);
  }

  // The web app lives in the same resource group as its plan
  const appGroup = plan.resourceGroup;
  let app = az(['webapp', 'show', '--name', appName, '--resource-group', appGroup], { allowFail: true });
  if (!app) {
    try {
      app = az(['webapp', 'create', '--name', appName, '--resource-group', appGroup,
        '--plan', plan.name, '--runtime', RUNTIME]);
    } catch (error) {
      if (/already exists|not available|conflict/i.test(error.message)) {
        fail(`The name "${appName}" is already taken on azurewebsites.net. Choose another one.`);
      }
      throw error;
    }
    step(`Created web app ${appName}`);
  } else {
    step(`Web app ${appName} already exists; updating its settings`);
  }

  az(['webapp', 'config', 'set', '--name', appName, '--resource-group', appGroup, '--startup-file', START_COMMAND]);
  az(['webapp', 'update', '--name', appName, '--resource-group', appGroup, '--https-only', 'true']);
  step(`Start command: ${START_COMMAND}; HTTPS only`);

  // Settings go through a temporary file so no secret appears on a command line
  const existing = az(['webapp', 'config', 'appsettings', 'list', '--name', appName, '--resource-group', appGroup]) || [];
  const settings = liveSettings(env);
  // A new secret for the live site, kept on later runs so nobody is signed out
  if (!existing.some((s) => s.name === 'JWT_SECRET')) {
    settings.JWT_SECRET = crypto.randomBytes(48).toString('hex');
  }
  const settingsFile = path.join(os.tmpdir(), `voting-app-settings-${Date.now()}.json`);
  // The same format as the portal's "Advanced edit" for app settings
  fs.writeFileSync(settingsFile, JSON.stringify(
    Object.entries(settings).map(([name, value]) => ({ name, value, slotSetting: false }))
  ));
  try {
    az(['webapp', 'config', 'appsettings', 'set', '--name', appName, '--resource-group', appGroup,
      '--settings', `@${settingsFile}`]);
  } finally {
    fs.rmSync(settingsFile, { force: true });
  }
  step(`App settings: ${Object.keys(settings).join(', ')}`);
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    step('Email is not set up in backend/.env, so the live site will print sign-in codes to its log instead of emailing them');
  }

  const url = `https://${app.defaultHostName || `${appName}.azurewebsites.net`}`;
  fs.writeFileSync(STATE_FILE, `${JSON.stringify({ appName, resourceGroup: appGroup, plan: plan.name, url }, null, 2)}\n`);
  console.log(`\nSetup done. Now upload the app with:  npm run azure:deploy\nIt will be at ${url}`);
};

const copyFiltered = (from, to, skip) => {
  fs.cpSync(from, to, {
    recursive: true,
    filter: (source) => !skip(path.relative(from, source).split(path.sep))
  });
};

// Builds the ready-to-run zip in a new temporary folder and returns both paths
const buildPackage = () => {
  step('Building the frontend');
  if (run('npm run build', { cwd: path.join(ROOT, 'frontend'), stdio: 'inherit' }).status !== 0) {
    fail('The frontend build failed; nothing was uploaded.');
  }

  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'voting-app-deploy-'));
  step('Packaging the backend (without local settings, tests or dev tools)');
  const skipped = new Set(['node_modules', 'test', 'scripts', 'uploads']);
  copyFiltered(path.join(ROOT, 'backend'), path.join(staging, 'backend'),
    ([first]) => skipped.has(first) || /^\.env/.test(first));
  if (run('npm ci --omit=dev --no-audit --no-fund', { cwd: path.join(staging, 'backend'), stdio: 'inherit' }).status !== 0) {
    fail('Installing backend packages failed; nothing was uploaded.');
  }
  copyFiltered(path.join(ROOT, 'frontend', 'build'), path.join(staging, 'frontend', 'build'), () => false);
  fs.writeFileSync(path.join(staging, 'package.json'), `${JSON.stringify({
    name: 'voting-app',
    private: true,
    scripts: { start: START_COMMAND },
    engines: { node: '>=18' }
  }, null, 2)}\n`);

  const zip = path.join(staging, 'app.zip');
  // Windows' own tar writes real zip files; a GNU tar earlier on the PATH (Git Bash) would not
  const zipCommand = process.platform === 'win32'
    ? `"${path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')}" -a -c -f "${zip}" backend frontend package.json`
    : `zip -qr "${zip}" backend frontend package.json`;
  if (run(zipCommand, { cwd: staging }).status !== 0) fail('Could not create the zip file.');
  step(`Package size: ${(fs.statSync(zip).size / 1024 / 1024).toFixed(1)} MB`);
  return { staging, zip };
};

/*
 * Prepares everything for deploying by hand (the VS Code Azure extension or the portal)
 * without uploading anything:
 *   deploy/package/            the folder to deploy
 *   deploy/app.zip             the same, zipped
 *   deploy/app-settings.env    the app settings to upload (contains secrets; git ignores it)
 */
const packageOnly = () => {
  const env = readBackendEnv();
  const { staging, zip } = buildPackage();

  const folder = path.join(__dirname, 'package');
  fs.rmSync(folder, { recursive: true, force: true });
  copyFiltered(staging, folder, ([first]) => first === 'app.zip');
  fs.copyFileSync(zip, path.join(__dirname, 'app.zip'));
  fs.rmSync(staging, { recursive: true, force: true });

  // Keep the secret from an earlier run, so uploading the settings again signs nobody out
  const settingsFile = path.join(__dirname, 'app-settings.env');
  let jwtSecret = crypto.randomBytes(48).toString('hex');
  if (fs.existsSync(settingsFile)) {
    const dotenv = require(path.join(ROOT, 'backend', 'node_modules', 'dotenv'));
    jwtSecret = dotenv.parse(fs.readFileSync(settingsFile)).JWT_SECRET || jwtSecret;
  }
  const settings = { ...liveSettings(env), JWT_SECRET: jwtSecret };
  // A value containing # would be cut short as a comment unless it is quoted
  const line = ([key, value]) => `${key}=${/[#"'\s]/.test(value) ? `'${value}'` : value}`;
  fs.writeFileSync(settingsFile,
    '# App settings for the live site. Contains passwords: do not share or commit.\n' +
    `${Object.entries(settings).map(line).join('\n')}\n`);

  console.log('\nReady to deploy by hand (nothing was uploaded):');
  console.log(`  folder to deploy:  ${path.relative(ROOT, folder)}`);
  console.log(`  zipped:            ${path.relative(ROOT, path.join(__dirname, 'app.zip'))}`);
  console.log(`  app settings:      ${path.relative(ROOT, settingsFile)}  (${Object.keys(settings).join(', ')})`);
};

const deploy = async () => {
  if (!fs.existsSync(STATE_FILE)) fail('Run setup first:  npm run azure:setup -- <app-name>');
  const { appName, resourceGroup, url } = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  requireSignIn();

  const { staging, zip } = buildPackage();
  try {
    step(`Uploading to ${appName} (this can take a few minutes)`);
    az(['webapp', 'deploy', '--name', appName, '--resource-group', resourceGroup,
      '--src-path', zip, '--type', 'zip', '--timeout', '900000']);
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }

  // A free app can take a while to start the first time
  step('Waiting for the app to start');
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(15000) });
      const body = await response.json().catch(() => ({}));
      if (response.ok && body.database === 'connected') {
        console.log(`\nLive at ${url}`);
        return;
      }
    } catch (error) {
      // Still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  fail(`The upload finished but ${url}/api/health is not answering yet.\n` +
    `See what the app is printing with:  az webapp log tail --name ${appName} --resource-group ${resourceGroup}`);
};

const [command, ...rest] = process.argv.slice(2);
const locationIndex = rest.indexOf('--location');
const location = locationIndex >= 0 ? rest[locationIndex + 1] : 'indiasouthcentral';
const appName = rest.find((arg, i) => !arg.startsWith('--') && rest[i - 1] !== '--location');

if (command === 'setup') {
  try {
    setup(appName, location);
  } catch (error) {
    fail(error.message);
  }
} else if (command === 'deploy') {
  deploy().catch((error) => fail(error.message));
} else if (command === 'package') {
  packageOnly();
} else {
  fail('Usage:\n  npm run azure:setup -- <app-name> [--location indiasouthcentral]\n  npm run azure:deploy');
}
