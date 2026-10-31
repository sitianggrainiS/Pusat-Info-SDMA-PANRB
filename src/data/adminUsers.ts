import { AdminUser, AdminRole } from '../types';

export interface AuthorizedAccount extends AdminUser {
  passwordHash: string;
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
    description: 'Hak akses penuh untuk pengelolaan konten, klaster kategori, dasar hukum regulasi JDIH, asisten AI dokumen, dan tata kelola personil.',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    level: 1,
    canAccessDashboard: true,
  },
  content_manager: {
    name: 'Pengelola Konten Kebijakan',
    description: 'Wewenang menyusun, menyunting, dan mempublikasikan konten edukasi kebijakan serta menautkan infografis resmi ke dalam klaster ASN.',
    badgeColor: 'bg-blue-100 text-[#07529A] border-blue-300',
    level: 2,
    canAccessDashboard: true,
  },
  legal_reviewer: {
    name: 'Reviewer Regulasi & JDIH',
    description: 'Wewenang meninjau dan memverifikasi dasar hukum resmi, pasal rujukan, dokumen autentik JDIH, dan keterhubungan aturan.',
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
    level: 3,
    canAccessDashboard: true,
  },
  editor: {
    name: 'Editor Media Visual & Instagram',
    description: 'Wewenang mengelola feed infografis Instagram @sdmapanrb, thumbnail visual, narasi ringkasan, dan draf materi edukatif.',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    level: 4,
    canAccessDashboard: true,
  },
};

export const AUTHORIZED_ADMIN_USERS: AuthorizedAccount[] = [
  {
    id: 'adm-01',
    name: 'Tim Konten SDM Aparatur',
    email: 'tim.kontensdma@menpan.go.id',
    passwordHash: 'kompaksdma1234',
    role: 'superadmin',
    roleTitle: 'Super Administrator SDMA',
    department: 'Kedeputian Bidang SDM Aparatur - Kementerian PANRB',
    permissions: {
      canManageUsers: true,
      canPublishPolicies: true,
      canEditCategories: true,
      canManageSources: true,
      canUseAI: true,
    },
  },
  {
    id: 'adm-02',
    name: 'Mohammad Afid',
    email: 'afid.sdma@menpan.go.id',
    passwordHash: 'sdma1234',
    role: 'superadmin',
    roleTitle: 'Super Administrator SDMA',
    department: 'Kedeputian Bidang SDM Aparatur - Kementerian PANRB',
    permissions: {
      canManageUsers: true,
      canPublishPolicies: true,
      canEditCategories: true,
      canManageSources: true,
      canUseAI: true,
    },
  },
  {
    id: 'adm-03',
    name: 'Aghni Aulia Fitri Tamami',
    email: 'aghni.sdma@menpan.go.id',
    passwordHash: 'sdma1234',
     role: 'superadmin',
    roleTitle: 'Super Administrator SDMA',
    department: 'Kedeputian Bidang SDM Aparatur - Kementerian PANRB',
    permissions: {
      canManageUsers: true,
      canPublishPolicies: true,
      canEditCategories: true,
      canManageSources: true,
      canUseAI: true,
    },
  },
  {
    id: 'adm-04',
    name: 'Siti Anggraini Sulistiowati',
    email: 'editor@menpan.go.id',
    passwordHash: 'grafis1234',
    role: 'superadmin',
    roleTitle: 'Super Administrator SDMA',
    department: 'Kedeputian Bidang SDM Aparatur - Kementerian PANRB',
    permissions: {
      canManageUsers: true,
      canPublishPolicies: true,
      canEditCategories: true,
      canManageSources: true,
      canUseAI: true,
    },
  },
];
