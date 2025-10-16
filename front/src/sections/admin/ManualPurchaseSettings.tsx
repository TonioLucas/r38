"use client";

import { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  TextField,
  Button,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Box,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { getManualPurchaseSettings } from '@/lib/manualPurchaseToken';
import { updateManualPurchaseSettings } from '@/lib/api/admin';
import { useAuth } from '@/auth/useAuth';

export default function ManualPurchaseSettings() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [token, setToken] = useState('');
  const [priceReais, setPriceReais] = useState(5.00);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await getManualPurchaseSettings();
      if (settings) {
        setEnabled(settings.enabled || false);
        setToken(settings.override_token || '');
        setPriceReais(settings.override_price_reais || 5.00);
      } else {
        // Settings don't exist yet, use defaults
        setEnabled(false);
        setToken('');
        setPriceReais(5.00);
      }
    } catch (error) {
      console.error('Error loading manual purchase settings:', error);
      enqueueSnackbar('Erro ao carregar configurações', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      await updateManualPurchaseSettings({
        enabled,
        override_price_reais: priceReais,
        updated_by: user?.email || '',
      });

      enqueueSnackbar('Configurações salvas com sucesso', { variant: 'success' });
      await loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      enqueueSnackbar('Erro ao salvar configurações', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleRotateToken = async () => {
    try {
      setSaving(true);

      await updateManualPurchaseSettings({
        rotate_token: true,
        updated_by: user?.email || '',
      });

      enqueueSnackbar('Token rotacionado com sucesso', { variant: 'success' });
      await loadSettings();
    } catch (error) {
      console.error('Error rotating token:', error);
      enqueueSnackbar('Erro ao rotacionar token', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(token);
    enqueueSnackbar('Token copiado!', { variant: 'success' });
  };

  const handleCopyExampleUrl = () => {
    const exampleUrl = `https://renato38.com.br/checkout?product=PRODUCT_ID&price=PRICE_ID&dev_override=${token}`;
    navigator.clipboard.writeText(exampleUrl);
    enqueueSnackbar('URL de exemplo copiada!', { variant: 'success' });
  };

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Compra Manual (Dev Override)</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {loading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3}>
            <Alert severity="warning">
              <strong>Atenção:</strong> Esta funcionalidade permite compras a preço reduzido para testes em produção.
              Use apenas para validar o fluxo de pagamento. Todas as compras manuais são registradas no audit log.
            </Alert>

            <FormControlLabel
            control={
              <Switch
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                disabled={saving}
              />
            }
            label="Habilitar compra manual"
          />

          <TextField
            label="Token de Override"
            value={token}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleCopyToken} edge="end" title="Copiar token">
                    <CopyIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            helperText="Use este token no parâmetro &dev_override= da URL de checkout"
            fullWidth
          />

          <Button
            variant="outlined"
            onClick={handleRotateToken}
            disabled={saving}
            startIcon={<RefreshIcon />}
            sx={{ alignSelf: 'flex-start' }}
          >
            Rotacionar Token
          </Button>

          <TextField
            label="Preço Override (Reais)"
            type="number"
            value={priceReais}
            onChange={(e) => setPriceReais(parseFloat(e.target.value))}
            inputProps={{ step: 0.01, min: 0 }}
            helperText="Preço fixo para compras manuais (padrão: R$5.00)"
            disabled={saving}
          />

          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>
              <strong>Como usar:</strong>
            </Typography>
            <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>Habilite a funcionalidade acima</li>
              <li>Copie o token</li>
              <li>Acesse a URL de checkout com o parâmetro adicional</li>
              <li>Complete o checkout normalmente (será cobrado R${priceReais.toFixed(2)})</li>
            </ol>
            <Button
              size="small"
              onClick={handleCopyExampleUrl}
              startIcon={<CopyIcon />}
              sx={{ mt: 1 }}
            >
              Copiar URL de Exemplo
            </Button>
          </Alert>

            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              sx={{ alignSelf: 'flex-start' }}
            >
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
