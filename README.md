# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
bun x sv@0.16.2 create --template minimal --types ts --add prettier eslint drizzle="database:postgresql+postgresql:postgres.js+docker:yes" better-auth="demo:password" tailwindcss="plugins:typography,forms" mdsvex --install bun clover-trivia
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Production deployment

This repository includes a production stack using a Bun-built SvelteKit image, PostgreSQL 15, Nginx, and Certbot.

The application image runs `drizzle-kit migrate` before starting SvelteKit, so the checked-in SQL migrations are applied automatically after the database is healthy. PostgreSQL data and Let’s Encrypt certificates are persisted in Docker volumes.

### Server setup

Install Docker Engine with the Docker Compose plugin, clone this repository on the server, and create the production environment file:

```sh
cp .env.production.example .env.production
```

Fill in every secret and replace the example domain. `DATABASE_URL` must retain `db` as its host because it connects to the Compose PostgreSQL service. Keep `.env.production` only on the server; it is ignored by Git.

Point the domain’s DNS A/AAAA record at the server, and allow inbound TCP ports 80 and 443. For the first certificate only, run:

```sh
./scripts/init-letsencrypt.sh
```

That starts the HTTP challenge endpoint, requests the certificate, enables the TLS Nginx configuration, and starts automatic certificate renewal. The `nginx_reloader` service reloads Nginx periodically so renewed certificates are picked up without downtime.

For regular updates, set `APP_IMAGE` to the desired Docker Hub image and run:

```sh
docker compose --env-file .env.production -f docker-compose.production.yml pull app
docker compose --env-file .env.production -f docker-compose.production.yml up -d --remove-orphans
```

### GitHub Actions secrets

The workflow at `.github/workflows/deploy.yml` runs checks/tests, publishes both `latest` and commit-SHA images to Docker Hub, then updates the server over SSH. Configure these repository secrets:

- `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`
- `SERVER_HOST`, `SERVER_USER`, and `SERVER_SSH_KEY`
- `DEPLOY_PATH` — absolute path to the cloned repository on the server

The server checkout must have an `origin` remote and be on `main`; the deployment workflow uses `git pull --ff-only` before running Compose.
