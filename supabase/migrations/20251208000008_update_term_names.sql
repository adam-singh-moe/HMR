-- Migration: Update term names to simpler format
-- Description: Changes term names from "September-December" etc to "First Term" etc

-- First, drop the existing constraint on term_submission_config
ALTER TABLE term_submission_config DROP CONSTRAINT IF EXISTS term_submission_config_term_name_check;

-- Update term names in term_submission_config
UPDATE term_submission_config SET term_name = 'First Term' WHERE term_number = 1;
UPDATE term_submission_config SET term_name = 'Second Term' WHERE term_number = 2;
UPDATE term_submission_config SET term_name = 'Third Term' WHERE term_number = 3;

-- Add new constraint with updated values
ALTER TABLE term_submission_config ADD CONSTRAINT term_submission_config_term_name_check 
    CHECK (term_name IN ('First Term', 'Second Term', 'Third Term'));

-- Update school_assessment_periods table
ALTER TABLE school_assessment_periods DROP CONSTRAINT IF EXISTS school_assessment_periods_term_name_check;

UPDATE school_assessment_periods SET term_name = 'First Term' WHERE term_name = 'September-December';
UPDATE school_assessment_periods SET term_name = 'Second Term' WHERE term_name = 'January-March';
UPDATE school_assessment_periods SET term_name = 'Third Term' WHERE term_name = 'April-July';

ALTER TABLE school_assessment_periods ADD CONSTRAINT school_assessment_periods_term_name_check 
    CHECK (term_name IN ('First Term', 'Second Term', 'Third Term'));
