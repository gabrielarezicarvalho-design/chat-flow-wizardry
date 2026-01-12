import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, Repeat, Plus, Trash2, Play, Pause, Edit } from "lucide-react";
import { format, addDays, addWeeks, addMonths, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ScheduledCampaign {
  id: string;
  name: string;
  scheduledDate: Date;
  time: string;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  status: "scheduled" | "paused";
}

interface CampaignSchedulerProps {
  campaignName: string;
  onSchedule: (date: Date, recurrence: string) => void;
}

export const CampaignScheduler = ({ campaignName, onSchedule }: CampaignSchedulerProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [recurrence, setRecurrence] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const [isRecurring, setIsRecurring] = useState(false);
  const [scheduledCampaigns, setScheduledCampaigns] = useState<ScheduledCampaign[]>([]);

  const timeSlots = [
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
  ];

  const handleSchedule = () => {
    if (!selectedDate) {
      toast.error("Selecione uma data");
      return;
    }

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const scheduledDateTime = setMinutes(setHours(selectedDate, hours), minutes);

    if (scheduledDateTime <= new Date()) {
      toast.error("A data/hora deve ser no futuro");
      return;
    }

    const newCampaign: ScheduledCampaign = {
      id: Date.now().toString(),
      name: campaignName || "Nova Campanha",
      scheduledDate: scheduledDateTime,
      time: selectedTime,
      recurrence: isRecurring ? recurrence : "none",
      status: "scheduled",
    };

    setScheduledCampaigns([...scheduledCampaigns, newCampaign]);
    onSchedule(scheduledDateTime, isRecurring ? recurrence : "none");
    toast.success(`Campanha agendada para ${format(scheduledDateTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`);
  };

  const toggleCampaignStatus = (id: string) => {
    setScheduledCampaigns(
      scheduledCampaigns.map((c) =>
        c.id === id
          ? { ...c, status: c.status === "scheduled" ? "paused" : "scheduled" }
          : c
      )
    );
  };

  const deleteCampaign = (id: string) => {
    setScheduledCampaigns(scheduledCampaigns.filter((c) => c.id !== id));
    toast.success("Agendamento removido");
  };

  const getNextOccurrences = (date: Date, recurrence: string, count: number = 3): Date[] => {
    const occurrences: Date[] = [date];
    let current = date;

    for (let i = 1; i < count; i++) {
      switch (recurrence) {
        case "daily":
          current = addDays(current, 1);
          break;
        case "weekly":
          current = addWeeks(current, 1);
          break;
        case "monthly":
          current = addMonths(current, 1);
          break;
        default:
          return occurrences;
      }
      occurrences.push(current);
    }

    return occurrences;
  };

  const recurrenceLabels: Record<string, string> = {
    none: "Sem recorrência",
    daily: "Diariamente",
    weekly: "Semanalmente",
    monthly: "Mensalmente",
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          Agendar Campanha
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar */}
          <div>
            <Label className="mb-2 block">Selecione a Data</Label>
            <div className="border rounded-lg p-1">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptBR}
                disabled={(date) => date < new Date()}
                className={cn("p-3 pointer-events-auto")}
              />
            </div>
          </div>

          {/* Time and Recurrence */}
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Horário</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <Clock className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <Repeat className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Campanha Recorrente</p>
                  <p className="text-sm text-muted-foreground">Repetir automaticamente</p>
                </div>
              </div>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>

            {isRecurring && (
              <div>
                <Label className="mb-2 block">Frequência</Label>
                <Select
                  value={recurrence}
                  onValueChange={(v) => setRecurrence(v as typeof recurrence)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diariamente</SelectItem>
                    <SelectItem value="weekly">Semanalmente</SelectItem>
                    <SelectItem value="monthly">Mensalmente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedDate && isRecurring && recurrence !== "none" && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Próximas execuções:</p>
                <div className="space-y-1">
                  {getNextOccurrences(
                    setMinutes(setHours(selectedDate, parseInt(selectedTime.split(":")[0])), parseInt(selectedTime.split(":")[1])),
                    recurrence
                  ).map((date, index) => (
                    <Badge key={index} variant="outline" className="mr-2">
                      {format(date, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleSchedule} className="w-full" size="lg">
              <CalendarIcon className="w-4 h-4 mr-2" />
              {isRecurring ? "Agendar Campanha Recorrente" : "Agendar Campanha"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Scheduled Campaigns List */}
      {scheduledCampaigns.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Campanhas Agendadas
          </h3>

          <div className="space-y-3">
            {scheduledCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      campaign.status === "scheduled" ? "bg-emerald-500" : "bg-yellow-500"
                    )}
                  />
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarIcon className="w-3 h-3" />
                      {format(campaign.scheduledDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      {campaign.recurrence !== "none" && (
                        <Badge variant="secondary" className="text-xs">
                          <Repeat className="w-3 h-3 mr-1" />
                          {recurrenceLabels[campaign.recurrence]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={campaign.status === "scheduled" ? "default" : "secondary"}>
                    {campaign.status === "scheduled" ? "Agendada" : "Pausada"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleCampaignStatus(campaign.id)}
                  >
                    {campaign.status === "scheduled" ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCampaign(campaign.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
