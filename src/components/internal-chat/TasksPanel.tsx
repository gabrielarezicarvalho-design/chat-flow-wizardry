import { useState } from 'react';
import { useInternalChat } from '@/hooks/useInternalChat';
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
import { useAuth } from '@/hooks/useAuth';

export const TasksPanel = () => {
  const { tasks, tasksLoading, updateTask } = useInternalChat();
  const { user } = useAuth();
  const currentUserId = user?.id;
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

  const cycleStatus = (currentStatus: string) => {
    const statuses = ['pending', 'in_progress', 'completed'];
    const currentIndex = statuses.indexOf(currentStatus);
    return statuses[(currentIndex + 1) % statuses.length];
  };

  const handleStatusChange = (taskId: string, currentStatus: string) => {
    const newStatus = cycleStatus(currentStatus);
    updateTask.mutate({ id: taskId, updates: { status: newStatus as 'pending' | 'in_progress' | 'completed' } });
  };

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          <h2 className="font-semibold">Tarefas</h2>
          <Badge variant="secondary">{filteredTasks?.length || 0}</Badge>
        </div>
        <Button size="sm" onClick={() => setShowCreateTask(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nova
        </Button>
      </div>

      <div className="px-4 py-2 border-b flex gap-2">
        <Button
          size="sm"
          variant={filter === 'all' ? 'default' : 'ghost'}
          onClick={() => setFilter('all')}
        >
          Todas
        </Button>
        <Button
          size="sm"
          variant={filter === 'mine' ? 'default' : 'ghost'}
          onClick={() => setFilter('mine')}
        >
          Minhas
        </Button>
        <Button
          size="sm"
          variant={filter === 'assigned' ? 'default' : 'ghost'}
          onClick={() => setFilter('assigned')}
        >
          Criadas por mim
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredTasks?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma tarefa encontrada
            </div>
          ) : (
            filteredTasks?.map(task => (
              <div
                key={task.id}
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  task.status === 'completed' && "opacity-60"
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    className="mt-0.5"
                    onClick={() => handleStatusChange(task.id, task.status)}
                  >
                    {getStatusIcon(task.status)}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "font-medium",
                      task.status === 'completed' && "line-through"
                    )}>
                      {task.title}
                    </div>
                    {task.description && (
                      <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {task.description}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {getStatusLabel(task.status)}
                      </Badge>
                      {task.due_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(task.due_date), "dd/MM", { locale: ptBR })}
                        </div>
                      )}
                      {task.assignee && (
                        <div className="flex items-center gap-1">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[10px]">
                              {(task.assignee.full_name || task.assignee.username || '?')[0]}
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
        allUsers={[]}
      />
    </div>
  );
};