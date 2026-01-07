import { useState } from 'react';
import { useInternalChat, useAllUsers } from '@/hooks/useInternalChat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  CheckSquare, 
  Clock, 
  Plus, 
  Circle, 
  CheckCircle2,
  PlayCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CreateTaskDialog } from './CreateTaskDialog';

export const TasksPanel = () => {
  const { tasks, tasksLoading, updateTaskStatus, currentUserId } = useInternalChat();
  const { data: allUsers } = useAllUsers();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [filter, setFilter] = useState<'all' | 'mine' | 'assigned'>('all');

  const filteredTasks = tasks?.filter(task => {
    if (filter === 'mine') return task.assigned_to === currentUserId;
    if (filter === 'assigned') return task.created_by === currentUserId;
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluída';
      case 'in_progress':
        return 'Em andamento';
      default:
        return 'Pendente';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const cycleStatus = (currentStatus: string) => {
    const statusOrder = ['pending', 'in_progress', 'completed'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    return statusOrder[(currentIndex + 1) % statusOrder.length] as 'pending' | 'in_progress' | 'completed';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Minhas Tarefas</h3>
          <Button size="sm" onClick={() => setShowCreateTask(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-1">
          <Button 
            variant={filter === 'all' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setFilter('all')}
          >
            Todas
          </Button>
          <Button 
            variant={filter === 'mine' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setFilter('mine')}
          >
            Para mim
          </Button>
          <Button 
            variant={filter === 'assigned' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setFilter('assigned')}
          >
            Criadas
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {tasksLoading ? (
            <div className="text-center text-muted-foreground py-8">Carregando...</div>
          ) : filteredTasks?.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma tarefa</p>
            </div>
          ) : (
            filteredTasks?.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
                  task.status === 'completed' && "opacity-60"
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => updateTaskStatus.mutate({ 
                      taskId: task.id, 
                      status: cycleStatus(task.status) 
                    })}
                    className="mt-0.5"
                  >
                    {getStatusIcon(task.status)}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium text-sm",
                      task.status === 'completed' && "line-through"
                    )}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {getStatusLabel(task.status)}
                      </Badge>
                      {task.due_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(task.due_date), 'dd/MM', { locale: ptBR })}
                        </div>
                      )}
                      {task.assignee && (
                        <div className="flex items-center gap-1">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[8px]">
                              {getInitials(task.assignee.full_name || task.assignee.username || '?')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {task.assignee.full_name || task.assignee.username}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <CreateTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        allUsers={allUsers || []}
      />
    </div>
  );
};
