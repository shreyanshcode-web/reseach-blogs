import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { apiRequest, getAuthToken } from "../lib/api";
import { normalizePosts } from "../lib/posts";

const EMPTY_LIBRARY = { written_posts: [], liked_posts: [], shared_posts: [] };
const DASHBOARD_TABS = [
  { key: "written", label: "Written Blogs" },
  { key: "shared", label: "Reshared Blogs" },
  { key: "liked", label: "Liked Blogs" },
];

function normalizeLibrary(library) {
  return {
    written_posts: normalizePosts(library?.written_posts || []),
    liked_posts: normalizePosts(library?.liked_posts || []),
    shared_posts: normalizePosts(library?.shared_posts || []),
  };
}

function LibraryCard({ post, mode }) {
  const stateLabel = mode === "written" ? (post.published ? "Published" : "Draft") : mode === "shared" ? "Reshared" : "Liked";

  return (
    <article className="app-shell__story-card" style={{ display: "block" }}>
      <div className="app-shell__story-head">
        <span>{stateLabel}</span>
        <span>{post.category}</span>
        <span>{post.author?.username || "writer"}</span>
      </div>
      <h3 className="app-shell__story-title">{post.title}</h3>
      <p className="app-shell__story-copy">{post.excerpt || "This post does not have a preview yet."}</p>
      <div className="app-shell__story-foot">
        {(post.tags || []).slice(0, 4).map((tag) => (
          <span key={tag} className="app-shell__tag">
            #{tag}
          </span>
        ))}
        <Link to={`/post/${post.id}`} className="app-shell__button">
          Open Story
        </Link>
      </div>
    </article>
  );
}

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [library, setLibrary] = useState(EMPTY_LIBRARY);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("written");

  const token = getAuthToken();

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    Promise.all([
      apiRequest("/api/profile/me"),
      apiRequest("/api/analytics/dashboard"),
      apiRequest("/api/analytics/library"),
    ])
      .then(([profileData, statsData, libraryData]) => {
        if (!isMounted) {
          return;
        }

        setProfile(profileData);
        setStats(statsData);
        setLibrary(normalizeLibrary(libraryData));
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setProfile(null);
        setStats(null);
        setLibrary(EMPTY_LIBRARY);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const activePosts = useMemo(() => {
    if (activeTab === "liked") {
      return library.liked_posts;
    }

    if (activeTab === "shared") {
      return library.shared_posts;
    }

    return library.written_posts;
  }, [activeTab, library]);

  return (
    <section className="app-shell__stack">
      <section className="app-shell__stage-card app-shell__stage-card--ratio">
        <p className="app-shell__eyebrow">Performance Center</p>
        <h1 className="app-shell__section-title">
          {profile?.display_name || profile?.username || "Your creator dashboard"}
        </h1>
        <p className="app-shell__section-copy">
          This dashboard now follows the creative landing direction too: widescreen metrics, glass surfaces, and no boxed white admin page sitting inside a different brand.
        </p>
        <div className="app-shell__metric-grid">
          <div className="app-shell__metric-card">
            <div className="app-shell__metric-label">Reach</div>
            <div className="app-shell__metric-value">{loading ? "..." : stats?.total_views ?? 0}</div>
            <div className="app-shell__metric-note">
              {loading ? "Loading dashboard analytics." : `${stats?.reach_growth_percent ?? 0}% reach growth this week.`}
            </div>
          </div>
          <div className="app-shell__metric-card">
            <div className="app-shell__metric-label">Followers</div>
            <div className="app-shell__metric-value">{loading ? "..." : stats?.followers_total ?? 0}</div>
            <div className="app-shell__metric-note">
              {loading ? "Loading follower movement." : `${stats?.followers_gained_this_week ?? 0} gained this week.`}
            </div>
          </div>
          <div className="app-shell__metric-card">
            <div className="app-shell__metric-label">Posts</div>
            <div className="app-shell__metric-value">{loading ? "..." : stats?.total_posts ?? 0}</div>
            <div className="app-shell__metric-note">Everything authored across live posts and dashboard inventory.</div>
          </div>
          <div className="app-shell__metric-card">
            <div className="app-shell__metric-label">Engagement</div>
            <div className="app-shell__metric-value">{loading ? "..." : stats?.total_engagements ?? 0}</div>
            <div className="app-shell__metric-note">
              {loading ? "Loading post reactions." : `${stats?.average_engagement_rate ?? 0}% average engagement rate.`}
            </div>
          </div>
        </div>
      </section>

      <section className="app-shell__dashboard-grid">
        <div className="app-shell__stack">
          <section className="app-shell__stage-card">
            <p className="app-shell__eyebrow">Story Library</p>
            <div className="app-shell__action-row" style={{ marginBottom: 18 }}>
              {DASHBOARD_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`app-shell__button${activeTab === tab.key ? " app-shell__button--primary" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="app-shell__story-list">
              {loading ? <div className="app-shell__empty">Loading your library.</div> : null}
              {!loading && !activePosts.length ? (
                <div className="app-shell__empty">
                  No {activeTab} blogs yet. As your activity grows, this widescreen library will fill with authored, liked, and amplified stories.
                </div>
              ) : null}
              {activePosts.map((post) => (
                <LibraryCard key={`${activeTab}-${post.id}`} post={post} mode={activeTab} />
              ))}
            </div>
          </section>
        </div>

        <aside className="app-shell__stack">
          <section className="app-shell__stage-card">
            <p className="app-shell__eyebrow">Top Posts</p>
            <div className="app-shell__mini-list">
              {stats?.top_posts?.length ? (
                stats.top_posts.slice(0, 4).map((post) => (
                  <div key={post.post_id} className="app-shell__mini-block">
                    <div className="app-shell__mini-title">{post.title}</div>
                    <div className="app-shell__mini-copy">
                      {post.total_views} views · {post.likes} likes · {post.shares} shares
                    </div>
                  </div>
                ))
              ) : (
                <div className="app-shell__empty">Top-performing posts will appear here as analytics data builds up.</div>
              )}
            </div>
          </section>

          <section className="app-shell__stage-card">
            <p className="app-shell__eyebrow">Quick Links</p>
            <div className="app-shell__mini-list">
              <Link to="/editor" className="app-shell__mini-link">
                <div className="app-shell__mini-title">Create a new post</div>
                <div className="app-shell__mini-copy">Jump back into writing without leaving the dashboard system.</div>
              </Link>
              <Link to="/dashboard/drafts" className="app-shell__mini-link">
                <div className="app-shell__mini-title">Review drafts</div>
                <div className="app-shell__mini-copy">Open unfinished pieces in the same cinematic creator workspace.</div>
              </Link>
              <Link to="/dashboard/settings" className="app-shell__mini-link">
                <div className="app-shell__mini-title">Update profile settings</div>
                <div className="app-shell__mini-copy">Edit links, visuals, and creator identity details.</div>
              </Link>
            </div>
          </section>

          <section className="app-shell__stage-card">
            <p className="app-shell__eyebrow">Creator Signals</p>
            <div className="app-shell__tag-row">
              {(profile?.skills || []).slice(0, 6).map((skill) => (
                <span key={skill} className="app-shell__tag">
                  {skill}
                </span>
              ))}
              {!profile?.skills?.length ? (
                <div className="app-shell__empty">Add creator skills in settings and they will appear here.</div>
              ) : null}
            </div>
          </section>
        </aside>
      </section>
    </section>
  );
}
