import { Check } from "lucide-react";

const steps = ["Account", "Business", "Details", "Finish"] as const;
export function OnboardingStepper({ current }: { current: 1 | 2 | 3 | 4 }) {
  return <nav aria-label="Setup progress" className="w-full">
    <ol className="grid grid-cols-4 gap-1">
      {steps.map((label, index) => {
        const number = (index + 1) as 1 | 2 | 3 | 4;
        const done = number < current;
        const active = number === current;
        return <li key={label} className="relative flex flex-col items-center gap-1.5 text-center">
          {index < steps.length - 1 ? <span aria-hidden="true" className={`absolute left-[calc(50%+1rem)] right-[calc(-50%-1rem)] top-4 border-t ${done ? "border-primary" : "border-border"}`} /> : null}
          <span aria-current={active ? "step" : undefined}
            className={`relative z-10 flex size-8 items-center justify-center rounded-full border text-sm font-semibold ${done || active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}>
            {done ? <Check className="size-4" aria-label="Completed"/> : number}
          </span>
          <span className={`text-xs ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{label}</span>
        </li>;
      })}
    </ol>
  </nav>;
}
