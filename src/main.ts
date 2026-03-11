import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PROJECT_CONSTANTS } from './common/constants/project-constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix(process.env.API_PREFIX ?? PROJECT_CONSTANTS.GLOBAL_API_PREFIX);
  app.enableCors();
  const port = process.env.PORT || PROJECT_CONSTANTS.DEFAULT_PORT;
  await app.listen(port);
}
bootstrap();
