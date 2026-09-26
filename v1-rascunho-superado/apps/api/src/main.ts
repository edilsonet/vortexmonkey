import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module.ts";
import { loadConfig } from "@vortex/config";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix("api", { exclude: ["health"] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );
  const config = loadConfig();
  await app.listen(config.apiPort);
}

bootstrap();
