import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

type Stats = {
  total: number;
  aiResolved: number;
  aiResolvedPercent: number;
  avgResolutionSeconds: number | null;
  ticketsPerDay: { date: string; count: number }[];
};

async function fetchStats(): Promise<Stats> {
  const res = await fetch("/api/stats", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

function formatDateLabel(date: string): string {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const chartConfig = {
  count: { label: "Tickets", color: "var(--chart-1)" },
};

export function HomePage() {
  const { data, isLoading } = useQuery({ queryKey: ["stats"], queryFn: fetchStats });

  return (
    <main className="p-8">
      <h2 className="text-xl font-semibold mb-1">Dashboard</h2>
      <p className="text-muted-foreground mb-6">Welcome to the helpdesk system.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Tickets" value={isLoading ? null : data!.total.toString()} />
        <StatCard title="Resolved by AI" value={isLoading ? null : data!.aiResolved.toString()} />
        <StatCard title="AI Resolution Rate" value={isLoading ? null : `${data!.aiResolvedPercent}%`} />
        <StatCard
          title="Avg Resolution Time"
          value={
            isLoading
              ? null
              : data!.avgResolutionSeconds != null
              ? formatDuration(data!.avgResolutionSeconds)
              : "—"
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Tickets per day (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ChartContainer config={chartConfig} className="h-48 w-full">
              <BarChart data={data!.ticketsPerDay} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={formatDateLabel}
                  interval={4}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                <ChartTooltip
                  content={<ChartTooltipContent labelFormatter={(_v, p) => formatDateLabel(p[0]?.payload?.date)} />}
                />
                <Bar dataKey="count" fill="var(--color-count)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function StatCard({ title, value }: { title: string; value: string | null }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {value === null ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className="text-3xl font-bold">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
