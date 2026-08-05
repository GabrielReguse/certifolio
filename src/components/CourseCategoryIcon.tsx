import { Icon } from './Icon';

const categoryIconMap: Record<string, string> = {
  'programação': 'programming',
  'design': 'design',
  'negócios': 'business',
  'idiomas': 'languages',
  'educação': 'education',
  'dados': 'data',
  'segurança': 'security',
  'outros': 'other',
};

export function getCourseCategoryIcon(category: string) {
  return categoryIconMap[category.trim().toLowerCase()] || 'other';
}

export function CourseCategoryIcon({ category, size = 20 }: { category: string; size?: number }) {
  return <Icon name={getCourseCategoryIcon(category)} size={size} />;
}
