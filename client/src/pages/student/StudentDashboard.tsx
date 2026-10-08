// PLACEHOLDER — will be replaced by the page implementation.
import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function StudentDashboard() {
  useDocumentTitle("Bosh sahifa");
  return (
    <>
      <PageHeader title="Bosh sahifa" description="Rejalaringiz va natijalaringiz statistikasi." />
      <Card>
        <EmptyState icon={<Construction />} title="Tez orada" description="Bu sahifa ustida ish olib borilmoqda." />
      </Card>
    </>
  );
}
