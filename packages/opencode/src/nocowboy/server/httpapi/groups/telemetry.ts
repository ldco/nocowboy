const root = "/telemetry"

export const TelemetryPaths = {
  capture: `${root}/capture`,
  setEnabled: `${root}/set-enabled`,
} as const
