'use client';

import {
  Box,
  Button,
  Paper,
  Typography,
  Stack,
  Alert,
} from '@mui/material';
import { Pix, Construction } from '@mui/icons-material';

interface PIXComingSoonProps {
  onBack: () => void;
}

export function PIXComingSoon({ onBack }: PIXComingSoonProps) {
  return (
    <Box>
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Box sx={{ position: 'relative' }}>
            <Pix sx={{ fontSize: 80, color: '#32BCAD', opacity: 0.3 }} />
            <Construction
              sx={{
                fontSize: 40,
                color: '#FF8C00',
                position: 'absolute',
                bottom: 0,
                right: -10,
              }}
            />
          </Box>

          <Typography variant="h5" fontWeight={700}>
            PIX - Em Breve!
          </Typography>

          <Alert severity="info" sx={{ width: '100%' }}>
            O pagamento via PIX está temporariamente pausado e será liberado em breve.
          </Alert>

          <Typography variant="body2" color="text.secondary">
            Enquanto isso, você pode utilizar cartão de crédito ou Bitcoin (BTC) para realizar sua compra.
          </Typography>

          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            Volte e selecione outra forma de pagamento.
          </Typography>
        </Stack>
      </Paper>

      {/* Navigation Button */}
      <Box display="flex" justifyContent="flex-start">
        <Button
          variant="outlined"
          onClick={onBack}
          size="large"
        >
          Voltar
        </Button>
      </Box>
    </Box>
  );
}
