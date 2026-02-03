import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, TrendingUp, Calendar, Zap, CheckCircle2, BarChart3, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TimeSlot {
  hour: number;
  day: string;
  score: number;
  successRate: number;
  totalSent: number;
  campaigns: number;
}

interface DayPerformance {
  day: string;
  dayName: string;
  avgSuccessRate: number;
  totalSent: number;
  totalCampaigns: number;
}

export const OptimalTimeSuggestions = () => {
  const [bestTimeSlots, setBestTimeSlots] = useState<TimeSlot[]>([]);
  const [dayPerformance, setDayPerformance] = useState<DayPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [totalCampaignsAnalyzed, setTotalCampaignsAnalyzed] = useState(0);
  const [hasRealData, setHasRealData] = useState(false);

  useEffect(() => {
    analyzeHistoricalData();
  }, []);

  const analyzeHistoricalData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch completed campaigns for analysis
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('*')
        .in('status', ['completed', 'sent', 'failed'])
        .order('created_at', { ascending: false })
        .limit(200);

      if (campaigns && campaigns.length > 0) {
        setHasRealData(true);
        setTotalCampaignsAnalyzed(campaigns.length);
        
        // Analyze time patterns from real data
        const timeAnalysis = analyzeTimePatterns(campaigns);
        setBestTimeSlots(timeAnalysis.bestSlots);
        setDayPerformance(timeAnalysis.dayPerformance);
      } else {
        setHasRealData(false);
        setTotalCampaignsAnalyzed(0);
        // Show empty state instead of sample data
        setBestTimeSlots([]);
        setDayPerformance([]);
      }
    } catch (error) {
      console.error('Error analyzing historical data:', error);
      setHasRealData(false);
      setBestTimeSlots([]);
      setDayPerformance([]);
    }
    
    setIsLoading(false);
  };

  const analyzeTimePatterns = (campaigns: any[]) => {
    const hourStats: Record<number, { sent: number; total: number; count: number }> = {};
    const dayStats: Record<string, { sent: number; total: number; count: number }> = {};
    const dayNames: Record<string, string> = {
      '0': 'dom',
      '1': 'seg',
      '2': 'ter',
      '3': 'qua',
      '4': 'qui',
      '5': 'sex',
      '6': 'sáb'
    };
    
    campaigns.forEach(campaign => {
      const date = new Date(campaign.scheduled_at || campaign.created_at);
      const hour = date.getHours();
      const dayNum = date.getDay().toString();
      const day = dayNames[dayNum];
      
      const sentCount = campaign.sent_count || 0;
      const totalCount = campaign.total_contacts || 1;
      
      if (!hourStats[hour]) {
        hourStats[hour] = { sent: 0, total: 0, count: 0 };
      }
      hourStats[hour].sent += sentCount;
      hourStats[hour].total += totalCount;
      hourStats[hour].count++;
      
      if (!dayStats[day]) {
        dayStats[day] = { sent: 0, total: 0, count: 0 };
      }
      dayStats[day].sent += sentCount;
      dayStats[day].total += totalCount;
      dayStats[day].count++;
    });

    // Calculate best time slots based on actual success rate
    const bestSlots: TimeSlot[] = Object.entries(hourStats)
      .map(([hour, stats]) => {
        const successRate = stats.total > 0 ? (stats.sent / stats.total) * 100 : 0;
        return {
          hour: parseInt(hour),
          day: 'Todos',
          score: successRate,
          successRate: successRate,
          totalSent: stats.sent,
          campaigns: stats.count
        };
      })
      .filter(slot => slot.campaigns >= 1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Calculate day performance from real data
    const dayOrder = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
    const dayPerformance: DayPerformance[] = dayOrder
      .filter(day => dayStats[day])
      .map(day => {
        const stats = dayStats[day];
        const successRate = stats.total > 0 ? (stats.sent / stats.total) * 100 : 0;
        return {
          day,
          dayName: getDayFullName(day),
          avgSuccessRate: successRate,
          totalSent: stats.sent,
          totalCampaigns: stats.count
        };
      })
      .sort((a, b) => b.avgSuccessRate - a.avgSuccessRate);

    return { bestSlots, dayPerformance };
  };

  const getDayFullName = (day: string): string => {
    const days: Record<string, string> = {
      'seg': 'Segunda-feira',
      'ter': 'Terça-feira',
      'qua': 'Quarta-feira',
      'qui': 'Quinta-feira',
      'sex': 'Sexta-feira',
      'sáb': 'Sábado',
      'dom': 'Domingo',
    };
    return days[day.toLowerCase()] || day;
  };

  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const getScoreBadge = (score: number): string => {
    if (score >= 85) return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (score >= 70) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/3" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state when no data
  if (!hasRealData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sem dados suficientes</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Envie algumas campanhas para que possamos analisar os melhores horários 
                de envio com base no seu histórico real de entregas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Best Time Slots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Melhores Horários para Envio
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Baseado na análise de {totalCampaignsAnalyzed} campanhas anteriores
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bestTimeSlots.map((slot, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  selectedSlot === slot 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedSlot(slot)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {index === 0 && <span className="text-xl">🥇</span>}
                      {index === 1 && <span className="text-xl">🥈</span>}
                      {index === 2 && <span className="text-xl">🥉</span>}
                      {index > 2 && <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-lg">{formatHour(slot.hour)}</span>
                        <Badge variant="outline">{slot.day}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>✅ Taxa de sucesso: {slot.successRate.toFixed(1)}%</span>
                        <span>📤 {slot.totalSent} enviados</span>
                        <span>📊 {slot.campaigns} campanhas</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getScoreBadge(slot.score)}>
                      {slot.score.toFixed(0)}%
                    </Badge>
                    {selectedSlot === slot && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
                {selectedSlot === slot && (
                  <div className="mt-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Taxa de Entrega</p>
                      <Progress value={slot.successRate} className="h-2" />
                      <p className="text-sm font-medium mt-1">{slot.successRate.toFixed(1)}%</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Day Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Desempenho por Dia da Semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dayPerformance.length > 0 ? (
            <div className="space-y-4">
              {dayPerformance.map((day, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-32 font-medium">{day.dayName}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Progress value={day.avgSuccessRate} className="flex-1 h-3" />
                      <span className="text-sm font-medium w-16 text-right">
                        {day.avgSuccessRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {day.totalCampaigns} camp.
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Nenhum dado disponível
            </p>
          )}
        </CardContent>
      </Card>

      {/* Hourly Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Mapa de Calor - Sucesso por Hora
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-1">
            {Array.from({ length: 24 }, (_, hour) => {
              const slot = bestTimeSlots.find(s => s.hour === hour);
              const intensity = slot ? slot.score / 100 : 0.1;
              return (
                <div
                  key={hour}
                  className="aspect-square rounded flex items-center justify-center text-xs font-medium transition-all hover:scale-110 cursor-pointer"
                  style={{
                    backgroundColor: `hsl(var(--primary) / ${intensity})`,
                    color: intensity > 0.5 ? 'white' : 'inherit'
                  }}
                  title={slot ? `${formatHour(hour)} - Taxa: ${slot.score.toFixed(0)}%` : `${formatHour(hour)} - Sem dados`}
                >
                  {hour}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary/10" />
              <span>Sem dados</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary/50" />
              <span>Médio</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary" />
              <span>Alto</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {bestTimeSlots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recomendações Baseadas em Dados Reais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg border bg-green-500/5 border-green-500/20">
                <h4 className="font-semibold text-green-600 mb-2">✅ Melhor Momento</h4>
                <p className="text-sm text-muted-foreground">
                  {bestTimeSlots[0] && (
                    <>
                      Agende suas campanhas para <strong>{formatHour(bestTimeSlots[0].hour)}</strong> para maximizar as entregas. 
                      Taxa de sucesso média: <strong>{bestTimeSlots[0].successRate.toFixed(1)}%</strong>
                    </>
                  )}
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/20">
                <h4 className="font-semibold text-blue-600 mb-2">📊 Análise</h4>
                <p className="text-sm text-muted-foreground">
                  Analisamos {totalCampaignsAnalyzed} campanhas para gerar estas recomendações. 
                  Quanto mais campanhas você enviar, mais precisas serão as sugestões.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};