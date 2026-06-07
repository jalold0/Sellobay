'use client';

import { Button, Card } from '@ecom/ui';
import { Edit3, Home, MapPin, Plus, Trash2 } from 'lucide-react';

const MOCK_ADDRESSES = [
  {
    id: 'a1',
    label: 'Uy',
    isDefault: true,
    recipient: 'Akmal Karimov',
    phone: '+998 90 123 45 67',
    address: "Toshkent sh., Yunusobod, Mustaqillik ko'chasi 12-uy, 5-podyezd",
  },
  {
    id: 'a2',
    label: 'Ish',
    isDefault: false,
    recipient: 'Akmal Karimov',
    phone: '+998 90 123 45 67',
    address: "Toshkent sh., Mirzo Ulug'bek, IT Park, 5-bino",
  },
];

export default function AddressesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Manzillar</h1>
        <Button>
          <Plus size={16} className="mr-1" /> Yangi manzil
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {MOCK_ADDRESSES.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                {a.label === 'Uy' ? <Home size={18} /> : <MapPin size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{a.label}</span>
                  {a.isDefault && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      Asosiy
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm">{a.recipient}</div>
                <div className="text-xs text-muted-foreground">{a.phone}</div>
                <div className="mt-1 text-sm">{a.address}</div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent"
                  aria-label="Tahrirlash"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-red-600"
                  aria-label="O`chirish"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
