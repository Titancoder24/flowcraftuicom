"use client";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { animate } from "framer-motion";

export const GlowingEffect = ({
  spread = 40,
  glow = true,
  disabled = false,
  proximity = 64,
  inactiveZone = 0.01,
  borderWidth = 1,
  className,
}) => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = useCallback(
    (e) => {
      if (!ref.current || disabled) return;

      const rect = ref.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const center = { x: rect.width / 2, y: rect.height / 2 };
      const distance = Math.hypot(x - center.x, y - center.y);

      if (distance < proximity) {
        setPosition({ x, y });
        setOpacity(1 - Math.pow(distance / proximity, 2));
      } else {
        setOpacity(0);
      }
    },
    [disabled, proximity]
  );

  const handleMouseLeave = useCallback(() => {
    setOpacity(0);
  }, []);

  useEffect(() => {
    if (glow && !disabled) {
      const loop = animate(opacity, [0.2, 0.6, 0.2], {
        duration: 2,
        repeat: Infinity,
        ease: "linear",
        onUpdate: (latest) => {
          if (opacity === 0) return; // Only animate if somewhat visible or if we want constant pulse
        },
      });
      // For this specific implementation which is interaction based, we use the mouse move logic primarily
      // But we can add a background pulse if needed.
      // Disabling loop for now to stick to mouse interaction or active state.
      loop.stop(); 
    }
  }, [glow, disabled, opacity]);

  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-none absolute -inset-[1px] rounded-[inherit] opacity-0 transition-opacity",
        !disabled && "opacity-100",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={cn(
          "glow absolute inset-0 rounded-[inherit]",
          'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-[12px]'
        )}
        style={{
          opacity: glow ? 1 : 0,
          maskImage: `radial-gradient(${spread}px at ${position.x}px ${position.y}px, white, transparent)`,
          WebkitMaskImage: `radial-gradient(${spread}px at ${position.x}px ${position.y}px, white, transparent)`,
        }}
      />
      <div className="absolute inset-[1px] rounded-[inherit] bg-white" />
    </div>
  );
};

// Simplified version for direct active state (pulsing)
export const PulsingGlow = ({ children, active = false }) => {
    return (
        <div className="relative group">
            <div className={cn(
                "absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full blur opacity-0 transition duration-1000 group-hover:opacity-75",
                active && "opacity-75 animate-pulse"
            )}></div>
            <div className="relative">
                {children}
            </div>
        </div>
    );
};
