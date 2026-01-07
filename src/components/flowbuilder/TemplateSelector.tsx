import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { flowTemplates, FlowTemplate } from './FlowTemplates';
import { MessageSquare, HelpCircle, Headphones, ShoppingCart, Calendar, Star } from 'lucide-react';

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: FlowTemplate) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  welcome: <MessageSquare className="h-8 w-8" />,
  faq: <HelpCircle className="h-8 w-8" />,
  support: <Headphones className="h-8 w-8" />,
  sales: <ShoppingCart className="h-8 w-8" />,
  scheduling: <Calendar className="h-8 w-8" />,
  nps: <Star className="h-8 w-8" />,
};

const categoryColors: Record<string, string> = {
  atendimento: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  suporte: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
  vendas: 'bg-green-500/20 text-green-700 dark:text-green-400',
  agendamento: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
  feedback: 'bg-pink-500/20 text-pink-700 dark:text-pink-400',
};

export const TemplateSelector = ({ open, onOpenChange, onSelectTemplate }: TemplateSelectorProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Escolher Template de Fluxo</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {flowTemplates.map((template) => (
            <div
              key={template.id}
              className="border rounded-lg p-4 hover:border-primary hover:bg-accent/50 transition-colors cursor-pointer group"
              onClick={() => {
                onSelectTemplate(template);
                onOpenChange(false);
              }}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {iconMap[template.id] || <MessageSquare className="h-8 w-8" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{template.name}</h3>
                  <Badge 
                    variant="secondary" 
                    className={`mt-1 text-xs ${categoryColors[template.category] || ''}`}
                  >
                    {template.category}
                  </Badge>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                {template.description}
              </p>
              
              <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                <span>{template.nodes.length} blocos</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  Usar template
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
