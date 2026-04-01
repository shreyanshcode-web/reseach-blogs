import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { apiRequest } from "../lib/api";
import { isAuthenticated } from "../lib/auth";
import { normalizePosts } from "../lib/posts";

export default function ProfilePage() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followState, setFollowState] = useState(null);

  useEffect(() => {
    apiRequest(`/api/profile/${username}`)
      .then(setProfile)
      .catch(() => setProfile(null));

    apiRequest(`/api/posts/author/${username}?limit=50`)
      .then((data) => {
        setPosts(normalizePosts(data));
      })
      .catch(() => setPosts([]));
  }, [username]);

  useEffect(() => {
    if (!profile?.user_id) {
      return;
    }

    apiRequest(`/api/follows/status/${profile.user_id}`)
      .then(setFollowState)
      .catch(() => setFollowState(null));
  }, [profile?.user_id]);

  function handleFollowToggle() {
    if (!profile?.user_id || !isAuthenticated()) {
      return;
    }

    const method = followState?.is_following ? "DELETE" : "POST";
    apiRequest(`/api/follows/${profile.user_id}`, { method })
      .then(() => apiRequest(`/api/follows/status/${profile.user_id}`))
      .then(setFollowState)
      .catch(() => {});
  }

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
          <span>{followState?.followers_count ?? profile?.followers_count ?? 0} followers</span>
          <span>{followState?.following_count ?? profile?.following_count ?? 0} following</span>
        </div>
        {isAuthenticated() && profile?.user_id ? (
          <div className="ed-actions" style={{ marginTop: 18 }}>
            <button type="button" className="c-hero__cta" onClick={handleFollowToggle}>
              {followState?.is_following ? "Unfollow" : "Follow"}
            </button>
          </div>
        ) : null}
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
