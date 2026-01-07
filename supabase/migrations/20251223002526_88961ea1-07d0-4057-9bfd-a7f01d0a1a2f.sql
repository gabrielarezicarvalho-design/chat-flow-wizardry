-- Remove a role 'user' duplicada para o admin (mantendo apenas 'admin')
DELETE FROM user_roles 
WHERE user_id = '9f192877-5847-451e-9e99-8ffc0e17acb2' 
AND role = 'user';