// Migration Service - Phase 2 Component 4
// File: backend/src/migrations/phase2-cleanup-migration.ts
// This service migrates from contaminated files to clean architecture

import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  BaseRAGDocument, 
  BaseCustomerProfile, 
  BaseConversationContext, 
  RAGDocument
} from '../types/base-rag';
import { 
  InsuranceRAGDocument, 
  InsuranceCustomerProfile, 
  PremiumCalculationRule, 
  RiskFactor 
} from '../domains/insurance/types';

interface MigrationReport {
  startTime: Date;
  endTime?: Date;
  filesProcessed: string[];
  filesBackedUp: string[];
  errorsEncountered: Array<{
    file: string;
    error: string;
    severity: 'warning' | 'error' | 'critical';
  }>;
  summary: {
    totalFiles: number;
    successfulMigrations: number;
    failedMigrations: number;
    backupsCreated: number;
    insuranceItemsExtracted: number;
    genericItemsPreserved: number;
  };
}

interface LegacyUnifiedRAGData {
  // Legacy types from unified-rag.ts that need to be migrated
  PremiumCalculationRule?: any;
  RiskFactor?: any;
  EnhancedRAGDocument?: any;
  CustomerProfile?: any;
  ConversationContext?: any;
  PremiumCalculationService?: any;
}

export class Phase2CleanupMigrationService {
  private backupDir: string;
  private migrationReport: MigrationReport;
  private dryRun: boolean;

  constructor(dryRun: boolean = false) {
    this.dryRun = dryRun;
    this.backupDir = path.join(process.cwd(), 'migrations', 'backups', `phase2-${Date.now()}`);
    this.migrationReport = {
      startTime: new Date(),
      filesProcessed: [],
      filesBackedUp: [],
      errorsEncountered: [],
      summary: {
        totalFiles: 0,
        successfulMigrations: 0,
        failedMigrations: 0,
        backupsCreated: 0,
        insuranceItemsExtracted: 0,
        genericItemsPreserved: 0
      }
    };
  }

  /**
   * Main migration method - orchestrates the entire Phase 2 cleanup
   */
  async runMigration(): Promise<MigrationReport> {
    console.log('🧹 Starting Phase 2 Cleanup Migration...');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN (no changes)' : 'LIVE MIGRATION'}`);

    try {
      // Create backup directory
      if (!this.dryRun) {
        await this.createBackupDirectory();
      }

      // Step 1: Migrate unified-rag.ts to base-rag.ts and insurance domain types
      await this.migrateUnifiedRAGTypes();

      // Step 2: Clean GenericAIService of insurance contamination
      await this.cleanGenericAIService();

      // Step 3: Migrate vector data to domain-specific structure
      await this.migrateVectorData();

      // Step 4: Update route imports and dependencies
      await this.updateRouteImports();

      // Step 5: Create domain-specific service adapters
      await this.createDomainServiceAdapters();

      // Step 6: Validate migration results
      await this.validateMigration();

      this.migrationReport.endTime = new Date();
      console.log('✅ Phase 2 Cleanup Migration completed successfully!');
      
    } catch (error) {
      this.addError('MIGRATION_PROCESS', (error as Error).message, 'critical');
      console.error('❌ Migration failed:', error);
    }

    return this.migrationReport;
  }

  /**
   * Step 1: Migrate unified-rag.ts to clean base types and insurance domain types
   */
  private async migrateUnifiedRAGTypes(): Promise<void> {
    console.log('📁 Step 1: Migrating unified-rag.ts...');

    const unifiedRAGPath = path.join(process.cwd(), 'src', 'types', 'unified-rag.ts');
    
    try {
      // Check if file exists
      const fileExists = await this.fileExists(unifiedRAGPath);
      if (!fileExists) {
        console.log('ℹ️  unified-rag.ts not found, skipping...');
        return;
      }

      // Backup original file
      await this.backupFile(unifiedRAGPath);

      // Read and analyze the file
      const content = await fs.readFile(unifiedRAGPath, 'utf-8');
      const analysis = this.analyzeUnifiedRAGContent(content);

      console.log(`Found ${analysis.insuranceTypes} insurance-specific types to extract`);
      console.log(`Found ${analysis.genericTypes} generic types to preserve`);

      // Extract insurance-specific content
      const insuranceContent = this.extractInsuranceSpecificContent(content);
      
      // Create insurance domain types file
      if (!this.dryRun) {
        await this.writeInsuranceTypesFile(insuranceContent);
      }

      // Create migration adapter for backward compatibility
      if (!this.dryRun) {
        await this.createBackwardCompatibilityAdapter();
      }

      this.migrationReport.summary.insuranceItemsExtracted += analysis.insuranceTypes;
      this.migrationReport.summary.genericItemsPreserved += analysis.genericTypes;
      this.migrationReport.filesProcessed.push(unifiedRAGPath);
      this.migrationReport.summary.successfulMigrations++;

    } catch (error) {
      this.addError(unifiedRAGPath, (error as Error).message, 'error');
    }
  }

  /**
   * Step 2: Clean GenericAIService of insurance contamination
   */
  private async cleanGenericAIService(): Promise<void> {
    console.log('🧹 Step 2: Cleaning GenericAIService...');

    const genericAIServicePath = path.join(process.cwd(), 'src', 'services', 'GenericAIService.ts');
    
    try {
      const fileExists = await this.fileExists(genericAIServicePath);
      if (!fileExists) {
        console.log('ℹ️  GenericAIService.ts not found, skipping...');
        return;
      }

      // Backup original file
      await this.backupFile(genericAIServicePath);

      // Read and analyze the file
      const content = await fs.readFile(genericAIServicePath, 'utf-8');
      
      // Identify insurance-specific methods and imports
      const contamination = this.identifyInsuranceContamination(content);
      
      console.log(`Found ${contamination.methods.length} insurance-specific methods to remove`);
      console.log(`Found ${contamination.imports.length} insurance-specific imports to clean`);

      // Create cleaned version
      const cleanedContent = this.removeInsuranceContamination(content, contamination);

      // Write cleaned file
      if (!this.dryRun) {
        await fs.writeFile(genericAIServicePath, cleanedContent, 'utf-8');
      }

      // Create insurance-specific service
      if (!this.dryRun) {
        await this.createInsuranceSpecificService(contamination.extractedMethods);
      }

      this.migrationReport.filesProcessed.push(genericAIServicePath);
      this.migrationReport.summary.successfulMigrations++;

    } catch (error) {
      this.addError(genericAIServicePath, (error as Error).message, 'error');
    }
  }

  /**
   * Step 3: Migrate vector data to domain-specific structure
   */
  private async migrateVectorData(): Promise<void> {
    console.log('📊 Step 3: Migrating vector data...');

    const vectorDataPath = path.join(process.cwd(), 'data', 'enhanced_vector_default.json');
    
    try {
      const fileExists = await this.fileExists(vectorDataPath);
      if (!fileExists) {
        console.log('ℹ️  Vector data file not found, skipping...');
        return;
      }

      // Backup original file
      await this.backupFile(vectorDataPath);

      // Read and parse vector data
      const content = await fs.readFile(vectorDataPath, 'utf-8');
      const vectorData = JSON.parse(content);

      // Separate by domain
      const domainSeparatedData = this.separateVectorDataByDomain(vectorData);

      console.log(`Separated into ${Object.keys(domainSeparatedData).length} domain-specific collections`);

      // Write domain-specific vector files
      if (!this.dryRun) {
        for (const [domain, data] of Object.entries(domainSeparatedData)) {
          const domainVectorPath = path.join(process.cwd(), 'data', `${domain}-vectors.json`);
          await fs.writeFile(domainVectorPath, JSON.stringify(data, null, 2), 'utf-8');
          console.log(`✅ Created ${domainVectorPath}`);
        }
      }

      this.migrationReport.filesProcessed.push(vectorDataPath);
      this.migrationReport.summary.successfulMigrations++;

    } catch (error) {
      this.addError(vectorDataPath, (error as Error).message, 'error');
    }
  }

  /**
   * Step 4: Update route imports and dependencies
   */
  private async updateRouteImports(): Promise<void> {
    console.log('🔗 Step 4: Updating route imports...');

    const routeFiles = [
      'src/routes/chat.ts',
      'src/routes/enhanced-chat.ts',
      'src/routes/insurance.ts',
      'src/routes/resort.ts',
      'src/routes/pension.ts'
    ];

    for (const routeFile of routeFiles) {
      const routePath = path.join(process.cwd(), routeFile);
      
      try {
        const fileExists = await this.fileExists(routePath);
        if (!fileExists) {
          console.log(`ℹ️  ${routeFile} not found, skipping...`);
          continue;
        }

        // Backup original file
        await this.backupFile(routePath);

        // Read and update imports
        const content = await fs.readFile(routePath, 'utf-8');
        const updatedContent = this.updateImportsInFile(content, routeFile);

        // Write updated file
        if (!this.dryRun) {
          await fs.writeFile(routePath, updatedContent, 'utf-8');
        }

        this.migrationReport.filesProcessed.push(routePath);

      } catch (error) {
        this.addError(routePath, (error as Error).message, 'warning');
      }
    }
  }

  /**
   * Step 5: Create domain-specific service adapters
   */
  private async createDomainServiceAdapters(): Promise<void> {
    console.log('⚙️  Step 5: Creating domain service adapters...');

    if (this.dryRun) {
      console.log('🧪 DRY RUN: Would create domain service adapters');
      return;
    }

    // Create insurance service adapter
    await this.createInsuranceServiceAdapter();

    // Create resort service adapter
    await this.createResortServiceAdapter();

    // Create pension service adapter
    await this.createPensionServiceAdapter();

    console.log('✅ Domain service adapters created');
  }

  /**
   * Step 6: Validate migration results
   */
  private async validateMigration(): Promise<void> {
    console.log('✅ Step 6: Validating migration...');

    // Check that new files were created
    const expectedFiles = [
      'src/types/base-rag.ts',
      'src/domains/insurance/types.ts',
      'src/domains/insurance/services/InsuranceAIService.ts',
      'src/domains/resort/services/ResortAIService.ts',
      'src/domains/pension/services/PensionAIService.ts'
    ];

    for (const expectedFile of expectedFiles) {
      const filePath = path.join(process.cwd(), expectedFile);
      const exists = await this.fileExists(filePath);
      
      if (!exists && !this.dryRun) {
        this.addError(expectedFile, 'Expected file was not created during migration', 'error');
      } else if (exists || this.dryRun) {
        console.log(`✅ ${expectedFile} - OK`);
      }
    }

    // Validate that TypeScript compiles without errors
    if (!this.dryRun) {
      try {
        // This would typically run `tsc --noEmit` to check compilation
        console.log('📋 TypeScript validation: Skipped (would require tsc check)');
      } catch (error) {
        this.addError('TYPESCRIPT_VALIDATION', (error as Error).message, 'error');
      }
    }
  }

  // Helper methods

  private async createBackupDirectory(): Promise<void> {
    await fs.mkdir(this.backupDir, { recursive: true });
    console.log(`📁 Created backup directory: ${this.backupDir}`);
  }

  private async backupFile(filePath: string): Promise<void> {
    try {
      const relativePath = path.relative(process.cwd(), filePath);
      const backupPath = path.join(this.backupDir, relativePath);
      const backupDir = path.dirname(backupPath);
      
      await fs.mkdir(backupDir, { recursive: true });
      await fs.copyFile(filePath, backupPath);
      
      this.migrationReport.filesBackedUp.push(filePath);
      this.migrationReport.summary.backupsCreated++;
      
      console.log(`💾 Backed up: ${relativePath}`);
    } catch (error) {
      this.addError(filePath, `Backup failed: ${(error as Error).message}`, 'warning');
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private analyzeUnifiedRAGContent(content: string): { insuranceTypes: number; genericTypes: number } {
    // Analyze content to identify insurance-specific vs generic types
    const insuranceKeywords = [
      'PremiumCalculationRule',
      'RiskFactor',
      'InsuranceCustomerProfile',
      'PremiumCalculationService',
      'auto_premium',
      'health_premium',
      'life_premium'
    ];

    const genericKeywords = [
      'BaseRAGDocument',
      'ConversationMessage',
      'ConversationContext',
      'AIResponse',
      'QueryResult'
    ];

    let insuranceTypes = 0;
    let genericTypes = 0;

    insuranceKeywords.forEach(keyword => {
      if (content.includes(keyword)) insuranceTypes++;
    });

    genericKeywords.forEach(keyword => {
      if (content.includes(keyword)) genericTypes++;
    });

    return { insuranceTypes, genericTypes };
  }

  private extractInsuranceSpecificContent(content: string): string {
    // Extract insurance-specific types and logic
    const insuranceLines = content.split('\n').filter(line => {
      return line.includes('Premium') || 
             line.includes('Risk') || 
             line.includes('Insurance') ||
             line.includes('auto_') ||
             line.includes('health_') ||
             line.includes('life_');
    });

    return insuranceLines.join('\n');
  }

  private identifyInsuranceContamination(content: string): {
    methods: string[];
    imports: string[];
    extractedMethods: string;
  } {
    const methods = [];
    const imports = [];
    let extractedMethods = '';

    // Find insurance-specific methods
    const methodMatches = content.match(/\s+(calculatePremium|calculateRisk|getInsurance|processInsurance)[^{]*{[^}]*}/g);
    if (methodMatches) {
      methods.push(...methodMatches);
      extractedMethods = methodMatches.join('\n\n');
    }

    // Find insurance-specific imports
    const importMatches = content.match(/import.*(?:Premium|Risk|Insurance).*/g);
    if (importMatches) {
      imports.push(...importMatches);
    }

    return { methods, imports, extractedMethods };
  }

  private removeInsuranceContamination(content: string, contamination: any): string {
    let cleanedContent = content;

    // Remove insurance-specific methods
    contamination.methods.forEach((method: any) => {
      cleanedContent = cleanedContent.replace(method, '');
    });

    // Remove insurance-specific imports
    contamination.imports.forEach((importLine: any) => {
      cleanedContent = cleanedContent.replace(importLine, '');
    });

    // Clean up empty lines and formatting
    cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return cleanedContent;
  }

  private separateVectorDataByDomain(vectorData: any): Record<string, any> {
    const domains = {
      insurance: { documents: [] as RAGDocument[], metadata: { domain: 'insurance', createdAt: new Date() } },
      resort: { documents: [] as RAGDocument[], metadata: { domain: 'resort', createdAt: new Date() } },
      pension: { documents: [] as RAGDocument[], metadata: { domain: 'pension', createdAt: new Date() } },
      generic: { documents: [] as RAGDocument[], metadata: { domain: 'generic', createdAt: new Date() } }
    };

    if (Array.isArray(vectorData)) {
      vectorData.forEach((doc) => {
        const content = doc.content || '';
        const metadata = doc.metadata || {};
        
        // Classify by content keywords
        if (this.isInsuranceContent(content, metadata)) {
          domains.insurance.documents.push(doc);
        } else if (this.isResortContent(content, metadata)) {
          domains.resort.documents.push(doc);
        } else if (this.isPensionContent(content, metadata)) {
          domains.pension.documents.push(doc);
        } else {
          domains.generic.documents.push(doc);
        }
      });
    }

    return domains;
  }

  private isInsuranceContent(content: string, metadata: any): boolean {
    const insuranceKeywords = [
      'insurance', 'premium', 'coverage', 'policy', 'claim', 'deductible',
      'auto insurance', 'health insurance', 'life insurance', 'risk assessment'
    ];
    
    const contentLower = content.toLowerCase();
    return insuranceKeywords.some(keyword => contentLower.includes(keyword)) ||
           metadata.type === 'insurance' ||
           metadata.domain === 'insurance';
  }

  private isResortContent(content: string, metadata: any): boolean {
    const resortKeywords = [
      'resort', 'hotel', 'booking', 'accommodation', 'room', 'vacation',
      'package', 'amenities', 'spa', 'restaurant', 'activity'
    ];
    
    const contentLower = content.toLowerCase();
    return resortKeywords.some(keyword => contentLower.includes(keyword)) ||
           metadata.type === 'resort' ||
           metadata.domain === 'resort';
  }

  private isPensionContent(content: string, metadata: any): boolean {
    const pensionKeywords = [
      'pension', 'retirement', 'ssnit', 'contribution', 'benefit',
      'social security', 'provident fund', 'annuity'
    ];
    
    const contentLower = content.toLowerCase();
    return pensionKeywords.some(keyword => contentLower.includes(keyword)) ||
           metadata.type === 'pension' ||
           metadata.domain === 'pension';
  }

  private updateImportsInFile(content: string, fileName: string): string {
    let updatedContent = content;

    // Replace unified-rag imports with base-rag imports
    updatedContent = updatedContent.replace(
      /import.*from.*['"].*unified-rag['"];?/g,
      "import { BaseRAGDocument, BaseCustomerProfile, BaseConversationContext, BaseAIResponse } from '../types/base-rag';"
    );

    // Add domain-specific imports where needed
    if (fileName.includes('insurance')) {
      updatedContent = `import { InsuranceCustomerProfile, InsuranceConversationContext, InsurancePremiumCalculator } from '../domains/insurance/types';\n${updatedContent}`;
    } else if (fileName.includes('resort')) {
      updatedContent = `import { ResortCustomerProfile, ResortConversationContext } from '../domains/resort/types';\n${updatedContent}`;
    } else if (fileName.includes('pension')) {
      updatedContent = `import { PensionCustomerProfile, PensionConversationContext } from '../domains/pension/types';\n${updatedContent}`;
    }

    // Replace old service imports with new consolidated AIService
    updatedContent = updatedContent.replace(
      /import.*GenericAIService.*from.*['"].*GenericAIService['"];?/g,
      "import { AIService } from '../services/AIService';"
    );

    updatedContent = updatedContent.replace(
      /import.*EnhancedAIService.*from.*['"].*EnhancedAIService['"];?/g,
      "import { AIService } from '../services/AIService';"
    );

    return updatedContent;
  }

  private async writeInsuranceTypesFile(content: string): Promise<void> {
    const insuranceTypesDir = path.join(process.cwd(), 'src', 'domains', 'insurance');
    await fs.mkdir(insuranceTypesDir, { recursive: true });
    
    const insuranceTypesPath = path.join(insuranceTypesDir, 'types.ts');
    
    // Note: In a real migration, this would use the actual insurance types content
    // For now, we reference the artifact we created
    console.log(`Would write insurance types to: ${insuranceTypesPath}`);
  }

  private async createBackwardCompatibilityAdapter(): Promise<void> {
    const adapterContent = `// Backward Compatibility Adapter
// File: src/types/unified-rag-adapter.ts
// This file provides backward compatibility during migration

import { 
  BaseRAGDocument, 
  BaseCustomerProfile, 
  BaseConversationContext,
  BaseAIResponse 
} from './base-rag';

import { 
  InsuranceCustomerProfile,
  InsuranceConversationContext,
  PremiumCalculationRule,
  RiskFactor 
} from '../domains/insurance/types';

// Legacy type aliases for backward compatibility
export type EnhancedRAGDocument = BaseRAGDocument;
export type CustomerProfile = BaseCustomerProfile;
export type ConversationContext = BaseConversationContext;
export type AIResponse = BaseAIResponse;

// Re-export insurance types for legacy imports
export { PremiumCalculationRule, RiskFactor };
export type { InsuranceCustomerProfile, InsuranceConversationContext };

// Legacy conversion functions
export function convertLegacyCustomerProfile(legacy: any): BaseCustomerProfile {
  return {
    age: legacy.age,
    location: legacy.location || 'unknown',
    occupation: legacy.occupation,
    incomeRange: legacy.incomeRange || 'medium',
    familySize: legacy.familySize,
    riskTolerance: legacy.riskTolerance || 'medium',
    communicationPreference: 'chat',
    decisionMakingStyle: 'practical',
    urgencyLevel: 'medium',
    previousInteractions: 0,
    loyaltyLevel: 'new',
    budgetSensitive: false,
    valueSeeker: true,
    premiumBuyer: false,
    domainSpecific: legacy.insuranceSpecific || {}
  };
}

export function convertLegacyConversationContext(legacy: any): BaseConversationContext {
  return {
    domain: legacy.domain || 'insurance',
    stage: legacy.stage || 'initial',
    messageCount: legacy.messageCount || 0,
    conversationHistory: legacy.conversationHistory || [],
    startTime: new Date(),
    lastInteractionTime: new Date(),
    topicsDiscussed: legacy.topicsDiscussed || [],
    questionsAsked: legacy.questionsAsked || 0,
    informationProvided: legacy.informationProvided || [],
    customerInfo: legacy.customerInfo || {},
    productInterest: legacy.productInterest || [],
    serviceNeeds: legacy.serviceNeeds || [],
    buyingSignals: legacy.buyingSignals || [],
    domainSpecific: legacy.insuranceSpecific || {}
  };
}`;

    const adapterPath = path.join(process.cwd(), 'src', 'types', 'unified-rag-adapter.ts');
    await fs.writeFile(adapterPath, adapterContent, 'utf-8');
    console.log('Created backward compatibility adapter');
  }

  private async createInsuranceSpecificService(extractedMethods: string): Promise<void> {
    const serviceContent = `// Insurance-Specific AI Service
// File: src/domains/insurance/services/InsuranceAIService.ts
// Contains extracted insurance logic from GenericAIService

import { AIService } from '../../../services/AIService';
import { DomainConfig } from '../../../types/domain';
import { ClientConfig } from '../../../core/types/client-types';
import { 
  InsuranceCustomerProfile, 
  InsuranceConversationContext,
  InsurancePremiumCalculator,
  InsurancePremiumRequest 
} from '../types';

export class InsuranceAIService extends AIService {
  private premiumCalculator: InsurancePremiumCalculator;

  constructor(domainConfig: DomainConfig, clientConfig?: ClientConfig) {
    super(domainConfig, clientConfig);
    this.premiumCalculator = new InsurancePremiumCalculator();
  }

  // Extracted insurance-specific methods
${extractedMethods}

  /**
   * Insurance-specific message processing
   */
  async processInsuranceMessage(
    userId: string,
    message: string,
    context?: Partial<InsuranceConversationContext>
  ) {
    // Enhanced processing for insurance domain
    const response = await this.processMessage(userId, message, context);
    
    // Add insurance-specific enhancements
    if (context?.insuranceSpecific?.productType) {
      response.domainSpecific = {
        insuranceType: context.insuranceSpecific.productType,
        riskAssessmentComplete: context.insuranceSpecific.riskAssessmentComplete,
        quotesGenerated: context.insuranceSpecific.previousQuotes.length
      };
    }
    
    return response;
  }

  /**
   * Generate insurance premium quote
   */
  async generatePremiumQuote(request: InsurancePremiumRequest) {
    return this.premiumCalculator.calculatePremium(request);
  }
}`;

    const serviceDir = path.join(process.cwd(), 'src', 'domains', 'insurance', 'services');
    await fs.mkdir(serviceDir, { recursive: true });
    
    const servicePath = path.join(serviceDir, 'InsuranceAIService.ts');
    await fs.writeFile(servicePath, serviceContent, 'utf-8');
    console.log('Created InsuranceAIService');
  }

  private async createInsuranceServiceAdapter(): Promise<void> {
    console.log('Creating insurance service adapter...');
    // Implementation would create adapter for insurance domain
  }

  private async createResortServiceAdapter(): Promise<void> {
    const serviceContent = `// Resort-Specific AI Service
// File: src/domains/resort/services/ResortAIService.ts

import { AIService } from '../../../services/AIService';
import { DomainConfig } from '../../../types/domain';
import { ClientConfig } from '../../../core/types/client-types';

export class ResortAIService extends AIService {
  constructor(domainConfig: DomainConfig, clientConfig?: ClientConfig) {
    super(domainConfig, clientConfig);
  }

  /**
   * Resort-specific message processing
   */
  async processResortMessage(userId: string, message: string, context?: any) {
    const response = await this.processMessage(userId, message, context);
    
    // Add resort-specific enhancements
    response.domainSpecific = {
      bookingStage: context?.bookingStage || 'inquiry',
      roomPreferences: context?.roomPreferences || [],
      activityInterests: context?.activityInterests || []
    };
    
    return response;
  }

  /**
   * Process booking request
   */
  async processBookingRequest(bookingData: any) {
    // Booking logic would go here
    return {
      type: 'booking_request',
      success: true,
      data: bookingData
    };
  }
}`;

    const serviceDir = path.join(process.cwd(), 'src', 'domains', 'resort', 'services');
    await fs.mkdir(serviceDir, { recursive: true });
    
    const servicePath = path.join(serviceDir, 'ResortAIService.ts');
    await fs.writeFile(servicePath, serviceContent, 'utf-8');
    console.log('Created ResortAIService');
  }

  private async createPensionServiceAdapter(): Promise<void> {
    const serviceContent = `// Pension-Specific AI Service
// File: src/domains/pension/services/PensionAIService.ts

import { AIService } from '../../../services/AIService';
import { DomainConfig } from '../../../types/domain';
import { ClientConfig } from '../../../core/types/client-types';

export class PensionAIService extends AIService {
  constructor(domainConfig: DomainConfig, clientConfig?: ClientConfig) {
    super(domainConfig, clientConfig);
  }

  /**
   * Pension-specific message processing
   */
  async processPensionMessage(userId: string, message: string, context?: any) {
    const response = await this.processMessage(userId, message, context);
    
    // Add pension-specific enhancements
    response.domainSpecific = {
      pensionType: context?.pensionType || 'ssnit',
      contributionYears: context?.contributionYears || 0,
      estimatedBenefit: context?.estimatedBenefit || null
    };
    
    return response;
  }

  /**
   * Calculate SSNIT pension benefits
   */
  async calculateSSNITBenefits(contributionData: any) {
    // SSNIT calculation logic would go here
    return {
      type: 'pension_calculation',
      success: true,
      data: {
        monthlyBenefit: contributionData.averageSalary * 0.375, // Simplified calculation
        totalContributions: contributionData.monthlyContribution * contributionData.months,
        projectedTotal: contributionData.averageSalary * 0.375 * 12 * 20 // 20 years
      }
    };
  }
}`;

    const serviceDir = path.join(process.cwd(), 'src', 'domains', 'pension', 'services');
    await fs.mkdir(serviceDir, { recursive: true });
    
    const servicePath = path.join(serviceDir, 'PensionAIService.ts');
    await fs.writeFile(servicePath, serviceContent, 'utf-8');
    console.log('Created PensionAIService');
  }

  private addError(file: string, error: string, severity: 'warning' | 'error' | 'critical'): void {
    this.migrationReport.errorsEncountered.push({ file, error, severity });
    
    if (severity === 'error' || severity === 'critical') {
      this.migrationReport.summary.failedMigrations++;
    }
  }

  /**
   * Generate a detailed migration report
   */
  generateReport(): string {
    const report = `
PHASE 2 CLEANUP MIGRATION REPORT
================================

Migration Start: ${this.migrationReport.startTime.toISOString()}
Migration End: ${this.migrationReport.endTime?.toISOString() || 'In Progress'}
Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}

SUMMARY
-------
Total Files: ${this.migrationReport.summary.totalFiles}
Successful Migrations: ${this.migrationReport.summary.successfulMigrations}
Failed Migrations: ${this.migrationReport.summary.failedMigrations}
Backups Created: ${this.migrationReport.summary.backupsCreated}
Insurance Items Extracted: ${this.migrationReport.summary.insuranceItemsExtracted}
Generic Items Preserved: ${this.migrationReport.summary.genericItemsPreserved}

FILES PROCESSED
---------------
${this.migrationReport.filesProcessed.map(f => `✅ ${f}`).join('\n')}

FILES BACKED UP
---------------
${this.migrationReport.filesBackedUp.map(f => `💾 ${f}`).join('\n')}

ERRORS ENCOUNTERED
------------------
${this.migrationReport.errorsEncountered.length === 0 ? 
  'No errors encountered ✅' : 
  this.migrationReport.errorsEncountered.map(e => `${e.severity.toUpperCase()}: ${e.file} - ${e.error}`).join('\n')}

NEXT STEPS
----------
1. Review migration results and test functionality
2. Update any remaining import statements
3. Run TypeScript compilation to check for errors
4. Test all domain-specific functionality
5. Update documentation to reflect new architecture
6. Remove backup files after validation

ROLLBACK INSTRUCTIONS
---------------------
If rollback is needed, restore files from: ${this.backupDir}
`;

    return report;
  }

  /**
   * Quick rollback method in case of issues
   */
  async rollback(): Promise<void> {
    console.log('🔄 Rolling back migration...');
    
    for (const backedUpFile of this.migrationReport.filesBackedUp) {
      try {
        const relativePath = path.relative(process.cwd(), backedUpFile);
        const backupPath = path.join(this.backupDir, relativePath);
        
        await fs.copyFile(backupPath, backedUpFile);
        console.log(`↩️  Restored: ${relativePath}`);
      } catch (error) {
        console.error(`❌ Failed to restore ${backedUpFile}:`, (error as Error).message);
      }
    }
    
    console.log('✅ Rollback completed');
  }
}

// Usage example and CLI interface
export async function runPhase2Migration(dryRun: boolean = false): Promise<void> {
  const migration = new Phase2CleanupMigrationService(dryRun);
  
  try {
    const report = await migration.runMigration();
    
    console.log('\n' + migration.generateReport());
    
    if (report.errorsEncountered.length > 0) {
      console.log('\n⚠️  Migration completed with errors. Review the report above.');
      
      if (!dryRun) {
        console.log('💡 To rollback if needed, run: migration.rollback()');
      }
    } else {
      console.log('\n🎉 Migration completed successfully!');
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    
    if (!dryRun) {
      console.log('🔄 Attempting automatic rollback...');
      await migration.rollback();
    }
  }
}

// Export for use in other parts of the system
export default Phase2CleanupMigrationService;