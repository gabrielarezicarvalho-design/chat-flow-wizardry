import { Handle, Position } from '@xyflow/react';
import { Mic, AlertTriangle, ChevronRight } from 'lucide-react';

interface Props {
  data: Record<string, any>;
  selected?: boolean;
}

export const ElevenLabsAudioNode = ({ data, selected }: Props) => {
  const hasWarning = !data?.text;
  const preview = (data?.text || '').toString().slice(0, 40);

  return (
    <div
      className={`flex flex-col rounded-lg bg-white border shadow-sm min-w-[180px] max-w-[240px] transition-all duration-150 ${
        selected ? 'ring-2 ring-violet-500 shadow-md' : 'border-gray-200 hover:shadow-md'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-violet-500 !w-3 !h-3 !border-2 !border-white !-left-1.5"
        style={{ top: '20px' }}
      />
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
          <Mic className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-700 truncate leading-tight">
            {data?.label || 'Áudio ElevenLabs'}
          </p>
          {preview && (
            <p className="text-[10px] text-gray-500 truncate">{preview}{data?.text?.length > 40 ? '…' : ''}</p>
          )}
        </div>
        {hasWarning && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
        <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-violet-500 !w-3 !h-3 !border-2 !border-white !-right-1.5"
      />
    </div>
  );
};

export default ElevenLabsAudioNode;
