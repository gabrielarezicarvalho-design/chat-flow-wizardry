import { useState } from 'react';
import { useAuth } from './useAuth';

// Hook simplificado - tabelas google_drive_tokens e conversation_backups não existem no schema atual
export const useGoogleDrive = () => {
  const { user } = useAuth();
  const [isLoading] = useState(false);
  const [loadingBackups] = useState(false);

  const connectDrive = {
    mutate: () => {
      console.log('Google Drive connect não implementado - tabelas não existem', user?.id);
    },
    mutateAsync: async () => {
      console.log('Google Drive connect não implementado - tabelas não existem');
      return null;
    },
    isPending: false
  };

  const disconnectDrive = {
    mutate: () => {
      console.log('Google Drive disconnect não implementado - tabelas não existem');
    },
    mutateAsync: async () => {
      console.log('Google Drive disconnect não implementado - tabelas não existem');
    },
    isPending: false
  };

  const runBackup = {
    mutate: (_data?: { month?: string; testMode?: boolean }) => {
      console.log('Google Drive backup não implementado - tabelas não existem');
    },
    mutateAsync: async (_data?: { month?: string; testMode?: boolean }) => {
      console.log('Google Drive backup não implementado - tabelas não existem');
      return null;
    },
    isPending: false
  };

  return {
    driveConnection: null,
    isConnected: false,
    isLoading,
    backups: [],
    loadingBackups,
    connectDrive,
    disconnectDrive,
    runBackup,
  };
};