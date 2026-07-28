export const assignmentOptionColors = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "gray"
] as const;

export type AssignmentOptionColor = (typeof assignmentOptionColors)[number];

export const assignmentOptionColorLabels: Record<AssignmentOptionColor, string> = {
  red: "Red",
  orange: "Orange",
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
  purple: "Purple",
  pink: "Pink",
  gray: "Gray"
};
