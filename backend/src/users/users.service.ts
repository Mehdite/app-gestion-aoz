import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private parsePermissions(raw: string): string[] {
    try { return JSON.parse(raw); } catch { return []; }
  }

  private withPermissions<T extends { permissions: string }>(user: T) {
    return { ...user, permissions: this.parsePermissions(user.permissions) };
  }

  async create(data: { email: string; password: string; firstName: string; lastName: string; role?: string; phone?: string; permissions?: string[] }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('Un utilisateur avec cet email existe déjà');

    const { permissions, ...rest } = data;
    const hashed = await bcrypt.hash(rest.password, 12);
    const user = await this.prisma.user.create({
      data: { ...rest, password: hashed, permissions: JSON.stringify(permissions ?? []) },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, phone: true, permissions: true, isActive: true, createdAt: true },
    });
    return this.withPermissions(user);
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, role: true, phone: true, permissions: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return users.map(u => this.withPermissions(u));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, phone: true, permissions: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    return this.withPermissions(user);
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    if (data.password) data.password = await bcrypt.hash(data.password, 12);
    if (data.permissions && Array.isArray(data.permissions)) {
      data.permissions = JSON.stringify(data.permissions);
    }
    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, permissions: true, isActive: true },
    });
    return this.withPermissions(user);
  }

  async toggleActive(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    return this.prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
  }
}
