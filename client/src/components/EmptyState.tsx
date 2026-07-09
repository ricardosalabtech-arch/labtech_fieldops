import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground/40" />
      </div>
      <p className="text-muted-foreground font-medium text-sm">{title}</p>
      {description && (
        <p className="text-muted-foreground/60 text-xs mt-1 text-center max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
