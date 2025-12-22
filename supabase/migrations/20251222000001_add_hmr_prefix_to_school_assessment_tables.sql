-- Migration: Add hmr_ prefix to School Assessment Reports feature tables
-- Description: Renames feature tables to be clearly distinguishable within the Supabase project.
--
-- Tables renamed:
-- - school_assessment_periods         -> hmr_school_assessment_periods
-- - school_assessment_reports          -> hmr_school_assessment_reports
-- - school_assessment_recommendations  -> hmr_school_assessment_recommendations
-- - school_assessment_audit_log        -> hmr_school_assessment_audit_log
-- - term_submission_config             -> hmr_term_submission_config
--
-- Notes:
-- - Renames preserve data, RLS policies, and constraints.
-- - Dependent functions and materialized views are recreated to reference the new names.

-- 1) Rename tables (idempotent)
DO $$
BEGIN
	IF to_regclass('public.hmr_school_assessment_periods') IS NULL
		 AND to_regclass('public.school_assessment_periods') IS NOT NULL THEN
		ALTER TABLE public.school_assessment_periods RENAME TO hmr_school_assessment_periods;
	END IF;

	IF to_regclass('public.hmr_school_assessment_reports') IS NULL
		 AND to_regclass('public.school_assessment_reports') IS NOT NULL THEN
		ALTER TABLE public.school_assessment_reports RENAME TO hmr_school_assessment_reports;
	END IF;

	IF to_regclass('public.hmr_school_assessment_recommendations') IS NULL
		 AND to_regclass('public.school_assessment_recommendations') IS NOT NULL THEN
		ALTER TABLE public.school_assessment_recommendations RENAME TO hmr_school_assessment_recommendations;
	END IF;

	IF to_regclass('public.hmr_school_assessment_audit_log') IS NULL
		 AND to_regclass('public.school_assessment_audit_log') IS NOT NULL THEN
		ALTER TABLE public.school_assessment_audit_log RENAME TO hmr_school_assessment_audit_log;
	END IF;

	IF to_regclass('public.hmr_term_submission_config') IS NULL
		 AND to_regclass('public.term_submission_config') IS NOT NULL THEN
		ALTER TABLE public.term_submission_config RENAME TO hmr_term_submission_config;
	END IF;
END $$;

-- 2) Update functions that reference renamed tables

-- Ensure only one active period at a time
CREATE OR REPLACE FUNCTION ensure_single_active_period()
RETURNS TRIGGER AS $$
BEGIN
	IF NEW.is_active = true THEN
		UPDATE hmr_school_assessment_periods
		SET is_active = false
		WHERE id != NEW.id AND is_active = true;
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Audit entry helper (used by server actions)
CREATE OR REPLACE FUNCTION create_assessment_audit_entry(
	p_report_id UUID,
	p_admin_id UUID,
	p_action VARCHAR(20),
	p_field_changed VARCHAR(100),
	p_old_value JSONB,
	p_new_value JSONB,
	p_reason TEXT
)
RETURNS UUID AS $$
DECLARE
	v_audit_id UUID;
BEGIN
	INSERT INTO hmr_school_assessment_audit_log (
		report_id,
		admin_id,
		action,
		field_changed,
		old_value,
		new_value,
		reason
	) VALUES (
		p_report_id,
		p_admin_id,
		p_action,
		p_field_changed,
		p_old_value,
		p_new_value,
		p_reason
	) RETURNING id INTO v_audit_id;

	RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Update term submission window functions to use renamed config table

CREATE OR REPLACE FUNCTION get_current_submission_term()
RETURNS TABLE (
	term_number INTEGER,
	term_name VARCHAR(20),
	submission_start DATE,
	submission_end DATE,
	is_open BOOLEAN,
	academic_year VARCHAR(9)
) AS $$
DECLARE
	current_date_val DATE := CURRENT_DATE;
	current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
	current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
	academic_year_val VARCHAR(9);
BEGIN
	-- Determine current academic year (starts in September)
	IF current_month >= 9 THEN
		academic_year_val := current_year || '-' || (current_year + 1);
	ELSE
		academic_year_val := (current_year - 1) || '-' || current_year;
	END IF;

	RETURN QUERY
	SELECT
		tc.term_number,
		tc.term_name,
		CASE
			WHEN tc.term_number = 1 THEN
				MAKE_DATE(
					CASE WHEN current_month >= 9 THEN current_year ELSE current_year - 1 END,
					tc.start_month,
					LEAST(tc.start_day, 28)
				)
			WHEN tc.term_number = 2 THEN
				MAKE_DATE(
					CASE WHEN current_month >= 9 THEN current_year + 1 ELSE current_year END,
					tc.start_month,
					LEAST(tc.start_day, 28)
				)
			ELSE
				MAKE_DATE(
					CASE WHEN current_month >= 9 THEN current_year + 1 ELSE current_year END,
					tc.start_month,
					LEAST(tc.start_day, 28)
				)
		END AS submission_start,
		CASE
			WHEN tc.term_number = 1 THEN
				MAKE_DATE(
					CASE WHEN current_month >= 9 THEN current_year ELSE current_year - 1 END,
					tc.end_month,
					LEAST(tc.end_day, 28)
				)
			WHEN tc.term_number = 2 THEN
				MAKE_DATE(
					CASE WHEN current_month >= 9 THEN current_year + 1 ELSE current_year END,
					tc.end_month,
					LEAST(tc.end_day, 28)
				)
			ELSE
				MAKE_DATE(
					CASE WHEN current_month >= 9 THEN current_year + 1 ELSE current_year END,
					tc.end_month,
					LEAST(tc.end_day, 28)
				)
		END AS submission_end,
		CASE
			WHEN tc.term_number = 1 THEN
				current_date_val BETWEEN
					MAKE_DATE(CASE WHEN current_month >= 9 THEN current_year ELSE current_year - 1 END, tc.start_month, LEAST(tc.start_day, 28))
					AND MAKE_DATE(CASE WHEN current_month >= 9 THEN current_year ELSE current_year - 1 END, tc.end_month, LEAST(tc.end_day, 28))
			WHEN tc.term_number = 2 THEN
				current_date_val BETWEEN
					MAKE_DATE(CASE WHEN current_month >= 9 THEN current_year + 1 ELSE current_year END, tc.start_month, LEAST(tc.start_day, 28))
					AND MAKE_DATE(CASE WHEN current_month >= 9 THEN current_year + 1 ELSE current_year END, tc.end_month, LEAST(tc.end_day, 28))
			ELSE
				current_date_val BETWEEN
					MAKE_DATE(CASE WHEN current_month >= 9 THEN current_year + 1 ELSE current_year END, tc.start_month, LEAST(tc.start_day, 28))
					AND MAKE_DATE(CASE WHEN current_month >= 9 THEN current_year + 1 ELSE current_year END, tc.end_month, LEAST(tc.end_day, 28))
		END AS is_open,
		academic_year_val AS academic_year
	FROM hmr_term_submission_config tc
	WHERE tc.is_enabled = true
	ORDER BY tc.term_number;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_active_submission_term()
RETURNS TABLE (
	term_number INTEGER,
	term_name VARCHAR(20),
	submission_start DATE,
	submission_end DATE,
	academic_year VARCHAR(9),
	days_remaining INTEGER
) AS $$
BEGIN
	RETURN QUERY
	SELECT
		t.term_number,
		t.term_name,
		t.submission_start,
		t.submission_end,
		t.academic_year,
		(t.submission_end - CURRENT_DATE)::INTEGER AS days_remaining
	FROM get_current_submission_term() t
	WHERE t.is_open = true
	LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4) Recreate materialized views to reference renamed tables

-- Drop trigger first to remove dependencies cleanly (handle old and new table names)
DO $$
BEGIN
	IF to_regclass('public.hmr_school_assessment_reports') IS NOT NULL THEN
		EXECUTE 'DROP TRIGGER IF EXISTS trigger_refresh_stats_on_report_submission ON public.hmr_school_assessment_reports';
	ELSIF to_regclass('public.school_assessment_reports') IS NOT NULL THEN
		EXECUTE 'DROP TRIGGER IF EXISTS trigger_refresh_stats_on_report_submission ON public.school_assessment_reports';
	END IF;
END $$;

DROP FUNCTION IF EXISTS trigger_refresh_stats_on_submission();
DROP FUNCTION IF EXISTS refresh_assessment_stats();
DROP FUNCTION IF EXISTS refresh_assessment_stats_for_period(UUID);

DROP MATERIALIZED VIEW IF EXISTS school_assessment_regional_stats;
DROP MATERIALIZED VIEW IF EXISTS school_assessment_national_stats;

CREATE MATERIALIZED VIEW IF NOT EXISTS school_assessment_regional_stats AS
SELECT
	reg.id AS region_id,
	reg.name AS region_name,
	p.id AS period_id,
	p.academic_year,
	p.term_name,

	COUNT(DISTINCT s.id) AS total_schools,
	COUNT(DISTINCT CASE WHEN r.status = 'submitted' THEN r.school_id END) AS submitted_count,
	COUNT(DISTINCT CASE WHEN r.status = 'draft' THEN r.school_id END) AS draft_count,
	COUNT(DISTINCT CASE WHEN r.status = 'expired_draft' THEN r.school_id END) AS expired_draft_count,

	ROUND(
		COUNT(DISTINCT CASE WHEN r.status = 'submitted' THEN r.school_id END)::NUMERIC /
		NULLIF(COUNT(DISTINCT s.id), 0) * 100,
		2
	) AS submission_rate,

	ROUND(AVG(CASE WHEN r.status = 'submitted' THEN r.total_score END)::NUMERIC, 2) AS avg_score,
	MIN(CASE WHEN r.status = 'submitted' THEN r.total_score END) AS min_score,
	MAX(CASE WHEN r.status = 'submitted' THEN r.total_score END) AS max_score,

	jsonb_build_object(
		'outstanding', COUNT(CASE WHEN r.status = 'submitted' AND r.rating_level = 'outstanding' THEN 1 END),
		'very_good', COUNT(CASE WHEN r.status = 'submitted' AND r.rating_level = 'very_good' THEN 1 END),
		'good', COUNT(CASE WHEN r.status = 'submitted' AND r.rating_level = 'good' THEN 1 END),
		'satisfactory', COUNT(CASE WHEN r.status = 'submitted' AND r.rating_level = 'satisfactory' THEN 1 END),
		'needs_improvement', COUNT(CASE WHEN r.status = 'submitted' AND r.rating_level = 'needs_improvement' THEN 1 END)
	) AS rating_distribution,

	ROUND(AVG((CASE WHEN r.status = 'submitted' THEN (r.academic_scores->>'total')::NUMERIC END)), 2) AS avg_academic_score,
	ROUND(AVG((CASE WHEN r.status = 'submitted' THEN (r.attendance_scores->>'total')::NUMERIC END)), 2) AS avg_attendance_score,
	ROUND(AVG((CASE WHEN r.status = 'submitted' THEN (r.infrastructure_scores->>'total')::NUMERIC END)), 2) AS avg_infrastructure_score,
	ROUND(AVG((CASE WHEN r.status = 'submitted' THEN (r.teaching_quality_scores->>'total')::NUMERIC END)), 2) AS avg_teaching_quality_score,
	ROUND(AVG((CASE WHEN r.status = 'submitted' THEN (r.management_scores->>'total')::NUMERIC END)), 2) AS avg_management_score,
	ROUND(AVG((CASE WHEN r.status = 'submitted' THEN (r.student_welfare_scores->>'total')::NUMERIC END)), 2) AS avg_student_welfare_score,
	ROUND(AVG((CASE WHEN r.status = 'submitted' THEN (r.community_scores->>'total')::NUMERIC END)), 2) AS avg_community_score,

	NOW() AS refreshed_at

FROM sms_regions reg
CROSS JOIN hmr_school_assessment_periods p
LEFT JOIN sms_schools s ON s.region_id = reg.id
LEFT JOIN hmr_school_assessment_reports r ON r.school_id = s.id AND r.period_id = p.id
GROUP BY reg.id, reg.name, p.id, p.academic_year, p.term_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_regional_stats_region_period
ON school_assessment_regional_stats(region_id, period_id);

CREATE INDEX IF NOT EXISTS idx_regional_stats_period ON school_assessment_regional_stats(period_id);
CREATE INDEX IF NOT EXISTS idx_regional_stats_academic_year ON school_assessment_regional_stats(academic_year);
CREATE INDEX IF NOT EXISTS idx_regional_stats_avg_score ON school_assessment_regional_stats(avg_score DESC);

CREATE MATERIALIZED VIEW IF NOT EXISTS school_assessment_national_stats AS
SELECT
	p.id AS period_id,
	p.academic_year,
	p.term_name,

	COUNT(DISTINCT s.id) AS total_schools,
	COUNT(DISTINCT CASE WHEN r.status = 'submitted' THEN r.school_id END) AS submitted_count,

	ROUND(
		COUNT(DISTINCT CASE WHEN r.status = 'submitted' THEN r.school_id END)::NUMERIC /
		NULLIF(COUNT(DISTINCT s.id), 0) * 100,
		2
	) AS submission_rate,

	ROUND(AVG(CASE WHEN r.status = 'submitted' THEN r.total_score END)::NUMERIC, 2) AS avg_score,
	MIN(CASE WHEN r.status = 'submitted' THEN r.total_score END) AS min_score,
	MAX(CASE WHEN r.status = 'submitted' THEN r.total_score END) AS max_score,
	PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CASE WHEN r.status = 'submitted' THEN r.total_score END) AS median_score,

	jsonb_build_object(
		'outstanding', COUNT(CASE WHEN r.status = 'submitted' AND r.rating_level = 'outstanding' THEN 1 END),
		'very_good', COUNT(CASE WHEN r.status = 'submitted' AND r.rating_level = 'very_good' THEN 1 END),
		'good', COUNT(CASE WHEN r.status = 'submitted' AND r.rating_level = 'good' THEN 1 END),
		'satisfactory', COUNT(CASE WHEN r.status = 'submitted' AND r.rating_level = 'satisfactory' THEN 1 END),
		'needs_improvement', COUNT(CASE WHEN r.status = 'submitted' AND r.rating_level = 'needs_improvement' THEN 1 END)
	) AS rating_distribution,

	COUNT(CASE WHEN r.status = 'submitted' AND r.total_score < 400 THEN 1 END) AS low_performers_count,
	COUNT(CASE WHEN r.status = 'submitted' AND r.total_score >= 850 THEN 1 END) AS top_performers_count,

	COUNT(DISTINCT reg.id) AS total_regions,

	NOW() AS refreshed_at

FROM hmr_school_assessment_periods p
CROSS JOIN sms_regions reg
LEFT JOIN sms_schools s ON s.region_id = reg.id
LEFT JOIN hmr_school_assessment_reports r ON r.school_id = s.id AND r.period_id = p.id
GROUP BY p.id, p.academic_year, p.term_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_national_stats_period
ON school_assessment_national_stats(period_id);

CREATE OR REPLACE FUNCTION refresh_assessment_stats()
RETURNS void AS $$
BEGIN
	REFRESH MATERIALIZED VIEW CONCURRENTLY school_assessment_regional_stats;
	REFRESH MATERIALIZED VIEW CONCURRENTLY school_assessment_national_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION refresh_assessment_stats_for_period(p_period_id UUID)
RETURNS void AS $$
BEGIN
	-- Materialized views refresh as a whole; keep signature for callers.
	REFRESH MATERIALIZED VIEW CONCURRENTLY school_assessment_regional_stats;
	REFRESH MATERIALIZED VIEW CONCURRENTLY school_assessment_national_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_refresh_stats_on_submission()
RETURNS TRIGGER AS $$
BEGIN
	IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
		PERFORM refresh_assessment_stats();
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
	IF to_regclass('public.hmr_school_assessment_reports') IS NOT NULL THEN
		EXECUTE 'CREATE TRIGGER trigger_refresh_stats_on_report_submission '
				 || 'AFTER INSERT OR UPDATE OF status ON public.hmr_school_assessment_reports '
				 || 'FOR EACH ROW EXECUTE FUNCTION trigger_refresh_stats_on_submission()';
	END IF;
END $$;
