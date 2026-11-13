import { describe, expect, it } from "vitest";
import type { BillDoc } from "@/lib/types";
import { buildBillReceiptPdf, invoiceStatus, pdfMoney } from "./pdf-service";
const bill = {month:"2026-11",status:"unpaid",total:895000,paidAmount:0,lateFee:0,dueDate:{toDate:()=>new Date(2026,10,15)},items:[{type:"rent",label:"Monthly rent",amount:850000},{type:"electricity",label:"Electricity charges",amount:45000,prevReading:0,currReading:50,units:50,rate:900}]} as BillDoc;
describe("invoice PDF",()=>{
  it("uses font-safe currency and includes unpaid totals",()=>{
    expect(pdfMoney(895000)).toBe("INR 8,950.00");
    const pdf=buildBillReceiptPdf({bill}).output();
    expect(pdf).toContain("PAYMENT STATUS: UNPAID");
    expect(pdf).toContain("INR 8,950.00");
    expect(pdf).not.toContain("₹");
  });
  it("labels verified payments as paid and submitted proofs as unpaid",()=>{
    expect(invoiceStatus({...bill,status:"submitted"})).toBe("UNPAID - AWAITING VERIFICATION");
    const pdf=buildBillReceiptPdf({bill:{...bill,status:"paid",paidAmount:895000}}).output();
    expect(pdf).toContain("PAYMENT STATUS: PAID");
    expect(pdf).toContain("PAYMENT RECEIPT");
    expect(pdf).toContain("INR 0.00");
  });
  it("distinguishes partial, overdue and void invoices",()=>{
    expect(invoiceStatus({...bill,paidAmount:200000})).toBe("PARTIALLY PAID");
    expect(invoiceStatus({...bill,status:"overdue"})).toBe("UNPAID - OVERDUE");
    expect(invoiceStatus({...bill,status:"void"})).toBe("VOID");
  });
  it("paginates long invoices without losing the final amount",()=>{
    const doc=buildBillReceiptPdf({bill:{...bill,items:Array.from({length:60},(_,i)=>({type:"other",label:`Item ${i}: `+"Detailed maintenance description ".repeat(8),amount:1000}))}});
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    expect(doc.output()).toContain("Balance due");
  });
});
