import type { ComponentProps, ReactNode } from "react";

// Minimal primitives for the admin (Tailwind only, no extra packages). Plain back-office look: thin neutral
// borders, small radii, no shadows. Keep them small.

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "outline" | "ghost" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-navy-btn text-white hover:bg-navy disabled:opacity-50",
  outline: "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 disabled:opacity-50",
  ghost: "text-neutral-700 hover:bg-neutral-100",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50",
};

export function Button({ variant = "primary", size = "md", className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:cursor-not-allowed",
        { sm: "h-8 px-2.5 text-xs", md: "h-9 px-3.5 text-sm", lg: "h-10 px-4 text-sm" }[size],
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

const field =
  "rounded border border-neutral-300 bg-white py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-navy focus:outline-2 focus:outline-navy/20 disabled:bg-slate-50";

/** Field classes, keeping the default width/height/padding only when the caller does not set its own. */
function fieldClass(className = "", height: string) {
  return cx(
    field,
    !/(^|\s)w-/.test(className) && "w-full",
    !/(^|\s)(h|min-h)-/.test(className) && height,
    !/(^|\s)px-/.test(className) && "px-2.5",
    className,
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={fieldClass(className, "h-9")} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={fieldClass(className, "min-h-24")} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={fieldClass(className, "h-9")} {...props} />;
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx("grid gap-1.5", className)}>
      <span className="text-xs font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-md border border-neutral-200 bg-white", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
          {title && <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>}
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

const BADGES: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-900",
  PAID: "bg-sky-100 text-sky-900",
  PROCESSING: "bg-blue-100 text-blue-900",
  SHIPPED: "bg-teal-100 text-teal-900",
  DELIVERED: "bg-green-100 text-green-900",
  CANCELLED: "bg-neutral-200 text-neutral-700",
};

export const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Pending payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cx("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", BADGES[status] ?? BADGES.CANCELLED)}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "red" | "amber" }) {
  const tones = {
    slate: "bg-neutral-200 text-neutral-700",
    green: "bg-green-100 text-green-900",
    red: "bg-red-100 text-red-900",
    amber: "bg-amber-100 text-amber-900",
  };
  return <span className={cx("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded border border-neutral-200 bg-white">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  );
}
export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <th className={cx("border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium whitespace-nowrap text-neutral-600", className)}>{children}</th>
);
export const Td = ({ children, className, colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) => (
  <td colSpan={colSpan} className={cx("border-b border-neutral-100 px-3 py-2 align-middle", className)}>
    {children}
  </td>
);

/** Result line for a form action ({ error } / { ok }). */
export function FormMessage({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <p role={state.error ? "alert" : "status"} className={cx("text-sm font-medium", state.error ? "text-red-600" : "text-emerald-700")}>
      {state.error ?? state.ok}
    </p>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-neutral-600">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
