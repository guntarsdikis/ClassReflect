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
import { schoolsService, School } from '../services/schools.service';
import { formatDateLocal } from '@shared/utils/date';

export function SchoolDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadSchool(id);
    }
  }, [id]);

  const loadSchool = async (schoolId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await schoolsService.getSchool(parseInt(schoolId));
      setSchool(data);
    } catch (error) {
      console.error('Failed to load school:', error);
      setError('Failed to load school details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'trial': return 'blue';
      case 'expired': return 'red';
      case 'suspended': return 'yellow';
      case 'cancelled': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <Container size="xl">
      <Group mb="xl">
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate('/admin/schools')}
        >
          Back to Schools
        </Button>
      </Group>

      <Card shadow="sm" p="lg" radius="md" withBorder style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />
        
        {error && (
          <Alert variant="light" color="red" icon={<IconAlertCircle />} mb="md">
            {error}
          </Alert>
        )}

        {school && (
          <Stack>
            <Group justify="space-between">
              <div>
                <Title order={2}>{school.name}</Title>
                <Text c="dimmed">{school.domain}</Text>
              </div>
              <Badge
                color={getStatusColor(school.subscription_status)}
                variant="light"
                size="lg"
              >
                {school.subscription_status}
              </Badge>
            </Group>

            <Card withBorder>
              <Title order={4} mb="md">School Information</Title>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text fw={500}>Contact Email:</Text>
                  <Text>{school.contact_email}</Text>
                </Group>
                <Group justify="space-between">
                  <Text fw={500}>Manager:</Text>
                  <Text>
                    {school.manager_first_name && school.manager_last_name 
                      ? `${school.manager_first_name} ${school.manager_last_name}`
                      : 'No Manager'}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text fw={500}>Manager Email:</Text>
                  <Text>{school.manager_email || 'No email'}</Text>
                </Group>
              </Stack>
            </Card>

            <Card withBorder>
              <Title order={4} mb="md">Usage & Limits</Title>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text fw={500}>Teachers:</Text>
                  <Text>{school.total_teachers || 0} / {school.max_teachers}</Text>
                </Group>
                <Group justify="space-between">
                  <Text fw={500}>Monthly Uploads:</Text>
                  <Text>{school.monthly_uploads || 0} / {school.max_monthly_uploads}</Text>
                </Group>
                <Group justify="space-between">
                  <Text fw={500}>Total Uploads:</Text>
                  <Text>{school.total_uploads || 0}</Text>
                </Group>
              </Stack>
            </Card>

            <Card withBorder>
              <Title order={4} mb="md">Subscription Details</Title>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text fw={500}>Status:</Text>
                  <Badge color={getStatusColor(school.subscription_status)} variant="light">
                    {school.subscription_status}
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text fw={500}>Expires:</Text>
                  <Text>{formatDateLocal(school.subscription_expires)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text fw={500}>Created:</Text>
                  <Text>{formatDateLocal(school.created_at)}</Text>
                </Group>
              </Stack>
            </Card>
          </Stack>
        )}
      </Card>
    </Container>
  );
}
