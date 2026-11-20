import Link from "next/link";
import { formatCents } from "@/lib/money";
import { dateTime } from "./format";
import { StatusBadge, Table, Td, Th } from "./ui";

type Row = {
  id: number;
  number: string;
  createdAt: Date;
  name: string;
  email: string;
  country: string;
  warehouseCode: string;
  items: number;
  totalCents: number;
  status: string;
};

export function OrdersTable({ rows }: { rows: Row[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Order</Th>
          <Th>Date</Th>
          <Th>Customer</Th>
          <Th>Country</Th>
          <Th>Warehouse</Th>
          <Th className="text-right">Items</Th>
          <Th className="text-right">Total</Th>
          <Th>Status</Th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <Td colSpan={8} className="py-8 text-center text-slate-500">
              No orders.
            </Td>
          </tr>
        )}
        {rows.map((o) => (
          <tr key={o.id} className="hover:bg-slate-50">
            <Td>
              <Link href={`/admin/orders/${o.id}/`} className="font-medium text-navy hover:underline">
                {o.number}
              </Link>
            </Td>
            <Td className="whitespace-nowrap text-slate-600">{dateTime(o.createdAt)}</Td>
            <Td>
              <div className="max-w-56 truncate">{o.name}</div>
              <div className="max-w-56 truncate text-xs text-slate-500">{o.email}</div>
            </Td>
            <Td>{o.country}</Td>
            <Td>{o.warehouseCode}</Td>
            <Td className="text-right">{o.items}</Td>
            <Td className="text-right font-medium whitespace-nowrap">{formatCents(o.totalCents)}</Td>
            <Td>
              <StatusBadge status={o.status} />
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
