'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface Slice {
  name: string;
  value: number;
  color: string;
}

export function ChannelPie({ data, height = 240 }: { data: Slice[]; height?: number }) {
  return (
    <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: number) => `${v}%`}
          />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} stroke="hsl(var(--background))" strokeWidth={2} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <ul className="space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: d.color }}
              />
              {d.name}
            </span>
            <span className="font-medium">{d.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
