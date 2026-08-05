export type CourseRow = Record<string, unknown> & {
  id: string;
  skills_json?: string | null;
  file_count?: number;
  institution_website_resolved?: string | null;
};

function parseSkills(value: unknown) {
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
  } catch {
    return [];
  }
}

export const skillsJsonSelect = `COALESCE((
  SELECT json_group_array(s2.name)
  FROM course_skills cs2
  JOIN skills s2 ON s2.id = cs2.skill_id
  WHERE cs2.course_id = c.id
), '[]') AS skills_json`;

export function serializeCourse(row: CourseRow) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    institutionId: row.institution_id,
    institutionName: row.institution_name || 'Sem instituição',
    institutionWebsite: row.institution_website_resolved ?? row.institution_website ?? '',
    platformName: row.platform_name || '',
    description: row.description || '',
    category: row.category || 'Outros',
    status: row.status,
    hoursMinutes: Number(row.hours_minutes || 0),
    startDate: row.start_date,
    endDate: row.end_date,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    rating: Number(row.rating || 0),
    credentialId: row.credential_id || '',
    verificationUrl: row.verification_url || '',
    visibility: row.visibility,
    certificateVisibility: row.certificate_visibility,
    isFeatured: Boolean(row.is_featured),
    notes: row.notes || '',
    skills: parseSkills(row.skills_json),
    fileCount: Number(row.file_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function serializePublicCourse(row: CourseRow) {
  const course = serializeCourse(row);
  return {
    id: course.id,
    title: course.title,
    institutionName: course.institutionName,
    platformName: course.platformName,
    description: course.description,
    category: course.category,
    status: course.status,
    hoursMinutes: course.hoursMinutes,
    startDate: course.startDate,
    endDate: course.endDate,
    issuedAt: course.issuedAt,
    credentialId: course.credentialId,
    rating: course.rating,
    verificationUrl: course.verificationUrl,
    isFeatured: course.isFeatured,
    certificateVisibility: course.certificateVisibility,
    fileCount: course.fileCount,
    skills: course.skills,
  };
}
