import React, { useEffect, useState } from 'react';

type TypewriterProps = {
  phrases: string[];
  typingSpeedMs?: number;
  deletingSpeedMs?: number;
  pauseBetweenMs?: number;
  loop?: boolean;
  className?: string;
};

const Typewriter: React.FC<TypewriterProps> = ({
  phrases,
  typingSpeedMs = 40,
  deletingSpeedMs = 25,
  pauseBetweenMs = 700,
  loop = true,
  className,
}) => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const lastIndex = phrases.length ? phrases.length - 1 : 0;

  useEffect(() => {
    if (!phrases.length) return;
    const current = phrases[index % phrases.length];

    if (!deleting && subIndex === current.length) {
      if (!loop && index === lastIndex) {
        // stop on the last phrase when not looping
        return;
      }
      const timeout = setTimeout(() => setDeleting(true), pauseBetweenMs);
      return () => clearTimeout(timeout);
    }

    if (deleting && subIndex === 0) {
      setDeleting(false);
      setIndex((prev) => (prev + 1) % phrases.length);
      if (!loop && index === phrases.length - 1) return;
    }

    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (deleting ? -1 : 1));
    }, deleting ? deletingSpeedMs : typingSpeedMs);

    return () => clearTimeout(timeout);
  }, [phrases, index, subIndex, deleting, typingSpeedMs, deletingSpeedMs, pauseBetweenMs, loop]);

  const shown = phrases.length ? phrases[index % phrases.length].substring(0, subIndex) : '';

  const isFinished = !loop && index === lastIndex && subIndex === (phrases[lastIndex] ? phrases[lastIndex].length : 0) && !deleting;

  return (
    <span className={className}>
      {shown}
      {!isFinished && <span className="caret" aria-hidden="true" />}
    </span>
  );
};

export default Typewriter;


