import sqlite3
import json
from datetime import datetime, timezone

def populate_welcome_posts():
    db_path = "blog.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 1. Use existing testuser (ID 1) as the "admin" for now
        # Ideally we'd have an is_admin column, but the current schema lacks it.
        admin_id = 1
        
        # 2. Create 5 welcoming blog posts
        welcome_posts = [
            ("Welcome to The Making Of!", "We're thrilled to have you here. This platform is dedicated to the process, the journey, and the craft behind every great creation."),
            ("Explore Our Creative Community", "Discover stories from makers, artists, and researchers who are pushing the boundaries of what's possible."),
            ("Share Your Own Story", "Don't just be a spectator—become a contributor. Use our dashboard to start writing your first post today."),
            ("A New Era of Digital Research", "We believe that sharing the 'making of' is just as important as the final result. Join us in documenting the future."),
            ("Connect and Collaborate", "Engagement is at the heart of our platform. Like, share, and comment on the stories that inspire you.")
        ]
        
        now = datetime.now(timezone.utc).isoformat()
        
        for title, content_text in welcome_posts:
            # Check if post already exists
            cursor.execute("SELECT id FROM posts WHERE title = ?", (title,))
            if cursor.fetchone():
                print(f"Post '{title}' already exists. Skipping.")
                continue
            
            # Content is stored as JSON or text. The model says JSON, but direct schema said TEXT.
            # I'll use a simple JSON string.
            content_json = json.dumps(content_text)
            
            cursor.execute(
                "INSERT INTO posts (title, content, published, author_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (title, content_json, 1, admin_id, now, now)
            )
        
        conn.commit()
        print("Successfully created/ensured 5 welcoming blog posts.")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    populate_welcome_posts()
