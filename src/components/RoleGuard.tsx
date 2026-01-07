import { Navigate } from "react-router-dom";
import { useUserRole, AppRole } from "@/hooks/useUserRole";
import { Loading } from "@/components/ui/loading";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
  fallbackPath?: string;
}

export const RoleGuard = ({
  children,
  allowedRoles,
  fallbackPath = "/conversations",
}: RoleGuardProps) => {
  const { role, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loading />
      </div>
    );
  }

  // Admin has access to everything
  if (role === "admin") {
    return <>{children}</>;
  }

  // Check if user's role is in allowed roles
  if (role && allowedRoles.includes(role)) {
    return <>{children}</>;
  }

  // Redirect to appropriate fallback
  return <Navigate to={fallbackPath} replace />;
};

// Convenience components for common patterns
export const AdminOnly = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard allowedRoles={["admin"]} fallbackPath="/conversations">
    {children}
  </RoleGuard>
);

export const AgentOnly = ({ children }: { children: React.ReactNode }) => (
  <RoleGuard allowedRoles={["agent", "user"]} fallbackPath="/">
    {children}
  </RoleGuard>
);
