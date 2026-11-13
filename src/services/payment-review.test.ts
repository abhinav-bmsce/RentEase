import { beforeEach, describe, expect, it, vi } from 'vitest';
import { approvePayment, rejectPayment } from './payment-service';
const mock = vi.hoisted(() => ({ records: new Map<string, any>(), writes: [] as any[], tx: vi.fn() }));
vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('browser-image-compression', () => ({default: vi.fn()}));
vi.mock('firebase/firestore', () => ({
  collection: (_: unknown, path: string) => path,
  doc: (...args: any[]) => args.length === 1 ? `${args[0]}/notice` : `${args[1]}/${args[2]}`,
  runTransaction: mock.tx, getDocs: vi.fn(), query: vi.fn(), where: vi.fn(),
  serverTimestamp: () => 'now', Timestamp: {now: () => 'now'},
}));
beforeEach(() => {
  mock.records.clear(); mock.writes = [];
  mock.records.set('payments/p', {billId:'b',tenantUid:'t',amount:400,status:'pending'});
  mock.records.set('bills/b', {tenantUid:'t',total:1000,paidAmount:200,status:'submitted',items:[],month:'2026-11',dueDate:{toDate:()=>new Date('2099-01-01')}});
  mock.tx.mockImplementation(async (_db, callback) => {
    const staged: any[] = [];
    await callback({
      get: async (ref: string) => ({exists:()=>mock.records.has(ref),data:()=>mock.records.get(ref)}),
      update: (ref: string, data: any) => staged.push([ref,data]),
      set: (ref: string, data: any) => staged.push([ref,data]),
    });
    for (const [ref,data] of staged) mock.records.set(ref,{...mock.records.get(ref),...data});
    mock.writes.push(...staged);
  });
});
const input = {paymentId:'p',billId:'b',reviewedBy:'owner'};
describe('atomic payment review', () => {
  it('updates partial balance and notification together',async()=>{
    await approvePayment(input);
    expect(mock.records.get('bills/b')).toMatchObject({paidAmount:600,status:'unpaid'});
    expect(mock.records.get('payments/p').status).toBe('approved');
    expect(mock.records.get('notifications/notice').type).toBe('payment_approved');
  });
  it('rejects repeated approvals without changing the balance',async()=>{
    await approvePayment(input);
    await expect(approvePayment(input)).rejects.toThrow('already been reviewed');
    expect(mock.records.get('bills/b').paidAmount).toBe(600);
    expect(mock.writes).toHaveLength(3);
  });
  it('rejects mismatched bills and overpayments before writing',async()=>{
    mock.records.get('payments/p').tenantUid='another';
    await expect(approvePayment(input)).rejects.toThrow('does not match');
    mock.records.get('payments/p').tenantUid='t';
    mock.records.get('payments/p').amount=900;
    await expect(approvePayment(input)).rejects.toThrow('exceeds');
    expect(mock.writes).toHaveLength(0);
  });
  it('keeps prior payments when rejecting and prevents a second review',async()=>{
    await rejectPayment({...input,reason:'Bank transfer not received'});
    expect(mock.records.get('bills/b')).toMatchObject({paidAmount:200,status:'unpaid'});
    await expect(approvePayment(input)).rejects.toThrow('already been reviewed');
  });
});
