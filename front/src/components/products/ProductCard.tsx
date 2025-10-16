'use client';

import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Stack,
  Chip,
} from '@mui/material';
import { AccessTime, SupportAgent, School } from '@mui/icons-material';
import { PreSaleBadge } from './PreSaleBadge';
import { ProductPriceOption } from './ProductPriceOption';
import { ProductWithPrices } from '@/hooks/useProducts';
import { ProductPriceDoc } from '@/types/firestore';

interface ProductCardProps {
  product: ProductWithPrices;
  onSelectPrice: (price: ProductPriceDoc) => void;
}

export function ProductCard({ product, onSelectPrice }: ProductCardProps) {
  const isPreSale = product.status === 'pre_sale';

  // Group prices by mentorship inclusion
  const pricesWithoutMentorship = product.prices.filter((p) => !p.includes_mentorship);
  const pricesWithMentorship = product.prices.filter((p) => p.includes_mentorship);

  return (
    <Card
      elevation={3}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)',
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        {/* Header */}
        <Stack spacing={2} mb={3}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="h4" component="h2" fontWeight={700} color="text.primary">
              {product.name}
            </Typography>
            {isPreSale && <PreSaleBadge launchDate={product.launch_date} />}
          </Box>

          <Typography variant="body1" color="text.secondary" sx={{ minHeight: '3em' }}>
            {product.description}
          </Typography>
        </Stack>

        {/* Entitlements */}
        <Stack direction="row" spacing={1} flexWrap="wrap" mb={3}>
          {product.base_entitlements.platform_months === null ? (
            <Chip
              icon={<AccessTime />}
              label="Plataforma Vitalícia"
              variant="outlined"
              size="small"
            />
          ) : (
            <Chip
              icon={<AccessTime />}
              label={`${product.base_entitlements.platform_months} meses plataforma`}
              variant="outlined"
              size="small"
            />
          )}

          {product.base_entitlements.support_months && (
            <Chip
              icon={<SupportAgent />}
              label={`${product.base_entitlements.support_months} meses suporte`}
              variant="outlined"
              size="small"
            />
          )}

          {product.base_entitlements.mentorship_included && (
            <Chip
              icon={<School />}
              label="Mentoria Incluída"
              variant="outlined"
              color="success"
              size="small"
            />
          )}
        </Stack>

        {/* Pricing Options */}
        <Box>
          {/* Prices without mentorship */}
          {pricesWithoutMentorship.length > 0 && (
            <>
              <Typography variant="h6" fontWeight={600} mb={2} color="text.primary">
                Opções de Pagamento
              </Typography>
              <Grid container spacing={2} mb={pricesWithMentorship.length > 0 ? 3 : 0}>
                {pricesWithoutMentorship.map((price) => (
                  <Grid item xs={12} sm={6} md={4} key={price.id}>
                    <ProductPriceOption
                      price={price}
                      onSelect={() => onSelectPrice(price)}
                    />
                  </Grid>
                ))}
              </Grid>
            </>
          )}

          {/* Prices with mentorship */}
          {pricesWithMentorship.length > 0 && (
            <>
              <Typography variant="h6" fontWeight={600} mb={2} color="success.main">
                Com Mentoria Individual
              </Typography>
              <Grid container spacing={2}>
                {pricesWithMentorship.map((price) => (
                  <Grid item xs={12} sm={6} md={4} key={price.id}>
                    <ProductPriceOption
                      price={price}
                      onSelect={() => onSelectPrice(price)}
                    />
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
