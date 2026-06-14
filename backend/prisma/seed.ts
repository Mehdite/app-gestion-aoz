import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('Admin@2024!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@assurancesoueedzem.ma' },
    update: {},
    create: {
      email: 'admin@assurancesoueedzem.ma',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'AOZ',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('Admin user created:', admin.email);

  const agentPassword = await bcrypt.hash('Agent@2024!', 12);
  const agent = await prisma.user.upsert({
    where: { email: 'agent@assurancesoueedzem.ma' },
    update: {},
    create: {
      email: 'agent@assurancesoueedzem.ma',
      password: agentPassword,
      firstName: 'Mohammed',
      lastName: 'Alaoui',
      role: 'AGENT',
      phone: '0612345678',
      isActive: true,
    },
  });
  console.log('Agent user created:', agent.email);

  const companies = [
    { name: 'AXA Assurance Maroc', code: 'AXA', email: 'contact@axa.ma', phone: '0522000000', contactName: 'Direction Commerciale' },
  ];

  for (const co of companies) {
    const company = await prisma.company.upsert({
      where: { code: co.code },
      update: {},
      create: co,
    });

    const products = [
      { name: 'Auto RC', type: 'AUTO', commissionRate: 12.5 },
      { name: 'Auto Tous Risques', type: 'AUTO', commissionRate: 15.0 },
      { name: 'Habitation', type: 'HOME', commissionRate: 20.0 },
      { name: 'Santé Individuelle', type: 'HEALTH', commissionRate: 10.0 },
      { name: 'Multirisque Pro', type: 'PROFESSIONAL', commissionRate: 18.0 },
      { name: 'Transport', type: 'TRANSPORT', commissionRate: 12.0 },
    ];

    for (const prod of products) {
      await prisma.companyProduct.create({ data: { ...prod, companyId: company.id } }).catch(() => {});
    }

    console.log(`Company seeded: ${company.name}`);
  }

  const clients = [
    {
      type: 'INDIVIDUAL',
      firstName: 'Youssef',
      lastName: 'Benali',
      cin: 'AB123456',
      phone: '0661234567',
      email: 'youssef.benali@gmail.com',
      address: '12 Rue Hassan II',
      city: 'Oued Zem',
      dateOfBirth: new Date('1985-06-15'),
    },
    {
      type: 'INDIVIDUAL',
      firstName: 'Fatima',
      lastName: 'Ziani',
      cin: 'CD789012',
      phone: '0677654321',
      email: 'fatima.ziani@gmail.com',
      address: '45 Avenue Mohammed V',
      city: 'Oued Zem',
      dateOfBirth: new Date('1992-03-20'),
    },
    {
      type: 'COMPANY',
      companyName: 'Transport Oued Zem SARL',
      ice: '001234567000001',
      rc: 'RC/12345',
      phone: '0523456789',
      email: 'contact@transport-oz.ma',
      address: 'Zone Industrielle',
      city: 'Oued Zem',
    },
  ];

  let clientNum = 1;
  for (const clientData of clients) {
    const clientNumber = `AOZ-2024-${String(clientNum).padStart(5, '0')}`;
    await prisma.client.upsert({
      where: { clientNumber },
      update: {},
      create: { ...clientData, clientNumber },
    });
    clientNum++;
    console.log(`Client seeded: ${(clientData as any).firstName ?? (clientData as any).companyName}`);
  }

  const settings = [
    { key: 'agency_name', value: 'Assurances Oued Zem' },
    { key: 'agency_address', value: 'Centre Ville, Oued Zem 26000, Maroc' },
    { key: 'agency_phone', value: '0523 456 789' },
    { key: 'agency_email', value: 'contact@assurancesoueedzem.ma' },
    { key: 'agency_ice', value: '002345678000001' },
    { key: 'renewal_alert_days', value: '60,30,15,7,3' },
    { key: 'currency', value: 'MAD' },
  ];

  for (const setting of settings) {
    await prisma.agencySetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log('Agency settings seeded');
  console.log('\nDatabase seeded successfully!');
  console.log('\nAdmin credentials:');
  console.log('   Email: admin@assurancesoueedzem.ma');
  console.log('   Password: Admin@2024!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
