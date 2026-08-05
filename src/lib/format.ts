export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Number(minutes || 0));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!rest) return `${hours}h`;
  if (!hours) return `${rest}min`;
  return `${hours}h ${rest}min`;
}

export function formatDate(value?: string | null): string {
  if (!value) return 'Não informada';
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function ratingStars(rating: number): string {
  const stars = Math.round(Number(rating || 0) / 2);
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'C';
}
