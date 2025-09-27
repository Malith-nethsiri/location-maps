// Simple mock auth store for compilation
export const useAuthStore = () => ({
  user: {
    name: 'Test User',
    profile: {
      full_name: 'Test User',
      professional_title: 'Chartered Valuation Surveyor',
      designations: 'MRICS',
      phone: '+94 77 1234567',
      email: 'test@example.com',
      ivsl_registration: 'VS/2024/001'
    }
  }
});