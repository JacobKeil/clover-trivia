# Clover Trivia

Clover Trivia is a web app for running live trivia nights. Hosts can create locations and games, build question rounds, manage teams and scores, run the host view during a game, and publish player-facing pages for submissions and recaps.

It is built with SvelteKit, Bun, PostgreSQL, Drizzle ORM, Better Auth, and S3-compatible image storage.

## Features

- Create and manage trivia locations, games, rounds, categories, and questions.
- Run a host-facing game view with scorecards, a leaderboard, scoring controls, and score history.
- Let players submit “Stump the Host” questions and view game recaps.
- Authenticate hosts with Google through Better Auth.
- Upload question images to an S3 bucket.

## Tech stack

| Area           | Technology                                       |
| -------------- | ------------------------------------------------ |
| Application    | SvelteKit 2, Svelte 5, TypeScript, Bun           |
| Database       | PostgreSQL 15 and Drizzle ORM                    |
| Authentication | Better Auth with Google OAuth                    |
| File storage   | Amazon S3 or an S3-compatible provider           |
| Production     | Docker Compose, Nginx, and Let’s Encrypt/Certbot |

## Local development

### Prerequisites

- [Bun](https://bun.sh/) (the version pinned by `bun.lock`)
- Docker with Docker Compose, for PostgreSQL
- A Google OAuth application if you want to test sign-in locally
- An S3 bucket and credentials if you want to test image uploads

### 1. Install dependencies

```sh
bun install --frozen-lockfile
```

### 2. Configure local environment variables

```sh
cp .env.example .env
```

Set `ORIGIN` to the local address you use, normally `http://localhost:5173`, and generate a high-entropy `BETTER_AUTH_SECRET`. Add Google and S3 settings when those features are needed.

```dotenv
ORIGIN=http://localhost:5173
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
AWS_S3_BUCKET_NAME=your-bucket
AMS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
```

> `AMS_ACCESS_KEY_ID` is the environment variable currently used by the application; keep that spelling when configuring S3 credentials.

### 3. Start PostgreSQL and apply migrations

```sh
docker compose up -d
bun run db:migrate
```

The local Compose database uses the `DATABASE_URL` provided in `.env.example` by default. To stop it later, run `docker compose down`.

### 4. Run the app

```sh
bun run dev
```

Open the address printed by Vite, usually <http://localhost:5173>.

## Useful commands

```sh
# Validate TypeScript and Svelte files
bun run check

# Run unit/component tests
bun run test

# Check formatting and linting
bun run lint

# Apply formatting fixes
bun run format

# Create a production build
bun run build

# Generate or apply database migrations
bun run db:generate
bun run db:migrate

# Seed the local O'Brien's example data
bun run seed:obriens
```

Run `bun run check`, `bun run test`, and `bun run lint` before opening a pull request or pushing a production release.

## Production deployment on Linode

Production uses four main services: the SvelteKit application, PostgreSQL, Nginx, and Certbot. Application images are built with Docker; PostgreSQL data and TLS certificates are stored in named Docker volumes.

### Server prerequisites

On the Linode server:

1. Install Docker Engine and the Docker Compose plugin.
2. Clone this repository to a persistent deployment directory on the `main` branch.
3. Point the domain’s DNS A/AAAA record to the server.
4. Allow inbound TCP ports 80 and 443 in Linode Cloud Firewall and the server firewall.

### Configure production secrets

On the server, create the environment file:

```sh
cp .env.production.example .env.production
chmod 600 .env.production
```

Fill in every value. `DATABASE_URL` must use `db` as its hostname, since the app connects to the PostgreSQL Compose service. Do not commit `.env.production`.

Important values include:

- `DOMAIN` and `ORIGIN`, using the public HTTPS domain.
- `BODY_SIZE_LIMIT=20M` to permit multipart image uploads. Keep it aligned with
  Nginx's `client_max_body_size` in `deploy/nginx/tls.conf.template`.
- A unique long `POSTGRES_PASSWORD` and matching password in `DATABASE_URL`.
- A 32+-character `BETTER_AUTH_SECRET`.
- Google OAuth credentials, with the production callback URL registered in Google Cloud.
- S3 bucket credentials and region if image uploads are enabled.
- `APP_IMAGE`, unless GitHub Actions sets it during deployment.

### Issue the first TLS certificate

After DNS is live and port 80 is reachable, run this once from the server checkout:

```sh
./scripts/init-letsencrypt.sh
```

The script obtains the certificate, adds the TLS Nginx configuration, and starts automatic certificate renewal. Do not run the normal HTTPS stack first; the bootstrap script initially serves the ACME HTTP challenge.

### Deploy or update manually

Build and publish an application image to your registry, set `APP_IMAGE` in `.env.production`, then run:

```sh
docker compose --env-file .env.production -f docker-compose.production.yml pull app
docker compose --env-file .env.production -f docker-compose.production.yml up -d --remove-orphans
```

The application runs checked-in Drizzle migrations before it starts. Check the deployed services with:

```sh
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml logs -f app
```

### View production data with Drizzle Studio

Studio is an on-demand service and is bound only to the server's loopback interface;
do not expose its port publicly. On the server, start it with:

```sh
docker compose --env-file .env.production -f docker-compose.production.yml --profile studio up -d studio
```

From your computer, create an SSH tunnel (replace the SSH user and server):

```sh
ssh -N -L 4983:127.0.0.1:4983 your-user@your-server
```

While that tunnel is running, open `https://local.drizzle.studio` in your browser.
Studio has write access to the production database, so use it carefully. Stop the
service when finished:

```sh
docker compose --env-file .env.production -f docker-compose.production.yml --profile studio stop studio
```

## GitHub Actions deployment

Pushing to `main` runs `.github/workflows/deploy.yml`. The workflow validates the app, publishes both `latest` and commit-SHA Docker images to Docker Hub, then connects to the Linode server to pull and start that exact image.

Configure these GitHub repository secrets:

| Secret               | Purpose                                            |
| -------------------- | -------------------------------------------------- |
| `DOCKERHUB_USERNAME` | Docker Hub account or organization name            |
| `DOCKERHUB_TOKEN`    | Docker Hub access token with permission to publish |
| `SERVER_HOST`        | Linode IP address or hostname                      |
| `SERVER_USER`        | SSH deployment user                                |
| `SERVER_SSH_KEY`     | Private SSH key for that user                      |
| `DEPLOY_PATH`        | Absolute path to this repository on the server     |

The server checkout must have an `origin` remote, be on `main`, and be able to run `git pull --ff-only` without prompting.

## Environment files and security

- `.env` is for local development and is ignored by Git.
- `.env.production` belongs only on the server and is ignored by Git.
- `.env.example` and `.env.production.example` document required variables without real credentials.
- Rotate any credential that was ever committed or shared outside its intended secret store.

## Project structure

```text
src/routes/       Application pages and server endpoints
src/lib/          Shared UI, game logic, auth, database, and storage code
drizzle/          Versioned SQL migrations and Drizzle metadata
deploy/nginx/     HTTP and TLS Nginx configuration
scripts/          Database seeding and Let’s Encrypt bootstrap helpers
```
