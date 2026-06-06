# @ecom/database

Prisma + PostgreSQL — markaziy ma'lumotlar bazasi paketi. Barcha jadvallar, migratsiyalar, seed va Prisma client shu yerda.

## Foydalanish

Root'dan:

```bash
pnpm db:generate     # Prisma client generatsiya qilish
pnpm db:migrate      # Yangi migratsiya (dev)
pnpm db:seed         # Boshlang'ich ma'lumotlar
pnpm db:studio       # Prisma Studio
```

## Domenlar

| Domain | Asosiy modellar |
|--------|-----------------|
| Users & Auth | User, UserRoleAssignment, UserIdentity, UserAddress, UserSession, RefreshToken, OtpCode, PushToken |
| Catalog | Category, Brand, Attribute, Product, ProductVariant, ProductImage |
| Reviews | Review, ProductQuestion |
| Cart | Cart, CartItem, WishlistItem |
| Orders | Order, OrderItem, OrderStatusHistory, Payment, PaymentMethod |
| Sellers | Seller, SellerPayout |
| Warehouses (WMS) | Warehouse, WarehouseLocation, InventoryItem, StockMovement |
| Delivery | Courier, Delivery, DeliveryEvent |
| Marketing | PromoCode, UserCoupon, LoyaltyTransaction, Campaign |
| CRM | CustomerSegment, CustomerSegmentMembership, SupportTicket, TicketMessage |
| Finance | Invoice, Transaction |
| Notifications | Notification |
| Audit | AuditLog |

## Ko'p tillilik

Foydalanuvchiga ko'rsatiladigan matnli maydonlar (`name`, `description`, `metaTitle`, ...) `Json` tipida `{ "uz": "...", "ru": "...", "en": "..." }` formatida saqlanadi.
