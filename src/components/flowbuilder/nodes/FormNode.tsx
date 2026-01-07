import { Handle, Position } from '@xyflow/react';
import { FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface FormNodeProps {
  data: Record<string, any>;
  selected?: boolean;
}

export const FormNode = ({ data, selected }: FormNodeProps) => {
  const fieldsCount = data?.fields?.length || 0;
  
  return (
    <Card className={`p-4 min-w-[200px] bg-cyan-500/10 border-cyan-500 ${selected ? 'ring-2 ring-cyan-500' : ''}`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!bg-cyan-500 !w-4 !h-4 !border-2 !border-white"
        style={{ top: -8 }}
      />
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-full bg-cyan-500 shrink-0">
          <FileText className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-cyan-600 text-sm">Formulário</p>
          <p className="text-xs text-muted-foreground truncate">
            {fieldsCount > 0 ? `${fieldsCount} campo(s)` : 'Clique para configurar'}
          </p>
        </div>
      </div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!bg-cyan-500 !w-4 !h-4 !border-2 !border-white"
        style={{ bottom: -8 }}
      />
    </Card>
  );
};
