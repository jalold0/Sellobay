# API Spravochnik

Asosiy backend API'ga umumiy ko'rsatma. To'liq spetsifikatsiya Swagger UI'da: http://localhost:4000/docs

## Bazaviy URL

```
http://localhost:4000/api/v1
```

## Autentifikatsiya

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
```

Javobda `accessToken` va `refreshToken`. Keyingi so'rovlarda:

```http
Authorization: Bearer <accessToken>
```

## Asosiy resurslar

| Resource | Endpoint |
|----------|----------|
| Kategoriyalar | `GET /api/v1/categories`, `/categories/tree`, `/categories/:slug` |
| Brendlar | `GET /api/v1/brands` |
| Mahsulotlar | `GET /api/v1/products?...`, `GET /api/v1/products/:slug` |
| Sharhlar | `GET /api/v1/reviews/product/:id`, `POST /api/v1/reviews` |
| Savatcha | `GET /api/v1/cart`, `POST /api/v1/cart/items`, `DELETE /api/v1/cart/items/:id` |
| Buyurtmalar | `POST /api/v1/orders`, `GET /api/v1/orders`, `GET /api/v1/orders/:id` |
| To'lovlar | `POST /api/v1/payments/initiate/:orderId/:provider`, `POST /api/v1/payments/webhook/:provider` |
| Foydalanuvchi | `GET /api/v1/users/me`, `/users/me/addresses` |
| Sog'liq | `GET /api/v1/health` |

## Xato format (RFC 7807-ga yaqin)

```json
{
  "statusCode": 404,
  "message": "Product not found",
  "error": "Not Found",
  "timestamp": "2026-06-06T10:00:00.000Z",
  "path": "/api/v1/products/foo"
}
```

## Pagination

`?page=1&limit=20` — javobda:

```json
{
  "items": [...],
  "total": 123,
  "page": 1,
  "limit": 20,
  "totalPages": 7
}
```

## Rate Limiting

Default: 100 so'rov / 60 soniya / IP. Auth endpoint'larida qattiqroq (kelajakda).
