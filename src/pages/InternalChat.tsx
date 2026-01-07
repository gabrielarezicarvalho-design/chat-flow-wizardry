import { useState, useRef, useEffect } from 'react';
import { useInternalChat, useAllUsers, ChatRoom, ChatMessage } from '@/hooks/useInternalChat';
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
  Paperclip,
  Mic,
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
    useRoomMessages,
    sendMessage,
    toggleReaction,
    togglePin,
    currentUserId
  } = useInternalChat();
  const { data: allUsers } = useAllUsers();

  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskForUser, setTaskForUser] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('chats');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: messages, isLoading: messagesLoading } = useRoomMessages(selectedRoom?.id || null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedRoom) return;

    const mentionRegex = /@(\w+)/g;
    const mentionMatches = messageInput.match(mentionRegex) || [];
    const mentionIds = mentionMatches
      .map(match => {
        const username = match.slice(1);
        return allUsers?.find(u => u.username === username)?.id;
      })
      .filter(Boolean) as string[];

    await sendMessage.mutateAsync({
      roomId: selectedRoom.id,
      content: messageInput,
      type: 'text',
      replyTo: replyTo?.id,
      mentionIds
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
    const otherParticipant = room.participants?.find(p => p.user_id !== currentUserId);
    return otherParticipant?.profile?.full_name || otherParticipant?.profile?.username || 'Conversa';
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

  const handleCreateTaskForUser = (userId: string) => {
    setTaskForUser(userId);
    setShowCreateTask(true);
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex bg-background rounded-lg border overflow-hidden">
      {/* Sidebar - Room List */}
      <div className="w-80 border-r flex flex-col bg-card">
        <div className="p-4 border-b shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Chat Interno</h2>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowCreateGroup(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Novo
              </Button>
            )}
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
                          {room.last_message && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {format(new Date(room.last_message.created_at), 'HH:mm')}
                            </span>
                          )}
                        </div>
                        {room.last_message && (
                          <p className="text-sm text-muted-foreground truncate">
                            {room.last_message.content || '[Mídia]'}
                          </p>
                        )}
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
                    {selectedRoom.type === 'group' 
                      ? `${selectedRoom.participants?.length || 0} participantes`
                      : selectedRoom.participants?.find(p => p.user_id !== currentUserId)?.profile?.is_online
                        ? 'Online'
                        : 'Offline'
                    }
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
                {messagesLoading ? (
                  <div className="text-center text-muted-foreground py-8">Carregando mensagens...</div>
                ) : messages?.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma mensagem ainda</p>
                    <p className="text-sm">Comece a conversa!</p>
                  </div>
                ) : (
                  messages?.map((msg) => {
                    const isOwn = msg.sender_id === currentUserId;
                    const senderName = msg.sender?.full_name || msg.sender?.username || 'Usuário';

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-2 group",
                          isOwn && "flex-row-reverse"
                        )}
                      >
                        {!isOwn && (
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="text-xs bg-primary/10">
                              {getInitials(senderName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={cn("max-w-[70%]", isOwn && "items-end")}>
                          {msg.reply_message && (
                            <div className="text-xs bg-muted/50 rounded px-2 py-1 mb-1 border-l-2 border-primary">
                              <span className="font-medium">
                                {msg.reply_message.sender?.full_name}:
                              </span>{' '}
                              {msg.reply_message.content?.slice(0, 50)}...
                            </div>
                          )}
                          
                          <div
                            className={cn(
                              "rounded-lg px-3 py-2 relative",
                              isOwn 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted",
                              msg.is_pinned && "ring-2 ring-yellow-400"
                            )}
                          >
                            {!isOwn && selectedRoom.type === 'group' && (
                              <p className="text-xs font-medium mb-1 opacity-70">{senderName}</p>
                            )}
                            
                            {msg.type === 'text' && (
                              <p className="whitespace-pre-wrap break-words">
                                {msg.content?.split(/(@\w+)/g).map((part, i) => {
                                  if (part.startsWith('@')) {
                                    return (
                                      <span key={i} className="bg-blue-500/20 text-blue-300 rounded px-1">
                                        {part}
                                      </span>
                                    );
                                  }
                                  return part;
                                })}
                              </p>
                            )}
                            
                            {msg.type === 'image' && msg.file_url && (
                              <img src={msg.file_url} alt="" className="max-w-full rounded" />
                            )}
                            
                            {msg.type === 'file' && msg.file_url && (
                              <a 
                                href={msg.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm underline"
                              >
                                <FileText className="h-4 w-4" />
                                {msg.file_name || 'Arquivo'}
                              </a>
                            )}

                            <span className={cn(
                              "text-[10px] mt-1 block",
                              isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {format(new Date(msg.created_at), 'HH:mm')}
                            </span>

                            {/* Actions on hover */}
                            <div className={cn(
                              "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1",
                              isOwn ? "left-0 -translate-x-full pr-2" : "right-0 translate-x-full pl-2"
                            )}>
                              <Popover open={showEmojiPicker === msg.id} onOpenChange={(open) => setShowEmojiPicker(open ? msg.id : null)}>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Smile className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2">
                                  <EmojiPicker 
                                    onSelect={(emoji) => {
                                      toggleReaction.mutate({ messageId: msg.id, emoji });
                                      setShowEmojiPicker(null);
                                    }} 
                                  />
                                </PopoverContent>
                              </Popover>
                              
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7"
                                onClick={() => setReplyTo(msg)}
                              >
                                <Reply className="h-4 w-4" />
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => togglePin.mutate({ messageId: msg.id, isPinned: msg.is_pinned })}>
                                    <Pin className="h-4 w-4 mr-2" />
                                    {msg.is_pinned ? 'Desafixar' : 'Fixar'}
                                  </DropdownMenuItem>
                                  {!isOwn && (
                                    <DropdownMenuItem onClick={() => handleCreateTaskForUser(msg.sender_id)}>
                                      <CheckSquare className="h-4 w-4 mr-2" />
                                      Criar tarefa
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Reactions */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {Object.entries(
                                msg.reactions.reduce((acc, r) => {
                                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                  return acc;
                                }, {} as Record<string, number>)
                              ).map(([emoji, count]) => (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction.mutate({ messageId: msg.id, emoji })}
                                  className="text-xs bg-muted rounded-full px-2 py-0.5 hover:bg-accent"
                                >
                                  {emoji} {count}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Reply Preview */}
            {replyTo && (
              <div className="px-4 py-2 bg-muted/50 border-t flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Reply className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Respondendo a <strong>{replyTo.sender?.full_name}</strong>
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setReplyTo(null)}>
                  ✕
                </Button>
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 border-t bg-card shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                />
                <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Mic className="h-5 w-5" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem... (use @nome para mencionar)"
                    className="pr-10"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      >
                        <Smile className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                      <EmojiPicker onSelect={(emoji) => setMessageInput(prev => prev + emoji)} />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
              <p className="text-muted-foreground">
                Escolha uma conversa à esquerda ou {isAdmin ? 'crie uma nova' : 'aguarde ser adicionado'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateGroupDialog 
        open={showCreateGroup} 
        onOpenChange={setShowCreateGroup}
        allUsers={allUsers || []}
      />
      
      <CreateTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        defaultAssignee={taskForUser}
        roomId={selectedRoom?.id}
        allUsers={allUsers || []}
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
