import { create } from "zustand";

export const useProgramHeadStore = create((set) => ({
  programHead: null,
  setProgramHead: (programHead) => set({ programHead }),
  clearProgramHead: () => set({ programHead: null }),
}));
