import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RenewalsService {
  private readonly logger = new Logger(RenewalsService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async processRenewalAlerts() {
    this.logger.log('Processing renewal alerts...');
    const alertDays = [60, 30, 15, 7, 3];

    for (const days of alertDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      const alerts = await this.prisma.renewalAlert.findMany({
        where: {
          daysBeforeExpiry: days,
          isSent: false,
          contract: {
            status: 'ACTIVE',
            expiryDate: { gte: dayStart, lte: dayEnd },
          },
        },
        include: {
          contract: {
            include: { client: true, company: true, product: true },
          },
        },
      });

      for (const alert of alerts) {
        await this.sendRenewalNotification(alert, days);
      }
    }

    await this.prisma.contract.updateMany({
      where: { status: 'ACTIVE', expiryDate: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });

    this.logger.log('Renewal alerts processed');
  }

  private async sendRenewalNotification(alert: any, days: number) {
    const { contract } = alert;
    const clientName = contract.client.firstName
      ? `${contract.client.firstName} ${contract.client.lastName}`
      : contract.client.companyName;

    try {
      await this.prisma.notification.create({
        data: {
          channel: 'EMAIL',
          recipient: contract.client.email ?? '',
          subject: `Renouvellement contrat ${contract.contractNumber} — ${days} jours`,
          content: `Bonjour ${clientName},\n\nVotre contrat ${contract.contractNumber} (${contract.product?.name ?? contract.type}) expire dans ${days} jours le ${contract.expiryDate.toLocaleDateString('fr-MA')}.\n\nPrime annuelle: ${contract.primeTTC} MAD\n\nContactez-nous pour renouveler votre contrat.\n\nAssurances Oued Zem`,
          clientId: contract.clientId,
        },
      });

      await this.prisma.renewalAlert.update({
        where: { id: alert.id },
        data: { isSent: true, sentAt: new Date() },
      });

      this.logger.log(`Renewal alert sent for contract ${contract.contractNumber} (${days} days)`);
    } catch (error) {
      this.logger.error(`Failed to send renewal alert: ${error.message}`);
    }
  }
}
