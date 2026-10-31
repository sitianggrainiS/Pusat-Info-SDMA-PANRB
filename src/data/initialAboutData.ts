import { AboutPageContent } from '../types';

export const DEFAULT_ABOUT_PAGE_CONTENT: AboutPageContent = {
  heading: 'Tentang Kedeputian SDMA',
  subheading: 'Deputi Bidang Sumber Daya Manusia Aparatur',
  description:
    'Deputi Bidang Sumber Daya Manusia Aparatur merupakan unsur organisasi di lingkungan Kementerian Pendayagunaan Aparatur Negara dan Reformasi Birokrasi yang berada di bawah dan bertanggung jawab kepada Menteri. Kedeputian ini bertugas menyelenggarakan perumusan kebijakan serta koordinasi dan sinkronisasi pelaksanaan kebijakan di bidang sumber daya manusia aparatur.',
  profileImageUrl: '',
  profileImageUpdatedAt: null,
  orgSectionTitle: 'Struktur Organisasi Kedeputian SDMA',
  orgTopLevelTitle: 'Deputi Bidang Sumber Daya Manusia Aparatur',
  unitSectionTitle: 'Tugas dan Fungsi Unit Kerja',
  unitSectionSubtitle:
    'Kenali peran masing-masing unit kerja dalam mendukung pengelolaan sumber daya manusia aparatur.',
  units: [
    {
      id: 'unit-sekretariat-deputi',
      name: 'Sekretariat Deputi',
      orgChartLabel: 'Sekretariat Deputi',
      iconName: 'Building2',
      mainTask:
        'Melaksanakan koordinasi perencanaan, pelaksanaan, pemantauan dan evaluasi kinerja dan keuangan, serta memberikan dukungan administrasi kepada seluruh unit organisasi di lingkungan Kedeputian SDMA.',
      detailedTasks: [
        'Mengoordinasikan penyusunan rencana kinerja dan anggaran.',
        'Mengelola data, informasi, dan sistem informasi deputi.',
        'Memantau dan mengevaluasi pelaksanaan kinerja dan keuangan.',
        'Memberikan dukungan administrasi, kerja sama, hubungan masyarakat, arsip, dan dokumentasi.',
        'Memfasilitasi pengelolaan administrasi sumber daya manusia.',
        'Mengoordinasikan dukungan penyusunan peraturan perundang-undangan.',
        'Mengoordinasikan reformasi birokrasi internal dan sistem pengendalian intern.',
        'Menyusun laporan deputi.',
      ],
      subUnit: {
        name: 'Bagian Sinkronisasi Program dan Anggaran',
        description:
          'Bagian Sinkronisasi Program dan Anggaran, yang bertugas mengoordinasikan penyusunan rencana kinerja dan anggaran, mengelola data dan informasi, memantau serta mengevaluasi kinerja dan keuangan, serta menyusun laporan deputi.',
      },
    },
    {
      id: 'unit-asdep-perencanaan-pengadaan',
      name: 'Asisten Deputi Perencanaan dan Pengadaan SDMA',
      orgChartLabel:
        'Asisten Deputi Perencanaan dan Pengadaan Sumber Daya Manusia Aparatur',
      iconName: 'UserPlus',
      mainTask:
        'Melaksanakan perumusan kebijakan, koordinasi, sinkronisasi, pemantauan, analisis, evaluasi, dan pelaporan di bidang perencanaan dan pengadaan sumber daya manusia aparatur.',
      detailedTasks: [
        'Menyiapkan perumusan kebijakan perencanaan dan pengadaan SDMA.',
        'Mengoordinasikan dan menyinkronkan pelaksanaan kebijakan.',
        'Memantau, menganalisis, mengevaluasi, dan melaporkan pelaksanaan kebijakan.',
      ],
    },
    {
      id: 'unit-asdep-budaya-kerja-kompetensi',
      name: 'Asisten Deputi Penguatan Budaya Kerja dan Pengembangan Kompetensi SDMA',
      orgChartLabel:
        'Asisten Deputi Penguatan Budaya Kerja dan Pengembangan Kompetensi Sumber Daya Manusia Aparatur',
      iconName: 'GraduationCap',
      mainTask:
        'Melaksanakan perumusan kebijakan, koordinasi, sinkronisasi, pemantauan, analisis, evaluasi, dan pelaporan di bidang penguatan budaya kerja dan pengembangan kompetensi SDMA.',
      detailedTasks: [
        'Menyiapkan perumusan kebijakan penguatan budaya kerja dan pengembangan kompetensi.',
        'Mengoordinasikan dan menyinkronkan pelaksanaan kebijakan.',
        'Memantau, menganalisis, mengevaluasi, dan melaporkan pelaksanaan kebijakan.',
      ],
    },
    {
      id: 'unit-asdep-standardisasi-talenta',
      name: 'Asisten Deputi Standardisasi Jabatan dan Manajemen Talenta SDMA',
      orgChartLabel:
        'Asisten Deputi Standardisasi Jabatan dan Manajemen Talenta Sumber Daya Manusia Aparatur',
      iconName: 'Award',
      mainTask:
        'Melaksanakan perumusan kebijakan, koordinasi, sinkronisasi, pemantauan, analisis, evaluasi, dan pelaporan di bidang standardisasi jabatan dan manajemen talenta SDMA.',
      detailedTasks: [
        'Menyiapkan perumusan kebijakan standardisasi jabatan dan manajemen talenta.',
        'Mengoordinasikan dan menyinkronkan pelaksanaan kebijakan.',
        'Memantau, menganalisis, mengevaluasi, dan melaporkan pelaksanaan kebijakan.',
      ],
    },
    {
      id: 'unit-asdep-kinerja-penghargaan',
      name: 'Asisten Deputi Pengelolaan Kinerja, Sistem Penghargaan, dan Pengakuan SDMA',
      orgChartLabel:
        'Asisten Deputi Pengelolaan Kinerja, Sistem Penghargaan, dan Pengakuan Sumber Daya Manusia Aparatur',
      iconName: 'TrendingUp',
      mainTask:
        'Melaksanakan perumusan kebijakan, koordinasi, sinkronisasi, pemantauan, analisis, evaluasi, dan pelaporan di bidang pengelolaan kinerja, sistem penghargaan, dan pengakuan SDMA.',
      detailedTasks: [
        'Menyiapkan perumusan kebijakan pengelolaan kinerja, penghargaan, dan pengakuan.',
        'Mengoordinasikan dan menyinkronkan pelaksanaan kebijakan.',
        'Memantau, menganalisis, mengevaluasi, dan melaporkan pelaksanaan kebijakan.',
      ],
    },
    {
      id: 'unit-asdep-sistem-merit-evaluasi',
      name: 'Asisten Deputi Pengembangan Sistem Merit dan Evaluasi Manajemen ASN',
      orgChartLabel:
        'Asisten Deputi Pengembangan Sistem Merit dan Evaluasi Manajemen Aparatur Sipil Negara',
      iconName: 'ShieldCheck',
      mainTask:
        'Melaksanakan perumusan kebijakan, koordinasi, sinkronisasi, pemantauan, analisis, evaluasi, dan pelaporan atas pelaksanaan kebijakan pengembangan sistem merit dan evaluasi manajemen ASN.',
      detailedTasks: [
        'Menyiapkan perumusan kebijakan pengembangan sistem merit dan evaluasi manajemen ASN.',
        'Mengoordinasikan dan menyinkronkan pelaksanaan kebijakan.',
        'Menyiapkan penyusunan strategi digitalisasi layanan ASN.',
        'Memantau, menganalisis, mengevaluasi, dan melaporkan pelaksanaan kebijakan.',
      ],
    },
  ],
  updatedAt: '2025-01-01T00:00:00.000Z',
};
