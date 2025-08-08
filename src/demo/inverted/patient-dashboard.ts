// Patient Dashboard Data Management Functions - TypeScript

// Type definitions
interface BloodPressure {
  systolic: number;
  diastolic: number;
}

interface Allergy {
  name: string;
  severity: "Mild" | "Moderate" | "Severe";
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  prescribedDate: string;
}

interface PatientData {
  name: string;
  patientId: string;
  dob: string;
  age: number;
  bloodPressure: BloodPressure;
  bloodSugar: number;
  lastVisit: string;
  totalVisits: number;
  nextAppointment: string;
  allergies: Allergy[];
  medications: Medication[];
}

interface PatientContext extends PatientData {
  timestamp: string;
  lastUpdated: string;
}

interface PartialPatientData {
  name?: string;
  patientId?: string;
  dob?: string;
  age?: number;
  bloodPressure?: BloodPressure;
  bloodSugar?: number;
  lastVisit?: string;
  totalVisits?: number;
  nextAppointment?: string;
  allergies?: Allergy[];
  medications?: Medication[];
}

// Patient data store
let patientData: PatientData = {
  name: "John Peterson",
  patientId: "PT-2024-001",
  dob: "March 15, 1985",
  age: 40,
  bloodPressure: { systolic: 120, diastolic: 80 },
  bloodSugar: 95,
  lastVisit: "Jan 15, 2025",
  totalVisits: 12,
  nextAppointment: "Feb 10, 2025",
  allergies: [
    { name: "Penicillin", severity: "Severe" },
    { name: "Shellfish", severity: "Moderate" },
  ],
  medications: [
    {
      name: "Lisinopril",
      dosage: "10mg",
      frequency: "Daily",
      prescribedDate: "Jan 1, 2025",
    },
    {
      name: "Metformin",
      dosage: "500mg",
      frequency: "Twice daily",
      prescribedDate: "Dec 15, 2024",
    },
  ],
};

// Update blood pressure reading
function updateBloodPressure(systolic: number, diastolic: number): void {
  const bpElement = document.getElementById("last-bp");
  if (bpElement) {
    bpElement.textContent = `${systolic}/${diastolic}`;
    console.log(`Blood pressure updated to: ${systolic}/${diastolic} mmHg`);

    // Update internal data
    patientData.bloodPressure = { systolic, diastolic };

    // Add to medical history
    addMedicalHistoryEntry("🩺", "Blood Pressure Check", "Today");
  }
}

// Update blood sugar level
function updateBloodSugar(value: number): void {
  const sugarElement = document.getElementById("last-sugar");
  if (sugarElement) {
    sugarElement.textContent = value.toString();
    console.log(`Blood sugar updated to: ${value} mg/dL`);

    // Update internal data
    patientData.bloodSugar = value;

    // Add to medical history
    addMedicalHistoryEntry("🩸", "Blood Sugar Test", "Today");
  }
}

// Update last visit date
function updateLastVisit(date: string): void {
  const visitElement = document.getElementById("last-visit");
  if (visitElement) {
    visitElement.textContent = date;
    console.log(`Last visit updated to: ${date}`);

    // Update internal data
    patientData.lastVisit = date;
  }
}

// Update total visits count
function updateTotalVisits(count: number): void {
  const visitsElement = document.getElementById("total-visits");
  if (visitsElement) {
    visitsElement.textContent = count.toString();
    console.log(`Total visits updated to: ${count}`);

    // Update internal data
    patientData.totalVisits = count;
  }
}

// Update next appointment
function updateNextAppointment(date: string): void {
  const appointmentElement = document.getElementById("next-appointment");
  if (appointmentElement) {
    appointmentElement.textContent = date;
    console.log(`Next appointment updated to: ${date}`);

    // Update internal data
    patientData.nextAppointment = date;
  }
}

// Add or update allergies
function updateAllergies(allergies: Allergy[]): void {
  const allergyItemsElement = document.getElementById("allergy-items");
  const allergyCountElement = document.getElementById("allergy-count");

  if (allergyItemsElement && allergyCountElement) {
    // Update allergy list
    const allergyList = allergies
      .map((allergy) => `• ${allergy.name} (${allergy.severity})`)
      .join("<br>");
    allergyItemsElement.innerHTML = allergyList;

    // Update count
    allergyCountElement.textContent = allergies.length.toString();

    // Update internal data
    patientData.allergies = allergies;

    console.log(`Allergies updated:`, allergies);
  }
}

// Add a new medication
function addMedication(medication: Medication): void {
  // Add to internal data
  patientData.medications.push(medication);

  // Update the medications display
  updateMedicationsDisplay();

  // Add to medical history
  addMedicalHistoryEntry("💊", `New Medication: ${medication.name}`, "Today");

  console.log(`Medication added:`, medication);
}

// Update medications display
function updateMedicationsDisplay(): void {
  const medicationsListElement = document.getElementById("medications-list");
  if (medicationsListElement && patientData.medications.length > 0) {
    const medicationsList = patientData.medications
      .map(
        (med) =>
          `<div class="medication-item">
        <div class="medication-name">${med.name}</div>
        <div class="medication-details">${med.dosage} - ${med.frequency}</div>
        <div class="medication-date">Prescribed: ${med.prescribedDate}</div>
      </div>`
      )
      .join("");
    medicationsListElement.innerHTML = medicationsList;
  }
}

// Toggle medications section
function toggleMedications(): void {
  const medicationsSection = document.getElementById("medications-section");
  const toggleButton = document.getElementById("medications-toggle");

  if (medicationsSection && toggleButton) {
    const isExpanded = medicationsSection.style.display !== "none";

    if (isExpanded) {
      medicationsSection.style.display = "none";
      toggleButton.textContent = "▼ Current Medications (Click to expand)";
    } else {
      medicationsSection.style.display = "block";
      toggleButton.textContent = "▲ Current Medications (Click to collapse)";
      updateMedicationsDisplay();
    }
  }
}

// Add a new medical history entry
function addMedicalHistoryEntry(
  icon: string,
  title: string,
  time: string
): void {
  const historyList = document.getElementById("medical-history");
  if (historyList) {
    const newEntry = document.createElement("li");
    newEntry.className = "activity-item";
    newEntry.innerHTML = `
      <div class="activity-icon">${icon}</div>
      <div class="activity-details">
        <div class="activity-title">${title}</div>
        <div class="activity-time">${time}</div>
      </div>
    `;

    // Add to the beginning of the list
    historyList.insertBefore(newEntry, historyList.firstChild);

    console.log(`Medical history entry added: ${title} - ${time}`);
  }
}

// Update patient basic information
function updatePatientInfo(
  name: string,
  patientId: string,
  dob: string,
  age: number
): void {
  const nameElement = document.querySelector(".user-details h1");
  const infoElement = document.querySelector(".user-details p");
  const avatarElement = document.querySelector(".avatar");

  if (nameElement && infoElement && avatarElement) {
    nameElement.textContent = `Patient: ${name}`;
    infoElement.textContent = `Patient ID: ${patientId} • DOB: ${dob} • Age: ${age}`;

    // Update avatar with initials
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
    avatarElement.textContent = initials;

    // Update internal data
    patientData.name = name;
    patientData.patientId = patientId;
    patientData.dob = dob;
    patientData.age = age;

    console.log(`Patient info updated for: ${name}`);
  }
}

// Comprehensive patient data update function
function updatePatientDashboard(newPatientData: PartialPatientData): void {
  if (
    newPatientData.name &&
    newPatientData.patientId &&
    newPatientData.dob &&
    newPatientData.age !== undefined
  ) {
    updatePatientInfo(
      newPatientData.name,
      newPatientData.patientId,
      newPatientData.dob,
      newPatientData.age
    );
  }

  if (newPatientData.bloodPressure) {
    updateBloodPressure(
      newPatientData.bloodPressure.systolic,
      newPatientData.bloodPressure.diastolic
    );
  }

  if (newPatientData.bloodSugar !== undefined) {
    updateBloodSugar(newPatientData.bloodSugar);
  }

  if (newPatientData.lastVisit) {
    updateLastVisit(newPatientData.lastVisit);
  }

  if (newPatientData.totalVisits !== undefined) {
    updateTotalVisits(newPatientData.totalVisits);
  }

  if (newPatientData.nextAppointment) {
    updateNextAppointment(newPatientData.nextAppointment);
  }

  if (newPatientData.allergies) {
    updateAllergies(newPatientData.allergies);
  }

  if (newPatientData.medications) {
    patientData.medications = newPatientData.medications;
    updateMedicationsDisplay();
  }

  console.log("Patient dashboard updated with:", newPatientData);
}

// Get complete patient context
function getContext(): PatientContext {
  const context: PatientContext = {
    ...patientData,
    timestamp: new Date().toISOString(),
    lastUpdated: new Date().toLocaleString(),
  };

  console.log("Patient context retrieved:", context);
  return context;
}

// Example usage functions (for testing)
function simulateBloodPressureUpdate(): void {
  const systolic = Math.floor(Math.random() * 40) + 110; // 110-150
  const diastolic = Math.floor(Math.random() * 30) + 70; // 70-100
  updateBloodPressure(systolic, diastolic);
}

function simulateBloodSugarUpdate(): void {
  const sugar = Math.floor(Math.random() * 50) + 80; // 80-130
  updateBloodSugar(sugar);
}

function simulateVisitUpdate(): void {
  const currentVisitsElement = document.getElementById("total-visits");
  if (currentVisitsElement) {
    const currentVisits = parseInt(currentVisitsElement.textContent || "0");
    updateTotalVisits(currentVisits + 1);
    updateLastVisit("Today");
    addMedicalHistoryEntry("🏥", "Regular Checkup", "Today");
  }
}

function simulateAddMedication(): void {
  const medications: Medication[] = [
    {
      name: "Aspirin",
      dosage: "81mg",
      frequency: "Daily",
      prescribedDate: "Today",
    },
    {
      name: "Vitamin D",
      dosage: "1000IU",
      frequency: "Daily",
      prescribedDate: "Today",
    },
    {
      name: "Omega-3",
      dosage: "1000mg",
      frequency: "Twice daily",
      prescribedDate: "Today",
    },
  ];

  const randomMed = medications[Math.floor(Math.random() * medications.length)];
  addMedication(randomMed);
}

// Initialize dashboard when DOM is loaded
function initializeDashboard(): void {
  // Initial medications display
  updateMedicationsDisplay();

  // Log available functions
  console.log("Patient Dashboard Functions Available:");
  console.log(
    "- patientDashboard.updateBloodPressure(systolic: number, diastolic: number)"
  );
  console.log("- patientDashboard.updateBloodSugar(value: number)");
  console.log("- patientDashboard.updateLastVisit(date: string)");
  console.log("- patientDashboard.updateTotalVisits(count: number)");
  console.log("- patientDashboard.updateNextAppointment(date: string)");
  console.log("- patientDashboard.updateAllergies(allergies: Allergy[])");
  console.log("- patientDashboard.addMedication(medication: Medication)");
  console.log(
    "- patientDashboard.addMedicalHistoryEntry(icon: string, title: string, time: string)"
  );
  console.log(
    "- patientDashboard.updatePatientInfo(name: string, id: string, dob: string, age: number)"
  );
  console.log(
    "- patientDashboard.updatePatientDashboard(patientData: PartialPatientData)"
  );
  console.log(
    "- patientDashboard.getContext(): PatientContext - Returns complete patient data"
  );
  console.log(
    "- patientDashboard.toggleMedications() - Toggle medications section"
  );
  console.log("\nTest functions:");
  console.log("- patientDashboard.simulateBloodPressureUpdate()");
  console.log("- patientDashboard.simulateBloodSugarUpdate()");
  console.log("- patientDashboard.simulateVisitUpdate()");
  console.log("- patientDashboard.simulateAddMedication()");
}

// Patient Dashboard API interface
interface PatientDashboardAPI {
  updateBloodPressure: (systolic: number, diastolic: number) => void;
  updateBloodSugar: (value: number) => void;
  updateLastVisit: (date: string) => void;
  updateTotalVisits: (count: number) => void;
  updateNextAppointment: (date: string) => void;
  updateAllergies: (allergies: Allergy[]) => void;
  addMedication: (medication: Medication) => void;
  addMedicalHistoryEntry: (icon: string, title: string, time: string) => void;
  updatePatientInfo: (
    name: string,
    patientId: string,
    dob: string,
    age: number
  ) => void;
  updatePatientDashboard: (patientData: PartialPatientData) => void;
  getContext: () => PatientContext;
  toggleMedications: () => void;
  // Test functions
  simulateBloodPressureUpdate: () => void;
  simulateBloodSugarUpdate: () => void;
  simulateVisitUpdate: () => void;
  simulateAddMedication: () => void;
  // Initialize
  initializeDashboard: () => void;
}

// Export functions to global scope
declare global {
  interface Window {
    patientDashboard: PatientDashboardAPI;
  }
}

window.patientDashboard = {
  updateBloodPressure,
  updateBloodSugar,
  updateLastVisit,
  updateTotalVisits,
  updateNextAppointment,
  updateAllergies,
  addMedication,
  addMedicalHistoryEntry,
  updatePatientInfo,
  updatePatientDashboard,
  getContext,
  toggleMedications,
  // Test functions
  simulateBloodPressureUpdate,
  simulateBloodSugarUpdate,
  simulateVisitUpdate,
  simulateAddMedication,
  // Initialize
  initializeDashboard,
};

// Export types for external use
export type {
  BloodPressure,
  Allergy,
  Medication,
  PatientData,
  PatientContext,
  PartialPatientData,
  PatientDashboardAPI,
};
