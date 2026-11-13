import { formatDate, formatMonth } from "@/lib/date";
import { roomLabel } from "@/lib/rooms";
import type { BillDoc, PropertyDoc, RoomDoc, SettingsDoc, UserDoc } from "@/lib/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type InvoiceInput = { bill: BillDoc; room?: RoomDoc; property?: PropertyDoc; tenant?: UserDoc; settings?: SettingsDoc };
// PDF's built-in Helvetica does not include the rupee glyph. Use its ISO code.
export const pdfMoney = (paise: number) => `INR ${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export function invoiceStatus(bill: BillDoc) {
  if (bill.status === "void") return "VOID";
  if (bill.status === "paid") return "PAID";
  if (bill.status === "submitted") return "UNPAID - AWAITING VERIFICATION";
  if (bill.paidAmount > 0) return "PARTIALLY PAID";
  return bill.status === "overdue" ? "UNPAID - OVERDUE" : "UNPAID";
}

export function buildBillReceiptPdf({ bill, room, property, tenant, settings }: InvoiceInput) {
  const doc = new jsPDF();
  const left = 14, right = 196, width = right - left;
  const status = invoiceStatus(bill);
  const paid = bill.status === "paid";
  doc.setFont("helvetica", "bold");
  doc.setTextColor(21, 63, 53);
  doc.setFontSize(22);
  doc.text("RentEase", left, 22);
  doc.setFontSize(12);
  doc.text(paid ? "PAYMENT RECEIPT" : "RENT INVOICE", right, 21, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.setFontSize(10);
  doc.text(formatMonth(bill.month), right, 28, { align: "right" });

  autoTable(doc, {
    startY: 34, margin: {left, right:14}, tableWidth: width, theme: "plain",
    styles: { font: "helvetica", fontSize: 10, cellPadding: 2, overflow: "linebreak", textColor: 65 },
    columnStyles: {0:{cellWidth:103},1:{cellWidth:79,halign:"right"}},
    body: [[[
      settings?.businessName || "RentEase Property Management",
      settings?.businessPhone ? `Phone: ${settings.businessPhone}` : "",
      settings?.upiId ? `UPI: ${settings.upiId}` : "",
    ].filter(Boolean).join("\n"), `Due date: ${formatDate(bill.dueDate?.toDate?.() ?? new Date(String(bill.dueDate)))}`]],
  });
  const tableEnd = () => (doc as jsPDF & {lastAutoTable:{finalY:number}}).lastAutoTable.finalY;
  let y = tableEnd() + 6;
  doc.setFillColor(paid ? 225 : 255, paid ? 241 : 244, paid ? 231 : 220);
  doc.roundedRect(left, y, width, 12, 2, 2, "F");
  doc.setTextColor(paid ? 22 : 130, paid ? 101 : 72, paid ? 52 : 15);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text(`PAYMENT STATUS: ${status}`, left + 4, y + 8);
  autoTable(doc, {
    startY:y+18, margin:{left,right:14}, tableWidth:width, theme:"plain",
    styles:{font:"helvetica",fontSize:10,cellPadding:3,overflow:"linebreak"},
    columnStyles:{0:{cellWidth:91},1:{cellWidth:91}},
    head:[["BILLED TO", "PROPERTY & ROOM"]], headStyles:{textColor:[21,63,53],fontStyle:"bold"},
    body:[[`${tenant?.name || "Tenant"}\nPhone: ${tenant?.phone || "Not provided"}`, `${property?.name || "Property"}\n${room ? roomLabel(room) : "Room"}\n${property?.address || ""}`]],
  });
  const rows = (bill.items ?? []).map((item,index) => [String(index+1), item.type === "electricity" && item.units !== undefined
    ? `${item.label}\nMeter: ${item.prevReading ?? 0} to ${item.currReading ?? 0} | ${item.units} units at ${pdfMoney(item.rate || 0)}/unit`
    : item.label, pdfMoney(item.amount)]);
  if (bill.lateFee > 0) rows.push([String(rows.length+1),"Late fee",pdfMoney(bill.lateFee)]);
  autoTable(doc, {
    startY:tableEnd()+8, margin:{left,right:14,top:18,bottom:22}, tableWidth:width,
    head:[["#","DESCRIPTION","AMOUNT (INR)"]],body:rows,theme:"striped",
    styles:{font:"helvetica",fontSize:10,cellPadding:4,overflow:"linebreak"},
    headStyles:{fillColor:[21,63,53],textColor:255,fontStyle:"bold"},
    columnStyles:{0:{cellWidth:12,halign:"center"},1:{cellWidth:123},2:{cellWidth:47,halign:"right"}},
    rowPageBreak:"avoid",
  });
  y=tableEnd()+8;
  if(y+36>270){doc.addPage();y=20;}
  autoTable(doc, {
    startY:y, margin:{left:105,right:14,bottom:22},tableWidth:91,theme:"plain",
    styles:{font:"helvetica",fontSize:11,cellPadding:3,overflow:"linebreak"},
    columnStyles:{0:{cellWidth:41},1:{cellWidth:50,halign:"right",fontStyle:"bold"}},
    body:[["Invoice total",pdfMoney(bill.total)],["Amount paid",pdfMoney(bill.paidAmount || 0)],["Balance due",pdfMoney(Math.max(0,bill.total-(bill.paidAmount || 0)))]],
  });
  const note = bill.status === "void" ? "This invoice is void. It is not a payment request." : paid
    ? "Payment approved. Thank you for your payment."
    : bill.status === "submitted" ? "Payment proof received. This invoice remains unpaid until the owner approves the payment."
    : "This invoice is not proof of payment. Status updates after payment approval.";
  autoTable(doc,{startY:tableEnd()+8,margin:{left,right:14,bottom:22},theme:"plain",styles:{fontSize:9,textColor:90,cellPadding:2,overflow:"linebreak"},body:[[note],...(bill.notes ? [[`Notes: ${bill.notes}`]] : [])]});
  for(let page=1;page<=doc.getNumberOfPages();page++){
    doc.setPage(page);doc.setDrawColor(225);doc.line(left,278,right,278);
    doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(110);
    doc.text(`Generated by RentEase | ${formatDate(new Date())}`,left,284);
    doc.text(`${page} / ${doc.getNumberOfPages()}`,right,284,{align:"right"});
  }
  return doc;
}

export function generateBillReceiptPdf(input: InvoiceInput) {
  const kind = input.bill.status === "paid" ? "Receipt" : "Invoice";
  const roomName = (input.room?.name || "Room").replace(/[^a-zA-Z0-9_-]/g,"_");
  buildBillReceiptPdf(input).save(`RentEase_${kind}_${input.bill.month}_${roomName}.pdf`);
}
