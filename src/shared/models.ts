export interface AssignmentOption {
  id: string;
  name: string;
  quantity: number;
}

export interface AssignmentSet {
  id: string;
  name: string;
  options: AssignmentOption[];
}

export interface BannedCombination {
  id: string;
  optionAId: string;
  optionBId: string;
}

export interface Game {
  id: string;
  name: string;
  revision: number;
  assignmentSets: AssignmentSet[];
  bannedCombinations: BannedCombination[];
  deletedAt?: string | null;
}

export interface GroupSnapshot {
  id: string;
  name: string;
  revision: number;
  games: Game[];
  fetchedAt: string;
}

export interface GameDraft {
  id?: string;
  name: string;
  revision?: number;
  assignmentSets: AssignmentSet[];
  bannedCombinations: BannedCombination[];
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

