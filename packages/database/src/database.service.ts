import { PrismaClient } from '@prisma/client';

export class DatabaseService {
  public readonly prisma: PrismaClient;
  public connected = false;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async connect() {
    await this.prisma.$connect();
    this.connected = true;
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}
