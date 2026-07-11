# GitHub Actions deployment for Yessal

This repository is configured for a free GitHub Actions deployment flow:

- `dev` push -> deploys to your HPR/dev VPS
- `main` push after a PR merge -> deploys to production VPS
- `api-yessal` tests must pass
- `manager-app-yessal` tests must pass

## What you need on GitHub

Create two GitHub Environments:

- `hpr`
- `production`

In each environment, add these secrets:

- `SSH_HOST`
- `SSH_USER`
- `SSH_PRIVATE_KEY`
- `SSH_PORT`
- `DEPLOY_ROOT`
- `API_SERVICE_NAME`
- `MANAGER_SERVICE_NAME`

## What you need on the server

The server must already contain a clone of this repository at the path provided in `DEPLOY_ROOT`.

The workflow expects these folders inside that clone:

- `api-yessal`
- `manager-app-yessal`

The server user used by SSH must be able to run `systemctl restart ...` for the two services, either as `root` or via passwordless `sudo`.

## Branch behavior

- Push to `dev`: tests run, then HPR deploy runs
- Push to `main`: tests run, then production deploy runs
- Pull requests to `dev` or `main`: only tests run

## Notes

- The API deploy runs `npm ci`, `npx prisma generate`, and `npx prisma migrate deploy`.
- The manager app deploy runs `npm ci` and `npm run build`.
- If your service names differ from the current ones, update `API_SERVICE_NAME` and `MANAGER_SERVICE_NAME` in GitHub secrets.