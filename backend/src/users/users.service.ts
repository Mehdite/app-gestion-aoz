import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: { email: string; password: string; firstName: string; lastName: string; role?: string; phone?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('Un utilisateur avec cet email existe déjà');

    const hashed = await bcrypt.hash(data.password, 12);
    return this.prisma.user.create({
      data: { ...data, password: hashed },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, phone: true, isActive: true, createdAt: true },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, role: true, phone: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, phone: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    return user;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    if (data.password) data.password = await bcrypt.hash(data.password, 12);
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
    });
  }

  async toggleActive(id: string) {
    const user = await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
  }
}
