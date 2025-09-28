"use client";

import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Stack,
  Typography,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { isDisposableEmail } from "@/utils/disposableDomains";
import { formatPhoneBR, isValidPhoneBR } from "@/utils/phoneMask";
import { useSnackbar } from "notistack";
import { trackEvent, GA_EVENTS } from "@/lib/analytics";
import { executeRecaptcha, RECAPTCHA_ACTIONS } from "@/lib/recaptcha";
import { getAllUTMData, initUTMTracking, UTM } from "@/lib/utm";

export interface LeadPayload {
  name: string;
  email: string;
  phone?: string;
  lgpdConsent: boolean;
  recaptchaToken?: string | null;
  website_url?: string; // Honeypot field
  submission_time?: number; // Time taken to submit
  utm?: {
    firstTouch: UTM;
    lastTouch: UTM;
  };
  userAgent?: string;
}

interface LeadFormProps {
  onSubmit: (data: LeadPayload) => Promise<void>;
}

// Validation schema
const schema = yup.object().shape({
  name: yup
    .string()
    .required("Nome é obrigatório")
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras"),
  email: yup
    .string()
    .required("E-mail é obrigatório")
    .email("E-mail inválido")
    .test("not-disposable", "Por favor, use um e-mail válido", (value) => {
      if (!value) return true;
      return !isDisposableEmail(value);
    }),
  phone: yup
    .string()
    .optional()
    .test("valid-phone", "Telefone inválido", (value) => {
      if (!value || value === "") return true;
      return isValidPhoneBR(value);
    }),
  lgpdConsent: yup
    .boolean()
    .oneOf([true], "Você precisa aceitar os termos para continuar")
    .required("Você precisa aceitar os termos para continuar"),
});

export function LeadForm({ onSubmit }: LeadFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formStarted, setFormStarted] = useState(false);
  const [formStartTime] = useState(Date.now()); // Track when form was rendered
  const [honeypot, setHoneypot] = useState(""); // Honeypot state
  const { enqueueSnackbar } = useSnackbar();

  // Initialize UTM tracking on mount
  useEffect(() => {
    initUTMTracking();
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<LeadPayload>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      lgpdConsent: false,
    },
  });

  // Track form start when user begins typing
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (!formStarted && name && (value as any)[name]) {
        setFormStarted(true);
        trackEvent(GA_EVENTS.FORM_START, {
          form_id: 'lead_capture',
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, formStarted]);

  const handleFormSubmit = async (data: LeadPayload) => {
    try {
      setLoading(true);
      setSuccess(false);

      // Bot detection: Check honeypot field
      if (honeypot) {
        // Silent failure for bots
        setLoading(false);
        setSuccess(true);
        reset();
        return;
      }

      // Bot detection: Check submission timing (reject if less than 3 seconds)
      const submissionTime = (Date.now() - formStartTime) / 1000;
      if (submissionTime < 3) {
        // Silent failure for bots
        setLoading(false);
        setSuccess(true);
        reset();
        return;
      }

      // Track submission attempt
      trackEvent(GA_EVENTS.LEAD_SUBMIT_ATTEMPT, {
        email_domain: data.email.split('@')[1],
        has_phone: !!data.phone,
        submission_time: submissionTime,
      });

      // TEMPORARILY DISABLED: reCAPTCHA
      // Skip reCAPTCHA for now
      const recaptchaToken = null;
      console.log("reCAPTCHA skipped (temporarily disabled)");

      // Get UTM data
      const utmData = getAllUTMData();

      // Add reCAPTCHA token, UTM data, user agent, and bot detection fields to payload
      const payloadWithToken: LeadPayload = {
        ...data,
        recaptchaToken,
        website_url: honeypot, // Include honeypot field
        submission_time: submissionTime, // Include submission timing
        utm: utmData,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      };

      // Call the onSubmit prop
      await onSubmit(payloadWithToken);

      // Track success with UTM source
      trackEvent(GA_EVENTS.LEAD_SUBMIT_SUCCESS, {
        email_domain: data.email.split('@')[1],
        has_phone: !!data.phone,
        utm_source: utmData.lastTouch.source || utmData.firstTouch.source,
        utm_medium: utmData.lastTouch.medium || utmData.firstTouch.medium,
        utm_campaign: utmData.lastTouch.campaign || utmData.firstTouch.campaign,
      });

      setSuccess(true);
      enqueueSnackbar("Cadastro realizado com sucesso!", { variant: "success" });

      // Reset form after successful submission
      reset();
      setFormStarted(false);
    } catch (error) {
      console.error("Error submitting lead:", error);

      // Track error
      trackEvent(GA_EVENTS.LEAD_SUBMIT_ERROR, {
        error_message: (error as Error).message,
      });

      enqueueSnackbar("Erro ao realizar cadastro. Tente novamente.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneBR(event.target.value);
    setValue("phone", formatted, { shouldValidate: true });
  };

  return (
    <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <Stack spacing={3}>
        <Typography variant="h4" component="h2" textAlign="center" gutterBottom>
          Baixe o E-book Gratuitamente
        </Typography>

        <Typography variant="body1" textAlign="center" color="text.secondary" sx={{ mb: 2 }}>
          Preencha seus dados para receber o link de download
        </Typography>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Obrigado por se cadastrar! Verifique seu e-mail para baixar o e-book.
          </Alert>
        )}

        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Nome completo"
              variant="outlined"
              error={!!errors.name}
              helperText={errors.name?.message}
              disabled={loading}
              required
              inputProps={{
                autoComplete: "name",
              }}
            />
          )}
        />

        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="E-mail"
              type="email"
              variant="outlined"
              error={!!errors.email}
              helperText={errors.email?.message}
              disabled={loading}
              required
              inputProps={{
                autoComplete: "email",
              }}
            />
          )}
        />

        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Telefone (opcional)"
              variant="outlined"
              error={!!errors.phone}
              helperText={errors.phone?.message || "Ex: (11) 98888-7777"}
              disabled={loading}
              onChange={handlePhoneChange}
              inputProps={{
                autoComplete: "tel",
                maxLength: 15,
              }}
            />
          )}
        />

        <Controller
          name="lgpdConsent"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  {...field}
                  checked={field.value}
                  color="primary"
                  disabled={loading}
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  Autorizo o uso dos meus dados para fins de comunicação e envio de materiais,
                  conforme a{" "}
                  <Typography
                    component="a"
                    href="/privacidade"
                    target="_blank"
                    sx={{
                      color: "primary.main",
                      textDecoration: "underline",
                    }}
                  >
                    Política de Privacidade
                  </Typography>
                </Typography>
              }
            />
          )}
        />
        {errors.lgpdConsent && (
          <Typography variant="caption" color="error" sx={{ mt: -2, ml: 4 }}>
            {errors.lgpdConsent.message}
          </Typography>
        )}

        {/* Honeypot field - hidden from users */}
        <input
          type="text"
          name="website_url"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          style={{
            position: 'absolute',
            left: '-9999px',
            width: '1px',
            height: '1px',
            opacity: 0
          }}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          size="large"
          disabled={loading}
          sx={{
            py: 1.5,
            fontSize: "1.1rem",
            fontWeight: 600,
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Baixar E-book Grátis"
          )}
        </Button>

        <Typography variant="caption" textAlign="center" color="text.secondary">
          Prometemos não enviar spam. Você pode cancelar a inscrição a qualquer momento.
        </Typography>
      </Stack>
    </Box>
  );
}