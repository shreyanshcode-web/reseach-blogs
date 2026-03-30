import asyncio
import os
import sys
from datetime import datetime, timezone

import bcrypt
sys.path.append(os.getcwd())

from sqlalchemy import select

from app.db.database import async_session
from app.models.post import Post
from app.models.user import User

DEFAULT_ADMIN_EMAIL = "admin@example.com"
DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = os.getenv("WELCOME_ADMIN_PASSWORD", "AdminWelcome123!")

WELCOME_POSTS = [
    {
        "title": "Welcome to The Making Of",
        "subtitle": "A home for ideas, process, and the craft behind every finished piece.",
        "description": "Start here to understand why The Making Of exists and what kind of stories belong on the platform.",
        "category": "Admin",
        "tags": ["admin", "welcome", "platform", "about"],
        "cover_image": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80",
        "paragraphs": [
            "The Making Of is built for people who care about how things come together, not just how they look at the end.",
            "This platform is for essays, research notes, behind-the-scenes breakdowns, experiments, and hard-earned lessons that usually never make it into the polished final reveal.",
            "If you have ever wanted a place that values process as much as outcome, you are in the right space.",
        ],
    },
    {
        "title": "Why This Blog Platform Feels Different",
        "subtitle": "We designed the product around process, storytelling, and creator identity.",
        "description": "A quick tour of the platform's most distinctive ideas and why it stands apart from a generic blog CMS.",
        "category": "Admin",
        "tags": ["admin", "welcome", "unique", "product"],
        "cover_image": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=80",
        "paragraphs": [
            "Most blog tools are built to publish quickly. The Making Of is built to make the act of publishing feel thoughtful, expressive, and worth reading.",
            "The combination of immersive visuals, editorial layouts, creator dashboards, and richer metadata helps every story feel intentional from the first headline to the last paragraph.",
            "We want readers to slow down, stay curious, and feel like every article has a point of view.",
        ],
    },
    {
        "title": "What You Can Publish Here",
        "subtitle": "From deep dives to visual essays, this is a platform for serious creative publishing.",
        "description": "Learn what kinds of posts work best on The Making Of and how to use the editor to shape them.",
        "category": "Admin",
        "tags": ["admin", "welcome", "writing", "editor"],
        "cover_image": "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1400&q=80",
        "paragraphs": [
            "You can publish product breakdowns, design essays, engineering stories, creative research, cultural analysis, and long-form reflections.",
            "The editor is structured for richer storytelling, with room for imagery, embedded media, headings, and clean pacing between ideas.",
            "The best posts on this platform teach, reveal, document, or reframe something meaningful.",
        ],
    },
    {
        "title": "The Role of the Admin Welcome Posts",
        "subtitle": "These posts are here to orient readers and set the tone for the entire site.",
        "description": "Understand why the first five admin-tagged posts exist and how they guide new visitors through the platform.",
        "category": "Admin",
        "tags": ["admin", "welcome", "community", "guidance"],
        "cover_image": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80",
        "paragraphs": [
            "Admin-tagged welcome posts give first-time readers a fast understanding of what this site is for, what makes it unique, and how to participate.",
            "They are not filler content. They act like a curated front door for the product, especially while the community is still growing.",
            "As the platform evolves, these posts can also anchor updates, editorial notes, and community direction.",
        ],
    },
    {
        "title": "Start Reading, Then Start Writing",
        "subtitle": "The best way to understand the platform is to experience both sides of it.",
        "description": "A final welcome note inviting readers to explore the platform and then become contributors themselves.",
        "category": "Admin",
        "tags": ["admin", "welcome", "community", "cta"],
        "cover_image": "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1400&q=80",
        "paragraphs": [
            "Read a few stories, explore how different creators shape their ideas, and notice the tone the platform encourages.",
            "Then open the editor and publish something of your own. A great platform for writing should make contribution feel inviting, not intimidating.",
            "The Making Of is meant to become a living archive of process, thought, and creative momentum.",
        ],
    },
]


def build_content(post_data: dict) -> dict:
    markdown = "\n\n".join(post_data["paragraphs"])
    description = post_data["description"]
    return {
        "version": 1,
        "metadata": {
            "subtitle": post_data["subtitle"],
            "description": description,
            "category": post_data["category"],
            "tags": post_data["tags"],
            "author": "Admin",
            "coverImage": {
                "url": post_data["cover_image"],
                "positionX": 0,
                "positionY": 0,
                "zoom": 1,
            },
            "seo": {
                "excerpt": description,
                "readingMinutes": 1,
                "wordCount": len(markdown.split()),
            },
        },
        "blocks": [
            {
                "type": "paragraph",
                "content": paragraph,
            }
            for paragraph in post_data["paragraphs"]
        ],
        "markdown": markdown,
    }


def hash_admin_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


async def ensure_admin(session) -> User:
    result = await session.execute(select(User).where(User.is_admin.is_(True)))
    admin = result.scalars().first()

    if admin:
        return admin

    admin = User(
        username=DEFAULT_ADMIN_USERNAME,
        email=DEFAULT_ADMIN_EMAIL,
        hashed_password=hash_admin_password(DEFAULT_ADMIN_PASSWORD),
        is_admin=True,
        is_active=True,
        is_verified=True,
    )
    session.add(admin)
    await session.flush()
    print(
        f"Created default admin user: {DEFAULT_ADMIN_EMAIL} / {DEFAULT_ADMIN_PASSWORD}. "
        "Please change this password after first login."
    )
    return admin


async def populate_welcome_posts():
    async with async_session() as session:
        admin = await ensure_admin(session)
        now = datetime.now(timezone.utc)

        for post_data in WELCOME_POSTS:
            existing_result = await session.execute(
                select(Post).where(Post.title == post_data["title"])
            )
            existing = existing_result.scalars().first()
            content = build_content(post_data)

            if existing:
                existing.content = content
                existing.author_id = admin.id
                existing.published = True
                existing.moderation_status = "approved"
                existing.moderation_score = 1.0
                existing.updated_at = now
                print(f"Updated welcome post '{post_data['title']}'.")
                continue

            session.add(
                Post(
                    title=post_data["title"],
                    content=content,
                    author_id=admin.id,
                    published=True,
                    moderation_status="approved",
                    moderation_score=1.0,
                    created_at=now,
                    updated_at=now,
                )
            )
            print(f"Created welcome post '{post_data['title']}'.")

        await session.commit()
        print("Admin welcome posts are ready.")


if __name__ == "__main__":
    asyncio.run(populate_welcome_posts())
