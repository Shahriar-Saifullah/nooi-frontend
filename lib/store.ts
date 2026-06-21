import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Room } from "@/lib/api/projects";

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
    // Rooms with their interactive grid layout (box/gridRow/gridCol/weights),
    // set once the user finishes reviewing rooms in CreateProjectModal so the
    // canvas page can render the same interactive blocks instead of the raw
    // uploaded floor plan photo.
    rooms?: Room[];
  } | null;

  setProject: (project: ProjectState["currentProject"]) => void;
  setProjectRooms: (rooms: Room[]) => void;
  resetProject: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      currentProject: null,

      setProject: (project) => set({ currentProject: project }),

      setProjectRooms: (rooms) =>
        set((state) =>
          state.currentProject
            ? { currentProject: { ...state.currentProject, rooms } }
            : state
        ),

      resetProject: () => set({ currentProject: null }),
    }),
    {
      name: "project-store",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);