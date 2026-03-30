import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #fff8f6 0%, #ffffff 55%, #f7fafc 100%)" }}>
      <Outlet />
    </div>
  );
}
