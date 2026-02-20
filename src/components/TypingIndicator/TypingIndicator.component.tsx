import React, { useState, useEffect } from "react";
import { LOADING_TEXTS, STREAMING_LOADING_TEXTS } from "@utils/constants";
import { formatDuration } from "@utils/formatDuration";

const ROTATION_INTERVAL_MS = 4000;

export type TypingIndicatorVariant = "pre-stream" | "streaming";

interface TypingIndicatorProps {
  variant?: TypingIndicatorVariant;
  requestStartTime?: number | null;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  variant = "pre-stream",
  requestStartTime = null,
}) => {
  const [textIndex, setTextIndex] = useState(0);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const texts = variant === "streaming" ? STREAMING_LOADING_TEXTS : LOADING_TEXTS;

  useEffect(() => {
    setTextIndex(0);
  }, [variant]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % texts.length);
    }, ROTATION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [texts.length]);

  // Live timer - updates every second when requestStartTime is set
  useEffect(() => {
    if (requestStartTime == null) {
      setElapsedSecs(0);
      return;
    }
    const tick = () => {
      setElapsedSecs(Math.floor((Date.now() - requestStartTime) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [requestStartTime]);

  return (
    <div className="flex items-center gap-2 text-[15px] text-gray-500 dark:text-gray-400">
      <span className="shimmer-text">{texts[textIndex]}</span>
      {requestStartTime != null && (
        <span>{formatDuration(elapsedSecs)}</span>
      )}
    </div>
  );
};
