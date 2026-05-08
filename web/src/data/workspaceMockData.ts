import { Message, Room, TeamMember, Workspace } from '@/types';

export const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: 'tugas-besar-pabp',
    name: 'Tugas Besar PABP',
    shortName: 'TB',
    description: 'Workspace utama untuk proyek RuangKolaborasi.',
    color: 'bg-blue-600',
    inviteCode: 'PABP-2026',
  },
  {
    id: 'organisasi-kampus',
    name: 'Organisasi Kampus',
    shortName: 'OK',
    description: 'Koordinasi acara, publikasi, dan dokumentasi.',
    color: 'bg-emerald-600',
    inviteCode: 'ORG-2026',
  },
  {
    id: 'project-web',
    name: 'Project Web',
    shortName: 'PW',
    description: 'Catatan frontend, desain, dan progres web.',
    color: 'bg-violet-600',
    inviteCode: 'WEB-2026',
  },
];

export const INITIAL_ROOMS_BY_WORKSPACE: Record<string, Room[]> = {
  'tugas-besar-pabp': [
    {
      id: 'diskusi-utama',
      name: 'Diskusi Utama',
      icon: 'message',
      description: 'Koordinasi utama tim dan update harian.',
      favorite: true,
    },
    {
      id: 'pengembangan-api',
      name: 'Pengembangan API',
      icon: 'folder',
      description: 'Catatan integrasi backend, endpoint, dan kontrak data.',
      unread: 2,
    },
    {
      id: 'ui-ux-design',
      name: 'UI/UX Design',
      icon: 'folder',
      description: 'Diskusi tampilan, flow, dan komponen frontend web.',
    },
  ],
  'organisasi-kampus': [
    {
      id: 'pengumuman',
      name: 'Pengumuman',
      icon: 'message',
      description: 'Info penting untuk semua anggota organisasi.',
    },
    {
      id: 'divisi-acara',
      name: 'Divisi Acara',
      icon: 'folder',
      description: 'Pembahasan rundown, perlengkapan, dan panitia.',
    },
  ],
  'project-web': [
    {
      id: 'frontend',
      name: 'Frontend',
      icon: 'message',
      description: 'Diskusi layout, komponen, dan bug UI.',
    },
    {
      id: 'assets',
      name: 'Assets',
      icon: 'folder',
      description: 'Logo, mockup, gambar, dan dokumen desain.',
      unread: 1,
      favorite: true,
    },
  ],
};

export const INITIAL_MESSAGES_BY_WORKSPACE: Record<
  string,
  Record<string, Message[]>
> = {
  'tugas-besar-pabp': {
    'diskusi-utama': [
      {
        id: 1,
        user: 'Rezza',
        avatar: 'bg-blue-500',
        time: '09:00',
        type: 'text',
        text: 'Pagi tim! Struktur database udah aku push ke repo ya. Tolong dicek.',
      },
      {
        id: 2,
        user: 'Sammi Zaki',
        avatar: 'bg-emerald-500',
        time: '09:15',
        type: 'text',
        text: 'Sip, nanti aku tarik buat disambungin ke form Next.js.',
      },
      {
        id: 3,
        user: 'Gibran',
        avatar: 'bg-amber-500',
        time: '09:30',
        type: 'text',
        text: 'Akses kamera di mobile udah bisa baca QR code. Tinggal nunggu endpoint dari Rezza.',
      },
    ],
    'pengembangan-api': [
      {
        id: 4,
        user: 'Rezza',
        avatar: 'bg-blue-500',
        time: '10:05',
        type: 'text',
        text: 'Endpoint AI nanti cukup dipanggil dari frontend lewat API base URL.',
      },
      {
        id: 5,
        user: 'Fadhlan (Kamu)',
        avatar: 'bg-indigo-600',
        time: '10:12',
        type: 'file',
        fileName: 'web-mobile-integration.md',
        fileSize: '3.4 KB',
      },
    ],
    'ui-ux-design': [
      {
        id: 6,
        user: 'Fadhlan (Kamu)',
        avatar: 'bg-indigo-600',
        time: '11:20',
        type: 'text',
        text: 'Aku fokusin web ke dashboard workspace dulu: sidebar, channel, invite, chat, dan file sharing.',
      },
    ],
  },
  'organisasi-kampus': {
    pengumuman: [
      {
        id: 7,
        user: 'Nadia',
        avatar: 'bg-rose-500',
        time: '08:20',
        type: 'text',
        text: 'Brief acara sore ini sudah aku taruh di channel Divisi Acara.',
      },
    ],
    'divisi-acara': [
      {
        id: 8,
        user: 'Raka',
        avatar: 'bg-cyan-600',
        time: '08:45',
        type: 'file',
        fileName: 'rundown-seminar.pdf',
        fileSize: '824 KB',
      },
    ],
  },
  'project-web': {
    frontend: [
      {
        id: 9,
        user: 'Fadhlan (Kamu)',
        avatar: 'bg-indigo-600',
        time: '13:00',
        type: 'text',
        text: 'Layout workspace switcher dibuat 3 kolom biar navigasi grup lebih jelas.',
      },
    ],
    assets: [
      {
        id: 10,
        user: 'Sammi Zaki',
        avatar: 'bg-emerald-500',
        time: '13:15',
        type: 'file',
        fileName: 'wireframe-workspace.png',
        fileSize: '420 KB',
      },
    ],
  },
};

export const INITIAL_MEMBERS_BY_WORKSPACE: Record<string, TeamMember[]> = {
  'tugas-besar-pabp': [
    {
      id: 'fadhlan',
      name: 'Fadhlan',
      email: 'fadhlan@kampus.ac.id',
      role: 'Owner',
      status: 'active',
      avatar: 'bg-indigo-600',
    },
    {
      id: 'rezza',
      name: 'Rezza',
      email: 'rezza@kampus.ac.id',
      role: 'Admin',
      status: 'active',
      avatar: 'bg-blue-500',
    },
    {
      id: 'sammi',
      name: 'Sammi Zaki',
      email: 'sammi@kampus.ac.id',
      role: 'Member',
      status: 'active',
      avatar: 'bg-emerald-500',
    },
    {
      id: 'gibran',
      name: 'Gibran',
      email: 'gibran@kampus.ac.id',
      role: 'Member',
      status: 'active',
      avatar: 'bg-amber-500',
    },
  ],
  'organisasi-kampus': [
    {
      id: 'nadia',
      name: 'Nadia',
      email: 'nadia@kampus.ac.id',
      role: 'Owner',
      status: 'active',
      avatar: 'bg-rose-500',
    },
    {
      id: 'raka',
      name: 'Raka',
      email: 'raka@kampus.ac.id',
      role: 'Member',
      status: 'active',
      avatar: 'bg-cyan-600',
    },
  ],
  'project-web': [
    {
      id: 'fadhlan-web',
      name: 'Fadhlan',
      email: 'fadhlan@kampus.ac.id',
      role: 'Owner',
      status: 'active',
      avatar: 'bg-indigo-600',
    },
    {
      id: 'sammi-web',
      name: 'Sammi Zaki',
      email: 'sammi@kampus.ac.id',
      role: 'Member',
      status: 'active',
      avatar: 'bg-emerald-500',
    },
  ],
};
