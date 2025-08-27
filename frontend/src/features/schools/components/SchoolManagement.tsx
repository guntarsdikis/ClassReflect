import { useState, useEffect } from 'react';
import {
  Container,
  Card,
  Text,
  Title,
  Badge,
  Group,
  Stack,
  Button,
  Table,
  ActionIcon,
  Modal,
  TextInput,
  Select,
  NumberInput,
  Textarea,
  Space,
  Flex,
  Alert,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  IconPlus,
  IconEye,
  IconEdit,
  IconTrash,
  IconBuildingBank,
  IconAlertCircle,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import { format } from 'date-fns';
import { schoolsService, School } from '../services/schools.service';


interface SchoolFormData {
  name: string;
  domain: string;
  contactEmail: string;
  subscriptionStatus: 'trial' | 'active' | 'suspended' | 'cancelled';
  subscriptionExpires: Date | null;
  maxTeachers: number;
  maxMonthlyUploads: number;
}

export function SchoolManagement() {
  const navigate = useNavigate();
  const [opened, { open, close }] = useDisclosure(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [formData, setFormData] = useState<SchoolFormData>({
    name: '',
    domain: '',
    contactEmail: '',
    subscriptionStatus: 'trial',
    subscriptionExpires: null,
    maxTeachers: 10,
    maxMonthlyUploads: 100,
  });

  // Load schools on component mount
  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      setLoading(true);
      const data = await schoolsService.getAllSchools();
      setSchools(data);
    } catch (error) {
      console.error('Failed to load schools:', error);
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

  const handleCreateSchool = () => {
    setEditingSchool(null);
    setFormData({
      name: '',
      domain: '',
      contactEmail: '',
      subscriptionStatus: 'trial',
      subscriptionExpires: null,
      maxTeachers: 10,
      maxMonthlyUploads: 100,
    });
    open();
  };

  const handleEditSchool = (school: School) => {
    setEditingSchool(school);
    setFormData({
      name: school.name,
      domain: school.domain || '',
      contactEmail: school.contact_email,
      subscriptionStatus: school.subscription_status,
      subscriptionExpires: new Date(school.subscription_expires),
      maxTeachers: school.max_teachers,
      maxMonthlyUploads: school.max_monthly_uploads,
    });
    open();
  };

  const handleSave = async () => {
    try {
      const saveData = {
        name: formData.name,
        domain: formData.domain,
        contact_email: formData.contactEmail,
        subscription_status: formData.subscriptionStatus,
        subscription_expires: formData.subscriptionExpires?.toISOString().split('T')[0],
        max_teachers: formData.maxTeachers,
        max_monthly_uploads: formData.maxMonthlyUploads,
      };

      if (editingSchool) {
        await schoolsService.updateSchool(editingSchool.id, saveData);
      } else {
        await schoolsService.createSchool(saveData);
      }
      
      await loadSchools(); // Reload the list
      close();
    } catch (error) {
      console.error('Failed to save school:', error);
    }
  };

  const handleDelete = async (schoolId: number) => {
    try {
      await schoolsService.suspendSchool(schoolId);
      await loadSchools(); // Reload the list
    } catch (error) {
      console.error('Failed to suspend school:', error);
    }
  };

  const expiredSchools = schools.filter(school => school.subscription_status === 'expired').length;
  const trialSchools = schools.filter(school => school.subscription_status === 'trial').length;

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>School Management</Title>
          <Text c="dimmed">Manage schools, subscriptions, and platform access</Text>
        </div>
        <Group>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleCreateSchool}
          >
            Create School
          </Button>
        </Group>
      </Group>

      {/* Alerts for expired/expiring schools */}
      {expiredSchools > 0 && (
        <Alert variant="filled" color="red" icon={<IconAlertCircle />} mb="md">
          {expiredSchools} school{expiredSchools > 1 ? 's' : ''} ha{expiredSchools > 1 ? 've' : 's'} expired subscriptions
        </Alert>
      )}

      {trialSchools > 0 && (
        <Alert variant="light" color="blue" icon={<IconAlertCircle />} mb="md">
          {trialSchools} school{trialSchools > 1 ? 's are' : ' is'} currently on trial
        </Alert>
      )}

      {/* Schools Table */}
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>All Schools ({schools.length})</Title>
          <Group>
            <Badge variant="light" color="blue">
              {trialSchools} Trials
            </Badge>
            <Badge variant="light" color="green">
              {schools.filter(s => s.subscription_status === 'active').length} Active
            </Badge>
            <Badge variant="light" color="red">
              {expiredSchools} Expired
            </Badge>
          </Group>
        </Group>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Text c="dimmed">Loading schools...</Text>
          </div>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>School Details</Table.Th>
                <Table.Th>Manager</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Usage</Table.Th>
                <Table.Th>Subscription</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {schools.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    <Text c="dimmed">No schools found</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                schools.map((school) => (
                  <Table.Tr key={school.id}>
                    <Table.Td>
                      <div>
                        <Text size="sm" fw={500}>{school.name}</Text>
                        <Text size="xs" c="dimmed">{school.domain}</Text>
                        <Text size="xs" c="dimmed">{school.contact_email}</Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Text size="sm">
                          {school.manager_first_name && school.manager_last_name 
                            ? `${school.manager_first_name} ${school.manager_last_name}`
                            : 'No Manager'}
                        </Text>
                        <Text size="xs" c="dimmed">{school.manager_email || 'No email'}</Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={getStatusColor(school.subscription_status)}
                        variant="light"
                      >
                        {school.subscription_status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Text size="sm">
                          {school.total_teachers || 0}/{school.max_teachers} teachers
                        </Text>
                        <Text size="xs" c="dimmed">
                          {school.monthly_uploads || 0}/{school.max_monthly_uploads} uploads/month
                        </Text>
                        <Text size="xs" c="dimmed">
                          {school.total_uploads || 0} total uploads
                        </Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Text 
                          size="sm" 
                          c={school.subscription_status === 'expired' ? 'red' : undefined}
                        >
                          Expires: {format(new Date(school.subscription_expires), 'MMM dd, yyyy')}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Created: {format(new Date(school.created_at), 'MMM dd, yyyy')}
                        </Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <ActionIcon 
                          variant="subtle" 
                          color="blue" 
                          onClick={() => navigate(`/admin/schools/${school.id}`)}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                        <ActionIcon 
                          variant="subtle" 
                          color="gray"
                          onClick={() => handleEditSchool(school)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon 
                          variant="subtle" 
                          color="red"
                          onClick={() => handleDelete(school.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {/* Create/Edit School Modal */}
      <Modal 
        opened={opened} 
        onClose={close} 
        title={
          <Group>
            <IconBuildingBank size={20} />
            <Text fw={600}>
              {editingSchool ? 'Edit School' : 'Create New School'}
            </Text>
          </Group>
        }
        size="lg"
      >
        <Stack>
          <TextInput
            label="School Name"
            placeholder="Lincoln Elementary School"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />

          <Group grow>
            <TextInput
              label="Domain"
              placeholder="lincoln-elem.edu"
              value={formData.domain}
              onChange={(e) => setFormData({...formData, domain: e.target.value})}
              required
            />
            <TextInput
              label="Contact Email"
              placeholder="admin@lincoln-elem.edu"
              value={formData.contactEmail}
              onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
              required
            />
          </Group>

          <Group grow>
            <Select
              label="Subscription Status"
              value={formData.subscriptionStatus}
              onChange={(value) => setFormData({...formData, subscriptionStatus: value as any})}
              data={[
                { value: 'trial', label: 'Trial' },
                { value: 'active', label: 'Active' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              required
            />
            <DateInput
              label="Subscription Expires"
              value={formData.subscriptionExpires}
              onChange={(date) => setFormData({...formData, subscriptionExpires: date})}
              required
            />
          </Group>

          <Group grow>
            <NumberInput
              label="Max Teachers"
              value={formData.maxTeachers}
              onChange={(value) => setFormData({...formData, maxTeachers: Number(value)})}
              min={1}
              max={1000}
              required
            />
            <NumberInput
              label="Max Monthly Uploads"
              value={formData.maxMonthlyUploads}
              onChange={(value) => setFormData({...formData, maxMonthlyUploads: Number(value)})}
              min={10}
              max={10000}
              required
            />
          </Group>

          <Space h="md" />

          <Flex justify="flex-end" gap="sm">
            <Button variant="light" onClick={close}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              leftSection={editingSchool ? <IconCheck size={16} /> : <IconPlus size={16} />}
            >
              {editingSchool ? 'Update School' : 'Create School'}
            </Button>
          </Flex>
        </Stack>
      </Modal>
    </Container>
  );
}