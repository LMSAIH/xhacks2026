interface McpExampleBoxProps {
  title: string;
  description: string;
  snippet: string;
  ide?: string;
}

export function McpExampleBox({ title, description, snippet, ide }: McpExampleBoxProps) {
  return (
    <div className="border border-border bg-card hover:border-foreground transition-all duration-300 overflow-hidden h-full flex flex-col">
      {/* Title bar - terminal style */}
      <div className="border-b border-border px-4 py-2 bg-muted/50 flex items-center justify-between shrink-0">
        <span className="font-mono text-xs font-medium">{title}</span>
        {ide && (
          <span className="font-mono text-xs text-muted-foreground">{ide}</span>
        )}
      </div>

      {/* Content - flex-grow to fill available space */}
      <div className="p-4 flex flex-col grow">
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
          {description}
        </p>
        <div className="bg-muted/50 border border-border p-3 rounded font-mono text-xs overflow-x-auto grow">
          <pre className="whitespace-pre-wrap break-words">{snippet}</pre>
        </div>
      </div>
    </div>
  );
}
