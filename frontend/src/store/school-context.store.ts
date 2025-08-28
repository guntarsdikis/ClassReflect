import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface School {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

interface SchoolContextState {
  // Current selected school for super admin context switching
  selectedSchoolId: number | null;
  selectedSchool: School | null;
  
  // Available schools (loaded once for super admin)
  availableSchools: School[];
  
  // Actions
  setSelectedSchool: (school: School | null) => void;
  setAvailableSchools: (schools: School[]) => void;
  clearSchoolContext: () => void;
}

export const useSchoolContextStore = create<SchoolContextState>()(
  persist(
    (set, get) => ({
      selectedSchoolId: null,
      selectedSchool: null,
      availableSchools: [],

      setSelectedSchool: (school: School | null) => {
        set({
          selectedSchool: school,
          selectedSchoolId: school?.id || null,
        });
      },

      setAvailableSchools: (schools: School[]) => {
        const currentState = get();
        set({ availableSchools: schools });
        
        // If no school is selected and we have schools available, select the first one
        if (!currentState.selectedSchool && schools.length > 0) {
          set({
            selectedSchool: schools[0],
            selectedSchoolId: schools[0].id,
          });
        }
        
        // If current selected school is not in the new list, clear selection
        if (currentState.selectedSchool && 
            !schools.find(s => s.id === currentState.selectedSchool?.id)) {
          set({
            selectedSchool: null,
            selectedSchoolId: null,
          });
        }
      },

      clearSchoolContext: () => {
        set({
          selectedSchool: null,
          selectedSchoolId: null,
          availableSchools: [],
        });
      },
    }),
    {
      name: 'school-context-store',
      // Only persist the selected school, not the available schools
      partialize: (state) => ({ 
        selectedSchoolId: state.selectedSchoolId,
        selectedSchool: state.selectedSchool,
      }),
    }
  )
);