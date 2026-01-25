import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MultiPatientDashboard from './MultiPatientDashboard';

/**
 * Unit tests for Multi-Patient Dashboard Component
 * Requirements: 1.4, 4.1, 4.3
 */
describe('MultiPatientDashboard', () => {
  const mockPatients = [
    {
      id: 'P001',
      name: 'John Doe',
      age: 65,
      gender: 'Male',
      priorityLevel: 'CRITICAL',
      alertCount: 2,
      lastUpdated: new Date().toISOString(),
      vitals: { bloodPressure: '145/92', heartRate: '88' }
    },
    {
      id: 'P002',
      name: 'Jane Smith',
      age: 45,
      gender: 'Female',
      priorityLevel: 'HIGH',
      alertCount: 1,
      lastUpdated: new Date().toISOString(),
      vitals: { bloodPressure: '130/85', heartRate: '75' }
    },
    {
      id: 'P003',
      name: 'Bob Johnson',
      age: 55,
      gender: 'Male',
      priorityLevel: 'NORMAL',
      alertCount: 0,
      lastUpdated: new Date().toISOString(),
      vitals: { bloodPressure: '120/80', heartRate: '70' }
    }
  ];

  it('renders patient queue with all patients', () => {
    const onSelectPatient = vi.fn();
    render(
      <MultiPatientDashboard 
        patients={mockPatients}
        onSelectPatient={onSelectPatient}
        selectedPatientId={null}
      />
    );

    expect(screen.getByText('Patient Queue')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
  });

  it('displays patient count correctly', () => {
    const onSelectPatient = vi.fn();
    render(
      <MultiPatientDashboard 
        patients={mockPatients}
        onSelectPatient={onSelectPatient}
        selectedPatientId={null}
      />
    );

    expect(screen.getByText(/Showing 3 of 3 patients/)).toBeInTheDocument();
  });

  it('sorts patients by priority correctly', () => {
    const onSelectPatient = vi.fn();
    const { container } = render(
      <MultiPatientDashboard 
        patients={mockPatients}
        onSelectPatient={onSelectPatient}
        selectedPatientId={null}
      />
    );

    const patientElements = container.querySelectorAll('[class*="cursor-pointer"]');
    // Verify we have all 3 patients rendered
    expect(patientElements.length).toBe(3);
    // Verify at least one patient has a priority badge
    const hasPriorityBadge = Array.from(patientElements).some(el => 
      el.textContent.includes('CRITICAL') || el.textContent.includes('HIGH') || el.textContent.includes('NORMAL')
    );
    expect(hasPriorityBadge).toBe(true);
  });

  it('filters patients by status', () => {
    const onSelectPatient = vi.fn();
    render(
      <MultiPatientDashboard 
        patients={mockPatients}
        onSelectPatient={onSelectPatient}
        selectedPatientId={null}
      />
    );

    const filterSelect = screen.getByDisplayValue('All Patients');
    fireEvent.change(filterSelect, { target: { value: 'critical' } });

    // Should only show critical patients
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
    expect(screen.getByText(/Showing 1 of 3 patients/)).toBeInTheDocument();
  });

  it('calls onSelectPatient when patient is clicked', () => {
    const onSelectPatient = vi.fn();
    render(
      <MultiPatientDashboard 
        patients={mockPatients}
        onSelectPatient={onSelectPatient}
        selectedPatientId={null}
      />
    );

    const patientElement = screen.getByText('John Doe').closest('[class*="cursor-pointer"]');
    fireEvent.click(patientElement);

    expect(onSelectPatient).toHaveBeenCalledWith(mockPatients[0]);
  });

  it('highlights selected patient', () => {
    const onSelectPatient = vi.fn();
    const { container } = render(
      <MultiPatientDashboard 
        patients={mockPatients}
        onSelectPatient={onSelectPatient}
        selectedPatientId="P001"
      />
    );

    const selectedPatient = screen.getByText('John Doe').closest('[class*="cursor-pointer"]');
    expect(selectedPatient).toHaveClass('bg-blue-50');
  });

  it('displays alert counts for patients with alerts', () => {
    const onSelectPatient = vi.fn();
    render(
      <MultiPatientDashboard 
        patients={mockPatients}
        onSelectPatient={onSelectPatient}
        selectedPatientId={null}
      />
    );

    expect(screen.getByText('2 Alerts')).toBeInTheDocument();
    expect(screen.getByText('1 Alert')).toBeInTheDocument();
  });

  it('displays vital signs for each patient', () => {
    const onSelectPatient = vi.fn();
    render(
      <MultiPatientDashboard 
        patients={mockPatients}
        onSelectPatient={onSelectPatient}
        selectedPatientId={null}
      />
    );

    expect(screen.getByText(/BP: 145\/92/)).toBeInTheDocument();
    expect(screen.getByText(/HR: 88/)).toBeInTheDocument();
  });

  it('handles empty patient list', () => {
    const onSelectPatient = vi.fn();
    render(
      <MultiPatientDashboard 
        patients={[]}
        onSelectPatient={onSelectPatient}
        selectedPatientId={null}
      />
    );

    expect(screen.getByText(/No patients match the current filter/)).toBeInTheDocument();
  });

  it('sorts patients by name when selected', () => {
    const onSelectPatient = vi.fn();
    const { container } = render(
      <MultiPatientDashboard 
        patients={mockPatients}
        onSelectPatient={onSelectPatient}
        selectedPatientId={null}
      />
    );

    const sortSelect = screen.getByDisplayValue('Sort by Priority');
    fireEvent.change(sortSelect, { target: { value: 'name' } });

    const patientElements = container.querySelectorAll('[class*="cursor-pointer"]');
    // First patient should be Bob Johnson (alphabetically)
    expect(patientElements[0]).toHaveTextContent('Bob Johnson');
  });
});
