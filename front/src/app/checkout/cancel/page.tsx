'use client';

import {
  Box,
  Container,
  Paper,
  Typography,
  Stack,
  Button,
} from '@mui/material';
import { Cancel } from '@mui/icons-material';

export default function CheckoutCancelPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F5F5', py: 8 }}>
      <Container maxWidth="md">
        <Paper elevation={3} sx={{ p: { xs: 3, md: 6 } }}>
          <Stack spacing={4} alignItems="center" textAlign="center">
            <Cancel sx={{ fontSize: 100, color: 'warning.main' }} />

            <Typography variant="h3" fontWeight={700} color="warning.main">
              Pagamento Cancelado
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
              Sua compra foi cancelada. Nenhum valor foi cobrado.
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 600 }}>
              Se você encontrou algum problema durante o checkout ou tem dúvidas,
              por favor entre em contato com nosso suporte.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
              <Button
                variant="contained"
                size="large"
                href="/"
                sx={{ px: 4 }}
              >
                Voltar para Início
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
