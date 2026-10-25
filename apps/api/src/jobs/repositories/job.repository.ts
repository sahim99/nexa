import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@nexa/database';
import { Prisma } from '@prisma/client';

@Injectable()
export class JobRepository {
  constructor(private db: DatabaseService) {}

  async create(data: Prisma.TaskCreateInput) {
    return this.db.prisma.task.create({ data });
  }

  async findMany(params: { skip?: number; take?: number; where?: Prisma.TaskWhereInput }) {
    const { skip, take, where } = params;
    return this.db.prisma.task.findMany({ skip, take, where });
  }

  async update(params: { where: Prisma.TaskWhereUniqueInput; data: Prisma.TaskUpdateInput }) {
    const { where, data } = params;
    return this.db.prisma.task.update({ data, where });
  }
}