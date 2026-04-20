# Production Deployment Guide: DigitalOcean & GitHub Actions

This guide provides a professional roadmap for hosting your blog platform on a **DigitalOcean Droplet** (VPS) with automated deployments via **GitHub Actions**.

---

## 🏗️ 1. Infrastructure Setup

### Create a DigitalOcean Droplet
1.  **Sign up** at [digitalocean.com](https://www.digitalocean.com/).
2.  **Create a Droplet**:
    - **Image**: Ubuntu 22.04 LTS.
    - **Size**: At least **2GB RAM** (Basic Plan) is recommended for 7+ Docker containers.
    - **Authentication**: SSH Keys (Recommended) or Password.
3.  **Install Docker on the Droplet**:
    Once logged into your droplet via SSH (`ssh root@your_ip`):
    ```bash
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    ```

---

## 🔒 2. SSL & Reverse Proxy (Accessing your Site)

Since you don't have a domain yet, we will use **Nginx Proxy Manager** (NPM) to provide a web-based UI for managing access and SSL later.

1.  We will include NPM in your `docker-compose.prod.yml`.
2.  You will be able to access your site via `http://your_droplet_ip`.
3.  **When you get a domain**: You can point it to your IP and use NPM's "Let's Encrypt" feature for free SSL (HTTPS).

---

## 🔑 3. Authentication (Clerk)

You must configure **Clerk** to allow your production URL:
1.  Go to the [Clerk Dashboard](https://dashboard.clerk.com/).
2.  In **Paths/Redirects**, update your URLs to use `http://your_droplet_ip` (and later your domain).
3.  Note your **Production Publishable Key** and **Secret Key**.

---

## 🤖 4. Automated Deployment (GitHub Actions)

We will use the included `deploy.yml` workflow. You need to add these **Repository Secrets** in GitHub (Settings -> Secrets and variables -> Actions):

| Secret Name | Description |
| :--- | :--- |
| `SERVER_IP` | Your DigitalOcean Droplet IP address |
| `SERVER_USER` | Usually `root` |
| `SSH_PRIVATE_KEY` | The private key that matches the public key on your Droplet |
| `GH_TOKEN` | A Classic Personal Access Token with `write:packages` scope |
| `VITE_CLERK_PUBLISHABLE_KEY` | Your Clerk production key |
| `CLERK_SECRET_KEY` | Your Clerk production secret |

---

## 🛠️ 5. Deployment Commands

The GitHub Action will handle this, but for the first time, you will:
1.  Connect via SSH: `ssh root@your_droplet_ip`.
2.  Clone your repo: `git clone your-repo-url`.
3.  Create the `.env` file: `nano .env` (Copy values from `.env.prod.example`).
4.  Run: `docker compose -f docker-compose.prod.yml up -d`.

---

## 📊 6. Database Strategy
For this guide, we keep using **SQLite** with a persistent Docker volume. 
**Long-term recommendation**: Move to a Managed PostgreSQL database for easier backups and better performance as your traffic grows.
