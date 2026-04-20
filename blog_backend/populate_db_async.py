import asyncio
from sqlalchemy import select
from app.db.database import async_session, engine, Base
# Import all models to ensure relationships are set up
import app.models.user_profile
import app.models.follow
from app.models.user import User
from app.models.post import Post

async def populate_db():
    # Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with async_session() as session:
        # Check if testuser already exists
        result = await session.execute(select(User).where(User.username == "testuser"))
        user = result.scalars().first()
        
        if not user:
            # Create a test user
            user = User(
                username="testuser",
                email="test@example.com",
                hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5YmMxSUGyKwFm",
                is_active=True,
                is_verified=True,
                is_admin=True
            )
            session.add(user)
            await session.flush()
            print(f"Created test user: {user.username} (id={user.id})")
        else:
            print(f"Test user already exists: {user.username} (id={user.id})")
        
        # Create welcome posts
        welcome_posts = [
            ("Welcome to The Making Of!", "We're thrilled to have you here. This platform is dedicated to the process, the journey, and the craft behind every great creation."),
            ("Explore Our Creative Community", "Discover stories from makers, artists, and researchers who are pushing the boundaries of what's possible."),
            ("Share Your Own Story", "Don't just be a spectator—become a contributor. Use our dashboard to start writing your first post today."),
            ("A New Era of Digital Research", "We believe that sharing the 'making of' is just as important as the final result. Join us in documenting the future."),
            ("Connect and Collaborate", "Engagement is at the heart of our platform. Like, share, and comment on the stories that inspire you.")
        ]
        
        for title, content_text in welcome_posts:
            result = await session.execute(select(Post).where(Post.title == title))
            existing_post = result.scalars().first()
            if existing_post:
                print(f"Post '{title}' already exists. Skipping.")
                continue
            
            post = Post(
                title=title,
                content=content_text,
                published=True,
                author_id=user.id,
                moderation_status="approved"
            )
            session.add(post)
            print(f"Created post: {title}")
        
        await session.commit()
        print("Database population complete!")

if __name__ == "__main__":
    asyncio.run(populate_db())
