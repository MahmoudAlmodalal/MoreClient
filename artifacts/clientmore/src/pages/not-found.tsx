import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <Card tone="light" className="w-full max-w-md shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-danger/20 bg-danger/10 shrink-0">
            <AlertCircle className="h-5 w-5 text-danger" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">404 Page Not Found</h1>
        </div>

        <p className="text-sm text-muted-fg">
          Did you forget to add the page to the router?
        </p>
      </Card>
    </div>
  );
}
