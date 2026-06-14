import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor(private prisma: PrismaService, private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST'),
      port: config.get<number>('SMTP_PORT', 587),
      secure: config.get('SMTP_SECURE') === 'true',
      auth: {
        user: config.get('SMTP_USER'),
        pass: config.get('SMTP_PASS'),
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string, clientId?: string) {
    try {
      await this.transporter.sendMail({
        from: `"Assurances Oued Zem" <${this.config.get('SMTP_FROM', 'noreply@assurancesoueedzem.ma')}>`,
        to,
        subject,
        html,
      });

      await this.prisma.notification.create({
        data: { channel: 'EMAIL', recipient: to, subject, content: html, sentAt: new Date(), clientId },
      });

      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
    }
  }

  async findAll(params: { page?: number; limit?: number; clientId?: string; channel?: string }) {
    const { page = 1, limit = 20, clientId, channel } = params;
    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (channel) where.channel = channel;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        include: { client: { select: { firstName: true, lastName: true, companyName: true } } },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
  }
}
