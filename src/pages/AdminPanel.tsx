import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminDashboard } from "@/components/admin/sections/AdminDashboard";
import { AdminContrato } from "@/components/admin/sections/AdminContrato";
import { AdminEmpresas } from "@/components/admin/sections/AdminEmpresas";
import { AdminUsuarios } from "@/components/admin/sections/AdminUsuarios";
import { AdminAgentes } from "@/components/admin/sections/AdminAgentes";
import { AdminIntegracoes } from "@/components/admin/sections/AdminIntegracoes";
import { AdminApify } from "@/components/admin/sections/AdminApify";
import { AdminArmazenamento } from "@/components/admin/sections/AdminArmazenamento";
import { AdminIA } from "@/components/admin/sections/AdminIA";
import { AdminProgramador } from "@/components/admin/sections/AdminProgramador";
import { AdminRelatorios } from "@/components/admin/sections/AdminRelatorios";
import { AdminFaturamento } from "@/components/admin/sections/AdminFaturamento";
import { AdminSeguranca } from "@/components/admin/sections/AdminSeguranca";
import { AdminConfiguracoes } from "@/components/admin/sections/AdminConfiguracoes";
import { AdminBeta } from "@/components/admin/sections/AdminBeta";
import AdminFeedback from "@/components/admin/sections/AdminFeedback";

import AdminWhatsAppMeta from "@/components/admin/sections/AdminWhatsAppMeta";
import AdminDocumentacao from "@/components/admin/sections/AdminDocumentacao";
import AdminMetricas from "@/components/admin/sections/AdminMetricas";

export default function AdminPanel() {
  const [activeSection, setActiveSection] = useState("dashboard");

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <AdminDashboard />;
      case "contrato":
        return <AdminContrato />;
      case "empresas":
        return <AdminEmpresas />;
      case "usuarios":
        return <AdminUsuarios />;
      case "agentes":
        return <AdminAgentes />;
      case "integracoes":
        return <AdminIntegracoes />;
      case "apify":
        return <AdminApify />;
      case "whatsapp-meta":
        return <AdminWhatsAppMeta />;
      case "armazenamento":
        return <AdminArmazenamento />;
      case "ia":
        return <AdminIA />;
      case "programador":
        return <AdminProgramador />;
      case "feedback":
        return <AdminFeedback />;
      case "metricas":
        return <AdminMetricas />;
      case "relatorios":
        return <AdminRelatorios />;
      case "faturamento":
        return <AdminFaturamento />;
      case "seguranca":
        return <AdminSeguranca />;
      case "configuracoes":
        return <AdminConfiguracoes />;
      case "beta":
        return <AdminBeta />;
      case "documentacao":
        return <AdminDocumentacao />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <AdminLayout activeSection={activeSection} onSectionChange={setActiveSection}>
      {renderSection()}
    </AdminLayout>
  );
}