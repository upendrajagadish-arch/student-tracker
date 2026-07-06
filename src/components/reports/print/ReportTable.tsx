import type { ReportSection } from "@/types/reports";

export function ReportTable({ section }: { section: ReportSection }) {
  if (section.rows.length === 0) {
    return <p className="text-sm text-slate-400">No data for this section.</p>;
  }

  return (
    <div className="report-table-wrap overflow-hidden rounded-lg border border-slate-200">
      <table className="report-table w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {section.headers.map((h) => (
              <th
                key={h}
                className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {section.rows.map((row, i) => (
            <tr key={i} className="break-inside-avoid">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="whitespace-nowrap px-3 py-2 text-slate-800"
                >
                  {cell ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
