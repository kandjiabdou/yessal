
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface NotesSectionProps {
  notes: string;
  onNotesChange: (notes: string) => void;
}

const NotesSection = ({ notes, onNotesChange }: NotesSectionProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="notes">Notes supplémentaires</Label>
      <Textarea
        id="notes"
        name="notes"
        placeholder="Instructions spéciales pour la collecte..."
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        className="min-h-[100px]"
      />
    </div>
  );
};

export default NotesSection;
