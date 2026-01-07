import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "admin" | "moderator" | "user" | "agent";

interface UseUserRoleReturn {
  role: AppRole | null;
  isAdmin: boolean;
  isAgent: boolean;
  isLoading: boolean;
  hasRole: (role: AppRole) => boolean;
}

export const useUserRole = (): UseUserRoleReturn => {
  const { user } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch all roles for the user (they may have multiple)
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }

      if (!data || data.length === 0) return null;

      // Return the highest privilege role (admin > moderator > agent > user)
      const roleHierarchy: AppRole[] = ["admin", "moderator", "agent", "user"];
      for (const r of roleHierarchy) {
        if (data.some((row) => row.role === r)) {
          return r;
        }
      }

      return (data[0]?.role as AppRole) || null;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const isAdmin = role === "admin";
  const isAgent = role === "agent" || role === "user";

  const hasRole = (checkRole: AppRole): boolean => {
    if (!role) return false;
    if (role === "admin") return true; // Admin has all permissions
    return role === checkRole;
  };

  return {
    role,
    isAdmin,
    isAgent,
    isLoading,
    hasRole,
  };
};
