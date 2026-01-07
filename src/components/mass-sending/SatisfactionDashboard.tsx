import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, Area, AreaChart
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Star, Users, ThumbsUp, ThumbsDown, Meh } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SatisfactionResponse {
  id: string;
  response_value: string;
  response_score: number | null;
  responded_at: string;
  contact_name: string | null;
  contact_phone: string;
}

interface SatisfactionSurvey {
  id: string;
  name: string;
  options: { label: string; emoji: string; score: number }[];
  total_sent: number;
  total_responses: number;
}

interface SatisfactionDashboardProps {
  surveys: SatisfactionSurvey[];
  allResponses: SatisfactionResponse[];
}

const COLORS = {
  satisfied: "hsl(142, 76%, 36%)",
  neutral: "hsl(45, 93%, 47%)",
  dissatisfied: "hsl(0, 84%, 60%)",
};

export function SatisfactionDashboard({ surveys, allResponses }: SatisfactionDashboardProps) {
  const stats = useMemo(() => {
    const totalSent = surveys.reduce((acc, s) => acc + (s.total_sent || 0), 0);
    const totalResponses = allResponses.length;
    const responseRate = totalSent > 0 ? Math.round((totalResponses / totalSent) * 100) : 0;

    const scores = allResponses.filter(r => r.response_score !== null).map(r => r.response_score!);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const satisfied = allResponses.filter(r => (r.response_score || 0) >= 4).length;
    const neutral = allResponses.filter(r => r.response_score === 3).length;
    const dissatisfied = allResponses.filter(r => (r.response_score || 0) <= 2).length;

    // NPS calculation (promoters - detractors) / total * 100
    const promoters = allResponses.filter(r => (r.response_score || 0) >= 4).length;
    const detractors = allResponses.filter(r => (r.response_score || 0) <= 2).length;
    const nps = totalResponses > 0 ? Math.round(((promoters - detractors) / totalResponses) * 100) : 0;

    // Last 7 days comparison
    const last7DaysStart = startOfDay(subDays(new Date(), 7));
    const last7DaysEnd = endOfDay(new Date());
    const prev7DaysStart = startOfDay(subDays(new Date(), 14));
    const prev7DaysEnd = endOfDay(subDays(new Date(), 7));

    const last7DaysResponses = allResponses.filter(r => {
      const date = new Date(r.responded_at);
      return isWithinInterval(date, { start: last7DaysStart, end: last7DaysEnd });
    });

    const prev7DaysResponses = allResponses.filter(r => {
      const date = new Date(r.responded_at);
      return isWithinInterval(date, { start: prev7DaysStart, end: prev7DaysEnd });
    });

    const last7Avg = last7DaysResponses.length > 0 
      ? last7DaysResponses.filter(r => r.response_score).reduce((a, r) => a + (r.response_score || 0), 0) / last7DaysResponses.length 
      : 0;
    const prev7Avg = prev7DaysResponses.length > 0 
      ? prev7DaysResponses.filter(r => r.response_score).reduce((a, r) => a + (r.response_score || 0), 0) / prev7DaysResponses.length 
      : 0;

    const trend = last7Avg - prev7Avg;

    return {
      totalSent,
      totalResponses,
      responseRate,
      avgScore,
      satisfied,
      neutral,
      dissatisfied,
      nps,
      trend,
      satisfiedPercent: totalResponses > 0 ? Math.round((satisfied / totalResponses) * 100) : 0,
    };
  }, [surveys, allResponses]);

  const pieData = useMemo(() => [
    { name: "Satisfeitos", value: stats.satisfied, color: COLORS.satisfied },
    { name: "Neutros", value: stats.neutral, color: COLORS.neutral },
    { name: "Insatisfeitos", value: stats.dissatisfied, color: COLORS.dissatisfied },
  ].filter(d => d.value > 0), [stats]);

  const dailyData = useMemo(() => {
    const days: { date: string; satisfied: number; neutral: number; dissatisfied: number; total: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const dayResponses = allResponses.filter(r => {
        const rDate = new Date(r.responded_at);
        return isWithinInterval(rDate, { start: dayStart, end: dayEnd });
      });

      days.push({
        date: format(date, "EEE", { locale: ptBR }),
        satisfied: dayResponses.filter(r => (r.response_score || 0) >= 4).length,
        neutral: dayResponses.filter(r => r.response_score === 3).length,
        dissatisfied: dayResponses.filter(r => (r.response_score || 0) <= 2).length,
        total: dayResponses.length,
      });
    }
    
    return days;
  }, [allResponses]);

  const scoreDistribution = useMemo(() => {
    const distribution: { score: string; count: number }[] = [];
    
    for (let i = 1; i <= 5; i++) {
      distribution.push({
        score: `${i}★`,
        count: allResponses.filter(r => r.response_score === i).length,
      });
    }
    
    return distribution;
  }, [allResponses]);

  if (allResponses.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-1">Nenhuma resposta ainda</h3>
        <p className="text-sm text-muted-foreground">
          Os gráficos aparecerão quando você receber respostas
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.avgScore.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Nota Média</p>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs">
            {stats.trend > 0 ? (
              <>
                <TrendingUp className="w-3 h-3 text-green-600" />
                <span className="text-green-600">+{stats.trend.toFixed(1)} vs semana anterior</span>
              </>
            ) : stats.trend < 0 ? (
              <>
                <TrendingDown className="w-3 h-3 text-red-600" />
                <span className="text-red-600">{stats.trend.toFixed(1)} vs semana anterior</span>
              </>
            ) : (
              <>
                <Minus className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">Sem variação</span>
              </>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <ThumbsUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.satisfiedPercent}%</p>
              <p className="text-xs text-muted-foreground">Satisfeitos</p>
            </div>
          </div>
          <Progress value={stats.satisfiedPercent} className="mt-2 h-1.5" />
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalResponses}</p>
              <p className="text-xs text-muted-foreground">Respostas</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.responseRate}% taxa de resposta
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              stats.nps >= 50 ? "bg-green-500/10" : stats.nps >= 0 ? "bg-yellow-500/10" : "bg-red-500/10"
            }`}>
              <span className={`text-lg font-bold ${
                stats.nps >= 50 ? "text-green-600" : stats.nps >= 0 ? "text-yellow-600" : "text-red-600"
              }`}>
                NPS
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.nps}</p>
              <p className="text-xs text-muted-foreground">
                {stats.nps >= 50 ? "Excelente" : stats.nps >= 0 ? "Bom" : "Atenção"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card className="p-4">
          <h4 className="font-medium mb-4">Distribuição de Satisfação</h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            <div className="flex items-center gap-1 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.satisfied }} />
              <span>{stats.satisfied} Satisfeitos</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.neutral }} />
              <span>{stats.neutral} Neutros</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.dissatisfied }} />
              <span>{stats.dissatisfied} Insatisfeitos</span>
            </div>
          </div>
        </Card>

        {/* Score Distribution Bar Chart */}
        <Card className="p-4">
          <h4 className="font-medium mb-4">Distribuição por Nota</h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="score" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }} 
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  name="Respostas"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Daily Trend Chart */}
      <Card className="p-4">
        <h4 className="font-medium mb-4">Evolução dos Últimos 7 Dias</h4>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }} 
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="satisfied" 
                name="Satisfeitos"
                stackId="1"
                stroke={COLORS.satisfied} 
                fill={COLORS.satisfied}
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="neutral" 
                name="Neutros"
                stackId="1"
                stroke={COLORS.neutral} 
                fill={COLORS.neutral}
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="dissatisfied" 
                name="Insatisfeitos"
                stackId="1"
                stroke={COLORS.dissatisfied} 
                fill={COLORS.dissatisfied}
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Survey Performance */}
      <Card className="p-4">
        <h4 className="font-medium mb-4">Desempenho por Pesquisa</h4>
        <div className="space-y-3">
          {surveys.map((survey) => {
            const surveyResponses = allResponses.filter(r => 
              survey.options.some(o => o.label === r.response_value)
            );
            const surveyAvg = surveyResponses.length > 0 
              ? surveyResponses.filter(r => r.response_score).reduce((a, r) => a + (r.response_score || 0), 0) / surveyResponses.length 
              : 0;
            const responseRate = survey.total_sent > 0 
              ? Math.round((survey.total_responses / survey.total_sent) * 100) 
              : 0;

            return (
              <div key={survey.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{survey.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {survey.total_responses} respostas de {survey.total_sent} enviados
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{responseRate}% taxa</Badge>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{surveyAvg.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
