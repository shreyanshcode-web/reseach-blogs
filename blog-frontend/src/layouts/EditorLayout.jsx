import { Outlet } from "react-router-dom";

export default function EditorLayout() {
  return (
    <div className="c-page" style={{ minHeight: "100vh", background: "linear-gradient(180deg, var(--c-bg) 0%, var(--c-bg-alt) 18%, var(--c-bg) 100%)", color: "var(--c-text)" }}>
      <Outlet />
    </div>
  );
}
