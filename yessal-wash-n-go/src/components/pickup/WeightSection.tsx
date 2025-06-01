
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useEffect } from "react";

interface WeightSectionProps {
  weight: number;
  onWeightChange: (weight: number) => void;
}

const WeightSection = ({ weight, onWeightChange }: WeightSectionProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (isNaN(value)) {
      onWeightChange(6);
    } else {
      onWeightChange(Math.max(6, value));
    }
  };

  // Ensure minimum weight on mount
  useEffect(() => {
    if (weight < 6) {
      onWeightChange(6);
    }
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor="weight">Poids (indicatif) en kg</Label>
      <Input
        id="weight"
        name="weight"
        type="number"
        min={6}
        value={weight || ""}
        onChange={handleChange}
        placeholder="Minimum 6 kg"
      />
      <p className="text-xs text-muted-foreground">
        Le poids minimum requis est de 6 kg.
      </p>
    </div>
  );
};

export default WeightSection;
