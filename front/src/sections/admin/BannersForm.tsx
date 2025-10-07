"use client";

import { useState, useEffect } from 'react';
import {
  Box, Button, Grid, Card, CardMedia, CardActions, CardContent,
  IconButton, Typography, CircularProgress, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { CloudUpload, Delete, ArrowUpward, ArrowDownward, Link as LinkIcon } from '@mui/icons-material';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { useSnackbar } from 'notistack';

interface Banner {
  url: string;
  alt: string;
  storagePath: string;
  order: number;
  link?: string;
}

export function BannersForm() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editLink, setEditLink] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  // Load existing banners from Firestore
  useEffect(() => {
    loadBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBanners = async () => {
    try {
      setLoading(true);
      const settingsRef = doc(db, 'settings', 'main');
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setBanners(data.banners || []);
      }
    } catch (error) {
      console.error('Error loading banners:', error);
      enqueueSnackbar('Erro ao carregar banners', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Handle banner upload with validation
  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      enqueueSnackbar('Por favor, selecione uma imagem', { variant: 'warning' });
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      enqueueSnackbar('A imagem deve ter no máximo 5MB', { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);

      // Upload to Firebase Storage
      const storagePath = `banners/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);

      // Add to banners array with order
      const newBanner: Banner = {
        url,
        alt: file.name,
        storagePath,
        order: banners.length, // Add to end
      };

      const updatedBanners = [...banners, newBanner];
      setBanners(updatedBanners);

      // Save to Firestore immediately
      await saveBanners(updatedBanners);

      enqueueSnackbar('Banner adicionado com sucesso', { variant: 'success' });
    } catch (error) {
      console.error('Error uploading banner:', error);
      enqueueSnackbar('Erro ao fazer upload do banner', { variant: 'error' });
    } finally {
      setLoading(false);
    }

    event.target.value = ''; // Reset input
  };

  // Handle banner deletion
  const handleBannerDelete = async (index: number) => {
    try {
      setLoading(true);
      const bannerToDelete = banners[index];

      // Delete from Storage
      if (bannerToDelete.storagePath) {
        try {
          const storageRef = ref(storage, bannerToDelete.storagePath);
          await deleteObject(storageRef);
        } catch {
          console.log('Banner might already be deleted from storage');
        }
      }

      // Remove from array and re-order
      const updatedBanners = banners
        .filter((_, i) => i !== index)
        .map((banner, i) => ({ ...banner, order: i }));

      setBanners(updatedBanners);
      await saveBanners(updatedBanners);

      enqueueSnackbar('Banner removido com sucesso', { variant: 'success' });
    } catch (error) {
      console.error('Error deleting banner:', error);
      enqueueSnackbar('Erro ao remover banner', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Handle reordering
  const moveBanner = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    // Validate bounds
    if (newIndex < 0 || newIndex >= banners.length) return;

    const updatedBanners = [...banners];
    [updatedBanners[index], updatedBanners[newIndex]] =
      [updatedBanners[newIndex], updatedBanners[index]];

    // Update order fields
    updatedBanners.forEach((banner, i) => {
      banner.order = i;
    });

    setBanners(updatedBanners);
    await saveBanners(updatedBanners);
  };

  // Save banners to Firestore
  const saveBanners = async (bannersToSave: Banner[]) => {
    const settingsRef = doc(db, 'settings', 'main');
    await setDoc(settingsRef, {
      banners: bannersToSave,
      updatedAt: serverTimestamp(),
    }, { merge: true }); // Use merge to preserve other settings
  };

  // Handle link edit
  const handleEditLink = (index: number) => {
    setEditingIndex(index);
    setEditLink(banners[index].link || '');
  };

  const handleSaveLink = async () => {
    if (editingIndex === null) return;

    const updatedBanners = [...banners];
    updatedBanners[editingIndex].link = editLink.trim() || undefined;
    setBanners(updatedBanners);
    await saveBanners(updatedBanners);
    setEditingIndex(null);
    setEditLink('');
    enqueueSnackbar('Link atualizado com sucesso', { variant: 'success' });
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Banners do Carrossel
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Faça upload de banners (1200x400px recomendado). Os banners aparecerão acima do formulário de captura.
      </Typography>

      {/* Upload Button */}
      <Button
        component="label"
        variant="contained"
        startIcon={<CloudUpload />}
        disabled={loading}
        sx={{ mb: 3 }}
      >
        Adicionar Banner
        <input
          type="file"
          hidden
          accept="image/*"
          onChange={handleBannerUpload}
        />
      </Button>

      {/* Banners Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : banners.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nenhum banner adicionado ainda.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {banners.map((banner, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card>
                <CardMedia
                  component="img"
                  height="140"
                  image={banner.url}
                  alt={banner.alt}
                  sx={{ objectFit: 'cover' }}
                />
                {banner.link && (
                  <CardContent sx={{ py: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LinkIcon fontSize="small" />
                      {banner.link}
                    </Typography>
                  </CardContent>
                )}
                <CardActions>
                  <IconButton
                    size="small"
                    onClick={() => moveBanner(index, 'up')}
                    disabled={index === 0}
                    title="Mover para cima"
                  >
                    <ArrowUpward />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => moveBanner(index, 'down')}
                    disabled={index === banners.length - 1}
                    title="Mover para baixo"
                  >
                    <ArrowDownward />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleEditLink(index)}
                    title="Editar link"
                    color={banner.link ? 'primary' : 'default'}
                  >
                    <LinkIcon />
                  </IconButton>
                  <Box sx={{ flexGrow: 1 }} />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleBannerDelete(index)}
                    title="Deletar banner"
                  >
                    <Delete />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Link Edit Dialog */}
      <Dialog open={editingIndex !== null} onClose={() => setEditingIndex(null)}>
        <DialogTitle>Editar Link do Banner</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="URL do Link (opcional)"
            type="url"
            fullWidth
            variant="outlined"
            value={editLink}
            onChange={(e) => setEditLink(e.target.value)}
            placeholder="https://exemplo.com"
            helperText="Deixe em branco para remover o link"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingIndex(null)}>Cancelar</Button>
          <Button onClick={handleSaveLink} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
