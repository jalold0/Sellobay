import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@ecom/ui';

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Kirish</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Email yoki telefon" />
          <Input type="password" placeholder="Parol" />
          <Button className="w-full">Kirish</Button>
          <div className="text-center text-sm text-muted-foreground">yoki</div>
          <Button variant="outline" className="w-full">
            Google bilan kirish
          </Button>
          <Button variant="outline" className="w-full">
            Telegram bilan kirish
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
