// Sellobay mobil — React Query hooks (jonli API ustida)
import { useQuery } from '@tanstack/react-query';

import { fetchProduct, fetchProducts, type FetchProductsParams } from './api';

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
