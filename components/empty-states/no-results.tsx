import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

interface NoResultsProps {
  onClear?: () => void;
}

export function NoResults({ onClear }: NoResultsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <HugeiconsIcon icon={Search01Icon} className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-2">No results found</h3>
      <p className="text-muted-foreground mb-6">
        Try adjusting your filters or date range
      </p>
      {onClear && (
        <Button variant="outline" onClick={onClear}>
          Clear Filters
        </Button>
      )}
    </div>
  );
}
