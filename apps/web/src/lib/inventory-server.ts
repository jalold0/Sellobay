// Sellobay — ombor/inventar: tranzaksion amallar `@ecom/order-ops` da (admin va NestJS ham
// shundan oladi). Bu fayl mavjud importlar (`@/lib/inventory-server`) buzilmasligi uchun qoladi.
export {
  InsufficientStockError,
  deductStockForOrder,
  restockOrder,
  type StockLine,
} from '@ecom/order-ops';
