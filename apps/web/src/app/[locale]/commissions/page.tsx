import { Card } from '@ecom/ui';
import { DollarSign } from 'lucide-react';

import { PageHero } from '../../../components/static/page-hero';

export const metadata = { title: 'Komissiyalar' };

const COMMISSIONS = [
  { category: 'Kiyim-kechak', rate: '10%' },
  { category: 'Poyabzal', rate: '12%' },
  { category: 'Atirlar', rate: '8%' },
  { category: 'Kosmetika', rate: '9%' },
  { category: "Go'zallik mahsulotlari", rate: '9%' },
  { category: 'Aksessuarlar', rate: '11%' },
];

export default function CommissionsPage() {
  return (
    <div className="space-y-8">
      <PageHero
        icon={DollarSign}
        title="Komissiya tarifi"
        description="Sotuvchilar uchun shaffof narx siyosati — yashirin to'lovlar yo'q."
        accent="emerald"
      />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Kategoriya</th>
              <th className="px-5 py-3 text-right font-medium">Komissiya</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {COMMISSIONS.map((c) => (
              <tr key={c.category}>
                <td className="px-5 py-3">{c.category}</td>
                <td className="px-5 py-3 text-right font-bold">{c.rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-lg font-bold">Qo`shimcha to`lovlar</h2>
        <ul className="space-y-2 text-sm">
          <li>• Express yetkazib berish: <strong>50 000 so`m</strong> (sotuvchidan)</li>
          <li>• Saqlash xizmati: <strong>Hozircha bepul</strong></li>
          <li>• Promo-kampaniya: <strong>Sotuvchi tanloviga ko`ra</strong></li>
        </ul>
      </Card>
    </div>
  );
}
