const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('Error: SUPABASE_ACCESS_TOKEN environment variable not set.');
  process.exit(1);
}

async function runQuery(sql) {
  const res = await fetch('https://api.supabase.com/v1/projects/bidoztekidogxiljrcmy/database/query', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Query failed [${res.status}]: ${text}`);
  }
  return await res.json();
}

async function seedSuperAdmin() {
  const email = 'banarasikumarsahu@gmail.com';
  const password = 'Admin@2026Secure!';

  console.log(`Checking if user ${email} exists in auth.users...`);
  const users = await runQuery(`SELECT id, email FROM auth.users WHERE email = '${email}';`);

  let userId;
  if (users && users.length > 0) {
    userId = users[0].id;
    console.log(`User already exists with id: ${userId}. Updating password and email_confirmed_at...`);
    await runQuery(`
      UPDATE auth.users 
      SET 
        encrypted_password = crypt('${password}', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW(),
        raw_user_meta_data = jsonb_build_object('full_name', 'Super Admin')
      WHERE id = '${userId}';
    `);
  } else {
    console.log(`Creating user in auth.users...`);
    const insertResult = await runQuery(`
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        '${email}',
        crypt('${password}', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Super Admin"}'::jsonb,
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
      )
      RETURNING id;
    `);
    userId = insertResult[0].id;
    console.log(`User created with id: ${userId}`);
  }

  console.log(`Ensuring profile exists and setting role = 'SUPER_ADMIN'...`);
  await runQuery(`
    INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
    VALUES ('${userId}', 'Super Admin', 'SUPER_ADMIN', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE 
    SET role = 'SUPER_ADMIN', full_name = 'Super Admin', updated_at = NOW();
  `);

  console.log(`Verifying profile for ${userId}...`);
  const profile = await runQuery(`SELECT id, full_name, role FROM public.profiles WHERE id = '${userId}';`);
  console.log('Super Admin Profile verified:', profile);
  console.log('\n=============================================');
  console.log('Super Admin account successfully configured:');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Role:     ${profile[0].role}`);
  console.log('=============================================\n');
}

seedSuperAdmin().catch(console.error);
