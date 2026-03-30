import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles.css";
import { apiRequest, getAuthToken } from "../lib/api"; 
import { getPostCoverImage, normalizePosts } from "../lib/posts";

const EMPTY_LIBRARY = { written_posts: [], liked_posts: [], shared_posts: [] };
const DASHBOARD_TABS = [
  { key: "written", label: "Written Blogs" },
  { key: "shared", label: "Reshared Blogs" },
  { key: "liked", label: "Liked Blogs" },
];

function formatDate(value, options = { month: "short", day: "numeric", year: "numeric" }) {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleDateString("en-US", options);
}

function getProfileName(profile) {
  return profile?.display_name || profile?.username || "Your profile";
}

function getInitials(profile) {
  const source = getProfileName(profile);
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";
}

function normalizeLibrary(library) {
  return {
    written_posts: normalizePosts(library?.written_posts || []),
    liked_posts: normalizePosts(library?.liked_posts || []),
    shared_posts: normalizePosts(library?.shared_posts || []),
  };
}

function HeroMetric({ label, value, hint }) {
  return (
    <div
      style={{
        padding: "18px 20px",
        borderRadius: 22,
        background: "rgba(255,255,255,0.72)",
        border: "1px solid rgba(15,23,42,0.08)",
        backdropFilter: "blur(14px)",
        minHeight: 108,
      }}
    >
      <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--gray)", marginBottom: 12 }}>{label}</div>
      <div style={{ fontFamily: '"Playfair Display", serif', fontSize: "clamp(30px, 4vw, 42px)", lineHeight: 1, marginBottom: 10 }}>
        {value}
      </div>
      <div style={{ color: "var(--gray)", fontSize: 14, lineHeight: 1.5 }}>{hint}</div>
    </div>
  );
}

function DetailList({ title, items }) {
  if (!items?.length) {
    return null;
  }

  return (
    <section style={{ marginTop: 28 }}>
      <h3 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 2, color: "var(--gray)", marginBottom: 14 }}>{title}</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {items.map((item, index) => (
          <span
            key={`${title}-${index}`}
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              background: "rgba(232,0,29,0.08)",
              border: "1px solid rgba(232,0,29,0.14)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {typeof item === "string" ? item : item?.title || item?.role || item?.name || `Entry ${index + 1}`}
          </span>
        ))}
      </div>
    </section>
  );
}

function PostCollectionCard({ post, mode }) {
  const cover = getPostCoverImage(post);
  const label = mode === "written"
    ? (post.published ? "Published" : "Draft")
    : mode === "shared"
      ? "Reshared"
      : "Liked";

  return (
    <article
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 22,
        padding: 24,
        borderRadius: 28,
        background: "rgba(255,255,255,0.86)",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 24px 60px rgba(15,23,42,0.07)",
      }}
    >
      <div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
          <span
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              background: "rgba(232,0,29,0.08)",
              color: "var(--red)",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1.6,
              fontWeight: 700,
            }}
          >
            {label}
          </span>
          <span style={{ color: "var(--gray)", fontSize: 14 }}>{formatDate(post.created_at)}</span>
          <span style={{ color: "var(--gray)", fontSize: 14 }}>{post.author?.username || "Unknown writer"}</span>
        </div>
        <h3 style={{ fontFamily: '"Playfair Display", serif', fontSize: "clamp(24px, 3vw, 34px)", lineHeight: 1.1, marginBottom: 12 }}>
          {post.title}
        </h3>
        {post.subtitle ? (
          <p style={{ color: "var(--gray)", fontSize: 16, lineHeight: 1.5, marginBottom: 10 }}>{post.subtitle}</p>
        ) : null}
        <p style={{ fontSize: 16, lineHeight: 1.75, maxWidth: 620 }}>
          {post.excerpt || "No preview has been generated for this post yet."}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
          <span style={{ fontSize: 13, color: "var(--gray)" }}>{post.category}</span>
          {post.tags?.slice(0, 3).map((tag) => (
            <span key={tag} style={{ fontSize: 13, color: "var(--gray)" }}>#{tag}</span>
          ))}
        </div>
      </div>

      <div
        style={{
          minHeight: 220,
          borderRadius: 22,
          overflow: "hidden",
          background: cover
            ? `linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.22)), url(${cover}) center/cover`
            : "linear-gradient(135deg, #f5e6e8 0%, #f6f4f1 48%, #e7ecef 100%)",
          display: "flex",
          alignItems: "flex-end",
          padding: 20,
        }}
      >
        <div
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 18,
            background: "rgba(255,255,255,0.86)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 2, color: "var(--gray)", marginBottom: 8 }}>
            Story Snapshot
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{post.title}</div>
          <div style={{ color: "var(--gray)", fontSize: 14 }}>{post.author?.username || "Unknown writer"}</div>
        </div>
      </div>
    </article>
  );
}

function EmptyCollection({ title, body }) {
  return (
    <div
      style={{
        padding: "44px 28px",
        borderRadius: 28,
        border: "1px dashed rgba(15,23,42,0.18)",
        background: "rgba(255,255,255,0.62)",
        textAlign: "center",
      }}
    >
      <h3 style={{ fontFamily: '"Playfair Display", serif', fontSize: 28, marginBottom: 12 }}>{title}</h3>
      <p style={{ maxWidth: 520, margin: "0 auto", color: "var(--gray)", lineHeight: 1.7 }}>{body}</p>
    </div>
  );
}

function LoginPrompt() {
  return (
    <div className="site" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar alwaysSolid={true} />
      <main style={{ flex: 1, display: "grid", placeItems: "center", padding: "140px 5vw 80px" }}>
        <section
          style={{
            maxWidth: 760,
            width: "100%",
            padding: "44px min(5vw, 36px)",
            borderRadius: 32,
            background: "linear-gradient(135deg, rgba(255,247,246,0.98), rgba(247,248,252,0.96))",
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 30px 80px rgba(15,23,42,0.08)",
          }}
        >
          <p className="eyebrow">Your Dashboard</p>
          <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: "clamp(36px, 6vw, 68px)", lineHeight: 1.02, marginBottom: 18 }}>
            A full creative profile,
            <br />
            all your stories,
            <br />
            and the posts you champion.
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.75, color: "var(--gray)", maxWidth: 620, marginBottom: 28 }}>
            Log in to see your hero section, writing analytics, published and draft blogs, plus every post you&apos;ve liked or reshared.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            <Link to="/auth/login" className="btn">Log In</Link>
            <Link to="/editor" className="btn btn--ghost">Create a Post</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
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

  if (!token && !loading) {
    return <LoginPrompt />;
  }

  const heroName = getProfileName(profile);
  const memberSince = formatDate(profile?.member_since, { month: "long", year: "numeric" });
  const profileLinks = [
    { label: "Website", value: profile?.website_url },
    { label: "GitHub", value: profile?.github_url },
    { label: "LinkedIn", value: profile?.linkedin_url },
    { label: "Instagram", value: profile?.instagram_url },
    { label: "YouTube", value: profile?.youtube_url },
  ].filter((item) => item.value);

  return (
    <div
      className="site"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #fff8f6 0%, #fff 20%, #f8fafc 100%)",
      }}
    >
      <Navbar alwaysSolid={true} />

      <main style={{ flex: 1, paddingTop: 92, paddingBottom: 90 }}>
        <section style={{ width: "min(1200px, 92vw)", margin: "0 auto" }}>
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 40,
              background: profile?.cover_image_url
                ? `linear-gradient(180deg, rgba(15,23,42,0.2), rgba(15,23,42,0.5)), url(${profile.cover_image_url}) center/cover`
                : "radial-gradient(circle at top left, rgba(232,0,29,0.18), transparent 30%), linear-gradient(135deg, #f7efe7 0%, #fff5f2 42%, #edf2f7 100%)",
              border: "1px solid rgba(15,23,42,0.08)",
              padding: "min(5vw, 42px)",
              minHeight: 420,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "auto -90px -120px auto",
                width: 280,
                height: 280,
                borderRadius: "50%",
                background: "rgba(232,0,29,0.1)",
                filter: "blur(10px)",
              }}
            />

            {loading ? (
              <div style={{ minHeight: 340, display: "grid", placeItems: "center", color: "var(--gray)" }}>Loading your dashboard...</div>
            ) : (
              <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 30 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: 28,
                    alignItems: "end",
                  }}
                >
                  <div>
                    <p className="eyebrow" style={{ color: profile?.cover_image_url ? "rgba(255,255,255,0.8)" : undefined }}>Author Profile</p>
                    <h1
                      style={{
                        fontFamily: '"Playfair Display", serif',
                        fontSize: "clamp(42px, 7vw, 88px)",
                        lineHeight: 0.95,
                        letterSpacing: -2,
                        color: profile?.cover_image_url ? "white" : "var(--black)",
                        marginBottom: 16,
                      }}
                    >
                      {heroName}
                    </h1>
                    <p
                      style={{
                        fontSize: "clamp(18px, 2vw, 24px)",
                        lineHeight: 1.55,
                        maxWidth: 760,
                        color: profile?.cover_image_url ? "rgba(255,255,255,0.86)" : "var(--gray)",
                        marginBottom: 18,
                      }}
                    >
                      {profile?.tagline || "Build your profile into a creative cover page that tells readers who you are, what you write about, and what you care to amplify."}
                    </p>
                    <p
                      style={{
                        maxWidth: 760,
                        lineHeight: 1.8,
                        color: profile?.cover_image_url ? "rgba(255,255,255,0.82)" : "var(--black)",
                      }}
                    >
                      {profile?.bio || "Add a richer bio in your profile data to turn this into a full creator-facing dashboard hero. The layout is already ready for links, skills, experience, and projects."}
                    </p>
                  </div>

                  <div
                    style={{
                      justifySelf: "end",
                      width: "min(100%, 320px)",
                      padding: 24,
                      borderRadius: 28,
                      background: profile?.cover_image_url ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.72)",
                      color: profile?.cover_image_url ? "white" : "var(--black)",
                      backdropFilter: "blur(14px)",
                      border: profile?.cover_image_url ? "1px solid rgba(255,255,255,0.16)" : "1px solid rgba(15,23,42,0.08)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
                      <div
                        style={{
                          width: 88,
                          height: 88,
                          borderRadius: "50%",
                          overflow: "hidden",
                          display: "grid",
                          placeItems: "center",
                          background: "rgba(255,255,255,0.24)",
                          border: "1px solid rgba(255,255,255,0.18)",
                          fontWeight: 800,
                          fontSize: 28,
                        }}
                      >
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt={heroName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          getInitials(profile)
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 20 }}>{profile?.username || "writer"}</div>
                        <div style={{ opacity: 0.82, fontSize: 14 }}>Member since {memberSince}</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: 10, fontSize: 14 }}>
                      {profile?.location ? <div>Based in {profile.location}</div> : null}
                      <div>{profile?.email || "No public email set"}</div>
                      {profileLinks.map((item) => (
                        <a key={item.label} href={item.value} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none", opacity: 0.9 }}>
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 16,
                  }}
                >
                  <HeroMetric label="Written" value={library.written_posts.length} hint="Everything authored by you, including drafts." />
                  <HeroMetric label="Liked" value={library.liked_posts.length} hint="Stories you backed and want to revisit." />
                  <HeroMetric label="Reshared" value={library.shared_posts.length} hint="Posts you amplified to others." />
                  <HeroMetric label="Views" value={stats?.total_views ?? 0} hint={`${stats?.growth_percent ?? 0}% growth this week`} />
                </div>
              </div>
            )}
          </div>

          {!loading ? (
            <>
              <div
                style={{
                  marginTop: 26,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 22,
                }}
              >
                <section
                  style={{
                    padding: 28,
                    borderRadius: 30,
                    background: "rgba(255,255,255,0.82)",
                    border: "1px solid rgba(15,23,42,0.08)",
                    boxShadow: "0 18px 40px rgba(15,23,42,0.05)",
                  }}
                >
                  <p className="eyebrow">Profile Details</p>
                  <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 36, lineHeight: 1.05, marginBottom: 14 }}>
                    A hero section with real creator depth.
                  </h2>
                  <p style={{ color: "var(--gray)", lineHeight: 1.8, maxWidth: 700 }}>
                    This dashboard now surfaces the richer parts of your creator identity, not just a list of posts. Fill out your profile data to show skills, experience, education, certifications, and personal links in one place.
                  </p>
                  <DetailList title="Skills" items={profile?.skills} />
                  <DetailList title="Experience" items={profile?.experience} />
                  <DetailList title="Education" items={profile?.education} />
                  <DetailList title="Projects" items={profile?.projects} />
                </section>

                <section
                  style={{
                    padding: 28,
                    borderRadius: 30,
                    background: "rgba(255,255,255,0.82)",
                    border: "1px solid rgba(15,23,42,0.08)",
                    boxShadow: "0 18px 40px rgba(15,23,42,0.05)",
                  }}
                >
                  <p className="eyebrow">Performance</p>
                  <div style={{ display: "grid", gap: 16 }}>
                    <HeroMetric label="Total Posts" value={stats?.total_posts ?? profile?.total_posts ?? 0} hint="Stories currently attached to your profile." />
                    <HeroMetric label="Visitors" value={stats?.unique_visitors ?? 0} hint={`${stats?.views_this_week ?? 0} views in the last 7 days`} />
                    <HeroMetric label="Engagements" value={stats?.total_engagements ?? 0} hint={`${stats?.views_last_week ?? 0} views in the previous 7-day window`} />
                  </div>
                </section>
              </div>

              {stats?.top_posts?.length ? (
                <section
                  style={{
                    marginTop: 24,
                    padding: 28,
                    borderRadius: 30,
                    background: "rgba(255,255,255,0.82)",
                    border: "1px solid rgba(15,23,42,0.08)",
                    boxShadow: "0 18px 40px rgba(15,23,42,0.05)",
                  }}
                >
                  <p className="eyebrow">Top Stories</p>
                  <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 34, marginBottom: 18 }}>Your strongest-performing pieces</h2>
                  <div style={{ display: "grid", gap: 14 }}>
                    {stats.top_posts.slice(0, 4).map((post) => (
                      <div
                        key={post.post_id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
                          gap: 14,
                          alignItems: "center",
                          padding: "16px 18px",
                          borderRadius: 20,
                          background: "rgba(248,250,252,0.9)",
                        }}
                      >
                        <div style={{ gridColumn: "1 / -1" }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>{post.title}</div>
                          <div style={{ color: "var(--gray)", fontSize: 14 }}>Post #{post.post_id}</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontWeight: 800 }}>{post.total_views}</div>
                          <div style={{ color: "var(--gray)", fontSize: 12 }}>Views</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontWeight: 800 }}>{post.likes}</div>
                          <div style={{ color: "var(--gray)", fontSize: 12 }}>Likes</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontWeight: 800 }}>{post.shares}</div>
                          <div style={{ color: "var(--gray)", fontSize: 12 }}>Shares</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontWeight: 800 }}>{post.bookmarks}</div>
                          <div style={{ color: "var(--gray)", fontSize: 12 }}>Saves</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section style={{ marginTop: 28 }}>
                <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
                  <div>
                    <p className="eyebrow">Your Library</p>
                    <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: "clamp(32px, 5vw, 54px)", lineHeight: 1 }}>
                      Written, reshared, and liked.
                    </h2>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {DASHBOARD_TABS.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                          border: "none",
                          cursor: "pointer",
                          padding: "12px 18px",
                          borderRadius: 999,
                          fontWeight: 700,
                          background: activeTab === tab.key ? "var(--black)" : "rgba(255,255,255,0.82)",
                          color: activeTab === tab.key ? "white" : "var(--black)",
                          boxShadow: activeTab === tab.key ? "0 12px 30px rgba(15,23,42,0.18)" : "none",
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 18 }}>
                  {activePosts.length ? (
                    activePosts.map((post) => (
                      <PostCollectionCard key={`${activeTab}-${post.id}`} post={post} mode={activeTab} />
                    ))
                  ) : (
                    <EmptyCollection
                      title={`No ${activeTab} blogs yet`}
                      body={
                        activeTab === "written"
                          ? "Your authored posts will appear here, including unpublished drafts. Start a new piece and this dashboard will turn into your archive."
                          : activeTab === "shared"
                            ? "When you reshare posts, they will collect here so your dashboard reflects what you amplify across the platform."
                            : "Posts you like will appear here so you can keep a personal reading stack inside your profile."
                      }
                    />
                  )}
                </div>
              </section>
            </>
          ) : null}
        </section>
      </main>

      <Footer />
    </div>
  );
}
