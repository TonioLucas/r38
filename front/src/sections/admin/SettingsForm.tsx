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
  Grid,
  Card,
  CardMedia,
  CardActions,
  CardContent,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  ExpandMore as ExpandMoreIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
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

interface ImageSlot {
  url: string;
  alt: string;
  storagePath: string;
}

export function SettingsForm() {
  const [loading, setLoading] = useState(false);
  const [savingImages, setSavingImages] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);

  // Three separate image slots
  const [image1, setImage1] = useState<ImageSlot | null>(null);
  const [image2, setImage2] = useState<ImageSlot | null>(null);
  const [image3, setImage3] = useState<ImageSlot | null>(null);

  const [ebookFile, setEbookFile] = useState<File | null>(null);
  const [currentEbookPath, setCurrentEbookPath] = useState<string>("");
  const [currentEbookName, setCurrentEbookName] = useState<string>("");

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
    getValues,
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

        // Use actual data from Firestore
        reset({
          headline: data.hero?.headline || "",
          subheadline: data.hero?.subheadline || "",
          ctaText: data.hero?.ctaText || "",
          ebookFileName: data.ebook?.fileName || "",
        });

        // Load images into separate slots
        const images = data.images || [];
        if (images[0]) setImage1(images[0]);
        if (images[1]) setImage2(images[1]);
        if (images[2]) setImage3(images[2]);

        if (data.ebook) {
          setCurrentEbookPath(data.ebook.storagePath || "");
          setCurrentEbookName(data.ebook.fileName || "");
        }
      } else {
        // No settings exist - leave form empty for user to fill
        enqueueSnackbar("Nenhuma configuração encontrada. Configure os valores iniciais.", { variant: "info" });
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

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    slot: 1 | 2 | 3
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      enqueueSnackbar("Por favor, selecione uma imagem", { variant: "warning" });
      return;
    }

    // Check file size (max 5MB for images)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      enqueueSnackbar("A imagem deve ter no máximo 5MB", { variant: "warning" });
      return;
    }

    try {
      setLoading(true);
      const storagePath = `images/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);

      const newImage: ImageSlot = {
        url,
        alt: file.name,
        storagePath
      };

      // Update the appropriate slot
      if (slot === 1) setImage1(newImage);
      else if (slot === 2) setImage2(newImage);
      else if (slot === 3) setImage3(newImage);

      enqueueSnackbar(`Imagem ${slot} carregada com sucesso`, { variant: "success" });
    } catch (error) {
      console.error("Error uploading image:", error);
      enqueueSnackbar("Erro ao fazer upload da imagem", { variant: "error" });
    } finally {
      setLoading(false);
    }

    // Reset the input
    event.target.value = '';
  };

  const handleImageDelete = async (slot: 1 | 2 | 3) => {
    try {
      setLoading(true);

      // Get the image to delete
      const imageToDelete = slot === 1 ? image1 : slot === 2 ? image2 : image3;

      if (imageToDelete?.storagePath) {
        // Delete from storage
        try {
          const storageRef = ref(storage, imageToDelete.storagePath);
          await deleteObject(storageRef);
        } catch (error) {
          console.log("Image might already be deleted from storage");
        }
      }

      // Clear the slot
      if (slot === 1) setImage1(null);
      else if (slot === 2) setImage2(null);
      else if (slot === 3) setImage3(null);

      enqueueSnackbar(`Imagem ${slot} removida`, { variant: "success" });
    } catch (error) {
      console.error("Error deleting image:", error);
      enqueueSnackbar("Erro ao remover imagem", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleEbookUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      enqueueSnackbar("Por favor, selecione um arquivo PDF", { variant: "warning" });
      return;
    }

    // Check file size (max 100MB - Firebase Storage supports up to 5GB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      enqueueSnackbar("O arquivo PDF deve ter no máximo 100MB", { variant: "warning" });
      return;
    }

    setEbookFile(file);
    enqueueSnackbar(`PDF selecionado: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`, { variant: "info" });
  };

  const saveImages = async () => {
    try {
      setSavingImages(true);

      // Collect non-null images
      const images: ImageSlot[] = [];
      if (image1) images.push(image1);
      if (image2) images.push(image2);
      if (image3) images.push(image3);

      const settingsRef = doc(db, "settings", "main");
      await setDoc(settingsRef, {
        images,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      enqueueSnackbar("Imagens salvas com sucesso", { variant: "success" });
    } catch (error) {
      console.error("Error saving images:", error);
      enqueueSnackbar("Erro ao salvar imagens", { variant: "error" });
    } finally {
      setSavingImages(false);
    }
  };

  const savePdf = async () => {
    try {
      setSavingPdf(true);

      let ebookData;

      if (ebookFile) {
        // Upload new PDF
        const storagePath = `ebooks/${Date.now()}_${ebookFile.name}`;
        const storageRef = ref(storage, storagePath);
        const snapshot = await uploadBytes(storageRef, ebookFile);

        ebookData = {
          storagePath,
          fileName: getValues('ebookFileName'),
          sizeBytes: ebookFile.size,
        };
      } else {
        // Just update the name, keep the existing file
        ebookData = {
          storagePath: currentEbookPath,
          fileName: getValues('ebookFileName'),
          sizeBytes: 0, // Keep existing size
        };
      }

      const settingsRef = doc(db, "settings", "main");
      await setDoc(settingsRef, {
        ebook: ebookData,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      enqueueSnackbar("E-book salvo com sucesso", { variant: "success" });
      setEbookFile(null);
      setCurrentEbookPath(ebookData.storagePath);
      setCurrentEbookName(ebookData.fileName);
    } catch (error) {
      console.error("Error saving ebook:", error);
      enqueueSnackbar("Erro ao salvar e-book", { variant: "error" });
    } finally {
      setSavingPdf(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const settingsRef = doc(db, "settings", "main");
      await setDoc(settingsRef, {
        hero: {
          headline: data.headline,
          subheadline: data.subheadline,
          ctaText: data.ctaText,
        },
        updatedAt: serverTimestamp(),
      }, { merge: true });

      enqueueSnackbar("Textos salvos com sucesso", { variant: "success" });
    } catch (error) {
      console.error("Error saving settings:", error);
      enqueueSnackbar("Erro ao salvar configurações", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const renderImageSlot = (
    slot: 1 | 2 | 3,
    image: ImageSlot | null,
    title: string
  ) => (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        {image ? (
          <Box>
            <CardMedia
              component="img"
              height="140"
              image={image.url}
              alt={image.alt}
              sx={{ objectFit: 'cover', borderRadius: 1, mb: 2 }}
            />
            <Typography variant="caption" color="text.secondary" noWrap>
              {image.alt}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              height: 140,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'grey.100',
              borderRadius: 1,
              mb: 2,
            }}
          >
            <ImageIcon sx={{ fontSize: 48, color: 'grey.400' }} />
          </Box>
        )}
      </CardContent>
      <CardActions>
        <Button
          component="label"
          size="small"
          startIcon={<UploadIcon />}
          fullWidth
          variant={image ? "outlined" : "contained"}
        >
          {image ? 'Substituir' : 'Upload'}
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={(e) => handleImageUpload(e, slot)}
          />
        </Button>
        {image && (
          <IconButton
            color="error"
            onClick={() => handleImageDelete(slot)}
            size="small"
          >
            <DeleteIcon />
          </IconButton>
        )}
      </CardActions>
    </Card>
  );

  return (
    <Stack spacing={3}>
      {/* Hero Text Configuration */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Configuração de Textos
        </Typography>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Título Principal (Hero)"
              {...register("headline")}
              error={!!errors.headline}
              helperText={errors.headline?.message}
              multiline
              rows={2}
            />

            <TextField
              fullWidth
              label="Subtítulo"
              {...register("subheadline")}
              error={!!errors.subheadline}
              helperText={errors.subheadline?.message}
              multiline
              rows={3}
            />

            <TextField
              fullWidth
              label="Texto do Botão CTA"
              {...register("ctaText")}
              error={!!errors.ctaText}
              helperText={errors.ctaText?.message}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              Salvar Textos
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Images Configuration */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Imagens do Hero
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Faça upload de até 3 imagens. Apenas imagens carregadas aparecerão no site.
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            {renderImageSlot(1, image1, "Imagem 1")}
          </Grid>
          <Grid item xs={12} md={4}>
            {renderImageSlot(2, image2, "Imagem 2")}
          </Grid>
          <Grid item xs={12} md={4}>
            {renderImageSlot(3, image3, "Imagem 3")}
          </Grid>
        </Grid>

        <Button
          variant="contained"
          onClick={saveImages}
          disabled={savingImages || (!image1 && !image2 && !image3)}
          startIcon={savingImages ? <CircularProgress size={20} /> : <SaveIcon />}
          fullWidth
        >
          Salvar Imagens
        </Button>
      </Paper>

      {/* E-book Configuration */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          E-book para Download
        </Typography>

        <Stack spacing={3}>
          {currentEbookPath && (
            <Alert severity="info">
              E-book atual: {currentEbookName}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Nome do E-book (exibido para usuários)"
            {...register("ebookFileName")}
            error={!!errors.ebookFileName}
            helperText={errors.ebookFileName?.message}
          />

          <Box>
            <Button
              component="label"
              variant="outlined"
              startIcon={<PdfIcon />}
              fullWidth
            >
              {ebookFile ? `Selecionado: ${ebookFile.name}` : "Selecionar PDF"}
              <input
                type="file"
                hidden
                accept="application/pdf"
                onChange={handleEbookUpload}
              />
            </Button>
            {ebookFile && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Tamanho: {(ebookFile.size / 1024 / 1024).toFixed(2)} MB
              </Typography>
            )}
          </Box>

          <Button
            variant="contained"
            onClick={savePdf}
            disabled={savingPdf || (!ebookFile && !getValues('ebookFileName'))}
            startIcon={savingPdf ? <CircularProgress size={20} /> : <SaveIcon />}
            fullWidth
          >
            Salvar E-book
          </Button>
        </Stack>
      </Paper>

      {/* Privacy Page Configuration */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Página de Privacidade</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={privacyEnabled}
                  onChange={(e) => setPrivacyEnabled(e.target.checked)}
                />
              }
              label="Página ativa"
            />

            <TextField
              fullWidth
              label="Título da Página"
              value={privacyTitle}
              onChange={(e) => setPrivacyTitle(e.target.value)}
            />

            <TextField
              fullWidth
              label="Conteúdo (HTML permitido)"
              value={privacyContent}
              onChange={(e) => setPrivacyContent(e.target.value)}
              multiline
              rows={10}
              helperText="Use HTML para formatação. Ex: <h2>Título</h2>, <p>Parágrafo</p>, <strong>Negrito</strong>"
            />

            <Button
              variant="contained"
              onClick={handlePrivacySave}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              Salvar Página de Privacidade
            </Button>

            {privacyPage && (
              <Typography variant="caption" color="text.secondary">
                Última atualização: {new Date(privacyPage.updatedAt.toDate()).toLocaleString('pt-BR')}
              </Typography>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}