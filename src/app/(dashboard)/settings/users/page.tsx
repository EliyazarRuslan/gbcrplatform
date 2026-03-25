'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import Modal from '@/components/ui/modal';
import Badge from '@/components/ui/badge';
import DataTable, { Column } from '@/components/ui/data-table';
import type { User, Role } from '@/types/auth';

// DataTable requires Record<string, unknown>; extend User to satisfy that constraint
type UserRow = User & Record<string, unknown>;

const roleOptions = [
  { label: 'Super Admin', value: 'super_admin' },
  { label: 'Branch Manager', value: 'branch_manager' },
  { label: 'Customer Service', value: 'customer_service' },
  { label: 'Rental Officer', value: 'rental_officer' },
  { label: 'Inspector', value: 'inspector' },
  { label: 'Driver', value: 'driver' },
  { label: 'Finance', value: 'finance' },
];

const roleFilterOptions = [
  { label: 'All Roles', value: '' },
  ...roleOptions,
];

const statusFilterOptions = [
  { label: 'All Statuses', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Suspended', value: 'suspended' },
];

function getRoleLabel(role: Role): string {
  return roleOptions.find((o) => o.value === role)?.label ?? role;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  try {
    return new Date(dateStr).toLocaleDateString('en-SG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Never';
  }
}

interface FormState {
  email: string;
  full_name: string;
  phone: string;
  role: Role | '';
  branch_id: string;
}

const emptyForm: FormState = {
  email: '',
  full_name: '',
  phone: '',
  role: '',
  branch_id: '',
};

export default function UserManagementPage() {
  // List state
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search,
        role: roleFilter,
        status: statusFilter,
      });
      const res = await fetch(`/api/users?${params}`);
      const json = await res.json();
      if (json.success) {
        setUsers(json.data as UserRow[]);
        setTotal(json.pagination.total);
      }
    } catch {
      // silently fail; table will show empty state
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  function openCreateModal() {
    setEditingUser(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(user: UserRow) {
    setEditingUser(user);
    setForm({
      email: user.email,
      full_name: user.full_name,
      phone: user.phone ?? '',
      role: user.role,
      branch_id: user.branch_id ? String(user.branch_id) : '',
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    if (!form.role) {
      window.alert('Please select a role.');
      return;
    }
    setSaving(true);
    try {
      if (editingUser) {
        // Update
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: form.full_name,
            phone: form.phone || null,
            role: form.role,
            branch_id: form.branch_id ? Number(form.branch_id) : null,
          }),
        });
        const json = await res.json();
        if (json.success) {
          closeModal();
          fetchUsers();
        } else {
          window.alert(json.error ?? 'Failed to update user.');
        }
      } else {
        // Create
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email,
            full_name: form.full_name,
            phone: form.phone || null,
            role: form.role,
            branch_id: form.branch_id ? Number(form.branch_id) : null,
          }),
        });
        const json = await res.json();
        if (json.success) {
          closeModal();
          fetchUsers();
          window.alert(
            `User created successfully!\n\nTemporary Password: ${json.data.tempPassword}\n\nPlease share this with the user. They will be prompted to change it on first login.`
          );
        } else {
          window.alert(json.error ?? 'Failed to create user.');
        }
      }
    } catch {
      window.alert('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(user: UserRow) {
    if (!window.confirm(`Deactivate ${user.full_name}? They will no longer be able to log in.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/users/${user.id}/deactivate`, { method: 'PUT' });
      const json = await res.json();
      if (json.success) {
        fetchUsers();
      } else {
        window.alert(json.error ?? 'Failed to deactivate user.');
      }
    } catch {
      window.alert('An unexpected error occurred. Please try again.');
    }
  }

  async function handleResetPassword(user: UserRow) {
    if (!window.confirm(`Reset password for ${user.full_name}? A new temporary password will be generated.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetPassword: true }),
      });
      const json = await res.json();
      if (json.success) {
        window.alert(
          `Password reset successfully!\n\nNew Temporary Password: ${json.data?.tempPassword ?? '(see email)'}\n\nPlease share this with the user.`
        );
      } else {
        window.alert(json.error ?? 'Failed to reset password.');
      }
    } catch {
      window.alert('An unexpected error occurred. Please try again.');
    }
  }

  const columns: Column<UserRow>[] = [
    {
      key: 'full_name',
      header: 'Name',
      sortable: true,
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <Badge variant="info">{getRoleLabel(row.role)}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const variantMap: Record<User['status'], 'success' | 'destructive' | 'warning'> = {
          active: 'success',
          inactive: 'destructive',
          suspended: 'warning',
        };
        return (
          <Badge variant={variantMap[row.status]}>
            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
          </Badge>
        );
      },
    },
    {
      key: 'last_login_at',
      header: 'Last Login',
      render: (row) => (
        <span className="text-neutral-500 text-xs">{formatDate(row.last_login_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(row)}
            className="text-xs px-2 py-1 rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            Edit
          </button>
          {row.status === 'active' && (
            <button
              onClick={() => handleDeactivate(row)}
              className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              Deactivate
            </button>
          )}
          <button
            onClick={() => handleResetPassword(row)}
            className="text-xs px-2 py-1 rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            Reset PW
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-neutral-500 mb-1">
            <Link href="/settings" className="hover:text-primary transition-colors">
              Settings
            </Link>
            <span>/</span>
            <span className="text-neutral-700">User Management</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">User Management</h1>
        </div>
        <Button
          onClick={openCreateModal}
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          }
        >
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="px-4 py-2 text-sm bg-white border border-neutral-200 rounded-lg w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-primary-light"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light"
        >
          {roleFilterOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light"
        >
          {statusFilterOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {total > 0 && (
          <span className="text-sm text-neutral-500 ml-auto">
            {total} user{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-neutral-200 p-4 animate-pulse space-y-2">
              <div className="h-4 bg-neutral-200 rounded w-32" />
              <div className="h-3 bg-neutral-100 rounded w-48" />
            </div>
          ))
        ) : users.length === 0 ? (
          <p className="text-center py-8 text-sm text-neutral-400">No users found. Try adjusting your filters or add a new user.</p>
        ) : (
          users.map(row => {
            const variantMap: Record<User['status'], 'success' | 'destructive' | 'warning'> = {
              active: 'success',
              inactive: 'destructive',
              suspended: 'warning',
            };
            return (
              <div key={row.id} className="bg-white rounded-xl border border-neutral-200 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-900 text-sm truncate">{row.full_name}</p>
                    <p className="text-xs text-neutral-400 truncate">{row.email}</p>
                  </div>
                  <Badge variant={variantMap[row.status]}>
                    {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="info">{getRoleLabel(row.role)}</Badge>
                  <span className="text-xs text-neutral-400">Last login: {formatDate(row.last_login_at)}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => openEditModal(row)}
                    className="text-xs px-2 py-1 rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors"
                  >
                    Edit
                  </button>
                  {row.status === 'active' && (
                    <button
                      onClick={() => handleDeactivate(row)}
                      className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Deactivate
                    </button>
                  )}
                  <button
                    onClick={() => handleResetPassword(row)}
                    className="text-xs px-2 py-1 rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors"
                  >
                    Reset PW
                  </button>
                </div>
              </div>
            );
          })
        )}
        {/* Mobile pagination */}
        {total > pageSize && (
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-sm px-3 py-1.5 rounded border border-neutral-200 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-xs text-neutral-500">Page {page} of {Math.ceil(total / pageSize)}</span>
            <button
              onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
              disabled={page >= Math.ceil(total / pageSize)}
              className="text-sm px-3 py-1.5 rounded border border-neutral-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
      <DataTable<UserRow>
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="No users found. Try adjusting your filters or add a new user."
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: setPage,
        }}
      />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingUser ? 'Edit User' : 'Add User'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            disabled={!!editingUser}
            placeholder="user@example.com"
            required
          />
          <Input
            label="Full Name"
            type="text"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            placeholder="e.g. John Tan"
            required
          />
          <Input
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+65 9123 4567"
          />
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
            options={roleOptions}
            placeholder="Select a role"
            required
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
