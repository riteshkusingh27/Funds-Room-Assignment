import dotenv from "dotenv";

dotenv.config();

const required = ["DATABASE_URL", "JWT_SECRET"] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  port: Number(process.env.PORT ?? 5000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL as string,
  jwtSecret: process.env.JWT_SECRET as string,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "24h",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  r2Endpoint: process.env.R2_ENDPOINT ?? "https://1c814e1821a0777ffe4eb60b359a79b5.r2.cloudflarestorage.com",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "383a0d21d2933224e693d795c013eba0",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "312bbfeb90997cb24cfcfe134b3251fbad4ad4c8c66e0fbd9cc244ff6f317de2",
  r2BucketName: process.env.R2_BUCKET_NAME ?? "product-images"
};
