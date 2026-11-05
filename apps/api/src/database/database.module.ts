import { Module, Global } from '@nestjs/common';
import { DatabaseService } from '@nexa/database';

@Global()
@Module({
  providers: [
    {
      provide: DatabaseService,
      useFactory: async () => {
        if (!process.env.DATABASE_URL) {
          console.warn(
            '[Database] DATABASE_URL is unset. Using the local docker-compose URL from .env.example. Connect failures are non-fatal.'
          );
          process.env.DATABASE_URL =
            'postgresql://nexa_user:nexa_pass@127.0.0.1:5432/nexa_db?schema=public';
        }
        const db = new DatabaseService();
        try {
          await db.connect();
        } catch (err: any) {
          console.warn(
            `[Database] Postgres is not reachable (${err?.message || err}). ` +
              'Auth, in-memory jobs, and agent registration still start. Plan compilation needs DATABASE_URL.'
          );
        }
        return db;
      },
    }
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
