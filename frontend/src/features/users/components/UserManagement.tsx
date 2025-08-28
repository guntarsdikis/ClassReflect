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
  MultiSelect,
  Switch,
  Space,
  Flex,
  Alert,
  Tabs,
  NumberInput,
  FileButton,
  Textarea,
} from '@mantine/core';
import {
  IconPlus,
  IconEye,
  IconEdit,
  IconTrash,
  IconUsers,
  IconSchool,
  IconUserPlus,
  IconUpload,
  IconDownload,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconSearch,
  IconKey,
  IconCopy,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import { format } from 'date-fns';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { usersService, User, CreateTeacherRequest, CreateSchoolManagerRequest } from '../services/users.service';
import { schoolsService, School } from '@features/schools/services/schools.service';
import { subjectsService, SchoolSubject } from '@features/schools/services/subjects.service';
import { useAuthStore } from '@store/auth.store';

interface TeacherFormData extends CreateTeacherRequest {
  schoolId: number;
}

interface ManagerFormData extends CreateSchoolManagerRequest {}

interface BulkTeacher {
  email: string;
  firstName: string;
  lastName: string;
  subjects: string;
  grades: string;
}

export function UserManagement() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const [teacherModalOpened, { open: openTeacherModal, close: closeTeacherModal }] = useDisclosure(false);
  const [managerModalOpened, { open: openManagerModal, close: closeManagerModal }] = useDisclosure(false);
  const [bulkModalOpened, { open: openBulkModal, close: closeBulkModal }] = useDisclosure(false);
  
  // Role-based access control
  const isSuperAdmin = currentUser.role === 'super_admin';
  const isSchoolManager = currentUser.role === 'school_manager';
  const currentUserSchoolId = currentUser.schoolId;
  
  const [users, setUsers] = useState<User[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolSubjects, setSchoolSubjects] = useState<SchoolSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterSchool, setFilterSchool] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [teacherFormData, setTeacherFormData] = useState<TeacherFormData>({
    email: '',
    firstName: '',
    lastName: '',
    subjects: [],
    grades: [],
    schoolId: 0,
    sendInviteEmail: true,
  });

  const [managerFormData, setManagerFormData] = useState<ManagerFormData>({
    schoolName: '',
    domain: '',
    subscriptionTier: 'basic',
    managerEmail: '',
    managerFirstName: '',
    managerLastName: '',
  });

  const [bulkCsvContent, setBulkCsvContent] = useState('');
  const [bulkFile, setBulkFile] = useState<File | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      console.log('User Management - Current User:', { 
        role: currentUser.role, 
        schoolId: currentUserSchoolId 
      });
      
      if (isSuperAdmin) {
        // Super admin can see all users and schools
        const [usersData, schoolsData] = await Promise.all([
          usersService.getAllUsers(),
          schoolsService.getAllSchools(),
        ]);
        console.log('Super Admin - Loaded data:', { 
          usersCount: usersData.length, 
          schoolsCount: schoolsData.length 
        });
        setUsers(usersData);
        setSchools(schoolsData);
        
        // Load subjects for current user's school (or first school)
        if (currentUserSchoolId) {
          await loadSchoolSubjects(currentUserSchoolId);
        } else if (schoolsData.length > 0) {
          await loadSchoolSubjects(schoolsData[0].id);
        }
      } else if (isSchoolManager) {
        // School manager can only see users from their school
        console.log('School Manager - Loading data for school:', currentUserSchoolId);
        
        const [usersData, schoolData] = await Promise.all([
          usersService.getAllUsers(), // TODO: Add endpoint to get users by schoolId
          schoolsService.getSchool(currentUserSchoolId),
        ]);
        
        console.log('School Manager - Raw users data:', usersData);
        console.log('School Manager - School data:', schoolData);
        
        // Filter users to only show teachers from their school
        const filteredUsers = usersData.filter(user => 
          user.schoolId === currentUserSchoolId && user.role === 'teacher'
        );
        
        console.log('School Manager - Filtered users:', filteredUsers);
        
        setUsers(filteredUsers);
        setSchools([schoolData]);
        
        // Auto-set school filter for school managers
        setFilterSchool(currentUserSchoolId.toString());
        
        // Load subjects for the school manager's school
        await loadSchoolSubjects(currentUserSchoolId);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      console.error('Error details:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load user data',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSchoolSubjects = async (schoolId: number) => {
    try {
      const subjects = await subjectsService.getSchoolSubjects(schoolId);
      setSchoolSubjects(subjects);
    } catch (error) {
      console.error('Failed to load school subjects:', error);
      // Fall back to empty array - user can still create teachers without subjects
      setSchoolSubjects([]);
    }
  };

  // Load subjects when school changes in the form (for super admins)
  const handleSchoolChange = async (schoolId: number) => {
    setTeacherFormData({...teacherFormData, schoolId});
    if (isSuperAdmin && schoolId > 0) {
      await loadSchoolSubjects(schoolId);
    }
  };

  const handleCreateTeacher = () => {
    setEditingUser(null);
    setTeacherFormData({
      email: '',
      firstName: '',
      lastName: '',
      subjects: [],
      grades: [],
      schoolId: isSchoolManager ? currentUserSchoolId : 0,
      sendInviteEmail: true,
    });
    openTeacherModal();
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    if (user.role === 'teacher') {
      setTeacherFormData({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        subjects: user.subjects || [],
        grades: user.grades || [],
        schoolId: user.schoolId || 0,
        sendInviteEmail: false,
      });
      openTeacherModal();
    }
  };

  const handleSaveTeacher = async () => {
    try {
      if (!teacherFormData.email || !teacherFormData.firstName || !teacherFormData.lastName || !teacherFormData.schoolId) {
        notifications.show({
          title: 'Error',
          message: 'Please fill in all required fields',
          color: 'red',
        });
        return;
      }

      if (editingUser) {
        // Build update request - include schoolId only if super admin and school has changed
        const updateData: any = {
          subjects: teacherFormData.subjects,
          grades: teacherFormData.grades,
        };
        
        // Super admins can change school assignments
        if (isSuperAdmin && teacherFormData.schoolId !== editingUser.schoolId) {
          updateData.schoolId = teacherFormData.schoolId;
        }
        
        await usersService.updateTeacher(editingUser.id, updateData);
        
        const schoolChanged = isSuperAdmin && teacherFormData.schoolId !== editingUser.schoolId;
        const oldSchool = schools.find(s => s.id === editingUser.schoolId)?.name || 'Unknown';
        const newSchool = schools.find(s => s.id === teacherFormData.schoolId)?.name || 'Unknown';
        
        notifications.show({
          title: 'Success',
          message: schoolChanged 
            ? `Teacher updated and moved from ${oldSchool} to ${newSchool}` 
            : 'Teacher updated successfully',
          color: 'green',
        });
      } else {
        const result = await usersService.createTeacher(teacherFormData);
        notifications.show({
          title: 'Success',
          message: `Teacher created successfully. ${!teacherFormData.sendInviteEmail ? 'Temporary password: ' + result.temporaryPassword : ''}`,
          color: 'green',
        });
      }
      
      await loadData();
      closeTeacherModal();
    } catch (error) {
      console.error('Failed to save teacher:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save teacher',
        color: 'red',
      });
    }
  };

  const handleSaveManager = async () => {
    try {
      if (!managerFormData.schoolName || !managerFormData.managerEmail || !managerFormData.managerFirstName || !managerFormData.managerLastName) {
        notifications.show({
          title: 'Error',
          message: 'Please fill in all required fields',
          color: 'red',
        });
        return;
      }

      const result = await usersService.createSchoolWithManager(managerFormData);
      notifications.show({
        title: 'Success',
        message: `School and manager created successfully. Temporary password: ${result.temporaryPassword}`,
        color: 'green',
      });
      
      await loadData();
      closeManagerModal();
    } catch (error) {
      console.error('Failed to create school manager:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to create school and manager',
        color: 'red',
      });
    }
  };

  const handleBulkImport = async () => {
    try {
      if (!bulkCsvContent) {
        notifications.show({
          title: 'Error',
          message: 'Please provide CSV data',
          color: 'red',
        });
        return;
      }

      // Parse CSV content
      const lines = bulkCsvContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        notifications.show({
          title: 'Error',
          message: 'CSV must have at least a header row and one data row',
          color: 'red',
        });
        return;
      }

      // Skip header row, parse data
      const teachers = lines.slice(1).map(line => {
        const [email, firstName, lastName, subjects, grades] = line.split(',').map(cell => cell.trim());
        return {
          email,
          firstName,
          lastName,
          subjects: subjects ? subjects.split(';').map(s => s.trim()) : [],
          grades: grades ? grades.split(';').map(g => g.trim()) : [],
        };
      });

      const result = await usersService.bulkCreateTeachers({ teachers });
      notifications.show({
        title: 'Bulk Import Complete',
        message: `${result.successful} successful, ${result.failed} failed`,
        color: result.failed > 0 ? 'yellow' : 'green',
      });

      if (result.errors.length > 0) {
        console.log('Import errors:', result.errors);
      }
      
      await loadData();
      closeBulkModal();
    } catch (error) {
      console.error('Failed to bulk import:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to import teachers',
        color: 'red',
      });
    }
  };

  const handleResetPassword = async (user: User) => {
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
      console.log('🔐 Calling resetTeacherPassword for userId:', userId);
      const result = await usersService.resetTeacherPassword(userId);
      console.log('🔐 Password reset API response:', result);
      
      // Show password in a modal with copy functionality
      console.log('🔐 Opening success modal with data:', { 
        teacherName: result.teacherName, 
        temporaryPassword: result.temporaryPassword 
      });
      
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
      
      await loadData();
    } catch (error) {
      console.error('🔐 Failed to reset password:', error);
      console.error('🔐 Error details:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to reset password. Please try again.',
        color: 'red',
      });
    }
  };

  const handleDeleteUser = (user: User) => {
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
      await loadData();
    } catch (error) {
      console.error('Failed to delete user:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete user',
        color: 'red',
      });
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.schoolName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesSchool = filterSchool === 'all' || user.schoolId?.toString() === filterSchool;
    
    return matchesSearch && matchesRole && matchesSchool;
  });

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
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>{isSchoolManager ? 'Teacher Management' : 'User Management'}</Title>
          <Text c="dimmed">
            {isSchoolManager 
              ? 'Manage teachers in your school' 
              : 'Manage users, teachers, and school managers across the platform'
            }
          </Text>
        </div>
        <Group>
          {isSuperAdmin && (
            <Button
              leftSection={<IconUpload size={16} />}
              variant="light"
              onClick={openBulkModal}
            >
              Bulk Import
            </Button>
          )}
          {isSuperAdmin && (
            <Button
              leftSection={<IconSchool size={16} />}
              onClick={openManagerModal}
            >
              Create School & Manager
            </Button>
          )}
          <Button
            leftSection={<IconUserPlus size={16} />}
            onClick={handleCreateTeacher}
          >
            Create Teacher
          </Button>
        </Group>
      </Group>

      {/* User Statistics */}
      <Group mb="xl" grow>
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="sm">Total Users</Text>
              <Text fw={700} size="xl">{users.length}</Text>
            </div>
            <IconUsers size={40} color="var(--mantine-color-blue-6)" />
          </Group>
        </Card>
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="sm">Teachers</Text>
              <Text fw={700} size="xl">{users.filter(u => u.role === 'teacher').length}</Text>
            </div>
            <IconUserPlus size={40} color="var(--mantine-color-green-6)" />
          </Group>
        </Card>
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="sm">School Managers</Text>
              <Text fw={700} size="xl">{users.filter(u => u.role === 'school_manager').length}</Text>
            </div>
            <IconSchool size={40} color="var(--mantine-color-orange-6)" />
          </Group>
        </Card>
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="sm">Active Users</Text>
              <Text fw={700} size="xl">{users.filter(u => u.isActive).length}</Text>
            </div>
            <IconCheck size={40} color="var(--mantine-color-teal-6)" />
          </Group>
        </Card>
      </Group>

      {/* Filters and Search */}
      <Card shadow="sm" p="lg" radius="md" withBorder mb="xl">
        <Group>
          <TextInput
            placeholder={isSchoolManager ? 'Search teachers...' : 'Search users...'}
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          {isSuperAdmin && (
            <Select
              placeholder="Filter by role"
              value={filterRole}
              onChange={(value) => setFilterRole(value || 'all')}
              data={[
                { value: 'all', label: 'All Roles' },
                { value: 'teacher', label: 'Teachers' },
                { value: 'school_manager', label: 'School Managers' },
                { value: 'super_admin', label: 'Super Admins' },
              ]}
              w={200}
            />
          )}
          {isSuperAdmin && (
            <Select
              placeholder="Filter by school"
              value={filterSchool}
              onChange={(value) => setFilterSchool(value || 'all')}
              data={[
                { value: 'all', label: 'All Schools' },
                ...schools.map(school => ({
                  value: school.id.toString(),
                  label: school.name,
                })),
              ]}
              w={200}
            />
          )}
        </Group>
      </Card>

      {/* Users Table */}
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>All Users ({filteredUsers.length})</Title>
        </Group>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Text c="dimmed">Loading users...</Text>
          </div>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>User Details</Table.Th>
                <Table.Th>Role & School</Table.Th>
                <Table.Th>Subjects & Grades</Table.Th>
                <Table.Th>Status & Activity</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredUsers.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    <Text c="dimmed">No users found</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredUsers.map((user) => (
                  <Table.Tr key={user.id}>
                    <Table.Td>
                      <div>
                        <Text size="sm" fw={500}>{user.firstName} {user.lastName}</Text>
                        <Text size="xs" c="dimmed">{user.email}</Text>
                        <Text size="xs" c="dimmed">ID: {user.id}</Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Badge
                          color={getRoleColor(user.role)}
                          variant="light"
                          mb={4}
                        >
                          {getRoleName(user.role)}
                        </Badge>
                        <Text size="xs" c="dimmed">{user.schoolName || 'No School'}</Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        {user.subjects && user.subjects.length > 0 && (
                          <Text size="xs">
                            Subjects: {user.subjects.join(', ')}
                          </Text>
                        )}
                        {user.grades && user.grades.length > 0 && (
                          <Text size="xs" c="dimmed">
                            Grades: {user.grades.join(', ')}
                          </Text>
                        )}
                        {(!user.subjects || user.subjects.length === 0) && 
                         (!user.grades || user.grades.length === 0) && (
                          <Text size="xs" c="dimmed">No subjects/grades</Text>
                        )}
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Badge
                          color={user.isActive ? 'green' : 'red'}
                          variant={user.isActive ? 'light' : 'filled'}
                          mb={4}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          Created: {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                        </Text>
                        {user.lastLogin && (
                          <Text size="xs" c="dimmed">
                            Last login: {format(new Date(user.lastLogin), 'MMM dd, yyyy')}
                          </Text>
                        )}
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <ActionIcon 
                          variant="subtle" 
                          color="blue" 
                          onClick={() => navigate(`/admin/users/${user.id}`)}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                        {user.role === 'teacher' && (
                          <ActionIcon 
                            variant="subtle" 
                            color="gray"
                            onClick={() => handleEditUser(user)}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        )}
                        {user.role !== 'super_admin' && (
                          <ActionIcon 
                            variant="subtle" 
                            color="blue"
                            onClick={() => handleResetPassword(user)}
                            title="Reset Password"
                          >
                            <IconKey size={16} />
                          </ActionIcon>
                        )}
                        {user.role !== 'super_admin' && (
                          <ActionIcon 
                            variant="subtle" 
                            color="red"
                            onClick={() => handleDeleteUser(user)}
                            title="Delete User"
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {/* Create/Edit Teacher Modal */}
      <Modal 
        opened={teacherModalOpened} 
        onClose={closeTeacherModal} 
        title={
          <Group>
            <IconUserPlus size={20} />
            <Text fw={600}>
              {editingUser ? 'Edit Teacher' : 'Create New Teacher'}
            </Text>
          </Group>
        }
        size="lg"
      >
        <Stack>
          <Group grow>
            <TextInput
              label="First Name"
              placeholder="John"
              value={teacherFormData.firstName}
              onChange={(e) => setTeacherFormData({...teacherFormData, firstName: e.target.value})}
              required
              disabled={!!editingUser}
            />
            <TextInput
              label="Last Name"
              placeholder="Smith"
              value={teacherFormData.lastName}
              onChange={(e) => setTeacherFormData({...teacherFormData, lastName: e.target.value})}
              required
              disabled={!!editingUser}
            />
          </Group>

          <TextInput
            label="Email"
            placeholder="john.smith@school.edu"
            value={teacherFormData.email}
            onChange={(e) => setTeacherFormData({...teacherFormData, email: e.target.value})}
            required
            disabled={!!editingUser}
          />

          <Select
            label="School"
            placeholder="Select school"
            value={teacherFormData.schoolId.toString()}
            onChange={(value) => handleSchoolChange(parseInt(value || '0'))}
            data={schools.map(school => ({
              value: school.id.toString(),
              label: school.name,
            }))}
            required
            disabled={
              // Super admins can always change school, school managers can only select their own school when creating
              editingUser ? !isSuperAdmin : isSchoolManager
            }
            description={
              editingUser && isSuperAdmin 
                ? "As Super Admin, you can reassign teachers to different schools" 
                : undefined
            }
          />

          <Group grow>
            <MultiSelect
              label="Subjects"
              placeholder={schoolSubjects.length > 0 ? "Select subjects" : "No subjects available - school manager can add subjects"}
              value={teacherFormData.subjects}
              onChange={(subjects) => setTeacherFormData({...teacherFormData, subjects})}
              data={schoolSubjects.map(subject => ({
                value: subject.subject_name,
                label: subject.subject_name
              }))}
              disabled={schoolSubjects.length === 0}
              description={
                schoolSubjects.length === 0 && isSchoolManager 
                  ? "Add subjects in Subject Management to assign them to teachers"
                  : undefined
              }
            />
            <MultiSelect
              label="Grades"
              placeholder="Select grades"
              value={teacherFormData.grades}
              onChange={(grades) => setTeacherFormData({...teacherFormData, grades})}
              data={[
                'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'
              ]}
            />
          </Group>

          {!editingUser && (
            <Switch
              label="Send invite email to teacher"
              checked={teacherFormData.sendInviteEmail}
              onChange={(event) => setTeacherFormData({...teacherFormData, sendInviteEmail: event.currentTarget.checked})}
            />
          )}

          <Space h="md" />

          <Flex justify="flex-end" gap="sm">
            <Button variant="light" onClick={closeTeacherModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveTeacher}
              leftSection={editingUser ? <IconCheck size={16} /> : <IconUserPlus size={16} />}
            >
              {editingUser ? 'Update Teacher' : 'Create Teacher'}
            </Button>
          </Flex>
        </Stack>
      </Modal>

      {/* Create School & Manager Modal */}
      <Modal 
        opened={managerModalOpened} 
        onClose={closeManagerModal} 
        title={
          <Group>
            <IconSchool size={20} />
            <Text fw={600}>Create New School & Manager</Text>
          </Group>
        }
        size="lg"
      >
        <Stack>
          <TextInput
            label="School Name"
            placeholder="Lincoln Elementary School"
            value={managerFormData.schoolName}
            onChange={(e) => setManagerFormData({...managerFormData, schoolName: e.target.value})}
            required
          />

          <Group grow>
            <TextInput
              label="Domain (Optional)"
              placeholder="lincoln-elem.edu"
              value={managerFormData.domain}
              onChange={(e) => setManagerFormData({...managerFormData, domain: e.target.value})}
            />
            <Select
              label="Subscription Tier"
              value={managerFormData.subscriptionTier}
              onChange={(value) => setManagerFormData({...managerFormData, subscriptionTier: value as any})}
              data={[
                { value: 'basic', label: 'Basic' },
                { value: 'professional', label: 'Professional' },
                { value: 'enterprise', label: 'Enterprise' },
              ]}
              required
            />
          </Group>

          <Title order={5} mt="md">Manager Details</Title>

          <Group grow>
            <TextInput
              label="Manager First Name"
              placeholder="Jane"
              value={managerFormData.managerFirstName}
              onChange={(e) => setManagerFormData({...managerFormData, managerFirstName: e.target.value})}
              required
            />
            <TextInput
              label="Manager Last Name"
              placeholder="Doe"
              value={managerFormData.managerLastName}
              onChange={(e) => setManagerFormData({...managerFormData, managerLastName: e.target.value})}
              required
            />
          </Group>

          <TextInput
            label="Manager Email"
            placeholder="jane.doe@lincoln-elem.edu"
            value={managerFormData.managerEmail}
            onChange={(e) => setManagerFormData({...managerFormData, managerEmail: e.target.value})}
            required
          />

          <Space h="md" />

          <Flex justify="flex-end" gap="sm">
            <Button variant="light" onClick={closeManagerModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveManager}
              leftSection={<IconSchool size={16} />}
            >
              Create School & Manager
            </Button>
          </Flex>
        </Stack>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal 
        opened={bulkModalOpened} 
        onClose={closeBulkModal} 
        title={
          <Group>
            <IconUpload size={20} />
            <Text fw={600}>Bulk Import Teachers</Text>
          </Group>
        }
        size="lg"
      >
        <Stack>
          <Alert color="blue" icon={<IconAlertCircle />}>
            Upload a CSV file with the following format:
            <br />
            <strong>email,firstName,lastName,subjects,grades</strong>
            <br />
            Subjects and grades should be separated by semicolons (e.g., "Math;Science")
          </Alert>

          <FileButton onChange={setBulkFile} accept=".csv">
            {(props) => (
              <Button {...props} leftSection={<IconUpload size={16} />}>
                Upload CSV File
              </Button>
            )}
          </FileButton>

          {bulkFile && (
            <Text size="sm" c="dimmed">
              Selected file: {bulkFile.name}
            </Text>
          )}

          <Text fw={500}>Or paste CSV content:</Text>
          <Textarea
            placeholder="email,firstName,lastName,subjects,grades&#10;john@school.edu,John,Smith,Math;Science,5;6"
            value={bulkCsvContent}
            onChange={(e) => setBulkCsvContent(e.target.value)}
            minRows={6}
          />

          <Space h="md" />

          <Flex justify="flex-end" gap="sm">
            <Button variant="light" onClick={closeBulkModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkImport}
              leftSection={<IconUpload size={16} />}
            >
              Import Teachers
            </Button>
          </Flex>
        </Stack>
      </Modal>
    </Container>
  );
}