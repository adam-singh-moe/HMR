SELECT id, school_id, school_name, status, academic_year, term_name, school_type, 
       report_data->'academicPerformance' as academic,
       report_data->'attendance' as attendance,
       report_data->'infrastructure' as infrastructure
FROM school_assessment_reports
WHERE school_name LIKE '%TEST%'
ORDER BY created_at DESC
LIMIT 1;
