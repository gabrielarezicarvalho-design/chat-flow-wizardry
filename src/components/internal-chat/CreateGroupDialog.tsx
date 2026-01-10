import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useInternalChat } from '@/hooks/useInternalChat';
import { Users, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allUsers: Array<{
    id: string;
    full_name: string | null;
    username: string | null;
    is_online: boolean | null;
  }>;
}

export const CreateGroupDialog = ({ open, onOpenChange, allUsers }: CreateGroupDialogProps) => {
  const { createRoom } = useInternalChat();
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [chatType, setChatType] = useState<'private' | 'group'>('private');
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const availableUsers = allUsers.filter(u => u.id !== currentUserId);

  const handleCreate = async () => {
    if (chatType === 'private' && selectedUsers.length !== 1) return;
    if (chatType === 'group' && (!groupName.trim() || selectedUsers.length === 0)) return;

    await createRoom.mutateAsync({
      name: chatType === 'group' ? groupName : undefined,
      type: chatType,
      participantIds: selectedUsers
    });

    setGroupName('');
    setSelectedUsers([]);
    onOpenChange(false);
  };

  const toggleUser = (userId: string) => {
    if (chatType === 'private') {
      setSelectedUsers([userId]);
    } else {
      setSelectedUsers(prev => 
        prev.includes(userId) 
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Conversa</DialogTitle>
        </DialogHeader>

        <Tabs value={chatType} onValueChange={(v) => {
          setChatType(v as 'private' | 'group');
          setSelectedUsers([]);
        }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="private" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Privado
            </TabsTrigger>
            <TabsTrigger value="group" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Grupo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="private" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Selecione um usuário para conversar
            </div>
            <ScrollArea className="h-[300px] border rounded-md p-2">
              {availableUsers.map(u => (
                <div
                  key={u.id}
                  className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                    selectedUsers.includes(u.id) ? 'bg-primary/10' : 'hover:bg-muted'
                  }`}
                  onClick={() => toggleUser(u.id)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {(u.full_name || u.username || '?')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {u.full_name || u.username || 'Usuário'}
                    </div>
                    {u.username && u.full_name && (
                      <div className="text-xs text-muted-foreground">@{u.username}</div>
                    )}
                  </div>
                  <div className={`h-2 w-2 rounded-full ${u.is_online ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
              ))}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="group" className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Grupo</Label>
              <Input
                placeholder="Ex: Equipe de Vendas"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              Selecione os participantes
            </div>
            <ScrollArea className="h-[250px] border rounded-md p-2">
              {availableUsers.map(u => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted"
                >
                  <Checkbox
                    checked={selectedUsers.includes(u.id)}
                    onCheckedChange={() => toggleUser(u.id)}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {(u.full_name || u.username || '?')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {u.full_name || u.username || 'Usuário'}
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={
              (chatType === 'private' && selectedUsers.length !== 1) ||
              (chatType === 'group' && (!groupName.trim() || selectedUsers.length === 0))
            }
          >
            Criar {chatType === 'group' ? 'Grupo' : 'Conversa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};