import { useEffect, useState } from "react";

import { apiRequest, jsonBody } from "../lib/api";

export default function DashboardSettingsPage() {
  const [form, setForm] = useState({ display_name: "", tagline: "", bio: "", location: "", website_url: "" });
  const [status, setStatus] = useState("");

  useEffect(() => {
    apiRequest("/api/profile/me")
      .then((data) => setForm({
        display_name: data.display_name || "",
        tagline: data.tagline || "",
        bio: data.bio || "",
        location: data.location || "",
        website_url: data.website_url || "",
      }))
      .catch(() => {});
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("");

    try {
      await apiRequest("/api/profile/me", {
        method: "PUT",
        body: jsonBody(form),
      });
      setStatus("Profile settings saved.");
    } catch (error) {
      setStatus(error.message || "Could not save settings.");
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: 28, borderRadius: 30, background: "rgba(255,255,255,0.88)", border: "1px solid rgba(15,23,42,0.08)", display: "grid", gap: 18 }}>
      <p className="eyebrow">Settings</p>
      <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 36, marginBottom: 8 }}>Profile settings</h2>
      <input value={form.display_name} onChange={(e) => updateField("display_name", e.target.value)} placeholder="Display name" style={{ borderRadius: 18, border: "1px solid rgba(15,23,42,0.1)", padding: "14px 16px" }} />
      <input value={form.tagline} onChange={(e) => updateField("tagline", e.target.value)} placeholder="Tagline" style={{ borderRadius: 18, border: "1px solid rgba(15,23,42,0.1)", padding: "14px 16px" }} />
      <input value={form.location} onChange={(e) => updateField("location", e.target.value)} placeholder="Location" style={{ borderRadius: 18, border: "1px solid rgba(15,23,42,0.1)", padding: "14px 16px" }} />
      <input value={form.website_url} onChange={(e) => updateField("website_url", e.target.value)} placeholder="Website URL" style={{ borderRadius: 18, border: "1px solid rgba(15,23,42,0.1)", padding: "14px 16px" }} />
      <textarea value={form.bio} onChange={(e) => updateField("bio", e.target.value)} placeholder="Bio" rows={6} style={{ borderRadius: 20, border: "1px solid rgba(15,23,42,0.1)", padding: "16px 18px", resize: "vertical" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button type="submit" className="btn">Save Settings</button>
        {status ? <span style={{ color: "var(--gray)" }}>{status}</span> : null}
      </div>
    </form>
  );
}
