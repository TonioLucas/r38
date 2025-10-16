'use client';

import { Card, CardContent, CardActions, Typography, Button, Box, Chip } from '@mui/material';
import { CurrencyBitcoin, Pix, CreditCard } from '@mui/icons-material';
import { ProductPriceDoc } from '@/types/firestore';
import { formatInstallments, getPaymentMethodName } from '@/lib/utils/pricing';

interface ProductPriceOptionProps {
  price: ProductPriceDoc;
  onSelect: () => void;
  disabled?: boolean;
}

export function ProductPriceOption({ price, onSelect, disabled }: ProductPriceOptionProps) {
  const getPaymentIcon = (method: 'btc' | 'pix' | 'credit_card') => {
    switch (method) {
      case 'btc':
        return <CurrencyBitcoin />;
      case 'pix':
        return <Pix />;
      case 'credit_card':
        return <CreditCard />;
      default:
        return null;
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: 3,
          transform: 'translateY(-4px)',
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          {getPaymentIcon(price.payment_method)}
          <Typography variant="h6" component="div" fontWeight={600}>
            {getPaymentMethodName(price.payment_method)}
          </Typography>
        </Box>

        <Typography variant="h4" component="div" color="primary" fontWeight={700} gutterBottom>
          {formatInstallments(price)}
        </Typography>

        {price.includes_mentorship && (
          <Chip
            label="Com Mentoria"
            color="success"
            size="small"
            sx={{ mt: 1 }}
          />
        )}
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          variant="contained"
          fullWidth
          onClick={onSelect}
          disabled={disabled}
          sx={{
            py: 1.5,
            fontWeight: 600,
          }}
        >
          Comprar Agora
        </Button>
      </CardActions>
    </Card>
  );
}
