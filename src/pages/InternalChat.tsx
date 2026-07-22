import { useState, useRef, useEffect, useMemo } from 'react';
import { useInternalChat, ChatRoom, ChatMessage, useCompanyUsers } from '@/hooks/useInternalChat';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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
  Settings,
  Paperclip,
  X,
  Download,
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

const slugify = (u: { full_name: string | null; username: string | null }) =>
  (u.username || u.full_name || '').toLowerCase().replace(/\s+/g, '');

const MENTION_TOKEN_RE = /@([\w.-]+)/g;

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
    uploadFile,
  } = useInternalChat();
  const { data: companyUsers = [] } = useCompanyUsers();
  const allUsers = companyUsers.map(u => ({
    id: u.id,
    full_name: u.full_name,
    username: u.username,
    is_online: u.is_online ?? null,
  }));

  const userSlugMap = useMemo(() => {
    const m = new Map<string, typeof allUsers[number]>();
    allUsers.forEach((u) => m.set(slugify(u), u));
    return m;
  }, [allUsers]);

  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskForUser, setTaskForUser] = useState<string | null>(null);
  const [reactionFor, setReactionFor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('chats');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const parseMentions = (text: string): string[] => {
    const ids: string[] = [];
    for (const match of text.matchAll(MENTION_TOKEN_RE)) {
      const u = userSlugMap.get(match[1].toLowerCase());
      if (u) ids.push(u.id);
    }
    return ids;
  };

  const renderContent = (text: string | null) => {
    if (!text) return null;
    const parts = text.split(/(@[\w.-]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const slug = part.slice(1).toLowerCase();
        if (userSlugMap.has(slug)) {
          return (
            <span key={i} className="text-primary font-medium bg-primary/10 rounded px-1">
              {part}
            </span>
          );
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return allUsers
      .filter((u) => {
        if (!q) return true;
        return (
          slugify(u).includes(q) ||
          (u.full_name || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 6);
  }, [mentionQuery, allUsers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setMessageInput(v);
    const caret = e.target.selectionStart ?? v.length;
    const before = v.slice(0, caret);
    const m = before.match(/@([\w.-]*)$/);
    setMentionQuery(m ? m[1] : null);
  };

  const insertMention = (u: { full_name: string | null; username: string | null }) => {
    const slug = slugify(u);
    const el = inputRef.current;
    const caret = el?.selectionStart ?? messageInput.length;
    const before = messageInput.slice(0, caret);
    const after = messageInput.slice(caret);
    const replaced = before.replace(/@([\w.-]*)$/, `@${slug} `);
    const next = replaced + after;
    setMessageInput(next);
    setMentionQuery(null);
    setTimeout(() => {
      el?.focus();
      const pos = replaced.length;
      el?.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedRoom) return;

    await sendMessage.mutateAsync({
      roomId: selectedRoom.id,
      content: messageInput,
      type: 'text',
      replyTo: replyTo?.id,
      mentions: parseMentions(messageInput),
    });

    setMessageInput('');
    setReplyTo(null);
    setMentionQuery(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedRoom) return;
    try {
      setUploading(true);
      const { url, name } = await uploadFile(file, selectedRoom.id);
      const isImage = file.type.startsWith('image/');
      await sendMessage.mutateAsync({
        roomId: selectedRoom.id,
        content: messageInput.trim() || (isImage ? '' : name),
        type: isImage ? 'image' : 'file',
        replyTo: replyTo?.id,
        fileUrl: url,
        fileName: name,
        mentions: parseMentions(messageInput),
      });
      setMessageInput('');
      setReplyTo(null);
    } finally {
      setUploading(false);
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
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("font-medium truncate", (room.unread_count ?? 0) > 0 && "font-semibold")}>
                            {getRoomDisplayName(room)}
                          </span>
                          {(room.unread_count ?? 0) > 0 && (
                            <Badge className="h-5 min-w-[20px] px-1.5 rounded-full text-[10px] shrink-0">
                              {room.unread_count! > 99 ? '99+' : room.unread_count}
                            </Badge>
                          )}
                        </div>
                        {room.last_message?.content && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {room.last_message.content}
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
                    // Group reactions by emoji
                    const reactionGroups = (msg.reactions ?? []).reduce<Record<string, typeof msg.reactions>>((acc, r) => {
                      (acc[r.emoji] = acc[r.emoji] || []).push(r);
                      return acc;
                    }, {} as any);

                    return (
                      <div key={msg.id} className="flex gap-2 group">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs bg-primary/10">
                            {getInitials(senderName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="max-w-[70%] relative">
                          <div className={cn(
                            "rounded-lg px-3 py-2 relative bg-muted",
                            msg.is_pinned && "ring-2 ring-yellow-400"
                          )}>
                            <p className="text-xs font-medium mb-1 opacity-70">{senderName}</p>

                            {msg.reply_message && (
                              <div className="mb-2 border-l-2 border-primary/60 bg-background/60 rounded px-2 py-1">
                                <p className="text-[10px] font-medium text-primary">
                                  {msg.reply_message.sender?.full_name || msg.reply_message.sender?.username || 'Usuário'}
                                </p>
                                <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                                  {msg.reply_message.type === 'image'
                                    ? '📷 Imagem'
                                    : msg.reply_message.type === 'file'
                                      ? `📎 ${msg.reply_message.file_name ?? 'Arquivo'}`
                                      : msg.reply_message.content}
                                </p>
                              </div>
                            )}

                            {msg.type === 'image' && msg.file_url && (
                              <a href={msg.file_url} target="_blank" rel="noreferrer">
                                <img
                                  src={msg.file_url}
                                  alt={msg.file_name ?? 'imagem'}
                                  className="max-w-full max-h-64 rounded mb-1 object-cover"
                                />
                              </a>
                            )}
                            {msg.type === 'file' && msg.file_url && (
                              <a
                                href={msg.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 bg-background/60 rounded px-2 py-1.5 mb-1 text-sm hover:bg-background"
                              >
                                <FileText className="h-4 w-4 shrink-0" />
                                <span className="truncate flex-1">{msg.file_name ?? 'Arquivo'}</span>
                                <Download className="h-3.5 w-3.5 shrink-0 opacity-60" />
                              </a>
                            )}

                            {msg.content && (
                              <p className="whitespace-pre-wrap break-words">
                                {renderContent(msg.content)}
                              </p>
                            )}
                            <span className="text-[10px] mt-1 block text-muted-foreground">
                              {format(new Date(msg.created_at), 'HH:mm')}
                              {msg.is_pinned && <Pin className="h-3 w-3 inline ml-1 text-yellow-600" />}
                            </span>
                          </div>


                          {/* Reactions display */}
                          {Object.keys(reactionGroups).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(reactionGroups).map(([emoji, list]) => (
                                <button
                                  key={emoji}
                                  onClick={() => {
                                    const mine = list!.find((r) => r.user_id === msg.sender_id);
                                    if (mine) removeReaction.mutate(mine.id);
                                    else addReaction.mutate({ messageId: msg.id, emoji });
                                  }}
                                  className="bg-background border rounded-full px-1.5 py-0.5 text-xs hover:bg-accent"
                                >
                                  {emoji} {list!.length}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Hover action bar */}
                          <div className="absolute -top-3 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-card border rounded-md shadow-sm px-1">
                            <Popover open={reactionFor === msg.id} onOpenChange={(o) => setReactionFor(o ? msg.id : null)}>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <Smile className="h-3.5 w-3.5" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-2">
                                <EmojiPicker
                                  onSelect={(emoji) => {
                                    addReaction.mutate({ messageId: msg.id, emoji });
                                    setReactionFor(null);
                                  }}
                                />
                              </PopoverContent>
                            </Popover>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setReplyTo(msg)}
                              title="Responder"
                            >
                              <Reply className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => pinMessage.mutate(msg.id)}
                              title={msg.is_pinned ? 'Desafixar' : 'Fixar'}
                            >
                              <Pin className={cn("h-3.5 w-3.5", msg.is_pinned && "text-yellow-600 fill-yellow-600")} />
                            </Button>
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
            <div className="p-4 border-t bg-card shrink-0 relative">
              {mentionQuery !== null && mentionSuggestions.length > 0 && (
                <div className="absolute bottom-full left-4 right-4 mb-1 max-h-56 overflow-y-auto bg-popover border rounded-md shadow-md z-10">
                  {mentionSuggestions.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => insertMention(u)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent text-sm"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px] bg-primary/10">
                          {getInitials(u.full_name || u.username || '?')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{u.full_name || u.username}</div>
                        <div className="truncate text-xs text-muted-foreground">@{slugify(u)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
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

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFilePick}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || sendMessage.isPending}
                  title="Anexar arquivo"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>

                <Input
                  ref={inputRef}
                  placeholder="Digite sua mensagem... (use @ para mencionar)"
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  className="flex-1"
                />

                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendMessage.isPending || uploading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {uploading && (
                <p className="text-xs text-muted-foreground mt-1">Enviando arquivo...</p>
              )}
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