import { Html } from "@react-three/drei";

export default function Loader() {
  return (
    <Html center>
      <div style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: "10px",
        letterSpacing: "4px",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.3)"
      }}>
        Loading
      </div>
    </Html>
  );
}
