import { Logo } from './Logo';

export function AppLoading({ label = 'Preparando seu Certifólio…' }: { label?: string }) {
  return <div className="app-loading"><Logo /><div className="loading-line"><span /></div><p>{label}</p></div>;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function PageSkeleton() {
  return <div className="page-stack"><div className="stats-grid">{[1,2,3,4].map((item) => <Skeleton key={item} className="skeleton-card" />)}</div><Skeleton className="skeleton-hero" /><div className="card-grid">{[1,2,3].map((item) => <Skeleton key={item} className="skeleton-course" />)}</div></div>;
}
