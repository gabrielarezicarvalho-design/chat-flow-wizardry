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
  const { createRoom, currentUserId } = useInternalChat();
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
            <TabsTrigger value="private">
              <User className="h-4 w-4 mr-2" />
              Privado
            </TabsTrigger>
            <TabsTrigger value="group">
              <Users className="h-4 w-4 mr-2" />
              Grupo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="group" className="space-y-4">
            <div>
              <Label htmlFor="groupName">Nome do Grupo</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Equipe de Vendas"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Label>
            {chatType === 'private' ? 'Selecione um usuário' : 'Adicionar participantes'}
          </Label>
          <ScrollArea className="h-60 rounded-md border p-2">
            {availableUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                onClick={() => toggleUser(user.id)}
              >
                <Checkbox
                  checked={selectedUsers.includes(user.id)}
                  onCheckedChange={() => toggleUser(user.id)}
                />
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary/10">
                    {getInitials(user.full_name || user.username || '?')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">{user.full_name || user.username}</p>
                  {user.username && user.full_name && (
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  )}
                </div>
                <div className={`w-2 h-2 rounded-full ${user.is_online ? 'bg-green-500' : 'bg-gray-300'}`} />
              </div>
            ))}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={
              createRoom.isPending ||
              (chatType === 'private' && selectedUsers.length !== 1) ||
              (chatType === 'group' && (!groupName.trim() || selectedUsers.length === 0))
            }
          >
            {createRoom.isPending ? 'Criando...' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
