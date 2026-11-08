import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

export type DocumentTemplateKind = "receipt" | "invoice" | "report";

/**
 * A deliberately small, UI-only canvas shared by document previews. Document
 * layouts live in their own components; this only provides their preview
 * surface so receipts do not become an invoice-shaped template by accident.
 */
export function DocumentTemplatePreview({
  kind,
  children,
  className = "",
  style,
  ...props
}: {
  kind: DocumentTemplateKind;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className" | "style">) {
  return (
    <article
      {...props}
      data-document-template={kind}
      className={`bg-white text-black shadow-sm ring-1 ring-black/10 ${className}`}
      style={style}
    >
      {children}
    </article>
  );
}
