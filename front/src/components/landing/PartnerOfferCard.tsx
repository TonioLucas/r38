'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  CurrencyBitcoin as BitcoinIcon,
} from '@mui/icons-material';

interface PartnerOfferCardProps {
  title: string;
  subtitle: string;
  benefits: string[];
  productId: string;
  prices: Array<{
    id: string;
    payment_method: string;
    display_amount: number;
    active: boolean;
  }>;
  productsLoading?: boolean;
}

/**
 * Partner offer product card - clone of regular ProductCard but R$100 pricing, no installments
 * Displayed inline on landing page when partner offer button is clicked
 */
export function PartnerOfferCard({
  title,
  subtitle,
  benefits,
  productId,
  prices,
  productsLoading = false,
}: PartnerOfferCardProps) {
  const [selectedPayment, setSelectedPayment] = useState<'btc' | 'pix' | 'card'>('btc');

  // Find the correct price ID based on payment method
  const getPriceId = (): string | null => {
    const paymentMethodMap: Record<string, string> = {
      btc: 'btc',
      pix: 'pix',
      card: 'credit_card',
    };

    const price = prices.find(
      (p) =>
        p.payment_method === paymentMethodMap[selectedPayment] &&
        p.active === true
    );

    return price?.id || null;
  };

  const priceId = getPriceId();

  // Get display amounts from prices
  const btcPrice = prices.find((p) => p.payment_method === 'btc')?.display_amount || 100;
  const pixPrice = prices.find((p) => p.payment_method === 'pix')?.display_amount || 100;
  const cardPrice = prices.find((p) => p.payment_method === 'credit_card')?.display_amount || 100;

  return (
    <Paper
      elevation={3}
      sx={{
        p: 4,
        borderRadius: 3,
        background: 'linear-gradient(135deg, #FF8C00 0%, #FFD54F 100%)',
        color: '#000000',
        border: '3px solid #FF8C00',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 40px rgba(255, 140, 0, 0.4)',
        },
      }}
    >
      <Stack spacing={3}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
          <Typography variant="h4" fontWeight={700}>
            {title}
          </Typography>
          <Chip
            label="ESPECIAL EX-PARCEIROS R$100"
            sx={{
              backgroundColor: '#000000',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.875rem',
              px: 2,
              py: 0.5,
            }}
          />
        </Box>

        <Typography variant="h6" sx={{ opacity: 0.9 }} color="#000000">
          {subtitle}
        </Typography>

        <Stack spacing={1}>
          {benefits.map((benefit, index) => (
            <Typography
              key={index}
              variant="body1"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              ✓ {benefit}
            </Typography>
          ))}
        </Stack>

        {/* Payment Method Toggle */}
        <ToggleButtonGroup
          value={selectedPayment}
          exclusive
          onChange={(e, newValue) => {
            if (newValue !== null) {
              setSelectedPayment(newValue);
            }
          }}
          aria-label="payment method"
          fullWidth
          sx={{
            '& .MuiToggleButton-root': {
              py: 2,
              border: '2px solid #000000',
              color: '#000000',
              fontWeight: 600,
              '&.Mui-selected': {
                backgroundColor: '#000000',
                color: '#FFFFFF',
                '&:hover': {
                  backgroundColor: '#1a1a1a',
                },
              },
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.1)',
              },
            },
          }}
        >
          <ToggleButton value="btc">
            <Stack alignItems="center" spacing={0.5}>
              <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 0.5 }}>BTC</Typography>
              <BitcoinIcon sx={{ fontSize: 20, mb: 0.5 }} />
              <Typography variant="body2" fontWeight={700}>
                R$ {btcPrice.toLocaleString('pt-BR')}
              </Typography>
            </Stack>
          </ToggleButton>
          <ToggleButton value="pix">
            <Stack alignItems="center" spacing={0.5}>
              <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 0.5 }}>PIX</Typography>
              <Typography variant="body2" fontWeight={700}>
                R$ {pixPrice.toLocaleString('pt-BR')}
              </Typography>
            </Stack>
          </ToggleButton>
          <ToggleButton value="card">
            <Stack alignItems="center" spacing={0.5}>
              <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 0.5 }}>CARTÃO</Typography>
              <CreditCardIcon sx={{ fontSize: 20, mb: 0.5 }} />
              <Typography variant="body2" fontWeight={700}>
                R$ {cardPrice.toLocaleString('pt-BR')}
              </Typography>
            </Stack>
          </ToggleButton>
        </ToggleButtonGroup>

        <Button
          variant="contained"
          size="large"
          href={productId && priceId ? `/checkout/oferta-100-especial?product=${productId}&price=${priceId}` : '#'}
          disabled={!productId || !priceId || productsLoading}
          sx={{
            py: 2,
            fontSize: '1.125rem',
            fontWeight: 700,
            backgroundColor: '#000000',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: '#1a1a1a',
              transform: 'translateY(-2px)',
            },
            '&:disabled': {
              backgroundColor: '#666666',
              color: '#CCCCCC',
            },
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease',
          }}
        >
          {productsLoading ? 'Carregando...' : 'Começar Agora'}
        </Button>

        <Typography
          variant="caption"
          textAlign="center"
          sx={{
            color: '#000000',
            fontWeight: 500,
            opacity: 0.8,
          }}
        >
          ⚠️ Oferta exclusiva para clientes de ex-parceiros
        </Typography>
      </Stack>
    </Paper>
  );
}
