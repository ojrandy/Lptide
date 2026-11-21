import { formatCents } from "@/lib/money";

// Overview revenue chart: plain HTML bars rendered on the server (no chart library). One hue (brand navy), light grid,
// a hover tooltip per bar and a screen-reader table with the same numbers.

const short = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const compact = (cents: number) => "$" + new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(cents / 100);

/** A "nice" axis maximum (1, 2, 2.5 or 5 x 10^n) so the gridlines land on round numbers. */
function niceMax(v: number) {
  if (v <= 0) return 10000;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].find((m) => m * p >= v) ?? 10) * p;
}

export function RevenueChart({ days }: { days: { date: Date; cents: number; orders: number }[] }) {
  const max = niceMax(Math.max(...days.map((d) => d.cents)));
  const ticks = [max, max / 2, 0];
  return (
    <figure>
      <div className="flex gap-3">
        <div className="relative flex h-52 w-12 shrink-0 flex-col justify-between text-right text-[11px] text-neutral-500 tabular-nums" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {compact(t)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">
            <div className="border-t border-neutral-100" />
            <div className="border-t border-neutral-100" />
            <div className="border-t border-neutral-300" />
          </div>
          <div className="relative flex h-52 items-end gap-[3px]" role="img" aria-label={`Paid revenue per day, last ${days.length} days`}>
            {days.map((d, i) => {
              const h = (d.cents / max) * 100;
              return (
                <div key={i} className="group relative flex h-full flex-1 items-end">
                  <div
                    className={`w-full ${d.cents > 0 ? "bg-navy group-hover:bg-[#1d3a6e]" : "bg-neutral-200"}`}
                    style={{ height: d.cents > 0 ? `max(${h}%, 3px)` : "2px" }}
                  />
                  <div
                    className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden w-max rounded-sm bg-neutral-900 px-2 py-1 text-[11px] text-white group-hover:block ${
                      i < 4 ? "left-0" : i > days.length - 5 ? "right-0" : "left-1/2 -translate-x-1/2"
                    }`}
                  >
                    <p className="text-neutral-400">{short(d.date)}</p>
                    <p className="font-semibold tabular-nums">{formatCents(d.cents)}</p>
                    <p className="text-neutral-400">
                      {d.orders} order{d.orders === 1 ? "" : "s"} placed
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-neutral-500" aria-hidden="true">
            <span>{short(days[0].date)}</span>
            <span>{short(days[Math.floor(days.length / 2)].date)}</span>
            <span>Today</span>
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>Paid revenue per day</caption>
        <tbody>
          {days.map((d, i) => (
            <tr key={i}>
              <th scope="row">{short(d.date)}</th>
              <td>{formatCents(d.cents)}</td>
              <td>{d.orders} orders</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
