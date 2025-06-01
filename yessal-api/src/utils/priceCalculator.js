const logger = require('./logger');
const config = require('../config/config');

/**
 * Price calculator utility for handling various pricing scenarios
 */
class PriceCalculator {
  constructor() {
    // Define price constants (these could be moved to config or database)
    this.PRICE_6KG_MACHINE = 2500; // Price for 6kg machine
    this.PRICE_20KG_MACHINE = 8000; // Price for 20kg machine
    this.REPASSAGE_PRICE_PER_KG = 800; // Price per kg for ironing
    this.SECHAGE_FORFAIT_PRICE_PER_KG = 500; // Fixed price per kg for drying
    this.LIVRAISON_BASE_PRICE = 1500; // Base price for delivery
    
    // Reduction percentages
    this.STUDENT_REDUCTION_PERCENT = 15; // 15% reduction for students
    this.OPENING_REDUCTION_PERCENT = 10; // 10% reduction for opening promotion
  }

  /**
   * Calculate optimal machine combination for standard formula
   * @param {number} weightKg - Total weight in kg
   * @returns {Object} - Machine combination and total price
   */
  calculateOptimalMachineCombination(weightKg) {
    // Initialize variables
    let remaining = weightKg;
    let numMachine20kg = 0;
    let numMachine6kg = 0;
    let totalPrice = 0;
    
    // First, maximize use of 20kg machines
    numMachine20kg = Math.floor(remaining / 20);
    remaining -= numMachine20kg * 20;
    
    // Then use 6kg machines for remaining weight
    // If remaining > 18kg, it's cheaper to use another 20kg machine
    if (remaining > 18) {
      numMachine20kg += 1;
      remaining = 0;
    } else {
      numMachine6kg = Math.ceil(remaining / 6);
      remaining = 0;
    }
    
    // Calculate total price
    totalPrice = (numMachine20kg * this.PRICE_20KG_MACHINE) + 
                 (numMachine6kg * this.PRICE_6KG_MACHINE);
    
    return {
      machine20kg: numMachine20kg,
      machine6kg: numMachine6kg,
      price: totalPrice
    };
  }

  /**
   * Calculate price for a weight-based formula (AuKilo)
   * @param {number} weightKg - Total weight in kg
   * @returns {number} - Total price
   */
  calculatePricePerKg(weightKg) {
    // Base price is higher per kg for smaller weights, adjusted for larger weights
    let pricePerKg = 1000; // Base price per kg
    
    if (weightKg > 20) {
      pricePerKg = 900;
    }
    
    if (weightKg > 50) {
      pricePerKg = 800;
    }
    
    return weightKg * pricePerKg;
  }

  /**
   * Calculate the total price for an order
   * @param {Object} order - Order information
   * @returns {Object} - Price details
   */
  calculateOrderPrice(order) {
    const { 
      formuleCommande, 
      masseVerifieeKg, 
      typeReduction, 
      typeClient,
      options = {} 
    } = order;
    
    const weight = masseVerifieeKg || 0;
    if (weight < config.business.minOrderWeightKg) {
      throw new Error(`Minimum order weight is ${config.business.minOrderWeightKg}kg`);
    }
    
    // Calculate base price according to formula
    let basePrice = 0;
    let priceDetails = {};
    
    switch(formuleCommande) {
      case 'Standard':
        const machineCombo = this.calculateOptimalMachineCombination(weight);
        basePrice = machineCombo.price;
        priceDetails = {
          ...machineCombo,
          weight
        };
        break;
        
      case 'AuKilo':
        basePrice = this.calculatePricePerKg(weight);
        priceDetails = {
          pricePerKg: basePrice / weight,
          weight
        };
        break;
        
      case 'Detail':
      case 'Premium':
        // Premium pricing similar to AuKilo but with potential limits
        basePrice = this.calculatePricePerKg(weight);
        priceDetails = {
          pricePerKg: basePrice / weight,
          weight
        };
        break;
        
      default:
        throw new Error(`Unknown formula: ${formuleCommande}`);
    }
    
    // Add optional services
    let optionsPrice = 0;
    let optionDetails = {};
    
    if (options.aOptionSechage) {
      const sechagePrice = weight * this.SECHAGE_FORFAIT_PRICE_PER_KG;
      optionsPrice += sechagePrice;
      optionDetails.sechage = {
        price: sechagePrice,
        weight
      };
    }
    
    if (options.aOptionRepassage) {
      // Repassage requires sechage
      if (!options.aOptionSechage) {
        throw new Error('Repassage option requires sechage option');
      }
      
      const repassagePrice = weight * this.REPASSAGE_PRICE_PER_KG;
      optionsPrice += repassagePrice;
      optionDetails.repassage = {
        price: repassagePrice,
        weight
      };
    }
    
    if (order.estEnLivraison) {
      // Delivery price could be more complex based on distance, etc.
      optionsPrice += this.LIVRAISON_BASE_PRICE;
      optionDetails.livraison = {
        price: this.LIVRAISON_BASE_PRICE
      };
    }
    
    // Apply reductions
    let reductionRate = 0;
    let reductionReason = null;
    
    if (typeClient === 'Etudiant' || typeReduction === 'Etudiant') {
      reductionRate = this.STUDENT_REDUCTION_PERCENT / 100;
      reductionReason = 'Etudiant';
    } else if (typeReduction === 'Ouverture') {
      reductionRate = this.OPENING_REDUCTION_PERCENT / 100;
      reductionReason = 'Ouverture';
    }
    
    const reductionAmount = (basePrice + optionsPrice) * reductionRate;
    
    // Calculate total price
    const totalPrice = basePrice + optionsPrice - reductionAmount;
    
    return {
      basePrice,
      optionsPrice,
      optionDetails,
      reductionRate: reductionRate * 100, // Convert to percentage
      reductionAmount,
      reductionReason,
      totalPrice,
      priceDetails
    };
  }
}

module.exports = new PriceCalculator();
