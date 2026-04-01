import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { apiRequest } from "../lib/api";
import { isAuthenticated } from "../lib/auth";
import { normalizePosts } from "../lib/posts";

function ProfileStoryCard({ post }) {
  return (
    <Link to={`/post/${post.id}`} className="app-shell__story-card">
      <div className="app-shell__story-head">
        <span>{post.category}</span>
        <span>{new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
      </div>
      <h2 className="app-shell__story-title">{post.title}</h2>
      <p className="app-shell__story-copy">{post.excerpt || "Open the story to read the full article."}</p>
      <div className="app-shell__story-foot">
        {(post.tags || []).slice(0, 4).map((tag) => (
          <span key={tag} className="app-shell__tag">
            #{tag}
          </span>
        ))}
      </div>
    </Link>
  );
}

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

  const links = [
    profile?.website_url,
    profile?.github_url,
    profile?.twitter_url,
    profile?.linkedin_url,
    profile?.instagram_url,
    profile?.youtube_url,
  ].filter(Boolean);

  return (
    <>
      <section className="app-shell__stage-card app-shell__stage-card--ratio">
        <p className="app-shell__eyebrow">Profile</p>
        <h1 className="app-shell__section-title">{profile?.display_name || username}</h1>
        <p className="app-shell__section-copy">
          {profile?.bio ||
            "This profile now lives in the same creative widescreen language as the landing page, so the creator identity reads like part of the core product instead of a separate template."}
        </p>
        <div className="app-shell__metric-grid">
          <div className="app-shell__metric-card">
            <div className="app-shell__metric-label">Posts</div>
            <div className="app-shell__metric-value">{profile?.total_posts || posts.length}</div>
            <div className="app-shell__metric-note">Published stories attached to this writer profile.</div>
          </div>
          <div className="app-shell__metric-card">
            <div className="app-shell__metric-label">Followers</div>
            <div className="app-shell__metric-value">{followState?.followers_count ?? profile?.followers_count ?? 0}</div>
            <div className="app-shell__metric-note">Readers subscribed to this creator stream.</div>
          </div>
          <div className="app-shell__metric-card">
            <div className="app-shell__metric-label">Following</div>
            <div className="app-shell__metric-value">{followState?.following_count ?? profile?.following_count ?? 0}</div>
            <div className="app-shell__metric-note">Accounts this profile keeps in its own signal network.</div>
          </div>
          <div className="app-shell__metric-card">
            <div className="app-shell__metric-label">Location</div>
            <div className="app-shell__metric-value">{profile?.location || "Global"}</div>
            <div className="app-shell__metric-note">Public home base shown across the creator identity.</div>
          </div>
        </div>
        <div className="app-shell__action-row" style={{ marginTop: 18 }}>
          {isAuthenticated() && profile?.user_id ? (
            <button type="button" className="app-shell__button app-shell__button--primary" onClick={handleFollowToggle}>
              {followState?.is_following ? "Unfollow" : "Follow"}
            </button>
          ) : null}
          {profile?.website_url ? (
            <a href={profile.website_url} target="_blank" rel="noreferrer" className="app-shell__button">
              Visit Website
            </a>
          ) : null}
        </div>
      </section>

      <section className="app-shell__profile-grid">
        <div className="app-shell__stack">
          <section className="app-shell__stage-card">
            <p className="app-shell__eyebrow">Published Work</p>
            <div className="app-shell__story-list">
              {posts.length ? (
                posts.map((post) => <ProfileStoryCard key={post.id} post={post} />)
              ) : (
                <div className="app-shell__empty">No published blogs found for this profile yet.</div>
              )}
            </div>
          </section>
        </div>

        <aside className="app-shell__stack">
          <section className="app-shell__stage-card">
            <p className="app-shell__eyebrow">Identity Card</p>
            <div className="app-shell__mini-list">
              <div className="app-shell__mini-block">
                <div className="app-shell__mini-title">@{profile?.username || username}</div>
                <div className="app-shell__mini-copy">{profile?.tagline || "Creative profile ready for public discovery."}</div>
              </div>
              {profile?.location ? (
                <div className="app-shell__mini-block">
                  <div className="app-shell__mini-title">Based in {profile.location}</div>
                  <div className="app-shell__mini-copy">Location is now surfaced inside the shared creative layout.</div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="app-shell__stage-card">
            <p className="app-shell__eyebrow">Links</p>
            <div className="app-shell__link-grid">
              {links.length ? (
                links.map((link) => (
                  <a key={link} href={link} target="_blank" rel="noreferrer" className="app-shell__button">
                    Open Link
                  </a>
                ))
              ) : (
                <div className="app-shell__empty">Public links will appear here once the creator fills them in.</div>
              )}
            </div>
          </section>

          <section className="app-shell__stage-card">
            <p className="app-shell__eyebrow">Skills</p>
            <div className="app-shell__tag-row">
              {Array.isArray(profile?.skills) && profile.skills.length ? (
                profile.skills.map((skill) => (
                  <span key={skill} className="app-shell__tag">
                    {skill}
                  </span>
                ))
              ) : (
                <div className="app-shell__empty">Creator skills and specialties will appear here.</div>
              )}
            </div>
          </section>
        </aside>
      </section>
    </>
  );
}
