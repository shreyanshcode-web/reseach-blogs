# TRUE FREE DEPLOYMENT: $0 Hosting Guide

You can host this platform entirely for free using one of these two paths. 

---

## 💎 Option A: The "Performance King" (Oracle Cloud)
**Best for**: Speed, scale, and running your current multi-container setup exactly as it is locally.
**Specs**: 4 ARM Cores, 24GB RAM, 200GB Storage (Always Free).

### Steps:
1.  **Sign up** at [oracle.com/cloud/free/](https://www.oracle.com/cloud/free/). 
    - *Note: Requires a credit card for identity check ($1 hold, later released).*
2.  **Create a Compute Instance**:
    - **Image**: Canonical Ubuntu 22.04 (ARM "Ampere" Processor).
    - **Shape**: VM.Standard.A1.Flex (Max it out to 4 OCPUs and 24GB RAM).
3.  **Setup Docker**: Follow the `deployment_guide.md` I gave you earlier to install Docker.
4.  **Open Ports**: In the Oracle Console (Security Lists), allow incoming traffic on ports **80** (HTTP) and **443** (HTTPS).
5.  **Deploy**: Use your existing `docker-compose.yml` (or `docker-compose.prod.yml`).

---

## ⚡ Option B: The "No Credit Card" Path (Render / Railway)
**Best for**: Fast setup and avoiding identity/credit card checks.
**Specs**: Typically 512MB RAM / 1 Shared CPU.

Because these platforms have tiny memory limits, I created a **[Dockerfile.monolith](file:///Users/aayushkumarsingh/Desktop/reseach-blogs/Dockerfile.monolith)** for you. It packs everything into one container to save hundreds of megabytes of overhead.

### Steps for Render:
1.  **GitHub**: Push your code to a GitHub repo.
2.  **Render Dashboard**: click **New** -> **Web Service**.
3.  **Connect Repo**: Select your blog repository.
4.  **Advanced Options**:
    - **Dockerfile Path**: `Dockerfile.monolith`.
    - **Plan**: Select the **Free** tier.
5.  **Environment Variables**: Add the keys from your `.env.prod.example`.
6.  **Deploy**: Render will build the monolith and give you a URL like `my-blog.onrender.com`.

---

## 💾 Saving More: Free Databases

To keep your compute instance lightweight, don't run the database yourself. Use a "Managed Free Tier" database:
1.  **[Supabase](https://supabase.com/)**: Gives you a free PostgreSQL database.
2.  **[Neon](https://neon.tech/)**: Another great serverless PostgreSQL option.

To use these, simply update your `DATABASE_URL` in the environment variables to point to your new Supabase/Neon connection string.

---

## 🚦 Verification
Once deployed, check your logs. Every service (Auth, Content, etc.) should report as "Started" inside the single console view.
