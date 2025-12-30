-- Migration: Create a test school and assign it to the test user
-- This creates a clearly labeled test school that won't conflict with real schools

-- First, get Region 9 ID (the test user already has Region 9 assigned)
DO $$
DECLARE
    v_region_id UUID;
    v_school_level_id UUID;
    v_test_school_id UUID;
    v_test_user_id UUID;
BEGIN
    -- Get Region 9 ID
    SELECT id INTO v_region_id 
    FROM sms_regions 
    WHERE name ILIKE '%Region 9%' OR name ILIKE '%9%'
    LIMIT 1;
    
    -- If no Region 9, get any region
    IF v_region_id IS NULL THEN
        SELECT id INTO v_region_id FROM sms_regions LIMIT 1;
    END IF;
    
    -- Get a Secondary school level (since the test user email is hm.se9999 - secondary)
    SELECT id INTO v_school_level_id 
    FROM sms_school_levels 
    WHERE name ILIKE '%secondary%'
    LIMIT 1;
    
    -- If no secondary level, get any school level
    IF v_school_level_id IS NULL THEN
        SELECT id INTO v_school_level_id FROM sms_school_levels LIMIT 1;
    END IF;
    
    -- Check if test school already exists
    SELECT id INTO v_test_school_id 
    FROM sms_schools 
    WHERE name = '[TEST] Secondary School 9999';
    
    -- Create the test school if it doesn't exist
    IF v_test_school_id IS NULL THEN
        INSERT INTO sms_schools (
            id,
            name,
            region_id,
            school_level_id,
            has_nursery_class
        ) VALUES (
            gen_random_uuid(),
            '[TEST] Secondary School 9999',
            v_region_id,
            v_school_level_id,
            false
        )
        RETURNING id INTO v_test_school_id;
        
        RAISE NOTICE 'Created test school with ID: %', v_test_school_id;
    ELSE
        RAISE NOTICE 'Test school already exists with ID: %', v_test_school_id;
    END IF;
    
    -- Get the test user ID
    SELECT id INTO v_test_user_id 
    FROM hmr_users 
    WHERE email = 'hm.se9999@moe.edu.gy';
    
    IF v_test_user_id IS NOT NULL THEN
        -- Assign the test school to the test user
        UPDATE hmr_users 
        SET school_id = v_test_school_id
        WHERE id = v_test_user_id;
        
        RAISE NOTICE 'Assigned test school to user: %', v_test_user_id;
    ELSE
        RAISE NOTICE 'Test user hm.se9999@moe.edu.gy not found';
    END IF;
END $$;

-- Verify the changes
SELECT 
    u.email,
    u.name as user_name,
    s.name as school_name,
    r.name as region_name,
    sl.name as school_level
FROM hmr_users u
LEFT JOIN sms_schools s ON u.school_id = s.id
LEFT JOIN sms_regions r ON s.region_id = r.id
LEFT JOIN sms_school_levels sl ON s.school_level_id = sl.id
WHERE u.email = 'hm.se9999@moe.edu.gy';
