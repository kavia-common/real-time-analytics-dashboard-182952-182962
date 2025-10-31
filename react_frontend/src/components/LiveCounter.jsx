import React, { useEffect, useState } from "react";

/**
 * PUBLIC_INTERFACE
 * LiveCounter
 * Shows total number of events with a subtle scale animation on increment.
 */
export default function LiveCounter({ total }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
    const t = setTimeout(() => setAnimate(false), 250);
    return () => clearTimeout(t);
  }, [total]);

  return (
    <div className="live-counter">
      <div className={`live-counter-number ${animate ? "bump" : ""}`}>
        {total}
      </div>
      <div className="live-counter-label">Total Events</div>
    </div>
  );
}
