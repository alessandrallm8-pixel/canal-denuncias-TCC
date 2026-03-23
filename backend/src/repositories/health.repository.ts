export function getHealthSource() {
  return {
    service: 'backend',
    timestamp: new Date().toISOString()
  }
}
