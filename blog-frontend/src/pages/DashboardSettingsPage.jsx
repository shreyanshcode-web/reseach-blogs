import { useEffect, useState } from "react";

import { apiRequest, jsonBody } from "../lib/api";

const INITIAL_FORM = {
  display_name: "",
  tagline: "",
  bio: "",
  location: "",
  website_url: "",
  avatar_url: "",
  cover_image_url: "",
  github_url: "",
  twitter_url: "",
  linkedin_url: "",
  instagram_url: "",
  youtube_url: "",
  phone: "",
  skillsInput: "",
};

function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 10 }}>
      <span className="app-shell__eyebrow" style={{ marginBottom: 0 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const fieldStyle = {
  width: "100%",
  minHeight: 48,
  padding: "12px 14px",
  borderRadius: 18,
  border: "1px solid var(--c-glass-border)",
  background: "rgba(255,255,255,0.04)",
  color: "var(--c-text)",
  outline: "none",
};

export default function DashboardSettingsPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/api/profile/me")
      .then((data) =>
        setForm({
          display_name: data.display_name || "",
          tagline: data.tagline || "",
          bio: data.bio || "",
          location: data.location || "",
          website_url: data.website_url || "",
          avatar_url: data.avatar_url || "",
          cover_image_url: data.cover_image_url || "",
          github_url: data.github_url || "",
          twitter_url: data.twitter_url || "",
          linkedin_url: data.linkedin_url || "",
          instagram_url: data.instagram_url || "",
          youtube_url: data.youtube_url || "",
          phone: data.phone || "",
          skillsInput: Array.isArray(data.skills) ? data.skills.join(", ") : "",
        }),
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function parseSkills(value) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("");

    try {
      const payload = {
        ...form,
        skills: parseSkills(form.skillsInput),
      };
      delete payload.skillsInput;

      await apiRequest("/api/profile/me", {
        method: "PUT",
        body: jsonBody(payload),
      });
      setStatus("Profile settings saved.");
    } catch (error) {
      setStatus(error.message || "Could not save settings.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="app-shell__stack">
      <section className="app-shell__stage-card app-shell__stage-card--ratio">
        <p className="app-shell__eyebrow">Creator Settings</p>
        <h1 className="app-shell__section-title">Tune your profile without leaving the creative frame.</h1>
        <p className="app-shell__section-copy">
          Settings now share the same cinematic desktop style too, so profile editing feels like part of the product rather than a separate admin form.
        </p>
        <div className="app-shell__action-row">
          <span className="app-shell__tag">Public profile</span>
          <span className="app-shell__tag">Social links</span>
          <span className="app-shell__tag">Cover and avatar</span>
          <span className="app-shell__tag">Skills</span>
        </div>
      </section>

      <section className="app-shell__dashboard-grid">
        <div className="app-shell__stack">
          <section className="app-shell__stage-card">
            <p className="app-shell__eyebrow">Identity</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <Field label="Display Name">
                <input style={fieldStyle} value={form.display_name} onChange={(e) => updateField("display_name", e.target.value)} placeholder="Display name" />
              </Field>
              <Field label="Tagline">
                <input style={fieldStyle} value={form.tagline} onChange={(e) => updateField("tagline", e.target.value)} placeholder="Short creator tagline" />
              </Field>
              <Field label="Location">
                <input style={fieldStyle} value={form.location} onChange={(e) => updateField("location", e.target.value)} placeholder="City, country" />
              </Field>
              <Field label="Phone">
                <input style={fieldStyle} value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="Contact number" />
              </Field>
              <Field label="Bio">
                <textarea
                  style={{ ...fieldStyle, minHeight: 160, resize: "vertical" }}
                  value={form.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  placeholder="Tell readers what you write about and what perspective you bring."
                />
              </Field>
            </div>
          </section>

          <section className="app-shell__stage-card">
            <p className="app-shell__eyebrow">Visual Assets</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              <Field label="Avatar URL">
                <input style={fieldStyle} value={form.avatar_url} onChange={(e) => updateField("avatar_url", e.target.value)} placeholder="https://..." />
              </Field>
              <Field label="Cover Image URL">
                <input style={fieldStyle} value={form.cover_image_url} onChange={(e) => updateField("cover_image_url", e.target.value)} placeholder="https://..." />
              </Field>
            </div>
          </section>

          <section className="app-shell__stage-card">
            <p className="app-shell__eyebrow">Links</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <Field label="Website">
                <input style={fieldStyle} value={form.website_url} onChange={(e) => updateField("website_url", e.target.value)} placeholder="https://your-site.com" />
              </Field>
              <Field label="GitHub">
                <input style={fieldStyle} value={form.github_url} onChange={(e) => updateField("github_url", e.target.value)} placeholder="https://github.com/..." />
              </Field>
              <Field label="Twitter / X">
                <input style={fieldStyle} value={form.twitter_url} onChange={(e) => updateField("twitter_url", e.target.value)} placeholder="https://x.com/..." />
              </Field>
              <Field label="LinkedIn">
                <input style={fieldStyle} value={form.linkedin_url} onChange={(e) => updateField("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/..." />
              </Field>
              <Field label="Instagram">
                <input style={fieldStyle} value={form.instagram_url} onChange={(e) => updateField("instagram_url", e.target.value)} placeholder="https://instagram.com/..." />
              </Field>
              <Field label="YouTube">
                <input style={fieldStyle} value={form.youtube_url} onChange={(e) => updateField("youtube_url", e.target.value)} placeholder="https://youtube.com/..." />
              </Field>
            </div>
          </section>
        </div>

        <aside className="app-shell__stack">
          <section className="app-shell__stage-card">
            <p className="app-shell__eyebrow">Signals</p>
            <Field label="Skills">
              <input
                style={fieldStyle}
                value={form.skillsInput}
                onChange={(e) => updateField("skillsInput", e.target.value)}
                placeholder="Writing, FastAPI, React, Product thinking"
              />
            </Field>
          </section>

          <section className="app-shell__stage-card">
            <p className="app-shell__eyebrow">Live Preview</p>
            <div className="app-shell__mini-list">
              <div className="app-shell__mini-block">
                <div className="app-shell__mini-title">{form.display_name || "Your creator card"}</div>
                <div className="app-shell__mini-copy">{form.tagline || "Add a short tagline so readers know your angle instantly."}</div>
              </div>
              <div className="app-shell__tag-row">
                {form.location ? <span className="app-shell__tag">{form.location}</span> : null}
                {parseSkills(form.skillsInput).slice(0, 4).map((skill) => (
                  <span key={skill} className="app-shell__tag">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="app-shell__stage-card">
            <p className="app-shell__eyebrow">Status</p>
            <div className="app-shell__mini-copy" style={{ marginBottom: 16 }}>
              {loading ? "Loading profile data..." : status || "Changes are local until you save them."}
            </div>
            <button type="submit" className="app-shell__button app-shell__button--primary">
              Save Settings
            </button>
          </section>
        </aside>
      </section>
    </form>
  );
}
