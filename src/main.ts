import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {

      const allowedDomains = [
        `${configService.get<string>('app.cors.origin')}`,
      ]
      if (!origin || allowedDomains.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
      
    },
    credentials: configService.get<boolean>('app.cors.credentials') ?? true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cookie',
    ],
    exposedHeaders: ['Content-Range', 'X-Total-Count', 'Set-Cookie'],
  })

  app.use(helmet())
  app.use(cookieParser())
  app.setGlobalPrefix('api')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true
      }
    })
  )

  app.use((req: any, res: any, next: () => void) => {
    const startTime = Date.now();
    console.log(`Incoming request: `, {
      method: req.method,
      url: req.url,
      ip: req.ip,
    });
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(`Response sent for: `, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      });
    });
    next();
  });

  await app.listen(configService.get<number>('app.port') ?? 8000);
  console.log(`Server is running on port ${configService.get<number>('app.port') ?? 8000}`);
}

bootstrap()
.then(() => {
  console.log('Application started successfully');
})
.catch((error) => {
  console.error('Application failed to start', error);
  process.exit(1);
});