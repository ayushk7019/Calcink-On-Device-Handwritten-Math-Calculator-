export const labels = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "+",
  ".",
  "÷",
  "=",
  "×",
  "-",
  "X",
  "Y",
  "Z",
] as const;

export type Label = (typeof labels)[number];