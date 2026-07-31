import { MessagesSquare } from "lucide-react";

const FloatingChatButton = () => {
  return (
    <a
      href="https://wa.me/message/BYSDMLHYTA6EA1"
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com suporte no WhatsApp"
      className="fixed bottom-6 right-6 z-[110] group"
    >
      {/* Outer pulse ring */}
      <span className="absolute inset-0 rounded-full bg-[#004DFF]/25 animate-ping" />
      {/* Secondary softer ring */}
      <span className="absolute -inset-1.5 rounded-full bg-[#004DFF]/15 animate-pulse" />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#004DFF] text-white shadow-xl shadow-[#004DFF]/30 transition-transform duration-200 hover:scale-110">
        <MessagesSquare className="h-6 w-6" />
      </span>
    </a>
  );
};

export default FloatingChatButton;
