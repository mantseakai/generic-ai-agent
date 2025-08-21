// Pension Business Logic Service
// File: backend/src/domains/pension/services/PensionBusinessLogicService.ts

import { BusinessLogicResponse } from '../../../types/base-rag';

interface PensionCalculationParams {
  hasMinimumInfo: boolean;
  missing: string[];
  contributionYears?: number;
  averageSalary?: number;
  currentAge?: number;
  retirementAge?: number;
  contributionAmount?: number;
  employerContribution?: number;
}

interface PensionInfoParams {
  type: 'general_info' | 'eligibility' | 'benefits' | 'contribution_rates' | 'retirement_planning';
  specificQuery: Record<string, any>;
  userAge?: number;
  employmentStatus?: string;
}

/**
 * Pension-specific business logic service
 * Handles SSNIT calculations, retirement planning, and pension information
 */
export class PensionBusinessLogicService {
  private ssniteRates: { employee: number; employer: number; ceiling: number };
  private benefitFormulas: Map<string, Function> = new Map();
  private eligibilityRules: Map<string, any> = new Map();

  constructor() {
    // Current SSNIT rates (as of 2024)
    this.ssniteRates = {
      employee: 0.055, // 5.5%
      employer: 0.13,  // 13%
      ceiling: 5000    // Monthly ceiling in GHS
    };
    
    this.initializeBenefitFormulas();
    this.initializeEligibilityRules();
  }

  /**
   * Get all business logic handlers for pension domain
   */
  public getBusinessLogicHandlers(): Record<string, Function> {
    return {
      'CALCULATION': this.handlePensionCalculation.bind(this),
      'INFORMATION': this.handlePensionInformation.bind(this),
      'PLANNING': this.handleRetirementPlanning.bind(this),
      'ELIGIBILITY': this.handleEligibilityCheck.bind(this)
    };
  }

  /**
   * Handle pension calculation requests
   */
  private async handlePensionCalculation(message: string, context: any, analysis: any): Promise<BusinessLogicResponse> {
    const calculationParams = this.extractPensionCalculationParams(message, context, analysis);
    
    if (!calculationParams.hasMinimumInfo) {
      return {
        type: 'pension_calculation',
        success: false,
        data: null,
        isValid: false,
        missingFields: calculationParams.missing,
        confidence: 0.8,
        needsFollowUp: true,
        processingTime: 100,
        domainSpecific: {
          requiredInfo: this.getRequiredCalculationInfo(),
          ssniteRates: this.ssniteRates,
          retirementAge: { normal: 60, early: 55 }
        }
      };
    }

    // Perform pension benefit calculations
    const monthlyBenefit = this.calculateSSNITBenefit(calculationParams);
    const totalProjections = this.calculateProjections(calculationParams, monthlyBenefit);
    const recommendations = this.generatePensionRecommendations(calculationParams, monthlyBenefit);

    return {
      type: 'pension_calculation',
      success: true,
      data: {
        monthlyBenefit,
        projectedTotal: totalProjections.lifetime,
        breakdown: {
          contributionYears: calculationParams.contributionYears,
          averageSalary: calculationParams.averageSalary,
          currentAge: calculationParams.currentAge,
          retirementAge: calculationParams.retirementAge || 60,
          totalContributions: totalProjections.totalContributions,
          employerContributions: totalProjections.employerContributions
        },
        scenarios: this.calculateDifferentScenarios(calculationParams),
        recommendations: recommendations,
        nextMilestones: this.getNextMilestones(calculationParams)
      },
      isValid: true,
      confidence: 0.9,
      needsFollowUp: true,
      processingTime: 200,
      calculationMethod: 'ssnit_formula',
      domainSpecific: {
        pensionScheme: 'SSNIT',
        calculationDate: new Date().toISOString(),
        assumedInflation: '8%',
        disclaimers: ['Estimates based on current rates', 'Subject to policy changes']
      }
    };
  }

  /**
   * Handle pension information requests
   */
  private async handlePensionInformation(message: string, context: any, analysis: any): Promise<BusinessLogicResponse> {
    const infoParams = this.extractPensionInfoParams(message, context, analysis);
    
    let informationResult;
    
    switch (infoParams.type) {
      case 'eligibility':
        informationResult = this.getEligibilityInformation(infoParams);
        break;
      case 'benefits':
        informationResult = this.getBenefitsInformation(infoParams);
        break;
      case 'contribution_rates':
        informationResult = this.getContributionRatesInfo();
        break;
      case 'retirement_planning':
        informationResult = this.getRetirementPlanningInfo(infoParams);
        break;
      default:
        informationResult = this.getGeneralPensionInfo();
    }

    return {
      type: 'pension_information',
      success: true,
      data: {
        informationType: infoParams.type,
        information: informationResult.information,
        resources: informationResult.resources,
        nextSteps: informationResult.nextSteps,
        relatedTopics: informationResult.relatedTopics
      },
      isValid: true,
      confidence: 0.95,
      needsFollowUp: false,
      processingTime: 150,
      domainSpecific: {
        informationSource: 'SSNIT Official Guidelines',
        lastUpdated: '2024',
        applicableRegion: 'Ghana'
      }
    };
  }

  /**
   * Handle retirement planning requests
   */
  private async handleRetirementPlanning(message: string, context: any, analysis: any): Promise<BusinessLogicResponse> {
    const currentAge = analysis.extractedEntities?.age || context.customerInfo?.age || 30;
    const targetRetirementAge = analysis.extractedEntities?.retirementAge || 60;
    const currentIncome = analysis.extractedEntities?.income || context.customerInfo?.income;
    
    const planningAnalysis = this.generateRetirementPlan(currentAge, targetRetirementAge, currentIncome);

    return {
      type: 'retirement_planning',
      success: true,
      data: {
        currentSituation: planningAnalysis.current,
        retirementGoals: planningAnalysis.goals,
        savingsStrategy: planningAnalysis.strategy,
        timeline: planningAnalysis.timeline,
        riskAssessment: planningAnalysis.risks,
        actionPlan: planningAnalysis.actions
      },
      isValid: true,
      confidence: 0.85,
      needsFollowUp: true,
      processingTime: 300
    };
  }

  /**
   * Handle eligibility check requests
   */
  private async handleEligibilityCheck(message: string, context: any, analysis: any): Promise<BusinessLogicResponse> {
    const userProfile = {
      age: analysis.extractedEntities?.age || context.customerInfo?.age,
      employmentStatus: analysis.extractedEntities?.employment || context.customerInfo?.employment,
      contributionYears: analysis.extractedEntities?.contributionYears,
      nationality: analysis.extractedEntities?.nationality || 'Ghanaian'
    };

    const eligibilityResult = this.checkEligibility(userProfile);

    return {
      type: 'eligibility_check',
      success: true,
      data: {
        eligible: eligibilityResult.eligible,
        requirements: eligibilityResult.requirements,
        missingCriteria: eligibilityResult.missing,
        nextSteps: eligibilityResult.nextSteps,
        timeToEligibility: eligibilityResult.timeToEligibility
      },
      isValid: true,
      confidence: 0.9,
      needsFollowUp: eligibilityResult.missing.length > 0,
      processingTime: 120
    };
  }

  // Private helper methods
  private extractPensionCalculationParams(message: string, context: any, analysis: any): PensionCalculationParams {
    const requiredFields = ['contribution_years', 'average_salary'];
    const providedInfo = this.extractProvidedInformation(message, context, analysis);
    const missingFields = requiredFields.filter(field => !providedInfo[field]);

    return {
      hasMinimumInfo: missingFields.length === 0,
      missing: missingFields,
      contributionYears: analysis.extractedEntities?.contributionYears || context.customerInfo?.contributionYears,
      averageSalary: analysis.extractedEntities?.salary || context.customerInfo?.salary,
      currentAge: analysis.extractedEntities?.age || context.customerInfo?.age || 35,
      retirementAge: analysis.extractedEntities?.retirementAge || 60,
      contributionAmount: analysis.extractedEntities?.contributionAmount,
      employerContribution: analysis.extractedEntities?.employerContribution
    };
  }

  private extractPensionInfoParams(message: string, context: any, analysis: any): PensionInfoParams {
    let infoType: PensionInfoParams['type'] = 'general_info';
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('eligib')) {
      infoType = 'eligibility';
    } else if (messageLower.includes('benefit') || messageLower.includes('payment')) {
      infoType = 'benefits';
    } else if (messageLower.includes('contribution') || messageLower.includes('rate')) {
      infoType = 'contribution_rates';
    } else if (messageLower.includes('planning') || messageLower.includes('retirement')) {
      infoType = 'retirement_planning';
    }

    return {
      type: infoType,
      specificQuery: analysis.extractedEntities || {},
      userAge: analysis.extractedEntities?.age || context.customerInfo?.age,
      employmentStatus: analysis.extractedEntities?.employment || context.customerInfo?.employment
    };
  }

  private extractProvidedInformation(message: string, context: any, analysis: any): Record<string, any> {
    return {
      contribution_years: analysis.extractedEntities?.contributionYears || context.customerInfo?.contributionYears,
      average_salary: analysis.extractedEntities?.salary || context.customerInfo?.salary,
      age: analysis.extractedEntities?.age || context.customerInfo?.age,
      ...analysis.extractedEntities,
      ...context.customerInfo
    };
  }

  private calculateSSNITBenefit(params: PensionCalculationParams): number {
    // SSNIT benefit calculation formula
    const contributionYears = params.contributionYears || 0;
    const averageSalary = params.averageSalary || 0;
    
    // Simplified SSNIT formula: 37.5% of average salary for 15+ years
    let benefitRate = 0.375; // 37.5% for 15 years
    
    // Additional 1.125% for each year beyond 15, up to 60%
    if (contributionYears > 15) {
      const additionalYears = Math.min(contributionYears - 15, 20); // Max 20 additional years
      benefitRate += additionalYears * 0.01125;
    }
    
    benefitRate = Math.min(benefitRate, 0.6); // Cap at 60%
    
    return Math.round(averageSalary * benefitRate);
  }

  private calculateProjections(params: PensionCalculationParams, monthlyBenefit: number): any {
    const contributionYears = params.contributionYears || 0;
    const averageSalary = params.averageSalary || 0;
    const retirementAge = params.retirementAge || 60;
    const lifeExpectancy = 75; // Average life expectancy in Ghana
    
    const yearsInRetirement = lifeExpectancy - retirementAge;
    const lifetimeBenefits = monthlyBenefit * 12 * yearsInRetirement;
    
    // Calculate total contributions
    const monthlyEmployeeContribution = averageSalary * this.ssniteRates.employee;
    const monthlyEmployerContribution = averageSalary * this.ssniteRates.employer;
    const totalEmployeeContributions = monthlyEmployeeContribution * 12 * contributionYears;
    const totalEmployerContributions = monthlyEmployerContribution * 12 * contributionYears;

    return {
      lifetime: lifetimeBenefits,
      totalContributions: totalEmployeeContributions,
      employerContributions: totalEmployerContributions,
      yearsInRetirement: yearsInRetirement
    };
  }

  private calculateDifferentScenarios(params: PensionCalculationParams): any[] {
    const scenarios = [];
    
    // Early retirement scenario (age 55)
    if (params.retirementAge !== 55) {
      const earlyParams = { ...params, retirementAge: 55 };
      scenarios.push({
        name: 'Early Retirement (Age 55)',
        monthlyBenefit: this.calculateSSNITBenefit(earlyParams) * 0.8, // 20% reduction
        description: 'Reduced benefits for early retirement'
      });
    }
    
    // Normal retirement scenario (age 60)
    if (params.retirementAge !== 60) {
      const normalParams = { ...params, retirementAge: 60 };
      scenarios.push({
        name: 'Normal Retirement (Age 60)',
        monthlyBenefit: this.calculateSSNITBenefit(normalParams),
        description: 'Full benefits at normal retirement age'
      });
    }
    
    // Delayed retirement scenario (age 65)
    if (params.retirementAge !== 65) {
      const delayedParams = { ...params, retirementAge: 65 };
      scenarios.push({
        name: 'Delayed Retirement (Age 65)',
        monthlyBenefit: this.calculateSSNITBenefit(delayedParams) * 1.1, // 10% increase
        description: 'Enhanced benefits for delayed retirement'
      });
    }
    
    return scenarios;
  }

  private generatePensionRecommendations(params: PensionCalculationParams, monthlyBenefit: number): string[] {
    const recommendations = [];
    
    if ((params.contributionYears || 0) < 15) {
      recommendations.push('Ensure you contribute for at least 15 years to qualify for benefits');
    }
    
    if ((params.averageSalary || 0) < 2000) {
      recommendations.push('Consider increasing your salary to improve pension benefits');
    }
    
    if (monthlyBenefit < 1000) {
      recommendations.push('Consider additional private pension schemes to supplement SSNIT');
    }
    
    recommendations.push('Regularly check your SSNIT contribution statement');
    recommendations.push('Plan for retirement expenses beyond pension income');
    
    return recommendations;
  }

  private getNextMilestones(params: PensionCalculationParams): any[] {
    const milestones = [];
    const contributionYears = params.contributionYears || 0;
    const currentAge = params.currentAge || 35;
    
    if (contributionYears < 15) {
      milestones.push({
        milestone: 'Minimum Eligibility',
        yearsLeft: 15 - contributionYears,
        benefit: 'Qualify for pension benefits'
      });
    }
    
    if (contributionYears < 35) {
      milestones.push({
        milestone: 'Maximum Benefits',
        yearsLeft: 35 - contributionYears,
        benefit: 'Reach maximum benefit rate of 60%'
      });
    }
    
    if (currentAge < 60) {
      milestones.push({
        milestone: 'Normal Retirement',
        yearsLeft: 60 - currentAge,
        benefit: 'Eligible for full retirement benefits'
      });
    }
    
    return milestones;
  }

  private getEligibilityInformation(params: PensionInfoParams): any {
    return {
      information: {
        minimumAge: 60,
        minimumContributions: 15,
        citizenship: 'Ghanaian citizen or legal resident',
        employmentTypes: ['Formal sector employees', 'Self-employed (voluntary)']
      },
      resources: ['SSNIT offices', 'SSNIT website', 'Employer HR department'],
      nextSteps: ['Check contribution history', 'Verify eligibility status', 'Plan for retirement'],
      relatedTopics: ['Contribution rates', 'Benefit calculations', 'Retirement planning']
    };
  }

  private getBenefitsInformation(params: PensionInfoParams): any {
    return {
      information: {
        pensionBenefit: '37.5% to 60% of average salary',
        invalidityBenefit: 'For permanent incapacity',
        survivorsBenefit: 'For dependents of deceased contributors',
        funeralGrant: 'Lump sum for funeral expenses'
      },
      resources: ['SSNIT Benefits Guide', 'Local SSNIT office'],
      nextSteps: ['Calculate estimated benefits', 'Understand payment schedule'],
      relatedTopics: ['Eligibility', 'Contribution requirements', 'Payment methods']
    };
  }

  private getContributionRatesInfo(): any {
    return {
      information: {
        employeeRate: `${this.ssniteRates.employee * 100}%`,
        employerRate: `${this.ssniteRates.employer * 100}%`,
        monthlyCeiling: `GHS ${this.ssniteRates.ceiling}`,
        totalRate: `${(this.ssniteRates.employee + this.ssniteRates.employer) * 100}%`
      },
      resources: ['SSNIT Rate Schedule', 'Payroll Department'],
      nextSteps: ['Verify contributions on payslip', 'Check SSNIT statement'],
      relatedTopics: ['Salary ceiling', 'Voluntary contributions', 'Employer obligations']
    };
  }

  private getRetirementPlanningInfo(params: PensionInfoParams): any {
    return {
      information: {
        planningHorizon: 'Start planning early for better outcomes',
        supplementaryOptions: ['Private pension schemes', 'Personal savings', 'Investments'],
        considerations: ['Inflation impact', 'Healthcare costs', 'Lifestyle changes']
      },
      resources: ['Financial advisors', 'Pension fund managers', 'Investment platforms'],
      nextSteps: ['Assess current financial position', 'Set retirement goals', 'Create savings plan'],
      relatedTopics: ['Investment options', 'Risk management', 'Estate planning']
    };
  }

  private getGeneralPensionInfo(): any {
    return {
      information: {
        overview: 'SSNIT provides social security for Ghanaian workers',
        coverage: 'Old age, invalidity, and survivors benefits',
        administration: 'Managed by Social Security and National Insurance Trust'
      },
      resources: ['SSNIT website', 'Customer service centers', 'Information brochures'],
      nextSteps: ['Learn about your rights', 'Understand contribution requirements'],
      relatedTopics: ['Registration process', 'Contribution rates', 'Benefit types']
    };
  }

  private generateRetirementPlan(currentAge: number, retirementAge: number, currentIncome?: number): any {
    const yearsToRetirement = retirementAge - currentAge;
    const estimatedSSNITBenefit = currentIncome ? currentIncome * 0.4 : 1500; // Assume 40% replacement
    
    return {
      current: {
        age: currentAge,
        yearsToRetirement,
        estimatedIncome: currentIncome || 'Not provided'
      },
      goals: {
        targetReplacementRatio: '70-80% of current income',
        estimatedNeeds: currentIncome ? currentIncome * 0.75 : 'To be determined',
        shortfall: currentIncome ? (currentIncome * 0.75) - estimatedSSNITBenefit : 'Calculate based on income'
      },
      strategy: {
        ssnit: `Estimated monthly benefit: GHS ${estimatedSSNITBenefit}`,
        supplements: ['Employer pension scheme', 'Personal retirement savings', 'Investments'],
        timeline: `${yearsToRetirement} years to build retirement funds`
      },
      timeline: this.generateTimelineMilestones(currentAge, retirementAge),
      risks: ['Inflation', 'Policy changes', 'Health expenses', 'Longevity'],
      actions: [
        'Maximize SSNIT contributions',
        'Join employer pension scheme if available',
        'Start personal retirement savings',
        'Consider diversified investments',
        'Review and adjust plan annually'
      ]
    };
  }

  private generateTimelineMilestones(currentAge: number, retirementAge: number): any[] {
    const milestones = [];
    const yearsToRetirement = retirementAge - currentAge;
    
    // 5-year milestone intervals
    for (let i = 5; i <= yearsToRetirement; i += 5) {
      const targetAge = currentAge + i;
      milestones.push({
        age: targetAge,
        years: i,
        target: `Review and adjust retirement savings target`,
        action: `Assess progress at age ${targetAge}`
      });
    }
    
    return milestones;
  }

  private checkEligibility(userProfile: any): any {
    const requirements = [
      { name: 'Age Requirement', met: (userProfile.age || 0) >= 60, description: 'Must be 60 or older' },
      { name: 'Contribution Years', met: (userProfile.contributionYears || 0) >= 15, description: 'Minimum 15 years of contributions' },
      { name: 'Citizenship', met: userProfile.nationality === 'Ghanaian', description: 'Ghanaian citizenship or legal residency' }
    ];
    
    const metRequirements = requirements.filter(req => req.met);
    const missingRequirements = requirements.filter(req => !req.met);
    
    return {
      eligible: missingRequirements.length === 0,
      requirements: metRequirements,
      missing: missingRequirements,
      nextSteps: missingRequirements.map(req => `Fulfill ${req.name}: ${req.description}`),
      timeToEligibility: this.calculateTimeToEligibility(userProfile, missingRequirements)
    };
  }

  private calculateTimeToEligibility(userProfile: any, missing: any[]): string {
    const ageRequirement = missing.find(req => req.name === 'Age Requirement');
    const contributionRequirement = missing.find(req => req.name === 'Contribution Years');
    
    if (ageRequirement && contributionRequirement) {
      const yearsToAge = Math.max(0, 60 - (userProfile.age || 0));
      const yearsToContributions = Math.max(0, 15 - (userProfile.contributionYears || 0));
      return `${Math.max(yearsToAge, yearsToContributions)} years`;
    } else if (ageRequirement) {
      return `${Math.max(0, 60 - (userProfile.age || 0))} years`;
    } else if (contributionRequirement) {
      return `${Math.max(0, 15 - (userProfile.contributionYears || 0))} years`;
    }
    
    return 'Eligible now';
  }

  private getRequiredCalculationInfo(): string[] {
    return [
      'Years of contribution to SSNIT',
      'Average monthly salary',
      'Current age',
      'Planned retirement age'
    ];
  }

  private initializeBenefitFormulas(): void {
    // Standard SSNIT formula
    this.benefitFormulas.set('standard', (years: number, salary: number) => {
      let rate = 0.375; // Base 37.5% for 15 years
      if (years > 15) {
        rate += Math.min(years - 15, 20) * 0.01125; // Additional 1.125% per year, max 20 years
      }
      return Math.min(rate, 0.6) * salary; // Cap at 60%
    });
    
    // Early retirement formula (reduced benefits)
    this.benefitFormulas.set('early', (years: number, salary: number) => {
      const standardBenefit = this.benefitFormulas.get('standard')!(years, salary);
      return standardBenefit * 0.8; // 20% reduction for early retirement
    });
  }

  private initializeEligibilityRules(): void {
    this.eligibilityRules.set('age', { minimum: 60, early: 55 });
    this.eligibilityRules.set('contributions', { minimum: 15, maximum: 35 });
    this.eligibilityRules.set('citizenship', ['Ghanaian', 'Legal Resident']);
  }
}

export default PensionBusinessLogicService;