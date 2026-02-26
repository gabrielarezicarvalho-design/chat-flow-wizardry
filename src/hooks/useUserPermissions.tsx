import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface UserPermissions {
  can_view_queue: boolean;
  can_open_new_chats: boolean;
  can_export_chats: boolean;
  can_access_internal_chat: boolean;
  can_manage_tasks: boolean;
  can_create_tasks_for_others: boolean;
  can_read_chat_history: boolean;
  can_access_wa_groups: boolean;
  can_supervise: boolean;
  auto_login_queue: boolean;
  always_online: boolean;
}

export const defaultPermissions: UserPermissions = {
  can_view_queue: false,
  can_open_new_chats: true,
  can_export_chats: false,
  can_access_internal_chat: true,
  can_manage_tasks: false,
  can_create_tasks_for_others: false,
  can_read_chat_history: false,
  can_access_wa_groups: false,
  can_supervise: false,
  auto_login_queue: false,
  always_online: false,
};

export function useUserPermissions(targetUserId?: string) {
  const { user } = useAuth();
  const userId = targetUserId || user?.id;
  const queryClient = useQueryClient();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["user-permissions", userId],
    queryFn: async () => {
      if (!userId) return defaultPermissions;

      const { data, error } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching permissions:", error);
        return defaultPermissions;
      }

      if (!data) return defaultPermissions;

      return {
        can_view_queue: data.can_view_queue,
        can_open_new_chats: data.can_open_new_chats,
        can_export_chats: data.can_export_chats,
        can_access_internal_chat: data.can_access_internal_chat,
        can_manage_tasks: data.can_manage_tasks,
        can_create_tasks_for_others: data.can_create_tasks_for_others,
        can_read_chat_history: data.can_read_chat_history,
        can_access_wa_groups: data.can_access_wa_groups,
        can_supervise: data.can_supervise,
        auto_login_queue: data.auto_login_queue,
        always_online: data.always_online,
      } as UserPermissions;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  const updatePermissions = useMutation({
    mutationFn: async ({
      targetId,
      perms,
      companyId,
    }: {
      targetId: string;
      perms: Partial<UserPermissions>;
      companyId?: string;
    }) => {
      // Try upsert
      const { error } = await supabase
        .from("user_permissions")
        .upsert(
          {
            user_id: targetId,
            company_id: companyId || null,
            ...perms,
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user-permissions", variables.targetId],
      });
    },
  });

  return {
    permissions: permissions || defaultPermissions,
    isLoading,
    updatePermissions,
    hasPermission: (key: keyof UserPermissions) =>
      (permissions || defaultPermissions)[key],
  };
}

// Bulk fetch permissions for multiple users (admin use)
export function useAllUserPermissions(userIds: string[]) {
  return useQuery({
    queryKey: ["all-user-permissions", userIds.sort().join(",")],
    queryFn: async () => {
      if (!userIds.length) return {};

      const { data, error } = await supabase
        .from("user_permissions")
        .select("*")
        .in("user_id", userIds);

      if (error) {
        console.error("Error fetching all permissions:", error);
        return {};
      }

      const map: Record<string, UserPermissions> = {};
      (data || []).forEach((row: any) => {
        map[row.user_id] = {
          can_view_queue: row.can_view_queue,
          can_open_new_chats: row.can_open_new_chats,
          can_export_chats: row.can_export_chats,
          can_access_internal_chat: row.can_access_internal_chat,
          can_manage_tasks: row.can_manage_tasks,
          can_create_tasks_for_others: row.can_create_tasks_for_others,
          can_read_chat_history: row.can_read_chat_history,
          can_access_wa_groups: row.can_access_wa_groups,
          can_supervise: row.can_supervise,
          auto_login_queue: row.auto_login_queue,
          always_online: row.always_online,
        };
      });

      return map;
    },
    enabled: userIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });
}
