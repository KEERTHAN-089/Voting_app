# Voting App

Create and run voting sessions for anything: class leader, club president, team captain. Anyone can sign in and create a session, and many sessions can run at the same time without affecting each other.

Built with MongoDB, Express, React and Node.

## How a session works

1. **Create.** Sign in, press **Create a voting session**, and fill in one form: what the vote is for, the maximum number of voters, whether voters take a selfie, and when results become visible. Optionally paste the emails of the people allowed to vote.
2. **Add candidates** on the Candidates tab.
3. **Share** the QR code or link from the Share tab.
4. **Voters join** by scanning the code and signing in with their email. Anyone on your email list is approved automatically. Everyone else appears on the Voters tab for you to approve or reject.
5. **Open voting.** Each approved voter gets one vote.
6. **Close voting** to end the session, see the final result and download it as a CSV file.

## What keeps a vote fair

- **One vote each.** A vote is recorded in a single database transaction that only succeeds for a voter who has not voted yet, so double-clicking or sending many requests at once still counts once.
- **Voter limit.** Approvals stop at the number you set, so there can never be more votes than that.
- **Secret ballot.** The app stores that a voter has voted, and separately stores an anonymous ballot. It never stores who a voter chose. (Someone with direct access to the database server could still study its logs; the app itself cannot reveal a choice.)
- **Separate sessions.** Only the person who created a session can manage it, and only voters approved for a session can see its ballot or vote in it.

## Selfie options

Chosen per session:

| Option | What happens |
|---|---|
| No selfie | Sign-in and approval only. Fastest. |
| Photo record | Each voter takes a selfie when voting. The organizer can look at it if a vote is disputed. |
| Face match | Each voter takes a selfie when joining. Their face is compared again before they vote, and a different face is refused. |

Selfies are stored with the voter's record, not with their vote, and only the session's organizer can view them. After closing a session the organizer can delete all of its selfies from the Voters tab.

Face match is a deterrent, not proof of identity: it compares a live photo to the joining photo and has no liveness check, so a good printed photo of the voter could pass.

## Setup

You need Node.js 18 or newer and a MongoDB Atlas database (the free tier works).

1. Install dependencies:
   ```
   npm run install-all
   ```
2. Copy `backend/.env.example` to `backend/.env` and fill in `MONGODB_URI` and `JWT_SECRET`.
3. Create `frontend/.env` containing:
   ```
   PORT=3001
   ```
   The backend runs on port 3000 and the React dev server forwards `/api` requests to it.
4. Start both servers:
   ```
   npm run dev
   ```
5. Open http://localhost:3001.

To try it from a phone on the same Wi-Fi, open `http://<your computer's IP>:3001`. Selfie sessions need the camera, which phone browsers only allow over `https` or on `localhost`, so test those on the computer or on the deployed site.

### Trying it without a database

```
npm run demo
```

This starts everything on a temporary in-memory database, so no Atlas cluster is needed. All data is lost when you stop it, so use it only to try the app, never for a real vote.

### Sending sign-in codes by email

Until email is set up, sign-in codes are printed in the backend terminal instead of being emailed.

All codes are sent from one mailbox that belongs to the app. Create a new Gmail account for this instead of using a personal one: voters then see "Voting App" as the sender, replies stay out of your inbox, and Gmail's daily sending limit (about 500 recipients) is not shared with your own mail. Organizers never have to enter an email password.

Set these in `backend/.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=the-app-mailbox@gmail.com
SMTP_PASS=its 16-letter app password
```

`SMTP_PASS` is an app password, not the account's normal password. Turn on 2-Step Verification for that Google account, then create one at https://myaccount.google.com/apppasswords.

Emails are sent as `Voting App <SMTP_USER>`; set `MAIL_FROM` to change that. When someone signs in from a join link or QR code, the email names the session and its organizer.

Restart the backend and check the settings with:

```
cd backend
npm run test-email -- you@gmail.com
```

### Upgrading a database from the old version

The earlier version of this app (Aadhaar number and password login) left collections that stop new users from signing in. The server prints a warning at startup if it finds them. To see what would be removed, and then remove it:

```
cd backend
npm run reset-db
npm run reset-db -- --yes
```

## Environment variables (backend)

| Variable | Needed | Purpose |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB connection string. Must be a replica set (Atlas is). |
| `JWT_SECRET` | yes | Long random string used to sign login tokens. |
| `PORT` | no | Port to listen on. Defaults to 3000. |
| `NODE_ENV` | no | Set to `production` when deployed. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | for real email | Mail server used to send sign-in codes. |
| `FACE_MATCH_THRESHOLD` | no | Strictness of face match. Defaults to 0.5; lower is stricter. |

## Tests

```
cd backend
npm test            # API tests, including simultaneous-vote and voter-limit checks
npm run load-test   # simulates 400 voters across 4 sessions and reports response times
```

Both use a temporary in-memory database and never touch real data. The first run downloads a MongoDB binary.

## Deploying

The backend serves the built frontend, so one Node service runs everything.

### Azure App Service

Needs the [Azure CLI](https://aka.ms/installazurecliwindows) and a working `backend/.env`.

1. Sign in: `az login`.
2. In MongoDB Atlas → Network Access, allow `0.0.0.0/0`. Azure connects from several changing addresses; the database still needs its username and password.
3. Create the app once. The name becomes `https://<app-name>.azurewebsites.net` and must not be taken:
   ```
   npm run azure:setup -- <app-name>
   ```
   This creates the resource group `voting-app-rg` and a free (F1) Linux plan, or reuses a free plan you already have in that region. It then creates the web app on Node 24 LTS and copies the database and email settings from `backend/.env`, plus a new random `JWT_SECRET`.

   The default region is `indiasouthcentral` (Hyderabad), one of the few regions Azure for Students allows; if yours is refused, the script lists the allowed ones, and you rerun with `--location <region>`.
4. Upload, now and after every change:
   ```
   npm run azure:deploy
   ```
   This builds the frontend, packages the backend without `.env`, tests or dev tools, uploads it, and waits until the site answers.

**Without the Azure CLI (VS Code extension or portal).** Run `npm run azure:package`. Nothing is uploaded; it writes:
- `deploy/package/`: the folder to deploy;
- `deploy/app.zip`: the same, zipped;
- `deploy/app-settings.env`: the app settings, with a new `JWT_SECRET`. It contains passwords, and git ignores it.

Then:
1. Create a Linux web app on Node 24 LTS.
2. Upload `deploy/app-settings.env` as its application settings (in the extension: right-click Application Settings → Upload Local Settings).
3. Deploy the `deploy/package` folder.

No startup command is needed: the package's `npm start` runs the server.

To see what the live app is printing:
```
az webapp log tail --name <app-name> --resource-group voting-app-rg
```

**Free tier limits.** The app sleeps after about 20 minutes without visitors, so the next visitor waits up to a minute, and it gets 60 minutes of CPU time a day. For a real voting day, move to Basic B1, which is always on and uses your Azure credit, then move back afterwards:
```
az appservice plan update --name voting-app-plan --resource-group voting-app-rg --sku B1
az appservice plan update --name voting-app-plan --resource-group voting-app-rg --sku F1
```
(If setup reused an existing free plan, use that plan's name and resource group instead; the setup output shows them.)

### Render

`render.yaml` describes the same service for Render:

- Build: `cd backend && npm install && cd ../frontend && npm install && npm run build`
- Start: `node backend/server.js`
- Set `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production` and the `SMTP_*` values in the dashboard.

Use an always-on instance. A free instance that sleeps will make the first voters wait while it wakes up.

## API overview

All routes are under `/api`.

| Route | Who | Purpose |
|---|---|---|
| `POST /auth/request-code`, `POST /auth/verify-code` | anyone | Sign in with an emailed code |
| `POST /elections` | signed in | Create a session |
| `GET /elections/organizing`, `GET /elections/voting` | signed in | Sessions I run / sessions I joined |
| `GET /elections/join/:code`, `POST /elections/join/:code` | anyone / signed in | Look up and join a session |
| `GET /elections/:id/ballot`, `POST /elections/:id/vote` | approved voter | See candidates and vote |
| `GET /elections/:id/results` | voters (when visible), organizer | Vote counts |
| `/elections/:id/manage/...` | organizer | Settings, candidates, voters, open, close, CSV export |

## License

ISC
