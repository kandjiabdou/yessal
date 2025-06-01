import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import LocationSection from "./LocationSection";
import DateTimeSection from "./DateTimeSection";
import FormulasSection from "./FormulasSection";
import OptionsSection from "./OptionsSection";
import PriceSection from "./PriceSection";
import NotesSection from "./NotesSection";
import WeightSection from "./WeightSection";
import { ServiceType, Location } from "@/types";

interface NewPickupFormProps {
  isPremium: boolean;
  isStudent: boolean;
  defaultLocation?: Location | null;
  onSuccess: () => void;
}

const NewPickupForm = ({
  isPremium,
  isStudent,
  defaultLocation,
  onSuccess
}: NewPickupFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    address: defaultLocation?.address || "",
    location: {
      latitude: defaultLocation?.latitude || null,
      longitude: defaultLocation?.longitude || null,
      useAsDefault: defaultLocation?.useAsDefault || false
    },
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    notes: "",
    weight: 6, // Default weight
    formula: null as ServiceType | null,
    options: {
      hasIroning: false,
      hasExpress: false,
      hasDrying: false
    }
  });

  // Monthly used weight for premium users (mock data)
  const [monthlyUsedWeight, setMonthlyUsedWeight] = useState(25); // Example value

  // Location methods
  const [hasLocation, setHasLocation] = useState(Boolean(formData.location.latitude && formData.location.longitude));

  // Effect to initialize formula based on premium status and weight
  useEffect(() => {
    if (!isPremium) {
      setFormData(prev => ({
        ...prev,
        formula: "basic"
      }));
    } else {
      const remainingWeight = 40 - monthlyUsedWeight;
      if (formData.weight > remainingWeight) {
        setFormData(prev => ({
          ...prev,
          formula: "basic"
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          formula: null
        }));
      }
    }
  }, [isPremium, formData.weight, monthlyUsedWeight]);

  // Effect to automatically check ironing option when detailed formula is selected
  useEffect(() => {
    if (formData.formula === "detailed") {
      setFormData(prev => ({
        ...prev,
        options: {
          ...prev.options,
          hasIroning: true
        }
      }));
    }
  }, [formData.formula]);

  // Request location on first visit if no location is saved
  useEffect(() => {
    const firstVisit = !defaultLocation?.latitude;
    if (firstVisit && !hasLocation) {
      requestLocation();
    }
  }, []);
  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        setFormData(prev => ({
          ...prev,
          location: {
            ...prev.location,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        }));
        setHasLocation(true);
        toast({
          title: "Localisation obtenue",
          description: "Vos coordonnées GPS ont été enregistrées avec succès."
        });
      }, error => {
        console.error("Erreur de géolocalisation:", error);
        toast({
          title: "Erreur de localisation",
          description: "Impossible d'obtenir votre position. Veuillez autoriser l'accès à votre localisation.",
          variant: "destructive"
        });
      });
    } else {
      toast({
        title: "Géolocalisation non supportée",
        description: "Votre navigateur ne prend pas en charge la géolocalisation.",
        variant: "destructive"
      });
    }
  };
  const handleAddressChange = (address: string) => {
    setFormData({
      ...formData,
      address
    });
  };
  const handleLocationChange = (location: Location) => {
    setFormData({
      ...formData,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        useAsDefault: location.useAsDefault || formData.location.useAsDefault
      }
    });
  };
  const handleDefaultLocationChange = (useAsDefault: boolean) => {
    setFormData({
      ...formData,
      location: {
        ...formData.location,
        useAsDefault
      }
    });
  };
  const handleDateChange = (date: string) => {
    setFormData({
      ...formData,
      date
    });
  };
  const handleTimeChange = (time: string) => {
    setFormData({
      ...formData,
      time
    });
  };
  const handleNotesChange = (notes: string) => {
    setFormData({
      ...formData,
      notes
    });
  };
  const handleWeightChange = (weight: number) => {
    setFormData({
      ...formData,
      weight
    });
  };
  const handleFormulaChange = (formula: ServiceType | null) => {
    setFormData({
      ...formData,
      formula
    });
  };
  const handleOptionChange = (option: keyof typeof formData.options, checked: boolean) => {
    setFormData({
      ...formData,
      options: {
        ...formData.options,
        [option]: checked
      }
    });
  };
  const calculateMachines = (weight: number) => {
    // Constants
    const machine20kgPrice = 4000;
    const machine6kgPrice = 2000;
    
    // 1. Calculate number of 20kg machines needed (integer division)
    const machineCount20kg = Math.floor(weight / 20);
    
    // 2. Calculate remaining weight
    const remainingWeight = weight % 20;
    
    let totalMachine20kg = machineCount20kg;
    let totalMachine6kg = 0;
    let totalPrice = 0;
    
    // Process remaining weight according to the updated algorithm
    if (remainingWeight > 12) {
      // If remaining weight > 12kg, use one more 20kg machine
      totalMachine20kg += 1;
      totalPrice = totalMachine20kg * machine20kgPrice;
    } 
    else if (remainingWeight > 7) {
      // If 7 < remaining weight <= 12kg, use n machines of 20kg + 2 machines of 6kg
      totalMachine6kg = 2;
      totalPrice = machineCount20kg * machine20kgPrice + totalMachine6kg * machine6kgPrice;
    }
    else if (remainingWeight > 2) {
      // If 2 < remaining weight <= 7kg, use n machines of 20kg + 1 machine of 6kg
      totalMachine6kg = 1;
      totalPrice = machineCount20kg * machine20kgPrice + totalMachine6kg * machine6kgPrice;
    }
    else if (remainingWeight <= 2) {
      // If remaining weight <= 2kg, use only n machines of 20kg
      totalPrice = machineCount20kg * machine20kgPrice;
    }
    
    return {
      machine20kg: totalMachine20kg,
      machine6kg: totalMachine6kg,
      totalPrice: totalPrice
    };
  };
  const calculatePrice = () => {
    const remainingPremiumWeight = 40 - monthlyUsedWeight;
    const isPremiumWithinLimit = isPremium && formData.weight <= remainingPremiumWeight;
    const effectiveWeight = isPremiumWithinLimit ? 0 : formData.weight;
    const excessWeight = isPremium && formData.weight > remainingPremiumWeight ? formData.weight - remainingPremiumWeight : 0;

    // Base price calculation
    let basePrice = 0;
    
    if (!formData.formula && isPremiumWithinLimit) {
      // Premium user within limit
      basePrice = 0;
    } else if (formData.formula === "basic") {
      // For basic formula, calculate machine combination
      const machineCalculation = calculateMachines(isPremium ? excessWeight : formData.weight);
      basePrice = machineCalculation.totalPrice;
    } else if (formData.formula === "detailed") {
      // For detailed formula (per kg), minimum 6kg at 600F/kg
      const weightToCharge = isPremium ? excessWeight : formData.weight;
      basePrice = Math.max(6, weightToCharge) * 600; // 600 CFA/kg
    }

    // Updated ironing price calculation - only applies when drying is selected and for basic formula
    const ironingPrice = (formData.options.hasIroning && formData.options.hasDrying && formData.formula === "basic") 
      ? Math.round(250 * formData.weight) 
      : 0;
      
    const expressPrice = formData.options.hasExpress ? 1000 : 0;
    const dryingPrice = formData.options.hasDrying ? Math.round(175 * formData.weight) : 0;

    // Calculate subtotal
    const subtotal = basePrice + ironingPrice + expressPrice + dryingPrice;

    // Student discount (10%)
    const hasStudentDiscount = isStudent;
    const discountAmount = hasStudentDiscount ? Math.round(subtotal * 0.1) : 0;
    
    return {
      basePrice,
      ironingPrice,
      expressPrice,
      dryingPrice,
      excessWeight,
      subtotal,
      discountAmount,
      hasStudentDiscount,
      totalPrice: subtotal - discountAmount,
      isPremiumFree: isPremiumWithinLimit && !formData.options.hasExpress
    };
  };
  const priceDetails = calculatePrice();
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if location has been provided
    if (!hasLocation) {
      toast({
        title: "Localisation requise",
        description: "Veuillez autoriser l'accès à votre localisation pour continuer.",
        variant: "destructive"
      });
      requestLocation();
      return;
    }

    // Check if non-premium user has selected a formula
    if (!isPremium && !formData.formula) {
      toast({
        title: "Formule requise",
        description: "Veuillez sélectionner une formule pour continuer.",
        variant: "destructive"
      });
      return;
    }
    setIsSubmitting(true);

    // Simuler un appel API
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Demande envoyée",
        description: `Votre demande de collecte a été envoyée avec succès. Prix total: ${priceDetails.totalPrice} CFA`
      });
      onSuccess();
    }, 1500);
  };
  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <LocationSection 
            address={formData.address} 
            location={{
              latitude: formData.location.latitude,
              longitude: formData.location.longitude,
              useAsDefault: formData.location.useAsDefault
            }} 
            hasLocation={hasLocation} 
            onLocationChange={handleLocationChange} 
            onAddressChange={handleAddressChange} 
            onDefaultLocationChange={handleDefaultLocationChange} 
            onLocationStatusChange={setHasLocation} 
          />

          <DateTimeSection 
            date={formData.date} 
            time={formData.time} 
            onDateChange={handleDateChange} 
            onTimeChange={handleTimeChange} 
          />

          <NotesSection 
            notes={formData.notes} 
            onNotesChange={handleNotesChange} 
          />
          
          <WeightSection 
            weight={formData.weight}
            onWeightChange={handleWeightChange}
          />

          {/* Only show formulas if not premium or premium but exceeding weight limit */}
          {(!isPremium || (isPremium && formData.weight > (40 - monthlyUsedWeight))) && (
            <FormulasSection 
              formula={formData.formula} 
              isPremium={isPremium} 
              onFormulaChange={handleFormulaChange} 
            />
          )}
          
          <OptionsSection 
            options={formData.options} 
            formula={formData.formula} 
            weight={formData.weight}
            isPremium={isPremium}
            monthlyUsedWeight={monthlyUsedWeight}
            onOptionChange={handleOptionChange} 
          />

          <PriceSection 
            priceDetails={priceDetails} 
            formula={formData.formula} 
            options={formData.options} 
            isStudent={isStudent}
            weight={formData.weight}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Envoi en cours...
              </>
            ) : "Envoyer la demande"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default NewPickupForm;
