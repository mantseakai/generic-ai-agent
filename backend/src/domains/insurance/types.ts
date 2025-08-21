// Insurance Domain-Specific Types - Phase 2 Component 3
// File: backend/src/domains/insurance/types.ts
// This contains all insurance-specific logic extracted from unified-rag.ts

import { 
  BaseCustomerProfile, 
  BaseConversationContext, 
  BaseRAGDocument,
  BaseAIAnalysis,
  BusinessLogicRequest,
  BusinessLogicResponse
} from '../../types/base-rag';

// ===== INSURANCE-SPECIFIC PREMIUM CALCULATION TYPES =====

export interface PremiumCalculationRule {
  factor: string;
  multiplier: number;
  condition: string;
  description: string;
  domain: 'auto' | 'health' | 'life' | 'business' | 'property' | 'travel';
}

export interface RiskFactor {
  name: string;
  weight: number;
  values: { [key: string]: number };
  description: string;
  category: 'demographic' | 'behavioral' | 'environmental' | 'historical' | 'medical';
}

export interface InsurancePremiumCalculation {
  type: 'auto' | 'health' | 'life' | 'business' | 'property' | 'travel';
  basePremium: number;
  riskMultipliers: { [factor: string]: number };
  discounts: { [factor: string]: number };
  finalPremium: number;
  currency: string;
  breakdown: {
    baseRate: number;
    riskAdjustments: number;
    discountsApplied: number;
    taxes: number;
    fees: number;
  };
  validity: {
    expiresAt: Date;
    calculatedAt: Date;
    validForDays: number;
  };
  factors: Array<{
    name: string;
    value: any;
    impact: number;
    type: 'increase' | 'decrease' | 'neutral';
  }>;
  competitorComparison?: Array<{
    company: string;
    estimatedPremium: number;
    advantages: string[];
    disadvantages: string[];
  }>;
  recommendations: Array<{
    type: 'coverage_increase' | 'coverage_decrease' | 'deductible_adjustment' | 'additional_coverage';
    description: string;
    impact: number;
    reason: string;
  }>;
  nextSteps: Array<{
    action: string;
    description: string;
    urgency: 'immediate' | 'soon' | 'later';
  }>;
}

// ===== INSURANCE-SPECIFIC CUSTOMER PROFILE =====

export interface InsuranceCustomerProfile extends BaseCustomerProfile {
  // Auto insurance specific
  vehicleInfo?: {
    make: string;
    model: string;
    year: number;
    value: number;
    usage: 'private' | 'commercial' | 'rideshare';
    parkingLocation: 'garage' | 'street' | 'compound';
    securityFeatures: string[];
    modifications: string[];
  };
  
  drivingHistory?: {
    licenseIssueDate: Date;
    yearsOfExperience: number;
    accidentHistory: Array<{
      date: Date;
      type: string;
      atFault: boolean;
      claimAmount?: number;
    }>;
    violations: Array<{
      date: Date;
      type: string;
      penalty: string;
    }>;
    claimsCount: number;
    ncdYears: number; // No Claims Discount years
  };
  
  // Health insurance specific
  healthInfo?: {
    bmi?: number;
    smokingStatus: 'never' | 'former' | 'current';
    alcoholConsumption: 'none' | 'social' | 'moderate' | 'heavy';
    exerciseFrequency: 'none' | 'occasional' | 'regular' | 'daily';
    preExistingConditions: Array<{
      condition: string;
      diagnosedDate: Date;
      severity: 'mild' | 'moderate' | 'severe';
      treatment: string;
    }>;
    familyMedicalHistory: string[];
    currentMedications: string[];
    hospitalizations: Array<{
      date: Date;
      reason: string;
      duration: number;
      cost?: number;
    }>;
  };
  
  // Life insurance specific
  lifeInsuranceInfo?: {
    currentCoverage?: number;
    beneficiaries: Array<{
      name: string;
      relationship: string;
      percentage: number;
    }>;
    occupation: string;
    occupationRisk: 'low' | 'medium' | 'high' | 'extreme';
    hobbies: string[];
    travelHistory: Array<{
      destination: string;
      purpose: string;
      riskLevel: 'low' | 'medium' | 'high';
    }>;
  };
  
  // Business insurance specific
  businessInfo?: {
    businessType: string;
    industry: string;
    yearsInOperation: number;
    numberOfEmployees: number;
    annualRevenue: number;
    businessLocation: string;
    businessAssets: Array<{
      type: string;
      value: number;
      description: string;
    }>;
    liabilities: Array<{
      type: string;
      amount: number;
      description: string;
    }>;
    previousClaims: Array<{
      date: Date;
      type: string;
      amount: number;
      resolved: boolean;
    }>;
  };
}

// ===== INSURANCE-SPECIFIC CONVERSATION CONTEXT =====

export interface InsuranceConversationContext extends BaseConversationContext {
  insuranceSpecific: {
    productType: 'auto' | 'health' | 'life' | 'business' | 'property' | 'travel';
    stage: 'greeting' | 'discovery' | 'risk_assessment' | 'quote_generation' | 'objection_handling' | 'closing' | 'follow_up';
    
    // Quote tracking
    currentQuote?: InsurancePremiumCalculation;
    previousQuotes: InsurancePremiumCalculation[];
    quotesRequested: number;
    
    // Risk assessment progress
    riskAssessmentComplete: boolean;
    riskFactorsIdentified: RiskFactor[];
    additionalInfoNeeded: string[];
    
    // Coverage preferences
    coveragePreferences: {
      deductible?: number;
      coverageLimit?: number;
      additionalCoverage: string[];
      excludedCoverage: string[];
    };
    
    // Competitive analysis
    competitorQuotes?: Array<{
      company: string;
      premium: number;
      coverage: string;
      pros: string[];
      cons: string[];
    }>;
    
    // Objections and concerns
    objections: Array<{
      type: string;
      concern: string;
      addressed: boolean;
      response?: string;
    }>;
    
    // Decision factors
    decisionCriteria: {
      priceImportance: number; // 1-5
      coverageImportance: number; // 1-5
      serviceImportance: number; // 1-5
      brandImportance: number; // 1-5
    };
  };
}

// ===== INSURANCE-SPECIFIC RAG DOCUMENTS =====

export interface InsuranceRAGDocument extends BaseRAGDocument {
  metadata: BaseRAGDocument['metadata'] & {
    domain: 'insurance';
    insuranceSpecific: {
      productTypes: ('auto' | 'health' | 'life' | 'business' | 'property' | 'travel')[];
      calculationRules?: PremiumCalculationRule[];
      riskFactors?: RiskFactor[];
      regulatoryInfo?: {
        jurisdiction: string;
        regulations: string[];
        compliance: string[];
      };
      coverageTypes?: string[];
      exclusions?: string[];
      underwritingGuidelines?: string[];
      claimsProcessInfo?: {
        steps: string[];
        documents: string[];
        timeline: string;
      };
    };
  };
}

// ===== INSURANCE BUSINESS LOGIC TYPES =====

export interface InsurancePremiumRequest extends BusinessLogicRequest {
  type: 'premium_calculation';
  domain: 'insurance';
  parameters: {
    insuranceType: 'auto' | 'health' | 'life' | 'business' | 'property' | 'travel';
    customerProfile: Partial<InsuranceCustomerProfile>;
    coverageOptions: {
      deductible?: number;
      coverageLimit?: number;
      additionalCoverage?: string[];
    };
    competitorMode?: boolean; // For comparison quotes
  };
}

export interface InsurancePremiumResponse extends BusinessLogicResponse {
  type: 'premium_calculation';
  data: InsurancePremiumCalculation & {
    competitorComparison?: Array<{
      company: string;
      estimatedPremium: number;
      advantages: string[];
      disadvantages: string[];
    }>;
    recommendations: Array<{
      type: 'coverage_increase' | 'coverage_decrease' | 'deductible_adjustment' | 'additional_coverage';
      description: string;
      impact: number;
      reason: string;
    }>;
    nextSteps: Array<{
      action: string;
      description: string;
      urgency: 'immediate' | 'soon' | 'later';
    }>;
  };
}

// ===== INSURANCE PRODUCT DEFINITIONS =====

export interface InsuranceProduct {
  id: string;
  name: string;
  type: 'auto' | 'health' | 'life' | 'business' | 'property' | 'travel';
  description: string;
  
  coverage: {
    baseCoverage: string[];
    optionalCoverage: string[];
    exclusions: string[];
    limits: {
      minimum: number;
      maximum: number;
      recommended: number;
    };
  };
  
  pricing: {
    baseRate: number;
    rateStructure: 'flat' | 'percentage' | 'tiered';
    discounts: Array<{
      name: string;
      description: string;
      percentage: number;
      conditions: string[];
    }>;
    surcharges: Array<{
      name: string;
      description: string;
      percentage: number;
      conditions: string[];
    }>;
  };
  
  eligibility: {
    ageRange?: { min: number; max: number };
    locationRestrictions?: string[];
    occupationRestrictions?: string[];
    healthRequirements?: string[];
    otherRequirements?: string[];
  };
  
  underwriting: {
    requirements: string[];
    documentation: string[];
    medicalExam?: boolean;
    inspectionRequired?: boolean;
    approvalProcess: 'automatic' | 'manual' | 'hybrid';
    processingTime: string;
  };
  
  claims: {
    reportingMethods: string[];
    requiredDocuments: string[];
    processSteps: string[];
    averageProcessingTime: string;
    paymentMethods: string[];
  };
}

// ===== GHANA-SPECIFIC INSURANCE CONTEXTS =====

export interface GhanaInsuranceContext {
  regulations: {
    nic: { // National Insurance Commission
      registrationRequired: boolean;
      complianceRequirements: string[];
      reportingRequirements: string[];
    };
    thirdPartyMotor: {
      mandatory: boolean;
      minimumCoverage: number;
      penalties: string[];
    };
    nhis: { // National Health Insurance Scheme
      integration: boolean;
      coverageGaps: string[];
      supplementaryNeeds: string[];
    };
  };
  
  marketConditions: {
    competitorAnalysis: Array<{
      company: string;
      marketShare: number;
      strengths: string[];
      weaknesses: string[];
      pricingStrategy: string;
    }>;
    
    localFactors: {
      seasonalRisks: Array<{
        season: string;
        risks: string[];
        impactOnPremiums: number;
      }>;
      regionalRisks: Record<string, string[]>;
      economicFactors: {
        inflationImpact: number;
        currencyStability: string;
        regulatoryChanges: string[];
      };
    };
  };
  
  customerBehavior: {
    paymentPreferences: string[];
    communicationChannels: string[];
    decisionInfluencers: string[];
    commonObjections: string[];
    seasonalDemand: Record<string, number>;
  };
}

// ===== PREMIUM CALCULATION ENGINE =====

export class InsurancePremiumCalculator {
  private baseRates: Record<string, number> = {
    'auto_comprehensive': 0.04, // 4% of vehicle value
    'auto_third_party': 360, // Fixed rate in GHS
    'health_individual': 800, // Base rate per year
    'health_family': 2400, // Base rate for family
    'life_term': 0.003, // 0.3% of sum assured
    'business_general': 0.02, // 2% of business value
  };
  
  calculatePremium(request: InsurancePremiumRequest): InsurancePremiumResponse {
    const { insuranceType, customerProfile, coverageOptions } = request.parameters;
    
    // Get base premium
    const baseKey = `${insuranceType}_${coverageOptions.coverageLimit ? 'comprehensive' : 'basic'}`;
    let basePremium = this.baseRates[baseKey] || 1000;
    
    // Apply risk factors
    const riskMultiplier = this.calculateRiskMultiplier(insuranceType, customerProfile);
    
    // Apply discounts
    const discountMultiplier = this.calculateDiscounts(insuranceType, customerProfile);
    
    // Calculate final premium
    const finalPremium = basePremium * riskMultiplier * discountMultiplier;
    
    const calculation: InsurancePremiumCalculation = {
      type: insuranceType,
      basePremium,
      riskMultipliers: { total: riskMultiplier },
      discounts: { total: discountMultiplier },
      finalPremium: Math.round(finalPremium),
      currency: 'GHS',
      breakdown: {
        baseRate: basePremium,
        riskAdjustments: finalPremium - basePremium,
        discountsApplied: basePremium * (1 - discountMultiplier),
        taxes: finalPremium * 0.025, // 2.5% insurance levy
        fees: 50 // Processing fee
      },
      validity: {
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        calculatedAt: new Date(),
        validForDays: 30
      },
      factors: this.extractFactors(insuranceType, customerProfile, riskMultiplier, discountMultiplier),
      recommendations: [],
      nextSteps:[],
      
    };

    return {
      type: 'premium_calculation',
      success: true,
      data: {
        ...calculation,
        recommendations: this.generateRecommendations(insuranceType, customerProfile, calculation),
        nextSteps: this.generateNextSteps(calculation)
      },
      isValid: true,
      confidence: 0.9,
      needsFollowUp: true,
      processingTime: Date.now() - (request.parameters as any).timestamp || Date.now(),
      calculationMethod: 'risk_based_pricing'
    };
  }

  private calculateRiskMultiplier(insuranceType: string, profile: Partial<InsuranceCustomerProfile>): number {
    let multiplier = 1.0;
    
    switch (insuranceType) {
      case 'auto':
        if (profile.drivingHistory?.claimsCount) {
          multiplier *= 1 + (profile.drivingHistory.claimsCount * 0.25);
        }
        if (profile.age && profile.age < 25) {
          multiplier *= 1.4;
        }
        if (profile.location === 'accra') {
          multiplier *= 1.2; // Urban risk premium
        }
        break;
        
      case 'health':
        if (profile.healthInfo?.smokingStatus === 'current') {
          multiplier *= 1.5;
        }
        if (profile.age && profile.age > 50) {
          multiplier *= 1.2;
        }
        if (profile.healthInfo?.preExistingConditions?.length) {
          multiplier *= 1 + (profile.healthInfo.preExistingConditions.length * 0.15);
        }
        break;
        
      case 'life':
        if (profile.lifeInsuranceInfo?.occupationRisk === 'high') {
          multiplier *= 1.8;
        }
        if (profile.healthInfo?.smokingStatus === 'current') {
          multiplier *= 2.0;
        }
        break;
    }
    
    return Math.min(multiplier, 3.0); // Cap at 3x base rate
  }

  private calculateDiscounts(insuranceType: string, profile: Partial<InsuranceCustomerProfile>): number {
    let discount = 1.0;
    
    switch (insuranceType) {
      case 'auto':
        if (profile.drivingHistory?.ncdYears && profile.drivingHistory.ncdYears >= 5) {
          discount *= 0.85; // 15% NCD discount
        }
        if (profile.vehicleInfo?.securityFeatures?.includes('gps_tracking')) {
          discount *= 0.9; // 10% security discount
        }
        break;
        
      case 'health':
        if (profile.healthInfo?.exerciseFrequency === 'regular') {
          discount *= 0.95; // 5% fitness discount
        }
        if (profile.healthInfo?.smokingStatus === 'never') {
          discount *= 0.9; // 10% non-smoker discount
        }
        break;
    }
    
    return Math.max(discount, 0.5); // Minimum 50% of base rate
  }

  private extractFactors(
    insuranceType: string, 
    profile: Partial<InsuranceCustomerProfile>, 
    riskMultiplier: number, 
    discountMultiplier: number
  ): Array<{ name: string; value: any; impact: number; type: 'increase' | 'decrease' | 'neutral' }> {
    const factors = [];
    
    // Add risk factors
    if (riskMultiplier > 1.0) {
      factors.push({
        name: 'Risk Assessment',
        value: `${Math.round((riskMultiplier - 1) * 100)}% increase`,
        impact: riskMultiplier - 1,
        type: 'increase' as const
      });
    }
    
    // Add discount factors
    if (discountMultiplier < 1.0) {
      factors.push({
        name: 'Discounts Applied',
        value: `${Math.round((1 - discountMultiplier) * 100)}% reduction`,
        impact: 1 - discountMultiplier,
        type: 'decrease' as const
      });
    }
    
    return factors;
  }

  private generateRecommendations(
    insuranceType: string, 
    profile: Partial<InsuranceCustomerProfile>, 
    calculation: InsurancePremiumCalculation
  ) {
    const recommendations = [];
    
    if (insuranceType === 'auto' && !profile.vehicleInfo?.securityFeatures?.includes('gps_tracking')) {
      recommendations.push({
        type: 'additional_coverage' as const,
        description: 'Add GPS tracking for 10% discount',
        impact: -calculation.finalPremium * 0.1,
        reason: 'Security features reduce theft risk'
      });
    }
    
    if (calculation.finalPremium > 2000) {
      recommendations.push({
        type: 'deductible_adjustment' as const,
        description: 'Consider higher deductible to reduce premium',
        impact: -calculation.finalPremium * 0.15,
        reason: 'Higher deductible reduces insurer risk'
      });
    }
    
    return recommendations;
  }

  private generateNextSteps(calculation: InsurancePremiumCalculation) {
    return [
      {
        action: 'Review quote details',
        description: 'Examine coverage and premium breakdown',
        urgency: 'immediate' as const
      },
      {
        action: 'Gather required documents',
        description: 'Prepare identification and supporting documents',
        urgency: 'soon' as const
      },
      {
        action: 'Schedule inspection if needed',
        description: 'Some policies require vehicle or property inspection',
        urgency: 'later' as const
      }
    ];
  }
}

// ===== INSURANCE KNOWLEDGE BASE MANAGER =====

export class InsuranceKnowledgeManager {
  private documents: InsuranceRAGDocument[] = [];
  
  addDocument(doc: InsuranceRAGDocument): void {
    this.documents.push(doc);
  }
  
  searchByInsuranceType(type: string): InsuranceRAGDocument[] {
    return this.documents.filter(doc => 
      doc.metadata.insuranceSpecific.productTypes.includes(type as any)
    );
  }
  
  getCalculationRules(type: string): PremiumCalculationRule[] {
    const docs = this.searchByInsuranceType(type);
    return docs.reduce((rules, doc) => {
      if (doc.metadata.insuranceSpecific.calculationRules) {
        rules.push(...doc.metadata.insuranceSpecific.calculationRules);
      }
      return rules;
    }, [] as PremiumCalculationRule[]);
  }
  
  getRiskFactors(type: string): RiskFactor[] {
    const docs = this.searchByInsuranceType(type);
    return docs.reduce((factors, doc) => {
      if (doc.metadata.insuranceSpecific.riskFactors) {
        factors.push(...doc.metadata.insuranceSpecific.riskFactors);
      }
      return factors;
    }, [] as RiskFactor[]);
  }
}

// ===== INSURANCE-SPECIFIC AI ANALYSIS =====

export interface InsuranceAIAnalysis extends BaseAIAnalysis {
  insuranceSpecific: {
    productTypeDetected: 'auto' | 'health' | 'life' | 'business' | 'property' | 'travel' | null;
    riskFactorsIdentified: string[];
    coverageNeedsDetected: string[];
    budgetIndicators: {
      mentioned: boolean;
      range?: { min: number; max: number };
      priceObjections: boolean;
    };
    competitorMentions: Array<{
      company: string;
      context: string;
      sentiment: 'positive' | 'negative' | 'neutral';
    }>;
    urgencyIndicators: {
      expiringCoverage: boolean;
      newPurchase: boolean;
      legalRequirement: boolean;
      lifeEvent: boolean;
    };
    objectionSignals: Array<{
      type: 'price' | 'coverage' | 'trust' | 'timing' | 'complexity';
      severity: 'low' | 'medium' | 'high';
      specificConcern: string;
    }>;
  };
}

// ===== INSURANCE CONVERSATION STAGES =====

export const INSURANCE_CONVERSATION_STAGES = {
  greeting: {
    name: 'Initial Greeting',
    nextStages: ['discovery', 'quick_quote'],
    businessLogicEnabled: false,
    leadCaptureEnabled: false,
    goals: ['establish_rapport', 'identify_needs']
  },
  
  discovery: {
    name: 'Needs Discovery',
    nextStages: ['risk_assessment', 'quote_generation'],
    businessLogicEnabled: false,
    leadCaptureEnabled: true,
    goals: ['understand_coverage_needs', 'gather_basic_info', 'qualify_budget']
  },
  
  risk_assessment: {
    name: 'Risk Assessment',
    nextStages: ['quote_generation'],
    businessLogicEnabled: true,
    leadCaptureEnabled: true,
    goals: ['collect_risk_factors', 'assess_insurability', 'prepare_for_pricing']
  },
  
  quote_generation: {
    name: 'Quote Generation',
    nextStages: ['objection_handling', 'closing', 'comparison'],
    businessLogicEnabled: true,
    leadCaptureEnabled: true,
    goals: ['calculate_premium', 'present_options', 'explain_coverage']
  },
  
  comparison: {
    name: 'Competitive Comparison',
    nextStages: ['objection_handling', 'closing'],
    businessLogicEnabled: true,
    leadCaptureEnabled: true,
    goals: ['compare_competitors', 'highlight_advantages', 'address_concerns']
  },
  
  objection_handling: {
    name: 'Objection Handling',
    nextStages: ['quote_generation', 'closing', 'follow_up'],
    businessLogicEnabled: true,
    leadCaptureEnabled: true,
    goals: ['address_concerns', 'overcome_objections', 'rebuild_confidence']
  },
  
  closing: {
    name: 'Closing',
    nextStages: ['application', 'follow_up'],
    businessLogicEnabled: false,
    leadCaptureEnabled: true,
    goals: ['secure_commitment', 'initiate_application', 'schedule_follow_up']
  },
  
  follow_up: {
    name: 'Follow Up',
    nextStages: ['closing', 'discovery'],
    businessLogicEnabled: false,
    leadCaptureEnabled: true,
    goals: ['maintain_engagement', 'address_new_concerns', 'move_toward_close']
  }
} as const;
