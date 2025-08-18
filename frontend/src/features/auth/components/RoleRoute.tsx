import { Navigate, Outlet } from 'react-router-dom';
import { Text, Container, Title, Button, Group } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { useAuthStore, type UserRole } from '@store/auth.store';
import { Link } from 'react-router-dom';

interface RoleRouteProps {
  roles: UserRole[];
}

export function RoleRoute({ roles }: RoleRouteProps) {
  const user = useAuthStore((state) => state.user);
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!roles.includes(user.role)) {
    // Show access denied page
    return (
      <Container size="sm" py="xl">
        <Group justify="center" mb="xl">
          <IconLock size={80} color="var(--mantine-color-red-6)" />
        </Group>
        
        <Title order={1} ta="center" mb="md">
          Access Denied
        </Title>
        
        <Text ta="center" c="dimmed" mb="xl">
          You don't have permission to access this page.
          This area is restricted to {roles.join(' or ')} users only.
        </Text>
        
        <Group justify="center">
          <Button component={Link} to="/dashboard" variant="subtle">
            Go to Dashboard
          </Button>
        </Group>
      </Container>
    );
  }
  
  return <Outlet />;
}