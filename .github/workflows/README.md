# GitHub Actions CI/CD Pipeline

## Overview

Automated pipeline that runs tests, builds the application, and deploys to Coolify on every push to `main`.

## Workflows

### `ci.yml` - Main CI/CD Pipeline

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Jobs:**

1. **Test** (always runs)
   - Type checking (`npm run check`)
   - Unit tests (`npm test`)
   - Uploads coverage reports

2. **Build** (runs after tests pass)
   - Builds application (`npm run build`)
   - Uploads build artifacts (kept for 7 days)

3. **Deploy** (runs only on `main` push)
   - Triggers Coolify deployment via webhook
   - Only runs if tests and build succeed

4. **Notify** (runs on failure)
   - Sends notification when pipeline fails
   - Can be extended with Slack/Discord webhooks

## Setup Instructions

### 1. Enable GitHub Actions

Actions are automatically enabled for this repository. Check the **Actions** tab on GitHub.

### 2. Configure Coolify Auto-Deploy

1. Go to your Coolify dashboard
2. Navigate to your application
3. Find the **Webhooks** section
4. Copy the deployment webhook URL
5. Add it to GitHub repository secrets:
   - Go to: Settings → Secrets and variables → Actions
   - Create new secret: `COOLIFY_WEBHOOK_URL`
   - Paste the webhook URL

6. Uncomment the deployment step in `.github/workflows/ci.yml`:
   ```yaml
   - name: Deploy via webhook
     run: |
       curl -X POST ${{ secrets.COOLIFY_WEBHOOK_URL }}
   ```

### 3. (Optional) Add Slack Notifications

1. Create a Slack webhook URL
2. Add to GitHub secrets as `SLACK_WEBHOOK`
3. Uncomment the Slack notification step in the workflow

## Pipeline Status

You can view the pipeline status in:
- Pull request checks
- Commit status badges
- Actions tab on GitHub

### Add Status Badge to README

```markdown
![CI/CD Pipeline](https://github.com/pawelmuchewicz/CSM-System-Obecnosci-2.0/actions/workflows/ci.yml/badge.svg)
```

## Local Testing

Before pushing, you can run the same checks locally:

```bash
# Type checking
npm run check

# Tests
npm test

# Build
npm run build
```

## Troubleshooting

### Tests fail in CI but pass locally
- Ensure all dependencies are in `package.json`
- Check for environment-specific issues
- Review test output in GitHub Actions logs

### Build fails
- Check Node.js version matches (v20)
- Ensure all build dependencies are installed
- Review build logs for specific errors

### Deployment doesn't trigger
- Verify `COOLIFY_WEBHOOK_URL` secret is set
- Check webhook URL is correct
- Ensure deployment step is uncommented
- Verify push is to `main` branch

## Security Notes

- Never commit webhook URLs or secrets to the repository
- Always use GitHub Secrets for sensitive data
- Webhook URLs should be treated as passwords
- Rotate secrets if accidentally exposed
