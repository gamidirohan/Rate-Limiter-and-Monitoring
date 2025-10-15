'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts';
import { useDashboard } from '@/lib/api/hooks';
import LoadingSpinner from '@/components/LoadingSpinner';
import { formatNumber } from '@/lib/utils';

const chartConfig = {
  rps: {
    label: 'Requests Per Second',
    color: 'hsl(var(--chart-1))',
  },
  latency: {
    label: 'Latency',
    color: 'hsl(var(--chart-2))',
  },
};

export default function Dashboard() {
  // Fetch real data from backend
  const { data, isLoading, error } = useDashboard();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-24 p-6">
        <LoadingSpinner fullScreen />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pt-24 p-6">
        <Card className="bg-card/50 backdrop-blur border-red-500">
          <CardHeader>
            <CardTitle className="text-red-500">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error.message}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Make sure the backend server is running on port 3000.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { metrics, performance, latency, activeKeys, recentEvents, topOffenders } = data;
  return (
    <div className="min-h-screen bg-background pt-24 p-6">
      {/* Metrics Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatNumber(metrics.totalRequests)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Blocked Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatNumber(metrics.blockedRequests)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.averageLatencyMs.toFixed(1)}ms</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Max Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.maxLatencyMs.toFixed(0)}ms</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Performance Charts with Tabs */}
        <Card className="col-span-2 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="rps" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="rps">RPS</TabsTrigger>
                <TabsTrigger value="latency">Latency</TabsTrigger>
              </TabsList>
              
              <TabsContent value="rps" className="mt-4">
                  {/* Removed Current RPS display as requested */}
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <LineChart data={performance}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="rps"
                      stroke="var(--color-rps)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </TabsContent>
              
              <TabsContent value="latency" className="mt-4">
                  {/* Removed Current Latency display as requested */}
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <LineChart data={latency}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="latency"
                      stroke="var(--color-latency)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Active Keys */}
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Active Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeKeys.length > 0 ? (
                activeKeys.map((key, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{key.id}</span>
                      <span className="font-medium">{key.usagePercent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${key.usagePercent}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No active keys</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Events */}
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-left font-medium text-muted-foreground">
                      TIMESTAMP
                    </th>
                    <th className="pb-3 text-left font-medium text-muted-foreground">
                      TYPE
                    </th>
                    <th className="pb-3 text-left font-medium text-muted-foreground">
                      KEY
                    </th>
                    <th className="pb-3 text-left font-medium text-muted-foreground">
                      DETAILS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.length > 0 ? (
                    recentEvents.map((event, index) => (
                      <tr key={index} className="border-b border-border/50">
                        <td className="py-3 text-muted-foreground">{event.timestamp}</td>
                        <td className="py-3">{event.type}</td>
                        <td className="py-3">{event.key}</td>
                        <td className="py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              event.status === 'allowed'
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-red-500/10 text-red-500'
                            }`}
                          >
                            {event.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-sm text-muted-foreground">
                        No recent events
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Top Offenders */}
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Top Offenders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-left font-medium text-muted-foreground">
                      KEY
                    </th>
                    <th className="pb-3 text-right font-medium text-muted-foreground">
                      BLOCKED REQUESTS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topOffenders.length > 0 ? (
                    topOffenders.map((offender, index) => (
                      <tr key={index} className="border-b border-border/50">
                        <td className="py-3">{offender.key}</td>
                        <td className="py-3 text-right font-medium">{offender.blockedRequests}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" className="py-6 text-center text-sm text-muted-foreground">
                        No blocked requests
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
