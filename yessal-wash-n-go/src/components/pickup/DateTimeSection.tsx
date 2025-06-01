
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, Clock } from "lucide-react";

interface DateTimeSectionProps {
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
}

const DateTimeSection = ({
  date,
  time,
  onDateChange,
  onTimeChange
}: DateTimeSectionProps) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="date" className="flex items-center gap-1">
          <Calendar size={16} />
          Date
        </Label>
        <Input
          id="date"
          name="date"
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="time" className="flex items-center gap-1">
          <Clock size={16} />
          Heure
        </Label>
        <Input
          id="time"
          name="time"
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          required
        />
      </div>
    </div>
  );
};

export default DateTimeSection;
