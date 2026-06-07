import { Button, Card, EmptyState } from '@ecom/ui';
import { CreditCard, Plus } from 'lucide-react';

export default function PaymentMethodsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">To&apos;lov usullari</h1>
        <Button>
          <Plus size={16} className="mr-1" /> Yangi karta
        </Button>
      </div>
      <Card className="p-5">
        <EmptyState
          icon={CreditCard}
          title="Hali kartalar saqlanmagan"
          description="Tezroq xarid qilish uchun karta ma`lumotlaringizni xavfsiz saqlang"
          action={
            <Button>
              <Plus size={16} className="mr-1" /> Karta qo&apos;shish
            </Button>
          }
        />
      </Card>
    </div>
  );
}
