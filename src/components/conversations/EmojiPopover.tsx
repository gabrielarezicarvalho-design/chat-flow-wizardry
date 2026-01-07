import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";

interface EmojiPopoverProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}

const EMOJI_CATEGORIES = {
  'Sorrisos': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘'],
  'Gestos': ['👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '✌️', '🤞', '👌', '🤙', '👋', '✋', '🖐️', '👆', '👇'],
  'Corações': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💖', '💝', '💘', '💗', '💓', '💔', '❣️', '💕'],
  'Objetos': ['🎉', '🎊', '🎁', '🏆', '⭐', '🌟', '✨', '💡', '📌', '📍', '✅', '❌', '⚠️', '📢', '🔔', '💰'],
  'Natureza': ['🌞', '🌙', '⭐', '🌈', '🔥', '💧', '🌊', '🌸', '🌺', '🌻', '🍀', '🌴', '🌵', '🌲', '🍁', '🍂'],
};

export const EmojiPopover = ({ onSelect, disabled }: EmojiPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Sorrisos');

  const handleEmojiClick = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          disabled={disabled}
        >
          <Smile className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" side="top" align="start">
        <div className="space-y-2">
          {/* Category tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {Object.keys(EMOJI_CATEGORIES).map((category) => (
              <Button
                key={category}
                variant={activeCategory === category ? "secondary" : "ghost"}
                size="sm"
                className="text-xs px-2 py-1 h-7 whitespace-nowrap"
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
          
          {/* Emoji grid */}
          <div className="grid grid-cols-8 gap-1">
            {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="text-xl hover:bg-accent rounded p-1.5 transition-colors flex items-center justify-center"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
