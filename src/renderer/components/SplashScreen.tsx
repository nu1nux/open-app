/**
 * @fileoverview Splash screen with typewriter animation shown on app startup.
 * Letters of "Open App" are typed one-by-one, each fading in,
 * followed by a flourish scale animation. A blinking cursor accompanies the text.
 * @module renderer/components/SplashScreen
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const TEXT = 'Open App';
const LETTER_INTERVAL = 120;  // ms per letter
const FADE_DURATION = 200;    // ms CSS transition per letter
const CURSOR_PERIOD = 1060;   // ms full blink cycle
const FLOURISH_DELAY = 100;   // ms after typing before flourish
const FLOURISH_DURATION = 300; // ms scale animation
const MIN_DISPLAY = 2000;     // ms minimum total display time

type SplashScreenProps = {
  onDone: () => void;
};

export function SplashScreen({ onDone }: SplashScreenProps) {
  const mountedAt = useRef(performance.now());
  const [visibleCount, setVisibleCount] = useState(0);
  const [flourish, setFlourish] = useState(false);
  const [phase, setPhase] = useState<'typing' | 'flourish' | 'done'>('typing');

  const finish = useCallback(() => {
    setPhase('done');
    onDone();
  }, [onDone]);

  // Type letters one by one
  useEffect(() => {
    if (visibleCount >= TEXT.length) return;
    const timer = window.setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, LETTER_INTERVAL);
    return () => window.clearTimeout(timer);
  }, [visibleCount]);

  // After all letters typed, trigger flourish
  useEffect(() => {
    if (visibleCount < TEXT.length) return;

    const flourishTimer = window.setTimeout(() => {
      setFlourish(true);
      setPhase('flourish');
    }, FLOURISH_DELAY);

    return () => window.clearTimeout(flourishTimer);
  }, [visibleCount]);

  // When flourish starts, wait for it to finish then enforce minimum display
  useEffect(() => {
    if (!flourish) return;

    const elapsed = performance.now() - mountedAt.current;
    const remaining = Math.max(0, MIN_DISPLAY - elapsed);
    const wait = Math.max(FLOURISH_DURATION, remaining);

    const timer = window.setTimeout(finish, wait);
    return () => window.clearTimeout(timer);
  }, [flourish, finish]);

  if (phase === 'done') return null;

  const cursorHalf = CURSOR_PERIOD / 2;

  return (
    <div className="splash-screen">
      <div className={`splash-typewriter${flourish ? ' splash-flourish' : ''}`}>
        <span className="splash-text" aria-label={TEXT}>
          {TEXT.split('').map((char, i) => (
            <span
              key={i}
              className="splash-letter"
              style={{
                opacity: i < visibleCount ? 1 : 0,
                transition: `opacity ${FADE_DURATION}ms ease`,
              }}
              aria-hidden="true"
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </span>
        <span
          className="splash-cursor"
          style={{
            animationDuration: `${cursorHalf}ms`,
          }}
        />
      </div>
    </div>
  );
}
