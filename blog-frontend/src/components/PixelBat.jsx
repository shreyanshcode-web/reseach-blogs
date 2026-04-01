import React from "react";
import "./PixelBat.css";

const PixelBat = ({ label = "Loading next page" }) => {
  return (
    <div className="pixel-bat-loader" role="status" aria-live="polite" aria-label={label}>
      <div className="pixel-bat-loader__field">
        <div className="bat" />
      </div>
      <div className="pixel-bat-loader__copy">
        <span className="pixel-bat-loader__label">{label}</span>
        <span className="pixel-bat-loader__sub">Preparing the next screen.</span>
      </div>
    </div>
  );
};

export default PixelBat;
