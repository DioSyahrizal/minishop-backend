import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { DrizzleHealthIndicator } from './drizzle.health.js';
import { TerminusModule } from '@nestjs/terminus';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [DrizzleHealthIndicator],
})
export class HealthModule {}
