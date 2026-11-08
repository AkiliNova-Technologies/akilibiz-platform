import { invoke } from "@tauri-apps/api/core";
import type { BusinessDocument, DocumentPdf, DocumentType, SalePrintDocument } from "@/types/documents";
import type { CanonicalReceipt } from "@/types/receipt";

export const tauriDocumentsService = {
  getCanonicalReceipt(saleId: number) { return invoke<CanonicalReceipt>("get_canonical_receipt", { saleId }); },
  getAuthoritativeSalePrintDocument(saleId:number) { return invoke<SalePrintDocument>("get_authoritative_sale_print_document", { saleId }); },
  recordSalePrintAudit(saleId:number) { return invoke("record_sale_print_audit", { payload:{ sale_id:saleId, document_type:"RECEIPT" } }); },
  getSaleDocument(saleId: number, documentType: DocumentType = "RECEIPT") {
    return invoke<BusinessDocument>("get_sale_document", { saleId, documentType });
  },
  generateDocument(saleId: number, documentType: DocumentType) {
    return invoke<BusinessDocument>("generate_document", { payload: { sale_id: saleId, document_type: documentType } });
  },
  generatePdf(documentId: string) { return invoke<DocumentPdf>("generate_document_pdf", { documentId }); },
  printDocument(documentId: string, copies = 1) {
    return invoke("print_document", { payload: { document_id: documentId, copies } });
  },
};
