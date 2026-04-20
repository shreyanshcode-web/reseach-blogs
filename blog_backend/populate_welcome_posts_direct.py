import json
import os
import sqlite3
from datetime import datetime, timezone

import bcrypt

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


def build_content(post_data: dict) -> str:
    markdown = "\n\n".join(post_data["paragraphs"])
    return json.dumps(
        {
            "version": 1,
            "metadata": {
                "subtitle": post_data["subtitle"],
                "description": post_data["description"],
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
                    "excerpt": post_data["description"],
                    "readingMinutes": 1,
                    "wordCount": len(markdown.split()),
                },
            },
            "blocks": [
                {"type": "paragraph", "content": paragraph}
                for paragraph in post_data["paragraphs"]
            ],
            "markdown": markdown,
        }
    )


def hash_admin_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def ensure_column(cursor, table_name: str, column_name: str, definition: str):
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = {row[1] for row in cursor.fetchall()}
    if column_name in columns:
      return
    cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}")
    print(f"Added missing column {table_name}.{column_name}")


def ensure_schema(cursor):
    ensure_column(cursor, "users", "is_verified", "BOOLEAN DEFAULT 0")
    ensure_column(cursor, "users", "is_admin", "BOOLEAN DEFAULT 0")
    ensure_column(cursor, "users", "is_suspended", "BOOLEAN DEFAULT 0")
    ensure_column(cursor, "users", "suspended_reason", "VARCHAR(500)")
    ensure_column(cursor, "users", "moderation_strikes", "INTEGER DEFAULT 0")
    ensure_column(cursor, "users", "banned_until", "DATETIME")

    ensure_column(cursor, "posts", "moderation_status", "VARCHAR(20) DEFAULT 'approved'")
    ensure_column(cursor, "posts", "moderation_score", "FLOAT")
    ensure_column(cursor, "posts", "is_suspended", "BOOLEAN DEFAULT 0")
    ensure_column(cursor, "posts", "suspended_reason", "VARCHAR(500)")


def populate_welcome_posts():
    db_path = os.getenv("WELCOME_DB_PATH", "blog.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        ensure_schema(cursor)

        cursor.execute("SELECT id FROM users WHERE is_admin = 1 LIMIT 1")
        row = cursor.fetchone()

        if row:
            admin_id = row[0]
        else:
            now = datetime.now(timezone.utc).isoformat()
            cursor.execute(
                """
                INSERT INTO users
                (username, email, hashed_password, is_active, is_verified, is_admin, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    DEFAULT_ADMIN_USERNAME,
                    DEFAULT_ADMIN_EMAIL,
                    hash_admin_password(DEFAULT_ADMIN_PASSWORD),
                    1,
                    1,
                    1,
                    now,
                ),
            )
            admin_id = cursor.lastrowid
            print(
                f"Created default admin user: {DEFAULT_ADMIN_EMAIL} / {DEFAULT_ADMIN_PASSWORD}. "
                "Please change this password after first login."
            )

        now = datetime.now(timezone.utc).isoformat()

        for post_data in WELCOME_POSTS:
            cursor.execute("SELECT id FROM posts WHERE title = ?", (post_data["title"],))
            existing = cursor.fetchone()
            content_json = build_content(post_data)

            if existing:
                cursor.execute(
                    """
                    UPDATE posts
                    SET content = ?, published = 1, moderation_status = ?, moderation_score = ?, author_id = ?, is_suspended = 0, suspended_reason = NULL, updated_at = ?
                    WHERE id = ?
                    """,
                    (content_json, "approved", 1.0, admin_id, now, existing[0]),
                )
                print(f"Updated welcome post '{post_data['title']}'.")
                continue

            cursor.execute(
                """
                INSERT INTO posts
                (
                    title, content, published, moderation_status, moderation_score,
                    view_count, unique_view_count, like_count, comment_count, share_count, bookmark_count,
                    is_suspended, suspended_reason, author_id, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    post_data["title"], content_json, 1, "approved", 1.0,
                    0, 0, 0, 0, 0, 0,
                    0, None, admin_id, now, now,
                ),
            )
            print(f"Created welcome post '{post_data['title']}'.")

        conn.commit()
        print("Admin welcome posts are ready.")

    except Exception as error:
        print(f"Error: {error}")
        conn.rollback()
    finally:
        conn.close()


if __name__ == "__main__":
    populate_welcome_posts()
