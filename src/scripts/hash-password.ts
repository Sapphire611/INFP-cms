import bcrypt from 'bcryptjs';

const password = process.argv[2] || 'admin123';

bcrypt.hash(password, 10).then(hash => {
  console.log(`密码: ${password}`);
  console.log(`哈希: ${hash}`);
});
