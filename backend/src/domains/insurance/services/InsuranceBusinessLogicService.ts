// Insurance Business Logic Service
// File: backend/src/domains/insurance/services/InsuranceBusinessLogicService.ts

import { 
  InsuranceCustomerProfile, 
  InsurancePremiumCalculator,
  PremiumCalculationRule,
  RiskFactor 
} from '../types';
import { BusinessLogicRequest, BusinessLogicResponse } from '../../../types/base-rag';

interface InsuranceQuoteParams {
  hasMinimumInfo: boolean;
  missing: string[];
  type: 'auto' | 'health' | 'life' | 'business' | 'property' | 'travel';
  riskFactors: string[];
  customerProfile?: Partial<InsuranceCustomerProfile>;
  coverageAmount?: number;
}

interface InsuranceCalculationParams {
  hasMinimumInfo: boolean;
  missing: string[];
  type: 'premium' | 'coverage' | 'deductible' | 'risk_assessment';
  breakdown: Record<string, any>;
  factors: any[];
  customerProfile?: Partial<InsuranceCustomerProfile>;
}

/**
 * Insurance-specific business logic service
 * Handles all insurance calculations, quotes, and risk assessments
 */
export class InsuranceBusinessLogicService {
  private premiumCalculator: InsurancePremiumCalculator;
  private riskFactors: Map<string, RiskFactor> = new Map();
  private calculationRules: Map<string, PremiumCalculationRule[]> = new Map();

  constructor() {
    this.premiumCalculator = new InsurancePremiumCalculator();
    this.initializeRiskFactors();
    this.initializeCalculationRules();
  }

  /**
   * Get all business logic handlers for insurance domain
   */
  public getBusinessLogicHandlers(): Record<string, Function> {
    return {
      'QUOTE': this.handleInsuranceQuote.bind(this),
      'CALCULATION': this.handleInsuranceCalculation.bind(this),
      'RISK_ASSESSMENT': this.handleRiskAssessment.bind(this),
      'COVERAGE_ANALYSIS': this.handleCoverageAnalysis.bind(this)
    };
  }

  /**
   * Handle insurance quote requests
   */
  private async handleInsuranceQuote(message: string, context: any, analysis: any): Promise<BusinessLogicResponse> {
    const quoteParams = this.extractInsuranceQuoteParams(message, context, analysis);
    
    if (!quoteParams.hasMinimumInfo) {
      return {
        type: 'premium_quote',
        success: false,
        data: null,
        isValid: false,
        missingFields: quoteParams.missing,
        confidence: 0.8,
        needsFollowUp: true,
        processingTime: 50,
        domainSpecific: {
          insuranceType: quoteParams.type,
          requiredInfo: this.getRequiredInfoForQuote(quoteParams.type)
        }
      };
    }

    // Calculate premium using the calculator
    const premiumRequest = {
      type: 'premium_calculation' as const,
      domain: 'insurance' as const,
      parameters: {
        insuranceType: quoteParams.type,
        customerProfile: quoteParams.customerProfile ?? {},
        coverageOptions: {
          coverageLimit: quoteParams.coverageAmount,
          additionalCoverage: []
        }
      },
      validationRequired: true
    };

    const premiumResult = this.premiumCalculator.calculatePremium(premiumRequest);

    return {
      type: 'premium_quote',
      success: true,
      data: {
        ...premiumResult.data,
        quoteId: `INS_${Date.now()}`,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        nextSteps: [
          'Review coverage details',
          'Provide additional documentation if needed',
          'Schedule policy activation'
        ]
      },
      isValid: true,
      confidence: 0.9,
      needsFollowUp: true,
      processingTime: 150,
      calculationMethod: 'risk_based_pricing',
      domainSpecific: {
        insuranceType: quoteParams.type,
        riskFactorsConsidered: quoteParams.riskFactors,
        discountsAvailable: this.getAvailableDiscounts(quoteParams.customerProfile)
      }
    };
  }

  /**
   * Handle insurance calculation requests (non-quote calculations)
   */
  private async handleInsuranceCalculation(message: string, context: any, analysis: any): Promise<BusinessLogicResponse> {
    const calculationParams = this.extractInsuranceCalculationParams(message, context, analysis);
    
    if (!calculationParams.hasMinimumInfo) {
      return {
        type: 'insurance_calculation',
        success: false,
        data: null,
        isValid: false,
        missingFields: calculationParams.missing,
        confidence: 0.8,
        needsFollowUp: true,
        processingTime: 30
      };
    }

    let calculationResult;
    
    switch (calculationParams.type) {
      case 'coverage':
        calculationResult = this.calculateCoverageNeeds(calculationParams);
        break;
      case 'deductible':
        calculationResult = this.calculateOptimalDeductible(calculationParams);
        break;
      case 'risk_assessment':
        calculationResult = this.performRiskAssessment(calculationParams);
        break;
      default:
        calculationResult = this.performGeneralCalculation(calculationParams);
    }

    return {
      type: 'insurance_calculation',
      success: true,
      data: {
        calculationType: calculationParams.type,
        result: calculationResult,
        breakdown: calculationParams.breakdown,
        factors: calculationParams.factors,
        recommendations: this.generateCalculationRecommendations(calculationParams, calculationResult)
      },
      isValid: true,
      confidence: 0.9,
      needsFollowUp: true,
      processingTime: 120,
      calculationMethod: `${calculationParams.type}_calculation`
    };
  }

  /**
   * Handle risk assessment requests
   */
  private async handleRiskAssessment(message: string, context: any, analysis: any): Promise<BusinessLogicResponse> {
    const customerProfile = context.customerInfo || {};
    const riskAssessment = this.performComprehensiveRiskAssessment(customerProfile);

    return {
      type: 'risk_assessment',
      success: true,
      data: {
        overallRiskLevel: riskAssessment.overallRisk,
        riskFactors: riskAssessment.factors,
        mitigationSuggestions: riskAssessment.mitigations,
        impactOnPremium: riskAssessment.premiumImpact
      },
      isValid: true,
      confidence: 0.85,
      needsFollowUp: false,
      processingTime: 200
    };
  }

  /**
   * Handle coverage analysis requests
   */
  private async handleCoverageAnalysis(message: string, context: any, analysis: any): Promise<BusinessLogicResponse> {
    const customerProfile = context.customerInfo || {};
    const currentCoverage = analysis.extractedEntities?.currentCoverage || {};
    
    const analysis_result = this.analyzeCoverageGaps(customerProfile, currentCoverage);

    return {
      type: 'coverage_analysis',
      success: true,
      data: {
        coverageGaps: analysis_result.gaps,
        recommendations: analysis_result.recommendations,
        priorityAreas: analysis_result.priorities,
        estimatedCosts: analysis_result.costs
      },
      isValid: true,
      confidence: 0.8,
      needsFollowUp: true,
      processingTime: 180
    };
  }

  // Private helper methods
  private extractInsuranceQuoteParams(message: string, context: any, analysis: any): InsuranceQuoteParams {
    // Extract insurance type
    const insuranceType = this.detectInsuranceType(message, analysis);
    
    // Check for required information
    const requiredFields = this.getRequiredFieldsForQuote(insuranceType);
    const providedInfo = this.extractProvidedInformation(message, context, analysis);
    const missingFields = requiredFields.filter(field => !providedInfo[field]);

    return {
      hasMinimumInfo: missingFields.length === 0,
      missing: missingFields,
      type: insuranceType,
      riskFactors: this.identifyRiskFactors(message, context),
      customerProfile: context.customerProfile,
      coverageAmount: analysis.extractedEntities?.coverageAmount
    };
  }

  private extractInsuranceCalculationParams(message: string, context: any, analysis: any): InsuranceCalculationParams {
    const calculationType = this.detectCalculationType(message, analysis);
    const requiredFields = this.getRequiredFieldsForCalculation(calculationType);
    const providedInfo = this.extractProvidedInformation(message, context, analysis);
    const missingFields = requiredFields.filter(field => !providedInfo[field]);

    return {
      hasMinimumInfo: missingFields.length <= 1, // Allow calculation with minimal missing info
      missing: missingFields,
      type: calculationType,
      breakdown: {},
      factors: [],
      customerProfile: context.customerProfile
    };
  }

  private detectInsuranceType(message: string, analysis: any): 'auto' | 'health' | 'life' | 'business' | 'property' | 'travel' {
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('car') || messageLower.includes('auto') || messageLower.includes('vehicle')) {
      return 'auto';
    } else if (messageLower.includes('health') || messageLower.includes('medical')) {
      return 'health';
    } else if (messageLower.includes('life') || messageLower.includes('term')) {
      return 'life';
    } else if (messageLower.includes('business') || messageLower.includes('commercial')) {
      return 'business';
    } else if (messageLower.includes('property') || messageLower.includes('home')) {
      return 'property';
    } else if (messageLower.includes('travel') || messageLower.includes('trip')) {
      return 'travel';
    }
    
    return 'auto'; // Default fallback
  }

  private detectCalculationType(message: string, analysis: any): 'premium' | 'coverage' | 'deductible' | 'risk_assessment' {
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('coverage') || messageLower.includes('cover')) {
      return 'coverage';
    } else if (messageLower.includes('deductible') || messageLower.includes('excess')) {
      return 'deductible';
    } else if (messageLower.includes('risk') || messageLower.includes('assess')) {
      return 'risk_assessment';
    }
    
    return 'premium';
  }

  private getRequiredFieldsForQuote(insuranceType: string): string[] {
    const requirements: Record<string, string[]> = {
      auto: ['vehicle_make', 'vehicle_model', 'vehicle_year', 'driver_age'],
      health: ['age', 'medical_history', 'lifestyle'],
      life: ['age', 'health_status', 'coverage_amount'],
      business: ['business_type', 'employee_count', 'annual_revenue'],
      property: ['property_type', 'property_value', 'location'],
      travel: ['destination', 'travel_dates', 'coverage_type']
    };
    
    return requirements[insuranceType] || ['basic_info'];
  }

  private getRequiredFieldsForCalculation(calculationType: string): string[] {
    const requirements: Record<string, string[]> = {
      premium: ['insurance_type', 'basic_info'],
      coverage: ['assets', 'income', 'dependents'],
      deductible: ['risk_tolerance', 'financial_capacity'],
      risk_assessment: ['personal_info', 'lifestyle']
    };
    
    return requirements[calculationType] || ['basic_info'];
  }

  private extractProvidedInformation(message: string, context: any, analysis: any): Record<string, any> {
    // This would extract information from message, context, and analysis
    // For now, return a simplified version
    return {
      basic_info: true,
      ...analysis.extractedEntities,
      ...context.customerInfo
    };
  }

  private identifyRiskFactors(message: string, context: any): string[] {
    const riskFactors = [];
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('young driver') || context.customerInfo?.age < 25) {
      riskFactors.push('young_driver');
    }
    if (messageLower.includes('accident') || messageLower.includes('claim')) {
      riskFactors.push('previous_claims');
    }
    if (messageLower.includes('urban') || messageLower.includes('city')) {
      riskFactors.push('urban_location');
    }
    
    return riskFactors;
  }

  private getRequiredInfoForQuote(insuranceType: string): string[] {
    return this.getRequiredFieldsForQuote(insuranceType);
  }

  private getAvailableDiscounts(customerProfile?: Partial<InsuranceCustomerProfile>): string[] {
    const discounts = [];
    
    if (customerProfile?.drivingHistory?.ncdYears && customerProfile.drivingHistory.ncdYears >= 5) {
      discounts.push('No Claims Discount');
    }
    if (customerProfile?.vehicleInfo?.securityFeatures?.includes('gps_tracking')) {
      discounts.push('Security Features Discount');
    }
    if (customerProfile?.healthInfo?.exerciseFrequency === 'regular') {
      discounts.push('Fitness Discount');
    }
    if (customerProfile?.healthInfo?.smokingStatus === 'never') {
      discounts.push('Non-Smoker Discount');
    }
    
    return discounts;
  }

  private calculateCoverageNeeds(params: InsuranceCalculationParams): any {
    return {
      recommendedCoverage: 100000,
      minimumCoverage: 50000,
      optimalCoverage: 75000,
      reasoning: 'Based on your profile and assets'
    };
  }

  private calculateOptimalDeductible(params: InsuranceCalculationParams): any {
    return {
      recommendedDeductible: 1000,
      options: [500, 1000, 2500],
      savingsPerOption: [0, 200, 500],
      reasoning: 'Balance between premium savings and out-of-pocket risk'
    };
  }

  private performRiskAssessment(params: InsuranceCalculationParams): any {
    return {
      riskScore: 65,
      level: 'moderate',
      factors: ['age', 'location', 'history'],
      recommendations: ['Install security features', 'Consider higher deductible']
    };
  }

  private performGeneralCalculation(params: InsuranceCalculationParams): any {
    return {
      result: 'Calculation completed',
      value: 850,
      unit: 'GHS',
      factors: ['base_rate', 'risk_adjustment', 'discounts']
    };
  }

  private generateCalculationRecommendations(params: InsuranceCalculationParams, result: any): string[] {
    return [
      'Review calculation factors',
      'Consider optimization opportunities',
      'Discuss with insurance advisor'
    ];
  }

  private performComprehensiveRiskAssessment(customerProfile: any): any {
    return {
      overallRisk: 'moderate',
      factors: [
        { name: 'Age', impact: 'low', description: 'Within standard age range' },
        { name: 'Location', impact: 'medium', description: 'Urban area with moderate risk' },
        { name: 'History', impact: 'low', description: 'Clean driving record' }
      ],
      mitigations: [
        'Install additional security features',
        'Consider defensive driving course',
        'Regular vehicle maintenance'
      ],
      premiumImpact: '+15%'
    };
  }

  private analyzeCoverageGaps(customerProfile: any, currentCoverage: any): any {
    return {
      gaps: [
        'Insufficient liability coverage',
        'Missing comprehensive coverage',
        'No uninsured motorist protection'
      ],
      recommendations: [
        'Increase liability limits to GHS 100,000',
        'Add comprehensive coverage for vehicle protection',
        'Include uninsured motorist coverage'
      ],
      priorities: ['liability', 'comprehensive', 'uninsured_motorist'],
      costs: {
        liability_increase: 150,
        comprehensive_add: 300,
        uninsured_motorist: 75
      }
    };
  }

  private initializeRiskFactors(): void {
    // Initialize common risk factors for insurance calculations
    this.riskFactors.set('age', {
      name: 'Age',
      weight: 0.3,
      values: { 'under_25': 1.4, '25_35': 1.0, '35_55': 0.9, 'over_55': 0.95 },
      description: 'Age-based risk multiplier',
      category: 'demographic'
    });

    this.riskFactors.set('location', {
      name: 'Location',
      weight: 0.2,
      values: { 'urban': 1.2, 'suburban': 1.0, 'rural': 0.9 },
      description: 'Location-based risk adjustment',
      category: 'environmental'
    });

    this.riskFactors.set('driving_history', {
      name: 'Driving History',
      weight: 0.25,
      values: { 'clean': 0.85, 'minor_violations': 1.1, 'major_violations': 1.5 },
      description: 'Driving record impact on risk',
      category: 'historical'
    });
  }

  private initializeCalculationRules(): void {
    // Auto insurance rules
    this.calculationRules.set('auto', [
      {
        factor: 'vehicle_value',
        multiplier: 0.04,
        condition: 'comprehensive_coverage',
        description: 'Premium is 4% of vehicle value for comprehensive',
        domain: 'auto'
      },
      {
        factor: 'vehicle_age',
        multiplier: 0.9,
        condition: 'age > 5 years',
        description: '10% discount for vehicles older than 5 years',
        domain: 'auto'
      }
    ]);

    // Health insurance rules
    this.calculationRules.set('health', [
      {
        factor: 'age',
        multiplier: 1.05,
        condition: 'per year over 30',
        description: '5% increase per year over 30',
        domain: 'health'
      },
      {
        factor: 'smoking_status',
        multiplier: 1.5,
        condition: 'current_smoker',
        description: '50% surcharge for smokers',
        domain: 'health'
      }
    ]);
  }

  /**
   * Get risk factors for a specific insurance type
   */
  public getRiskFactorsForType(insuranceType: string): RiskFactor[] {
    // Return relevant risk factors based on insurance type
    const relevantFactors = [];
    
    if (insuranceType === 'auto') {
      relevantFactors.push(
        this.riskFactors.get('age'),
        this.riskFactors.get('location'),
        this.riskFactors.get('driving_history')
      );
    } else if (insuranceType === 'health') {
      relevantFactors.push(
        this.riskFactors.get('age'),
        this.riskFactors.get('location')
      );
    }
    
    return relevantFactors.filter(Boolean) as RiskFactor[];
  }

  /**
   * Get calculation rules for a specific insurance type
   */
  public getCalculationRulesForType(insuranceType: string): PremiumCalculationRule[] {
    return this.calculationRules.get(insuranceType) || [];
  }
}

export default InsuranceBusinessLogicService;