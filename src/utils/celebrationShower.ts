// Celebration Animation Showering Utility
// Fires high-energy, cascading confetti & star showers across the screen

import confetti from "canvas-confetti";

interface ShowerOptions {
  intensity?: "normal" | "grand";
  durationMs?: number;
}

const CELEBRATION_COLORS = [
  "#FFD700", // Gold
  "#FF3366", // Vivid Coral Pink
  "#00E676", // Bright Emerald
  "#00B0FF", // Sky Blue
  "#A855F7", // Purple
  "#FF9100", // Orange
  "#F43F5E", // Rose
];

/**
 * Triggers a cascading confetti & star celebration shower from the top of the screen.
 */
export function triggerCelebrationShower(options?: ShowerOptions) {
  const intensity = options?.intensity || "normal";
  const duration = options?.durationMs || (intensity === "grand" ? 3200 : 2200);
  const animationEnd = Date.now() + duration;

  try {
    // 1. Initial celebratory burst
    confetti({
      particleCount: intensity === "grand" ? 90 : 50,
      spread: intensity === "grand" ? 120 : 80,
      origin: { y: 0.15, x: 0.5 },
      colors: CELEBRATION_COLORS,
      ticks: 200,
      gravity: 0.9,
      scalar: 1.15,
      disableForReducedMotion: true,
    });

    // 2. Continuous cascading shower from the top of the screen
    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const count = intensity === "grand" ? 22 : 14;

      // Cascade shower from left and right quadrants
      confetti({
        particleCount: count,
        angle: 60,
        spread: 70,
        origin: { x: Math.random() * 0.35, y: -0.05 },
        colors: CELEBRATION_COLORS,
        ticks: 220,
        gravity: 1.1,
        scalar: 1.05,
        drift: Math.random() * 0.4,
        disableForReducedMotion: true,
      });

      confetti({
        particleCount: count,
        angle: 120,
        spread: 70,
        origin: { x: 0.65 + Math.random() * 0.35, y: -0.05 },
        colors: CELEBRATION_COLORS,
        ticks: 220,
        gravity: 1.1,
        scalar: 1.05,
        drift: -Math.random() * 0.4,
        disableForReducedMotion: true,
      });

      // Center stream
      confetti({
        particleCount: Math.floor(count * 0.7),
        angle: 90,
        spread: 90,
        origin: { x: 0.35 + Math.random() * 0.3, y: -0.05 },
        colors: CELEBRATION_COLORS,
        ticks: 240,
        gravity: 1.05,
        scalar: 1.2,
        disableForReducedMotion: true,
      });
    }, 160);
  } catch (_e) {
    // Graceful fallback for non-supporting environments
  }
}
