import type { ComponentType } from "react";

export interface GameToolDefinition {
  id: string;
  name: string;
  description: string;
  path: string;
  component: ComponentType;
}

// Future coded tools register here. They remain independent of shared
// group-configured games and the generic assignment randomizer.
export const gameTools: GameToolDefinition[] = [];

