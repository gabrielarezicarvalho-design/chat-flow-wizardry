-- Update existing users without company_id to belong to the Next Pro company
UPDATE profiles 
SET company_id = 'ab2980c6-ab31-410a-a461-bfb4fe099eb1' 
WHERE username IN ('igor', 'teste', 'gui') 
  AND company_id IS NULL;