"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Stack,
  IconButton,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Divider,
} from "@mui/material";
import { Delete as DeleteIcon, CloudUpload as UploadIcon, ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { SettingsDoc, PageDoc } from "@/types/firestore";
import { pageOperations } from "@/lib/firestore";
import { useSnackbar } from "notistack";

const schema = yup.object().shape({
  headline: yup.string().required("Título é obrigatório"),
  subheadline: yup.string().required("Subtítulo é obrigatório"),
  ctaText: yup.string().required("Texto do CTA é obrigatório"),
  ebookFileName: yup.string().required("Nome do arquivo é obrigatório"),
});

type FormData = {
  headline: string;
  subheadline: string;
  ctaText: string;
  ebookFileName: string;
};

export function SettingsForm() {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<Array<{ url: string; alt: string; storagePath: string }>>([]);
  const [ebookFile, setEbookFile] = useState<File | null>(null);
  const [currentEbookPath, setCurrentEbookPath] = useState<string>("");
  
  // Privacy page state
  const [privacyPage, setPrivacyPage] = useState<PageDoc | null>(null);
  const [privacyEnabled, setPrivacyEnabled] = useState(false);
  const [privacyTitle, setPrivacyTitle] = useState("Política de Privacidade");
  const [privacyContent, setPrivacyContent] = useState("");
  
  const { enqueueSnackbar } = useSnackbar();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    loadSettings();
    loadPrivacyPage();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settingsRef = doc(db, "settings", "main");
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        const data = settingsSnap.data() as SettingsDoc;
        reset({
          headline: data.hero.headline,
          subheadline: data.hero.subheadline,
          ctaText: data.hero.ctaText,
          ebookFileName: data.ebook.fileName,
        });
        setImages(data.images || []);
        setCurrentEbookPath(data.ebook.storagePath);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      enqueueSnackbar("Erro ao carregar configurações", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const loadPrivacyPage = async () => {
    try {
      const page = await pageOperations.getById("privacy");
      if (page) {
        setPrivacyPage(page);
        setPrivacyEnabled(page.enabled);
        setPrivacyTitle(page.title);
        setPrivacyContent(page.content);
      }
    } catch (error) {
      console.error("Error loading privacy page:", error);
    }
  };

  const handlePrivacySave = async () => {
    try {
      setLoading(true);
      
      await pageOperations.createOrUpdate("privacy", {
        title: privacyTitle,
        content: privacyContent,
        enabled: privacyEnabled,
      });

      enqueueSnackbar("Página de privacidade salva com sucesso", { variant: "success" });
      await loadPrivacyPage(); // Reload to get updated timestamps
    } catch (error) {
      console.error("Error saving privacy page:", error);
      enqueueSnackbar("Erro ao salvar página de privacidade", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || images.length >= 3) return;

    try {
      setLoading(true);
      const uploadPromises = Array.from(files).slice(0, 3 - images.length).map(async (file) => {
        const storagePath = `images/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        return { url, alt: file.name, storagePath };
      });

      const newImages = await Promise.all(uploadPromises);
      setImages([...images, ...newImages]);
      enqueueSnackbar("Imagens enviadas com sucesso", { variant: "success" });
    } catch (error) {
      console.error("Error uploading images:", error);
      enqueueSnackbar("Erro ao enviar imagens", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const handleEbookUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setEbookFile(file);
    } else {
      enqueueSnackbar("Por favor, selecione um arquivo PDF", { variant: "warning" });
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      let ebookData = {
        storagePath: currentEbookPath,
        fileName: data.ebookFileName,
        sizeBytes: 0,
      };

      if (ebookFile) {
        const storagePath = `ebooks/${Date.now()}_${ebookFile.name}`;
        const storageRef = ref(storage, storagePath);
        const snapshot = await uploadBytes(storageRef, ebookFile);

        ebookData = {
          storagePath,
          fileName: data.ebookFileName,
          sizeBytes: ebookFile.size,
        };
      }

      const settingsData: Partial<SettingsDoc> = {
        hero: {
          headline: data.headline,
          subheadline: data.subheadline,
          ctaText: data.ctaText,
        },
        images: images.slice(0, 3),
        ebook: ebookData,
        updatedAt: serverTimestamp() as any,
      };

      const settingsRef = doc(db, "settings", "main");
      await setDoc(settingsRef, settingsData, { merge: true });

      enqueueSnackbar("Configurações salvas com sucesso", { variant: "success" });
      setEbookFile(null);
    } catch (error) {
      console.error("Error saving settings:", error);
      enqueueSnackbar("Erro ao salvar configurações", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Configurações do Site
      </Typography>

      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
        <Stack spacing={3}>
          <TextField
            fullWidth
            label="Título Principal"
            {...register("headline")}
            error={!!errors.headline}
            helperText={errors.headline?.message}
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Subtítulo"
            {...register("subheadline")}
            error={!!errors.subheadline}
            helperText={errors.subheadline?.message}
            multiline
            rows={2}
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Texto do Botão CTA"
            {...register("ctaText")}
            error={!!errors.ctaText}
            helperText={errors.ctaText?.message}
            disabled={loading}
          />

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Imagens da Seção (Máximo 3)
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              {images.map((image, index) => (
                <Box key={index} sx={{ position: "relative" }}>
                  <img
                    src={image.url}
                    alt={image.alt}
                    style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 8 }}
                  />
                  <IconButton
                    size="small"
                    sx={{ position: "absolute", top: -8, right: -8 }}
                    onClick={() => handleRemoveImage(index)}
                    disabled={loading}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
            {images.length < 3 && (
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
                disabled={loading}
              >
                Adicionar Imagem
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                />
              </Button>
            )}
          </Box>

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              E-book PDF
            </Typography>
            <TextField
              fullWidth
              label="Nome do Arquivo para Download"
              {...register("ebookFileName")}
              error={!!errors.ebookFileName}
              helperText={errors.ebookFileName?.message}
              disabled={loading}
              sx={{ mb: 2 }}
            />
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              disabled={loading}
            >
              {ebookFile ? ebookFile.name : "Selecionar PDF"}
              <input
                type="file"
                hidden
                accept="application/pdf"
                onChange={handleEbookUpload}
              />
            </Button>
            {ebookFile && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Novo arquivo selecionado: {ebookFile.name}
              </Alert>
            )}
          </Box>

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ alignSelf: "flex-start" }}
          >
            {loading ? <CircularProgress size={24} /> : "Salvar Configurações"}
          </Button>
        </Stack>
      </Box>

      {/* Privacy Page Management Section */}
      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="privacy-content"
          id="privacy-header"
        >
          <Typography variant="h6">
            Página de Privacidade
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={privacyEnabled}
                  onChange={(e) => setPrivacyEnabled(e.target.checked)}
                  disabled={loading}
                />
              }
              label="Página habilitada"
            />

            <TextField
              fullWidth
              label="Título da Página"
              value={privacyTitle}
              onChange={(e) => setPrivacyTitle(e.target.value)}
              disabled={loading}
            />

            <TextField
              fullWidth
              label="Conteúdo da Política"
              value={privacyContent}
              onChange={(e) => setPrivacyContent(e.target.value)}
              multiline
              rows={12}
              disabled={loading}
              helperText="Use # para títulos principais, ## para subtítulos, ### para seções menores"
              placeholder="# Política de Privacidade

Sua privacidade é importante para nós...

## Coleta de Dados

Coletamos apenas as informações necessárias...

## Uso dos Dados

Os dados coletados são utilizados para..."
            />

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="contained"
                onClick={handlePrivacySave}
                disabled={loading}
                sx={{ alignSelf: "flex-start" }}
              >
                {loading ? <CircularProgress size={24} /> : "Salvar Página de Privacidade"}
              </Button>
              
              {privacyPage && (
                <Typography variant="caption" color="text.secondary">
                  Última atualização: {privacyPage.updatedAt?.toDate?.()?.toLocaleDateString('pt-BR') || 'N/A'}
                </Typography>
              )}
            </Box>

            {privacyEnabled && (
              <Alert severity="info">
                A página estará disponível em: <strong>/privacidade</strong>
              </Alert>
            )}

            {!privacyEnabled && (
              <Alert severity="warning">
                A página está desabilitada e mostrará uma mensagem de "em construção"
              </Alert>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
}