'use client';

import { SaisirProductionForm } from '@/components/production/SaisirProductionForm';

export default function NouveauAXAPage() {
  return <SaisirProductionForm companyCode="AXA" returnPath="/contrats" />;
}
