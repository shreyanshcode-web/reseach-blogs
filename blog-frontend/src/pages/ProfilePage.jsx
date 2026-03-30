import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { apiRequest } from "../lib/api";
import { normalizePosts } from "../lib/posts";

export default function ProfilePage() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    apiRequest(`/api/profile/${username}`)
      .then(setProfile)
      .catch(() => setProfile(null));

    apiRequest("/api/posts/?limit=50")
      .then((data) => {
        const all = normalizePosts(data);
        setPosts(all.filter((post) => post.author?.username === username));
      })
      .catch(() => setPosts([]));
  }, [username]);

  return (
    <section className="ed-page">
      <div className="ed-panel ed-hero">
        <p className="ed-kicker">Profile</p>
        <h1 className="ed-headline">{profile?.display_name || username}</h1>
        <p className="ed-copy">{profile?.bio || "A minimalist author page with the focus on voice, story list, and readable rhythm."}</p>
        <div className="ed-meta" style={{ marginTop: 18 }}>
          {profile?.location ? <span>{profile.location}</span> : null}
          {profile?.website_url ? <a href={profile.website_url} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>Website</a> : null}
          <span>{profile?.total_posts || posts.length} posts</span>
        </div>
      </div>

      <div className="ed-panel">
        <div className="ed-list">
          {posts.map((post) => (
            <Link key={post.id} to={`/post/${post.id}`} className="ed-item">
              <div className="ed-meta" style={{ marginBottom: 10 }}>
                <span>{post.category}</span>
              </div>
              <div className="ed-subheadline">{post.title}</div>
              <p className="ed-copy">{post.excerpt}</p>
            </Link>
          ))}
          {!posts.length ? <div className="ed-muted">No published blogs found for this profile yet.</div> : null}
        </div>
      </div>
    </section>
  );
}
