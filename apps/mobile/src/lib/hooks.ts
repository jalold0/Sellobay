// Sellobay mobil — React Query hooks (jonli API ustida)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cancelOrder,
  fetchOrder,
  fetchOrders,
  fetchPickupPoints,
  fetchProduct,
  fetchProducts,
  returnOrder,
  updateOrder,
  type FetchProductsParams,
  type UpdateOrderInput,
} from './api';

export function useProducts(params: FetchProductsParams = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => fetchProducts(params),
    staleTime: 2 * 60_000, // 2 daq — web ISR bilan mos
  });
}

export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => fetchProduct(slug!),
    enabled: Boolean(slug),
    staleTime: 5 * 60_000,
  });
}

// ─── Topshirish punktlari ────────────────────────────────────────

export function usePickupPoints(params: { region?: string; city?: string } = {}) {
  return useQuery({
    queryKey: ['pickup-points', params],
    queryFn: () => fetchPickupPoints(params),
    staleTime: 10 * 60_000,
  });
}

// ─── Buyurtmalar ─────────────────────────────────────────────────

export function useOrders(enabled = true) {
  return useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    enabled,
    staleTime: 30_000,
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrder(id!),
    enabled: Boolean(id),
  });
}

/** PENDING buyurtmani bekor qilish — muvaffaqiyatda ro'yxat+detal keshini yangilaydi. */
export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelOrder(id),
    onSuccess: (_res, id) => {
      void qc.invalidateQueries({ queryKey: ['orders'] });
      void qc.invalidateQueries({ queryKey: ['order', id] });
    },
  });
}

/** PENDING buyurtmani tahrirlash — detal keshini yangilab, ro'yxatni invalidatsiya qiladi. */
export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: UpdateOrderInput }) => updateOrder(vars.id, vars.patch),
    onSuccess: (res, vars) => {
      if (res.order) qc.setQueryData(['order', vars.id], res.order);
      void qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

/** Yetkazilgan buyurtmani qaytarish — muvaffaqiyatda ro'yxat+detal keshini yangilaydi. */
export function useReturnOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; reason?: string }) => returnOrder(vars.id, vars.reason),
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: ['orders'] });
      void qc.invalidateQueries({ queryKey: ['order', vars.id] });
    },
  });
}
