# LNMU NETWORK — Student Information Portal

Responsive, non-official LNMU student information website based on the supplied mobile design.

## Architecture

- **Public frontend:** Static HTML/CSS/JavaScript hosted with GitHub Pages.
- **Repository:** Keep this GitHub repository private. The published Pages website itself is public.
- **Notice data:** `data/notices.json` and `data/portals.json`.
- **Admin UI:** `/admin/`; drag-and-drop ordering, add/edit/delete, pin and publish/draft.
- **Admin authentication/write API:** Cloudflare Worker + KV session store + GitHub OAuth App.
- **PDFs:** No uploads. Add only external PDF/official URLs.

> Important: GitHub Pages cannot securely authenticate an administrator and write to a private repository by itself. A small Cloudflare Worker is required for OAuth token exchange and GitHub API writes. The Worker is an authentication/API bridge, not the website host or notice database. The Worker session cookie is cross-site (`SameSite=None; Secure`); browser third-party-cookie restrictions may affect this split-domain setup. For the most reliable production setup, use a custom domain and place the Worker API under the same site or use a GitHub App-based backend with an appropriate same-site routing arrangement.

## 1. Create the private GitHub repository

1. Create a private repository named `lnmu-network`.
2. Upload all project files to the repository root.
3. Push to the `main` branch.
4. In **Settings → Pages**, choose **GitHub Actions** as the build/deployment source.
5. Check the repository plan/organization policy supports Pages publishing from a private repository. The deployed Pages site is public unless you have an eligible access-control configuration.

## 2. Configure GitHub OAuth

For a quick personal deployment, create a GitHub OAuth App in **GitHub Settings → Developer settings → OAuth Apps**.

- Homepage URL: your GitHub Pages URL.
- Authorization callback URL: `https://YOUR-WORKER.workers.dev/auth/callback`
- Save Client ID and Client Secret.

The Worker requests the classic OAuth `repo` scope so it can update files in the private repository. The Worker checks `ADMIN_GITHUB_LOGIN` against the authenticated GitHub username. Do not share the OAuth Client Secret. This is a broad repository permission; use a GitHub App with repository-only Contents permission for a least-privilege production setup.

**Security note:** A classic GitHub OAuth App may require broad `repo` scope to write to a private repository. For stronger least-privilege access, use a GitHub App configured with repository-only **Contents: Read and write** permission and adapt the OAuth exchange to GitHub App user access tokens. Do not place any token or secret in frontend JavaScript.

## 3. Configure Cloudflare Worker

1. Create a Cloudflare account and a Worker named `lnmu-network-admin`.
2. Create a KV namespace, e.g. `LNMU_SESSIONS`.
3. Bind the namespace as `SESSIONS`.
4. Set Worker variables:
   - `GITHUB_OWNER` — GitHub username or organization.
   - `GITHUB_REPO` — `lnmu-network`.
   - `ADMIN_GITHUB_LOGIN` — your exact GitHub login.
   - `SITE_ORIGIN` — `https://USERNAME.github.io` (or your custom domain origin).
   - `OAUTH_CALLBACK_URL` — Worker callback URL.
   - `ADMIN_RETURN_URL` — full public admin URL.
5. Set Worker secrets:
   - `GITHUB_APP_CLIENT_ID`
   - `GITHUB_APP_CLIENT_SECRET`
6. Deploy `worker/index.js` and configure `worker/wrangler.toml` using your real IDs and URLs.
7. Update `API` at the top of `admin/admin.js` to your deployed Worker URL.

## 4. Admin usage

1. Open `https://USERNAME.github.io/lnmu-network/admin/`.
2. Click **Continue with GitHub**.
3. Sign in with the allowlisted account.
4. Add title, description, category, date and external URL.
5. Use the notice list to edit/delete or drag rows to reorder.
6. Click **Save Notice** or **Save Order**. The Worker commits `data/notices.json` to the private repository.

## 5. Important configuration

- GitHub Pages project-site URL is usually `https://USERNAME.github.io/lnmu-network/`.
- If using a project-site URL, set `SITE_ORIGIN` to `https://USERNAME.github.io` (origin only), and `ADMIN_RETURN_URL` to `https://USERNAME.github.io/lnmu-network/admin/`.
- `admin/admin.js` currently contains a placeholder Worker URL. Replace it before deployment.
- The sample portal URLs are starter entries. Verify every portal URL before public launch.
- Update social links, contact email, and legal pages before launch.
- The site is explicitly labelled as non-official. Do not imply university endorsement.

## 6. Local preview

Run a static server from the project root, for example:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`. The public website works locally. Admin API login will not work until the Worker is deployed and configured.

## Project files

```text
.
├── index.html
├── assets/
│   ├── css/style.css
│   └── js/app.js
├── admin/
│   ├── index.html
│   └── admin.js
├── data/
│   ├── notices.json
│   └── portals.json
├── worker/
│   ├── index.js
│   └── wrangler.toml
└── .github/workflows/pages.yml
```
