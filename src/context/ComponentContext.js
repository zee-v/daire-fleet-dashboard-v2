import React, { createContext, useContext, useState } from 'react';
import { getFleets } from '../services/fleetService';
import { getComponents } from '../services/componentService';

const ComponentContext = createContext(null);

// Real sensor-backed components for Beijing Maersk (XLSX data)
export const BEIJING_MAERSK_COMPONENTS = [
  { id: 'main-engine',        name: 'Main Engine',        metrics: ['shaft_rpm', 'shaft_power_kw', 'shaft_torque_knm', 'sg_actual_speed_rpm'], penaltyKey: 'mechanical_contrib', unit: 'Mechanical', status: 'warning' },
  { id: 'shaft-generator',    name: 'Shaft Generator',    metrics: ['sg_actual_power_kw', 'sg_actual_frequency_hz', 'sg_actual_current_a', 'sg_actual_voltage_v', 'sg_available_power_pct'], penaltyKey: 'electrical_contrib', unit: 'Electrical', status: 'healthy' },
  { id: 'generator-windings', name: 'Generator Windings', metrics: ['sg_winding_u1_temp', 'sg_winding_v1_temp', 'sg_winding_w1_temp', 'sg_winding_u2_temp', 'sg_winding_v2_temp', 'sg_winding_w2_temp'], penaltyKey: 'thermal_contrib', unit: 'Thermal', status: 'healthy' },
  { id: 'transformer',        name: 'Transformer',        metrics: ['sg_transformer_winding_1u_temp', 'sg_transformer_winding_1v_temp', 'sg_transformer_winding_1w_temp', 'sg_transformer_winding_2u_temp', 'sg_transformer_winding_2v_temp', 'sg_transformer_winding_2w_temp'], penaltyKey: 'thermal_contrib', unit: 'Thermal', status: 'healthy' },
  { id: 'reactor',            name: 'Reactor',            metrics: ['sg_reactor_winding_l1_1_temp', 'sg_reactor_winding_l1_2_temp', 'sg_reactor_winding_l1_3_temp', 'sg_reactor_winding_l2_1_temp', 'sg_reactor_winding_l2_2_temp', 'sg_reactor_winding_l2_3_temp'], penaltyKey: 'thermal_contrib', unit: 'Thermal', status: 'healthy' },
  { id: 'cooling',            name: 'Cooling System',     metrics: ['sg_converter_coolant_temp', 'sg_air_temp_hot1', 'sg_air_temp_cold1', 'sg_air_temp_hot2', 'sg_air_temp_cold2'], penaltyKey: 'thermal_contrib', unit: 'Thermal', status: 'healthy' },
];

export function getFleetComponents(fleetId) {
  if (fleetId === 'beijing-maersk') return BEIJING_MAERSK_COMPONENTS;
  return getComponents(fleetId).map((c) => ({ ...c, metrics: [], penaltyKey: null, unit: c.name }));
}

export function ComponentProvider({ children }) {
  const allFleets = getFleets();
  const defaultFleet = allFleets[0]; // Beijing Maersk is first after index update

  const [selectedFleet, _setSelectedFleet] = useState(defaultFleet);
  const [selectedComponent, setSelectedComponent] = useState(
    getFleetComponents(defaultFleet.id)[0]
  );

  function setSelectedFleet(fleet) {
    _setSelectedFleet(fleet);
    setSelectedComponent(getFleetComponents(fleet.id)[0]);
  }

  return (
    <ComponentContext.Provider value={{
      allFleets,
      selectedFleet,
      setSelectedFleet,
      selectedComponent,
      setSelectedComponent,
      getFleetComponents,
    }}>
      {children}
    </ComponentContext.Provider>
  );
}

export function useComponent() {
  return useContext(ComponentContext);
}
