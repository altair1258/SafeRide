/*
  # Add Vehicle Type Selection

  1. Changes
    - Add `vehicle_type` column to `user_settings` table
      - Type: text with check constraint ('car' or 'scooter')
      - Default: 'scooter' (for backward compatibility)
    
  2. Purpose
    - Allow users to select between car and scooter
    - Different accident detection logic per vehicle type
    - Different 3D visualization per vehicle type
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'vehicle_type'
  ) THEN
    ALTER TABLE user_settings 
    ADD COLUMN vehicle_type text DEFAULT 'scooter' CHECK (vehicle_type IN ('car', 'scooter'));
  END IF;
END $$;