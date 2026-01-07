-- Update both users to admin role
UPDATE public.user_roles SET role = 'admin' WHERE user_id = '8519b59e-5aa4-48ef-a384-bceef90c16e6';
UPDATE public.user_roles SET role = 'admin' WHERE user_id = 'f40a8e25-1bd3-44fa-a950-5339573f31b5';