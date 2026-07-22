import { useState, useRef, useEffect } from 'react';
import { useInternalChat, ChatRoom, ChatMessage, useCompanyUsers } from '@/hooks/useInternalChat';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Plus, 
  Send, 
  Users, 
  Search,
  Pin,
  Reply,
  Smile,
  CheckSquare,
  FileText,
  MoreVertical,
  UserPlus,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CreateGroupDialog } from '@/components/internal-chat/CreateGroupDialog';
import { CreateTaskDialog } from '@/components/internal-chat/CreateTaskDialog';
import { EmojiPicker } from '@/components/internal-chat/EmojiPicker';
import { TasksPanel } from '@/components/internal-chat/TasksPanel';
import { FeatureGate } from "@/components/FeatureGate";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const InternalChatContent = () => {
  const { isAdmin } = useUserRole();
  const {
    rooms,
    roomsLoading,
    messages,
    sendMessage,
    selectedRoom,
    setSelectedRoom,
    pinMessage,
    addReaction,
    removeReaction,
    deleteMessage,
    markAsRead,
  } = useInternalChat();
  const { data: companyUsers = [] } = useCompanyUsers();
  const allUsers = companyUsers.map(u => ({
    id: u.id,
    full_name: u.full_name,
    username: u.username,
    is_online: u.is_online ?? null,
  }));


  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskForUser, setTaskForUser] = useState<string | null>(null);
  const [reactionFor, setReactionFor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('chats');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark room as read when selected or when new messages arrive
  useEffect(() => {
    if (selectedRoom?.id) {
      markAsRead.mutate(selectedRoom.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom?.id, messages?.length]);


  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedRoom) return;

    await sendMessage.mutateAsync({
      roomId: selectedRoom.id,
      content: messageInput,
      type: 'text',
      replyTo: replyTo?.id
    });

    setMessageInput('');
    setReplyTo(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getRoomDisplayName = (room: ChatRoom) => {
    if (room.type === 'group') return room.name || 'Grupo';
    return room.name || 'Conversa';
  };

  const getRoomAvatar = (room: ChatRoom) => {
    if (room.type === 'group') return room.avatar_url;
    return null;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const filteredRooms = rooms?.filter(room => {
    if (!searchQuery) return true;
    const name = getRoomDisplayName(room).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const pinnedMessages = messages?.filter(m => m.is_pinned) || [];

  return (
    <div className="h-[calc(100vh-6rem)] flex bg-background rounded-lg border overflow-hidden">
      {/* Sidebar - Room List */}
      <div className="w-80 border-r flex flex-col bg-card">
        <div className="p-4 border-b shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Chat Interno</h2>
            <Button size="sm" onClick={() => setShowCreateGroup(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Novo
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-2 shrink-0">
            <TabsTrigger value="chats" className="flex-1">
              <MessageSquare className="h-4 w-4 mr-1" />
              Chats
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex-1">
              <CheckSquare className="h-4 w-4 mr-1" />
              Tarefas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chats" className="flex-1 m-0 overflow-y-auto">
            <div className="p-2 space-y-1">
              {roomsLoading ? (
                <div className="p-4 text-center text-muted-foreground">Carregando...</div>
              ) : filteredRooms?.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma conversa</p>
                </div>
              ) : (
                filteredRooms?.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={cn(
                      "w-full p-3 rounded-lg text-left hover:bg-accent transition-colors",
                      selectedRoom?.id === room.id && "bg-accent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={getRoomAvatar(room) || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {room.type === 'group' ? (
                            <Users className="h-5 w-5" />
                          ) : (
                            getInitials(getRoomDisplayName(room))
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">
                            {getRoomDisplayName(room)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="flex-1 m-0 overflow-y-auto">
            <TasksPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 border-b flex items-center justify-between bg-card shrink-0">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={getRoomAvatar(selectedRoom) || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedRoom.type === 'group' ? (
                      <Users className="h-5 w-5" />
                    ) : (
                      getInitials(getRoomDisplayName(selectedRoom))
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{getRoomDisplayName(selectedRoom)}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedRoom.type === 'group' ? 'Grupo' : 'Conversa privada'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && selectedRoom.type === 'group' && (
                  <Button variant="ghost" size="icon">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Pinned Messages Banner */}
            {pinnedMessages.length > 0 && (
              <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b flex items-center gap-2 shrink-0">
                <Pin className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-700 dark:text-yellow-400">
                  {pinnedMessages.length} mensagem(ns) fixada(s)
                </span>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {messages?.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma mensagem ainda</p>
                    <p className="text-sm">Comece a conversa!</p>
                  </div>
                ) : (
                  messages?.map((msg) => {
                    const senderName = msg.sender?.full_name || msg.sender?.username || 'Usuário';

                    return (
                      <div key={msg.id} className="flex gap-2 group">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs bg-primary/10">
                            {getInitials(senderName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="max-w-[70%]">
                          <div className={cn(
                            "rounded-lg px-3 py-2 relative bg-muted",
                            msg.is_pinned && "ring-2 ring-yellow-400"
                          )}>
                            <p className="text-xs font-medium mb-1 opacity-70">{senderName}</p>
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            <span className="text-[10px] mt-1 block text-muted-foreground">
                              {format(new Date(msg.created_at), 'HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Reply indicator */}
            {replyTo && (
              <div className="px-4 py-2 bg-muted/50 border-t flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Reply className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Respondendo a <span className="font-medium">{replyTo.sender?.full_name}</span>
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setReplyTo(null)}
                >
                  Cancelar
                </Button>
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 border-t bg-card shrink-0">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <Smile className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2">
                    <EmojiPicker 
                      onSelect={(emoji) => setMessageInput(prev => prev + emoji)} 
                    />
                  </PopoverContent>
                </Popover>

                <Input
                  placeholder="Digite sua mensagem..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="flex-1"
                />

                <Button 
                  size="icon" 
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendMessage.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Selecione uma conversa</p>
              <p className="text-sm">Escolha uma sala para começar a conversar</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Dialog */}
      <CreateGroupDialog 
        open={showCreateGroup} 
        onOpenChange={setShowCreateGroup}
        allUsers={allUsers}
      />

      {/* Create Task Dialog */}
      <CreateTaskDialog 
        open={showCreateTask} 
        onOpenChange={setShowCreateTask}
        allUsers={allUsers}
      />
    </div>
  );
};

const InternalChat = () => {
  return (
    <FeatureGate feature="internal_chat">
      <InternalChatContent />
    </FeatureGate>
  );
};

export default InternalChat;