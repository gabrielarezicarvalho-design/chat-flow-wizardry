import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Rect, Textbox, Circle } from "fabric";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Save, Play } from "lucide-react";
import { toast } from "sonner";

interface FlowCanvasProps {
  onSave: (flowData: any) => void;
  selectedNodeType: string | null;
  onNodeAdded: () => void;
}

export const FlowCanvas = ({ onSave, selectedNodeType, onNodeAdded }: FlowCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPosX, setLastPosX] = useState(0);
  const [lastPosY, setLastPosY] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: window.innerWidth - 400,
      height: window.innerHeight - 200,
      backgroundColor: "#f8f9fa",
    });

    // Pan functionality
    canvas.on('mouse:down', (opt) => {
      const evt = opt.e as MouseEvent;
      if (evt.altKey === true) {
        setIsPanning(true);
        canvas.selection = false;
        setLastPosX(evt.clientX);
        setLastPosY(evt.clientY);
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (isPanning) {
        const evt = opt.e as MouseEvent;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += evt.clientX - lastPosX;
          vpt[5] += evt.clientY - lastPosY;
          canvas.requestRenderAll();
          setLastPosX(evt.clientX);
          setLastPosY(evt.clientY);
        }
      }
    });

    canvas.on('mouse:up', () => {
      canvas.setViewportTransform(canvas.viewportTransform!);
      setIsPanning(false);
      canvas.selection = true;
    });

    // Add node on click
    canvas.on('mouse:down', (options) => {
      if (selectedNodeType && !isPanning && options.target === null) {
        const pointer = canvas.getPointer(options.e);
        addNode(selectedNodeType, pointer.x, pointer.y);
        onNodeAdded();
      }
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [selectedNodeType, isPanning, lastPosX, lastPosY]);

  const addNode = (nodeType: string, x: number, y: number) => {
    if (!fabricCanvas) return;

    const nodeConfig: Record<string, { label: string; color: string; icon: string }> = {
      message: { label: 'Mensagem', color: '#3b82f6', icon: '💬' },
      question: { label: 'Pergunta', color: '#8b5cf6', icon: '❓' },
      condition: { label: 'Condição', color: '#f59e0b', icon: '🔀' },
      webhook: { label: 'Webhook', color: '#10b981', icon: '🔗' },
      transfer: { label: 'Transferir', color: '#ef4444', icon: '➡️' },
      end: { label: 'Finalizar', color: '#6b7280', icon: '✓' }
    };

    const config = nodeConfig[nodeType] || nodeConfig.message;

    // Create node background
    const rect = new Rect({
      left: x - 75,
      top: y - 40,
      width: 150,
      height: 80,
      fill: config.color,
      rx: 8,
      ry: 8,
    });
    rect.set('shadow', { color: 'rgba(0,0,0,0.2)', blur: 10, offsetX: 0, offsetY: 4 } as any);

    // Create icon
    const icon = new Textbox(config.icon, {
      left: x - 60,
      top: y - 25,
      fontSize: 24,
      fill: 'white',
      selectable: false,
      editable: false
    });

    // Create label
    const text = new Textbox(config.label, {
      left: x - 25,
      top: y - 15,
      width: 100,
      fontSize: 14,
      fill: 'white',
      fontWeight: 'bold',
      textAlign: 'left',
      selectable: false,
      editable: false
    });

    // Add connection points (circles)
    const topCircle = new Circle({
      left: x - 5,
      top: y - 45,
      radius: 5,
      fill: 'white',
      stroke: config.color,
      strokeWidth: 2
    });

    const bottomCircle = new Circle({
      left: x - 5,
      top: y + 35,
      radius: 5,
      fill: 'white',
      stroke: config.color,
      strokeWidth: 2
    });

    fabricCanvas.add(rect, icon, text, topCircle, bottomCircle);
    fabricCanvas.renderAll();
    
    toast.success(`Bloco ${config.label} adicionado!`);
  };

  const handleZoomIn = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.min(zoom + 0.1, 2);
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  };

  const handleZoomOut = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.max(zoom - 0.1, 0.5);
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  };

  const handleSave = () => {
    if (!fabricCanvas) return;
    const json = fabricCanvas.toJSON();
    onSave(json);
    toast.success("URA salva com sucesso!");
  };

  const handleTest = () => {
    toast.info("Teste de fluxo em desenvolvimento");
  };

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button variant="outline" size="icon" onClick={handleZoomOut}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleZoomIn}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="outline" onClick={handleTest}>
          <Play className="w-4 h-4 mr-2" />
          Testar
        </Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Salvar URA
        </Button>
      </div>
      <canvas ref={canvasRef} className="border border-border rounded-lg shadow-lg" />
    </div>
  );
};
