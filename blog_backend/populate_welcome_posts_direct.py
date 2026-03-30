import sqlite3
import json
from datetime import datetime, timezone

def populate_welcome_posts():
    db_path = "blog.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 1. Find or create an admin user
        cursor.execute("SELECT id FROM users WHERE is_admin = 1 LIMIT 1")
        row = cursor.fetchone()
        
        if row:
            admin_id = row[0]
        else:
            print("No admin user found. Creating a default admin...")
            now = datetime.now(timezone.utc).isoformat()
            cursor.execute(
                "INSERT INTO users (username, email, hashed_password, is_active, is_verified, is_admin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                ("admin", "admin@example.com", "hashed_password_placeholder", 1, 1, 1, now)
            )
            admin_id = cursor.lastrowid
        
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
            
            # Content is stored as JSON in the DB (based on Post model)
            content_json = json.dumps(content_text)
            
            cursor.execute(
                "INSERT INTO posts (title, content, published, moderation_status, moderation_score, author_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (title, content_json, 1, "approved", 1.0, admin_id, now, now)
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
