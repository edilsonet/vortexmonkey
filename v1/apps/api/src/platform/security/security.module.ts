import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { readSecret } from '@vortex/config';

const jwtSecret = (): string => {
  if (process.env.NODE_ENV === 'test' && !process.env.JWT_SECRET_FILE) return process.env.JWT_SECRET ?? 'vortex-test-secret-at-least-thirty-two-characters';
  return readSecret('JWT_SECRET_FILE', 'JWT_SECRET');
};

@Global()
@Module({ imports: [JwtModule.register({ secret: jwtSecret(), signOptions: { issuer: process.env.JWT_ISSUER ?? 'vortex.local', audience: process.env.JWT_AUDIENCE ?? 'vortex-api', expiresIn: '15m' } })], exports: [JwtModule] })
export class SecurityModule {}
