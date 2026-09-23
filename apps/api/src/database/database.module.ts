import { Module, Global } from '@nestjs/common';
import { DatabaseService } from '@nexa/database';

@Global()
@Module({
  providers: [
    {
      provide: DatabaseService,
      useFactory: async () => {
        const db = new DatabaseService();
        await db.connect();
        return db;
      },
    }
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
