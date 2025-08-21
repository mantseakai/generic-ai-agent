// Resort Business Logic Service
// File: backend/src/domains/resort/services/ResortBusinessLogicService.ts

import { BusinessLogicResponse } from '../../../types/base-rag';

interface BookingParams {
  hasMinimumInfo: boolean;
  missing: string[];
  checkIn?: Date;
  checkOut?: Date;
  guests: number;
  roomType?: string;
  preferences?: string[];
}

interface QuoteParams {
  hasMinimumInfo: boolean;
  missing: string[];
  dates?: { checkIn: Date; checkOut: Date };
  guests: number;
  packageType?: string;
  activities?: string[];
}

/**
 * Resort-specific business logic service
 * Handles bookings, quotes, availability checks, and activity scheduling
 */
export class ResortBusinessLogicService {
  private roomRates: Map<string, number> = new Map();
  private packageRates: Map<string, number> = new Map();
  private activities: Map<string, { name: string; price: number; duration: string }> = new Map();

  constructor() {
    this.initializeRoomRates();
    this.initializePackageRates();
    this.initializeActivities();
  }

  /**
   * Get all business logic handlers for resort domain
   */
  public getBusinessLogicHandlers(): Record<string, Function> {
    return {
      'BOOKING': this.handleResortBooking.bind(this),
      'QUOTE': this.handleResortQuote.bind(this),
      'AVAILABILITY': this.handleAvailabilityCheck.bind(this),
      'ACTIVITY': this.handleActivityBooking.bind(this)
    };
  }

  /**
   * Handle resort booking requests
   */
  private async handleResortBooking(message: string, context: any, analysis: any): Promise<BusinessLogicResponse> {
    const bookingParams = this.extractBookingParams(message, context, analysis);
    
    if (!bookingParams.hasMinimumInfo) {
      return {
        type: 'resort_booking',
        success: false,
        data: null,
        isValid: false,
        missingFields: bookingParams.missing,
        confidence: 0.8,
        needsFollowUp: true,
        processingTime: 100,
        domainSpecific: {
          requiredInfo: this.getRequiredBookingInfo(),
          availableRoomTypes: Array.from(this.roomRates.keys()),
          seasonalPricing: this.getSeasonalInfo()
        }
      };
    }

    // Check availability
    const availability = await this.checkRoomAvailability(bookingParams);
    
    if (!availability.available) {
      return {
        type: 'resort_booking',
        success: false,
        data: {
          availability: false,
          alternativeDates: availability.alternatives,
          waitlistOptions: availability.waitlist
        },
        isValid: false,
        confidence: 0.9,
        needsFollowUp: true,
        processingTime: 200
      };
    }

    // Calculate pricing
    const pricing = this.calculateBookingPricing(bookingParams);
    
    // Generate booking options
    const bookingOptions = this.generateBookingOptions(bookingParams, pricing);

    return {
      type: 'resort_booking',
      success: true,
      data: {
        availability: true,
        options: bookingOptions,
        pricing: pricing,
        reservationDetails: {
          bookingId: `RES_${Date.now()}`,
          holdUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          cancellationPolicy: 'Free cancellation up to 48 hours before check-in'
        },
        nextSteps: [
          'Review booking details',
          'Provide guest information',
          'Complete payment',
          'Receive confirmation'
        ]
      },
      isValid: true,
      confidence: 0.95,
      needsFollowUp: true,
      processingTime: 250,
      domainSpecific: {
        roomType: bookingParams.roomType,
        amenitiesIncluded: this.getIncludedAmenities(bookingParams.roomType),
        upgradeOptions: this.getUpgradeOptions(bookingParams.roomType)
      }
    };
  }

  /**
   * Handle resort quote requests
   */
  private async handleResortQuote(message: string, context: any, analysis: any): Promise<BusinessLogicResponse> {
    const quoteParams = this.extractQuoteParams(message, context, analysis);
    
    if (!quoteParams.hasMinimumInfo) {
      return {
        type: 'resort_quote',
        success: false,
        data: null,
        isValid: false,
        missingFields: quoteParams.missing,
        confidence: 0.8,
        needsFollowUp: true,
        processingTime: 50
      };
    }

    // Calculate quote pricing
    const quotePricing = this.calculateQuotePricing(quoteParams);
    
    // Generate package recommendations
    const packageRecommendations = this.generatePackageRecommendations(quoteParams);

    return {
      type: 'resort_quote',
      success: true,
      data: {
        basePrice: quotePricing.basePrice,
        totalPrice: quotePricing.totalPrice,
        breakdown: quotePricing.breakdown,
        packageOptions: packageRecommendations,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        inclusions: quotePricing.inclusions,
        exclusions: quotePricing.exclusions
      },
      isValid: true,
      confidence: 0.9,
      needsFollowUp: true,
      processingTime: 180,
      domainSpecific: {
        seasonalDiscounts: this.getSeasonalDiscounts(),
        groupDiscounts: this.getGroupDiscounts(quoteParams.guests),
        earlyBookingOffers: this.getEarlyBookingOffers()
      }
    };
  }

  /**
   * Handle availability check requests
   */
  private async handleAvailabilityCheck(message: string, context: any, analysis: any): Promise<BusinessLogicResponse> {
    const dates = this.extractDates(message, analysis);
    const guests = this.extractGuestCount(message, analysis);
    const roomType = this.extractRoomType(message, analysis);

    const availability = await this.checkDetailedAvailability(dates, guests, roomType);

    return {
      type: 'availability_check',
      success: true,
      data: {
        requested: { dates, guests, roomType },
        availability: availability.results,
        alternatives: availability.alternatives,
        calendar: availability.calendar
      },
      isValid: true,
      confidence: 0.95,
      needsFollowUp: false,
      processingTime: 150
    };
  }

  /**
   * Handle activity booking requests
   */
  private async handleActivityBooking(message: string, context: any, analysis: any): Promise<BusinessLogicResponse> {
    const activityParams = this.extractActivityParams(message, context, analysis);
    
    const activityOptions = this.getAvailableActivities(activityParams);
    const scheduling = this.generateActivitySchedule(activityParams, activityOptions);

    return {
      type: 'activity_booking',
      success: true,
      data: {
        availableActivities: activityOptions,
        recommendedSchedule: scheduling.recommended,
        alternativeSchedules: scheduling.alternatives,
        totalCost: scheduling.totalCost,
        timeSlots: scheduling.availableSlots
      },
      isValid: true,
      confidence: 0.85,
      needsFollowUp: true,
      processingTime: 120
    };
  }

  // Private helper methods
  private extractBookingParams(message: string, context: any, analysis: any): BookingParams {
    const dates = this.extractDates(message, analysis);
    const guests = this.extractGuestCount(message, analysis);
    const roomType = this.extractRoomType(message, analysis);
    
    const requiredFields = ['check_in', 'check_out', 'guests'];
    const providedInfo = this.extractProvidedInformation(message, context, analysis);
    const missingFields = requiredFields.filter(field => !providedInfo[field]);

    return {
      hasMinimumInfo: missingFields.length === 0,
      missing: missingFields,
      checkIn: dates?.checkIn,
      checkOut: dates?.checkOut,
      guests: guests || 1,
      roomType: roomType,
      preferences: analysis.extractedEntities?.preferences || []
    };
  }

  private extractQuoteParams(message: string, context: any, analysis: any): QuoteParams {
    const dates = this.extractDates(message, analysis);
    const guests = this.extractGuestCount(message, analysis);
    const packageType = this.extractPackageType(message, analysis);
    
    const requiredFields = ['dates', 'guests'];
    const providedInfo = this.extractProvidedInformation(message, context, analysis);
    const missingFields = requiredFields.filter(field => !providedInfo[field]);

    return {
      hasMinimumInfo: missingFields.length === 0,
      missing: missingFields,
      dates: dates ?? undefined,
      guests: guests || 1,
      packageType: packageType,
      activities: analysis.extractedEntities?.activities || []
    };
  }

  private extractDates(message: string, analysis: any): { checkIn: Date; checkOut: Date } | null {
    // Simplified date extraction - in real implementation, use proper date parsing
    if (analysis.extractedEntities?.checkIn && analysis.extractedEntities?.checkOut) {
      return {
        checkIn: new Date(analysis.extractedEntities.checkIn),
        checkOut: new Date(analysis.extractedEntities.checkOut)
      };
    }
    return null;
  }

  private extractGuestCount(message: string, analysis: any): number {
    if (analysis.extractedEntities?.guests) {
      return parseInt(analysis.extractedEntities.guests);
    }
    
    // Simple pattern matching for guest count
    const guestMatch = message.match(/(\d+)\s+(guest|person|people)/i);
    return guestMatch ? parseInt(guestMatch[1]) : 1;
  }

  private extractRoomType(message: string, analysis: any): string | undefined {
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('suite') || messageLower.includes('luxury')) {
      return 'suite';
    } else if (messageLower.includes('deluxe')) {
      return 'deluxe';
    } else if (messageLower.includes('standard')) {
      return 'standard';
    }
    
    return analysis.extractedEntities?.roomType;
  }

  private extractPackageType(message: string, analysis: any): string | undefined {
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('honeymoon') || messageLower.includes('romantic')) {
      return 'honeymoon';
    } else if (messageLower.includes('family')) {
      return 'family';
    } else if (messageLower.includes('business') || messageLower.includes('corporate')) {
      return 'business';
    } else if (messageLower.includes('spa') || messageLower.includes('wellness')) {
      return 'spa';
    }
    
    return analysis.extractedEntities?.packageType;
  }

  private extractActivityParams(message: string, context: any, analysis: any): any {
    return {
      activities: analysis.extractedEntities?.activities || [],
      date: analysis.extractedEntities?.date || new Date(),
      guests: this.extractGuestCount(message, analysis),
      preferences: analysis.extractedEntities?.preferences || []
    };
  }

  private extractProvidedInformation(message: string, context: any, analysis: any): Record<string, any> {
    return {
      dates: this.extractDates(message, analysis) ? true : false,
      guests: this.extractGuestCount(message, analysis) > 0,
      check_in: analysis.extractedEntities?.checkIn || null,
      check_out: analysis.extractedEntities?.checkOut || null,
      ...analysis.extractedEntities,
      ...context.customerInfo
    };
  }

  private async checkRoomAvailability(params: BookingParams): Promise<any> {
    // Simplified availability check
    const isAvailable = Math.random() > 0.3; // 70% availability rate
    
    return {
      available: isAvailable,
      alternatives: isAvailable ? [] : [
        { checkIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), available: true },
        { checkIn: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), available: true }
      ],
      waitlist: !isAvailable
    };
  }

  private calculateBookingPricing(params: BookingParams): any {
    const nights = params.checkIn && params.checkOut ? 
      Math.ceil((params.checkOut.getTime() - params.checkIn.getTime()) / (1000 * 60 * 60 * 24)) : 1;
    
    const baseRate = this.roomRates.get(params.roomType || 'standard') || 200;
    const roomTotal = baseRate * nights;
    const taxes = roomTotal * 0.15; // 15% taxes
    const serviceFee = 50;
    
    return {
      baseRate,
      nights,
      roomTotal,
      taxes,
      serviceFee,
      totalAmount: roomTotal + taxes + serviceFee,
      breakdown: {
        accommodation: roomTotal,
        taxes: taxes,
        fees: serviceFee
      }
    };
  }

  private calculateQuotePricing(params: QuoteParams): any {
    const basePrice = this.packageRates.get(params.packageType || 'standard') || 300;
    const guestMultiplier = params.guests;
    const subtotal = basePrice * guestMultiplier;
    const taxes = subtotal * 0.15;
    
    return {
      basePrice,
      totalPrice: subtotal + taxes,
      breakdown: {
        basePackage: subtotal,
        taxes: taxes,
        perGuest: basePrice
      },
      inclusions: this.getPackageInclusions(params.packageType),
      exclusions: ['Airfare', 'Travel insurance', 'Personal expenses']
    };
  }

  private generateBookingOptions(params: BookingParams, pricing: any): any[] {
    return [
      {
        type: 'standard',
        room: params.roomType || 'standard',
        price: pricing.totalAmount,
        amenities: this.getIncludedAmenities(params.roomType),
        cancellation: 'Free cancellation 48h before'
      },
      {
        type: 'premium',
        room: 'deluxe',
        price: pricing.totalAmount * 1.3,
        amenities: this.getIncludedAmenities('deluxe'),
        cancellation: 'Free cancellation 24h before'
      }
    ];
  }

  private generatePackageRecommendations(params: QuoteParams): any[] {
    return [
      {
        name: 'Essential Package',
        price: 250,
        inclusions: ['Accommodation', 'Breakfast', 'Airport transfer']
      },
      {
        name: 'Premium Package', 
        price: 400,
        inclusions: ['Accommodation', 'All meals', 'Spa access', 'Activities']
      },
      {
        name: 'Luxury Package',
        price: 600,
        inclusions: ['Suite accommodation', 'All meals', 'Spa treatments', 'Private excursions']
      }
    ];
  }

  private async checkDetailedAvailability(dates: any, guests: number, roomType?: string): Promise<any> {
    return {
      results: {
        available: true,
        roomsAvailable: 5,
        roomType: roomType || 'standard'
      },
      alternatives: [],
      calendar: {} // Availability calendar would go here
    };
  }

  private getAvailableActivities(params: any): any[] {
    return Array.from(this.activities.values()).map(activity => ({
      ...activity,
      available: true,
      timeSlots: ['09:00', '14:00', '16:00']
    }));
  }

  private generateActivitySchedule(params: any, activities: any[]): any {
    return {
      recommended: activities.slice(0, 3),
      alternatives: activities.slice(3),
      totalCost: activities.slice(0, 3).reduce((sum, act) => sum + act.price, 0),
      availableSlots: ['Morning', 'Afternoon', 'Evening']
    };
  }

  private initializeRoomRates(): void {
    this.roomRates.set('standard', 200);
    this.roomRates.set('deluxe', 300);
    this.roomRates.set('suite', 500);
    this.roomRates.set('villa', 800);
  }

  private initializePackageRates(): void {
    this.packageRates.set('standard', 250);
    this.packageRates.set('family', 350);
    this.packageRates.set('honeymoon', 450);
    this.packageRates.set('business', 300);
    this.packageRates.set('spa', 400);
  }

  private initializeActivities(): void {
    this.activities.set('spa', { name: 'Spa Treatment', price: 100, duration: '2 hours' });
    this.activities.set('snorkeling', { name: 'Snorkeling Trip', price: 75, duration: '3 hours' });
    this.activities.set('massage', { name: 'Massage Therapy', price: 80, duration: '1 hour' });
    this.activities.set('excursion', { name: 'Island Excursion', price: 120, duration: '4 hours' });
  }

  private getRequiredBookingInfo(): string[] {
    return ['Check-in date', 'Check-out date', 'Number of guests', 'Room preference'];
  }

  private getSeasonalInfo(): any {
    return {
      currentSeason: 'High Season',
      surcharge: '20%',
      nextSeason: 'Low Season (starts in 2 months)'
    };
  }

  private getIncludedAmenities(roomType?: string): string[] {
    const baseAmenities = ['WiFi', 'Air conditioning', 'Daily housekeeping'];
    
    if (roomType === 'deluxe') {
      return [...baseAmenities, 'Balcony', 'Mini-bar', 'Premium toiletries'];
    } else if (roomType === 'suite') {
      return [...baseAmenities, 'Living area', 'Kitchenette', 'Butler service', 'Premium amenities'];
    }
    
    return baseAmenities;
  }

  private getUpgradeOptions(roomType?: string): any[] {
    if (roomType === 'standard') {
      return [
        { type: 'deluxe', additionalCost: 100, benefits: ['Larger room', 'Better view'] },
        { type: 'suite', additionalCost: 300, benefits: ['Separate living area', 'Premium amenities'] }
      ];
    }
    return [];
  }

  private getPackageInclusions(packageType?: string): string[] {
    const baseInclusions = ['Accommodation', 'Breakfast'];
    
    if (packageType === 'family') {
      return [...baseInclusions, 'Kids activities', 'Family dining options'];
    } else if (packageType === 'honeymoon') {
      return [...baseInclusions, 'Romantic dinner', 'Couples spa treatment', 'Champagne welcome'];
    } else if (packageType === 'spa') {
      return [...baseInclusions, 'Spa access', 'Wellness activities', 'Healthy meals'];
    }
    
    return baseInclusions;
  }

  private getSeasonalDiscounts(): any[] {
    return [
      { season: 'Low Season', discount: '25%', period: 'May - September' },
      { season: 'Shoulder Season', discount: '15%', period: 'October - November' }
    ];
  }

  private getGroupDiscounts(guests: number): any {
    if (guests >= 10) {
      return { discount: '20%', description: 'Group of 10+ guests' };
    } else if (guests >= 6) {
      return { discount: '10%', description: 'Group of 6+ guests' };
    }
    return null;
  }

  private getEarlyBookingOffers(): any {
    return {
      discount: '15%',
      condition: 'Book 60 days in advance',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };
  }
}

export default ResortBusinessLogicService;