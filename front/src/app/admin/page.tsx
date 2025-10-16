"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  People as PeopleIcon,
  ExitToApp as LogoutIcon,
  ViewCarousel as BannerIcon,
  Person as PersonIcon,
  VerifiedUser as VerifiedIcon,
  Subscriptions as SubscriptionsIcon,
  Payment as PaymentIcon,
} from "@mui/icons-material";
import { SettingsForm } from "@/sections/admin/SettingsForm";
import { BannersForm } from "@/sections/admin/BannersForm";
import LeadsAnalyticsDashboard from "@/sections/admin/LeadsAnalyticsDashboard";
import { CustomerTable } from "@/sections/admin/commercialization/CustomerTable";
import { ManualVerificationTable } from "@/sections/admin/commercialization/ManualVerificationTable";
import { SubscriptionTable } from "@/sections/admin/commercialization/SubscriptionTable";
import { TransactionTable } from "@/sections/admin/commercialization/TransactionTable";
import { useAuth } from "@/auth/useAuth";
import { AuthGuard } from "@/components/guards/AuthGuard";
import { canAccessAdmin } from "@/config/adminWhitelist";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useSnackbar } from "notistack";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, [user, authLoading]);

  const checkAdminAccess = async () => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      // Check if user email is in the admin whitelist
      const hasAccess = await canAccessAdmin(user.email);

      if (hasAccess) {
        setIsAdmin(true);
      } else {
        enqueueSnackbar("Acesso negado. Você não é um administrador.", { variant: "error" });
        router.push("/");
      }
    } catch (error) {
      console.error("Error checking admin access:", error);
      router.push("/");
    } finally {
      setCheckingAdmin(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      enqueueSnackbar("Logout realizado com sucesso", { variant: "success" });
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      enqueueSnackbar("Erro ao fazer logout", { variant: "error" });
    }
  };

  if (authLoading || checkingAdmin) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 8 }}>
          <Alert severity="error">
            Você não tem permissão para acessar esta página.
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <AuthGuard>
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h4" component="h1">
              Painel Administrativo
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                size="small"
              >
                Sair
              </Button>
            </Box>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="admin tabs"
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab
                label="Configurações"
                icon={<SettingsIcon />}
                iconPosition="start"
                id="admin-tab-0"
                aria-controls="admin-tabpanel-0"
              />
              <Tab
                label="Banners"
                icon={<BannerIcon />}
                iconPosition="start"
                id="admin-tab-1"
                aria-controls="admin-tabpanel-1"
              />
              <Tab
                label="Leads"
                icon={<PeopleIcon />}
                iconPosition="start"
                id="admin-tab-2"
                aria-controls="admin-tabpanel-2"
              />
              <Tab
                label="Clientes"
                icon={<PersonIcon />}
                iconPosition="start"
                id="admin-tab-3"
                aria-controls="admin-tabpanel-3"
              />
              <Tab
                label="Verificações"
                icon={<VerifiedIcon />}
                iconPosition="start"
                id="admin-tab-4"
                aria-controls="admin-tabpanel-4"
              />
              <Tab
                label="Assinaturas"
                icon={<SubscriptionsIcon />}
                iconPosition="start"
                id="admin-tab-5"
                aria-controls="admin-tabpanel-5"
              />
              <Tab
                label="Transações"
                icon={<PaymentIcon />}
                iconPosition="start"
                id="admin-tab-6"
                aria-controls="admin-tabpanel-6"
              />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <SettingsForm />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <BannersForm />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <LeadsAnalyticsDashboard />
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <CustomerTable />
          </TabPanel>

          <TabPanel value={tabValue} index={4}>
            <ManualVerificationTable />
          </TabPanel>

          <TabPanel value={tabValue} index={5}>
            <SubscriptionTable />
          </TabPanel>

          <TabPanel value={tabValue} index={6}>
            <TransactionTable />
          </TabPanel>
        </Box>
      </Container>
    </AuthGuard>
  );
}