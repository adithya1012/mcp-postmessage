/**
 * Protocol Logic Utilities
 * Contains utility functions for protocol version checking and validation
 */

/**
 * Checks if a given version is within the specified range
 * @param version - The version to check (e.g., "1.0", "1.2.3")
 * @param minVersion - Minimum acceptable version
 * @param maxVersion - Maximum acceptable version
 * @returns true if version is within range, false otherwise
 */
export function isVersionInRange(
  version: string,
  minVersion: string,
  maxVersion: string
): boolean {
  const parseVersion = (v: string): number[] => {
    return v.split(".").map((part) => parseInt(part, 10) || 0);
  };

  const compareVersions = (v1: number[], v2: number[]): number => {
    const maxLength = Math.max(v1.length, v2.length);

    for (let i = 0; i < maxLength; i++) {
      const part1 = v1[i] || 0;
      const part2 = v2[i] || 0;

      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }

    return 0;
  };

  try {
    const versionParts = parseVersion(version);
    const minVersionParts = parseVersion(minVersion);
    const maxVersionParts = parseVersion(maxVersion);

    const isAboveMin = compareVersions(versionParts, minVersionParts) >= 0;
    const isBelowMax = compareVersions(versionParts, maxVersionParts) <= 0;

    return isAboveMin && isBelowMax;
  } catch (error) {
    console.error("Error parsing version strings:", error);
    return false;
  }
}

/**
 * Negotiates the best protocol version between client and server
 * @param clientMinVersion - Client's minimum supported version
 * @param clientMaxVersion - Client's maximum supported version
 * @param serverMinVersion - Server's minimum supported version
 * @param serverMaxVersion - Server's maximum supported version
 * @returns negotiated version or null if no compatible version
 */
export function negotiateVersion(
  clientMinVersion: string,
  clientMaxVersion: string,
  serverMinVersion: string,
  serverMaxVersion: string
): string | null {
  const parseVersion = (v: string): number[] => {
    return v.split(".").map((part) => parseInt(part, 10) || 0);
  };

  const compareVersions = (v1: number[], v2: number[]): number => {
    const maxLength = Math.max(v1.length, v2.length);

    for (let i = 0; i < maxLength; i++) {
      const part1 = v1[i] || 0;
      const part2 = v2[i] || 0;

      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }

    return 0;
  };

  const versionToString = (parts: number[]): string => {
    return parts.join(".");
  };

  try {
    const clientMin = parseVersion(clientMinVersion);
    const clientMax = parseVersion(clientMaxVersion);
    const serverMin = parseVersion(serverMinVersion);
    const serverMax = parseVersion(serverMaxVersion);

    // Find the overlap: max of mins to min of maxes
    const overlapMin =
      compareVersions(clientMin, serverMin) >= 0 ? clientMin : serverMin;
    const overlapMax =
      compareVersions(clientMax, serverMax) <= 0 ? clientMax : serverMax;

    // Check if there's a valid overlap
    if (compareVersions(overlapMin, overlapMax) <= 0) {
      // Return the highest version in the overlap (preferring newer versions)
      return versionToString(overlapMax);
    }

    return null; // No compatible version found
  } catch (error) {
    console.error("Error negotiating versions:", error);
    return null;
  }
}
