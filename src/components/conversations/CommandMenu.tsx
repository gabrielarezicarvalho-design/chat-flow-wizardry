import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (command: string) => void;
}

const commands = [
  { value: '/saudacao', label: '/saudacao', text: 'Olá! Como posso ajudar você hoje?' },
  { value: '/precos', label: '/precos', text: 'Nossos preços começam em R$ 99/mês' },
  { value: '/status', label: '/status', text: 'Seu pedido está em processamento' },
  { value: '/pix', label: '/pix', text: 'Vou enviar as informações para pagamento via PIX' },
  { value: '/encerrar', label: '/encerrar', text: 'Obrigado pelo contato! Até logo!' }
];

export const CommandMenu = ({ open, onOpenChange, onSelect }: CommandMenuProps) => {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar comando..." />
          <CommandList>
            <CommandEmpty>Nenhum comando encontrado.</CommandEmpty>
            <CommandGroup heading="Comandos Rápidos">
              {commands.map((cmd) => (
                <CommandItem
                  key={cmd.value}
                  value={cmd.value}
                  onSelect={() => {
                    onSelect(cmd.text);
                    onOpenChange(false);
                  }}
                >
                  <span className="font-mono text-primary">{cmd.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};