import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, Save, Play, Loader2, Upload, LayoutTemplate, AlertTriangle, CheckCircle, Settings2 } from 'lucide-react';
import { FlowValidator, type ValidationError } from './FlowValidator';
import { Node, Edge } from '@xyflow/react';

interface FlowBuilderHeaderProps {
  flowName: string;
  setFlowName: (name: string) => void;
  flowStatus: string;
  validationErrors: ValidationError[];
  isSaving: boolean;
  onBack: () => void;
  onSave: () => void;
  onPublish: () => void;
  onOpenTemplates: () => void;
  onOpenTester: () => void;
  nodes: Node[];
  edges: Edge[];
}

export const FlowBuilderHeader = ({
  flowName,
  setFlowName,
  flowStatus,
  validationErrors,
  isSaving,
  onBack,
  onSave,
  onPublish,
  onOpenTemplates,
  onOpenTester,
  nodes,
  edges
}: FlowBuilderHeaderProps) => {
  const hasErrors = validationErrors.some(e => e.type === 'error');
  const hasWarnings = validationErrors.some(e => e.type === 'warning');

  return (
    <div className="h-14 bg-background border-b flex items-center justify-between px-4 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack}
          className="rounded-lg hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <div className="flex items-center gap-2">
          <Input
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="w-56 h-9 font-medium border-transparent bg-transparent hover:bg-muted/50 focus:bg-background focus:border-input transition-all"
            placeholder="Nome do fluxo"
          />
          <Badge 
            variant={flowStatus === 'active' ? 'default' : 'secondary'}
            className={flowStatus === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : ''}
          >
            {flowStatus === 'active' ? 'Ativo' : 'Rascunho'}
          </Badge>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onOpenTemplates}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <LayoutTemplate className="h-4 w-4" />
          Templates
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Validation */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className={`gap-1.5 ${
                hasErrors 
                  ? 'text-destructive hover:text-destructive' 
                  : hasWarnings 
                    ? 'text-amber-500 hover:text-amber-500' 
                    : 'text-emerald-500 hover:text-emerald-500'
              }`}
            >
              {hasErrors || hasWarnings ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <span className="text-xs font-medium">
                {validationErrors.length === 0 ? 'OK' : validationErrors.length}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <FlowValidator nodes={nodes} edges={edges} />
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-6" />
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onOpenTester}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          Testar
        </Button>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={onSave} 
          disabled={isSaving}
          className="gap-2"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar
        </Button>

        <Button 
          size="sm" 
          onClick={onPublish} 
          disabled={hasErrors}
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          <Upload className="h-4 w-4" />
          Publicar
        </Button>
      </div>
    </div>
  );
};
