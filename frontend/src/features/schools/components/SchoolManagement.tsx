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
  ScrollArea,
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
  IconBan,
  IconBuildingBank,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconTemplate,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import { formatDateLocal } from '@shared/utils/date';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { schoolsService, School } from '../services/schools.service';


interface SchoolFormData {
  name: string;
  domain: string;
  contactEmail: string;
  isActive: boolean;
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
    isActive: true,
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
      // Load real data from backend
      const data = await schoolsService.getAllSchools();
      setSchools(data);
    } catch (error) {
      console.error('Failed to load schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'green' : 'red';
  };

  const handleCreateSchool = () => {
    setEditingSchool(null);
    setFormData({
      name: '',
      domain: '',
      contactEmail: '',
      isActive: true,
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
      isActive: school.is_active,
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
        is_active: formData.isActive,
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

  const handleDelete = (school: School) => {
    modals.openConfirmModal({
      title: 'Suspend School',
      children: (
        <Text size="sm">
          Are you sure you want to suspend <strong>{school.name}</strong>? 
          This will cancel their subscription and prevent access to the platform.
          This action can be reversed later.
        </Text>
      ),
      labels: { confirm: 'Suspend School', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => confirmSuspendSchool(school.id),
    });
  };

  const handleImportTLC = (school: School) => {
    modals.openConfirmModal({
      title: 'Import Teach Like a Champion Templates',
      children: (
        <Stack>
          <Text size="sm">
            This will import 2 research-proven TLC templates to <strong>"{school.name}"</strong>:
          </Text>
          <Stack gap="xs" ml="md">
            <Text size="sm">• <strong>Foundation Techniques</strong> (19 criteria) - Ideal for new teachers</Text>
            <Text size="sm">• <strong>Complete Framework</strong> (16 criteria) - For experienced teachers</Text>
          </Stack>
          <Text size="sm" c="dimmed">
            Templates will be available immediately for all teachers in this school to use in their upload wizard and analysis.
          </Text>
        </Stack>
      ),
      labels: { confirm: 'Import Templates', cancel: 'Cancel' },
      confirmProps: { color: 'green' },
      onConfirm: async () => {
        try {
          const result = await schoolsService.importTLCTemplates(school.id);
          notifications.show({
            title: 'Templates Imported Successfully',
            message: `${result.imported.length} TLC templates added to ${school.name}`,
            color: 'green'
          });
          // Optionally refresh the schools list if needed
          // loadSchools();
        } catch (error: any) {
          notifications.show({
            title: 'Import Failed',
            message: error.message || 'Failed to import templates',
            color: 'red'
          });
        }
      }
    });
  };

  const confirmSuspendSchool = async (schoolId: number) => {
    try {
      await schoolsService.suspendSchool(schoolId);
      notifications.show({
        title: 'Success',
        message: 'School has been suspended successfully',
        color: 'green',
      });
      await loadSchools(); // Reload the list
    } catch (error) {
      console.error('Failed to suspend school:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to suspend school. Please try again.',
        color: 'red',
      });
    }
  };

  const suspendedSchools = schools.filter(school => !school.is_active).length;
  const activeSchools = schools.filter(school => school.is_active).length;

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl" wrap="wrap" gap="sm">
        <div>
          <Title order={1}>School Management</Title>
          <Text c="dimmed">Manage schools and platform access</Text>
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

      {/* Alerts for suspended schools */}
      {suspendedSchools > 0 && (
        <Alert variant="filled" color="red" icon={<IconAlertCircle />} mb="md">
          {suspendedSchools} school{suspendedSchools > 1 ? 's are' : ' is'} currently suspended
        </Alert>
      )}

      {/* Schools Table */}
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>All Schools ({schools.length})</Title>
          <Group>
            <Badge variant="light" color="green">
              {activeSchools} Active
            </Badge>
            <Badge variant="light" color="red">
              {suspendedSchools} Suspended
            </Badge>
          </Group>
        </Group>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Text c="dimmed">Loading schools...</Text>
          </div>
        ) : (
          <ScrollArea>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>School Details</Table.Th>
                <Table.Th>Manager</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Usage</Table.Th>
                <Table.Th>Created</Table.Th>
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
                        color={getStatusColor(school.is_active)}
                        variant="light"
                      >
                        {school.is_active ? 'Active' : 'Suspended'}
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
                        <Text size="sm">
                          {formatDateLocal(school.created_at)}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Updated: {formatDateLocal(school.updated_at)}
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
                          onClick={() => handleDelete(school)}
                          title="Suspend School"
                        >
                          <IconBan size={16} />
                        </ActionIcon>
                        <ActionIcon 
                          variant="subtle" 
                          color="green"
                          onClick={() => handleImportTLC(school)}
                          title="Import Teach Like a Champion Templates"
                        >
                          <IconTemplate size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
          </ScrollArea>
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

          <Select
            label="Status"
            value={formData.isActive ? 'active' : 'suspended'}
            onChange={(value) => setFormData({...formData, isActive: value === 'active'})}
            data={[
              { value: 'active', label: 'Active' },
              { value: 'suspended', label: 'Suspended' },
            ]}
            required
          />

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
