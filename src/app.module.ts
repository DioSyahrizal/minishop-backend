import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DbModule } from './db/db.module.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [DbModule, HealthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
