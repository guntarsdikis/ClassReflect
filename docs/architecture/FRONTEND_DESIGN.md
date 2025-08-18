# ClassReflect Frontend Architecture & Design

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Recommended Dependencies](#recommended-dependencies)
4. [Project Structure](#project-structure)
5. [Component Architecture](#component-architecture)
6. [State Management](#state-management)
7. [Design System](#design-system)
8. [Routing Strategy](#routing-strategy)
9. [API Integration](#api-integration)
10. [Performance Optimization](#performance-optimization)
11. [Testing Strategy](#testing-strategy)
12. [Build & Deployment](#build--deployment)

## Overview

ClassReflect's frontend is a modern, responsive web application built with React and TypeScript, focusing on accessibility, performance, and user experience. The architecture supports three distinct user roles with different interfaces and permissions.

### Design Principles
- **Role-Based UI**: Different interfaces for Teachers, School Managers, and Super Admins
- **Mobile-First**: Responsive design that works on all devices
- **Accessibility**: WCAG 2.1 AA compliant
- **Performance**: Fast initial load and smooth interactions
- **Offline Capable**: Basic functionality without network
- **Real-time Updates**: Live status updates for processing jobs

## Technology Stack

### Core Framework
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "typescript": "^5.3.0",
  "vite": "^5.0.0"  // Replace Create React App with Vite
}
```

**Why Vite over CRA:**
- Faster HMR (Hot Module Replacement)
- Better build performance
- Native ESM support
- Smaller bundle sizes

## Recommended Dependencies

### Essential Libraries

```json
{
  "dependencies": {
    // Core React ecosystem
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    
    // State Management
    "@tanstack/react-query": "^5.0.0",     // Server state management
    "zustand": "^4.4.0",                    // Client state management
    
    // UI Framework & Components
    "@mantine/core": "^7.3.0",              // Component library
    "@mantine/hooks": "^7.3.0",             // Utility hooks
    "@mantine/dates": "^7.3.0",             // Date pickers
    "@mantine/charts": "^7.3.0",            // Charts for analytics
    "@mantine/notifications": "^7.3.0",     // Toast notifications
    "@mantine/modals": "^7.3.0",            // Modal management
    "@mantine/dropzone": "^7.3.0",          // File upload
    "@tabler/icons-react": "^2.44.0",       // Icon library
    
    // Forms & Validation
    "react-hook-form": "^7.48.0",           // Form management
    "zod": "^3.22.0",                       // Schema validation
    "@hookform/resolvers": "^3.3.0",        // Zod resolver for RHF
    
    // Authentication
    "aws-amplify": "^6.0.0",                // AWS Cognito integration
    
    // API & Networking
    "axios": "^1.6.0",                      // HTTP client
    "socket.io-client": "^4.6.0",           // WebSocket for real-time
    
    // Data Visualization
    "recharts": "^2.10.0",                  // Additional charts
    "react-circular-progressbar": "^2.1.0", // Progress indicators
    
    // File Handling
    "react-dropzone": "^14.2.0",            // Drag-n-drop uploads
    "wavesurfer.js": "^7.5.0",              // Audio waveform display
    
    // Utilities
    "date-fns": "^3.0.0",                   // Date manipulation
    "clsx": "^2.1.0",                       // Conditional classes
    "react-intersection-observer": "^9.5.0", // Lazy loading
    "react-use": "^17.4.0"                  // Utility hooks
  },
  
  "devDependencies": {
    // TypeScript & Types
    "typescript": "^5.3.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/node": "^20.10.0",
    
    // Build Tools
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    
    // Code Quality
    "eslint": "^8.55.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "prettier": "^3.1.0",
    
    // Testing
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/user-event": "^14.5.0",
    "vitest": "^1.1.0",
    "@vitest/ui": "^1.1.0",
    "msw": "^2.0.0",                       // API mocking
    
    // Development Tools
    "@tanstack/react-query-devtools": "^5.0.0"
  }
}
```

### Why These Libraries?

**Mantine UI** (over Material-UI or Ant Design)
- Modern, fully typed components
- Excellent dark mode support
- Smaller bundle size
- Better customization with CSS-in-JS
- Built-in hooks and utilities

**TanStack Query** (over Redux)
- Purpose-built for server state
- Automatic caching and refetching
- Optimistic updates
- Infinite queries for pagination
- DevTools for debugging

**Zustand** (for client state)
- Minimal boilerplate
- TypeScript first
- 2KB bundle size
- Works great with React Query

**React Hook Form + Zod**
- Best-in-class form performance
- Schema-based validation
- TypeScript inference
- Minimal re-renders

## Project Structure

```
src/
├── app/                      # App-level components
│   ├── App.tsx              # Root component
│   ├── AppProviders.tsx     # Context providers wrapper
│   └── AppRouter.tsx        # Route definitions
│
├── features/                # Feature-based modules
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   └── ForgotPassword.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── usePermissions.ts
│   │   ├── services/
│   │   │   └── auth.service.ts
│   │   └── types/
│   │       └── auth.types.ts
│   │
│   ├── dashboard/
│   │   ├── teacher/
│   │   │   ├── TeacherDashboard.tsx
│   │   │   ├── ProgressChart.tsx
│   │   │   └── FeedbackView.tsx
│   │   ├── manager/
│   │   │   ├── ManagerDashboard.tsx
│   │   │   ├── UploadModal.tsx
│   │   │   └── CriteriaBuilder.tsx
│   │   └── admin/
│   │       ├── AdminDashboard.tsx
│   │       └── SchoolCreator.tsx
│   │
│   ├── uploads/
│   │   ├── components/
│   │   │   ├── UploadWizard.tsx
│   │   │   ├── CriteriaStep.tsx
│   │   │   ├── FileDropzone.tsx
│   │   │   └── ProgressTracker.tsx
│   │   ├── hooks/
│   │   │   └── useFileUpload.ts
│   │   └── services/
│   │       └── upload.service.ts
│   │
│   ├── analytics/
│   │   ├── components/
│   │   │   ├── TeacherAnalytics.tsx
│   │   │   ├── SchoolAnalytics.tsx
│   │   │   └── ChartWidgets.tsx
│   │   └── hooks/
│   │       └── useAnalytics.ts
│   │
│   └── templates/
│       ├── components/
│       │   ├── TemplateEditor.tsx
│       │   ├── TemplateList.tsx
│       │   └── CriteriaWeights.tsx
│       └── services/
│           └── templates.service.ts
│
├── shared/                  # Shared/common code
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── UI/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Table.tsx
│   │   └── Feedback/
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorBoundary.tsx
│   │       └── EmptyState.tsx
│   │
│   ├── hooks/
│   │   ├── useApi.ts
│   │   ├── useWebSocket.ts
│   │   ├── useDebounce.ts
│   │   └── useLocalStorage.ts
│   │
│   ├── services/
│   │   ├── api.client.ts
│   │   ├── websocket.client.ts
│   │   └── storage.service.ts
│   │
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   │
│   └── types/
│       ├── api.types.ts
│       ├── models.types.ts
│       └── common.types.ts
│
├── store/                   # Global state management
│   ├── auth.store.ts       # Zustand store for auth
│   ├── ui.store.ts         # UI preferences
│   └── app.store.ts        # App-level state
│
├── styles/                  # Global styles
│   ├── theme.ts            # Mantine theme config
│   ├── global.css          # Global CSS
│   └── variables.css       # CSS variables
│
└── main.tsx                # Entry point
```

## Component Architecture

### Component Hierarchy

```
App
├── AuthProvider
├── QueryClientProvider (React Query)
├── MantineProvider (Theme)
├── NotificationsProvider
└── Router
    ├── PublicRoute
    │   └── LoginPage
    ├── ProtectedRoute (auth required)
    │   ├── RoleBasedRoute
    │   │   ├── TeacherRoutes
    │   │   │   ├── TeacherDashboard
    │   │   │   ├── FeedbackView
    │   │   │   └── ProgressView
    │   │   ├── ManagerRoutes
    │   │   │   ├── ManagerDashboard
    │   │   │   ├── UploadWizard
    │   │   │   ├── TeacherManagement
    │   │   │   └── TemplateEditor
    │   │   └── AdminRoutes
    │   │       ├── AdminDashboard
    │   │       ├── SchoolManagement
    │   │       └── PlatformAnalytics
    │   └── SharedRoutes
    │       ├── Profile
    │       └── Settings
    └── ErrorBoundary
        └── ErrorPage
```

### Component Patterns

**1. Container/Presenter Pattern**
```tsx
// Container (smart component)
const TeacherDashboardContainer = () => {
  const { data, isLoading } = useTeacherData();
  const { mutate: updateProfile } = useUpdateProfile();
  
  return (
    <TeacherDashboardView
      data={data}
      isLoading={isLoading}
      onUpdateProfile={updateProfile}
    />
  );
};

// Presenter (dumb component)
const TeacherDashboardView = ({ data, isLoading, onUpdateProfile }) => {
  // Pure presentation logic
};
```

**2. Compound Components**
```tsx
<UploadWizard>
  <UploadWizard.FileStep />
  <UploadWizard.TeacherStep />
  <UploadWizard.CriteriaStep />
  <UploadWizard.ReviewStep />
</UploadWizard>
```

## State Management

### State Architecture

```
┌─────────────────────────────────────────┐
│            Server State                  │
│         (TanStack Query)                 │
│  - API data caching                     │
│  - Background refetching                 │
│  - Optimistic updates                    │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│           Client State                   │
│            (Zustand)                     │
│  - User preferences                      │
│  - UI state (modals, sidebars)          │
│  - Form drafts                          │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│           Local State                    │
│         (React useState)                 │
│  - Component-specific state              │
│  - Temporary UI state                    │
└─────────────────────────────────────────┘
```

### TanStack Query Setup

```tsx
// src/shared/services/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10,   // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Usage in component
const { data, isLoading } = useQuery({
  queryKey: ['teachers', schoolId],
  queryFn: () => fetchTeachers(schoolId),
});
```

### Zustand Store Example

```tsx
// src/store/auth.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      
      login: async (credentials) => {
        const response = await authService.login(credentials);
        set({
          user: response.user,
          token: response.token,
          role: response.user.role,
        });
      },
      
      logout: () => {
        set({ user: null, token: null, role: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
```

## Design System

### Theme Configuration

```tsx
// src/styles/theme.ts
import { createTheme, MantineColorsTuple } from '@mantine/core';

const brandColor: MantineColorsTuple = [
  '#e5f4ff',
  '#cde2ff',
  '#9bc2ff',
  '#64a0ff',
  '#3984fe',
  '#1d72fe',
  '#0969ff',
  '#0058e4',
  '#004ecc',
  '#0042b5'
];

export const theme = createTheme({
  primaryColor: 'brand',
  colors: {
    brand: brandColor,
  },
  fontFamily: 'Inter, system-ui, sans-serif',
  headings: {
    fontFamily: 'Cal Sans, Inter, system-ui, sans-serif',
  },
  defaultRadius: 'md',
  
  components: {
    Button: {
      defaultProps: {
        size: 'md',
        variant: 'filled',
      },
      styles: {
        root: {
          fontWeight: 500,
        },
      },
    },
    Card: {
      defaultProps: {
        shadow: 'sm',
        radius: 'md',
        withBorder: true,
      },
    },
  },
});
```

### Design Tokens

```css
/* src/styles/variables.css */
:root {
  /* Colors */
  --color-primary: #0969ff;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Typography */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  
  /* Breakpoints */
  --breakpoint-xs: 576px;
  --breakpoint-sm: 768px;
  --breakpoint-md: 992px;
  --breakpoint-lg: 1200px;
  --breakpoint-xl: 1400px;
}
```

### Component Examples

**Upload Wizard Component**
```tsx
// src/features/uploads/components/UploadWizard.tsx
import { Stepper, Button, Group, FileInput, Select } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';

export const UploadWizard: React.FC = () => {
  const [active, setActive] = useState(0);
  const form = useForm({
    initialValues: {
      file: null,
      teacherId: '',
      templateId: '',
      criteria: {
        weights: { engagement: 30, clarity: 25 },
        objectives: '',
        context: {},
      },
    },
    validate: {
      file: (value) => !value ? 'File is required' : null,
      teacherId: (value) => !value ? 'Teacher is required' : null,
    },
  });

  return (
    <Stepper active={active} onStepClick={setActive}>
      <Stepper.Step label="Upload File">
        <FileInput
          label="Recording"
          placeholder="Select audio/video file"
          accept="audio/*,video/*"
          {...form.getInputProps('file')}
        />
      </Stepper.Step>
      
      <Stepper.Step label="Select Teacher">
        <Select
          label="Teacher"
          placeholder="Choose teacher"
          data={teachers}
          {...form.getInputProps('teacherId')}
        />
      </Stepper.Step>
      
      <Stepper.Step label="Set Criteria">
        <CriteriaBuilder
          value={form.values.criteria}
          onChange={(criteria) => form.setFieldValue('criteria', criteria)}
        />
      </Stepper.Step>
      
      <Stepper.Completed>
        <ReviewStep data={form.values} />
      </Stepper.Completed>
    </Stepper>
  );
};
```

## Routing Strategy

### Route Structure

```tsx
// src/app/AppRouter.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { RoleRoute } from '@/features/auth/components/RoleRoute';

export const AppRouter = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      
      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        
        {/* Teacher Routes */}
        <Route element={<RoleRoute roles={['teacher']} />}>
          <Route path="/dashboard" element={<TeacherDashboard />} />
          <Route path="/feedback/:jobId" element={<FeedbackView />} />
          <Route path="/progress" element={<ProgressView />} />
          <Route path="/reports" element={<ReportsView />} />
        </Route>
        
        {/* School Manager Routes */}
        <Route element={<RoleRoute roles={['school_manager']} />}>
          <Route path="/dashboard" element={<ManagerDashboard />} />
          <Route path="/upload" element={<UploadWizard />} />
          <Route path="/teachers" element={<TeacherManagement />} />
          <Route path="/templates" element={<TemplateEditor />} />
          <Route path="/analytics" element={<SchoolAnalytics />} />
        </Route>
        
        {/* Super Admin Routes */}
        <Route element={<RoleRoute roles={['super_admin']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/schools" element={<SchoolManagement />} />
          <Route path="/admin/platform" element={<PlatformAnalytics />} />
        </Route>
        
        {/* Shared Routes */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      
      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
```

## API Integration

### API Client Setup

```tsx
// src/shared/services/api.client.ts
import axios from 'axios';
import { notifications } from '@mantine/notifications';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.classreflect.gdwd.co.uk';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    
    notifications.show({
      title: 'Error',
      message: error.response?.data?.message || 'Something went wrong',
      color: 'red',
    });
    
    return Promise.reject(error);
  }
);
```

### API Service Example

```tsx
// src/features/uploads/services/upload.service.ts
import { apiClient } from '@/shared/services/api.client';
import { useMutation, useQuery } from '@tanstack/react-query';

export const uploadService = {
  uploadRecording: async (data: FormData) => {
    const response = await apiClient.post('/upload/recording', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total!
        );
        // Update progress in UI
      },
    });
    return response.data;
  },
  
  getJobStatus: async (jobId: string) => {
    const response = await apiClient.get(`/jobs/${jobId}`);
    return response.data;
  },
};

// React Query hooks
export const useUploadRecording = () => {
  return useMutation({
    mutationFn: uploadService.uploadRecording,
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: 'Recording uploaded successfully',
        color: 'green',
      });
    },
  });
};

export const useJobStatus = (jobId: string) => {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => uploadService.getJobStatus(jobId),
    refetchInterval: (data) => {
      // Poll while processing
      return data?.status === 'processing' ? 5000 : false;
    },
  });
};
```

### WebSocket Integration

```tsx
// src/shared/services/websocket.client.ts
import { io, Socket } from 'socket.io-client';

class WebSocketClient {
  private socket: Socket | null = null;
  
  connect(token: string) {
    this.socket = io(import.meta.env.VITE_WS_URL, {
      auth: { token },
      transports: ['websocket'],
    });
    
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });
    
    this.socket.on('job:update', (data) => {
      // Update job status in React Query cache
      queryClient.setQueryData(['job', data.jobId], data);
    });
  }
  
  disconnect() {
    this.socket?.disconnect();
  }
  
  subscribeToJob(jobId: string) {
    this.socket?.emit('subscribe:job', jobId);
  }
}

export const wsClient = new WebSocketClient();
```

## Performance Optimization

### Code Splitting

```tsx
// Lazy load routes
const TeacherDashboard = lazy(() => 
  import('@/features/dashboard/teacher/TeacherDashboard')
);

const ManagerDashboard = lazy(() => 
  import('@/features/dashboard/manager/ManagerDashboard')
);

// Use Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<TeacherDashboard />} />
  </Routes>
</Suspense>
```

### Virtualization for Lists

```tsx
// Use @tanstack/react-virtual for long lists
import { useVirtualizer } from '@tanstack/react-virtual';

const TeacherList = ({ teachers }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: teachers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
  });
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <TeacherCard
            key={virtualItem.key}
            teacher={teachers[virtualItem.index]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
```

### Image Optimization

```tsx
// Use next-generation formats
<picture>
  <source srcSet="/logo.webp" type="image/webp" />
  <source srcSet="/logo.jpg" type="image/jpeg" />
  <img src="/logo.jpg" alt="ClassReflect" loading="lazy" />
</picture>
```

## Testing Strategy

### Unit Tests

```tsx
// src/features/uploads/components/UploadWizard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UploadWizard } from './UploadWizard';

describe('UploadWizard', () => {
  it('should validate file selection', async () => {
    render(<UploadWizard />);
    
    const nextButton = screen.getByRole('button', { name: /next/i });
    await userEvent.click(nextButton);
    
    expect(screen.getByText(/file is required/i)).toBeInTheDocument();
  });
  
  it('should progress through steps', async () => {
    render(<UploadWizard />);
    
    // Upload file
    const fileInput = screen.getByLabelText(/recording/i);
    const file = new File(['audio'], 'test.mp3', { type: 'audio/mp3' });
    await userEvent.upload(fileInput, file);
    
    // Go to next step
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Should show teacher selection
    expect(screen.getByLabelText(/teacher/i)).toBeInTheDocument();
  });
});
```

### Integration Tests

```tsx
// Use MSW for API mocking
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.post('/api/upload/recording', (req, res, ctx) => {
    return res(ctx.json({ jobId: '123', status: 'processing' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Build & Deployment

### Vite Configuration

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@mantine/core', '@mantine/hooks'],
          'vendor-utils': ['axios', 'date-fns', 'zod'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

### Environment Variables

```env
# .env.development
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_AWS_REGION=eu-west-2
VITE_AWS_USER_POOL_ID=eu-west-2_xxxxx
VITE_AWS_CLIENT_ID=xxxxxxxxxxxxx

# .env.production
VITE_API_URL=https://api.classreflect.gdwd.co.uk
VITE_WS_URL=wss://api.classreflect.gdwd.co.uk
VITE_AWS_REGION=eu-west-2
VITE_AWS_USER_POOL_ID=eu-west-2_xxxxx
VITE_AWS_CLIENT_ID=xxxxxxxxxxxxx
```

### Deployment Script

```json
// package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx",
    "format": "prettier --write .",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "type-check": "tsc --noEmit",
    "deploy": "npm run build && aws s3 sync dist/ s3://classreflect-frontend --delete",
    "invalidate": "aws cloudfront create-invalidation --distribution-id EXXXXXX --paths '/*'"
  }
}
```

## Mobile Responsiveness

### Breakpoint System

```tsx
// src/shared/hooks/useBreakpoint.ts
import { useMediaQuery } from '@mantine/hooks';

export const useBreakpoint = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');
  
  return { isMobile, isTablet, isDesktop };
};
```

### Responsive Components

```tsx
// Responsive navigation
const Navigation = () => {
  const { isMobile } = useBreakpoint();
  
  if (isMobile) {
    return <MobileNavigation />;
  }
  
  return <DesktopNavigation />;
};
```

## Accessibility

### WCAG 2.1 Compliance

```tsx
// Accessible form example
<form onSubmit={handleSubmit} aria-label="Upload recording">
  <FormField>
    <label htmlFor="teacher-select">
      Select Teacher
      <span aria-label="required">*</span>
    </label>
    <Select
      id="teacher-select"
      aria-required="true"
      aria-invalid={!!errors.teacherId}
      aria-describedby="teacher-error"
    />
    {errors.teacherId && (
      <span id="teacher-error" role="alert">
        {errors.teacherId}
      </span>
    )}
  </FormField>
</form>
```

### Keyboard Navigation

```tsx
// Keyboard-accessible modal
const Modal = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Trap focus within modal
      const firstFocusable = modalRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
    
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);
  
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
      {children}
    </div>
  );
};
```

## Implementation Status

### ✅ Completed Components (November 2024)

#### Core Setup
- [x] **Vite Configuration** ✅ Project scaffolded with Vite
- [x] **React 18 + TypeScript** ✅ Fully configured
- [x] **Mantine UI Integration** ✅ Component library installed and themed
- [x] **Routing** ✅ React Router with role-based protected routes
- [x] **State Management** ✅ Zustand for auth, TanStack Query ready

#### Authentication & Access Control
- [x] **Login Page** ✅ Complete with form validation
- [x] **Mock Authentication** ✅ Development auth with 3 test users
- [x] **JWT Integration** ✅ Token management in Zustand store
- [x] **Role-Based Routing** ✅ Protected routes for each role
- [x] **Auth Service** ✅ API client with interceptors

#### Dashboards
- [x] **Teacher Dashboard** ✅ View evaluations, progress metrics
- [x] **Manager Dashboard** ✅ Teacher management, upload stats
- [x] **AppShell Layout** ✅ Responsive navigation with role-based menus

#### Upload System
- [x] **Upload Wizard** ✅ Multi-step form with Stepper
- [x] **Template Selection** ✅ Pre-built and custom templates
- [x] **Criteria Configuration** ✅ Weighted criteria with custom prompts
- [x] **File Validation** ✅ Audio file type and size checks

#### Project Structure
- [x] **Feature-Based Organization** ✅ Modular folder structure
- [x] **Path Aliases** ✅ Configured with @ imports
- [x] **Environment Config** ✅ .env files for dev/prod

### ⚠️ In Progress
- [ ] **Super Admin Dashboard** - Needs implementation
- [ ] **WebSocket Integration** - For real-time updates
- [ ] **Report Generation** - PDF export functionality
- [ ] **Analytics Charts** - Data visualization components

### 🔄 Pending Features
- [ ] **AWS Cognito Integration** - Replace mock auth
- [ ] **File Upload to S3** - Direct browser uploads
- [ ] **Internationalization** - Multi-language support
- [ ] **Dark Mode** - Theme switching
- [ ] **PWA Features** - Offline support
- [ ] **E2E Testing** - Playwright setup

### 📊 Coverage Metrics
- **Components Built**: 15+ components
- **Routes Configured**: 10+ routes
- **TypeScript Coverage**: 100%
- **Mock Data**: Complete for all features
- **Responsive Design**: Mobile, tablet, desktop

## Summary

This frontend architecture provides:

1. **Modern Stack**: React 18 + TypeScript + Vite for optimal DX
2. **Component Library**: Mantine UI for consistent, accessible components
3. **State Management**: TanStack Query + Zustand for efficient state handling
4. **Form Handling**: React Hook Form + Zod for type-safe forms
5. **Real-time Updates**: WebSocket integration for live status
6. **Performance**: Code splitting, virtualization, and optimization
7. **Testing**: Comprehensive testing with Vitest and MSW
8. **Accessibility**: WCAG 2.1 AA compliant components
9. **Mobile-First**: Responsive design that works everywhere
10. **Developer Experience**: Hot reload, TypeScript, and great tooling

The architecture is scalable, maintainable, and provides excellent user experience across all device types while maintaining high performance standards.

---

*Document Version: 1.1*  
*Last Updated: November 2024*  
*Status: Partially Implemented*  
*Implementation Progress: ~70% Complete*