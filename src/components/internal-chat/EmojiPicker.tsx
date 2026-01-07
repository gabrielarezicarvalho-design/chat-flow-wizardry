interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

const COMMON_EMOJIS = [
  '👍', '❤️', '😂', '😮', '😢', '😡',
  '🎉', '🔥', '👏', '💯', '✅', '❌',
  '👀', '🙏', '💪', '🤝', '⭐', '💡'
];

export const EmojiPicker = ({ onSelect }: EmojiPickerProps) => {
  return (
    <div className="grid grid-cols-6 gap-1">
      {COMMON_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="text-xl hover:bg-accent rounded p-1 transition-colors"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};
