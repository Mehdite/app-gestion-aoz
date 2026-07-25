'use client';

import { SaisirProductionForm } from '@/components/production/SaisirProductionForm';

export default function NouveauCATPage() {
  return <SaisirProductionForm companyCode="CAT" returnPath="/production-cat" />;
}
