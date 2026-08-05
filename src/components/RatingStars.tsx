import type { CSSProperties } from 'react';

type RatingStarsProps = {
  rating: number;
  className?: string;
  compact?: boolean;
};

export function RatingStars({ rating, className = '', compact = false }: RatingStarsProps) {
  const score = Math.min(5, Math.max(0, Number(rating || 0) / 2));
  const fill = `${score / 5 * 100}%`;
  const label = `${score.toFixed(score % 1 ? 1 : 0)} de 5 estrelas`;

  return <span
    className={`rating-stars${compact ? ' rating-stars--compact' : ''}${className ? ` ${className}` : ''}`}
    role="img"
    aria-label={label}
    title={label}
    style={{ '--rating-fill': fill } as CSSProperties}
  >
    <span className="rating-stars__empty" aria-hidden="true">★★★★★</span>
    <span className="rating-stars__filled" aria-hidden="true">★★★★★</span>
  </span>;
}
