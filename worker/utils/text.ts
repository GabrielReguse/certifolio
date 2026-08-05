export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function slugify(value: string): string {
  return normalizeText(value).replace(/\s+/g, '-').replace(/^-|-$/g, '') || 'item';
}

export function cleanUsername(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 30);
}

export function safeFilename(value: string): string {
  const dot = value.lastIndexOf('.');
  const extension = dot >= 0 ? value.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g, '') : '';
  const base = dot >= 0 ? value.slice(0, dot) : value;
  return `${slugify(base).slice(0, 70)}${extension}`;
}
