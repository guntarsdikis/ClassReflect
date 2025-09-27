import { useState, useEffect } from 'react';
import {
  Container,
  Card,
  Text,
  Title,
  Group,
  Stack,
  Button,
  TextInput,
  Space,
  Alert,
  Badge,
  Divider,
  LoadingOverlay,
} from '@mantine/core';
import {
  IconUser,
  IconMail,
  IconCheck,
  IconAlertCircle,
  IconEdit,
  IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '@shared/services/api.client';
import { useAuthStore } from '@store/auth.store';
import { formatDateLocal, formatDateTimeLocal } from '@shared/utils/date';

interface ProfileData {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  schoolId: number | null;
  schoolName: string | null;
  subjects: string[];
  grades: string[];
  createdAt: string;
  lastLogin: string | null;
}

export function ProfilePage() {
  const currentUser = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  // Load profile data on component mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profileData = await api.users.getProfile();
      setProfile(profileData);
      
      // Initialize form data
      setFormData({
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        email: profileData.email || '',
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load profile information',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Validate form
      if (!formData.firstName || !formData.lastName || !formData.email) {
        notifications.show({
          title: 'Validation Error',
          message: 'Please fill in all required fields',
          color: 'orange',
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        notifications.show({
          title: 'Validation Error',
          message: 'Please enter a valid email address',
          color: 'orange',
        });
        return;
      }

      setSaving(true);
      
      const response = await api.users.updateProfile(formData);
      
      // Update profile state
      setProfile(response.user);
      
      // Update auth store if email changed
      if (formData.email !== currentUser.email) {
        updateUser({
          ...currentUser,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
        });
      }
      
      setEditing(false);
      
      notifications.show({
        title: 'Success',
        message: 'Profile updated successfully',
        color: 'green',
      });
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      
      const errorMessage = error?.response?.data?.error || 'Failed to update profile';
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original profile values
    setFormData({
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      email: profile?.email || '',
    });
    setEditing(false);
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Administrator';
      case 'school_manager': return 'School Manager';
      case 'teacher': return 'Teacher';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'red';
      case 'school_manager': return 'blue';
      case 'teacher': return 'green';
      default: return 'gray';
    }
  };

  if (loading) {
    return (
      <Container size="md" py="xl">
        <Card shadow="sm" padding="lg" radius="md" withBorder pos="relative">
          <LoadingOverlay visible={loading} />
          <Title order={2} mb="md">
            <IconUser size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            User Profile
          </Title>
          <Text c="dimmed">Loading profile information...</Text>
        </Card>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container size="md" py="xl">
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          title="Error"
          color="red"
        >
          Failed to load profile information. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Card shadow="sm" padding="lg" radius="md" withBorder pos="relative">
        <LoadingOverlay visible={saving} />
        
        <Group justify="space-between" mb="lg">
          <Title order={2}>
            <IconUser size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            User Profile
          </Title>
          
          {!editing ? (
            <Button
              leftSection={<IconEdit size="1rem" />}
              onClick={() => setEditing(true)}
              variant="light"
            >
              Edit Profile
            </Button>
          ) : (
            <Group gap="xs">
              <Button
                leftSection={<IconCheck size="1rem" />}
                onClick={handleSave}
                loading={saving}
              >
                Save Changes
              </Button>
              <Button
                leftSection={<IconX size="1rem" />}
                onClick={handleCancel}
                variant="light"
                color="gray"
                disabled={saving}
              >
                Cancel
              </Button>
            </Group>
          )}
        </Group>

        <Stack gap="md">
          {/* Basic Information */}
          <div>
            <Text size="sm" fw={600} c="dimmed" mb="xs">
              BASIC INFORMATION
            </Text>
            
            <Stack gap="sm">
              <TextInput
                label="First Name"
                placeholder="Enter your first name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                disabled={!editing}
                required
              />
              
              <TextInput
                label="Last Name"
                placeholder="Enter your last name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                disabled={!editing}
                required
              />
              
              <TextInput
                label="Email Address"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!editing}
                required
                leftSection={<IconMail size="1rem" />}
              />
            </Stack>
          </div>

          <Divider />

          {/* Account Information (Read-only) */}
          <div>
            <Text size="sm" fw={600} c="dimmed" mb="xs">
              ACCOUNT INFORMATION
            </Text>
            
            <Stack gap="sm">
              <Group>
                <Text size="sm" fw={500}>Role:</Text>
                <Badge color={getRoleColor(profile.role)} variant="light">
                  {getRoleDisplayName(profile.role)}
                </Badge>
              </Group>
              
              {profile.schoolName && (
                <Group>
                  <Text size="sm" fw={500}>School:</Text>
                  <Text size="sm">{profile.schoolName}</Text>
                </Group>
              )}
              
              {profile.subjects && profile.subjects.length > 0 && (
                <Group>
                  <Text size="sm" fw={500}>Subjects:</Text>
                  <Group gap={4}>
                    {profile.subjects.map((subject, index) => (
                      <Badge key={index} size="sm" variant="outline" color="blue">
                        {subject}
                      </Badge>
                    ))}
                  </Group>
                </Group>
              )}
              
              {profile.grades && profile.grades.length > 0 && (
                <Group>
                  <Text size="sm" fw={500}>Grades:</Text>
                  <Group gap={4}>
                    {profile.grades.map((grade, index) => (
                      <Badge key={index} size="sm" variant="outline" color="green">
                        {grade}
                      </Badge>
                    ))}
                  </Group>
                </Group>
              )}
              
              <Group>
                <Text size="sm" fw={500}>Account Created:</Text>
                <Text size="sm" c="dimmed">
                  {profile.createdAt && !isNaN(Date.parse(profile.createdAt))
                    ? formatDateLocal(profile.createdAt, { dateStyle: 'long' })
                    : 'Unknown'}
                </Text>
              </Group>
              
              {profile.lastLogin && !isNaN(Date.parse(profile.lastLogin)) && (
                <Group>
                  <Text size="sm" fw={500}>Last Login:</Text>
                  <Text size="sm" c="dimmed">
                    {formatDateTimeLocal(profile.lastLogin, { dateStyle: 'long', timeStyle: 'short' })}
                  </Text>
                </Group>
              )}
            </Stack>
          </div>
        </Stack>

        {editing && (
          <>
            <Space h="md" />
            <Alert
              icon={<IconAlertCircle size="1rem" />}
              title="Important"
              color="blue"
              variant="light"
            >
              Changing your email address will require you to log in again with the new email.
            </Alert>
          </>
        )}
      </Card>
    </Container>
  );
}
