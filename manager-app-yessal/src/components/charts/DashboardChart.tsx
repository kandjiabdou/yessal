import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export interface ChartDataPoint {
  date: string;
  dateLabel: string;
  revenue: number;
  orders: number;
  newClients: number;
}

export interface ChartData {
  chartData: ChartDataPoint[];
  siteName: string;
  periodInfo: {
    startDate: string;
    endDate: string;
    offset: number;
    period: string;
    isCurrentPeriod: boolean;
  };
}

interface DashboardChartProps {
  data: ChartData | null;
  loading: boolean;
  error: string | null;
  period: 'week' | 'month';
}

const DashboardChart: React.FC<DashboardChartProps> = ({ 
  data, 
  loading, 
  error, 
  period 
}) => {
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      const data = payload[0]?.payload;
      if (!data) return null;

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{data.dateLabel}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-sm">Revenus: {data.revenue?.toLocaleString()} FCFA</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-sm">Commandes: {data.orders}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span className="text-sm">Nouveaux clients: {data.newClients}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Format Y-axis values
  const formatYAxisRevenue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  const formatYAxisCount = (value: number) => {
    return Math.round(value).toString();
  };

  if (loading) {
    return (
      <Card className="card-shadow w-full">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-center h-48 sm:h-64">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
            <span className="ml-2 text-sm sm:text-base">Chargement du graphique...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="card-shadow w-full">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-center h-48 sm:h-64">
            <div className="text-center">
              <p className="text-red-500 mb-2 text-sm sm:text-base">Erreur de chargement du graphique</p>
              <p className="text-xs sm:text-sm text-gray-600">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.chartData || data.chartData.length === 0) {
    return (
      <Card className="card-shadow w-full">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-center h-48 sm:h-64">
            <p className="text-gray-500 text-sm sm:text-base">Aucune donnée disponible pour le graphique</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartTitle = period === 'week' 
    ? 'Évolution journalière de la semaine' 
    : 'Évolution hebdomadaire du mois';

  return (
    <Card className="card-shadow w-full">
      <CardHeader className="pb-2 sm:pb-6">
        <CardTitle className="text-base sm:text-lg font-semibold">{chartTitle}</CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {period === 'week' ? 'Données par jour' : 'Données par semaine'} - {data.siteName}
        </p>
      </CardHeader>
      <CardContent className="p-2 sm:p-6">
        <div className="h-80 sm:h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data.chartData}
              margin={{
                top: 20,
                right: period === 'week' ? 10 : 30,
                bottom: period === 'week' ? 60 : 20,
                left: 10,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="dateLabel" 
                stroke="#666"
                fontSize={10}
                angle={period === 'week' ? -45 : 0}
                textAnchor={period === 'week' ? 'end' : 'middle'}
                height={period === 'week' ? 60 : 50}
                interval={0}
              />
              <YAxis 
                yAxisId="left"
                stroke="#666"
                fontSize={10}
                tickFormatter={formatYAxisRevenue}
                width={40}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                stroke="#666"
                fontSize={10}
                tickFormatter={formatYAxisCount}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ 
                  paddingTop: '10px',
                  fontSize: '12px'
                }}
                iconType="rect"
                layout="horizontal"
                align="center"
              />
              
              {/* Revenue as line chart on left axis */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                name="Revenus (FCFA)"
              />
              
              {/* Orders as bars on right axis */}
              <Bar
                yAxisId="right"
                dataKey="orders"
                fill="#10b981"
                name="Commandes"
                opacity={0.8}
              />
              
              {/* New clients as bars on right axis */}
              <Bar
                yAxisId="right"
                dataKey="newClients"
                fill="#8b5cf6"
                name="Nouveaux clients"
                opacity={0.8}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Chart summary */}
        <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="text-center">
              <p className="font-medium text-blue-600 text-sm sm:text-base">
                {data.chartData.reduce((sum, item) => sum + item.revenue, 0).toLocaleString()} FCFA
              </p>
              <p className="text-gray-600">Revenus totaux</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-green-600 text-sm sm:text-base">
                {data.chartData.reduce((sum, item) => sum + item.orders, 0)}
              </p>
              <p className="text-gray-600">Commandes totales</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-purple-600 text-sm sm:text-base">
                {data.chartData.reduce((sum, item) => sum + item.newClients, 0)}
              </p>
              <p className="text-gray-600">Nouveaux clients</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardChart;