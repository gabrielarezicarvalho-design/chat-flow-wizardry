
-- Fix samara's role from 'user' to 'agent'
UPDATE user_roles 
SET role = 'agent' 
WHERE user_id = '1cce64ce-5070-4c2b-9fa4-0818a5cd0d59';
