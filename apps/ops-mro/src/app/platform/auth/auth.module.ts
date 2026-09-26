import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';
import { RefreshTokenService } from './refresh-token.service';

/**
 * Autenticacao. Global para que o `RequestContextMiddleware` (registrado no
 * `AppModule`) e os guards resolvam o `JwtService` sem reimportar o modulo.
 */
@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtService, RefreshTokenService],
  exports: [JwtService],
})
export class AuthModule {}
