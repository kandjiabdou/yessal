import { useState, useEffect } from 'react';
import parametreService from '@/services/parametre';

interface CurrencyHook {
  userDevise: 'FCFA' | 'EUR';
  tauxConversion: number;
  loading: boolean;
  formatCurrency: (amount: number) => string;
  convertAmount: (amountFCFA: number) => number;
  refreshPreferences: () => Promise<void>;
}

/**
 * Hook pour gérer l'affichage des montants selon la préférence de devise de l'utilisateur
 * Les données de l'API sont toujours en FCFA, ce hook les convertit si nécessaire
 */
export const useCurrency = (): CurrencyHook => {
  const [userDevise, setUserDevise] = useState<'FCFA' | 'EUR'>('FCFA');
  const [tauxConversion, setTauxConversion] = useState<number>(655.96);
  const [loading, setLoading] = useState(true);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const [userInfo, entreprise] = await Promise.all([
        parametreService.getUserInfo(),
        parametreService.getEntrepriseInfo()
      ]);

      setUserDevise(userInfo.devisePreference);
      setTauxConversion(entreprise.tauxConversion);
    } catch (error) {
      console.error('Erreur lors du chargement des préférences:', error);
      // Valeurs par défaut en cas d'erreur
      setUserDevise('FCFA');
      setTauxConversion(655.96);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  /**
   * Convertit un montant de FCFA vers la devise préférée de l'utilisateur
   * @param amountFCFA - Montant en FCFA (depuis l'API)
   * @returns Montant dans la devise préférée
   */
  const convertAmount = (amountFCFA: number): number => {
    if (userDevise === 'EUR') {
      return amountFCFA / tauxConversion;
    }
    return amountFCFA;
  };

  /**
   * Formate un montant en FCFA selon la devise préférée de l'utilisateur
   * @param amountFCFA - Montant en FCFA (depuis l'API)
   * @returns Montant formaté avec le symbole de devise
   */
  const formatCurrency = (amountFCFA: number): string => {
    const convertedAmount = convertAmount(amountFCFA);
    const formatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: userDevise === 'EUR' ? 2 : 0,
      maximumFractionDigits: userDevise === 'EUR' ? 2 : 0
    }).format(convertedAmount);

    return userDevise === 'EUR' ? `${formatted} €` : `${formatted} FCFA`;
  };

  /**
   * Recharge les préférences de devise (utile après une mise à jour)
   */
  const refreshPreferences = async () => {
    await loadPreferences();
  };

  return {
    userDevise,
    tauxConversion,
    loading,
    formatCurrency,
    convertAmount,
    refreshPreferences
  };
};
