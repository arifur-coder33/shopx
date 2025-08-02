import Button from "@/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CursorPagination({
  onNext,
  onPrevious,
  hasNextPage,
  hasPreviousPage,
  currentPage,
}) {
  return (
    <div className="flex items-center justify-between py-4">
      {/* Optional: Show total results if available */}
      {/* <div className="text-sm text-muted-foreground">
        Showing page {currentPage}.
      </div> */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={onPrevious}
          disabled={!hasPreviousPage}
        >
          <span className="sr-only">Go to previous page</span>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {currentPage}
        </div>

        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={onNext}
          disabled={!hasNextPage}
        >
          <span className="sr-only">Go to next page</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
