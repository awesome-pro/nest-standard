import { registerAs } from "@nestjs/config";

export default registerAs('app', () => ({
    port: parseInt(process.env.PORT!, 10) || 8000,
    nodeEnv: process.env.NODE_ENV! || 'development',
    cors: {
        origin: process.env.CORS_ORIGIN! || 'http://localhost:3000',
        credentials: true,
    },
    jwt : {
        secret: process.env.JWT_SECRET_TOKEN ?? 'super-secret-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
    },
}))