'use client';

import { Button, Box } from '@mui/material';
import { CardGiftcard, ExpandMore, ExpandLess } from '@mui/icons-material';

interface PartnerOfferButtonProps {
  isVisible: boolean;
  onToggle: () => void;
}

/**
 * CTA button for former partner customers to access R$100 special offer
 * Toggles visibility of partner offer product card on landing page
 */
export function PartnerOfferButton({ isVisible, onToggle }: PartnerOfferButtonProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        mb: 4,
        px: 2,
      }}
    >
      <Button
        variant="contained"
        size="large"
        startIcon={<CardGiftcard />}
        endIcon={isVisible ? <ExpandLess /> : <ExpandMore />}
        onClick={onToggle}
        sx={{
          bgcolor: '#FF8C00',
          color: '#FFFFFF',
          fontWeight: 600,
          fontSize: { xs: '0.875rem', sm: '1rem' },
          px: { xs: 2, sm: 4 },
          py: 1.5,
          borderRadius: 2,
          textTransform: 'none',
          maxWidth: '600px',
          width: '100%',
          '&:hover': {
            bgcolor: '#E67E00',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(255, 140, 0, 0.3)',
          },
          transition: 'all 0.3s ease',
        }}
      >
        Cliente de Ex-Parceiros? Batismo Bitcoin ou Bitcoin Blackpill? Pague apenas R$100
      </Button>
    </Box>
  );
}
