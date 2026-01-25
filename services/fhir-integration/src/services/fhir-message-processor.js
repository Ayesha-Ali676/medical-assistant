/**
 * FHIR Message Processing Service
 * Handles HL7 FHIR R4 message processing and validation
 * For physician review only
 */

const { FHIRPatient, FHIRObservation, FHIRMedicationRequest, FHIRBundle } = require('../../../shared/models/fhir');
const FHIRTransformer = require('../../../shared/utils/fhir-transformer');

class FHIRMessageProcessor {
  constructor(dbManager) {
    this.dbManager = dbManager;
    this.supportedResources = ['Patient', 'Observation', 'MedicationRequest', 'Bundle', 'Encounter'];
  }

  /**
   * Process incoming FHIR message
   */
  async processMessage(fhirMessage, tenantId) {
    try {
      const startTime = Date.now();
      
      // Validate message structure
      this.validateMessage(fhirMessage);
      
      // Determine resource type and process accordingly
      const resourceType = fhirMessage.resourceType;
      
      let result;
      switch (resourceType) {
        case 'Bundle':
          result = await this.processBundle(fhirMessage, tenantId);
          break;
        case 'Patient':
          result = await this.processPatient(fhirMessage, tenantId);
          break;
        case 'Observation':
          result = await this.processObservation(fhirMessage, tenantId);
          break;
        case 'MedicationRequest':
          result = await this.processMedicationRequest(fhirMessage, tenantId);
          break;
        case 'Encounter':
          result = await this.processEncounter(fhirMessage, tenantId);
          break;
        default:
          throw new Error(`Unsupported resource type: ${resourceType}`);
      }
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        resourceType,
        resourceId: result.id,
        processingTime,
        message: 'FHIR message processed successfully - For physician review only'
      };
    } catch (error) {
      console.error('FHIR message processing e