# wedding-invite
Digital Invitation for guests with rsvp form

## Deploying

The site is static: everything published lives in `site/`. Pick the host in `deploy.config.json`
(`"platform": "vercel" | "netlify" | "github-pages"`), then run:

    python3 tools/deploy.py

This writes the config for that host (`vercel.json`, `netlify.toml` or `.github/workflows/pages.yml`) and removes the others.
Commit and push the result.

- **Vercel**: import the repo at vercel.com/new (no build command, no framework; `vercel.json` sets the output folder).
  Deploy the branch you push to (set it as the Production Branch in Settings -> Git).
- **Netlify**: connect the repo, or drag the `site/` folder onto app.netlify.com/drop.
- **GitHub Pages**: Settings -> Pages -> Source: "GitHub Actions". Deploys on push to `main`. No cache headers.
