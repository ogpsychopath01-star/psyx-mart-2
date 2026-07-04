let maintenanceMode = false;

export function isMaintenanceMode(): boolean {
  return maintenanceMode;
}

export function setMaintenanceMode(value: boolean): void {
  maintenanceMode = value;
}
