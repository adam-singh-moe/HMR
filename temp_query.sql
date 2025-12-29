SELECT 
  r.id,
  r.school_id,
  s.name as school_name,
  r.headteacher_id,
  u.email,
  u.name as user_name,
  r.status,
  r.total_score,
  r.created_at
FROM school_assessment_reports r
JOIN sms_schools s ON r.school_id = s.id
JOIN hmr_users u ON r.headteacher_id = u.id
ORDER BY r.created_at DESC
LIMIT 5;
