import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  Text,
  Title,
  Badge,
  Group,
  Stack,
  Button,
  LoadingOverlay,
  Alert,
  ActionIcon,
  TextInput,
} from '@mantine/core';
import { IconArrowLeft, IconAlertCircle, IconKey, IconTrash, IconCopy, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { useAuthStore } from '@store/auth.store';
import { usersService, User } from '../services/users.service';
import { formatDateLocal } from '@shared/utils/date';

export function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadUser(id);
    }
  }, [id]);

  const loadUser = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      // For now, get all users and find the specific one
      // TODO: Create a dedicated getUserById endpoint
      const users = await usersService.getAllUsers();
      const foundUser = users.find(u => u.id === parseInt(userId));
      
      if (!foundUser) {
        setError('User not found');
        return;
      }
      
      setUser(foundUser);
    } catch (error) {
      console.error('Failed to load user:', error);
      setError('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'teacher': return 'blue';
      case 'school_manager': return 'green';
      case 'super_admin': return 'red';
      default: return 'gray';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'teacher': return 'Teacher';
      case 'school_manager': return 'School Manager';
      case 'super_admin': return 'Super Admin';
      default: return role;
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;
    
    modals.openConfirmModal({
      title: 'Reset Password',
      children: (
        <Text size="sm">
          Are you sure you want to reset the password for <strong>{user.firstName} {user.lastName}</strong>? 
          A new temporary password will be generated and they will need to change it on their next login.
        </Text>
      ),
      labels: { confirm: 'Reset Password', cancel: 'Cancel' },
      confirmProps: { color: 'blue' },
      onConfirm: () => confirmResetPassword(user.id),
    });
  };

  const confirmResetPassword = async (userId: number) => {
    try {
      const result = await usersService.resetTeacherPassword(userId);
      
      // Show password in a modal with copy functionality
      modals.open({
        title: 'Password Reset Successful',
        children: (
          <Stack gap="md">
            <Alert variant="light" color="green" icon={<IconCheck />}>
              Password has been reset successfully for <strong>{result.teacherName}</strong>
            </Alert>
            
            <div>
              <Text size="sm" fw={500} mb="xs">Temporary Password:</Text>
              <Group gap="xs">
                <TextInput
                  value={result.temporaryPassword}
                  readOnly
                  style={{ flex: 1 }}
                />
                <ActionIcon 
                  variant="light" 
                  color="blue"
                  onClick={() => {
                    navigator.clipboard.writeText(result.temporaryPassword);
                    notifications.show({
                      message: 'Password copied to clipboard',
                      color: 'blue',
                    });
                  }}
                >
                  <IconCopy size={16} />
                </ActionIcon>
              </Group>
            </div>
            
            <Alert variant="light" color="yellow" icon={<IconAlertCircle />}>
              <Text size="sm">
                <strong>Important:</strong> Share this password securely with {result.teacherName} ({result.teacherEmail}). 
                They will be required to change it on their next login.
              </Text>
            </Alert>
          </Stack>
        ),
        size: 'md',
      });
      
      // Reload user data
      if (id) {
        await loadUser(id);
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to reset password. Please try again.',
        color: 'red',
      });
    }
  };

  const handleDeleteUser = () => {
    if (!user) return;
    
    modals.openConfirmModal({
      title: 'Delete User',
      children: (
        <Text size="sm">
          Are you sure you want to delete <strong>{user.firstName} {user.lastName}</strong>? 
          If they have associated teaching records, their account will be deactivated instead of deleted.
          This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete User', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => confirmDeleteUser(user.id),
    });
  };

  const confirmDeleteUser = async (userId: number) => {
    try {
      const result = await usersService.deleteTeacher(userId);
      notifications.show({
        title: 'Success',
        message: result.deleted ? 'User deleted successfully' : 'User deactivated successfully (had associated records)',
        color: 'green',
      });
      // Navigate back to users list
      navigate('/admin/users');
    } catch (error) {
      console.error('Failed to delete user:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete user',
        color: 'red',
      });
    }
  };

  // Check if current user can manage this user
  const canManageUser = () => {
    if (!currentUser || !user) return false;
    if (user.role === 'super_admin') return false; // Never manage super admin
    if (currentUser.role === 'super_admin') return true;
    if (currentUser.role === 'school_manager' && user.role === 'teacher') {
      return currentUser.schoolId === user.schoolId; // Same school only
    }
    return false;
  };

  return (
    <Container size="xl">
      <Group mb="xl">
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate('/admin/users')}
        >
          Back to Users
        </Button>
      </Group>

      <Card shadow="sm" p="lg" radius="md" withBorder style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />
        
        {error && (
          <Alert variant="light" color="red" icon={<IconAlertCircle />} mb="md">
            {error}
          </Alert>
        )}

        {user && (
          <Stack>
            <Group justify="space-between">
              <div>
                <Title order={2}>{user.firstName} {user.lastName}</Title>
                <Text c="dimmed">{user.email}</Text>
              </div>
              <Group>
                <Badge
                  color={getRoleColor(user.role)}
                  variant="light"
                  size="lg"
                >
                  {getRoleName(user.role)}
                </Badge>
                <Badge
                  color={user.isActive ? 'green' : 'red'}
                  variant={user.isActive ? 'light' : 'filled'}
                  size="lg"
                >
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
                
                {canManageUser() && (
                  <>
                    <Button
                      variant="light"
                      color="blue"
                      leftSection={<IconKey size={16} />}
                      onClick={handleResetPassword}
                      size="sm"
                    >
                      Reset Password
                    </Button>
                    <Button
                      variant="light"
                      color="red"
                      leftSection={<IconTrash size={16} />}
                      onClick={handleDeleteUser}
                      size="sm"
                    >
                      Delete User
                    </Button>
                  </>
                )}
              </Group>
            </Group>

            <Card withBorder>
              <Title order={4} mb="md">User Information</Title>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text fw={500}>User ID:</Text>
                  <Text>{user.id}</Text>
                </Group>
                <Group justify="space-between">
                  <Text fw={500}>Email:</Text>
                  <Text>{user.email}</Text>
                </Group>
                <Group justify="space-between">
                  <Text fw={500}>Role:</Text>
                  <Badge color={getRoleColor(user.role)} variant="light">
                    {getRoleName(user.role)}
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text fw={500}>School:</Text>
                  <Text>{user.schoolName || 'No School Assigned'}</Text>
                </Group>
                <Group justify="space-between">
                  <Text fw={500}>Status:</Text>
                  <Badge color={user.isActive ? 'green' : 'red'} variant="light">
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </Group>
              </Stack>
            </Card>

            {user.role === 'teacher' && (
              <Card withBorder>
                <Title order={4} mb="md">Teaching Details</Title>
                <Stack gap="sm">
                  <div>
                    <Text fw={500} mb="xs">Subjects:</Text>
                    {user.subjects && user.subjects.length > 0 ? (
                      <Group gap="xs">
                        {user.subjects.map((subject, index) => (
                          <Badge key={index} variant="outline" size="sm">
                            {subject}
                          </Badge>
                        ))}
                      </Group>
                    ) : (
                      <Text c="dimmed" size="sm">No subjects assigned</Text>
                    )}
                  </div>
                  <div>
                    <Text fw={500} mb="xs">Grades:</Text>
                    {user.grades && user.grades.length > 0 ? (
                      <Group gap="xs">
                        {user.grades.map((grade, index) => (
                          <Badge key={index} variant="outline" size="sm" color="teal">
                            Grade {grade}
                          </Badge>
                        ))}
                      </Group>
                    ) : (
                      <Text c="dimmed" size="sm">No grades assigned</Text>
                    )}
                  </div>
                </Stack>
              </Card>
            )}

            <Card withBorder>
              <Title order={4} mb="md">Account Activity</Title>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text fw={500}>Created:</Text>
                  <Text>{formatDateLocal(user.createdAt)}</Text>
                </Group>
                {user.lastLogin && (
                  <Group justify="space-between">
                    <Text fw={500}>Last Login:</Text>
                    <Text>{formatDateLocal(user.lastLogin)}</Text>
                  </Group>
                )}
                <Group justify="space-between">
                  <Text fw={500}>Account Status:</Text>
                  <Badge color={user.isActive ? 'green' : 'red'} variant="light">
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </Group>
              </Stack>
            </Card>
          </Stack>
        )}
      </Card>
    </Container>
  );
}
