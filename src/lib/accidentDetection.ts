export interface AccidentResult {
  isAccident: boolean;
  dangerPercentage: number;
  reason: string;
}

export type VehicleType = 'car' | 'scooter';

// SCOOTER LOGIC: Vulnerable to tipping and instability
export function detectScooterAccident(
  accX: number,
  accY: number,
  accZ: number,
  gyroX: number,
  gyroY: number,
  gyroZ: number
): AccidentResult {
  // Thresholds specific to light vehicles
  const tippingThreshold = 0.5; // Z-axis < 0.5 means tipped > 60 degrees
  const impactThreshold = 3.5;  // 3.5G is a hard fall for a scooter
  const severeImpactThreshold = 6.0;

  const totalAcceleration = Math.sqrt(accX * accX + accY * accY + accZ * accZ);
  const accelerationDelta = Math.abs(totalAcceleration - 1.0);
  
  let dangerScore = 0;
  let reasons: string[] = [];

  // 1. Tipping Detection (Most common scooter accident)
  // If the scooter is on its side, Z-axis acceleration drops towards 0
  if (Math.abs(accZ) < tippingThreshold) {
    dangerScore += 65;
    reasons.push('Vehicle tipped over');
  }

  // 2. Impact Detection (Continuous Scale)
  if (accelerationDelta > impactThreshold) {
    // Base danger is 40% at 3.5G. Increases by 15% for every extra 1G.
    const impactDanger = 40 + ((accelerationDelta - impactThreshold) * 15);
    dangerScore += impactDanger;

    if (accelerationDelta > severeImpactThreshold) {
      reasons.push(`Severe impact (${accelerationDelta.toFixed(1)}G)`);
    } else {
      reasons.push(`Hard impact (${accelerationDelta.toFixed(1)}G)`);
    }
  }

  // 3. Rotational Violence (Spinning/Tumbling)
  const totalRotation = Math.sqrt(gyroX * gyroX + gyroY * gyroY + gyroZ * gyroZ);
  if (totalRotation > 300) {
    // Scale rotation danger: 300deg/s = 30%, 600deg/s = 60%
    const rotationDanger = (totalRotation / 10); 
    dangerScore += rotationDanger;
    reasons.push('Tumbling detected');
  }

  dangerScore = Math.min(100, Math.round(dangerScore));

  return {
    isAccident: dangerScore >= 50,
    dangerPercentage: dangerScore,
    reason: reasons.join(', ') || 'Normal operation',
  };
}

// CAR LOGIC: Stable platform. Sensitive to Rollovers, Side Impacts, and High G-force.
export function detectCarAccident(
  accX: number,
  accY: number,
  accZ: number,
  gyroX: number,
  gyroY: number,
  gyroZ: number
): AccidentResult {
  const totalAcceleration = Math.sqrt(accX * accX + accY * accY + accZ * accZ);
  const accelerationDelta = Math.abs(totalAcceleration - 1.0); // Deviation from 1G gravity
  
  let dangerScore = 0;
  let reasons: string[] = [];

  // 1. ROLLOVER & ABNORMAL TILT DETECTION
  // Distinct from Bike: Cars should NOT tilt significantly.
  // accZ ~ 1.0 is flat. 
  // accZ < 0.85 means ~30 degree tilt, which is HIGHLY abnormal for a car.
  const isNotFreefall = totalAcceleration > 0.5;
  
  if (isNotFreefall) {
    if (accZ <= -0.3) {
      dangerScore += 100;
      reasons.push('Vehicle Rollover (Inverted)');
    } else if (accZ < 0.3) {
      dangerScore += 95; 
      reasons.push('Vehicle Rollover (On Side)');
    } else if (accZ < 0.85) {
      // NEW: Dynamic Warning for abnormal tilt before a full rollover
      // Scales from 50% danger at 0.85 (30 deg) to 85% danger at 0.3 (70 deg)
      // The closer accZ is to 0, the more dangerous the tilt.
      const tiltSeverity = (0.85 - accZ) / (0.85 - 0.3); // 0.0 to 1.0 scale
      const tiltDanger = 50 + (tiltSeverity * 35);
      
      dangerScore += tiltDanger;
      reasons.push(`Abnormal Vehicle Tilt (${(Math.acos(accZ) * 180 / Math.PI).toFixed(0)}°)`);
    }
  }

  // 2. PRECISE IMPACT CALCULATION
  if (accelerationDelta > 2.5) {
    // Map G-force to a 0-100 scale.
    // Base danger is 30% at 2.5G. Adds ~10% for every extra 1G.
    const impactDanger = 30 + ((accelerationDelta - 2.5) * 10);
    dangerScore += impactDanger;

    if (accelerationDelta > 8.0) reasons.push(`Catastrophic Impact (${accelerationDelta.toFixed(1)}G)`);
    else if (accelerationDelta > 5.0) reasons.push(`Severe Collision (${accelerationDelta.toFixed(1)}G)`);
    else reasons.push(`Collision Detected (${accelerationDelta.toFixed(1)}G)`);
  }

  // 3. SIDE IMPACT (Lateral Gs)
  const lateralG = Math.sqrt(accX * accX + accY * accY);
  if (lateralG > 2.0) {
    dangerScore += 40 + ((lateralG - 2.0) * 15);
    reasons.push(`Lateral Impact (${lateralG.toFixed(1)}G)`);
  }

  // 4. LOSS OF CONTROL (Spin)
  if (Math.abs(gyroZ) > 90) { 
    dangerScore += 25;
    reasons.push('Loss of control (Spin)');
  }

  dangerScore = Math.min(100, Math.round(dangerScore));

  return {
    isAccident: dangerScore >= 55,
    dangerPercentage: dangerScore,
    reason: reasons.join(', ') || 'Normal operation',
  };
}

export class AccidentDetectionService {
  private recentReadings: Array<{
    acc: { x: number; y: number; z: number };
    gyro: { x: number; y: number; z: number };
    timestamp: number;
  }> = [];

  private readonly windowSize = 10;
  private readonly minReadingsForDetection = 5;
  private vehicleType: VehicleType = 'scooter';

  setVehicleType(type: VehicleType) {
    this.vehicleType = type;
    this.reset();
  }

  addReading(
    accX: number,
    accY: number,
    accZ: number,
    gyroX: number,
    gyroY: number,
    gyroZ: number
  ) {
    this.recentReadings.push({
      acc: { x: accX, y: accY, z: accZ },
      gyro: { x: gyroX, y: gyroY, z: gyroZ },
      timestamp: Date.now(),
    });

    if (this.recentReadings.length > this.windowSize) {
      this.recentReadings.shift();
    }
  }

  detectWithHistory(): AccidentResult {
    if (this.recentReadings.length < this.minReadingsForDetection) {
      return {
        isAccident: false,
        dangerPercentage: 0,
        reason: 'Insufficient data',
      };
    }

    const latest = this.recentReadings[this.recentReadings.length - 1];
    const detectFunction = this.vehicleType === 'car' ? detectCarAccident : detectScooterAccident;
    
    const result = detectFunction(
      latest.acc.x,
      latest.acc.y,
      latest.acc.z,
      latest.gyro.x,
      latest.gyro.y,
      latest.gyro.z
    );

    if (result.isAccident) {
      const recentAccidents = this.recentReadings.slice(-3).filter((reading) => {
        const check = detectFunction(
          reading.acc.x,
          reading.acc.y,
          reading.acc.z,
          reading.gyro.x,
          reading.gyro.y,
          reading.gyro.z
        );
        return check.isAccident;
      });

      if (recentAccidents.length >= 2) {
        result.dangerPercentage = Math.min(100, result.dangerPercentage + 15);
        result.reason += ' (Confirmed)';
      } else {
        result.isAccident = false;
        result.reason = 'Noise filtered';
        result.dangerPercentage = Math.max(0, result.dangerPercentage - 20);
      }
    }

    return result;
  }

  reset() {
    this.recentReadings = [];
  }
}