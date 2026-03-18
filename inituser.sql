INSERT INTO
    public.users (
        id,
        username,
        email,
        "password",
        "userType",
        "profileName",
        "profilePhone",
        "profileAvatar",
        "isActive",
        "createdAt",
        "updatedAt"
    )
VALUES (
        'c317dbfc-2e8e-4ab9-b280-8c630004945e',
        'Admin',
        'admin@test.com',
        '$2b$10$cHYqxsnrNDDEZTs/RYmC5uQHqygxv.0yQUXypJ4MQuD/M5LzhNK1e',
        'admin'::public."UserType",
        'admin',
        '',
        '',
        true,
        '2026-02-01 13:16:35.113',
        '2026-02-01 13:16:35.113'
    );