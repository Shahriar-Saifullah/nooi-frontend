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

// ─── Language ──────────────────────────────────────────────────────────────
// Site-wide language toggle. Shared by the logged-out Navbar and the
// dashboard's profile dropdown, so switching in either place applies
// everywhere. Persisted so the choice survives navigation within the session.
// Currently only English/Arabic marketing-page copy is translated (see
// lib/i18n/translations.ts) — this store just tracks which one is active.

export type Language = "en" | "ar";

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: "en",

      setLanguage: (language) => set({ language }),

      toggleLanguage: () => set({ language: get().language === "en" ? "ar" : "en" }),
    }),
    {
      name: "language-store",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);