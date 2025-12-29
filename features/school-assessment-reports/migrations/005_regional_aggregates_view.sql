-- Migration: Create regional aggregates materialized view
-- Description: Pre-computed regional and national statistics for analytics dashboards
-- Refreshed periodically to maintain performance

-- Create materialized view for regional statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS school_assessment_regional_stats AS
SELECT 
    reg.id AS region_id,
    reg.name AS region_name,
    p.id AS period_id,
    p.academic_year,
    p.term_name,
    
    -- School counts
    COUNT(DISTINCT s.id) AS total_schools,
    COUNT(DISTINCT CASE WHEN r.status = 'submitted' THEN r.school_id END) AS submitted_count,
    COUNT(DISTINCT CASE WHEN r.status = 'draft' THEN r.school_id END) AS draft_count,
    COUNT(DISTINCT CASE WHEN r.status = 'expired_draft' THEN r.school_id END) AS expired_draft_count,
    
    -- Submission rate
    ROUND(
        COUNT(DISTINCT CASE WHEN r.status = 'submitted' THEN r.school_id END)::NUMERIC / 
        NULLIF(COUNT(DISTINCT s.id), 0) * 100, 
        2
    ) AS submission_rate,
    
    -- Score statistics (only for submitted reports)
    ROUND(AVG(CASE WHEN r.status = 'submitted' THEN r.total_score END)::NUMERIC, 2) AS avg_score,
    MIN(CASE WHEN r.status = 'submitted' THEN r.total_score END) AS min_score,
    MAX(CASE WHEN r.status = 'submitted' THEN r.total_score END) AS max_score,
    
    -- Rating distribution
    jsonb_build_object(
        'outstanding', COUNT(CASE WHEN r.status = 'submitted' AND r.rating_level = 'outstanding' THEN 1 END),
        'very_good', COUNT(CASE WHEN r.status = 'submitted' AND r.rating_level = 'very_good' THEN 1 END),
        'good', COUNT(CASE WHEN r.status = 'submitted' AND r.rating_level = 'good' THEN 1 END),
        'satisfactory', COUNT(CASE WHEN r.status = 'submitted' AND r.rating_level = 'satisfactory' THEN 1 END),
        'needs_improvement', COUNT(CASE WHEN r.status = 'submitted' AND r.rating_level = 'needs_improvement' THEN 1 END)
    ) AS rating_distribution,
    
    -- Category averages (only for submitted reports)
    ROUND(AVG((CASE WHEN r.status = 'submitted' THEN (r.academic_scores->>'total')::NUMERIC END)), 2) AS avg_academic_score,
    ROUND(AVG((CASE WHEN r.status = 'submitted' THEN (r.attendance_scores->>'total')::NUMERIC END)), 2) AS avg_attendance_score,
    ROUND(AVG((CASE WHEN r.status = 'submitted' THEN (r.infrastructure_scores->>'total')::NUMERIC END)), 2) AS avg_infrastructure_score,
    ROUND(AVG((CASE WHEN r.status = 'submitted' THEN (r.teaching_quality_scores->>'total')::NUMERIC END)), 2) AS avg_teaching_quality_score,
    ROUND(AVG((CASE WHEN r.status = 'submitted' THEN (r.management_scores->>'total')::NUMERIC END)), 2) AS avg_management_score,
    ROUND(AVG((CASE WHEN r.status = 'submitted' THEN (r.student_welfare_scores->>'total')::NUMERIC END)), 2) AS avg_student_welfare_score,
    ROUND(AVG((CASE WHEN r.status = 'submitted' THEN (r.community_scores->>'total')::NUMERIC END)), 2) AS avg_community_score,
    
    -- Last updated timestamp
    NOW() AS refreshed_at

FROM sms_regions reg
CROSS JOIN school_assessment_periods p
LEFT JOIN sms_schools s ON s.region_id = reg.id
LEFT JOIN school_assessment_reports r ON r.school_id = s.id AND r.period_id = p.id
GROUP BY reg.id, reg.name, p.id, p.academic_year, p.term_name;

-- Create unique index for efficient refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_regional_stats_region_period 
ON school_assessment_regional_stats(region_id, period_id);

-- Create additional indexes for queries
CREATE INDEX IF NOT EXISTS idx_regional_stats_period ON school_assessment_regional_stats(period_id);
CREATE INDEX IF NOT EXISTS idx_regional_stats_academic_year ON school_assessment_regional_stats(academic_year);
CREATE INDEX IF NOT EXISTS idx_regional_stats_avg_score ON school_assessment_regional_stats(avg_score DESC);

-- Create materialized view for national statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS school_assessment_national_stats AS
SELECT 
    p.id AS period_id,
    p.academic_year,
    p.term_name,
    
    -- School counts
    COUNT(DISTINCT s.id) AS total_schools,
    COUNT(DISTINCT CASE WHEN r.status = 'submitted' THEN r.school_id END) AS submitted_count,
    
    -- Submission rate
    ROUND(
        COUNT(DISTINCT CASE WHEN r.status = 'submitted' THEN r.school_id END)::NUMERIC / 
        NULLIF(COUNT(DISTINCT s.id), 0) * 100, 
        2
    ) AS submission_rate,
    
    -- Score statistics
    ROUND(AVG(CASE WHEN r.status = 'submitted' THEN r.total_score END)::NUMERIC, 2) AS avg_score,
    MIN(CASE WHEN r.status = 'submitted' THEN r.total_score END) AS min_score,
    MAX(CASE WHEN r.status = 'submitted' THEN r.total_score END) AS max_score,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CASE WHEN r.status = 'submitted' THEN r.total_score END) AS median_score,
    
    -- Rating distribution
    jsonb_build_object(
        'outstanding', COUNT(CASE WHEN r.status = 'submitted' AND r.rating_level = 'outstanding' THEN 1 END),
        'very_good', COUNT(CASE WHEN r.status = 'submitted' AND r.rating_level = 'very_good' THEN 1 END),
        'good', COUNT(CASE WHEN r.status = 'submitted' AND r.rating_level = 'good' THEN 1 END),
        'satisfactory', COUNT(CASE WHEN r.status = 'submitted' AND r.rating_level = 'satisfactory' THEN 1 END),
        'needs_improvement', COUNT(CASE WHEN r.status = 'submitted' AND r.rating_level = 'needs_improvement' THEN 1 END)
    ) AS rating_distribution,
    
    -- Low performers count (< 400 points)
    COUNT(CASE WHEN r.status = 'submitted' AND r.total_score < 400 THEN 1 END) AS low_performers_count,
    
    -- Top performers count (>= 850 points)
    COUNT(CASE WHEN r.status = 'submitted' AND r.total_score >= 850 THEN 1 END) AS top_performers_count,
    
    -- Region count
    COUNT(DISTINCT reg.id) AS total_regions,
    
    -- Last updated timestamp
    NOW() AS refreshed_at

FROM school_assessment_periods p
CROSS JOIN sms_regions reg
LEFT JOIN sms_schools s ON s.region_id = reg.id
LEFT JOIN school_assessment_reports r ON r.school_id = s.id AND r.period_id = p.id
GROUP BY p.id, p.academic_year, p.term_name;

-- Create unique index for efficient refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_national_stats_period 
ON school_assessment_national_stats(period_id);

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_assessment_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY school_assessment_regional_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY school_assessment_national_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refresh stats for a specific period (more efficient)
CREATE OR REPLACE FUNCTION refresh_assessment_stats_for_period(p_period_id UUID)
RETURNS void AS $$
BEGIN
    -- For materialized views, we need to refresh the entire view
    -- But we can optimize by only refreshing when needed
    REFRESH MATERIALIZED VIEW CONCURRENTLY school_assessment_regional_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY school_assessment_national_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to refresh stats when reports are submitted
CREATE OR REPLACE FUNCTION trigger_refresh_stats_on_submission()
RETURNS TRIGGER AS $$
BEGIN
    -- Only refresh when status changes to 'submitted'
    IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
        PERFORM refresh_assessment_stats();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_refresh_stats_on_report_submission ON school_assessment_reports;
CREATE TRIGGER trigger_refresh_stats_on_report_submission
    AFTER INSERT OR UPDATE OF status ON school_assessment_reports
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_stats_on_submission();

-- Comments for documentation
COMMENT ON MATERIALIZED VIEW school_assessment_regional_stats IS 'Pre-computed regional assessment statistics per period';
COMMENT ON MATERIALIZED VIEW school_assessment_national_stats IS 'Pre-computed national assessment statistics per period';
COMMENT ON FUNCTION refresh_assessment_stats() IS 'Manually refresh all assessment statistics materialized views';
