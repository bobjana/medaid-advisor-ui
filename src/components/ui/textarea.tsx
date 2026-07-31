import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-xl border border-transparent bg-surface-container-low px-3 py-2 text-base transition-colors outline-none focus:bg-surface-container-lowest focus:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
