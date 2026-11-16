import { AdminUser, AdminRole, AdminPermissions } from '../types';

export interface AdminUserProfile extends AdminUser {
  uid?: string;
}

export const ROLE_DEFINITIONS: Record<
  AdminRole,
  {
    name: string;
    description: string;
    badgeColor: string;
    level: number;
    canAccessDashboard: boolean;
  }
> = {
  superadmin: {
    name: 'Super Administrator',
    description:
      'Hak akses penuh untuk pengelolaan konten, klaster kategori, dasar hukum regulasi JDIH, asisten AI dokumen, dan tata kelola personil.',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    level: 1,
    canAccessDashboard: true,
  },
  content_manager: {
    name: 'Pengelola Konten Kebijakan',
    description:
      'Wewenang menyusun, menyunting, dan mempublikasikan konten edukasi kebijakan serta menautkan infografis resmi ke dalam klaster ASN.',
    badgeColor: 'bg-blue-100 text-[#07529A] border-blue-300',
    level: 2,
    canAccessDashboard: true,
  },
  legal_reviewer: {
    name: 'Reviewer Regulasi & JDIH',
    description:
      'Wewenang meninjau dan memverifikasi dasar hukum resmi, pasal rujukan, dokumen autentik JDIH, dan keterhubungan aturan.',
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
    level: 3,
    canAccessDashboard: true,
  },
  editor: {
    name: 'Editor Media Visual & Instagram',
    description:
      'Wewenang mengelola feed infografis Instagram @sdmapanrb, thumbnail visual, narasi ringkasan, dan draf materi edukatif.',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    level: 4,
    canAccessDashboard: true,
  },
};

export const ROLE_DEFAULT_PERMISSIONS: Record<AdminRole, AdminPermissions> = {
  superadmin: {
    canManageUsers: true,
    canPublishPolicies: true,
    canEditCategories: true,
    canManageSources: true,
    canUseAI: true,
  },
  content_manager: {
    canManageUsers: false,
    canPublishPolicies: true,
    canEditCategories: true,
    canManageSources: false,
    canUseAI: true,
  },
  legal_reviewer: {
    canManageUsers: false,
    canPublishPolicies: false,
    canEditCategories: false,
    canManageSources: true,
    canUseAI: true,
  },
  editor: {
    canManageUsers: false,
    canPublishPolicies: false,
    canEditCategories: false,
    canManageSources: false,
    canUseAI: true,
  },
};

/**
 * Metadata profil dan role administrator kedinasan (tanpa kredensial/password).
 * Otorisasi akses hanya ditentukan oleh status verifikasi Firebase Auth UID
 * yang terdaftar aktif di Cloud Firestore (`admins/{uid}`).
 */
export const ADMIN_USER_PROFILES: AdminUserProfile[] = [
  {
    id: 'adm-01',
    name: 'Tim Konten SDM Aparatur',
    email: 'tim.kontensdma@menpan.go.id',
    role: 'superadmin',
    roleTitle: 'Super Administrator SDMA',
    department: 'Kedeputian Bidang SDM Aparatur - Kementerian PANRB',
    permissions: { ...ROLE_DEFAULT_PERMISSIONS.superadmin },
  },
  {
    id: 'adm-02',
    name: 'Mohammad Afid',
    email: 'afid.sdma@menpan.go.id',
    role: 'superadmin',
    roleTitle: 'Super Administrator SDMA',
    department: 'Kedeputian Bidang SDM Aparatur - Kementerian PANRB',
    permissions: { ...ROLE_DEFAULT_PERMISSIONS.superadmin },
  },
  {
    id: 'adm-03',
    name: 'Aghni Aulia Fitri Tamami',
    email: 'aghni.sdma@menpan.go.id',
    role: 'superadmin',
    roleTitle: 'Super Administrator SDMA',
    department: 'Kedeputian Bidang SDM Aparatur - Kementerian PANRB',
    permissions: { ...ROLE_DEFAULT_PERMISSIONS.superadmin },
  },
  {
    id: 'adm-04',
    name: 'Siti Anggraini Sulistiowati',
    email: 'editor@menpan.go.id',
    role: 'superadmin',
    roleTitle: 'Super Administrator SDMA',
    department: 'Kedeputian Bidang SDM Aparatur - Kementerian PANRB',
    permissions: { ...ROLE_DEFAULT_PERMISSIONS.superadmin },
  },
];

const VALID_ADMIN_ROLES: AdminRole[] = [
  'superadmin',
  'content_manager',
  'legal_reviewer',
  'editor',
];

export function isValidAdminRole(role: unknown): role is AdminRole {
  return typeof role === 'string' && VALID_ADMIN_ROLES.includes(role as AdminRole);
}

/**
 * Menyusun profil AdminUser tervalidasi berdasarkan dokumen otorisasi UID dari Cloud Firestore (`admins/{uid}`).
 * Metadata tampilan (id/department/roleTitle/default permissions) hanya dipakai untuk melengkapi atribut profil,
 * bukan sebagai bukti otorisasi.
 */
export function buildAuthorizedAdminFromFirestore(
  uid: string,
  firestoreData: Record<string, any> | null | undefined,
  fallbackAuthEmail?: string | null,
  fallbackDisplayName?: string | null
): AdminUser | null {
  if (!uid || !firestoreData || typeof firestoreData !== 'object') return null;
  if (firestoreData.isActive === false) return null;

  const rawRole = firestoreData.role;
  if (!isValidAdminRole(rawRole)) return null;

  const matchedDirectoryProfile = ADMIN_USER_PROFILES.find(
    (p) =>
      (p.uid && p.uid === uid) ||
      (typeof firestoreData.id === 'string' && p.id === firestoreData.id)
  );

  const defaultPerms = ROLE_DEFAULT_PERMISSIONS[rawRole];
  const rawPerms =
    firestoreData.permissions && typeof firestoreData.permissions === 'object'
      ? (firestoreData.permissions as Partial<AdminPermissions>)
      : undefined;

  const resolvedPermissions: AdminPermissions = {
    canManageUsers:
      typeof rawPerms?.canManageUsers === 'boolean'
        ? rawPerms.canManageUsers
        : defaultPerms.canManageUsers,
    canPublishPolicies:
      typeof rawPerms?.canPublishPolicies === 'boolean'
        ? rawPerms.canPublishPolicies
        : defaultPerms.canPublishPolicies,
    canEditCategories:
      typeof rawPerms?.canEditCategories === 'boolean'
        ? rawPerms.canEditCategories
        : defaultPerms.canEditCategories,
    canManageSources:
      typeof rawPerms?.canManageSources === 'boolean'
        ? rawPerms.canManageSources
        : defaultPerms.canManageSources,
    canUseAI:
      typeof rawPerms?.canUseAI === 'boolean' ? rawPerms.canUseAI : defaultPerms.canUseAI,
  };

  return {
    uid,
    id:
      (typeof firestoreData.id === 'string' && firestoreData.id.trim()) ||
      matchedDirectoryProfile?.id ||
      uid,
    name:
      (typeof firestoreData.name === 'string' && firestoreData.name.trim()) ||
      matchedDirectoryProfile?.name ||
      fallbackDisplayName?.trim() ||
      'Administrator SDMA',
    email:
      (typeof firestoreData.email === 'string' && firestoreData.email.trim()) ||
      fallbackAuthEmail?.trim() ||
      '',
    role: rawRole,
    roleTitle:
      (typeof firestoreData.roleTitle === 'string' && firestoreData.roleTitle.trim()) ||
      matchedDirectoryProfile?.roleTitle ||
      ROLE_DEFINITIONS[rawRole].name,
    department:
      (typeof firestoreData.department === 'string' && firestoreData.department.trim()) ||
      matchedDirectoryProfile?.department ||
      'Kedeputian Bidang SDM Aparatur - Kementerian PANRB',
    permissions: resolvedPermissions,
    isActive: firestoreData.isActive !== false,
  };
}
