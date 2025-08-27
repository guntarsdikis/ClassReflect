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
} from '@mantine/core';
import { IconArrowLeft, IconAlertCircle } from '@tabler/icons-react';
import { usersService, User } from '../services/users.service';

export function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
                  <Text>{new Date(user.createdAt).toLocaleDateString()}</Text>
                </Group>
                {user.lastLogin && (
                  <Group justify="space-between">
                    <Text fw={500}>Last Login:</Text>
                    <Text>{new Date(user.lastLogin).toLocaleDateString()}</Text>
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