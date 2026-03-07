import { Loader2 } from "lucide-react";

interface ToolCallBadgeProps {
  toolName: string;
  args: Record<string, unknown>;
  state: "partial-call" | "call" | "result";
}

export function getFileName(path: string): string {
  return path.split("/").pop() || path;
}

export function getToolCallLabel(
  toolName: string,
  args: Record<string, unknown>
): string {
  if (toolName === "str_replace_editor") {
    const command = args.command as string;
    const fileName = getFileName(args.path as string);
    switch (command) {
      case "create":
        return `Creating ${fileName}`;
      case "str_replace":
        return `Editing ${fileName}`;
      case "insert":
        return `Editing ${fileName}`;
      case "view":
        return `Reading ${fileName}`;
      case "undo_edit":
        return `Undoing edit in ${fileName}`;
      default:
        return `Editing ${fileName}`;
    }
  }

  if (toolName === "file_manager") {
    const command = args.command as string;
    const fileName = getFileName(args.path as string);
    switch (command) {
      case "rename": {
        const newFileName = getFileName((args.new_path as string) || "");
        return `Renaming ${fileName} → ${newFileName}`;
      }
      case "delete":
        return `Deleting ${fileName}`;
      default:
        return fileName;
    }
  }

  return toolName;
}

export function ToolCallBadge({ toolName, args, state }: ToolCallBadgeProps) {
  const isDone = state === "result";
  const label = getToolCallLabel(toolName, args);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" data-testid="done-indicator" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" data-testid="loading-indicator" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
