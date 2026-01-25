/**
 * Triage Queue Management System
 * For physician review only
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class TriageQueue extends EventEmitter {
  constructor() {
    super();
    this.queues = new Map(); // tenantId -> queue
    this.patientScores = new Map(); // patientId -> latest score
    this.queueHistory = new Map(); // patientId -> history array
    this.maxQueueSize = 1000;
    this.scoreExpiryTime = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Add or update patient in triage queue
   */
  addPatient(patientId, triageScore, tenantId) {
    if (!this.queues.has(tenantId)) {
      this.queues.set(tenantId, []);
    }

    const queue = this.queues.get(tenantId);
    
    // Remove existing entry if present
    const existingIndex = queue.findIndex(p => p.patientId === patientId);
    if (existingIndex !== -1) {
      queue.splice(existingIndex, 1);
    }

    // Create queue entry
    const queueEntry = {
      patientId: patientId,
      triageScore: triageScore,
      addedAt: new Date(),
      tenantId: tenantId,
      status: 'waiting',
      estimatedWaitTime: this.calculateWaitTime(triageScore.priorityLevel, queue.length)
    };

    // Insert in priority order
    this.insertByPriority(queue, queueEntry);
    
    // Store latest score
    this.patientScores.set(patientId, triageScore);
    
    // Update history
    this.updatePatientHistory(patientId, triageScore);
    
    // Emit events
    this.emit('patientAdded', queueEntry);
    this.emit('queueUpdated', { tenantId, queueLength: queue.length });

    // Cleanup old entries
    this.cleanupExpiredEntries(tenantId);

    return queueEntry;
  }

  /**
   * Insert patient in queue based on priority
   */
  insertByPriority(queue, entry) {
    const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'NORMAL': 2 };
    const entryPriority = priorityOrder[entry.triageScore.priorityLevel] || 2;
    
    let insertIndex = queue.length;
    
    for (let i = 0; i < queue.length; i++) {
      const queuePriority = priorityOrder[queue[i].triageScore.priorityLevel] || 2;
      
      if (entryPriority < queuePriority) {
        insertIndex = i;
        break;
      } else if (entryPriority === queuePriority) {
        // Same priority - order by urgency score (higher first)
        if (entry.triageScore.urgencyScore > queue[i].triageScore.urgencyScore) {
          insertIndex = i;
          break;
        } else if (entry.triageScore.urgencyScore === queue[i].triageScore.urgencyScore) {
          // Same urgency - order by time added (earlier first)
          if (entry.addedAt < queue[i].addedAt) {
            insertIndex = i;
            break;
          }
        }
      }
    }
    
    queue.splice(insertIndex, 0, entry);
  }

  /**
   * Get queue for a tenant
   */
  getQueue(tenantId, options = {}) {
    const queue = this.queues.get(tenantId) || [];
    const { limit = 50, status = null, priorityLevel = null } = options;
    
    let filteredQueue = queue;
    
    if (status) {
      filteredQueue = filteredQueue.filter(entry => entry.status === status);
    }
    
    if (priorityLevel) {
      filteredQueue = filteredQueue.filter(entry => 
        entry.triageScore.priorityLevel === priorityLevel);
    }
    
    return filteredQueue.slice(0, limit).map(entry => ({
      ...entry,
      disclaimer: 'For physician review only'
    }));
  }

  /**
   * Get next patient for treatment
   */
  getNextPatient(tenantId) {
    const queue = this.queues.get(tenantId) || [];
    const nextPatient = queue.find(entry => entry.status === 'waiting');
    
    if (nextPatient) {
      nextPatient.status = 'in-treatment';
      nextPatient.treatmentStarted = new Date();
      
      this.emit('patientCalled', nextPatient);
      this.emit('queueUpdated', { tenantId, queueLength: queue.length });
    }
    
    return nextPatient;
  }

  /**
   * Mark patient as treated
   */
  markPatientTreated(patientId, tenantId) {
    const queue = this.queues.get(tenantId) || [];
    const patientIndex = queue.findIndex(p => p.patientId === patientId);
    
    if (patientIndex !== -1) {
      const patient = queue[patientIndex];
      patient.status = 'treated';
      patient.treatmentCompleted = new Date();
      
      // Remove from active queue after a delay
      setTimeout(() => {
        const currentIndex = queue.findIndex(p => p.patientId === patientId);
        if (currentIndex !== -1) {
          queue.splice(currentIndex, 1);
          this.emit('queueUpdated', { tenantId, queueLength: queue.length });
        }
      }, 5 * 60 * 1000); // Remove after 5 minutes
      
      this.emit('patientTreated', patient);
      return patient;
    }
    
    return null;
  }

  /**
   * Update patient priority based on new assessment
   */
  updatePatientPriority(patientId, newTriageScore, tenantId) {
    const queue = this.queues.get(tenantId) || [];
    const patientIndex = queue.findIndex(p => p.patientId === patientId);
    
    if (patientIndex !== -1) {
      // Remove from current position
      const patient = queue.splice(patientIndex, 1)[0];
      
      // Update score and re-insert
      patient.triageScore = newTriageScore;
      patient.priorityUpdated = new Date();
      patient.estimatedWaitTime = this.calculateWaitTime(newTriageScore.priorityLevel, queue.length);
      
      this.insertByPriority(queue, patient);
      
      // Update stored score
      this.patientScores.set(patientId, newTriageScore);
      this.updatePatientHistory(patientId, newTriageScore);
      
      this.emit('priorityUpdated', patient);
      this.emit('queueUpdated', { tenantId, queueLength: queue.length });
      
      return patient;
    }
    
    return null;
  }

  /**
   * Calculate estimated wait time
   */
  calculateWaitTime(priorityLevel, queuePosition) {
    const baseWaitTimes = {
      'CRITICAL': 0, // Immediate
      'HIGH': 15,    // 15 minutes
      'NORMAL': 45   // 45 minutes
    };
    
    const baseTime = baseWaitTimes[priorityLevel] || 45;
    const positionMultiplier = Math.floor(queuePosition / 5) * 10; // 10 min per 5 people ahead
    
    return baseTime + positionMultiplier;
  }

  /**
   * Update patient history
   */
  updatePatientHistory(patientId, triageScore) {
    if (!this.queueHistory.has(patientId)) {
      this.queueHistory.set(patientId, []);
    }
    
    const history = this.queueHistory.get(patientId);
    history.push({
      timestamp: new Date(),
      triageScore: { ...triageScore },
      disclaimer: 'For physician review only'
    });
    
    // Keep only last 10 entries
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
  }

  /**
   * Get patient history
   */
  getPatientHistory(patientId) {
    return this.queueHistory.get(patientId) || [];
  }

  /**
   * Get queue statistics
   */
  getQueueStatistics(tenantId) {
    const queue = this.queues.get(tenantId) || [];
    
    const stats = {
      totalPatients: queue.length,
      byPriority: {
        CRITICAL: queue.filter(p => p.triageScore.priorityLevel === 'CRITICAL').length,
        HIGH: queue.filter(p => p.triageScore.priorityLevel === 'HIGH').length,
        NORMAL: queue.filter(p => p.triageScore.priorityLevel === 'NORMAL').length
      },
      byStatus: {
        waiting: queue.filter(p => p.status === 'waiting').length,
        inTreatment: queue.filter(p => p.status === 'in-treatment').length,
        treated: queue.filter(p => p.status === 'treated').length
      },
      averageWaitTime: this.calculateAverageWaitTime(queue),
      oldestWaiting: this.getOldestWaitingTime(queue),
      disclaimer: 'For physician review only'
    };
    
    return stats;
  }

  /**
   * Calculate average wait time
   */
  calculateAverageWaitTime(queue) {
    const waitingPatients = queue.filter(p => p.status === 'waiting');
    if (waitingPatients.length === 0) return 0;
    
    const totalWaitTime = waitingPatients.reduce((sum, patient) => {
      const waitTime = Date.now() - patient.addedAt.getTime();
      return sum + waitTime;
    }, 0);
    
    return Math.round(totalWaitTime / waitingPatients.length / (1000 * 60)); // minutes
  }

  /**
   * Get oldest waiting time
   */
  getOldestWaitingTime(queue) {
    const waitingPatients = queue.filter(p => p.status === 'waiting');
    if (waitingPatients.length === 0) return 0;
    
    const oldestPatient = waitingPatients.reduce((oldest, patient) => {
      return patient.addedAt < oldest.addedAt ? patient : oldest;
    });
    
    return Math.round((Date.now() - oldestPatient.addedAt.getTime()) / (1000 * 60)); // minutes
  }

  /**
   * Clean up expired entries
   */
  cleanupExpiredEntries(tenantId) {
    const queue = this.queues.get(tenantId) || [];
    const now = Date.now();
    
    const validEntries = queue.filter(entry => {
      const age = now - entry.addedAt.getTime();
      return age < this.scoreExpiryTime && entry.status !== 'treated';
    });
    
    if (validEntries.length !== queue.length) {
      this.queues.set(tenantId, validEntries);
      this.emit('queueCleaned', { tenantId, removedCount: queue.length - validEntries.length });
    }
  }

  /**
   * Get critical patients across all tenants (for system monitoring)
   */
  getCriticalPatients() {
    const criticalPatients = [];
    
    for (const [tenantId, queue] of this.queues.entries()) {
      const critical = queue.filter(p => 
        p.triageScore.priorityLevel === 'CRITICAL' && 
        p.status === 'waiting'
      );
      
      criticalPatients.push(...critical.map(p => ({
        ...p,
        tenantId,
        disclaimer: 'For physician review only'
      })));
    }
    
    return criticalPatients.sort((a, b) => b.triageScore.urgencyScore - a.triageScore.urgencyScore);
  }

  /**
   * Emergency escalation for critical patients
   */
  escalateCriticalPatients() {
    const criticalPatients = this.getCriticalPatients();
    const longWaitingCritical = criticalPatients.filter(p => {
      const waitTime = Date.now() - p.addedAt.getTime();
      return waitTime > 10 * 60 * 1000; // 10 minutes
    });
    
    if (longWaitingCritical.length > 0) {
      this.emit('criticalEscalation', {
        patients: longWaitingCritical,
        message: 'Critical patients waiting over 10 minutes require immediate attention'
      });
    }
    
    return longWaitingCritical;
  }
}

module.exports = TriageQueue;