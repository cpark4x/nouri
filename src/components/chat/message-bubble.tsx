interface MessageBubbleProps {
  message: {
    role: string;
    content: string;
    createdAt: string;
    userName?: string;
  };
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function renderMarkdown(text: string): string {
  let html = text
    // Escape HTML entities
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Split into lines for list handling
  const lines = html.split("\n");
  const result: string[] = [];
  let inList = false;

  for (const line of lines) {
    const listMatch = line.match(/^- (.+)$/);
    if (listMatch) {
      if (!inList) {
        result.push('<ul class="list-disc pl-5 my-1">');
        inList = true;
      }
      result.push(`<li>${listMatch[1]}</li>`);
    } else {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      if (line.trim() === "") {
        result.push("<br />");
      } else {
        result.push(`<p>${line}</p>`);
      }
    }
  }
  if (inList) result.push("</ul>");

  return result.join("");
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const senderLabel = isUser ? (message.userName ?? "You") : "Nouri";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-gray-900 text-white"
            : "border border-gray-200 bg-gray-50 text-gray-900"
        }`}
      >
        <p className={`text-xs font-medium ${isUser ? "text-gray-300" : "text-gray-500"}`}>
          {senderLabel}
        </p>
        {isUser ? (
          <p className="mt-1 whitespace-pre-wrap text-sm">{message.content}</p>
        ) : (
          <div className="nouri-message mt-1 text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
        )}
        <p className={`mt-1.5 text-[10px] ${isUser ? "text-gray-400" : "text-gray-400"}`}>
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}