'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  FormControlLabel,
  Checkbox,
  Paper,
  Alert,
  Stack,
  Link,
} from '@mui/material';
import { Info, WhatsApp } from '@mui/icons-material';
import { WHATSAPP_CONTACT_LINK } from '@/types/partner-offer';

interface ManualVerificationNoticeProps {
  onNext: () => void;
  onBack: () => void;
}

/**
 * Notice step informing user about manual verification process
 * Requires user acknowledgment before proceeding to payment
 */
export function ManualVerificationNotice({ onNext, onBack }: ManualVerificationNoticeProps) {
  const [agreed, setAgreed] = useState(false);

  const handleNext = () => {
    if (agreed) {
      onNext();
    }
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Stack spacing={3}>
          <Box display="flex" alignItems="center" gap={1}>
            <Info color="info" />
            <Typography variant="h5" fontWeight={700}>
              Verificação Manual
            </Typography>
          </Box>

          <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
            <Typography variant="body1" gutterBottom>
              Sua verificação será feita manualmente pela nossa equipe.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Após a confirmação do seu pagamento e aprovação da verificação, você receberá um email com as credenciais de acesso à plataforma.
            </Typography>
          </Alert>

          <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.paper' }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" fontWeight={600} color="text.primary">
                Como funciona:
              </Typography>

              <Box component="ol" sx={{ pl: 2, m: 0 }}>
                <Typography component="li" variant="body2" sx={{ mb: 1, color: 'text.primary' }}>
                  Complete o pagamento na próxima etapa
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1, color: 'text.primary' }}>
                  Nossa equipe verificará seu comprovante de compra anterior
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1, color: 'text.primary' }}>
                  Após aprovação, você receberá um email com suas credenciais
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1, color: 'text.primary' }}>
                  O processo de verificação pode levar até 48 horas úteis
                </Typography>
                <Typography component="li" variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                  Se o comprovante for recusado, faremos o reembolso sem questionamentos
                </Typography>
              </Box>
            </Stack>
          </Paper>

          <Alert severity="warning" icon={<WhatsApp />}>
            <Typography variant="body2">
              Dúvidas? Entre em contato pelo WhatsApp:{' '}
              <Link
                href={WHATSAPP_CONTACT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ fontWeight: 600 }}
              >
                Clique aqui
              </Link>
            </Typography>
          </Alert>

          <FormControlLabel
            control={
              <Checkbox
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="body2">
                Eu confirmo que li e entendi o processo de verificação manual e concordo em aguardar a aprovação antes de receber acesso à plataforma.
              </Typography>
            }
          />
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
          onClick={handleNext}
          size="large"
          disabled={!agreed}
          sx={{ px: 4 }}
        >
          Continuar para Pagamento
        </Button>
      </Box>
    </Box>
  );
}
