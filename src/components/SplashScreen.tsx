import { useState, useEffect } from "react";
import splashImage from "../assets/splash.png";

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 4000);
    const doneTimer = setTimeout(() => onComplete(), 5000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-1000"
      style={{ opacity: fading ? 0 : 1 }}
    >
      <img
        src={splashImage}
        alt="AGO Recipe Manager"
        className="w-full h-full object-cover"
      />
    </div>
  );
}
