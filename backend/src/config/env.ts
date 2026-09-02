function readEnv(name: string, fallback?: string): string {
  const value = process.env[name];

  if (value && value.trim()) {
    return value.trim();
  }

  if (fallback !== undefined) {
    return fallback;
  }

  if ((process.env.NODE_ENV || 'development') === 'production') {
    throw new Error(`${name} is required in production environment.`);
  }

  return '';
}

export const appConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  frontendUrl: readEnv('FRONTEND_URL', 'http://localhost:5173'),
  corsOrigins: (readEnv('CORS_ORIGINS', readEnv('FRONTEND_URL', 'http://localhost:5173')))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  getJwtSecret(): string {
    return readEnv('JWT_SECRET');
  },
  getScimToken(): string {
    return readEnv('SCIM_BEARER_TOKEN');
  },
};
