import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AuthState {
  signupData: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
  };

  setSignupData: (data: Partial<AuthState["signupData"]>) => void;
  resetSignupData: () => void;
}

const initialSignupData = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      signupData: initialSignupData,

      setSignupData: (data) =>
        set((state) => ({
          signupData: { ...state.signupData, ...data },
        })),

      resetSignupData: () => set({ signupData: initialSignupData }),
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
    },
  ),
);

interface ProjectState {
  currentProject: {
    id: string;
    name: string;
    floorPlanUrl: string | null;
  } | null;

  setProject: (project: ProjectState["currentProject"]) => void;
  resetProject: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      currentProject: null,

      setProject: (project) => set({ currentProject: project }),

      resetProject: () => set({ currentProject: null }),
    }),
    {
      name: "project-store",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

