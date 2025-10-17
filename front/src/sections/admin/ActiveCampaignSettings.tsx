"use client";

import { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
  TextField,
  Button,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { fetchActiveCampaignTags, updateActiveCampaignSettings } from '@/lib/api/admin';
import { useAuth } from '@/auth/useAuth';
import type { ActiveCampaignSettings as ACSettings } from '@/types/firestore';

interface TagOption {
  id: string;
  name: string;
}

export default function ActiveCampaignSettings() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingTags, setFetchingTags] = useState(true);

  // Available tags from AC API
  const [availableTags, setAvailableTags] = useState<TagOption[]>([]);

  // Current settings
  const [ebookTagName, setEbookTagName] = useState('');
  const [provisioningTagName, setProvisioningTagName] = useState('');
  const [abandonedCheckoutTagName, setAbandonedCheckoutTagName] = useState('');

  useEffect(() => {
    loadSettings();
    loadAvailableTags();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsRef = doc(db, 'settings', 'main');
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        const acSettings = data.activecampaign as ACSettings | undefined;

        if (acSettings) {
          setEbookTagName(acSettings.ebook_tag_name || '');
          setProvisioningTagName(acSettings.provisioning_tag_name || '');
          setAbandonedCheckoutTagName(acSettings.abandoned_checkout_tag_name || '');
        }
      }
    } catch (error) {
      console.error('Error loading ActiveCampaign settings:', error);
      enqueueSnackbar('Erro ao carregar configurações', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTags = async () => {
    try {
      setFetchingTags(true);
      const response = await fetchActiveCampaignTags();

      if (response.success && response.tags) {
        setAvailableTags(response.tags);
      } else {
        // Fallback to empty list if AC API fails
        setAvailableTags([]);
        console.warn('Failed to fetch ActiveCampaign tags:', response.error);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      setAvailableTags([]);
    } finally {
      setFetchingTags(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      await updateActiveCampaignSettings({
        ebook_tag_name: ebookTagName,
        provisioning_tag_name: provisioningTagName,
        abandoned_checkout_tag_name: abandonedCheckoutTagName,
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

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Configurações ActiveCampaign</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {loading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3}>
            <Alert severity="info">
              Configure as tags do ActiveCampaign para automações de email.
              As tags são aplicadas automaticamente em diferentes etapas do funil.
            </Alert>

            {/* Ebook Tag - Read Only */}
            <TextField
              label="Tag E-book"
              value={ebookTagName}
              disabled
              helperText="Tag atual do e-book (não editável via painel)"
              fullWidth
            />

            {/* Provisioning Tag - Dropdown */}
            {fetchingTags ? (
              <Box display="flex" alignItems="center" gap={2}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Carregando tags do ActiveCampaign...
                </Typography>
              </Box>
            ) : availableTags.length > 0 ? (
              <Autocomplete
                options={availableTags}
                getOptionLabel={(option) => option.name}
                value={availableTags.find(t => t.name === provisioningTagName) || null}
                onChange={(_, newValue) => {
                  setProvisioningTagName(newValue?.name || '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tag de Provisionamento"
                    helperText="Tag para trigger de email de boas-vindas após compra"
                    disabled={saving}
                  />
                )}
                disabled={saving}
                fullWidth
              />
            ) : (
              <TextField
                label="Tag de Provisionamento"
                value={provisioningTagName}
                onChange={(e) => setProvisioningTagName(e.target.value)}
                helperText="Tag para trigger de email de boas-vindas (falha ao carregar tags da AC)"
                disabled={saving}
                fullWidth
              />
            )}

            {/* Abandoned Checkout Tag - Dropdown */}
            {fetchingTags ? null : availableTags.length > 0 ? (
              <Autocomplete
                options={availableTags}
                getOptionLabel={(option) => option.name}
                value={availableTags.find(t => t.name === abandonedCheckoutTagName) || null}
                onChange={(_, newValue) => {
                  setAbandonedCheckoutTagName(newValue?.name || '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tag de Carrinho Abandonado"
                    helperText="Tag para remarketing de carrinhos abandonados (opcional)"
                    disabled={saving}
                  />
                )}
                disabled={saving}
                fullWidth
              />
            ) : (
              <TextField
                label="Tag de Carrinho Abandonado"
                value={abandonedCheckoutTagName}
                onChange={(e) => setAbandonedCheckoutTagName(e.target.value)}
                helperText="Tag para remarketing de carrinhos abandonados (falha ao carregar tags da AC)"
                disabled={saving}
                fullWidth
              />
            )}

            <Alert severity="warning">
              <Typography variant="body2">
                <strong>Importante:</strong> As alterações afetam apenas novas automações.
                Tags aplicadas anteriormente não são alteradas.
              </Typography>
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
