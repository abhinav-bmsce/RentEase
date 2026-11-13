import { writeFileSync } from 'node:fs';
import { buildBillReceiptPdf } from '../src/services/pdf-service';
import type { BillDoc, RoomDoc, PropertyDoc, UserDoc } from '../src/lib/types';
const bill={month:'2026-11',status:'unpaid',total:895000,paidAmount:0,lateFee:0,dueDate:{toDate:()=>new Date(2026,10,15)},items:[{type:'rent',label:'Monthly rent',amount:850000},{type:'electricity',label:'Electricity charges',amount:45000,prevReading:0,currReading:50,units:50,rate:900}]} as BillDoc;
for(const paid of [false,true]) {
 const doc=buildBillReceiptPdf({bill:{...bill,status:paid?'paid':'unpaid',paidAmount:paid?895000:0},tenant:{name:'Sample Tenant',phone:'Not provided'} as UserDoc,property:{name:'Sample Residence',address:'Example address'} as PropertyDoc,room:{name:'Room 02',floor:4} as unknown as RoomDoc});
 writeFileSync(`/tmp/rentease-invoice-${paid?'paid':'unpaid'}.pdf`,Buffer.from(doc.output('arraybuffer')));
}
