import React, { useState, useEffect } from 'react';
import { AlertTriangle, Activity, Heart, TrendingUp, Clock } from 'lucide-react';

/**
 * Multi-Patient Monitoring Dashboard Component
 * Displays real-time overview of multiple patients with status indicators
 * Requirements: 1.4, 4.1, 4.3
 */
const MultiPatientDashboard = ({ patients, onSelectPatient, selectedPatientId }) => {
  const [sortBy, setSortBy] = useState('priority'); // priority, name, lastUpdate
  const [filterStatus, setFilterStatus] = useState('all'); // all, critical, high, normal

  // Sort and filter patients
  const processedPatients = patients
    .filter(p => filterStatus === 'all' || p.priorityLevel?.toLowerCase() === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'NORMAL': 2 };
        return (priorityOrder[a.priorityLevel] || 3) - (priorityOrder[b.priorityLevel] || 3);
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'lastUpdate') {
        return new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0);
      }
      return 0;
    });

  const getPriorityColor = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-300';
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'NORMAL': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL': return <AlertTriangle className="w-4 h-4" />;
      case 'HIGH': return <TrendingUp className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
      {/* Header with filters */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900">Patient Queue</h2>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs px-2 py-1 border border-slate-300 rounded bg-white"
            >
              <option value="priority">Sort by Priority</option>
              <option value="name">Sort by Name</option>
              <option value="lastUpdate">Sort by Update</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs px-2 py-1 border border-slate-300 rounded bg-white"
            >
              <option value="all">All Patients</option>
              <option value="critical">Critical Only</option>
              <option value="high">High Priority</option>
              <option value="normal">Normal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Patient list */}
      <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
        {processedPatients.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No patients match the current filter</p>
          </div>
        ) : (
          processedPatients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => onSelectPatient(patient)}
              className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${
                selectedPatientId === patient.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 truncate">{patient.name}</h3>
                    <span className="text-xs text-slate-500">#{patient.id}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span>{patient.age}y</span>
                    <span>•</span>
                    <span>{patient.gender}</span>
                    {patient.lastUpdated && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(patient.lastUpdated).toLocaleTimeString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded border flex items-center gap-1 ${getPriorityColor(patient.priorityLevel)}`}>
                    {getPriorityIcon(patient.priorityLevel)}
                    {patient.priorityLevel || 'NORMAL'}
                  </span>
                  {patient.alertCount > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                      {patient.alertCount} Alert{patient.alertCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              {patient.vitals && (
                <div className="mt-2 flex gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-red-500" />
                    <span className="text-slate-700">BP: {patient.vitals.bloodPressure || 'N/A'}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3 text-blue-500" />
                    <span className="text-slate-700">HR: {patient.vitals.heartRate || 'N/A'}</span>
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer with count */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 text-center">
        Showing {processedPatients.length} of {patients.length} patients
      </div>
    </div>
  );
};

export default MultiPatientDashboard;
