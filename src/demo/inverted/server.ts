/**
 * Patient Dashboard - MCP Server with Patient Management Tools
 *
 * This demonstrates an MCP Server running in the OUTER FRAME that embeds
 * an MCP Client in an iframe. The server provides tools that give the
 * client access to patient data and dashboard update functions.
 *
 * Architecture: Outer Frame MCP Server + Inner Frame MCP Client
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  OuterFrameTransport,
  IframeWindowControl,
} from "$sdk/transport/postmessage/index.js";
import { generateSessionId } from "$sdk/utils/helpers.js";

// ============================================================================
// TYPE DEFINITIONS (matching patient-dashboard.ts)
// ============================================================================

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

// ============================================================================
// PATIENT DASHBOARD FUNCTIONS WRAPPER
// ============================================================================

class PatientDashboardService {
  // Helper to safely call window.patientDashboard functions
  private static callDashboardFunction(
    functionName: string,
    ...args: any[]
  ): any {
    if (typeof window !== "undefined" && window.patientDashboard) {
      const func = (window.patientDashboard as any)[functionName];
      if (typeof func === "function") {
        return func(...args);
      } else {
        throw new Error(
          `Function ${functionName} not found on patientDashboard`
        );
      }
    } else {
      throw new Error("patientDashboard not available on window object");
    }
  }

  static updateBloodPressure(systolic: number, diastolic: number): void {
    this.callDashboardFunction("updateBloodPressure", systolic, diastolic);
  }

  static updateBloodSugar(value: number): void {
    this.callDashboardFunction("updateBloodSugar", value);
  }

  static updateLastVisit(date: string): void {
    this.callDashboardFunction("updateLastVisit", date);
  }

  static updateTotalVisits(count: number): void {
    this.callDashboardFunction("updateTotalVisits", count);
  }

  static updateNextAppointment(date: string): void {
    this.callDashboardFunction("updateNextAppointment", date);
  }

  static updateAllergies(allergies: Allergy[]): void {
    this.callDashboardFunction("updateAllergies", allergies);
  }

  static addMedication(medication: Medication): void {
    this.callDashboardFunction("addMedication", medication);
  }

  static getContext(): any {
    return this.callDashboardFunction("getContext");
  }

  static addMedicalHistoryEntry(
    icon: string,
    title: string,
    time: string
  ): void {
    this.callDashboardFunction("addMedicalHistoryEntry", icon, title, time);
  }

  static updatePatientInfo(
    name: string,
    patientId: string,
    dob: string,
    age: number
  ): void {
    this.callDashboardFunction("updatePatientInfo", name, patientId, dob, age);
  }
}

// ============================================================================
// MCP SERVER SETUP
// ============================================================================

function createPatientDashboardServer(): McpServer {
  const server = new McpServer({
    name: "patient-dashboard",
    version: "1.0.0",
  });

  // Tool: Update Blood Pressure
  server.registerTool(
    "updateBloodPressure",
    {
      title: "Update Blood Pressure",
      description: "Update the patient's blood pressure reading",
      inputSchema: {
        systolic: z
          .number()
          .min(50)
          .max(300)
          .describe("Systolic blood pressure (mmHg)"),
        diastolic: z
          .number()
          .min(30)
          .max(200)
          .describe("Diastolic blood pressure (mmHg)"),
      },
    },
    async ({ systolic, diastolic }) => {
      try {
        PatientDashboardService.updateBloodPressure(systolic, diastolic);

        return {
          content: [
            {
              type: "text",
              text: `✅ **Blood Pressure Updated Successfully**

**New Reading:** ${systolic}/${diastolic} mmHg

The blood pressure has been recorded and added to the patient's medical history. The dashboard has been updated to reflect this new measurement.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ **Error updating blood pressure:** ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // Tool: Update Blood Sugar
  server.registerTool(
    "updateBloodSugar",
    {
      title: "Update Blood Sugar",
      description: "Update the patient's blood sugar level",
      inputSchema: {
        value: z
          .number()
          .min(20)
          .max(600)
          .describe("Blood sugar level (mg/dL)"),
      },
    },
    async ({ value }) => {
      try {
        PatientDashboardService.updateBloodSugar(value);

        const status = value < 70 ? "Low" : value > 140 ? "High" : "Normal";
        const statusIcon = value < 70 ? "⚠️" : value > 140 ? "🔴" : "✅";

        return {
          content: [
            {
              type: "text",
              text: `${statusIcon} **Blood Sugar Updated Successfully**

**New Reading:** ${value} mg/dL (${status})

The blood sugar level has been recorded and added to the patient's medical history. The dashboard has been updated with this new measurement.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ **Error updating blood sugar:** ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // Tool: Update Last Visit
  server.registerTool(
    "updateLastVisit",
    {
      title: "Update Last Visit Date",
      description: "Update the date of the patient's last visit",
      inputSchema: {
        date: z
          .string()
          .describe("Last visit date (e.g., 'Jan 15, 2025' or 'Today')"),
      },
    },
    async ({ date }) => {
      try {
        PatientDashboardService.updateLastVisit(date);

        return {
          content: [
            {
              type: "text",
              text: `📅 **Last Visit Date Updated**

**New Date:** ${date}

The patient's last visit date has been successfully updated in the dashboard.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ **Error updating last visit date:** ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // Tool: Update Total Visits
  server.registerTool(
    "updateTotalVisits",
    {
      title: "Update Total Visits Count",
      description: "Update the total number of patient visits",
      inputSchema: {
        count: z.number().min(0).describe("Total number of visits"),
      },
    },
    async ({ count }) => {
      try {
        PatientDashboardService.updateTotalVisits(count);

        return {
          content: [
            {
              type: "text",
              text: `📊 **Total Visits Updated**

**New Count:** ${count} visits

The total visit count has been successfully updated in the patient dashboard.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ **Error updating total visits:** ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // Tool: Update Next Appointment
  server.registerTool(
    "updateNextAppointment",
    {
      title: "Update Next Appointment",
      description: "Update the patient's next scheduled appointment",
      inputSchema: {
        date: z
          .string()
          .describe("Next appointment date (e.g., 'Feb 10, 2025')"),
      },
    },
    async ({ date }) => {
      try {
        PatientDashboardService.updateNextAppointment(date);

        return {
          content: [
            {
              type: "text",
              text: `🗓️ **Next Appointment Updated**

**Scheduled for:** ${date}

The patient's next appointment has been successfully scheduled and updated in the dashboard.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ **Error updating next appointment:** ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // Tool: Update Allergies
  server.registerTool(
    "updateAllergies",
    {
      title: "Update Patient Allergies",
      description: "Update the patient's allergy information",
      inputSchema: {
        allergies: z
          .array(
            z.object({
              name: z.string().describe("Allergy name"),
              severity: z
                .enum(["Mild", "Moderate", "Severe"])
                .describe("Severity level"),
            })
          )
          .describe("Array of patient allergies"),
      },
    },
    async ({ allergies }) => {
      try {
        PatientDashboardService.updateAllergies(allergies);

        const allergyList = allergies
          .map((a: Allergy) => `• ${a.name} (${a.severity})`)
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `🚨 **Allergies Updated Successfully**

**Updated Allergies:**
${allergyList}

Total: ${allergies.length} allergies recorded

The patient's allergy information has been updated in the dashboard. Medical staff will be alerted to these allergies during treatment.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ **Error updating allergies:** ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // Tool: Add Medication
  server.registerTool(
    "addMedication",
    {
      title: "Add New Medication",
      description: "Add a new medication to the patient's prescription list",
      inputSchema: {
        name: z.string().describe("Medication name"),
        dosage: z.string().describe("Dosage (e.g., '10mg', '500mg')"),
        frequency: z
          .string()
          .describe("Frequency (e.g., 'Daily', 'Twice daily', 'As needed')"),
        prescribedDate: z
          .string()
          .optional()
          .describe("Date prescribed (defaults to 'Today')"),
      },
    },
    async ({ name, dosage, frequency, prescribedDate = "Today" }) => {
      try {
        const medication: Medication = {
          name,
          dosage,
          frequency,
          prescribedDate,
        };

        PatientDashboardService.addMedication(medication);

        return {
          content: [
            {
              type: "text",
              text: `💊 **New Medication Added Successfully**

**Medication:** ${name}
**Dosage:** ${dosage}
**Frequency:** ${frequency}
**Prescribed:** ${prescribedDate}

The medication has been added to the patient's prescription list and recorded in their medical history. Please ensure the patient understands the dosage and frequency instructions.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ **Error adding medication:** ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // Tool: Get Patient Context
  server.registerTool(
    "getContext",
    {
      title: "Get Patient Context",
      description:
        "Retrieve complete patient information and current dashboard state",
      inputSchema: {},
    },
    async () => {
      try {
        const context = PatientDashboardService.getContext();

        return {
          content: [
            {
              type: "text",
              text: `👤 **Complete Patient Context**

**Patient Information:**
- **Name:** ${context.name}
- **ID:** ${context.patientId}
- **DOB:** ${context.dob} (Age: ${context.age})

**Vital Signs:**
- **Blood Pressure:** ${context.bloodPressure.systolic}/${
                context.bloodPressure.diastolic
              } mmHg
- **Blood Sugar:** ${context.bloodSugar} mg/dL

**Visit Information:**
- **Last Visit:** ${context.lastVisit}
- **Total Visits:** ${context.totalVisits}
- **Next Appointment:** ${context.nextAppointment}

**Allergies:** ${
                context.allergies.length > 0
                  ? context.allergies
                      .map((a: Allergy) => `${a.name} (${a.severity})`)
                      .join(", ")
                  : "None recorded"
              }

**Current Medications:** ${
                context.medications.length > 0
                  ? context.medications
                      .map((m: Medication) => `${m.name} ${m.dosage}`)
                      .join(", ")
                  : "None prescribed"
              }

**Last Updated:** ${context.lastUpdated}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ **Error retrieving patient context:** ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // Tool: Add Medical History Entry
  server.registerTool(
    "addMedicalHistoryEntry",
    {
      title: "Add Medical History Entry",
      description: "Add a new entry to the patient's medical history timeline",
      inputSchema: {
        icon: z.string().describe("Icon for the entry (emoji)"),
        title: z.string().describe("Title/description of the medical event"),
        time: z
          .string()
          .optional()
          .describe("Time of the event (defaults to 'Today')"),
      },
    },
    async ({ icon, title, time = "Today" }) => {
      try {
        PatientDashboardService.addMedicalHistoryEntry(icon, title, time);

        return {
          content: [
            {
              type: "text",
              text: `📝 **Medical History Entry Added**

${icon} **${title}** - ${time}

The entry has been added to the patient's medical history timeline and will be visible in the dashboard.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ **Error adding medical history entry:** ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  // Tool: Update Patient Info
  server.registerTool(
    "updatePatientInfo",
    {
      title: "Update Patient Information",
      description: "Update basic patient demographic information",
      inputSchema: {
        name: z.string().describe("Patient's full name"),
        patientId: z.string().describe("Patient ID"),
        dob: z.string().describe("Date of birth"),
        age: z.number().min(0).max(150).describe("Patient's age"),
      },
    },
    async ({ name, patientId, dob, age }) => {
      try {
        PatientDashboardService.updatePatientInfo(name, patientId, dob, age);

        return {
          content: [
            {
              type: "text",
              text: `👤 **Patient Information Updated Successfully**

**Name:** ${name}
**Patient ID:** ${patientId}
**Date of Birth:** ${dob}
**Age:** ${age}

The patient's basic information has been updated across the dashboard. The avatar initials have been refreshed to match the new name.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ **Error updating patient information:** ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  return server;
}

// ============================================================================
// UI MANAGEMENT
// ============================================================================

class DashboardUI {
  private copilotIframe: HTMLIFrameElement;
  private statusElement: HTMLElement;
  private loadingElement: HTMLElement;
  private errorElement: HTMLElement;

  constructor() {
    this.copilotIframe = document.getElementById(
      "copilot-iframe"
    ) as HTMLIFrameElement;
    this.statusElement = document.getElementById(
      "copilot-status"
    ) as HTMLElement;
    this.loadingElement = document.getElementById(
      "loading-state"
    ) as HTMLElement;
    this.errorElement = document.getElementById("error-state") as HTMLElement;
  }

  showLoading() {
    this.copilotIframe.style.display = "none";
    this.loadingElement.style.display = "flex";
    this.errorElement.style.display = "none";
    this.statusElement.textContent = "Connecting...";
    this.statusElement.style.background = "#f39c12";
  }

  showConnected() {
    this.copilotIframe.style.display = "block";
    this.loadingElement.style.display = "none";
    this.errorElement.style.display = "none";
    this.statusElement.textContent = "Connected";
    this.statusElement.style.background = "#00b894";
  }

  showError() {
    this.copilotIframe.style.display = "none";
    this.loadingElement.style.display = "none";
    this.errorElement.style.display = "flex";
    this.statusElement.textContent = "Disconnected";
    this.statusElement.style.background = "#e17055";
  }

  getIframe(): HTMLIFrameElement {
    return this.copilotIframe;
  }
}

// ============================================================================
// MAIN APPLICATION
// ============================================================================

async function initializeCopilot() {
  const ui = new DashboardUI();
  ui.showLoading();

  // Add a fallback timeout to show the iframe after 5 seconds regardless
  const fallbackTimeout = setTimeout(() => {
    console.log("[PATIENT-DASHBOARD] Fallback timeout - showing iframe");
    ui.showConnected();
  }, 5000);

  // Add a timeout wrapper to prevent hanging
  const initializeWithTimeout = async () => {
    console.log("[PATIENT-DASHBOARD] Creating MCP server...");
    const server = createPatientDashboardServer();

    console.log("[PATIENT-DASHBOARD] Setting up iframe window control...");
    const windowControl = new IframeWindowControl({
      iframe: ui.getIframe(),
      setVisible: () => {
        console.log("[PATIENT-DASHBOARD] Iframe set to visible");
      }, // Always visible
      onError: (error) => {
        console.error("[PATIENT-DASHBOARD] Iframe error:", error);
        ui.showError();
      },
      sandboxMode: "development", // Use development mode for demo
    });

    // Add iframe load event listener
    ui.getIframe().addEventListener("load", () => {
      console.log(
        "[PATIENT-DASHBOARD] Iframe loaded successfully - showing iframe"
      );
      clearTimeout(fallbackTimeout);
      // Show the iframe as soon as it loads, regardless of MCP connection
      ui.showConnected();
    });

    ui.getIframe().addEventListener("error", (error) => {
      console.error("[PATIENT-DASHBOARD] Iframe failed to load:", error);
    });

    console.log("[PATIENT-DASHBOARD] Creating transport...");
    console.log("[PATIENT-DASHBOARD] Current location:", window.location.href);

    // Fix URL resolution by adding trailing slash if it doesn't end with one
    const baseUrl = window.location.href.endsWith("/")
      ? window.location.href
      : window.location.href + "/";
    const copilotUrl = new URL("ai-copilot", baseUrl).href;
    console.log("[PATIENT-DASHBOARD] Base URL:", baseUrl);
    console.log("[PATIENT-DASHBOARD] Copilot URL:", copilotUrl);

    const transport = new OuterFrameTransport(windowControl, {
      serverUrl: copilotUrl,
      sessionId: generateSessionId(),
    });

    console.log("[PATIENT-DASHBOARD] Navigating to copilot URL...");
    await windowControl.navigate(copilotUrl);
    console.log("[PATIENT-DASHBOARD] Navigation complete");

    // Wait for iframe to be fully loaded
    console.log("[PATIENT-DASHBOARD] Waiting for iframe to fully load...");
    await new Promise((resolve) => {
      const iframe = ui.getIframe();
      if (iframe.contentDocument?.readyState === "complete") {
        resolve(undefined);
      } else {
        iframe.addEventListener("load", () => resolve(undefined), {
          once: true,
        });
      }
    });

    // Add additional delay to ensure iframe script is fully initialized
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("[PATIENT-DASHBOARD] Preparing transport...");
    await transport.prepareToConnect();
    console.log("[PATIENT-DASHBOARD] Transport prepared");

    console.log("[PATIENT-DASHBOARD] Connecting MCP server to transport...");
    await server.connect(transport);

    console.log("[PATIENT-DASHBOARD] AI Copilot initialized successfully");
    ui.showConnected();
  };

  try {
    // Set a 30 second timeout for initialization
    await Promise.race([
      initializeWithTimeout(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Initialization timeout after 30 seconds")),
          30000
        )
      ),
    ]);
  } catch (error) {
    clearTimeout(fallbackTimeout);
    console.error("[PATIENT-DASHBOARD] Failed to initialize copilot:", error);
    if (error instanceof Error) {
      console.error("[PATIENT-DASHBOARD] Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    ui.showError();
  }
}

// Make initializeCopilot available globally for retry button
(window as any).initializeCopilot = initializeCopilot;

// Auto-initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  console.log("[PATIENT-DASHBOARD] Page loaded, initializing copilot...");

  // Listen for copilot ready signal
  window.addEventListener("message", (event) => {
    console.log("[PATIENT-DASHBOARD] Received message:", event.data);
    if (event.data?.type === "copilot-ready") {
      console.log(
        "[PATIENT-DASHBOARD] Copilot is ready - ensuring iframe is visible"
      );
      const iframe = document.getElementById(
        "copilot-iframe"
      ) as HTMLIFrameElement;
      const loading = document.getElementById("loading-state") as HTMLElement;
      if (iframe && loading) {
        iframe.style.display = "block";
        loading.style.display = "none";
      }
    }
  });

  initializeCopilot();
});

console.log("[PATIENT-DASHBOARD] Patient Dashboard server script loaded");
