'use client';

import { Grid, Container, Typography, Box, CircularProgress } from '@mui/material';
import { ProductCard } from './ProductCard';
import { ProductWithPrices } from '@/hooks/useProducts';
import { ProductPriceDoc } from '@/types/firestore';

interface ProductGridProps {
  products: ProductWithPrices[];
  loading?: boolean;
  onSelectPrice: (product: ProductWithPrices, price: ProductPriceDoc) => void;
}

export function ProductGrid({ products, loading, onSelectPrice }: ProductGridProps) {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (products.length === 0) {
    return (
      <Container maxWidth="md">
        <Box textAlign="center" py={8}>
          <Typography variant="h5" color="text.secondary">
            Nenhum produto disponível no momento.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Grid container spacing={4}>
      {products.map((product) => (
        <Grid item xs={12} key={product.id}>
          <ProductCard
            product={product}
            onSelectPrice={(price) => onSelectPrice(product, price)}
          />
        </Grid>
      ))}
    </Grid>
  );
}
