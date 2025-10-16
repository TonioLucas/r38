'use client';

import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  Divider,
  Chip,
} from '@mui/material';
import { CheckCircle, AccessTime, SupportAgent, School } from '@mui/icons-material';
import { ProductDoc, ProductPriceDoc } from '@/types/firestore';
import { formatInstallments, getPaymentMethodName } from '@/lib/utils/pricing';
import { PreSaleBadge } from '@/components/products/PreSaleBadge';

interface ProductStepProps {
  product: ProductDoc;
  selectedPrice: ProductPriceDoc;
  onNext: () => void;
  onBack: () => void;
}

export function ProductStep({ product, selectedPrice, onNext, onBack }: ProductStepProps) {
  const isPreSale = product.status === 'pre_sale';

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Stack spacing={3}>
          {/* Product Header */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="h5" fontWeight={700}>
              {product.name}
            </Typography>
            {isPreSale && <PreSaleBadge launchDate={product.launch_date} />}
          </Box>

          <Typography variant="body1" color="text.secondary">
            {product.description}
          </Typography>

          <Divider />

          {/* Entitlements */}
          <Box>
            <Typography variant="h6" fontWeight={600} mb={2}>
              O que está incluído:
            </Typography>
            <Stack spacing={1.5}>
              {product.base_entitlements.platform_months === null ? (
                <Chip
                  icon={<CheckCircle />}
                  label="Acesso vitalício à plataforma"
                  color="success"
                  variant="outlined"
                />
              ) : (
                <Chip
                  icon={<AccessTime />}
                  label={`${product.base_entitlements.platform_months} meses de acesso à plataforma`}
                  variant="outlined"
                />
              )}

              {product.base_entitlements.support_months && (
                <Chip
                  icon={<SupportAgent />}
                  label={`${product.base_entitlements.support_months} meses de suporte técnico`}
                  variant="outlined"
                />
              )}

              {(product.base_entitlements.mentorship_included || selectedPrice.includes_mentorship) && (
                <Chip
                  icon={<School />}
                  label="Mentoria individual incluída"
                  color="success"
                  variant="outlined"
                />
              )}
            </Stack>
          </Box>

          <Divider />

          {/* Selected Price */}
          <Box>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Opção selecionada:
            </Typography>
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #FF8C00 0%, #FFD54F 100%)',
                color: '#000',
              }}
            >
              <Typography variant="body2" fontWeight={600} mb={1}>
                {getPaymentMethodName(selectedPrice.payment_method)}
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {formatInstallments(selectedPrice)}
              </Typography>
              {selectedPrice.includes_mentorship && (
                <Chip
                  label="Com Mentoria"
                  size="small"
                  sx={{ mt: 1, bgcolor: 'success.main', color: 'white' }}
                />
              )}
            </Box>
          </Box>
        </Stack>
      </Paper>

      {/* Navigation Buttons */}
      <Box display="flex" justifyContent="space-between">
        <Button
          variant="outlined"
          onClick={onBack}
          size="large"
        >
          Voltar
        </Button>
        <Button
          variant="contained"
          onClick={onNext}
          size="large"
          sx={{ px: 4 }}
        >
          Continuar
        </Button>
      </Box>
    </Box>
  );
}
