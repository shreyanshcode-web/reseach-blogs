import asyncio
import os
import sys
from datetime import datetime, timezone

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from sqlalchemy import select
from app.db.database import async_session
from app.models.user import User
from app.models.post import Post

async def populate_welcome_posts():
    async with async_session() as session:
        # 1. Find or create an admin user
        result = await session.execute(select(User).where(User.is_admin == True))
        admin = result.scalars().first()
        
        if not admin:
            print("No admin user found. Creating a default admin...")
            admin = User(
                username="admin",
                email="admin@example.com",
                hashed_password="hashed_password_placeholder",
                is_admin=True,
                is_active=True,
                is_verified=True
            )
            session.add(admin)
            await session.flush()
        
        # 2. Create 5 welcoming blog posts
        welcome_posts = [
            {
                "title": "Welcome to The Making Of!",
                "content": "We're thrilled to have you here. This platform is dedicated to the process, the journey, and the craft behind every great creation.",
                "author_id": admin.id,
                "published": True,
                "moderation_status": "approved"
            },
            {
                "title": "Explore Our Creative Community",
                "content": "Discover stories from makers, artists, and researchers who are pushing the boundaries of what's possible.",
                "author_id": admin.id,
                "published": True,
                "moderation_status": "approved"
            },
            {
                "title": "Share Your Own Story",
                "content": "Don't just be a spectator—become a contributor. Use our dashboard to start writing your first post today.",
                "author_id": admin.id,
                "published": True,
                "moderation_status": "approved"
            },
            {
                "title": "A New Era of Digital Research",
                "content": "We believe that sharing the 'making of' is just as important as the final result. Join us in documenting the future.",
                "author_id": admin.id,
                "published": True,
                "moderation_status": "approved"
            },
            {
                "title": "Connect and Collaborate",
                "content": "Engagement is at the heart of our platform. Like, share, and comment on the stories that inspire you.",
                "author_id": admin.id,
                "published": True,
                "moderation_status": "approved"
            }
        ]
        
        for post_data in welcome_posts:
            # Check if post already exists to avoid duplicates
            existing_result = await session.execute(select(Post).where(Post.title == post_data["title"]))
            if existing_result.scalars().first():
                print(f"Post '{post_data['title']}' already exists. Skipping.")
                continue
                
            post = Post(**post_data)
            session.add(post)
        
        await session.commit()
        print("Successfully ensured 5 welcoming blog posts exist.")

if __name__ == "__main__":
    asyncio.run(populate_welcome_posts())
