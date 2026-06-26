'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  KpiCard,
  PageHeader,
  Separator,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ecom/ui';
import { ArrowLeft, CalendarDays, Crown, Mail, Phone, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';

import { Breadcrumbs } from '../../../components/layout/breadcrumbs';
import { OrderStatusBadge } from '../../../components/status/order-status-badge';
import {
  formatDate,
  formatMoney,
  formatNumber,
  formatRelative,
  initials,
} from '../../../lib/format';
import { mockCustomers, mockOrders } from '../../../lib/mock';

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const customer = mockCustomers.find((c) => c.id === id);
  if (!customer) return notFound();

  const fullName = `${customer.firstName} ${customer.lastName}`;
  const customerOrders = mockOrders.slice(0, Math.min(customer.ordersCount, 8));

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs overrides={{ [`/customers/${customer.id}`]: fullName }} />}
        title={fullName}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/customers">
              <ArrowLeft className="mr-2 h-4 w-4" /> Ro`yxat
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <Avatar className="h-16 w-16">
            <AvatarImage src={customer.avatarUrl} />
            <AvatarFallback>{initials(fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-xl font-semibold">{fullName}</div>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-sm">
              {customer.email ? (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> {customer.email}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {customer.phone}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> {formatRelative(customer.registeredAt)}
              </span>
            </div>
          </div>
          <StatusBadge tone={customer.status === 'ACTIVE' ? 'success' : 'danger'}>
            {customer.status === 'ACTIVE' ? 'Faol' : 'Bloklangan'}
          </StatusBadge>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Buyurtmalar"
          value={formatNumber(customer.ordersCount)}
          icon={ShoppingBag}
          accent="info"
        />
        <KpiCard label="Jami sarflagan" value={formatMoney(customer.totalSpent)} accent="success" />
        <KpiCard
          label="O`rtacha chek"
          value={formatMoney(customer.totalSpent / Math.max(customer.ordersCount, 1))}
          accent="primary"
        />
        <KpiCard
          label="Sodiqlik ballari"
          value={formatNumber(customer.loyaltyPoints)}
          icon={Crown}
          accent="warning"
        />
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Buyurtmalar</TabsTrigger>
          <TabsTrigger value="addresses">Manzillar</TabsTrigger>
          <TabsTrigger value="notes">Eslatmalar</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>So`nggi buyurtmalar</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {customerOrders.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-6 py-3 text-sm">
                    <Link
                      href={`/orders/${o.id}`}
                      className="font-mono font-medium hover:underline"
                    >
                      {o.number}
                    </Link>
                    <Separator orientation="vertical" className="h-4" />
                    <OrderStatusBadge status={o.status} />
                    <div className="ml-auto text-right">
                      <div className="font-semibold">{formatMoney(o.grandTotal)}</div>
                      <div className="text-muted-foreground text-xs">{formatDate(o.placedAt)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addresses">
          <Card>
            <CardHeader>
              <CardTitle>Saqlangan manzillar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border p-4 text-sm">
                <div className="font-medium">Uy</div>
                <div className="text-muted-foreground">
                  {customer.city ?? '—'}, Mustaqillik ko`chasi, 12-uy
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Admin eslatmalari</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Hech qanday eslatma yo`q.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
