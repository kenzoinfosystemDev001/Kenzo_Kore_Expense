function readEnv(name: string, fallback: string): string {
  const value = process.env[name];

  if (value && value.trim()) {
    return value.trim();
  }

  return fallback;
}

export const appConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  frontendUrl: readEnv('FRONTEND_URL', 'https://kenzo-kore-expense.vercel.app'),
  corsOrigins: (readEnv('CORS_ORIGINS', readEnv('FRONTEND_URL', 'https://kenzo-kore-expense.vercel.app')))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  getJwtSecret(): string {
    return readEnv('JWT_SECRET', 'kenzo_kore_expense_secret_key_2026_production');
  },
  getScimToken(): string {
    return readEnv('SCIM_BEARER_TOKEN', 'kenzo_scim_provisioning_key_2026');
  },
};
